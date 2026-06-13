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

## 2026-06-12 Phase 5 富文本、图片和附件

### Completed

- 安装 TipTap / ProseMirror 富文本相关依赖。
- 接入富文本编辑器，替换原普通文本框。
- 新增富文本工具栏：
  - 标题/正文
  - 加粗、斜体、下划线
  - 文字颜色、高亮
  - 有序列表、无序列表
  - 表格插入、增行、增列、删除表格
- 新增 `attachments` SQLite 表。
- 新增附件复制逻辑，拖入文件后复制到 `Documents\xBaoNotes\Attachments\<note_id>`。
- 新增附件列表读取和系统默认程序打开附件能力。
- 新增图片附件预览，Tauri `asset` 协议范围限制到附件目录。
- 前端新增附件面板，支持图片缩略图和普通附件卡片。
- 删除便签进入回收站时保留附件关联，恢复后附件仍可读取。
- 彻底删除便签和清空回收站时清理关联附件文件。
- 新增附件关系单元测试。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `package.json`
- `package-lock.json`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，4 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。

### Risks

- Phase 5 已实现富文本和附件基础闭环，但尚未做富文本懒加载；当前构建会提示前端 chunk 超过 500 kB。
- 拖入附件会立即复制到软件附件目录；正文 HTML 仍需用户点击“保存”写入数据库。
- 还未做桌面贴出窗口，计划进入 Phase 6。

## 2026-06-13 Phase 6 桌面贴出便签

### Completed

- 新增 `sticky_windows` SQLite 表，保存便签贴出状态、窗口位置、尺寸和置顶状态。
- 新增单条便签读取命令 `get_note`，供贴出窗口按 ID 读取内容。
- 新增 `post_sticky_note`，可从主工作台将便签贴出为独立桌面窗口。
- 新增 `unpost_sticky_note`，可取消贴出并关闭独立窗口。
- 新增 `list_sticky_windows` 和 `get_sticky_window`，用于读取当前贴出状态。
- 新增 `set_sticky_always_on_top`，贴出窗口支持手动置顶/取消置顶。
- 贴出窗口移动或缩放后会保存位置和尺寸。
- 软件启动时会恢复已贴出的便签窗口，并按需求自动重新置顶。
- 主工作台新增贴出/取消贴出按钮和“已贴出”状态标记。
- 贴出窗口支持编辑标题、富文本内容、保存、查看附件和打开附件。
- 删除便签进入回收站时，会同步取消该便签贴出状态。
- 新增便携版最终交付需求：便携版所有数据保存在软件所在目录。
- 开发计划新增 Phase 11：便携版和正式 GitHub Release。

### Changed Files

- `README.md`
- `docs/requirements.md`
- `docs/technical-spec.md`
- `docs/development-plan.md`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，5 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。

### Risks

- 贴出窗口内容同步采用短间隔刷新和保存后刷新，后续可补充跨窗口事件广播以进一步减少延迟。
- 贴出窗口复用了当前富文本编辑器，前端包体积仍有 Vite chunk 超过 500 kB 的提示，计划在性能优化阶段处理。
- 便携版需求已写入文档，但实际便携目录切换和便携打包仍留到 Phase 11 实现。

## 2026-06-13 Phase 7 贴边入口、托盘和启动行为

### Completed

- 主窗口改为默认隐藏，启动行为由 `startup_mode` 设置控制。
- 新增贴边入口窗口 `edge-entry`，默认启动显示贴边入口。
- 贴边入口支持左、右、上、下四个位置。
- 鼠标进入贴边入口后展开，鼠标离开后收起。
- 贴边入口支持快速打开全部、普通便签、待办、时间轴和富文本笔记视图。
- 主页面新增启动方式设置：贴边入口、主页面、托盘。
- 主页面新增贴边位置设置。
- 主页面新增开机自启动开关。
- 新增系统托盘菜单：打开主页面、显示贴边入口、退出。
- 主窗口关闭时隐藏到后台，避免误关后无法从托盘继续打开。
- 开机自启动通过 Windows 当前用户 Run 注册表项实现，不新增额外常驻进程。
- 技术规范补充 Phase 7 实现说明。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `src-tauri/tauri.conf.json`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，5 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。

