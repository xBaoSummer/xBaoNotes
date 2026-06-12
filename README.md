# xBaoNotes

自用 Windows 桌面便签。

## 当前状态

Phase 1 基础骨架、Phase 2 本地数据层、Phase 3 主页面基础管理、Phase 4 回收站与安全删除、Phase 5 富文本和附件基础闭环、Phase 6 桌面贴出便签、Phase 7 贴边入口和托盘已完成：

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
src-tauri\target\release\bundle\msi\xBaoNotes_0.1.0_x64_en-US.msi
src-tauri\target\release\bundle\nsis\xBaoNotes_0.1.0_x64-setup.exe
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
- Phase 5 引入 TipTap 后前端包体积变大，后续可在性能优化阶段做富文本懒加载。
- Phase 7 开始主窗口默认隐藏，启动后显示贴边入口；可从贴边入口或托盘打开主页面。
- 便携版已进入最终交付规划，后续会让数据保存在软件所在目录。
