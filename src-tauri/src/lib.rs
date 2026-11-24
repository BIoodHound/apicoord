//! Tauri application entry. The architect owns this file: it wires up plugins,
//! managed state, and the IPC command registry. Command implementations live in
//! `commands/`.

mod commands;
mod error;

use commands::health;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            health::ping,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