### Risks

- Phase 7 已实现基础贴边展开，不包含复杂动画和多显示器逐屏选择；当前按主显示器工作区定位。
- 开机自启动使用当前用户注册表，适合普通安装版；便携版最终需要在 Phase 11 再确认是否默认关闭自启动。
- 主窗口默认隐藏后，用户需要通过贴边入口或托盘打开主页面；这符合默认贴边入口需求。

## 2026-06-13 Phase 8 提醒系统

### Completed

- 新增 Tauri notification 插件，用于 Windows 系统通知。
- 新增 `reminders` SQLite 表，保存提醒类型、提醒时间、重复规则、自定义间隔、启用状态和触发记录。
- 新增提醒命令：`create_reminder`、`update_reminder`、`delete_reminder`、`list_reminders`、`list_due_reminders`、`complete_reminder`。
- 普通便签默认使用指定时间提醒。
- 待办默认使用截止提醒，并支持每天、每周、每月、每年和自定义天数重复。
- 时间轴默认使用纪念日提醒，并默认按年重复。
- 富文本笔记默认使用复习提醒。
- 主工作台新增提醒设置面板，可新建、暂停、启用、删除提醒。
- 主窗口每 30 秒检查到期提醒，到期后弹出 Windows 通知。
- 一次性提醒触发后自动停用；重复提醒触发后自动推进到下一次提醒时间。
- 月度和年度重复提醒使用自然月/自然年推进。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `package.json`
- `package-lock.json`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，6 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。

### Risks

- Windows 通知权限被拒绝时，到期提醒会继续保留并等待后续授权。
- 当前提醒检查依赖主窗口进程存活；主窗口默认隐藏但仍存在，适合贴边入口和托盘启动模式。
- Phase 8 未做复杂日历表达式，后续如需“每个工作日”等规则可单独扩展。

## 2026-06-13 Phase 9 密码锁和备份恢复

### Completed

- 新增 Argon2 密码哈希依赖，密码不明文保存。
- 新增密码锁安全状态、启用密码、验证密码、修改密码、关闭密码锁、设置自动锁定时间命令。
- 普通设置列表会过滤 `password_hash`，避免前端直接读取敏感哈希。
- 主界面新增锁屏，密码锁启用后启动软件需要输入密码。
- 支持自动锁定和立即锁定。
- 密码锁开启时，软件启动不会直接恢复贴出窗口；解锁后恢复贴出窗口并重新置顶。
- 手动锁定或自动锁定时关闭贴出窗口，但保留贴出状态以便解锁后恢复。
- 新增系统文件夹选择对话框，用于选择备份目录和恢复来源。
- 新增手动备份功能，备份 `Data`、`Attachments`、`Recycle Bin` 和 `backup-manifest.json`。
- 新增备份列表，显示最近备份目录、时间和大小。
- 新增从备份恢复功能，恢复前自动创建 `Before Restore` 当前数据保护备份。
- 恢复操作只清理受管理的数据子目录，并加入路径校验防护。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `package.json`
- `package-lock.json`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，7 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。

### Risks

- 当前密码锁属于软件访问保护，不加密 SQLite 数据库和附件文件。
- 当前备份产物为目录结构，不是压缩包；正式 Release 可继续保留目录备份，便携版分发会单独生成 zip。
- 恢复备份时需要应用保持运行，恢复后会重新初始化本地存储状态。

## 2026-06-13 Phase 10 打包、测试和优化

### Completed

