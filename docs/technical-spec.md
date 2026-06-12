# xBaoNotes 技术规范 v1.0

## 1. 技术路线

已选技术栈：

- 桌面框架：Tauri 2
- 后端语言：Rust
- 前端语言：TypeScript
- 前端框架：React
- 构建工具：Vite
- 本地数据库：SQLite
- 数据访问：Rust 数据层优先，必要时使用 Tauri SQL 插件
- 富文本编辑器：TipTap / ProseMirror 系编辑器
- UI 组件：自建 Windows 11 / Fluent 风格组件，必要时参考 Fluent UI 设计规范
- 打包方式：Tauri Bundler，优先生成 Windows 安装包

选择理由：

- Tauri 使用系统 WebView2，不随应用打包完整 Chromium，比 Electron 更适合常驻型便签软件。
- Rust 后端适合处理本地文件、备份、回收站、附件复制、密码哈希等需要稳定和安全的能力。
- React + TypeScript 适合维护复杂界面状态，并且与 TipTap 富文本编辑器生态兼容更好。
- Vite 启动快、配置轻，适合分阶段开发。
- SQLite 适合本地结构化数据、标题搜索、回收站、提醒和备份。
- ProseMirror 系编辑器适合完整富文本、图片、附件、表格扩展。

性能和资源控制原则：

- 不采用 Electron 作为默认方案，避免常驻时额外打包 Chromium 带来的体积、内存和进程成本。
- 默认启动只显示贴边入口，不主动创建主窗口和所有桌面便签窗口。
- 主窗口、贴边入口、桌面便签窗口按需创建，关闭后释放。
- 富文本编辑器懒加载，只在编辑富文本笔记或需要富文本能力时加载。
- 便签列表使用分页或虚拟列表，避免一次性渲染大量便签。
- 桌面贴出窗口数量需要受控，后续可在设置中加入最大贴出数量提醒。
- 文件、附件、备份等重操作放在 Rust 后端执行，避免阻塞界面。

兼容性原则：

- 主要支持 Windows 11。
- 兼容 Windows 10 64 位作为可选目标。
- 依赖 Microsoft Edge WebView2 Runtime；安装包需要检测 WebView2，缺失时提示或引导安装。
- 不做账号、云同步、手机端和多人协作。

## 2. 应用模块划分

建议分为：

- Tauri Rust Core：窗口管理、托盘、贴边入口、系统通知、开机自启动、文件路径、备份、回收站、附件管理、密码哈希。
- Frontend UI：主页面、便签列表、编辑器、设置页、回收站页。
- Command API：只暴露必要命令给前端调用，避免前端直接访问任意本地文件能力。

## 3. 窗口类型

至少包含：

- 主窗口：管理所有便签、文件夹、设置、回收站。
- 贴边入口窗口：默认启动显示的小入口，可展开快速切换类型。
- 桌面便签窗口：每条贴出的便签独立窗口，默认置顶。
- 提醒窗口或系统通知：用于提醒。

桌面便签窗口需要保存：

- 便签 ID
- 位置
- 尺寸
- 是否贴出
- 是否置顶

重启时恢复贴出窗口，并自动重新置顶。

## 4. 数据目录

建议默认数据根目录：

```text
Documents\xBaoNotes
```

建议子目录：

```text
Documents\xBaoNotes\Data
Documents\xBaoNotes\Attachments
Documents\xBaoNotes\Backup
Documents\xBaoNotes\Recycle Bin
```

备份和回收站路径必须允许用户在设置中修改。

便携版数据根目录：

- 便携版通过软件所在目录旁的 `portable.flag` 标记启用。
- 启用后，数据根目录改为可执行文件所在目录或其旁边的便携数据目录。
- 便携版不默认写入 `Documents\xBaoNotes`。
- 如果便携版所在目录不可写，启动时必须提示用户移动到可写目录。

建议便携版目录结构：

```text
xBaoNotesPortable\
  xbao-notes.exe
  portable.flag
  Data\
  Attachments\
  Backup\
  Recycle Bin\
```

## 5. 数据模型

建议核心表：

- `notes`：所有便签基础信息。
- `folders`：文件夹。
- `attachments`：附件和图片。
- `reminders`：提醒规则。
- `sticky_windows`：桌面贴出窗口状态。
- `settings`：软件设置。
- `recycle_items`：回收站记录。

