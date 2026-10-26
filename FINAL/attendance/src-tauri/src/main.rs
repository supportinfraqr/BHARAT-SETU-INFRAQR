#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::{Update, UpdaterExt};

struct PendingUpdate(Mutex<Option<Update>>);
struct EngineProcess {
    child: Mutex<Option<CommandChild>>,
    stopping: AtomicBool,
    active: AtomicBool,
}
struct EnginePort(AtomicU16);
struct DataDir(Mutex<PathBuf>);

#[derive(Default, Serialize, Deserialize)]
struct LauncherSettings {
    #[serde(default, rename = "dataDir")]
    data_dir: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataDirInfo {
    path: String,
    configured: bool,
    has_data: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateInfo {
    version: String,
    current_version: String,
}

#[derive(Clone, Serialize)]
struct UpdateProgress {
    event: String,
    downloaded: u64,
    total: Option<u64>,
}

#[tauri::command]
async fn check_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<Option<UpdateInfo>, String> {
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    let info = update.as_ref().map(|update| UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
    });
    *pending.0.lock().map_err(|error| error.to_string())? = update;
    Ok(info)
}

#[tauri::command]
async fn install_update(app: AppHandle, pending: State<'_, PendingUpdate>) -> Result<(), String> {
    let Some(update) = pending.0.lock().map_err(|error| error.to_string())?.take() else {
        return Err("No update is ready to install.".into());
    };

    let progress_app = app.clone();
    let mut downloaded: u64 = 0;
    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                let _ = progress_app.emit(
                    "update-progress",
                    UpdateProgress {
                        event: "progress".into(),
                        downloaded,
                        total: content_length,
                    },
                );
            },
            || {},
        )
        .await
        .map_err(|error| error.to_string())?;

    app.restart();
    Ok(())
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn stop_engine_now(app: AppHandle) {
    quit_app(&app);
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn stop_engine(app: &AppHandle) {
    let state = app.state::<EngineProcess>();
    state.stopping.store(true, Ordering::SeqCst);
    if let Some(mut child) = state.child.lock().ok().and_then(|mut guard| guard.take()) {
        let _ = child.kill();
    }
    // PyInstaller one-file sidecars run as a bootloader parent plus a child.
    // Killing only the tracked parent can leave the real engine running.
    stop_stale_engine();
}

fn home_dir() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
}

fn default_data_dir() -> PathBuf {
    home_dir().join(".bss-attendance")
}

fn settings_path(app: &AppHandle) -> PathBuf {
    let directory = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| default_data_dir().join("config"));
    let _ = fs::create_dir_all(&directory);
    directory.join("settings.json")
}

fn read_launcher_settings(app: &AppHandle) -> LauncherSettings {
    fs::read_to_string(settings_path(app))
        .ok()
        .and_then(|text| serde_json::from_str::<LauncherSettings>(&text).ok())
        .unwrap_or_default()
}

fn write_launcher_settings(app: &AppHandle, settings: &LauncherSettings) -> Result<(), String> {
    let path = settings_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create settings folder: {error}"))?;
    }
    let text = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("Could not encode settings: {error}"))?;
    fs::write(&path, text).map_err(|error| format!("Could not save settings: {error}"))
}

fn data_dir_is_ready(app: &AppHandle) -> bool {
    let configured = read_launcher_settings(app).data_dir;
    if !configured.trim().is_empty() {
        return true;
    }
    dir_has_data(&default_data_dir())
}

fn resolve_initial_data_dir(app: &AppHandle) -> PathBuf {
    let configured = read_launcher_settings(app).data_dir;
    let candidate = PathBuf::from(configured.trim());
    if !configured.trim().is_empty() && candidate.is_absolute() {
        if fs::create_dir_all(&candidate).is_ok() && candidate.is_dir() {
            return candidate;
        }
    }
    let fallback = default_data_dir();
    let _ = fs::create_dir_all(&fallback);
    fallback
}

fn current_data_dir(app: &AppHandle) -> PathBuf {
    app.state::<DataDir>()
        .0
        .lock()
        .map(|path| path.clone())
        .unwrap_or_else(|_| default_data_dir())
}

fn dir_has_data(path: &Path) -> bool {
    ["client.json", "events.db", "face_gallery.json"]
        .iter()
        .any(|name| path.join(name).is_file())
}

fn engine_log_path(app: &AppHandle) -> PathBuf {
    let directory = current_data_dir(app);
    let _ = fs::create_dir_all(&directory);
    directory.join("engine.log")
}

fn log_engine(app: &AppHandle, message: &str) {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(engine_log_path(app))
    {
        let _ = writeln!(file, "[{stamp}] {message}");
    }
}

fn validate_data_dir(path: &Path) -> Result<(), String> {
    if !path.is_absolute() {
        return Err("Choose an absolute folder path.".into());
    }
    fs::create_dir_all(path).map_err(|error| format!("Could not create folder: {error}"))?;
    if !path.is_dir() {
        return Err("The selected path is not a folder.".into());
    }
    let probe = path.join(".bss-write-test");
    fs::write(&probe, b"ok").map_err(|error| format!("Folder is not writable: {error}"))?;
    let _ = fs::remove_file(&probe);
    Ok(())
}