- 新增发布前测试清单 `docs/test-checklist.md`。
- 在 `AGENTS.md` 和执行标准中加入测试清单路径和发布前抽查要求。
- 配置 Vite `manualChunks`，拆分 React、Tauri、TipTap/ProseMirror 富文本编辑器和 vendor 依赖。
- 消除前端构建中的 500 kB 单 chunk 警告。
- 完成 Windows release exe、MSI、NSIS 安装包构建。
- 执行 release exe 最小启动 smoke test，确认程序进程可正常启动。
- 更新 README 和技术规范中的 Phase 10 状态。

### Changed Files

- `AGENTS.md`
- `README.md`
- `docs/execution-standards.md`
- `docs/technical-spec.md`
- `docs/test-checklist.md`
- `vite.config.ts`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功，构建输出拆分为 `react`、`editor`、`tauri`、`vendor` 和主入口 chunk。
- `cargo test` 成功，7 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- 已生成可执行文件：`src-tauri\target\release\xbao-notes.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe`。
- release exe smoke test 成功：启动 5 秒后进程仍存在，并已关闭测试进程。

### Risks

- Phase 10 只做构建、测试清单和基础优化；正式 Release 和便携版留到 Phase 11。
- 当前 smoke test 是最小启动验证，不等同于完整人工逐项验收。

## 2026-06-13 Phase 11 便携版和正式 Release 准备

### Completed

- 应用版本号提升到 `1.0.0`。
- 新增 `portable.flag` 检测，便携版数据根目录使用可执行文件所在目录。
- `AppPaths` 新增 `is_portable` 字段，前端可显示安装版/便携版数据模式。
- 便携版自动创建 `Data`、`Attachments`、`Backup`、`Recycle Bin`。
- 便携版启动时检查软件所在目录可写，不可写时返回明确错误。
- 便携版强制将备份路径和回收站路径设置到软件所在目录。
- 便携版默认关闭并禁止开启开机自启动。
- 新增图片附件 data URL 预览命令，保证便携目录下图片附件可预览。
- 新增 `scripts/package-portable.ps1`，可生成便携版 zip。
- 新增 `docs/release-notes-v1.0.0.md`。
- README、技术规范和测试清单已同步便携版和 1.0.0 产物信息。

### Changed Files

- `README.md`
- `docs/technical-spec.md`
- `docs/test-checklist.md`
- `docs/release-notes-v1.0.0.md`
- `package.json`
- `package-lock.json`
- `scripts/package-portable.ps1`
- `src/App.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/src/lib.rs`
- `src-tauri/src/storage.rs`
- `src-tauri/tauri.conf.json`
- `dev-logs/progress.md`
- `dev-logs/todo.md`

### Verification

- `npm.cmd run build` 成功。
- `cargo test` 成功，7 个测试通过。
- `npm.cmd run tauri -- build` 成功。
- `scripts\package-portable.ps1 -Version 1.0.0` 成功。
- 安装版 release exe smoke test 成功。
- 便携版 smoke test 成功，数据库创建在 `src-tauri\target\release\portable\xBaoNotesPortable\Data\xbao-notes.sqlite3`。
- 已生成 NSIS 安装包：`src-tauri\target\release\bundle\nsis\xBaoNotes_1.0.0_x64-setup.exe`。
- 已生成 MSI 安装包：`src-tauri\target\release\bundle\msi\xBaoNotes_1.0.0_x64_en-US.msi`。
- 已生成便携版 zip：`src-tauri\target\release\xBaoNotesPortable_1.0.0_x64.zip`。
- GitHub Release `v1.0.0` 创建成功：`https://github.com/xBaoSummer/xBaoNotes/releases/tag/v1.0.0`。
- Release 附件已确认包含：
  - `xBaoNotes_1.0.0_x64-setup.exe`
  - `xBaoNotes_1.0.0_x64_en-US.msi`
  - `xBaoNotesPortable_1.0.0_x64.zip`

### Risks

- 当前只做自动化构建和 smoke test；完整人工逐项验收仍应按 `docs/test-checklist.md` 执行。