Phase 2 已实现基础表：

- `settings`
- `folders`
- `notes`

Phase 3 已实现基础命令：

- `list_notes`：支持按类型、文件夹、标题查询。
- `create_note`：创建本地便签。
- `update_note`：编辑标题、内容、类型和文件夹。
- `set_note_pinned`：置顶和取消置顶。
- `create_folder`：创建文件夹。

Phase 4 已实现回收站命令：

- `delete_note`：软删除便签，标记 `is_deleted = 1` 并写入 `recycle_items`。
- `list_recycle_items`：读取回收站列表。
- `restore_note`：从回收站恢复便签。
- `purge_note`：彻底删除单条回收站便签。
- `empty_recycle_bin`：清空回收站。

Phase 5 已实现富文本和附件基础能力：

- 前端接入 TipTap / ProseMirror 富文本编辑器。
- 富文本正文以 HTML 字符串保存到 `notes.content`。
- 支持加粗、斜体、下划线、文字颜色、高亮、有序列表、无序列表。
- 支持表格插入、增行、增列、删除表格，表格内容随正文 HTML 保存。
- 新增 `attachments` 表，保存附件归属、原始文件名、软件管理文件名、存储路径、MIME、大小、类型和创建时间。
- 新增 `create_attachment`：将拖入文件复制到 `Documents\xBaoNotes\Attachments\<note_id>` 并写入数据库。
- 新增 `list_attachments`：读取指定便签附件。
- 新增 `open_attachment`：调用系统默认程序打开软件管理目录中的附件。
- 图片附件通过 Tauri `asset` 协议在前端预览，访问范围限制到 `$DOCUMENT/xBaoNotes/Attachments/**`。
- 彻底删除便签和清空回收站时，会删除关联附件文件并移除附件数据库记录。
- 从回收站恢复便签时，附件保持原关联关系，不需要额外迁移。

Phase 6 已实现桌面贴出便签基础能力：

- 新增 `sticky_windows` 表，保存贴出状态、置顶状态、位置和尺寸。
- 新增 `get_note`：按便签 ID 读取单条活动便签。
- 新增 `post_sticky_note`：将便签标记为贴出并创建独立窗口。
- 新增 `unpost_sticky_note`：取消贴出并关闭独立窗口。
- 新增 `list_sticky_windows`：读取当前贴出的便签窗口。
- 新增 `get_sticky_window`：读取单条贴出窗口状态。
- 新增 `set_sticky_always_on_top`：支持贴出窗口手动置顶/取消置顶。
- 贴出窗口移动或缩放时自动保存窗口位置和尺寸。
- 应用启动时恢复已贴出窗口，并按需求自动重新置顶。
- 删除便签进入回收站时，会同步取消该便签的贴出状态。

Phase 7 已实现贴边入口、托盘和启动行为基础能力：

