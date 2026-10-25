#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::{Update, UpdaterExt};

struct PendingUpdate(Mutex<Option<Update>>);
struct EngineProcess {
    child: Mutex<Option<CommandChild>>,
    stopping: AtomicBool,
}
struct EnginePort(AtomicU16);

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
async fn install_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let Some(update) = pending
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .take()
    else {
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

fn engine_log_path() -> PathBuf {
    let home = std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    let directory = home.join(".bss-attendance");
    let _ = std::fs::create_dir_all(&directory);
    directory.join("engine.log")
}

fn log_engine(message: &str) {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(engine_log_path())
    {
        let _ = writeln!(file, "[{stamp}] {message}");
    }
}

fn stop_stale_engine() {
    #[cfg(target_os = "windows")]
    {
        for name in [
            "attendance-engine.exe",
            "attendance-engine-x86_64-pc-windows-msvc.exe",
        ] {
            let _ = Command::new("taskkill").args(["/F", "/T", "/IM", name]).output();
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

fn read_engine_log_text() -> String {
    let text = fs::read_to_string(engine_log_path()).unwrap_or_else(|_| "No engine log yet.".into());
    let mut tail: String = text.chars().rev().take(6000).collect();
    tail = tail.chars().rev().collect();
    tail
}

#[tauri::command]
fn read_engine_log() -> String {
    read_engine_log_text()
}

fn start_engine(app: AppHandle) {
    stop_stale_engine();
    tauri::async_runtime::spawn(async move {
        loop {
            if app.state::<EngineProcess>().stopping.load(Ordering::SeqCst) {
                break;
            }
            app.state::<EnginePort>().0.store(0, Ordering::SeqCst);
            let sidecar = match app.shell().sidecar("attendance-engine") {
                Ok(sidecar) => sidecar,
                Err(error) => {
                    log_engine(&format!("sidecar lookup failed: {error}"));
                    std::thread::sleep(Duration::from_secs(3));
                    continue;
                }
            };
            log_engine("starting engine with an OS-assigned port");
            match sidecar.args(["--port", "0"]).spawn() {
                Ok((mut events, child)) => {
                    log_engine("engine started");
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
                                            app.state::<EnginePort>().0.store(port, Ordering::SeqCst);
                                            log_engine(&format!("engine bound port {port}"));
                                        }
                                    }
                                }
                            }
                        }
                        log_engine(&format!("engine: {event:?}"));
                    }
                    log_engine("engine exited; restarting in 3 seconds");
                }
                Err(error) => log_engine(&format!("engine spawn failed: {error}")),
            }
            std::thread::sleep(Duration::from_secs(3));
        }
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
            app.manage(EngineProcess {
                child: Mutex::new(None),
                stopping: AtomicBool::new(false),
            });
            app.manage(EnginePort(AtomicU16::new(0)));
            start_engine(app.handle().clone());

            let open_item = MenuItem::with_id(app, "open", "Open BSS Attendance", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;
            let icon = app.default_window_icon().cloned().expect("default window icon missing");
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
        .invoke_handler(tauri::generate_handler![check_update, install_update, stop_engine_now, read_engine_log, engine_port, app_version])
        .build(tauri::generate_context!())
        .expect("error while building BSS Attendance")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                stop_engine(app);
            }
        });
}
