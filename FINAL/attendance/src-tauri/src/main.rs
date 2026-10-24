#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_updater::{Update, UpdaterExt};

struct PendingUpdate(Mutex<Option<Update>>);
struct EngineProcess {
    child: Mutex<Option<CommandChild>>,
    stopping: AtomicBool,
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
            let _ = Command::new("taskkill").args(["/F", "/IM", name]).output();
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("pkill")
            .args(["-x", "attendance-engine"])
            .output();
    }
}

fn start_engine(app: AppHandle) {
    stop_stale_engine();
    tauri::async_runtime::spawn(async move {
        loop {
            if app.state::<EngineProcess>().stopping.load(Ordering::SeqCst) {
                break;
            }
            let sidecar = match app.shell().sidecar("attendance-engine") {
                Ok(sidecar) => sidecar,
                Err(error) => {
                    log_engine(&format!("sidecar lookup failed: {error}"));
                    std::thread::sleep(Duration::from_secs(3));
                    continue;
                }
            };
            match sidecar.spawn() {
                Ok((mut events, child)) => {
                    log_engine("engine started");
                    let state = app.state::<EngineProcess>();
                    if let Ok(mut guard) = state.child.lock() {
                        *guard = Some(child);
                    }
                    while let Some(event) = events.recv().await {
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
        .invoke_handler(tauri::generate_handler![check_update, install_update])
        .build(tauri::generate_context!())
        .expect("error while building BSS Attendance")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                stop_engine(app);
            }
        });
}