- 主窗口配置为默认隐藏，启动行为由 `startup_mode` 设置决定。
- 新增贴边入口窗口 `edge-entry`，使用独立 WebView 视图 `?view=edge`。
- 贴边入口支持 `left`、`right`、`top`、`bottom` 四种位置。
- 鼠标进入贴边入口时，前端调用 `set_edge_entry_expanded` 扩展窗口尺寸；鼠标离开后收起。
- 新增 `open_main_window`：显示主窗口，并可通过事件让主页面切换到指定便签类型。
- 新增 `open_edge_entry`：显示或创建贴边入口。
- 新增 `set_edge_position`：保存贴边位置并重建入口窗口。
- 新增系统托盘菜单：打开主页面、显示贴边入口、退出。
- 开机自启动通过当前用户注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` 实现。
- 新增 `get_auto_start_enabled` 和 `set_auto_start_enabled` 命令。
- 新增设置项：`edge_position`、`edge_entry_enabled`、`auto_start_enabled`。

Phase 8 已实现提醒系统基础能力：

- 新增 `reminders` 表，保存便签 ID、提醒类型、提醒标题、提醒内容、提醒时间、重复规则、自定义间隔、启用状态和最后触发时间。
- 支持提醒类型：指定时间、截止提醒、重复提醒、纪念日、复习提醒。
- 支持重复规则：不重复、每天、每周、每月、每年、自定义天数。
- 新增 `create_reminder`、`update_reminder`、`delete_reminder`、`list_reminders`、`list_due_reminders`、`complete_reminder` 命令。
- 前端按当前便签类型提供默认提醒方案：普通便签为指定时间，待办为截止提醒，时间轴为纪念日，富文本笔记为复习提醒。
- 主窗口每 30 秒查询到期提醒，使用 Tauri notification 插件触发 Windows 系统通知。
- 一次性提醒触发后自动停用；重复提醒触发后自动计算下一次提醒时间。
- 通知权限由前端在首次需要弹出提醒时请求。

Phase 9 已实现密码锁和备份恢复基础能力：

- 新增安全状态命令：`get_security_state`。
- 新增密码锁命令：`setup_password`、`verify_password`、`change_password`、`disable_password`、`set_auto_lock_minutes`。
- 密码使用 Argon2 哈希保存到 `settings.password_hash`，普通 `list_settings` 不返回该敏感字段。
- 新增自动锁定设置 `auto_lock_minutes`，支持不自动锁定、1 分钟、5 分钟、15 分钟、30 分钟、60 分钟等前端选项。
- 密码锁启用后，应用启动时不恢复贴出的桌面便签窗口；用户解锁后调用 `restore_sticky_windows_after_unlock` 恢复。
- 用户手动锁定或自动锁定时，调用 `close_sticky_windows_for_lock` 关闭贴出窗口，但保留数据库中的贴出状态，方便解锁后恢复。
- 新增备份命令：`create_backup`、`list_backups`、`restore_backup`。
- 手动备份写入带时间戳的备份目录，包含 `Data`、`Attachments`、`Recycle Bin` 和 `backup-manifest.json`。
- 恢复备份前自动创建 `Before Restore` 安全备份。
- 恢复操作只覆盖受管理的数据子目录，并在清理目录前校验目标路径位于 xBaoNotes 数据根目录内。

`notes` 至少包含：

- `id`
- `type`：normal、todo、timeline、rich_text
- `title`
- `content`
- `folder_id`
- `is_pinned`
- `is_deleted`
- `created_at`
- `updated_at`
- `deleted_at`

## 6. 搜索规则

当前只搜索标题。应使用数据库字段查询，不扫描所有正文内容。

## 7. 回收站规则

删除便签时：

1. 不直接删除数据库记录。
2. 标记为已删除。
3. 记录删除时间和回收站位置。
4. 关联附件保持可恢复。

彻底删除时才移除数据库记录和附件文件。

## 8. 备份规则

备份至少包含：

- SQLite 数据库文件
- 附件目录
- 设置文件

当前备份使用带时间戳的目录，例如：

```text
Backup\Manual Backup_20260613_153000
```

恢复备份前必须提示用户，并保留当前数据的一份临时备份。

## 9. 密码锁和安全

第一阶段建议实现应用访问密码锁：

- 密码不明文保存。
- 使用 Argon2 保存带盐的密码哈希。
- 支持关闭密码锁。
- 支持自动锁定时间。

数据文件加密属于更高安全等级，单独规划，避免第一版过度复杂。

## 10. 提醒规则

提醒已持久化保存到 SQLite，并在主窗口启动后按间隔检查到期提醒。

提醒来源：

- 普通便签：指定时间。
- 待办：截止时间、重复提醒、自定义间隔提醒。
- 时间轴：指定日期、纪念日、回顾提醒。
- 富文本笔记：指定时间、复习提醒。

提醒展示优先使用 Windows 系统通知；必要时补充应用内提醒窗口。

当前实现说明：

- 主窗口默认存在但可隐藏，因此贴边入口或托盘启动时仍可执行提醒轮询。
- 如果 Windows 通知权限未授予，到期提醒不会被标记完成，会在后续轮询中继续保留。

## 11. 附件规则

拖入附件时：

1. 复制文件到 `Attachments` 管理目录。
2. 在数据库记录原始文件名、存储文件名、大小、类型、所属便签。
3. 便签中显示预览或附件卡片。
4. 打开附件时调用系统默认程序。
5. 彻底删除便签时清理关联附件文件。

不得只保存原始文件路径，否则原文件移动后会导致附件丢失。

## 12. 验证要求

每个开发阶段至少完成：

- 应用能启动。
- 核心页面无明显空白或崩溃。
- 新增功能可通过手动操作验证。
- 涉及数据的功能必须验证重启后仍存在。
- 涉及删除的功能必须验证可恢复。