fn copy_data_dir(source: &Path, target: &Path) -> Result<(), String> {
    let free = fs2::available_space(target)
        .map_err(|error| format!("Could not check free space: {error}"))?;
    if free < 600 * 1024 * 1024 {
        return Err("The selected folder needs at least 600 MB free.".into());
    }
    for name in [
        "client.json",
        "face_gallery.json",
        "events.db",
        "events.db-wal",
        "events.db-shm",
    ] {
        let src = source.join(name);
        if src.is_file() {
            fs::copy(&src, target.join(name))
                .map_err(|error| format!("Could not copy {name}: {error}"))?;
        }
    }
    Ok(())
}

fn restart_engine(app: &AppHandle) {
    stop_engine(app);
    let state = app.state::<EngineProcess>();
    for _ in 0..50 {
        if !state.active.load(Ordering::SeqCst) {
            break;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    state.stopping.store(false, Ordering::SeqCst);
    start_engine(app.clone());
}

#[tauri::command]
async fn choose_data_dir(app: AppHandle) -> Result<Option<String>, String> {
    let folder = app
        .dialog()
        .file()
        .set_title("Choose BSS Attendance data folder")
        .blocking_pick_folder();
    match folder {
        Some(path) => path
            .into_path()
            .map(|value| Some(value.to_string_lossy().to_string()))
            .map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
fn data_dir_info(app: AppHandle) -> DataDirInfo {
    let settings = read_launcher_settings(&app);
    let path = current_data_dir(&app);
    DataDirInfo {
        path: path.to_string_lossy().to_string(),
        configured: !settings.data_dir.trim().is_empty(),
        has_data: dir_has_data(&path),
    }
}

#[tauri::command(rename_all = "camelCase")]
fn set_data_dir(app: AppHandle, path: String, copy_existing: bool) -> Result<String, String> {
    let target = PathBuf::from(path.trim());
    validate_data_dir(&target)?;
    let current = current_data_dir(&app);
    if target == current {
        let mut settings = read_launcher_settings(&app);
        settings.data_dir = target.to_string_lossy().to_string();
        write_launcher_settings(&app, &settings)?;
        if !app.state::<EngineProcess>().active.load(Ordering::SeqCst) {
            app.state::<EngineProcess>()
                .stopping
                .store(false, Ordering::SeqCst);
            start_engine(app.clone());
        }
        return Ok(current.to_string_lossy().to_string());
    }
    let target_has_data = dir_has_data(&target);
    if copy_existing && target_has_data {
        return Err("TARGET_HAS_DATA".into());
    }
    let source_has_data = dir_has_data(&current);
    stop_engine(&app);
    std::thread::sleep(Duration::from_millis(1200));
    if copy_existing && source_has_data {
        if let Err(error) = copy_data_dir(&current, &target) {
            restart_engine(&app);
            return Err(error);
        }
    }
    let mut settings = read_launcher_settings(&app);
    settings.data_dir = target.to_string_lossy().to_string();
    if let Err(error) = write_launcher_settings(&app, &settings) {
        restart_engine(&app);
        return Err(error);
    }
    if let Ok(mut guard) = app.state::<DataDir>().0.lock() {
        *guard = target.clone();
    }
    restart_engine(&app);
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
async fn choose_backup_file(app: AppHandle) -> Result<Option<String>, String> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let path = app
        .dialog()
        .file()
        .set_title("Save BSS Attendance database backup")
        .set_file_name(format!("bss-attendance-backup-{stamp}.zip"))
        .add_filter("ZIP archive", &["zip"])
        .blocking_save_file();
    match path {
        Some(value) => value
            .into_path()
            .map(|path| Some(path.to_string_lossy().to_string()))
            .map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
fn export_data_backup(app: AppHandle, path: String) -> Result<(), String> {
    let target = PathBuf::from(path.trim());
    if target.as_os_str().is_empty() {
        return Err("Choose a backup file.".into());
    }
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Could not create backup folder: {error}"))?;
        }
    }
    let source = current_data_dir(&app);
    if !dir_has_data(&source) {
        return Err("No local BSS data was found to export.".into());
    }
    stop_engine(&app);
    std::thread::sleep(Duration::from_millis(1200));
    let result = (|| -> Result<(), String> {
        let file =
            File::create(&target).map_err(|error| format!("Could not create backup: {error}"))?;
        let mut writer = zip::ZipWriter::new(file);
        for name in [
            "client.json",
            "face_gallery.json",
            "events.db",
            "events.db-wal",
            "events.db-shm",
        ] {
            let src = source.join(name);
            if !src.is_file() {
                continue;
            }
            writer
                .start_file(name, zip::write::SimpleFileOptions::default())
                .map_err(|error| format!("Could not write {name}: {error}"))?;
            let mut input =
                File::open(&src).map_err(|error| format!("Could not read {name}: {error}"))?;
            std::io::copy(&mut input, &mut writer)
                .map_err(|error| format!("Could not copy {name}: {error}"))?;
        }
        writer
            .finish()
            .map_err(|error| format!("Could not finish backup: {error}"))?;
        Ok(())
    })();
    restart_engine(&app);
    result
}

fn stop_stale_engine() {
    #[cfg(target_os = "windows")]
    {
        for name in [
            "attendance-engine.exe",
            "attendance-engine-x86_64-pc-windows-msvc.exe",
        ] {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/IM", name])
                .output();
        }
        let _ = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-Process | Where-Object { $_.ProcessName -like 'attendance-engine*' } | Stop-Process -Force -ErrorAction SilentlyContinue",
            ])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        // PyInstaller one-file mode runs a bootloader process plus a child, and
        // Linux truncates the process name ("attendance-engine" -> 15 chars), so
        // `pkill -x` misses it. Match the full command line instead.
        let _ = Command::new("pkill")
            .args(["-f", "attendance-engine --port 0"])
            .output();
    }
}

#[tauri::command]
fn engine_port(state: State<'_, EnginePort>) -> u16 {
    state.0.load(Ordering::SeqCst)
}

fn read_engine_log_text(app: &AppHandle) -> String {
    let text =
        fs::read_to_string(engine_log_path(app)).unwrap_or_else(|_| "No engine log yet.".into());
    let mut tail: String = text.chars().rev().take(6000).collect();
    tail = tail.chars().rev().collect();
    tail
}

#[tauri::command]
fn read_engine_log(app: AppHandle) -> String {
    read_engine_log_text(&app)
}

fn start_engine(app: AppHandle) {
    stop_stale_engine();
    tauri::async_runtime::spawn(async move {
        app.state::<EngineProcess>()
            .active
            .store(true, Ordering::SeqCst);
        loop {
            if app.state::<EngineProcess>().stopping.load(Ordering::SeqCst) {
                break;
            }
            app.state::<EnginePort>().0.store(0, Ordering::SeqCst);
            let sidecar = match app.shell().sidecar("attendance-engine") {
                Ok(sidecar) => sidecar,
                Err(error) => {
                    log_engine(&app, &format!("sidecar lookup failed: {error}"));
                    std::thread::sleep(Duration::from_secs(3));
                    continue;
                }
            };
            let data_dir = current_data_dir(&app).to_string_lossy().to_string();
            log_engine(
                &app,
                &format!("starting engine with data folder {data_dir}"),
            );
            match sidecar
                .args(["--port", "0", "--home"])
                .arg(data_dir)
                .spawn()
            {
                Ok((mut events, child)) => {
                    log_engine(&app, "engine started");
                    let state = app.state::<EngineProcess>();
                    if let Ok(mut guard) = state.child.lock() {
                        *guard = Some(child);
                    }
                    while let Some(event) = events.recv().await {
                        if let CommandEvent::Stdout(bytes) = &event {
                            let text = String::from_utf8_lossy(bytes);
                            for line in text.lines() {
                                if let Some(raw_port) = line.trim().strip_prefix("ENGINE_PORT=") {
                                    if let Ok(port) = raw_port.trim().parse::<u16>() {
                                        if port > 0 {
                                            app.state::<EnginePort>()
                                                .0
                                                .store(port, Ordering::SeqCst);
                                            log_engine(&app, &format!("engine bound port {port}"));
                                        }
                                    }
                                }
                            }
                        }
                        log_engine(&app, &format!("engine: {event:?}"));
                    }
                    log_engine(&app, "engine exited; restarting in 3 seconds");
                }
                Err(error) => log_engine(&app, &format!("engine spawn failed: {error}")),
            }
            std::thread::sleep(Duration::from_secs(3));
        }
        app.state::<EngineProcess>()
            .active
            .store(false, Ordering::SeqCst);
    });
}

fn quit_app(app: &AppHandle) {
    stop_engine(app);
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build());
            app.manage(PendingUpdate(Mutex::new(None)));
            let data_dir = resolve_initial_data_dir(app.handle());
            app.manage(EngineProcess {
                child: Mutex::new(None),
                stopping: AtomicBool::new(false),
                active: AtomicBool::new(false),
            });
            app.manage(EnginePort(AtomicU16::new(0)));
            app.manage(DataDir(Mutex::new(data_dir)));
            if data_dir_is_ready(app.handle()) {
                start_engine(app.handle().clone());
            } else {
                log_engine(app.handle(), "waiting for the user to choose a data folder");
            }

            let open_item =
                MenuItem::with_id(app, "open", "Open BSS Attendance", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("default window icon missing");
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Bharat Shram Setu · Attendance Client")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "quit" => quit_app(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_update,
            install_update,
            stop_engine_now,
            read_engine_log,
            engine_port,
            app_version,
            choose_data_dir,
            data_dir_info,
            set_data_dir,
            choose_backup_file,
            export_data_backup
        ])
        .build(tauri::generate_context!())
        .expect("error while building BSS Attendance")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                stop_engine(app);
            }
        });
}
