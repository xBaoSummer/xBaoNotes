# xBaoNotes 已完成事项记录

## 2026-06-12

### Completed

- 确认软件名称为 `xBaoNotes`。
- 确认软件定位为 Windows 本地便签软件。
- 确认默认启动显示贴边隐藏小入口。
- 确认贴出便签重启后恢复窗口并自动重新置顶。
- 创建项目标准文档目录 `docs`。
- 创建开发日志目录 `dev-logs`。
- 创建 `AGENTS.md`，记录后续开发必须遵守的文档路径和工作规则。

### Changed Files

- `AGENTS.md`
- `docs/README.md`
- `docs/requirements.md`
- `docs/technical-spec.md`
- `docs/design-guidelines.md`
- `docs/development-plan.md`
- `docs/execution-standards.md`
- `dev-logs/README.md`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- 已建立文档和日志骨架。
- 已将用户确认的需求写入需求文档。
- 已将分阶段开发策略写入开发计划。

### Risks

- 当前尚未创建可运行应用。
- 技术栈已在后续记录中确认为 Tauri 2 方案。

## 2026-06-12 技术栈确认

### Completed

- 根据性能、兼容性、内存占用、进程占用和后续维护成本，确定采用 Tauri 2 技术路线。
- 将原候选 Electron 方案调整为 Tauri 2 + Rust + React + TypeScript + Vite + SQLite。
- 明确富文本采用 TipTap / ProseMirror 系编辑器。
- 明确默认资源控制策略：按需创建窗口、懒加载富文本、列表分页或虚拟化、重操作放到 Rust 后端。

### Changed Files

- `docs/technical-spec.md`
- `docs/development-plan.md`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- 已将技术路线写入技术规范。
- 已将 Phase 1 项目骨架说明同步为 Tauri 2。

### Risks

- Tauri 依赖 WebView2 Runtime，Windows 11 默认包含；Windows 10 需要在安装包中检测并提示安装。
- Tauri/Rust 首次搭建需要安装 Rust、Node.js 等开发工具。

## 2026-06-12 项目目录迁移

### Completed

- 读取新的 Git 项目目录 `D:\xBao\Documents\AllProjects\VSCodeProjects\xBaoNotes`。
- 将 `AGENTS.md`、`docs`、`dev-logs` 重新生成到新项目目录。
- 保留新项目目录中已有的 `.git`、`LICENSE`、`README.md`。

### Changed Files

- `AGENTS.md`
- `docs/*`
- `dev-logs/*`

### Verification

- 已确认新目录存在 `.git`。
- 已确认新目录存在 `AGENTS.md`、`docs`、`dev-logs`。
- 已确认技术栈文档仍为 Tauri 2 + Rust + React + TypeScript + Vite + SQLite。

### Risks

- 当前命令环境中的默认工作目录仍显示为旧目录 `bianqian`，后续开发前需要确认工具工作目录已切换到 `xBaoNotes`。

## 2026-06-12 Phase 1 基础骨架

### Completed

- 创建 Tauri 2 + Rust + React + TypeScript + Vite 基础项目。
- 创建 Windows 11 风格主界面雏形。
- 实现便签类型切换 UI：全部、普通便签、待办、时间轴、富文本笔记。
- 实现标题搜索 UI。
- 实现日间、黑夜、跟随系统主题切换。
- 添加 xBaoNotes SVG 应用图标，并生成 Tauri 图标集。
- 安装 npm 依赖。
- 安装 Rust 工具链。
- 构建 Windows release 可执行程序。
- 构建 Windows MSI 和 NSIS 安装包。
- 短暂启动 release 可执行程序，确认程序可在 Windows 上运行。

### Changed Files

- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/app-icon.svg`
- `src-tauri/icons/*`
- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd install` 成功。
- `npm.cmd run build` 成功。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。
- 已启动 release 可执行文件并正常关闭。

### Risks

- 当前只是 Phase 1 骨架，尚未实现真实数据保存、回收站、贴边入口、桌面贴出和提醒。
- Rust 已安装到当前用户环境，新的终端可能需要重新打开后才能自动识别 `cargo`。

## 2026-06-12 GitHub 上传尝试

### Completed

- 创建本地 Git 提交：`Phase 1 scaffold Tauri app`。
- 首次推送被 GitHub 拒绝，原因是提交邮箱触发隐私保护。
- 将本仓库 Git 邮箱改为 GitHub noreply 邮箱：`65091392+xBaoSummer@users.noreply.github.com`。
- 重写未推送提交，避免暴露私有邮箱。

### Verification

- 本地提交已生成。
- GitHub 隐私邮箱问题已处理。

### Risks

- 后续推送因网络连接 GitHub 失败暂未完成：`Failed to connect to github.com port 443`。

## 2026-06-12 Phase 2 本地数据层基础

### Completed

- 新增 Rust `storage` 模块。
- 引入 `rusqlite`，使用 Rust 后端直接管理 SQLite。
- 默认创建本地数据目录：
  - `Documents\xBaoNotes\Data`
  - `Documents\xBaoNotes\Attachments`
  - `Documents\xBaoNotes\Backup`
  - `Documents\xBaoNotes\Recycle Bin`
- 初始化 SQLite 数据库：`Documents\xBaoNotes\Data\xbao-notes.sqlite3`。
- 创建基础表：`settings`、`folders`、`notes`。
- 写入默认设置：主题模式、启动模式、备份路径、回收站路径。
- 写入默认文件夹：`默认文件夹`。
- 新增 Tauri 命令：
  - `initialize_storage`
  - `get_storage_status`
  - `list_folders`
  - `create_folder`
  - `create_note`
  - `list_notes`
  - `list_settings`
  - `set_setting`
- 前端启动时自动初始化本地数据层。
- 前端显示本地数据目录、数据库路径、文件夹数量和便签数量。
- “新建便签”按钮已接入真实 SQLite 写入。
- 新增 Rust 单元测试验证 schema、默认设置和默认文件夹。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，1 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- Release 程序已启动并正常关闭。
- 已确认生成默认数据目录和 SQLite 数据库文件。

### Risks

- 当前只是数据层基础闭环，还没有完整编辑、重命名、删除、回收站恢复等主页面管理能力。
- 本机没有 `sqlite3` 命令行工具，数据库表验证通过 Rust 单元测试完成。

## 2026-06-12 Phase 3 主页面基础管理

### Completed

- 扩展 SQLite 查询能力，`list_notes` 支持按类型、文件夹、标题搜索。
- 新增便签更新接口 `update_note`，支持修改标题、内容、类型和文件夹。
- 新增置顶接口 `set_note_pinned`，支持置顶和取消置顶。
- 主页面左侧改为真实文件夹列表。
- 支持创建文件夹。
- 支持按文件夹筛选便签。
- 支持按便签类型筛选便签。
- 支持标题搜索走 SQLite 查询。
- 支持选择便签并在右侧编辑。
- 支持保存便签编辑内容。
- 支持在右侧置顶/取消置顶。
- 保留回收站入口但禁用，删除逻辑留到 Phase 4。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，2 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- Release 程序已启动并正常关闭。

### Risks

- 当前未实现删除和回收站恢复；按照数据安全原则留到 Phase 4 单独实现。
- 当前编辑器仍是普通文本框，富文本编辑器留到 Phase 5。
- Phase 3 提交已在本地完成，但 GitHub 推送因网络连接 `github.com:443` 超时暂未完成。

## 2026-06-12 Phase 4 回收站和安全删除

### Completed

- 新增 `recycle_items` 表，用于记录回收站条目。
- 新增软删除接口 `delete_note`，删除便签时标记 `is_deleted = 1`，不直接硬删除。
- 删除便签时取消置顶并记录 `deleted_at`。
- 新增回收站列表接口 `list_recycle_items`。
- 新增恢复接口 `restore_note`。
- 新增彻底删除接口 `purge_note`。
- 新增清空回收站接口 `empty_recycle_bin`。
- 主界面接入回收站入口。
- 普通便签编辑区新增“移入回收站”。
- 回收站视图支持恢复、彻底删除、清空回收站。
- 彻底删除和清空回收站前使用确认提示。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，3 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- Release 程序已启动并正常关闭。

### Risks

- 当前回收站只处理便签本体；附件功能将在 Phase 5 接入，届时需要补充附件随便签恢复/彻底删除的处理。
