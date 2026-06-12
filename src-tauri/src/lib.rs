mod storage;

use serde::Deserialize;
use std::process::Command;
use storage::{
    AttachmentIdRequest, AttachmentRecord, CreateAttachmentRequest, CreateFolderRequest,
    CreateNoteRequest, FolderRecord, ListNotesRequest, NoteIdRequest, NoteRecord,
    RecycleItemRecord, SaveStickyBoundsRequest, SetNotePinnedRequest, SetSettingRequest,
    SetStickyAlwaysOnTopRequest, SettingRecord, StickyWindowRecord, StorageStatus,
    UpdateNoteRequest,
};
use tauri::{
    menu::MenuBuilder,
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};

const MAIN_WINDOW_LABEL: &str = "main";
const EDGE_WINDOW_LABEL: &str = "edge-entry";
const AUTO_START_VALUE_NAME: &str = "xBaoNotes";

#[derive(Debug, Deserialize, Default)]
struct OpenMainWindowRequest {
    note_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EdgeEntryExpandedRequest {
    expanded: bool,
}

#[derive(Debug, Deserialize)]
struct EdgePositionRequest {
    position: String,
}

#[derive(Debug, Deserialize)]
struct AutoStartRequest {
    enabled: bool,
}

struct EdgeWindowBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

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
fn open_main_window(app: AppHandle, request: OpenMainWindowRequest) -> Result<(), String> {
    show_main_window(&app, request.note_type)
}

#[tauri::command]
fn open_edge_entry(app: AppHandle) -> Result<(), String> {
    create_or_show_edge_entry(&app)
}

#[tauri::command]
fn set_edge_entry_expanded(
    app: AppHandle,
    request: EdgeEntryExpandedRequest,
) -> Result<(), String> {
    resize_edge_entry(&app, request.expanded)
}

#[tauri::command]
fn set_edge_position(
    app: AppHandle,
    request: EdgePositionRequest,
) -> Result<SettingRecord, String> {
    let position = normalize_edge_position(&request.position)?.to_string();
    let setting = storage::set_setting(SetSettingRequest {
        key: "edge_position".to_string(),
        value: position,
    })?;

    if let Some(window) = app.get_webview_window(EDGE_WINDOW_LABEL) {
        window.destroy().map_err(|error| error.to_string())?;
    }

    create_or_show_edge_entry(&app)?;

    Ok(setting)
}

#[tauri::command]
fn get_auto_start_enabled() -> Result<bool, String> {
    is_auto_start_enabled()
}

#[tauri::command]
fn set_auto_start_enabled(request: AutoStartRequest) -> Result<SettingRecord, String> {
    configure_auto_start(request.enabled)?;
    storage::set_setting(SetSettingRequest {
        key: "auto_start_enabled".to_string(),
        value: request.enabled.to_string(),
    })
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

fn setup_main_window_events(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let tracked_window = window.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = tracked_window.hide();
            }
        });
    }
}

fn setup_tray(app: &AppHandle) -> Result<(), String> {
    let menu = MenuBuilder::new(app)
        .text("open_main", "打开主页面")
        .text("open_edge", "显示贴边入口")
        .separator()
        .text("quit", "退出")
        .build()
        .map_err(|error| error.to_string())?;
    let mut tray = TrayIconBuilder::with_id("xbao-notes")
        .tooltip("xBaoNotes")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open_main" => {
                let _ = show_main_window(app, None);
            }
            "open_edge" => {
                let _ = create_or_show_edge_entry(app);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(event, TrayIconEvent::DoubleClick { .. }) {
                let _ = show_main_window(tray.app_handle(), None);
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app).map_err(|error| error.to_string())?;

    Ok(())
}

fn apply_startup_behavior(app: &AppHandle) -> Result<(), String> {
    let startup_mode = setting_value("startup_mode", "edge_entry");

    match startup_mode.as_str() {
        "main_window" => show_main_window(app, None),
        "tray_only" => {
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                window.hide().map_err(|error| error.to_string())?;
            }
            Ok(())
        }
        _ => {
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                window.hide().map_err(|error| error.to_string())?;
            }
            create_or_show_edge_entry(app)
        }
    }
}

fn show_main_window(app: &AppHandle, note_type: Option<String>) -> Result<(), String> {
    let window = if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window
    } else {
        WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::App("index.html".into()))
            .title("xBaoNotes")
            .inner_size(1120.0, 720.0)
            .min_inner_size(900.0, 620.0)
            .resizable(true)
            .center()
            .build()
            .map_err(|error| error.to_string())?
    };

    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;

    if let Some(note_type) = note_type {
        if let Ok(normalized_type) = normalize_main_note_type(&note_type) {
            let _ = app.emit("select_note_type", normalized_type);
        }
    }

    Ok(())
}

