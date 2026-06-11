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
