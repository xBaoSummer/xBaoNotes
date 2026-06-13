# AGENTS.md

本项目是 Windows 本地便签软件 `xBaoNotes`。后续开发必须先阅读本文件，并遵守下列文档路径和工作规则。

## 标准文档路径

- 产品需求文档：`docs/requirements.md`
- 技术规范文档：`docs/technical-spec.md`
- UI/交互设计规范：`docs/design-guidelines.md`
- 分阶段开发计划：`docs/development-plan.md`
- 执行与质量标准：`docs/execution-standards.md`
- 发布测试清单：`docs/test-checklist.md`
- 开发日志说明：`dev-logs/README.md`
- 已完成事项记录：`dev-logs/progress.md`
- 待办事项记录：`dev-logs/todo.md`

## 工作说明

1. 开始任何开发前，先阅读 `docs/requirements.md`、`docs/development-plan.md` 和 `dev-logs/todo.md`。
2. 每次只推进一个小目标，避免一次性修改过多模块。
3. 如果用户提出新需求，先更新 `docs/requirements.md` 或相关标准文档，再进入实现。
4. 完成任何开发、文档或配置变更后，必须更新：
   - `dev-logs/progress.md`：记录本次已完成事项、影响文件、验证结果。
   - `dev-logs/todo.md`：更新剩余待办和下一步建议。
5. 不允许绕过回收站、备份、密码锁等用户数据安全相关设计。
6. 涉及数据结构、存储路径、密码、安全、备份、回收站的变更，必须优先参考 `docs/technical-spec.md`。
7. 涉及界面、主题、贴边入口、桌面便签窗口的变更，必须优先参考 `docs/design-guidelines.md`。
8. 若发现现有文档与用户最新要求冲突，以用户最新要求为准，并同步修正文档。
9. 最终回复用户前，说明完成内容、验证情况，以及下一步建议。

## 当前项目原则

- 软件仅面向本地 Windows 使用，不做账号、云同步或跨设备同步。
- UI 风格遵循 Windows 11 / Fluent Design。
- 以稳定、安全、可逐步验证为优先目标。
- 默认数据、备份、回收站都应保存在用户可理解、可迁移的位置。
