#[tauri::command]
fn app_status() -> &'static str {
    "xBaoNotes desktop shell is ready"
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_status])
        .run(tauri::generate_context!())
        .expect("failed to run xBaoNotes");
}
