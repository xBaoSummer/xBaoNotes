import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";

type NoteType = "all" | "normal" | "todo" | "timeline" | "rich";
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
  note_type: "normal" | "todo" | "timeline" | "rich_text";
  title: string;
  content: string;
  folder_id: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const noteTypes: Array<{ id: NoteType; label: string }> = [
  { id: "all", label: "全部" },
  { id: "normal", label: "普通便签" },
  { id: "todo", label: "待办" },
  { id: "timeline", label: "时间轴" },
  { id: "rich", label: "富文本笔记" },
];

const themeModes: Array<{ id: ThemeMode; label: string }> = [
  { id: "light", label: "日间" },
  { id: "dark", label: "黑夜" },
  { id: "system", label: "跟随系统" },
];

const typeLabels: Record<NoteRecord["note_type"], string> = {
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
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [query, setQuery] = useState("");
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const resolvedTheme = resolveTheme(themeMode);
  document.documentElement.dataset.theme = resolvedTheme;

  useEffect(() => {
    void refreshStorage();
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesType = activeType === "all" || toUiNoteType(note.note_type) === activeType;
      const matchesQuery = note.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [activeType, notes, query]);

  async function refreshStorage() {
    try {
      setStorageError(null);
      const [status, folderList, noteList] = await Promise.all([
        invoke<StorageStatus>("initialize_storage"),
        invoke<FolderRecord[]>("list_folders"),
        invoke<NoteRecord[]>("list_notes"),
      ]);

      setStorageStatus(status);
      setFolders(folderList);
      setNotes(noteList);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCreateNote() {
    setIsCreating(true);
    try {
      const createdAt = new Date().toLocaleString("zh-CN", {
        hour12: false,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      await invoke<NoteRecord>("create_note", {
        request: {
          note_type: activeType === "all" ? "normal" : toStorageNoteType(activeType),
          title: `新便签 ${createdAt}`,
          content: "这条便签已保存到本地 SQLite 数据库。",
          folder_id: folders[0]?.id,
        },
      });

      await refreshStorage();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCreating(false);
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
          <button className="folder-item active" type="button">全部便签</button>
          <button className="folder-item" type="button">默认文件夹</button>
          <button className="folder-item" type="button">工作</button>
          <button className="folder-item" type="button">项目日志</button>
          <button className="folder-item" type="button">回收站</button>
        </nav>

        <section className="edge-entry-preview" aria-label="贴边入口预览">
          <span>贴边入口</span>
          <strong>默认启动</strong>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase 1</p>
            <h2>便签工作台</h2>
          </div>
          <button className="primary-action" disabled={isCreating} onClick={handleCreateNote} type="button">
            {isCreating ? "保存中" : "新建便签"}
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
              <span>{filteredNotes.length} 条</span>
            </div>

            <div className="note-list">
              {filteredNotes.length === 0 ? (
                <div className="empty-state">
                  <strong>暂无便签</strong>
                  <span>点击“新建便签”会写入本地 SQLite 数据库。</span>
                </div>
              ) : null}

              {filteredNotes.map((note) => (
                <article className="note-card" key={note.id}>
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
                </article>
              ))}
            </div>
          </div>

          <aside className="inspector-panel" aria-label="设置预览">
            <div className="panel-heading">
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

            <div className="status-list">
              <div>
                <span>默认入口</span>
                <strong>贴边隐藏</strong>
              </div>
              <div>
                <span>数据模式</span>
                <strong>{storageStatus ? "SQLite 已初始化" : "初始化中"}</strong>
              </div>
              <div>
                <span>技术底座</span>
                <strong>Tauri 2</strong>
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
              <h4>数据库</h4>
              <code>{storageStatus?.paths.database_path ?? "正在初始化..."}</code>
              {storageError ? <p className="error-text">{storageError}</p> : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function toUiNoteType(noteType: NoteRecord["note_type"]): NoteType {
  return noteType === "rich_text" ? "rich" : noteType;
}

function toStorageNoteType(noteType: NoteType) {
  return noteType === "rich" ? "rich_text" : noteType;
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
