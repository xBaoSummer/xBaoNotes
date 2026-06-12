# xBaoNotes 待办事项记录

## Current Phase

Phase 9：密码锁和备份恢复。

## Next Tasks

- 设计密码锁数据结构和设置项。
- 密码不明文保存，使用密码哈希和盐。
- 启动软件、从贴边入口打开主页面时支持锁定校验。
- 支持自动锁定时间设置。
- 支持修改密码和关闭密码锁。
- 支持手动备份 SQLite 数据库、附件、设置和回收站相关数据。
- 支持从备份恢复，恢复前保护当前数据。
- 支持备份路径设置，默认使用 `Documents\xBaoNotes\Backup`。

## Completed This Phase

- Phase 8 已新增 `reminders` 表和提醒命令。
- Phase 8 已接入 Windows 系统通知。
- Phase 8 已实现普通便签指定时间提醒。
- Phase 8 已实现待办截止提醒、重复提醒和自定义间隔提醒。
- Phase 8 已实现时间轴纪念日提醒。
- Phase 8 已实现富文本笔记复习提醒。
- Phase 8 已实现到期提醒轮询和触发后状态更新。
- Phase 8 已实现一次性提醒自动停用、重复提醒自动推进下一次时间。

## Backlog

- Phase 1：项目基础骨架。
- Phase 2：本地数据层。
- Phase 3：主页面基础管理。
- Phase 4：回收站和安全删除。
- Phase 5：富文本、图片和附件。
- Phase 6：桌面贴出便签。
- Phase 7：贴边入口、托盘和启动行为。
- Phase 8：提醒系统。
- Phase 9：密码锁和备份恢复。
- Phase 10：打包、测试和优化。
- Phase 11：便携版和正式 Release。

## Pending Confirmation

- 无。

## Deferred

- 数据文件加密。
- 手机端。
- 云同步。
- 多人协作。

