import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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

type RecycleItemRecord = {
  id: string;
  note_id: string;
  original_folder_id: string;
  deleted_at: string;
  title_snapshot: string;
};

type AttachmentRecord = {
  id: string;
  note_id: string;
  original_name: string;
  stored_name: string;
  stored_path: string;
  mime_type: string;
  size: number;
  kind: "image" | "file";
  created_at: string;
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

const editorExtensions = [
  StarterKit.configure({
    underline: false,
  }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  Image.configure({
    allowBase64: false,
    HTMLAttributes: {
      class: "note-image",
    },
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

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
  const [recycleItems, setRecycleItems] = useState<RecycleItemRecord[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [pendingImageAttachments, setPendingImageAttachments] = useState<AttachmentRecord[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isRecycleView, setIsRecycleView] = useState(false);

  const resolvedTheme = resolveTheme(themeMode);
  document.documentElement.dataset.theme = resolvedTheme;

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  useEffect(() => {
    void refreshStorage();
  }, [activeType, activeFolderId, isRecycleView, query]);

  useEffect(() => {
    if (!selectedNote) {
      setEditorState(null);
      setAttachments([]);
      setPendingImageAttachments([]);
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

  useEffect(() => {
    if (selectedNote && !isRecycleView) {
      void loadAttachments(selectedNote.id);
      return;
    }

    setAttachments([]);
    setPendingImageAttachments([]);
  }, [selectedNote?.id, isRecycleView]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsFileDragging(Boolean(editorState) && !isRecycleView);
          return;
        }

        if (event.payload.type === "leave") {
          setIsFileDragging(false);
          return;
        }

        if (event.payload.type === "drop") {
          setIsFileDragging(false);
          if (editorState && !isRecycleView) {
            void handleAttachFiles(event.payload.paths);
          }
        }
      })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }

        unlisten = cleanup;
      })
      .catch((error) => {
        setStorageError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [editorState?.id, isRecycleView]);

  async function refreshStorage(options: { keepSelection?: boolean } = {}) {
    try {
      setStorageError(null);
      const noteType = activeType === "all" ? undefined : toStorageNoteType(activeType);
      const folderId = activeFolderId === "all" ? undefined : activeFolderId;
      const titleQuery = query.trim() || undefined;
      const status = await invoke<StorageStatus>("initialize_storage");
      const [folderList, noteList, recycleList] = await Promise.all([
        invoke<FolderRecord[]>("list_folders"),
        invoke<NoteRecord[]>("list_notes", {
          request: {
            note_type: noteType,
            folder_id: folderId,
            title_query: titleQuery,
          },
        }),
        invoke<RecycleItemRecord[]>("list_recycle_items"),
      ]);

      setStorageStatus(status);
      setFolders(folderList);
      setNotes(noteList);
      setRecycleItems(recycleList);

      if (!options.keepSelection) {
        setSelectedNoteId((currentId) => {
          if (!isRecycleView && currentId && noteList.some((note) => note.id === currentId)) {
            return currentId;
          }

          return isRecycleView ? null : noteList[0]?.id ?? null;
        });
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadAttachments(noteId: string) {
    try {
      const attachmentList = await invoke<AttachmentRecord[]>("list_attachments", {
        request: { id: noteId },
      });
      setAttachments(attachmentList);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCreateNote() {
    if (isRecycleView) {
      setIsRecycleView(false);
    }

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
          content: defaultContentForType(noteType),
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

  async function handleDeleteNote() {
    if (!editorState) {
      return;
    }

    const confirmed = window.confirm(`确定要把“${editorState.title}”移入回收站吗？`);

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      await invoke<NoteRecord>("delete_note", {
        request: { id: editorState.id },
      });
      setSelectedNoteId(null);
      setAttachments([]);
      setPendingImageAttachments([]);
      await refreshStorage();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAttachFiles(paths: string[]) {
    if (!editorState || paths.length === 0) {
      return;
    }

    const uniquePaths = Array.from(new Set(paths));
    const createdAttachments: AttachmentRecord[] = [];
    const errors: string[] = [];

    setIsBusy(true);
    try {
      for (const sourcePath of uniquePaths) {
        try {
          const attachment = await invoke<AttachmentRecord>("create_attachment", {
            request: {
              note_id: editorState.id,
              source_path: sourcePath,
            },
          });
          createdAttachments.push(attachment);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }

      if (createdAttachments.length > 0) {
        await loadAttachments(editorState.id);
        setPendingImageAttachments(createdAttachments.filter((attachment) => attachment.kind === "image"));
        await refreshStorage({ keepSelection: true });
      }

      if (errors.length > 0) {
        setStorageError(errors.join("；"));
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpenAttachment(attachmentId: string) {
    try {
      await invoke("open_attachment", {
        request: { id: attachmentId },
      });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleRestoreNote(noteId: string) {
    setIsBusy(true);
    try {
      const restoredNote = await invoke<NoteRecord>("restore_note", {
        request: { id: noteId },
      });
      setIsRecycleView(false);
      setSelectedNoteId(restoredNote.id);
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePurgeNote(item: RecycleItemRecord) {
    const confirmed = window.confirm(`彻底删除“${item.title_snapshot}”？此操作不能恢复。`);

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      await invoke("purge_note", {
        request: { id: item.note_id },
      });
      await refreshStorage();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEmptyRecycleBin() {
    if (recycleItems.length === 0) {
      return;
    }

    const confirmed = window.confirm("确定清空回收站吗？所有回收站便签将被彻底删除，不能恢复。");

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      await invoke("empty_recycle_bin");
      await refreshStorage();
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
            onClick={() => {
              setIsRecycleView(false);
              setActiveFolderId("all");
            }}
            type="button"
          >
            全部便签
          </button>
          {folders.map((folder) => (
            <button
              className={activeFolderId === folder.id ? "folder-item active" : "folder-item"}
              key={folder.id}
              onClick={() => {
                setIsRecycleView(false);
                setActiveFolderId(folder.id);
              }}
              type="button"
            >
              {folder.name}
            </button>
          ))}
          <button
            className={isRecycleView ? "folder-item active" : "folder-item"}
            onClick={() => setIsRecycleView(true)}
            type="button"
          >
            回收站
          </button>
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
            <p className="eyebrow">Phase 5</p>
            <h2>{isRecycleView ? "回收站" : "便签工作台"}</h2>
          </div>
          {isRecycleView ? (
            <button className="danger-action" disabled={isBusy || recycleItems.length === 0} onClick={handleEmptyRecycleBin} type="button">
              清空回收站
            </button>
          ) : (
            <button className="primary-action" disabled={isBusy} onClick={handleCreateNote} type="button">
              {isBusy ? "处理中" : "新建便签"}
            </button>
          )}
        </header>

        {!isRecycleView ? <div className="toolbar" aria-label="工具栏">
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
        </div> : null}

        <section className="content-grid">
          <div className="notes-panel" aria-label="便签列表">
            <div className="panel-heading">
              <h3>{isRecycleView ? "已删除" : "列表"}</h3>
              <span>{isRecycleView ? recycleItems.length : notes.length} 条</span>
            </div>

            <div className="note-list">
              {isRecycleView ? (
                <RecycleList
                  isBusy={isBusy}
                  items={recycleItems}
                  onPurge={handlePurgeNote}
                  onRestore={handleRestoreNote}
                />
              ) : null}

              {!isRecycleView && notes.length === 0 ? (
                <div className="empty-state">
                  <strong>暂无便签</strong>
                  <span>点击“新建便签”会写入本地 SQLite 数据库。</span>
                </div>
              ) : null}

              {!isRecycleView ? notes.map((note) => (
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
                  <p>{plainTextFromContent(note.content) || "暂无内容"}</p>
                  <footer>
                    <span>{resolveFolderName(folders, note.folder_id)}</span>
                    <span>{formatDate(note.updated_at)}</span>
                  </footer>
                </button>
              )) : null}
            </div>
          </div>

          <aside className="inspector-panel" aria-label="便签编辑">
            <div className="panel-heading">
              <h3>{isRecycleView ? "回收站说明" : "编辑"}</h3>
              {!isRecycleView && editorState ? (
                <button className="ghost-action" disabled={isBusy} onClick={handleTogglePinned} type="button">
                  {editorState.is_pinned ? "取消置顶" : "置顶"}
                </button>
              ) : null}
            </div>

            {isRecycleView ? (
              <div className="empty-state">
                <strong>删除不会立即消失</strong>
                <span>便签先进入回收站，可恢复；彻底删除和清空回收站会再次确认。</span>
              </div>
            ) : editorState ? (
              <div className="editor-form">
                <div className="field-block">
                  <label htmlFor="note-title">标题</label>
                  <input
                    id="note-title"
                    onChange={(event) =>
                      setEditorState((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                    value={editorState.title}
                  />
                </div>

                <div className="editor-meta-grid">
                  <div className="field-block">
                    <label htmlFor="note-type">类型</label>
                    <select
                      id="note-type"
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
                  </div>

                  <div className="field-block">
                    <label htmlFor="note-folder">文件夹</label>
                    <select
                      id="note-folder"
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
                  </div>
                </div>

                <RichTextEditor
                  attachments={attachments}
                  disabled={isBusy}
                  isFileDragging={isFileDragging}
                  noteId={editorState.id}
                  onChange={(content) =>
                    setEditorState((current) =>
                      current ? { ...current, content } : current,
                    )
                  }
                  onOpenAttachment={handleOpenAttachment}
                  onPendingImagesConsumed={() => setPendingImageAttachments([])}
                  pendingImages={pendingImageAttachments}
                  value={editorState.content}
                />

                <div className="editor-actions">
                  <button className="primary-action full-width" disabled={isBusy} onClick={handleSaveNote} type="button">
                    保存
                  </button>
                  <button className="danger-action full-width" disabled={isBusy} onClick={handleDeleteNote} type="button">
                    移入回收站
                  </button>
                </div>
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
              <div>
                <span>附件</span>
                <strong>{attachments.length}</strong>
              </div>
              <div>
                <span>回收站</span>
                <strong>{recycleItems.length}</strong>
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

function RichTextEditor({
  attachments,
  disabled,
  isFileDragging,
  noteId,
  onChange,
  onOpenAttachment,
  onPendingImagesConsumed,
  pendingImages,
  value,
}: {
  attachments: AttachmentRecord[];
  disabled: boolean;
  isFileDragging: boolean;
  noteId: string;
  onChange: (content: string) => void;
  onOpenAttachment: (attachmentId: string) => void;
  onPendingImagesConsumed: () => void;
  pendingImages: AttachmentRecord[];
  value: string;
}) {
  const editor = useEditor(
    {
      extensions: editorExtensions,
      content: normalizeEditorContent(value),
      editable: !disabled,
      immediatelyRender: true,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    const normalizedContent = normalizeEditorContent(value);
    if (editor.getHTML() !== normalizedContent) {
      editor.commands.setContent(normalizedContent, { emitUpdate: false });
    }
  }, [editor, noteId, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || pendingImages.length === 0) {
      return;
    }

    for (const image of pendingImages) {
      editor
        .chain()
        .focus()
        .setImage({
          src: attachmentImageSrc(image),
          alt: image.original_name,
          title: image.original_name,
        })
        .run();
    }

    onChange(editor.getHTML());
    onPendingImagesConsumed();
  }, [editor, onChange, onPendingImagesConsumed, pendingImages]);

  return (
    <div className={isFileDragging ? "rich-editor drop-active" : "rich-editor"}>
      <RichTextToolbar editor={editor} disabled={disabled} />
      <div className="editor-surface">
        <EditorContent editor={editor} />
        {isFileDragging ? <div className="drop-overlay">释放以添加附件</div> : null}
      </div>
      <AttachmentPanel
        attachments={attachments}
        onOpenAttachment={onOpenAttachment}
      />
    </div>
  );
}

function RichTextToolbar({
  disabled,
  editor,
}: {
  disabled: boolean;
  editor: Editor | null;
}) {
  const canUseEditor = Boolean(editor) && !disabled;

  return (
    <div className="rich-toolbar" aria-label="富文本工具栏">
      <div className="tool-group">
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="标题" type="button">
          H2
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().setParagraph().run()} title="正文" type="button">
          ¶
        </button>
      </div>

      <div className="tool-group">
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleBold().run()} title="加粗" type="button">
          B
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleItalic().run()} title="斜体" type="button">
          I
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="下划线" type="button">
          U
        </button>
      </div>

      <div className="tool-group color-group">
        <button className="color-swatch blue" disabled={!canUseEditor} onClick={() => editor?.chain().focus().setColor("#2563eb").run()} title="蓝色文字" type="button" />
        <button className="color-swatch red" disabled={!canUseEditor} onClick={() => editor?.chain().focus().setColor("#dc2626").run()} title="红色文字" type="button" />
        <button className="color-swatch mark" disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleHighlight({ color: "#fef3c7" }).run()} title="高亮" type="button" />
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().unsetColor().unsetHighlight().run()} title="清除颜色" type="button">
          A
        </button>
      </div>

      <div className="tool-group">
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="无序列表" type="button">
          •
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="有序列表" type="button">
          1.
        </button>
      </div>

      <div className="tool-group table-tools">
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="插入表格" type="button">
          表
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().addRowAfter().run()} title="下方加行" type="button">
          +行
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().addColumnAfter().run()} title="右侧加列" type="button">
          +列
        </button>
        <button disabled={!canUseEditor} onClick={() => editor?.chain().focus().deleteTable().run()} title="删除表格" type="button">
          删表
        </button>
      </div>
    </div>
  );
}

function AttachmentPanel({
  attachments,
  onOpenAttachment,
}: {
  attachments: AttachmentRecord[];
  onOpenAttachment: (attachmentId: string) => void;
}) {
  const images = attachments.filter((attachment) => attachment.kind === "image");
  const files = attachments.filter((attachment) => attachment.kind !== "image");

  return (
    <section className="attachment-panel" aria-label="附件">
      <div className="attachment-heading">
        <h4>附件</h4>
        <span>{attachments.length}</span>
      </div>

      {attachments.length === 0 ? (
        <div className="attachment-empty">暂无附件</div>
      ) : null}

      {images.length > 0 ? (
        <div className="image-strip">
          {images.map((image) => (
            <button
              className="image-preview"
              key={image.id}
              onClick={() => onOpenAttachment(image.id)}
              title={image.original_name}
              type="button"
            >
              <img alt={image.original_name} src={attachmentImageSrc(image)} />
            </button>
          ))}
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="attachment-list">
          {files.map((file) => (
            <button
              className="attachment-card"
              key={file.id}
              onClick={() => onOpenAttachment(file.id)}
              type="button"
            >
              <span className="file-icon">□</span>
              <span>
                <strong>{file.original_name}</strong>
                <small>{formatFileSize(file.size)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RecycleList({
  isBusy,
  items,
  onPurge,
  onRestore,
}: {
  isBusy: boolean;
  items: RecycleItemRecord[];
  onPurge: (item: RecycleItemRecord) => void;
  onRestore: (noteId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <strong>回收站为空</strong>
        <span>移入回收站的便签会显示在这里。</span>
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <article className="note-card recycle-card" key={item.id}>
          <div className="note-card-header">
            <span className="type-pill">已删除</span>
            <span>{formatDate(item.deleted_at)}</span>
          </div>
          <h4>{item.title_snapshot}</h4>
          <p>原文件夹：{item.original_folder_id}</p>
          <footer>
            <button className="ghost-action" disabled={isBusy} onClick={() => onRestore(item.note_id)} type="button">
              恢复
            </button>
            <button className="danger-action" disabled={isBusy} onClick={() => onPurge(item)} type="button">
              彻底删除
            </button>
          </footer>
        </article>
      ))}
    </>
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

function defaultContentForType(noteType: StorageNoteType) {
  if (noteType === "todo") {
    return "<ul><li><p>新待办</p></li></ul>";
  }

  if (noteType === "timeline") {
    return "<p>记录今天的事情。</p>";
  }

  if (noteType === "rich_text") {
    return "<h2>新笔记</h2><p></p>";
  }

  return "<p>在右侧编辑内容，然后点击保存。</p>";
}

function resolveFolderName(folders: FolderRecord[], folderId: string) {
  return folders.find((folder) => folder.id === folderId)?.name ?? "未分类";
}

function normalizeEditorContent(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "<p></p>";
  }

  if (trimmed.startsWith("<") && trimmed.includes(">")) {
    return value;
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}

function plainTextFromContent(value: string) {
  return value
    .replace(/<style[^>]*>.*?<\/style>/gis, " ")
    .replace(/<script[^>]*>.*?<\/script>/gis, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attachmentImageSrc(attachment: AttachmentRecord) {
  try {
    return convertFileSrc(attachment.stored_path);
  } catch {
    return `file:///${attachment.stored_path.replace(/\\/g, "/")}`;
  }
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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
