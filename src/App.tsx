import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";

type NoteType = "all" | "normal" | "todo" | "timeline" | "rich";
type StorageNoteType = "normal" | "todo" | "timeline" | "rich_text";
type ThemeMode = "light" | "dark" | "system";

type AppPaths = {
  root_dir: string;
  data_dir: string;
  attachments_dir: string;
  backup_dir: string;
  recycle_bin_dir: string;
  database_path: string;
};

type StorageStatus = {
  paths: AppPaths;
  folder_count: number;
  note_count: number;
  settings_count: number;
};

type FolderRecord = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type NoteRecord = {
  id: string;
  note_type: StorageNoteType;
  title: string;
  content: string;
  folder_id: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type EditorState = {
  id: string;
  note_type: StorageNoteType;
  title: string;
  content: string;
  folder_id: string;
  is_pinned: boolean;
};

const noteTypes: Array<{ id: NoteType; label: string }> = [
  { id: "all", label: "全部" },
  { id: "normal", label: "普通便签" },
  { id: "todo", label: "待办" },
  { id: "timeline", label: "时间轴" },
  { id: "rich", label: "富文本笔记" },
];

const editableNoteTypes: Array<{ id: StorageNoteType; label: string }> = [
  { id: "normal", label: "普通便签" },
  { id: "todo", label: "待办" },
  { id: "timeline", label: "时间轴" },
  { id: "rich_text", label: "富文本笔记" },
];

const themeModes: Array<{ id: ThemeMode; label: string }> = [
  { id: "light", label: "日间" },
  { id: "dark", label: "黑夜" },
  { id: "system", label: "跟随系统" },
];

const typeLabels: Record<StorageNoteType, string> = {
  normal: "普通便签",
  todo: "待办",
  timeline: "时间轴",
  rich_text: "富文本",
};

function resolveTheme(theme: ThemeMode) {
  if (theme !== "system") {
    return theme;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export default function App() {
  const [activeType, setActiveType] = useState<NoteType>("all");
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [query, setQuery] = useState("");
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [folderName, setFolderName] = useState("");

  const resolvedTheme = resolveTheme(themeMode);
  document.documentElement.dataset.theme = resolvedTheme;

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  useEffect(() => {
    void refreshStorage();
  }, [activeType, activeFolderId, query]);

  useEffect(() => {
    if (!selectedNote) {
      setEditorState(null);
      return;
    }

    setEditorState({
      id: selectedNote.id,
      note_type: selectedNote.note_type,
      title: selectedNote.title,
      content: selectedNote.content,
      folder_id: selectedNote.folder_id,
      is_pinned: selectedNote.is_pinned,
    });
  }, [selectedNote]);

  async function refreshStorage(options: { keepSelection?: boolean } = {}) {
    try {
      setStorageError(null);
      const noteType = activeType === "all" ? undefined : toStorageNoteType(activeType);
      const folderId = activeFolderId === "all" ? undefined : activeFolderId;
      const titleQuery = query.trim() || undefined;
      const status = await invoke<StorageStatus>("initialize_storage");
      const [folderList, noteList] = await Promise.all([
        invoke<FolderRecord[]>("list_folders"),
        invoke<NoteRecord[]>("list_notes", {
          request: {
            note_type: noteType,
            folder_id: folderId,
            title_query: titleQuery,
          },
        }),
      ]);

      setStorageStatus(status);
      setFolders(folderList);
      setNotes(noteList);

      if (!options.keepSelection) {
        setSelectedNoteId((currentId) => {
          if (currentId && noteList.some((note) => note.id === currentId)) {
            return currentId;
          }

          return noteList[0]?.id ?? null;
        });
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCreateNote() {
    setIsBusy(true);
    try {
      const createdAt = new Date().toLocaleString("zh-CN", {
        hour12: false,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const noteType = activeType === "all" ? "normal" : toStorageNoteType(activeType);
      const createdNote = await invoke<NoteRecord>("create_note", {
        request: {
          note_type: noteType,
          title: `新便签 ${createdAt}`,
          content: "在右侧编辑内容，然后点击保存。",
          folder_id: activeFolderId === "all" ? folders[0]?.id : activeFolderId,
        },
      });

      setSelectedNoteId(createdNote.id);
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateFolder() {
    const name = folderName.trim();

    if (!name) {
      setStorageError("文件夹名称不能为空");
      return;
    }

    setIsBusy(true);
    try {
      const folder = await invoke<FolderRecord>("create_folder", {
        request: { name },
      });
      setFolderName("");
      setActiveFolderId(folder.id);
      await refreshStorage();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveNote() {
    if (!editorState) {
      return;
    }

    setIsBusy(true);
    try {
      const updatedNote = await invoke<NoteRecord>("update_note", {
        request: {
          id: editorState.id,
          note_type: editorState.note_type,
          title: editorState.title,
          content: editorState.content,
          folder_id: editorState.folder_id,
        },
      });

      setSelectedNoteId(updatedNote.id);
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTogglePinned() {
    if (!editorState) {
      return;
    }

    setIsBusy(true);
    try {
      const updatedNote = await invoke<NoteRecord>("set_note_pinned", {
        request: {
          id: editorState.id,
          is_pinned: !editorState.is_pinned,
        },
      });

      setSelectedNoteId(updatedNote.id);
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="导航">
        <div className="brand-block">
          <div className="app-mark">XB</div>
          <div>
            <h1>xBaoNotes</h1>
            <p>Windows 本地便签</p>
          </div>
        </div>

        <nav className="folder-list" aria-label="文件夹">
          <button
            className={activeFolderId === "all" ? "folder-item active" : "folder-item"}
            onClick={() => setActiveFolderId("all")}
            type="button"
          >
            全部便签
          </button>
          {folders.map((folder) => (
            <button
              className={activeFolderId === folder.id ? "folder-item active" : "folder-item"}
              key={folder.id}
              onClick={() => setActiveFolderId(folder.id)}
              type="button"
            >
              {folder.name}
            </button>
          ))}
          <button className="folder-item" disabled type="button">回收站</button>
        </nav>

        <div className="folder-create">
          <input
            aria-label="新建文件夹名称"
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="新建文件夹"
            value={folderName}
          />
          <button disabled={isBusy} onClick={handleCreateFolder} type="button">添加</button>
        </div>

        <section className="edge-entry-preview" aria-label="贴边入口预览">
          <span>贴边入口</span>
          <strong>默认启动</strong>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase 3</p>
            <h2>便签工作台</h2>
          </div>
          <button className="primary-action" disabled={isBusy} onClick={handleCreateNote} type="button">
            {isBusy ? "处理中" : "新建便签"}
          </button>
        </header>

        <div className="toolbar" aria-label="工具栏">
          <div className="segmented-control" role="radiogroup" aria-label="便签类型">
            {noteTypes.map((item) => (
              <button
                className={item.id === activeType ? "selected" : ""}
                key={item.id}
                onClick={() => setActiveType(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            aria-label="搜索标题"
            className="search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题"
            type="search"
            value={query}
          />
        </div>

        <section className="content-grid">
          <div className="notes-panel" aria-label="便签列表">
            <div className="panel-heading">
              <h3>列表</h3>
              <span>{notes.length} 条</span>
            </div>

            <div className="note-list">
              {notes.length === 0 ? (
                <div className="empty-state">
                  <strong>暂无便签</strong>
                  <span>点击“新建便签”会写入本地 SQLite 数据库。</span>
                </div>
              ) : null}

              {notes.map((note) => (
                <button
                  className={note.id === selectedNoteId ? "note-card selected" : "note-card"}
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  type="button"
                >
                  <div className="note-card-header">
                    <span className="type-pill">{typeLabels[note.note_type]}</span>
                    {note.is_pinned ? <span className="pin-label">置顶</span> : null}
                  </div>
                  <h4>{note.title}</h4>
                  <p>{note.content || "暂无内容"}</p>
                  <footer>
                    <span>{resolveFolderName(folders, note.folder_id)}</span>
                    <span>{formatDate(note.updated_at)}</span>
                  </footer>
                </button>
              ))}
            </div>
          </div>

          <aside className="inspector-panel" aria-label="便签编辑">
            <div className="panel-heading">
              <h3>编辑</h3>
              {editorState ? (
                <button className="ghost-action" disabled={isBusy} onClick={handleTogglePinned} type="button">
                  {editorState.is_pinned ? "取消置顶" : "置顶"}
                </button>
              ) : null}
            </div>

            {editorState ? (
              <div className="editor-form">
                <label>
                  标题
                  <input
                    onChange={(event) =>
                      setEditorState((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                    value={editorState.title}
                  />
                </label>

                <label>
                  类型
                  <select
                    onChange={(event) =>
                      setEditorState((current) =>
                        current ? { ...current, note_type: event.target.value as StorageNoteType } : current,
                      )
                    }
                    value={editorState.note_type}
                  >
                    {editableNoteTypes.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  文件夹
                  <select
                    onChange={(event) =>
                      setEditorState((current) =>
                        current ? { ...current, folder_id: event.target.value } : current,
                      )
                    }
                    value={editorState.folder_id}
                  >
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  内容
                  <textarea
                    onChange={(event) =>
                      setEditorState((current) =>
                        current ? { ...current, content: event.target.value } : current,
                      )
                    }
                    value={editorState.content}
                  />
                </label>

                <button className="primary-action full-width" disabled={isBusy} onClick={handleSaveNote} type="button">
                  保存
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <strong>请选择便签</strong>
                <span>左侧选择一条便签后，可以编辑标题、类型、文件夹和内容。</span>
              </div>
            )}

            <div className="theme-block">
              <div className="panel-heading compact-heading">
                <h3>外观</h3>
              </div>
              <div className="theme-options" role="radiogroup" aria-label="主题模式">
                {themeModes.map((item) => (
                  <button
                    className={item.id === themeMode ? "selected" : ""}
                    key={item.id}
                    onClick={() => setThemeMode(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="status-list">
              <div>
                <span>数据模式</span>
                <strong>{storageStatus ? "SQLite 已初始化" : "初始化中"}</strong>
              </div>
              <div>
                <span>文件夹</span>
                <strong>{storageStatus?.folder_count ?? 0}</strong>
              </div>
              <div>
                <span>便签</span>
                <strong>{storageStatus?.note_count ?? 0}</strong>
              </div>
            </div>

            <div className="storage-panel">
              <h4>本地数据目录</h4>
              <code>{storageStatus?.paths.root_dir ?? "正在创建..."}</code>
              {storageError ? <p className="error-text">{storageError}</p> : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function toStorageNoteType(noteType: NoteType): StorageNoteType {
  if (noteType === "rich") {
    return "rich_text";
  }

  if (noteType === "all") {
    return "normal";
  }

  return noteType;
}

function resolveFolderName(folders: FolderRecord[], folderId: string) {
  return folders.find((folder) => folder.id === folderId)?.name ?? "未分类";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