fn create_or_show_edge_entry(app: &AppHandle) -> Result<(), String> {
    let position = normalize_edge_position(&setting_value("edge_position", "right"))?.to_string();
    let bounds = edge_window_bounds(app, &position, false)?;

    if let Some(window) = app.get_webview_window(EDGE_WINDOW_LABEL) {
        apply_edge_bounds(&window, &bounds)?;
        window.show().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let url = WebviewUrl::App(format!("index.html?view=edge&position={position}").into());
    WebviewWindowBuilder::new(app, EDGE_WINDOW_LABEL, url)
        .title("xBaoNotes 贴边入口")
        .inner_size(bounds.width, bounds.height)
        .position(bounds.x, bounds.y)
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(true)
        .build()
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn resize_edge_entry(app: &AppHandle, expanded: bool) -> Result<(), String> {
    let position = normalize_edge_position(&setting_value("edge_position", "right"))?.to_string();
    let bounds = edge_window_bounds(app, &position, expanded)?;

    if let Some(window) = app.get_webview_window(EDGE_WINDOW_LABEL) {
        apply_edge_bounds(&window, &bounds)?;
    }

    Ok(())
}

fn apply_edge_bounds(window: &WebviewWindow, bounds: &EdgeWindowBounds) -> Result<(), String> {
    window
        .set_size(PhysicalSize::new(
            bounds.width.round() as u32,
            bounds.height.round() as u32,
        ))
        .map_err(|error| error.to_string())?;
    window
        .set_position(PhysicalPosition::new(
            bounds.x.round() as i32,
            bounds.y.round() as i32,
        ))
        .map_err(|error| error.to_string())
}

fn edge_window_bounds(
    app: &AppHandle,
    position: &str,
    expanded: bool,
) -> Result<EdgeWindowBounds, String> {
    let monitor = app
        .primary_monitor()
        .map_err(|error| error.to_string())?
        .ok_or("无法读取主显示器信息")?;
    let work_area = monitor.work_area();
    let screen_x = work_area.position.x as f64;
    let screen_y = work_area.position.y as f64;
    let screen_width = work_area.size.width as f64;
    let screen_height = work_area.size.height as f64;
    let edge_thickness = if expanded { 224.0 } else { 36.0 };
    let edge_length = if expanded { 224.0 } else { 188.0 };
    let horizontal_width = if expanded { 420.0 } else { 260.0 };
    let horizontal_height = if expanded { 92.0 } else { 38.0 };

    let bounds = match normalize_edge_position(position)? {
        "left" => EdgeWindowBounds {
            x: screen_x,
            y: screen_y + (screen_height - edge_length) / 2.0,
            width: edge_thickness,
            height: edge_length,
        },
        "top" => EdgeWindowBounds {
            x: screen_x + (screen_width - horizontal_width) / 2.0,
            y: screen_y,
            width: horizontal_width,
            height: horizontal_height,
        },
        "bottom" => EdgeWindowBounds {
            x: screen_x + (screen_width - horizontal_width) / 2.0,
            y: screen_y + screen_height - horizontal_height,
            width: horizontal_width,
            height: horizontal_height,
        },
        _ => EdgeWindowBounds {
            x: screen_x + screen_width - edge_thickness,
            y: screen_y + (screen_height - edge_length) / 2.0,
            width: edge_thickness,
            height: edge_length,
        },
    };

    Ok(bounds)
}

fn normalize_edge_position(value: &str) -> Result<&'static str, String> {
    match value {
        "left" => Ok("left"),
        "right" => Ok("right"),
        "top" => Ok("top"),
        "bottom" => Ok("bottom"),
        _ => Err("不支持的贴边位置".to_string()),
    }
}

fn normalize_main_note_type(value: &str) -> Result<&'static str, String> {
    match value {
        "all" => Ok("all"),
        "normal" => Ok("normal"),
        "todo" => Ok("todo"),
        "timeline" => Ok("timeline"),
        "rich" | "rich_text" => Ok("rich"),
        _ => Err("不支持的便签类型".to_string()),
    }
}

fn setting_value(key: &str, fallback: &str) -> String {
    storage::list_settings()
        .ok()
        .and_then(|settings| {
            settings
                .into_iter()
                .find(|setting| setting.key == key)
                .map(|setting| setting.value)
        })
        .unwrap_or_else(|| fallback.to_string())
}

fn configure_auto_start(enabled: bool) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;

    let mut command = Command::new("reg");
    if enabled {
        command.args([
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            AUTO_START_VALUE_NAME,
            "/t",
            "REG_SZ",
            "/d",
            &current_exe.to_string_lossy(),
            "/f",
        ]);
    } else {
        command.args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            AUTO_START_VALUE_NAME,
            "/f",
        ]);
    }

    let output = command.output().map_err(|error| error.to_string())?;

    if output.status.success() || (!enabled && !is_auto_start_enabled()?) {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Err(if stderr.is_empty() { stdout } else { stderr })
}

fn is_auto_start_enabled() -> Result<bool, String> {
    let output = Command::new("reg")
        .args([
            "query",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            AUTO_START_VALUE_NAME,
        ])
        .output()
        .map_err(|error| error.to_string())?;

    Ok(output.status.success())
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
            setup_main_window_events(app.handle());
            setup_tray(app.handle()).map_err(setup_error)?;
            restore_sticky_windows(app.handle()).map_err(setup_error)?;
            apply_startup_behavior(app.handle()).map_err(setup_error)?;
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
            open_main_window,
            open_edge_entry,
            set_edge_entry_expanded,
            set_edge_position,
            get_auto_start_enabled,
            set_auto_start_enabled,
            post_sticky_note,
            unpost_sticky_note,
            get_sticky_window,
            list_sticky_windows,
            set_sticky_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("failed to run xBaoNotes");
}
