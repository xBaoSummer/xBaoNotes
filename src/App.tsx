import { useMemo, useState } from "react";

type NoteType = "all" | "normal" | "todo" | "timeline" | "rich";
type ThemeMode = "light" | "dark" | "system";

type NotePreview = {
  id: number;
  type: Exclude<NoteType, "all">;
  title: string;
  folder: string;
  updatedAt: string;
  pinned?: boolean;
  summary: string;
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

const previews: NotePreview[] = [
  {
    id: 1,
    type: "todo",
    title: "今天要处理的任务",
    folder: "工作",
    updatedAt: "09:42",
    pinned: true,
    summary: "确认 Phase 1 骨架、主题切换和主窗口启动。",
  },
  {
    id: 2,
    type: "timeline",
    title: "项目启动记录",
    folder: "项目日志",
    updatedAt: "昨天",
    summary: "记录 xBaoNotes 的第一版目标和后续阶段。",
  },
  {
    id: 3,
    type: "normal",
    title: "临时想法",
    folder: "默认文件夹",
    updatedAt: "周三",
    summary: "贴边入口默认显示，主页面按需打开。",
  },
  {
    id: 4,
    type: "rich",
    title: "富文本能力清单",
    folder: "设计",
    updatedAt: "6月12日",
    summary: "标题、列表、图片、附件、完整表格能力。",
  },
];

const typeLabels: Record<Exclude<NoteType, "all">, string> = {
  normal: "普通便签",
  todo: "待办",
  timeline: "时间轴",
  rich: "富文本",
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

  const resolvedTheme = resolveTheme(themeMode);
  document.documentElement.dataset.theme = resolvedTheme;

  const filteredNotes = useMemo(() => {
    return previews.filter((note) => {
      const matchesType = activeType === "all" || note.type === activeType;
      const matchesQuery = note.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [activeType, query]);

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
          <button className="primary-action" type="button">新建便签</button>
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
              {filteredNotes.map((note) => (
                <article className="note-card" key={note.id}>
                  <div className="note-card-header">
                    <span className="type-pill">{typeLabels[note.type]}</span>
                    {note.pinned ? <span className="pin-label">置顶</span> : null}
                  </div>
                  <h4>{note.title}</h4>
                  <p>{note.summary}</p>
                  <footer>
                    <span>{note.folder}</span>
                    <span>{note.updatedAt}</span>
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
                <strong>本地保存</strong>
              </div>
              <div>
                <span>技术底座</span>
                <strong>Tauri 2</strong>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
