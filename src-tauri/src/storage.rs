use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
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

#[derive(Debug, Deserialize)]
pub struct SetSettingRequest {
    pub key: String,
    pub value: String,
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

pub fn list_notes() -> Result<Vec<NoteRecord>, String> {
    let paths = ensure_app_paths()?;
    let connection = open_connection(&paths)?;
    let mut statement = connection
        .prepare(
            "SELECT id, type, title, content, folder_id, is_pinned, is_deleted,
                    created_at, updated_at, deleted_at
             FROM notes
             WHERE is_deleted = 0
             ORDER BY is_pinned DESC, updated_at DESC",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], map_note_row)
        .map_err(|error| error.to_string())?;

    collect_rows(rows)
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

    if !matches!(key, "theme_mode" | "startup_mode" | "backup_dir" | "recycle_bin_dir") {
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

fn ensure_app_paths() -> Result<AppPaths, String> {
    let documents_dir = dirs::document_dir().ok_or("无法定位当前用户的 Documents 目录")?;
    let root_dir = documents_dir.join(APP_DIR_NAME);
    let data_dir = root_dir.join("Data");
    let attachments_dir = root_dir.join("Attachments");
    let backup_dir = root_dir.join("Backup");
    let recycle_bin_dir = root_dir.join("Recycle Bin");
    let database_path = data_dir.join(DATABASE_FILE_NAME);

    for dir in [&root_dir, &data_dir, &attachments_dir, &backup_dir, &recycle_bin_dir] {
        fs::create_dir_all(dir).map_err(|error| {
            format!("无法创建目录 {}: {}", dir.display(), error)
        })?;
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

            CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
            CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
            CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
            CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(is_deleted);
            ",
        )
        .map_err(|error| error.to_string())
}

fn ensure_default_settings(connection: &Connection, paths: &AppPaths) -> Result<(), String> {
    set_default_setting(connection, "theme_mode", "system")?;
    set_default_setting(connection, "startup_mode", "edge_entry")?;
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

fn normalize_note_type(value: &str) -> Result<&'static str, String> {
    match value {
        "normal" => Ok("normal"),
        "todo" => Ok("todo"),
        "timeline" => Ok("timeline"),
        "rich" | "rich_text" => Ok("rich_text"),
        _ => Err("不支持的便签类型".to_string()),
    }
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

        assert_eq!(count_rows(&connection, "settings").unwrap(), 4);
        assert_eq!(count_rows(&connection, "folders").unwrap(), 1);
        assert!(!default_folder_id.is_empty());
    }
}
