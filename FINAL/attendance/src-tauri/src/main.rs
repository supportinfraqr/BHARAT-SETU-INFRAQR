#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar = app.shell().sidecar("attendance-engine")?;
            let (mut events, _child) = sidecar.spawn()?;
            tauri::async_runtime::spawn(async move {
                while let Some(event) = events.recv().await {
                    println!("engine: {event:?}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running BSS Attendance");
}
