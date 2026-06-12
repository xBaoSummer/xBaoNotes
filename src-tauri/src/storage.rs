use chrono::{DateTime, Duration, Months, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const APP_DIR_NAME: &str = "xBaoNotes";
const DATABASE_FILE_NAME: &str = "xbao-notes.sqlite3";

#[derive(Debug, Serialize)]
pub struct AppPaths {
    pub root_dir: String,
    pub data_dir: String,
    pub attachments_dir: String,
    pub backup_dir: String,
    pub recycle_bin_dir: String,
    pub database_path: String,
}

#[derive(Debug, Serialize)]
pub struct StorageStatus {
    pub paths: AppPaths,
    pub folder_count: i64,
    pub note_count: i64,
    pub settings_count: i64,
}

#[derive(Debug, Serialize)]
pub struct FolderRecord {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct NoteRecord {
    pub id: String,
    pub note_type: String,
    pub title: String,
    pub content: String,
    pub folder_id: String,
    pub is_pinned: bool,
    pub is_deleted: bool,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SettingRecord {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct RecycleItemRecord {
    pub id: String,
    pub note_id: String,
    pub original_folder_id: String,
    pub deleted_at: String,
    pub title_snapshot: String,
}

#[derive(Debug, Serialize)]
pub struct AttachmentRecord {
    pub id: String,
    pub note_id: String,
    pub original_name: String,
    pub stored_name: String,
    pub stored_path: String,
    pub mime_type: String,
    pub size: i64,
    pub kind: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct StickyWindowRecord {
    pub note_id: String,
    pub is_posted: bool,
    pub is_always_on_top: bool,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct ReminderRecord {
    pub id: String,
    pub note_id: String,
    pub note_title: String,
    pub note_type: String,
    pub reminder_type: String,
    pub title: String,
    pub message: String,
    pub remind_at: String,
    pub repeat_rule: String,
    pub custom_interval_days: i64,
    pub is_enabled: bool,
    pub last_triggered_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteRequest {
    pub note_type: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct ListNotesRequest {
    pub note_type: Option<String>,
    pub folder_id: Option<String>,
    pub title_query: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteRequest {
    pub id: String,
    pub note_type: String,
    pub title: String,
    pub content: String,
    pub folder_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SetNotePinnedRequest {
    pub id: String,
    pub is_pinned: bool,
}

#[derive(Debug, Deserialize)]
pub struct NoteIdRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct AttachmentIdRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAttachmentRequest {
    pub note_id: String,
    pub source_path: String,
}

#[derive(Debug, Deserialize)]
pub struct SetSettingRequest {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct SetStickyAlwaysOnTopRequest {
    pub note_id: String,
    pub is_always_on_top: bool,
}

#[derive(Debug, Deserialize)]
pub struct SaveStickyBoundsRequest {
    pub note_id: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateReminderRequest {
    pub note_id: String,
    pub reminder_type: String,
    pub title: String,
    pub message: String,
    pub remind_at: String,
    pub repeat_rule: String,
    pub custom_interval_days: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReminderRequest {
    pub id: String,
    pub reminder_type: String,
    pub title: String,
    pub message: String,
    pub remind_at: String,
    pub repeat_rule: String,
    pub custom_interval_days: Option<i64>,
    pub is_enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct ReminderIdRequest {
    pub id: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct ListRemindersRequest {
    pub note_id: Option<String>,
    pub include_disabled: Option<bool>,
}

pub fn init_storage() -> Result<StorageStatus, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;

    create_schema(&connection)?;
    ensure_default_settings(&connection, &paths)?;
    ensure_default_folder(&connection)?;

    read_storage_status()
}

pub fn read_storage_status() -> Result<StorageStatus, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;

    Ok(StorageStatus {
        folder_count: count_rows(&connection, "folders")?,
        note_count: count_rows(&connection, "notes")?,
        settings_count: count_rows(&connection, "settings")?,
        paths,
    })
}

pub fn list_folders() -> Result<Vec<FolderRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, created_at, updated_at
             FROM folders
             WHERE is_deleted = 0
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(FolderRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn get_note_by_id(request: NoteIdRequest) -> Result<NoteRecord, String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let note = get_note(&connection, id)?;

    if note.is_deleted {
        return Err("便签已在回收站中".to_string());
    }

    Ok(note)
}

pub fn create_folder(request: CreateFolderRequest) -> Result<FolderRecord, String> {
    let name = request.name.trim();

    if name.is_empty() {
        return Err("文件夹名称不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;

    let existing: Result<String, _> = connection.query_row(
        "SELECT id FROM folders WHERE name = ?1 AND is_deleted = 0 LIMIT 1",
        params![name],
        |row| row.get(0),
    );

    if existing.is_ok() {
        return Err("文件夹已存在".to_string());
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO folders (id, name, is_deleted, created_at, updated_at, deleted_at)
             VALUES (?1, ?2, 0, ?3, ?3, NULL)",
            params![id, name, now],
        )
        .map_err(|error| error.to_string())?;

    get_folder(&connection, &id)
}

pub fn create_note(request: CreateNoteRequest) -> Result<NoteRecord, String> {
    let note_type = normalize_note_type(&request.note_type)?;
    let title = request.title.trim();

    if title.is_empty() {
        return Err("标题不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let folder_id = match request.folder_id {
        Some(folder_id) if !folder_id.trim().is_empty() => folder_id,
        _ => ensure_default_folder(&connection)?,
    };

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    connection
        .execute(
            "INSERT INTO notes (
                id, type, title, content, folder_id, is_pinned, is_deleted,
                created_at, updated_at, deleted_at
             )
             VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6, ?6, NULL)",
            params![id, note_type, title, request.content, folder_id, now],
        )
        .map_err(|error| error.to_string())?;

    get_note(&connection, &id)
}

pub fn list_notes(request: ListNotesRequest) -> Result<Vec<NoteRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let note_type = normalize_optional_note_type(request.note_type)?;
    let folder_id = normalize_optional_text(request.folder_id);
    let title_query =
        normalize_optional_text(request.title_query).map(|value| format!("%{value}%"));

    let mut statement = connection
        .prepare(
            "SELECT id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
             FROM notes
             WHERE is_deleted = 0
                AND (?1 IS NULL OR type = ?1)
                AND (?2 IS NULL OR folder_id = ?2)
                AND (?3 IS NULL OR title LIKE ?3 COLLATE NOCASE)
             ORDER BY is_pinned DESC, updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![note_type, folder_id, title_query], map_note_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn update_note(request: UpdateNoteRequest) -> Result<NoteRecord, String> {
    let id = request.id.trim();
    let note_type = normalize_note_type(&request.note_type)?;
    let title = request.title.trim();
    let folder_id = request.folder_id.trim();

    if id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    if title.is_empty() {
        return Err("标题不能为空".to_string());
    }

    if folder_id.is_empty() {
        return Err("文件夹不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    ensure_folder_exists(&connection, folder_id)?;
    let now = Utc::now().to_rfc3339();

    let changed = connection
        .execute(
            "UPDATE notes
             SET type = ?1,
                 title = ?2,
                 content = ?3,
                 folder_id = ?4,
                 updated_at = ?5
             WHERE id = ?6 AND is_deleted = 0",
            params![note_type, title, request.content, folder_id, now, id],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("未找到可编辑的便签".to_string());
    }

    get_note(&connection, id)
}

pub fn set_note_pinned(request: SetNotePinnedRequest) -> Result<NoteRecord, String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let now = Utc::now().to_rfc3339();
    let pinned = if request.is_pinned { 1 } else { 0 };
    let changed = connection
        .execute(
            "UPDATE notes
             SET is_pinned = ?1,
                 updated_at = ?2
             WHERE id = ?3 AND is_deleted = 0",
            params![pinned, now, id],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("未找到可置顶的便签".to_string());
    }

    get_note(&connection, id)
}

pub fn delete_note(request: NoteIdRequest) -> Result<NoteRecord, String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let note = get_note(&connection, id)?;

    if note.is_deleted {
        return Err("便签已经在回收站中".to_string());
    }

    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "UPDATE notes
             SET is_deleted = 1,
                 is_pinned = 0,
                 deleted_at = ?1,
                 updated_at = ?1
             WHERE id = ?2 AND is_deleted = 0",
            params![now, id],
        )
        .map_err(|error| error.to_string())?;

    connection
        .execute(
            "INSERT INTO recycle_items (
                id, note_id, original_folder_id, deleted_at, title_snapshot
             )
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(note_id) DO UPDATE SET
                original_folder_id = excluded.original_folder_id,
                deleted_at = excluded.deleted_at,
                title_snapshot = excluded.title_snapshot",
            params![
                Uuid::new_v4().to_string(),
                id,
                note.folder_id,
                now,
                note.title
            ],
        )
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "UPDATE sticky_windows
             SET is_posted = 0,
                 updated_at = ?1
             WHERE note_id = ?2",
            params![now, id],
        )
        .map_err(|error| error.to_string())?;

    get_note(&connection, id)
}

pub fn list_recycle_items() -> Result<Vec<RecycleItemRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let mut statement = connection
        .prepare(
            "SELECT recycle_items.id,
                    recycle_items.note_id,
                    recycle_items.original_folder_id,
                    recycle_items.deleted_at,
                    recycle_items.title_snapshot
             FROM recycle_items
             INNER JOIN notes ON notes.id = recycle_items.note_id
             WHERE notes.is_deleted = 1
             ORDER BY recycle_items.deleted_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], map_recycle_item_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn restore_note(request: NoteIdRequest) -> Result<NoteRecord, String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let original_folder_id: String = connection
        .query_row(
            "SELECT original_folder_id FROM recycle_items WHERE note_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let folder_id = if folder_exists(&connection, &original_folder_id)? {
        original_folder_id
    } else {
        ensure_default_folder(&connection)?
    };
    let now = Utc::now().to_rfc3339();
    let changed = connection
        .execute(
            "UPDATE notes
             SET is_deleted = 0,
                 deleted_at = NULL,
                 folder_id = ?1,
                 updated_at = ?2
             WHERE id = ?3 AND is_deleted = 1",
            params![folder_id, now, id],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("未找到可恢复的便签".to_string());
    }

    connection
        .execute("DELETE FROM recycle_items WHERE note_id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    get_note(&connection, id)
}

pub fn purge_note(request: NoteIdRequest) -> Result<(), String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    ensure_note_is_deleted(&connection, id)?;
    let attachment_paths = list_attachment_paths_for_note(&connection, id)?;

    for stored_path in &attachment_paths {
        remove_file_if_exists(stored_path)?;
    }

    let changed = connection
        .execute(
            "DELETE FROM notes WHERE id = ?1 AND is_deleted = 1",
            params![id],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("未找到可彻底删除的便签".to_string());
    }

    connection
        .execute("DELETE FROM recycle_items WHERE note_id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    remove_note_attachment_dir(&paths, id)?;

    Ok(())
}

pub fn empty_recycle_bin() -> Result<(), String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let attachment_paths = list_attachment_paths_for_deleted_notes(&connection)?;

    for stored_path in &attachment_paths {
        remove_file_if_exists(stored_path)?;
    }

    connection
        .execute("DELETE FROM notes WHERE is_deleted = 1", [])
        .map_err(|error| error.to_string())?;
    connection
        .execute("DELETE FROM recycle_items", [])
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn create_attachment(request: CreateAttachmentRequest) -> Result<AttachmentRecord, String> {
    let note_id = request.note_id.trim();
    let source_path_text = request.source_path.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    if source_path_text.is_empty() {
        return Err("附件路径不能为空".to_string());
    }

    let source_path = PathBuf::from(source_path_text);

    if !source_path.is_file() {
        return Err("只能拖入本地文件，暂不支持文件夹".to_string());
    }

    let original_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("无法读取附件文件名")?
        .to_string();
    let safe_original_name = sanitize_file_name(&original_name);

    if safe_original_name.is_empty() {
        return Err("附件文件名无效".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    ensure_note_is_active(&connection, note_id)?;

    let note_attachment_dir = PathBuf::from(&paths.attachments_dir).join(note_id);
    fs::create_dir_all(&note_attachment_dir).map_err(|error| {
        format!(
            "无法创建附件目录 {}: {}",
            note_attachment_dir.display(),
            error
        )
    })?;

    let id = Uuid::new_v4().to_string();
    let stored_name = format!("{}_{}", id, safe_original_name);
    let stored_path = note_attachment_dir.join(&stored_name);
    fs::copy(&source_path, &stored_path).map_err(|error| {
        format!(
            "无法复制附件 {} 到 {}: {}",
            source_path.display(),
            stored_path.display(),
            error
        )
    })?;

    let metadata = fs::metadata(&stored_path).map_err(|error| error.to_string())?;
    let mime_type = guess_mime_type(&stored_path);
    let kind = classify_attachment_kind(&stored_path);
    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "INSERT INTO attachments (
                id, note_id, original_name, stored_name, stored_path,
                mime_type, size, kind, created_at
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                note_id,
                original_name,
                stored_name,
                path_to_string(stored_path),
                mime_type,
                metadata.len() as i64,
                kind,
                now
            ],
        )
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "UPDATE notes
             SET updated_at = ?1
             WHERE id = ?2 AND is_deleted = 0",
            params![now, note_id],
        )
        .map_err(|error| error.to_string())?;

    get_attachment(&connection, &id)
}

pub fn list_attachments(request: NoteIdRequest) -> Result<Vec<AttachmentRecord>, String> {
    let note_id = request.id.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let mut statement = connection
        .prepare(
            "SELECT id, note_id, original_name, stored_name, stored_path,
                    mime_type, size, kind, created_at
             FROM attachments
             WHERE note_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![note_id], map_attachment_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn open_attachment(request: AttachmentIdRequest) -> Result<(), String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("附件 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let attachment = get_attachment(&connection, id)?;
    let stored_path = PathBuf::from(&attachment.stored_path);

    if !stored_path.is_file() {
        return Err("附件文件不存在，可能已被移动或删除".to_string());
    }

    tauri_plugin_opener::open_path(stored_path, None::<&str>).map_err(|error| error.to_string())
}

pub fn list_settings() -> Result<Vec<SettingRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let mut statement = connection
        .prepare(
            "SELECT key, value, updated_at
             FROM settings
             ORDER BY key ASC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(SettingRecord {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn set_setting(request: SetSettingRequest) -> Result<SettingRecord, String> {
    let key = request.key.trim();

    if !matches!(
        key,
        "theme_mode"
            | "startup_mode"
            | "backup_dir"
            | "recycle_bin_dir"
            | "edge_position"
            | "edge_entry_enabled"
            | "auto_start_enabled"
    ) {
        return Err("不支持的设置项".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let now = Utc::now().to_rfc3339();

    connection
        .execute(
            "INSERT INTO settings (key, value, updated_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at",
            params![key, request.value, now],
        )
        .map_err(|error| error.to_string())?;

    get_setting(&connection, key)
}

pub fn post_sticky_note(request: NoteIdRequest) -> Result<StickyWindowRecord, String> {
    let note_id = request.id.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    ensure_note_is_active(&connection, note_id)?;
    let now = Utc::now().to_rfc3339();

    connection
        .execute(
            "INSERT INTO sticky_windows (
                note_id, is_posted, is_always_on_top, x, y, width, height, created_at, updated_at
             )
             VALUES (?1, 1, 1, 120.0, 120.0, 360.0, 420.0, ?2, ?2)
             ON CONFLICT(note_id) DO UPDATE SET
                is_posted = 1,
                is_always_on_top = 1,
                updated_at = excluded.updated_at",
            params![note_id, now],
        )
        .map_err(|error| error.to_string())?;

    get_sticky_window_by_note_id(&connection, note_id)
}

pub fn unpost_sticky_note(request: NoteIdRequest) -> Result<StickyWindowRecord, String> {
    let note_id = request.id.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let now = Utc::now().to_rfc3339();
    let changed = connection
        .execute(
            "UPDATE sticky_windows
             SET is_posted = 0,
                 updated_at = ?1
             WHERE note_id = ?2",
            params![now, note_id],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("便签尚未贴出".to_string());
    }

    get_sticky_window_by_note_id(&connection, note_id)
}

pub fn get_sticky_window(request: NoteIdRequest) -> Result<StickyWindowRecord, String> {
    let note_id = request.id.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;

    get_sticky_window_by_note_id(&connection, note_id)
}

pub fn list_sticky_windows() -> Result<Vec<StickyWindowRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let mut statement = connection
        .prepare(
            "SELECT sticky_windows.note_id,
                    sticky_windows.is_posted,
                    sticky_windows.is_always_on_top,
                    sticky_windows.x,
                    sticky_windows.y,
                    sticky_windows.width,
                    sticky_windows.height,
                    sticky_windows.created_at,
                    sticky_windows.updated_at
             FROM sticky_windows
             INNER JOIN notes ON notes.id = sticky_windows.note_id
             WHERE sticky_windows.is_posted = 1
                AND notes.is_deleted = 0
             ORDER BY sticky_windows.updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], map_sticky_window_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn save_sticky_window_bounds(
    request: SaveStickyBoundsRequest,
) -> Result<StickyWindowRecord, String> {
    let note_id = request.note_id.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let width = request.width.clamp(260.0, 1400.0);
    let height = request.height.clamp(220.0, 1200.0);
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    ensure_note_is_active(&connection, note_id)?;
    let now = Utc::now().to_rfc3339();

    connection
        .execute(
            "INSERT INTO sticky_windows (
                note_id, is_posted, is_always_on_top, x, y, width, height, created_at, updated_at
             )
             VALUES (?1, 1, 1, ?2, ?3, ?4, ?5, ?6, ?6)
             ON CONFLICT(note_id) DO UPDATE SET
                x = excluded.x,
                y = excluded.y,
                width = excluded.width,
                height = excluded.height,
                updated_at = excluded.updated_at",
            params![note_id, request.x, request.y, width, height, now],
        )
        .map_err(|error| error.to_string())?;

    get_sticky_window_by_note_id(&connection, note_id)
}

pub fn set_sticky_always_on_top(
    request: SetStickyAlwaysOnTopRequest,
) -> Result<StickyWindowRecord, String> {
    let note_id = request.note_id.trim();

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let now = Utc::now().to_rfc3339();
    let always_on_top = if request.is_always_on_top { 1 } else { 0 };
    let changed = connection
        .execute(
            "UPDATE sticky_windows
             SET is_always_on_top = ?1,
                 updated_at = ?2
             WHERE note_id = ?3",
            params![always_on_top, now, note_id],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("便签尚未贴出".to_string());
    }

    get_sticky_window_by_note_id(&connection, note_id)
}

pub fn force_sticky_always_on_top(note_id: &str) -> Result<StickyWindowRecord, String> {
    set_sticky_always_on_top(SetStickyAlwaysOnTopRequest {
        note_id: note_id.to_string(),
        is_always_on_top: true,
    })
}

pub fn create_reminder(request: CreateReminderRequest) -> Result<ReminderRecord, String> {
    let note_id = request.note_id.trim();
    let title = request.title.trim();
    let reminder_type = normalize_reminder_type(&request.reminder_type)?;
    let repeat_rule = normalize_repeat_rule(&request.repeat_rule)?;
    let custom_interval_days =
        normalize_custom_interval_days(request.custom_interval_days, repeat_rule)?;
    let remind_at = normalize_remind_at(&request.remind_at)?;

    if note_id.is_empty() {
        return Err("便签 ID 不能为空".to_string());
    }

    if title.is_empty() {
        return Err("提醒标题不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    ensure_note_is_active(&connection, note_id)?;
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    connection
        .execute(
            "INSERT INTO reminders (
                id, note_id, reminder_type, title, message, remind_at, repeat_rule, custom_interval_days,
                is_enabled, last_triggered_at, created_at, updated_at
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, NULL, ?9, ?9)",
            params![
                id,
                note_id,
                reminder_type,
                title,
                request.message,
                remind_at,
                repeat_rule,
                custom_interval_days,
                now
            ],
        )
        .map_err(|error| error.to_string())?;

    get_reminder(&connection, &id)
}

pub fn update_reminder(request: UpdateReminderRequest) -> Result<ReminderRecord, String> {
    let id = request.id.trim();
    let title = request.title.trim();
    let reminder_type = normalize_reminder_type(&request.reminder_type)?;
    let repeat_rule = normalize_repeat_rule(&request.repeat_rule)?;
    let custom_interval_days =
        normalize_custom_interval_days(request.custom_interval_days, repeat_rule)?;
    let remind_at = normalize_remind_at(&request.remind_at)?;

    if id.is_empty() {
        return Err("提醒 ID 不能为空".to_string());
    }

    if title.is_empty() {
        return Err("提醒标题不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let now = Utc::now().to_rfc3339();
    let enabled = if request.is_enabled { 1 } else { 0 };
    let changed = connection
        .execute(
            "UPDATE reminders
             SET reminder_type = ?1,
                 title = ?2,
                 message = ?3,
                 remind_at = ?4,
                 repeat_rule = ?5,
                 custom_interval_days = ?6,
                 is_enabled = ?7,
                 updated_at = ?8
             WHERE id = ?9",
            params![
                reminder_type,
                title,
                request.message,
                remind_at,
                repeat_rule,
                custom_interval_days,
                enabled,
                now,
                id
            ],
        )
        .map_err(|error| error.to_string())?;

    if changed == 0 {
        return Err("未找到提醒".to_string());
    }

    get_reminder(&connection, id)
}

pub fn delete_reminder(request: ReminderIdRequest) -> Result<(), String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("提醒 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    connection
        .execute("DELETE FROM reminders WHERE id = ?1", params![id])
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn list_reminders(request: ListRemindersRequest) -> Result<Vec<ReminderRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let note_id = normalize_optional_text(request.note_id);
    let include_disabled = request.include_disabled.unwrap_or(false);
    let mut statement = connection
        .prepare(
            "SELECT reminders.id,
                    reminders.note_id,
                    notes.title,
                    notes.type,
                    reminders.reminder_type,
                    reminders.title,
                    reminders.message,
                    reminders.remind_at,
                    reminders.repeat_rule,
                    reminders.custom_interval_days,
                    reminders.is_enabled,
                    reminders.last_triggered_at,
                    reminders.created_at,
                    reminders.updated_at
             FROM reminders
             INNER JOIN notes ON notes.id = reminders.note_id
             WHERE notes.is_deleted = 0
                AND (?1 IS NULL OR reminders.note_id = ?1)
                AND (?2 = 1 OR reminders.is_enabled = 1)
             ORDER BY reminders.is_enabled DESC, reminders.remind_at ASC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![note_id, if include_disabled { 1 } else { 0 }], map_reminder_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn list_due_reminders() -> Result<Vec<ReminderRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let now = Utc::now().to_rfc3339();
    let mut statement = connection
        .prepare(
            "SELECT reminders.id,
                    reminders.note_id,
                    notes.title,
                    notes.type,
                    reminders.reminder_type,
                    reminders.title,
                    reminders.message,
                    reminders.remind_at,
                    reminders.repeat_rule,
                    reminders.custom_interval_days,
                    reminders.is_enabled,
                    reminders.last_triggered_at,
                    reminders.created_at,
                    reminders.updated_at
             FROM reminders
             INNER JOIN notes ON notes.id = reminders.note_id
             WHERE notes.is_deleted = 0
                AND reminders.is_enabled = 1
                AND reminders.remind_at <= ?1
             ORDER BY reminders.remind_at ASC
             LIMIT 20",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![now], map_reminder_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

pub fn complete_reminder(request: ReminderIdRequest) -> Result<ReminderRecord, String> {
    let id = request.id.trim();

    if id.is_empty() {
        return Err("提醒 ID 不能为空".to_string());
    }

    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let reminder = get_reminder(&connection, id)?;
    let now = Utc::now();
    let now_text = now.to_rfc3339();

    if reminder.repeat_rule == "none" {
        connection
            .execute(
                "UPDATE reminders
                 SET is_enabled = 0,
                     last_triggered_at = ?1,
                     updated_at = ?1
                 WHERE id = ?2",
                params![now_text, id],
            )
            .map_err(|error| error.to_string())?;
    } else {
        let next_remind_at = next_repeat_time(
            &reminder.remind_at,
            &reminder.repeat_rule,
            reminder.custom_interval_days,
            now,
        )?;
        connection
            .execute(
                "UPDATE reminders
                 SET remind_at = ?1,
                     last_triggered_at = ?2,
                     updated_at = ?2
                 WHERE id = ?3",
                params![next_remind_at, now_text, id],
            )
            .map_err(|error| error.to_string())?;
    }

    get_reminder(&connection, id)
}

fn ensure_app_paths() -> Result<AppPaths, String> {
    let documents_dir = dirs::document_dir().ok_or("无法定位当前用户的 Documents 目录")?;
    let root_dir = documents_dir.join(APP_DIR_NAME);
    let data_dir = root_dir.join("Data");
    let attachments_dir = root_dir.join("Attachments");
    let backup_dir = root_dir.join("Backup");
    let recycle_bin_dir = root_dir.join("Recycle Bin");
    let database_path = data_dir.join(DATABASE_FILE_NAME);

    for dir in [
        &root_dir,
        &data_dir,
        &attachments_dir,
        &backup_dir,
        &recycle_bin_dir,
    ] {
        fs::create_dir_all(dir)
            .map_err(|error| format!("无法创建目录 {}: {}", dir.display(), error))?;
    }

    Ok(AppPaths {
        root_dir: path_to_string(root_dir),
        data_dir: path_to_string(data_dir),
        attachments_dir: path_to_string(attachments_dir),
        backup_dir: path_to_string(backup_dir),
        recycle_bin_dir: path_to_string(recycle_bin_dir),
        database_path: path_to_string(database_path),
    })
}

fn open_connection(paths: &AppPaths) -> Result<Connection, String> {
    let connection = Connection::open(&paths.database_path).map_err(|error| error.to_string())?;
    connection
        .execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;",
        )
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn create_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );

            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL CHECK (type IN ('normal', 'todo', 'timeline', 'rich_text')),
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                folder_id TEXT NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT,
                FOREIGN KEY(folder_id) REFERENCES folders(id)
            );

            CREATE TABLE IF NOT EXISTS recycle_items (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL UNIQUE,
                original_folder_id TEXT NOT NULL,
                deleted_at TEXT NOT NULL,
                title_snapshot TEXT NOT NULL,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('image', 'file')),
                created_at TEXT NOT NULL,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS sticky_windows (
                note_id TEXT PRIMARY KEY,
                is_posted INTEGER NOT NULL DEFAULT 0,
                is_always_on_top INTEGER NOT NULL DEFAULT 1,
                x REAL NOT NULL DEFAULT 120.0,
                y REAL NOT NULL DEFAULT 120.0,
                width REAL NOT NULL DEFAULT 360.0,
                height REAL NOT NULL DEFAULT 420.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                reminder_type TEXT NOT NULL CHECK (reminder_type IN ('once', 'due', 'repeat', 'anniversary', 'review')),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                remind_at TEXT NOT NULL,
                repeat_rule TEXT NOT NULL DEFAULT 'none' CHECK (repeat_rule IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')),
                custom_interval_days INTEGER NOT NULL DEFAULT 1 CHECK (custom_interval_days >= 1 AND custom_interval_days <= 3650),
                is_enabled INTEGER NOT NULL DEFAULT 1,
                last_triggered_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
            CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
            CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
            CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(is_deleted);
            CREATE INDEX IF NOT EXISTS idx_recycle_items_note_id ON recycle_items(note_id);
            CREATE INDEX IF NOT EXISTS idx_recycle_items_deleted_at ON recycle_items(deleted_at);
            CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
            CREATE INDEX IF NOT EXISTS idx_attachments_kind ON attachments(kind);
            CREATE INDEX IF NOT EXISTS idx_sticky_windows_posted ON sticky_windows(is_posted);
            CREATE INDEX IF NOT EXISTS idx_reminders_note_id ON reminders(note_id);
            CREATE INDEX IF NOT EXISTS idx_reminders_enabled_time ON reminders(is_enabled, remind_at);
            ",
        )
        .map_err(|error| error.to_string())
}

fn ensure_default_settings(connection: &Connection, paths: &AppPaths) -> Result<(), String> {
    set_default_setting(connection, "theme_mode", "system")?;
    set_default_setting(connection, "startup_mode", "edge_entry")?;
    set_default_setting(connection, "edge_position", "right")?;
    set_default_setting(connection, "edge_entry_enabled", "true")?;
    set_default_setting(connection, "auto_start_enabled", "false")?;
    set_default_setting(connection, "backup_dir", &paths.backup_dir)?;
    set_default_setting(connection, "recycle_bin_dir", &paths.recycle_bin_dir)
}

fn set_default_setting(connection: &Connection, key: &str, value: &str) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    connection
        .execute(
            "INSERT OR IGNORE INTO settings (key, value, updated_at)
             VALUES (?1, ?2, ?3)",
            params![key, value, now],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn ensure_default_folder(connection: &Connection) -> Result<String, String> {
    let existing: Result<String, _> = connection.query_row(
        "SELECT id FROM folders WHERE name = '默认文件夹' AND is_deleted = 0 LIMIT 1",
        [],
        |row| row.get(0),
    );

    if let Ok(folder_id) = existing {
        return Ok(folder_id);
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    connection
        .execute(
            "INSERT INTO folders (id, name, is_deleted, created_at, updated_at, deleted_at)
             VALUES (?1, '默认文件夹', 0, ?2, ?2, NULL)",
            params![id, now],
        )
        .map_err(|error| error.to_string())?;
    Ok(id)
}

fn count_rows(connection: &Connection, table_name: &str) -> Result<i64, String> {
    let sql = format!("SELECT COUNT(*) FROM {table_name}");
    connection
        .query_row(&sql, [], |row| row.get(0))
        .map_err(|error| error.to_string())
}

fn get_note(connection: &Connection, id: &str) -> Result<NoteRecord, String> {
    connection
        .query_row(
            "SELECT id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
             FROM notes
             WHERE id = ?1",
            params![id],
            map_note_row,
        )
        .map_err(|error| error.to_string())
}

fn get_folder(connection: &Connection, id: &str) -> Result<FolderRecord, String> {
    connection
        .query_row(
            "SELECT id, name, created_at, updated_at
             FROM folders
             WHERE id = ?1",
            params![id],
            |row| {
                Ok(FolderRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn get_setting(connection: &Connection, key: &str) -> Result<SettingRecord, String> {
    connection
        .query_row(
            "SELECT key, value, updated_at
             FROM settings
             WHERE key = ?1",
            params![key],
            |row| {
                Ok(SettingRecord {
                    key: row.get(0)?,
                    value: row.get(1)?,
                    updated_at: row.get(2)?,
                })
            },
        )
        .map_err(|error| error.to_string())
}

fn ensure_folder_exists(connection: &Connection, folder_id: &str) -> Result<(), String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM folders WHERE id = ?1 AND is_deleted = 0",
            params![folder_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    if count == 0 {
        return Err("文件夹不存在".to_string());
    }

    Ok(())
}

fn ensure_note_is_active(connection: &Connection, note_id: &str) -> Result<(), String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE id = ?1 AND is_deleted = 0",
            params![note_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    if count == 0 {
        return Err("未找到可添加附件的便签".to_string());
    }

    Ok(())
}

fn ensure_note_is_deleted(connection: &Connection, note_id: &str) -> Result<(), String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE id = ?1 AND is_deleted = 1",
            params![note_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    if count == 0 {
        return Err("未找到可彻底删除的便签".to_string());
    }

    Ok(())
}

fn folder_exists(connection: &Connection, folder_id: &str) -> Result<bool, String> {
    let count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM folders WHERE id = ?1 AND is_deleted = 0",
            params![folder_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    Ok(count > 0)
}

fn get_attachment(connection: &Connection, id: &str) -> Result<AttachmentRecord, String> {
    connection
        .query_row(
            "SELECT id, note_id, original_name, stored_name, stored_path,
                    mime_type, size, kind, created_at
             FROM attachments
             WHERE id = ?1",
            params![id],
            map_attachment_row,
        )
        .map_err(|error| error.to_string())
}

fn get_sticky_window_by_note_id(
    connection: &Connection,
    note_id: &str,
) -> Result<StickyWindowRecord, String> {
    connection
        .query_row(
            "SELECT note_id, is_posted, is_always_on_top, x, y, width, height, created_at, updated_at
             FROM sticky_windows
             WHERE note_id = ?1",
            params![note_id],
            map_sticky_window_row,
        )
        .map_err(|error| error.to_string())
}

fn get_reminder(connection: &Connection, id: &str) -> Result<ReminderRecord, String> {
    connection
        .query_row(
            "SELECT reminders.id,
                    reminders.note_id,
                    notes.title,
                    notes.type,
                    reminders.reminder_type,
                    reminders.title,
                    reminders.message,
                    reminders.remind_at,
                    reminders.repeat_rule,
                    reminders.custom_interval_days,
                    reminders.is_enabled,
                    reminders.last_triggered_at,
                    reminders.created_at,
                    reminders.updated_at
             FROM reminders
             INNER JOIN notes ON notes.id = reminders.note_id
             WHERE reminders.id = ?1",
            params![id],
            map_reminder_row,
        )
        .map_err(|error| error.to_string())
}

fn list_attachment_paths_for_note(
    connection: &Connection,
    note_id: &str,
) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "SELECT stored_path
             FROM attachments
             WHERE note_id = ?1",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map(params![note_id], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

fn list_attachment_paths_for_deleted_notes(connection: &Connection) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "SELECT attachments.stored_path
             FROM attachments
             INNER JOIN notes ON notes.id = attachments.note_id
             WHERE notes.is_deleted = 1",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
}

fn remove_file_if_exists(path: &str) -> Result<(), String> {
    let file_path = PathBuf::from(path);

    match fs::remove_file(&file_path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("无法删除附件 {}: {}", file_path.display(), error)),
    }
}

fn remove_note_attachment_dir(paths: &AppPaths, note_id: &str) -> Result<(), String> {
    let dir = PathBuf::from(&paths.attachments_dir).join(note_id);

    match fs::remove_dir(&dir) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::DirectoryNotEmpty => Ok(()),
        Err(error) => Err(format!("无法清理附件目录 {}: {}", dir.display(), error)),
    }
}

fn map_note_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<NoteRecord> {
    Ok(NoteRecord {
        id: row.get(0)?,
        note_type: row.get(1)?,
        title: row.get(2)?,
        content: row.get(3)?,
        folder_id: row.get(4)?,
        is_pinned: row.get::<_, i64>(5)? == 1,
        is_deleted: row.get::<_, i64>(6)? == 1,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        deleted_at: row.get(9)?,
    })
}

fn map_attachment_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<AttachmentRecord> {
    Ok(AttachmentRecord {
        id: row.get(0)?,
        note_id: row.get(1)?,
        original_name: row.get(2)?,
        stored_name: row.get(3)?,
        stored_path: row.get(4)?,
        mime_type: row.get(5)?,
        size: row.get(6)?,
        kind: row.get(7)?,
        created_at: row.get(8)?,
    })
}

fn map_sticky_window_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<StickyWindowRecord> {
    Ok(StickyWindowRecord {
        note_id: row.get(0)?,
        is_posted: row.get::<_, i64>(1)? == 1,
        is_always_on_top: row.get::<_, i64>(2)? == 1,
        x: row.get(3)?,
        y: row.get(4)?,
        width: row.get(5)?,
        height: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn map_reminder_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ReminderRecord> {
    Ok(ReminderRecord {
        id: row.get(0)?,
        note_id: row.get(1)?,
        note_title: row.get(2)?,
        note_type: row.get(3)?,
        reminder_type: row.get(4)?,
        title: row.get(5)?,
        message: row.get(6)?,
        remind_at: row.get(7)?,
        repeat_rule: row.get(8)?,
        custom_interval_days: row.get(9)?,
        is_enabled: row.get::<_, i64>(10)? == 1,
        last_triggered_at: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

fn map_recycle_item_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<RecycleItemRecord> {
    Ok(RecycleItemRecord {
        id: row.get(0)?,
        note_id: row.get(1)?,
        original_folder_id: row.get(2)?,
        deleted_at: row.get(3)?,
        title_snapshot: row.get(4)?,
    })
}

fn sanitize_file_name(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            character if character.is_control() => '_',
            character => character,
        })
        .collect::<String>();

    sanitized.trim().trim_matches('.').to_string()
}

fn guess_mime_type(path: &Path) -> String {
    match extension_lowercase(path).as_deref() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("svg") => "image/svg+xml",
        Some("pdf") => "application/pdf",
        Some("txt") | Some("md") => "text/plain",
        Some("json") => "application/json",
        Some("csv") => "text/csv",
        Some("doc") => "application/msword",
        Some("docx") => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Some("xls") => "application/vnd.ms-excel",
        Some("xlsx") => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        Some("ppt") => "application/vnd.ms-powerpoint",
        Some("pptx") => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        Some("zip") => "application/zip",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn classify_attachment_kind(path: &Path) -> &'static str {
    match extension_lowercase(path).as_deref() {
        Some("png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "svg") => "image",
        _ => "file",
    }
}

fn extension_lowercase(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
}

fn normalize_note_type(value: &str) -> Result<&'static str, String> {
    match value {
        "normal" => Ok("normal"),
        "todo" => Ok("todo"),
        "timeline" => Ok("timeline"),
        "rich" | "rich_text" => Ok("rich_text"),
        _ => Err("不支持的便签类型".to_string()),
    }
}

fn normalize_reminder_type(value: &str) -> Result<&'static str, String> {
    match value {
        "once" => Ok("once"),
        "due" => Ok("due"),
        "repeat" => Ok("repeat"),
        "anniversary" => Ok("anniversary"),
        "review" => Ok("review"),
        _ => Err("不支持的提醒类型".to_string()),
    }
}

fn normalize_repeat_rule(value: &str) -> Result<&'static str, String> {
    match value {
        "none" | "" => Ok("none"),
        "daily" => Ok("daily"),
        "weekly" => Ok("weekly"),
        "monthly" => Ok("monthly"),
        "yearly" => Ok("yearly"),
        "custom" => Ok("custom"),
        _ => Err("不支持的重复规则".to_string()),
    }
}

fn normalize_custom_interval_days(
    value: Option<i64>,
    repeat_rule: &str,
) -> Result<i64, String> {
    let days = value.unwrap_or(1);

    if repeat_rule != "custom" {
        return Ok(1);
    }

    if !(1..=3650).contains(&days) {
        return Err("自定义重复间隔必须在 1 到 3650 天之间".to_string());
    }

    Ok(days)
}

fn normalize_remind_at(value: &str) -> Result<String, String> {
    DateTime::parse_from_rfc3339(value)
        .map(|date| date.with_timezone(&Utc).to_rfc3339())
        .map_err(|_| "提醒时间格式无效".to_string())
}

fn next_repeat_time(
    remind_at: &str,
    repeat_rule: &str,
    custom_interval_days: i64,
    now: DateTime<Utc>,
) -> Result<String, String> {
    let mut next = DateTime::parse_from_rfc3339(remind_at)
        .map_err(|_| "提醒时间格式无效".to_string())?
        .with_timezone(&Utc);

    if repeat_rule == "custom" && custom_interval_days < 1 {
        return Err("自定义重复间隔必须大于 0 天".to_string());
    }

    while next <= now {
        next = match repeat_rule {
            "daily" => next + Duration::days(1),
            "weekly" => next + Duration::weeks(1),
            "monthly" => next
                .checked_add_months(Months::new(1))
                .ok_or("无法计算下一个月度提醒时间")?,
            "yearly" => next
                .checked_add_months(Months::new(12))
                .ok_or("无法计算下一个年度提醒时间")?,
            "custom" => next + Duration::days(custom_interval_days),
            _ => return Err("不支持的重复规则".to_string()),
        };
    }

    Ok(next.to_rfc3339())
}

fn normalize_optional_note_type(value: Option<String>) -> Result<Option<String>, String> {
    match normalize_optional_text(value) {
        Some(value) if value == "all" => Ok(None),
        Some(value) => Ok(Some(normalize_note_type(&value)?.to_string())),
        None => Ok(None),
    }
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
) -> Result<Vec<T>, String> {
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_creates_default_records() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        create_schema(&connection).expect("create schema");
        let paths = AppPaths {
            root_dir: "root".to_string(),
            data_dir: "data".to_string(),
            attachments_dir: "attachments".to_string(),
            backup_dir: "backup".to_string(),
            recycle_bin_dir: "recycle".to_string(),
            database_path: ":memory:".to_string(),
        };

        ensure_default_settings(&connection, &paths).expect("seed settings");
        let default_folder_id = ensure_default_folder(&connection).expect("seed folder");

        assert_eq!(count_rows(&connection, "settings").unwrap(), 7);
        assert_eq!(count_rows(&connection, "folders").unwrap(), 1);
        assert_eq!(count_rows(&connection, "attachments").unwrap(), 0);
        assert_eq!(count_rows(&connection, "recycle_items").unwrap(), 0);
        assert_eq!(count_rows(&connection, "sticky_windows").unwrap(), 0);
        assert_eq!(count_rows(&connection, "reminders").unwrap(), 0);
        assert!(!default_folder_id.is_empty());
    }

    #[test]
    fn note_management_updates_and_filters_records() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        create_schema(&connection).expect("create schema");
        let folder_id = ensure_default_folder(&connection).expect("seed folder");
        let now = Utc::now().to_rfc3339();
        let note_id = Uuid::new_v4().to_string();

        connection
            .execute(
                "INSERT INTO notes (
                    id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
                 )
                 VALUES (?1, 'normal', '购物清单', '牛奶', ?2, 0, 0, ?3, ?3, NULL)",
                params![note_id, folder_id, now],
            )
            .expect("insert note");

        ensure_folder_exists(&connection, &folder_id).expect("folder exists");
        let note = get_note(&connection, &note_id).expect("read note");

        assert_eq!(note.title, "购物清单");
        assert_eq!(note.note_type, "normal");
        assert!(!note.is_pinned);

        connection
            .execute(
                "UPDATE notes SET title = '工作清单', type = 'todo', is_pinned = 1 WHERE id = ?1",
                params![note_id],
            )
            .expect("update note");

        let updated_note = get_note(&connection, &note_id).expect("read updated note");

        assert_eq!(updated_note.title, "工作清单");
        assert_eq!(updated_note.note_type, "todo");
        assert!(updated_note.is_pinned);
    }

    #[test]
    fn recycle_bin_restores_and_purges_notes() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        create_schema(&connection).expect("create schema");
        let folder_id = ensure_default_folder(&connection).expect("seed folder");
        let now = Utc::now().to_rfc3339();
        let note_id = Uuid::new_v4().to_string();

        connection
            .execute(
                "INSERT INTO notes (
                    id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
                 )
                 VALUES (?1, 'normal', '可恢复便签', '内容', ?2, 1, 0, ?3, ?3, NULL)",
                params![note_id, folder_id, now],
            )
            .expect("insert note");

        let deleted_at = Utc::now().to_rfc3339();
        connection
            .execute(
                "UPDATE notes SET is_deleted = 1, is_pinned = 0, deleted_at = ?1 WHERE id = ?2",
                params![deleted_at, note_id],
            )
            .expect("soft delete note");
        connection
            .execute(
                "INSERT INTO recycle_items (id, note_id, original_folder_id, deleted_at, title_snapshot)
                 VALUES (?1, ?2, ?3, ?4, '可恢复便签')",
                params![Uuid::new_v4().to_string(), note_id, folder_id, deleted_at],
            )
            .expect("insert recycle item");

        assert_eq!(count_rows(&connection, "recycle_items").unwrap(), 1);

        connection
            .execute(
                "UPDATE notes SET is_deleted = 0, deleted_at = NULL WHERE id = ?1",
                params![note_id],
            )
            .expect("restore note");
        connection
            .execute(
                "DELETE FROM recycle_items WHERE note_id = ?1",
                params![note_id],
            )
            .expect("remove recycle item");

        let restored_note = get_note(&connection, &note_id).expect("read restored note");

        assert!(!restored_note.is_deleted);
        assert_eq!(count_rows(&connection, "recycle_items").unwrap(), 0);

        connection
            .execute(
                "UPDATE notes SET is_deleted = 1 WHERE id = ?1",
                params![note_id],
            )
            .expect("soft delete again");
        connection
            .execute(
                "DELETE FROM notes WHERE id = ?1 AND is_deleted = 1",
                params![note_id],
            )
            .expect("purge note");

        assert_eq!(count_rows(&connection, "notes").unwrap(), 0);
    }

    #[test]
    fn attachment_records_are_linked_to_notes() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        create_schema(&connection).expect("create schema");
        let folder_id = ensure_default_folder(&connection).expect("seed folder");
        let now = Utc::now().to_rfc3339();
        let note_id = Uuid::new_v4().to_string();
        let attachment_id = Uuid::new_v4().to_string();

        connection
            .execute(
                "INSERT INTO notes (
                    id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
                 )
                 VALUES (?1, 'rich_text', '附件笔记', '<p>内容</p>', ?2, 0, 0, ?3, ?3, NULL)",
                params![note_id, folder_id, now],
            )
            .expect("insert note");
        connection
            .execute(
                "INSERT INTO attachments (
                    id, note_id, original_name, stored_name, stored_path,
                    mime_type, size, kind, created_at
                 )
                 VALUES (?1, ?2, 'photo.png', 'stored_photo.png', 'attachments/photo.png',
                    'image/png', 12, 'image', ?3)",
                params![attachment_id, note_id, now],
            )
            .expect("insert attachment");

        let attachment = get_attachment(&connection, &attachment_id).expect("read attachment");
        let attachment_paths =
            list_attachment_paths_for_note(&connection, &note_id).expect("list attachment paths");

        assert_eq!(attachment.note_id, note_id);
        assert_eq!(attachment.kind, "image");
        assert_eq!(attachment_paths, vec!["attachments/photo.png".to_string()]);

        connection
            .execute("DELETE FROM notes WHERE id = ?1", params![note_id])
            .expect("delete note");

        assert_eq!(count_rows(&connection, "attachments").unwrap(), 0);
    }

    #[test]
    fn sticky_window_records_track_posted_state_and_bounds() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        create_schema(&connection).expect("create schema");
        let folder_id = ensure_default_folder(&connection).expect("seed folder");
        let now = Utc::now().to_rfc3339();
        let note_id = Uuid::new_v4().to_string();

        connection
            .execute(
                "INSERT INTO notes (
                    id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
                 )
                 VALUES (?1, 'normal', '桌面便签', '<p>内容</p>', ?2, 0, 0, ?3, ?3, NULL)",
                params![note_id, folder_id, now],
            )
            .expect("insert note");
        connection
            .execute(
                "INSERT INTO sticky_windows (
                    note_id, is_posted, is_always_on_top, x, y, width, height, created_at, updated_at
                 )
                 VALUES (?1, 1, 1, 20.0, 30.0, 360.0, 420.0, ?2, ?2)",
                params![note_id, now],
            )
            .expect("insert sticky window");

        let sticky =
            get_sticky_window_by_note_id(&connection, &note_id).expect("read sticky window");

        assert!(sticky.is_posted);
        assert!(sticky.is_always_on_top);
        assert_eq!(sticky.x, 20.0);
        assert_eq!(sticky.width, 360.0);

        connection
            .execute(
                "UPDATE sticky_windows SET is_posted = 0, width = 480.0 WHERE note_id = ?1",
                params![note_id],
            )
            .expect("update sticky window");
        let updated_sticky =
            get_sticky_window_by_note_id(&connection, &note_id).expect("read updated sticky");

        assert!(!updated_sticky.is_posted);
        assert_eq!(updated_sticky.width, 480.0);
    }

    #[test]
    fn reminder_records_can_be_triggered_and_repeated() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        create_schema(&connection).expect("create schema");
        let folder_id = ensure_default_folder(&connection).expect("seed folder");
        let now = Utc::now();
        let note_id = Uuid::new_v4().to_string();
        let reminder_id = Uuid::new_v4().to_string();

        connection
            .execute(
                "INSERT INTO notes (
                    id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
                 )
                 VALUES (?1, 'todo', '提醒便签', '<p>内容</p>', ?2, 0, 0, ?3, ?3, NULL)",
                params![note_id, folder_id, now.to_rfc3339()],
            )
            .expect("insert note");
        connection
            .execute(
                "INSERT INTO reminders (
                    id, note_id, reminder_type, title, message, remind_at, repeat_rule, custom_interval_days,
                    is_enabled, last_triggered_at, created_at, updated_at
                 )
                 VALUES (?1, ?2, 'repeat', '每日提醒', '提醒内容', ?3, 'daily', 1, 1, NULL, ?4, ?4)",
                params![
                    reminder_id,
                    note_id,
                    (now - Duration::days(1)).to_rfc3339(),
                    now.to_rfc3339()
                ],
            )
            .expect("insert reminder");

        let reminder = get_reminder(&connection, &reminder_id).expect("read reminder");
        let next_time =
            next_repeat_time(
                &reminder.remind_at,
                &reminder.repeat_rule,
                reminder.custom_interval_days,
                now,
            )
            .expect("next repeat");

        assert_eq!(reminder.note_title, "提醒便签");
        assert!(DateTime::parse_from_rfc3339(&next_time).unwrap().with_timezone(&Utc) > now);
    }
}
