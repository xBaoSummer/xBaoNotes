import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
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
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

type NoteType = "all" | "normal" | "todo" | "timeline" | "rich";
type StorageNoteType = "normal" | "todo" | "timeline" | "rich_text";
type ThemeMode = "light" | "dark" | "system";
type StartupMode = "edge_entry" | "main_window" | "tray_only";
type EdgePosition = "left" | "right" | "top" | "bottom";
type ReminderType = "once" | "due" | "repeat" | "anniversary" | "review";
type RepeatRule = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

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

type StickyWindowRecord = {
  note_id: string;
  is_posted: boolean;
  is_always_on_top: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
};

type ReminderRecord = {
  id: string;
  note_id: string;
  note_title: string;
  note_type: StorageNoteType;
  reminder_type: ReminderType;
  title: string;
  message: string;
  remind_at: string;
  repeat_rule: RepeatRule;
  custom_interval_days: number;
  is_enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

type SettingRecord = {
  key: string;
  value: string;
  updated_at: string;
};

type EditorState = {
  id: string;
  note_type: StorageNoteType;
  title: string;
  content: string;
  folder_id: string;
  is_pinned: boolean;
};

type ReminderDraft = {
  reminder_type: ReminderType;
  title: string;
  message: string;
  remind_at: string;
  repeat_rule: RepeatRule;
  custom_interval_days: number;
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

const startupModes: Array<{ id: StartupMode; label: string }> = [
  { id: "edge_entry", label: "贴边入口" },
  { id: "main_window", label: "主页面" },
  { id: "tray_only", label: "托盘" },
];

const edgePositions: Array<{ id: EdgePosition; label: string }> = [
  { id: "left", label: "左" },
  { id: "right", label: "右" },
  { id: "top", label: "上" },
  { id: "bottom", label: "下" },
];

const reminderTypes: Array<{ id: ReminderType; label: string }> = [
  { id: "once", label: "指定时间" },
  { id: "due", label: "截止提醒" },
  { id: "repeat", label: "重复提醒" },
  { id: "anniversary", label: "纪念日" },
  { id: "review", label: "复习提醒" },
];

const repeatRules: Array<{ id: RepeatRule; label: string }> = [
  { id: "none", label: "不重复" },
  { id: "daily", label: "每天" },
  { id: "weekly", label: "每周" },
  { id: "monthly", label: "每月" },
  { id: "yearly", label: "每年" },
  { id: "custom", label: "自定义天数" },
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
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "sticky") {
    return <StickyNoteWindow noteId={params.get("noteId") ?? ""} />;
  }

  if (view === "edge") {
    return <EdgeEntryWindow position={(params.get("position") ?? "right") as EdgePosition} />;
  }

  return <MainApp />;
}

function MainApp() {
  const [activeType, setActiveType] = useState<NoteType>("all");
  const [activeFolderId, setActiveFolderId] = useState<string>("all");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [query, setQuery] = useState("");
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [recycleItems, setRecycleItems] = useState<RecycleItemRecord[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [stickyWindows, setStickyWindows] = useState<StickyWindowRecord[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft | null>(null);
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [pendingImageAttachments, setPendingImageAttachments] = useState<AttachmentRecord[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isRecycleView, setIsRecycleView] = useState(false);
  const isProcessingReminders = useRef(false);

  const resolvedTheme = resolveTheme(themeMode);
  document.documentElement.dataset.theme = resolvedTheme;

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );
  const postedStickyIds = useMemo(
    () => new Set(stickyWindows.map((stickyWindow) => stickyWindow.note_id)),
    [stickyWindows],
  );
  const settingMap = useMemo(
    () => new Map(settings.map((setting) => [setting.key, setting.value])),
    [settings],
  );
  const startupMode = normalizeStartupMode(settingMap.get("startup_mode"));
  const edgePosition = normalizeEdgePosition(settingMap.get("edge_position"));
  const isSelectedNotePosted = editorState ? postedStickyIds.has(editorState.id) : false;

  useEffect(() => {
    void refreshStorage();
  }, [activeType, activeFolderId, isRecycleView, query]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    listen<string>("select_note_type", (event) => {
      const nextType = normalizeNoteTypeForMain(event.payload);
      setIsRecycleView(false);
      setActiveType(nextType);
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
  }, []);

  useEffect(() => {
    if (!selectedNote) {
      setEditorState(null);
      setAttachments([]);
      setPendingImageAttachments([]);
      setReminders([]);
      setReminderDraft(null);
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
    setReminderDraft(defaultReminderDraft(selectedNote));
  }, [selectedNote]);

  useEffect(() => {
    if (selectedNote && !isRecycleView) {
      void loadAttachments(selectedNote.id);
      void loadReminders(selectedNote.id);
      return;
    }

    setAttachments([]);
    setPendingImageAttachments([]);
    setReminders([]);
  }, [selectedNote?.id, isRecycleView]);

  useEffect(() => {
    void processDueReminders();
    const timer = window.setInterval(() => {
      void processDueReminders();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [selectedNoteId]);

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
      const [folderList, noteList, recycleList, stickyList, settingList, autoStartState] = await Promise.all([
        invoke<FolderRecord[]>("list_folders"),
        invoke<NoteRecord[]>("list_notes", {
          request: {
            note_type: noteType,
            folder_id: folderId,
            title_query: titleQuery,
          },
        }),
        invoke<RecycleItemRecord[]>("list_recycle_items"),
        invoke<StickyWindowRecord[]>("list_sticky_windows"),
        invoke<SettingRecord[]>("list_settings"),
        invoke<boolean>("get_auto_start_enabled"),
      ]);

      setStorageStatus(status);
      setFolders(folderList);
      setNotes(noteList);
      setRecycleItems(recycleList);
      setStickyWindows(stickyList);
      setSettings(settingList);
      setAutoStartEnabled(autoStartState);

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

  async function loadReminders(noteId: string) {
    try {
      const reminderList = await invoke<ReminderRecord[]>("list_reminders", {
        request: {
          note_id: noteId,
          include_disabled: true,
        },
      });
      setReminders(reminderList);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function processDueReminders() {
    if (isProcessingReminders.current) {
      return;
    }

    isProcessingReminders.current = true;

    try {
      const dueReminders = await invoke<ReminderRecord[]>("list_due_reminders");

      if (dueReminders.length === 0) {
        return;
      }

      const canNotify = await ensureNotificationPermission();

      if (!canNotify) {
        setStorageError("Windows 通知权限未开启，暂时无法弹出提醒。");
        return;
      }

      for (const reminder of dueReminders) {
        sendNotification({
          title: reminder.title || "xBaoNotes 提醒",
          body: reminderNotificationBody(reminder),
          group: "xbao-notes-reminders",
          autoCancel: true,
          extra: {
            reminderId: reminder.id,
            noteId: reminder.note_id,
          },
        });
        await invoke<ReminderRecord>("complete_reminder", {
          request: { id: reminder.id },
        });
      }

      if (selectedNoteId) {
        await loadReminders(selectedNoteId);
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      isProcessingReminders.current = false;
    }
  }

  async function handleCreateReminder() {
    if (!editorState || !reminderDraft) {
      return;
    }

    const title = reminderDraft.title.trim() || editorState.title.trim() || "xBaoNotes 提醒";
    const message = reminderDraft.message.trim() || typeDefaultReminderMessage(editorState.note_type);
    const remindAt = reminderInputToRfc3339(reminderDraft.remind_at);

    if (!remindAt) {
      setStorageError("请选择有效的提醒时间");
      return;
    }

    setIsBusy(true);
    try {
      await invoke<ReminderRecord>("create_reminder", {
        request: {
          note_id: editorState.id,
          reminder_type: reminderDraft.reminder_type,
          title,
          message,
          remind_at: remindAt,
          repeat_rule: reminderDraft.repeat_rule,
          custom_interval_days: reminderDraft.custom_interval_days,
        },
      });
      setReminderDraft(defaultReminderDraft({
        note_type: editorState.note_type,
        title: editorState.title,
      }));
      await loadReminders(editorState.id);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleReminder(reminder: ReminderRecord) {
    setIsBusy(true);
    try {
      await invoke<ReminderRecord>("update_reminder", {
        request: {
          id: reminder.id,
          reminder_type: reminder.reminder_type,
          title: reminder.title,
          message: reminder.message,
          remind_at: reminder.remind_at,
          repeat_rule: reminder.repeat_rule,
          custom_interval_days: reminder.custom_interval_days,
          is_enabled: !reminder.is_enabled,
        },
      });
      await loadReminders(reminder.note_id);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteReminder(reminder: ReminderRecord) {
    const confirmed = window.confirm(`删除提醒“${reminder.title}”？`);

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    try {
      await invoke("delete_reminder", {
        request: { id: reminder.id },
      });
      await loadReminders(reminder.note_id);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
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

  async function handleToggleStickyWindow() {
    if (!editorState) {
      return;
    }

    setIsBusy(true);
    try {
      await invoke<StickyWindowRecord>(
        isSelectedNotePosted ? "unpost_sticky_note" : "post_sticky_note",
        {
          request: { id: editorState.id },
        },
      );
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSetThemeMode(nextThemeMode: ThemeMode) {
    setThemeMode(nextThemeMode);
    try {
      await invoke<SettingRecord>("set_setting", {
        request: {
          key: "theme_mode",
          value: nextThemeMode,
        },
      });
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSetStartupMode(nextStartupMode: StartupMode) {
    try {
      await invoke<SettingRecord>("set_setting", {
        request: {
          key: "startup_mode",
          value: nextStartupMode,
        },
      });
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSetEdgePosition(nextEdgePosition: EdgePosition) {
    try {
      await invoke<SettingRecord>("set_edge_position", {
        request: {
          position: nextEdgePosition,
        },
      });
      await refreshStorage({ keepSelection: true });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSetAutoStartEnabled(enabled: boolean) {
    try {
      const setting = await invoke<SettingRecord>("set_auto_start_enabled", {
        request: { enabled },
      });
      setAutoStartEnabled(enabled);
      setSettings((currentSettings) => upsertSetting(currentSettings, setting));
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
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
      if (postedStickyIds.has(editorState.id)) {
        await invoke("unpost_sticky_note", {
          request: { id: editorState.id },
        });
      }

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
            <p className="eyebrow">Phase 8</p>
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
                    <span className="note-card-badges">
                      {postedStickyIds.has(note.id) ? <span className="sticky-label">已贴出</span> : null}
                      {note.is_pinned ? <span className="pin-label">置顶</span> : null}
                    </span>
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
                <div className="editor-heading-actions">
                  <button className="ghost-action" disabled={isBusy} onClick={handleTogglePinned} type="button">
                    {editorState.is_pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button className="ghost-action" disabled={isBusy} onClick={handleToggleStickyWindow} type="button">
                    {isSelectedNotePosted ? "取消贴出" : "贴出"}
                  </button>
                </div>
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

                <ReminderPanel
                  draft={reminderDraft}
                  isBusy={isBusy}
                  noteType={editorState.note_type}
                  onCreate={handleCreateReminder}
                  onDelete={handleDeleteReminder}
                  onDraftChange={setReminderDraft}
                  onToggle={handleToggleReminder}
                  reminders={reminders}
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
                    onClick={() => void handleSetThemeMode(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-block">
              <div className="panel-heading compact-heading">
                <h3>启动与入口</h3>
              </div>

              <div className="setting-row">
                <span>启动方式</span>
                <div className="theme-options setting-options" role="radiogroup" aria-label="启动方式">
                  {startupModes.map((item) => (
                    <button
                      className={item.id === startupMode ? "selected" : ""}
                      key={item.id}
                      onClick={() => void handleSetStartupMode(item.id)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <span>贴边位置</span>
                <div className="theme-options setting-options compact-options" role="radiogroup" aria-label="贴边位置">
                  {edgePositions.map((item) => (
                    <button
                      className={item.id === edgePosition ? "selected" : ""}
                      key={item.id}
                      onClick={() => void handleSetEdgePosition(item.id)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="toggle-row">
                <span>开机自启动</span>
                <input
                  checked={autoStartEnabled}
                  onChange={(event) => void handleSetAutoStartEnabled(event.target.checked)}
                  type="checkbox"
                />
              </label>
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
                <span>已贴出</span>
                <strong>{stickyWindows.length}</strong>
              </div>
              <div>
                <span>提醒</span>
                <strong>{reminders.filter((reminder) => reminder.is_enabled).length}</strong>
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

function EdgeEntryWindow({ position }: { position: EdgePosition }) {
  const edgePosition = normalizeEdgePosition(position);
  const [expanded, setExpanded] = useState(false);
  document.documentElement.dataset.theme = resolveTheme("system");

  async function setExpandedState(nextExpanded: boolean) {
    setExpanded(nextExpanded);
    try {
      await invoke("set_edge_entry_expanded", {
        request: { expanded: nextExpanded },
      });
    } catch {
      setExpanded(false);
    }
  }

  async function openMain(noteType: NoteType = "all") {
    try {
      await invoke("open_main_window", {
        request: { note_type: noteType },
      });
      await setExpandedState(false);
    } catch {
      await setExpandedState(false);
    }
  }

  return (
    <main
      className={expanded ? `edge-shell ${edgePosition} expanded` : `edge-shell ${edgePosition}`}
      onMouseEnter={() => void setExpandedState(true)}
      onMouseLeave={() => void setExpandedState(false)}
    >
      <button className="edge-tab" onClick={() => void openMain("all")} title="xBaoNotes" type="button">
        XB
      </button>

      <div className="edge-actions" aria-label="便签快速入口">
        <button onClick={() => void openMain("normal")} type="button">普通</button>
        <button onClick={() => void openMain("todo")} type="button">待办</button>
        <button onClick={() => void openMain("timeline")} type="button">时间轴</button>
        <button onClick={() => void openMain("rich")} type="button">富文本</button>
        <button className="edge-main-action" onClick={() => void openMain("all")} type="button">主页面</button>
      </div>
    </main>
  );
}

function StickyNoteWindow({ noteId }: { noteId: string }) {
  const [note, setNote] = useState<NoteRecord | null>(null);
  const [stickyWindow, setStickyWindow] = useState<StickyWindowRecord | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    void loadStickyNote();
  }, [noteId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isDirty && !isBusy) {
        void loadStickyNote({ preserveEditor: false });
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [isDirty, isBusy, noteId]);

  async function loadStickyNote(options: { preserveEditor?: boolean } = {}) {
    if (!noteId) {
      setStorageError("缺少便签 ID，无法打开贴出窗口");
      return;
    }

    try {
      setStorageError(null);
      await invoke<StorageStatus>("initialize_storage");
      const [nextNote, nextStickyWindow, nextAttachments] = await Promise.all([
        invoke<NoteRecord>("get_note", {
          request: { id: noteId },
        }),
        invoke<StickyWindowRecord>("get_sticky_window", {
          request: { id: noteId },
        }),
        invoke<AttachmentRecord[]>("list_attachments", {
          request: { id: noteId },
        }),
      ]);

      setNote(nextNote);
      setStickyWindow(nextStickyWindow);
      setAttachments(nextAttachments);

      if (!options.preserveEditor) {
        setEditorState({
          id: nextNote.id,
          note_type: nextNote.note_type,
          title: nextNote.title,
          content: nextNote.content,
          folder_id: nextNote.folder_id,
          is_pinned: nextNote.is_pinned,
        });
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveStickyNote() {
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

      setNote(updatedNote);
      setIsDirty(false);
      await loadStickyNote({ preserveEditor: false });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleStickyTop() {
    if (!stickyWindow) {
      return;
    }

    setIsBusy(true);
    try {
      const updatedSticky = await invoke<StickyWindowRecord>("set_sticky_always_on_top", {
        request: {
          note_id: stickyWindow.note_id,
          is_always_on_top: !stickyWindow.is_always_on_top,
        },
      });
      setStickyWindow(updatedSticky);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUnpostStickyNote() {
    if (!noteId) {
      return;
    }

    setIsBusy(true);
    try {
      await invoke("unpost_sticky_note", {
        request: { id: noteId },
      });
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : String(error));
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

  document.documentElement.dataset.theme = resolveTheme("system");

  if (!editorState) {
    return (
      <main className="sticky-shell">
        <div className="empty-state">
          <strong>正在打开贴出便签</strong>
          <span>{storageError ?? "读取本地数据中..."}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="sticky-shell">
      <header className="sticky-window-bar">
        <div className="sticky-title-block">
          <span className="type-pill">{typeLabels[editorState.note_type]}</span>
          <input
            aria-label="贴出便签标题"
            className="sticky-title-input"
            onChange={(event) => {
              setIsDirty(true);
              setEditorState((current) =>
                current ? { ...current, title: event.target.value } : current,
              );
            }}
            value={editorState.title}
          />
        </div>

        <div className="sticky-window-actions">
          <button className="ghost-action" disabled={isBusy} onClick={handleToggleStickyTop} type="button">
            {stickyWindow?.is_always_on_top ? "取消置顶" : "置顶"}
          </button>
          <button className="danger-action" disabled={isBusy} onClick={handleUnpostStickyNote} type="button">
            取消贴出
          </button>
        </div>
      </header>

      <RichTextEditor
        attachments={attachments}
        disabled={isBusy}
        isFileDragging={false}
        noteId={editorState.id}
        onChange={(content) => {
          setIsDirty(true);
          setEditorState((current) =>
            current ? { ...current, content } : current,
          );
        }}
        onOpenAttachment={handleOpenAttachment}
        onPendingImagesConsumed={() => undefined}
        pendingImages={[]}
        value={editorState.content}
      />

      <footer className="sticky-footer">
        <span>{note ? `更新：${formatDate(note.updated_at)}` : "本地便签"}</span>
        <button className="primary-action" disabled={isBusy || !isDirty} onClick={handleSaveStickyNote} type="button">
          {isBusy ? "保存中" : "保存"}
        </button>
      </footer>

      {storageError ? <p className="error-text sticky-error">{storageError}</p> : null}
    </main>
  );
}

function ReminderPanel({
  draft,
  isBusy,
  noteType,
  onCreate,
  onDelete,
  onDraftChange,
  onToggle,
  reminders,
}: {
  draft: ReminderDraft | null;
  isBusy: boolean;
  noteType: StorageNoteType;
  onCreate: () => void;
  onDelete: (reminder: ReminderRecord) => void;
  onDraftChange: Dispatch<SetStateAction<ReminderDraft | null>>;
  onToggle: (reminder: ReminderRecord) => void;
  reminders: ReminderRecord[];
}) {
  if (!draft) {
    return null;
  }

  return (
    <section className="reminder-panel" aria-label="提醒">
      <div className="panel-heading compact-heading">
        <h3>提醒</h3>
        <span>{reminderHintForNoteType(noteType)}</span>
      </div>

      <div className="reminder-form">
        <div className="editor-meta-grid">
          <div className="field-block">
            <label htmlFor="reminder-type">提醒类型</label>
            <select
              id="reminder-type"
              onChange={(event) =>
                onDraftChange((current) =>
                  current ? { ...current, reminder_type: event.target.value as ReminderType } : current,
                )
              }
              value={draft.reminder_type}
            >
              {reminderTypes.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="field-block">
            <label htmlFor="reminder-time">提醒时间</label>
            <input
              id="reminder-time"
              onChange={(event) =>
                onDraftChange((current) =>
                  current ? { ...current, remind_at: event.target.value } : current,
                )
              }
              type="datetime-local"
              value={draft.remind_at}
            />
          </div>
        </div>

        <div className="editor-meta-grid">
          <div className="field-block">
            <label htmlFor="repeat-rule">重复规则</label>
            <select
              id="repeat-rule"
              onChange={(event) =>
                onDraftChange((current) =>
                  current ? { ...current, repeat_rule: event.target.value as RepeatRule } : current,
                )
              }
              value={draft.repeat_rule}
            >
              {repeatRules.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="field-block">
            <label htmlFor="custom-interval">自定义间隔</label>
            <input
              disabled={draft.repeat_rule !== "custom"}
              id="custom-interval"
              min={1}
              onChange={(event) =>
                onDraftChange((current) =>
                  current
                    ? { ...current, custom_interval_days: Math.max(1, Number(event.target.value) || 1) }
                    : current,
                )
              }
              type="number"
              value={draft.custom_interval_days}
            />
          </div>
        </div>

        <div className="field-block">
          <label htmlFor="reminder-title">提醒标题</label>
          <input
            id="reminder-title"
            onChange={(event) =>
              onDraftChange((current) =>
                current ? { ...current, title: event.target.value } : current,
              )
            }
            value={draft.title}
          />
        </div>

        <div className="field-block">
          <label htmlFor="reminder-message">提醒内容</label>
          <textarea
            className="reminder-message"
            id="reminder-message"
            onChange={(event) =>
              onDraftChange((current) =>
                current ? { ...current, message: event.target.value } : current,
              )
            }
            value={draft.message}
          />
        </div>

        <button className="primary-action full-width" disabled={isBusy} onClick={onCreate} type="button">
          新建提醒
        </button>
      </div>

      <div className="reminder-list">
        {reminders.length === 0 ? (
          <div className="attachment-empty">暂无提醒</div>
        ) : null}

        {reminders.map((reminder) => (
          <article className={reminder.is_enabled ? "reminder-card" : "reminder-card disabled"} key={reminder.id}>
            <div>
              <span className="type-pill">{reminderTypeLabel(reminder.reminder_type)}</span>
              <span className={reminder.is_enabled ? "reminder-state active" : "reminder-state"}>
                {reminder.is_enabled ? "生效中" : "已暂停"}
              </span>
            </div>
            <h4>{reminder.title}</h4>
            <p>{reminder.message || reminder.note_title}</p>
            <footer>
              <span>{formatDate(reminder.remind_at)} · {repeatRuleLabel(reminder)}</span>
              <div>
                <button className="ghost-action" disabled={isBusy} onClick={() => onToggle(reminder)} type="button">
                  {reminder.is_enabled ? "暂停" : "启用"}
                </button>
                <button className="danger-action" disabled={isBusy} onClick={() => onDelete(reminder)} type="button">
                  删除
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
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

function normalizeNoteTypeForMain(value: string): NoteType {
  if (value === "normal" || value === "todo" || value === "timeline" || value === "rich") {
    return value;
  }

  return "all";
}

function normalizeStartupMode(value: string | undefined): StartupMode {
  if (value === "main_window" || value === "tray_only") {
    return value;
  }

  return "edge_entry";
}

function normalizeEdgePosition(value: string | undefined): EdgePosition {
  if (value === "left" || value === "top" || value === "bottom") {
    return value;
  }

  return "right";
}

function upsertSetting(settings: SettingRecord[], nextSetting: SettingRecord) {
  const exists = settings.some((setting) => setting.key === nextSetting.key);

  if (!exists) {
    return [...settings, nextSetting];
  }

  return settings.map((setting) => (setting.key === nextSetting.key ? nextSetting : setting));
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

function defaultReminderDraft(note: Pick<NoteRecord, "note_type" | "title">): ReminderDraft {
  const reminderType = defaultReminderTypeForNote(note.note_type);

  return {
    reminder_type: reminderType,
    title: defaultReminderTitle(note.title, reminderType),
    message: typeDefaultReminderMessage(note.note_type),
    remind_at: toDatetimeLocalValue(new Date(Date.now() + 30 * 60 * 1000)),
    repeat_rule: reminderType === "anniversary" ? "yearly" : "none",
    custom_interval_days: 3,
  };
}

function defaultReminderTypeForNote(noteType: StorageNoteType): ReminderType {
  if (noteType === "todo") {
    return "due";
  }

  if (noteType === "timeline") {
    return "anniversary";
  }

  if (noteType === "rich_text") {
    return "review";
  }

  return "once";
}

function defaultReminderTitle(title: string, reminderType: ReminderType) {
  const fallback = title.trim() || "未命名便签";

  if (reminderType === "due") {
    return `${fallback} 截止提醒`;
  }

  if (reminderType === "anniversary") {
    return `${fallback} 纪念日`;
  }

  if (reminderType === "review") {
    return `${fallback} 复习提醒`;
  }

  if (reminderType === "repeat") {
    return `${fallback} 重复提醒`;
  }

  return `${fallback} 提醒`;
}

function typeDefaultReminderMessage(noteType: StorageNoteType) {
  if (noteType === "todo") {
    return "待办事项即将到期。";
  }

  if (noteType === "timeline") {
    return "这条时间轴记录到了回顾时间。";
  }

  if (noteType === "rich_text") {
    return "这篇笔记到了复习时间。";
  }

  return "这条便签到了提醒时间。";
}

function reminderHintForNoteType(noteType: StorageNoteType) {
  if (noteType === "todo") {
    return "截止、重复、过期提醒";
  }

  if (noteType === "timeline") {
    return "纪念日和回顾";
  }

  if (noteType === "rich_text") {
    return "复习提醒";
  }

  return "指定时间提醒";
}

async function ensureNotificationPermission() {
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  return permissionGranted;
}

function reminderNotificationBody(reminder: ReminderRecord) {
  const body = reminder.message.trim() || reminder.note_title;
  return `${body}\n时间：${formatDate(reminder.remind_at)}`;
}

function reminderInputToRfc3339(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toDatetimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function reminderTypeLabel(reminderType: ReminderType) {
  return reminderTypes.find((item) => item.id === reminderType)?.label ?? "提醒";
}

function repeatRuleLabel(reminder: ReminderRecord) {
  if (reminder.repeat_rule === "custom") {
    return `每 ${reminder.custom_interval_days} 天`;
  }

  return repeatRules.find((item) => item.id === reminder.repeat_rule)?.label ?? "不重复";
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
