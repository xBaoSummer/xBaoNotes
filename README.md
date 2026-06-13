# xBaoNotes

自用 Windows 桌面便签。

## 当前状态

Phase 1 基础骨架、Phase 2 本地数据层、Phase 3 主页面基础管理、Phase 4 回收站与安全删除、Phase 5 富文本和附件基础闭环、Phase 6 桌面贴出便签、Phase 7 贴边入口和托盘、Phase 8 提醒系统、Phase 9 密码锁和备份恢复、Phase 10 打包测试优化、Phase 11 便携版已完成：

- Tauri 2 + Rust 桌面壳
- React + TypeScript + Vite 前端
- Windows 11 风格主界面雏形
- 日间 / 黑夜 / 跟随系统主题切换
- Windows 可执行程序和安装包构建
- 默认创建 `Documents\xBaoNotes` 本地数据目录
- SQLite 数据库初始化
- 默认设置、默认文件夹、便签表基础读写
- “新建便签”会写入本地 SQLite 数据库
- 真实便签编辑保存
- 便签标题修改
- 便签置顶/取消置顶
- 按类型、标题、文件夹查询便签
- 文件夹创建和筛选
- 删除便签时先进入回收站
- 回收站列表
- 从回收站恢复
- 彻底删除单条便签
- 清空回收站
- 彻底删除和清空回收站前会二次确认
- TipTap 富文本编辑器
- 加粗、斜体、下划线、文字颜色、高亮、列表
- 表格插入、增行、增列、删除表格
- 图片拖入后复制到软件附件目录并可预览
- 普通附件拖入后显示附件卡片
- 点击附件调用系统默认程序打开
- 彻底删除便签或清空回收站时清理关联附件文件
- 单条便签可贴出为独立桌面窗口
- 贴出窗口可移动、缩放并保存位置尺寸
- 贴出窗口默认置顶，支持手动取消置顶
- 软件启动后恢复已贴出的便签窗口并自动重新置顶
- 主工作台可查看和切换贴出状态
- 默认启动显示贴边入口
- 贴边入口支持左、右、上、下位置设置
- 鼠标靠近贴边入口后展开快捷入口
- 贴边入口可快速打开全部、普通、待办、时间轴、富文本类型
- 系统托盘支持打开主页面、显示贴边入口和退出
- 支持开机自启动开关
- 新增 `reminders` 本地提醒表
- 普通便签支持指定时间提醒
- 待办支持截止提醒、重复提醒和自定义间隔提醒
- 时间轴默认使用纪念日/回顾提醒
- 富文本笔记默认使用复习提醒
- 提醒到期后通过 Windows 系统通知弹出
- 重复提醒触发后自动推进下一次提醒时间
- 支持密码锁，密码使用 Argon2 哈希保存
- 支持自动锁定时间设置和立即锁定
- 密码锁开启后，启动时不直接恢复贴出窗口，解锁后再恢复
- 支持修改密码和关闭密码锁
- 支持选择备份目录
- 支持手动备份数据库、附件和回收站目录
- 支持从备份目录恢复，恢复前自动保护当前数据
- 前端构建已拆分 React、Tauri、富文本编辑器和 vendor chunk，消除 500 kB 单 chunk 警告
- 新增发布前测试清单 `docs/test-checklist.md`
- 完整 Windows 打包和最小启动测试已通过
- 安装版使用 `Documents\xBaoNotes` 数据目录
- 便携版通过 `portable.flag` 启用，所有数据保存在软件所在目录
- 已生成正式版 `1.0.0` 安装包和便携版 zip

## 开发命令

安装依赖：

```powershell
npm.cmd install
```

前端构建：

```powershell
npm.cmd run build
```

桌面应用构建：

```powershell
npm.cmd run tauri -- build
```

## 构建产物

可执行文件：

```text
src-tauri\target\release\xbao-notes.exe
```

Windows 安装包：

```text
src-tauri\target\release\bundle\msi\xBaoNotes_1.0.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\xBaoNotes_1.0.0_x64-setup.exe
```

便携版压缩包：

```text
src-tauri\target\release\xBaoNotesPortable_1.0.0_x64.zip
```

默认本地数据目录：

```text
Documents\xBaoNotes
Documents\xBaoNotes\Data\xbao-notes.sqlite3
Documents\xBaoNotes\Attachments
Documents\xBaoNotes\Backup
Documents\xBaoNotes\Recycle Bin
```

## 当前注意事项

- 富文本正文以 HTML 形式保存在 SQLite 中。
- 拖入附件会立即复制到 `Documents\xBaoNotes\Attachments`；正文内容仍需要点击“保存”写入数据库。
- Phase 7 开始主窗口默认隐藏，启动后显示贴边入口；可从贴边入口或托盘打开主页面。
- Phase 8 提醒依赖 Windows 通知权限；首次触发提醒时系统可能要求允许通知。
- Phase 9 密码锁是软件访问保护，不是完整磁盘级数据加密。
- Phase 9 备份产物是带时间戳的备份目录，不是压缩包。
- 便携版请保留 `portable.flag`，删除该文件会切回安装版数据目录规则。
