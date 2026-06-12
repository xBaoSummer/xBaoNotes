mod storage;

use storage::{
    AttachmentIdRequest, AttachmentRecord, CreateAttachmentRequest, CreateFolderRequest,
    CreateNoteRequest, FolderRecord, ListNotesRequest, NoteIdRequest, NoteRecord,
    RecycleItemRecord, SaveStickyBoundsRequest, SetNotePinnedRequest, SetSettingRequest,
    SetStickyAlwaysOnTopRequest, SettingRecord, StickyWindowRecord, StorageStatus,
    UpdateNoteRequest,
};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

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
fn get_note(request: NoteIdRequest) -> Result<NoteRecord, String> {
    storage::get_note_by_id(request)
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
fn delete_note(request: NoteIdRequest) -> Result<NoteRecord, String> {
    storage::delete_note(request)
}

#[tauri::command]
fn list_recycle_items() -> Result<Vec<RecycleItemRecord>, String> {
    storage::list_recycle_items()
}

#[tauri::command]
fn restore_note(request: NoteIdRequest) -> Result<NoteRecord, String> {
    storage::restore_note(request)
}

#[tauri::command]
fn purge_note(request: NoteIdRequest) -> Result<(), String> {
    storage::purge_note(request)
}

#[tauri::command]
fn empty_recycle_bin() -> Result<(), String> {
    storage::empty_recycle_bin()
}

#[tauri::command]
fn create_attachment(request: CreateAttachmentRequest) -> Result<AttachmentRecord, String> {
    storage::create_attachment(request)
}

#[tauri::command]
fn list_attachments(request: NoteIdRequest) -> Result<Vec<AttachmentRecord>, String> {
    storage::list_attachments(request)
}

#[tauri::command]
fn open_attachment(request: AttachmentIdRequest) -> Result<(), String> {
    storage::open_attachment(request)
}

#[tauri::command]
fn list_settings() -> Result<Vec<SettingRecord>, String> {
    storage::list_settings()
}

#[tauri::command]
fn set_setting(request: SetSettingRequest) -> Result<SettingRecord, String> {
    storage::set_setting(request)
}

#[tauri::command]
fn post_sticky_note(app: AppHandle, request: NoteIdRequest) -> Result<StickyWindowRecord, String> {
    let record = storage::post_sticky_note(request)?;
    open_sticky_window(&app, &record, true)?;

    Ok(record)
}

#[tauri::command]
fn unpost_sticky_note(
    app: AppHandle,
    request: NoteIdRequest,
) -> Result<StickyWindowRecord, String> {
    let note_id = request.id.clone();
    let record = storage::unpost_sticky_note(request)?;

    if let Some(window) = app.get_webview_window(&sticky_window_label(&note_id)) {
        window.destroy().map_err(|error| error.to_string())?;
    }

    Ok(record)
}

#[tauri::command]
fn get_sticky_window(request: NoteIdRequest) -> Result<StickyWindowRecord, String> {
    storage::get_sticky_window(request)
}

#[tauri::command]
fn list_sticky_windows() -> Result<Vec<StickyWindowRecord>, String> {
    storage::list_sticky_windows()
}

#[tauri::command]
fn set_sticky_always_on_top(
    app: AppHandle,
    request: SetStickyAlwaysOnTopRequest,
) -> Result<StickyWindowRecord, String> {
    let note_id = request.note_id.clone();
    let record = storage::set_sticky_always_on_top(request)?;

    if let Some(window) = app.get_webview_window(&sticky_window_label(&note_id)) {
        window
            .set_always_on_top(record.is_always_on_top)
            .map_err(|error| error.to_string())?;
    }

    Ok(record)
}

fn sticky_window_label(note_id: &str) -> String {
    format!("sticky-{note_id}")
}

fn open_sticky_window(
    app: &AppHandle,
    record: &StickyWindowRecord,
    force_always_on_top: bool,
) -> Result<(), String> {
    let label = sticky_window_label(&record.note_id);
    let should_pin = force_always_on_top || record.is_always_on_top;

    if let Some(window) = app.get_webview_window(&label) {
        window
            .set_always_on_top(should_pin)
            .map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let url = WebviewUrl::App(format!("index.html?view=sticky&noteId={}", record.note_id).into());
    let window = WebviewWindowBuilder::new(app, label, url)
        .title("xBaoNotes 贴出便签")
        .inner_size(record.width, record.height)
        .min_inner_size(260.0, 220.0)
        .position(record.x, record.y)
        .resizable(true)
        .always_on_top(should_pin)
        .build()
        .map_err(|error| error.to_string())?;

    attach_sticky_window_events(window, record.note_id.clone());

    Ok(())
}

fn attach_sticky_window_events(window: WebviewWindow, note_id: String) {
    let tracked_window = window.clone();
    window.on_window_event(move |event| match event {
        WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
            persist_sticky_window_bounds(&tracked_window, &note_id);
        }
        WindowEvent::CloseRequested { .. } => {
            let _ = storage::unpost_sticky_note(NoteIdRequest {
                id: note_id.clone(),
            });
        }
        _ => {}
    });
}

fn persist_sticky_window_bounds(window: &WebviewWindow, note_id: &str) {
    let (Ok(position), Ok(size)) = (window.outer_position(), window.inner_size()) else {
        return;
    };

    let _ = storage::save_sticky_window_bounds(SaveStickyBoundsRequest {
        note_id: note_id.to_string(),
        x: position.x as f64,
        y: position.y as f64,
        width: size.width as f64,
        height: size.height as f64,
    });
}

fn restore_sticky_windows(app: &AppHandle) -> Result<(), String> {
    for record in storage::list_sticky_windows()? {
        let restored_record = storage::force_sticky_always_on_top(&record.note_id)?;
        open_sticky_window(app, &restored_record, true)?;
    }

    Ok(())
}

fn setup_error(error: String) -> Box<dyn std::error::Error> {
    Box::new(std::io::Error::new(std::io::ErrorKind::Other, error))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            storage::init_storage().map_err(setup_error)?;
            restore_sticky_windows(app.handle()).map_err(setup_error)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_status,
            initialize_storage,
            get_storage_status,
            list_folders,
            create_folder,
            create_note,
            get_note,
            list_notes,
            update_note,
            set_note_pinned,
            delete_note,
            list_recycle_items,
            restore_note,
            purge_note,
            empty_recycle_bin,
            create_attachment,
            list_attachments,
            open_attachment,
            list_settings,
            set_setting,
            post_sticky_note,
            unpost_sticky_note,
            get_sticky_window,
            list_sticky_windows,
            set_sticky_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("failed to run xBaoNotes");
}
