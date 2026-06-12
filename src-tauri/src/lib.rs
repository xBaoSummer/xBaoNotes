mod storage;

use storage::{
    CreateFolderRequest, CreateNoteRequest, FolderRecord, ListNotesRequest, NoteRecord,
    SetNotePinnedRequest, SetSettingRequest, SettingRecord, StorageStatus, UpdateNoteRequest,
};

#[tauri::command]
fn app_status() -> &'static str {
    "xBaoNotes desktop shell is ready"
}

#[tauri::command]
fn initialize_storage() -> Result<StorageStatus, String> {
    storage::init_storage()
}

#[tauri::command]
fn get_storage_status() -> Result<StorageStatus, String> {
    storage::read_storage_status()
}

#[tauri::command]
fn list_folders() -> Result<Vec<FolderRecord>, String> {
    storage::list_folders()
}

#[tauri::command]
fn create_folder(request: CreateFolderRequest) -> Result<FolderRecord, String> {
    storage::create_folder(request)
}

#[tauri::command]
fn create_note(request: CreateNoteRequest) -> Result<NoteRecord, String> {
    storage::create_note(request)
}

#[tauri::command]
fn list_notes(request: ListNotesRequest) -> Result<Vec<NoteRecord>, String> {
    storage::list_notes(request)
}

#[tauri::command]
fn update_note(request: UpdateNoteRequest) -> Result<NoteRecord, String> {
    storage::update_note(request)
}

#[tauri::command]
fn set_note_pinned(request: SetNotePinnedRequest) -> Result<NoteRecord, String> {
    storage::set_note_pinned(request)
}

#[tauri::command]
fn list_settings() -> Result<Vec<SettingRecord>, String> {
    storage::list_settings()
}

#[tauri::command]
fn set_setting(request: SetSettingRequest) -> Result<SettingRecord, String> {
    storage::set_setting(request)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_status,
            initialize_storage,
            get_storage_status,
            list_folders,
            create_folder,
            create_note,
            list_notes,
            update_note,
            set_note_pinned,
            list_settings,
            set_setting
        ])
        .run(tauri::generate_context!())
        .expect("failed to run xBaoNotes");
}
