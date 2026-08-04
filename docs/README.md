# 项目文档索引

## 目标方向

**个人 70 天备考计划** — 自己用的成人本科（理工类 · 2026 年）备考工具。
核心：70 天倒计时 + 个性化学习计划 + 每日打卡 + 进度跟踪。

👉 **[00-产品方向](./00-product-vision.md)** — 唯一目标方向（已按真实需求重写）。
👉 **[07-执行计划](./execution-plan.md)** — 当前执行的阶段化计划。

## 文档目录

| 文档 | 说明 | 状态 |
| --- | --- | --- |
| [00-产品方向](./00-product-vision.md) | 个人 70 天备考计划（2026 理工类） | ✅ 当前方向 |
| [01-项目概览](./01-project-overview.md) | 旧方向：上海成考通用刷题 MVP | 🗄️ 历史记录 |
| [02-技术架构](./02-architecture.md) | 旧方向架构（部分仍适用） | 🗄️ 历史记录 |
| [03-模块详解](./03-modules.md) | 旧方向模块 | 🗄️ 历史记录 |
| [04-数据库设计](./04-database.md) | 旧方向表结构（已被新迁移替换） | 🗄️ 历史记录 |
| [05-API 参考](./05-api-reference.md) | 旧方向接口 | 🗄️ 历史记录 |
| [06-开发与部署](./06-development.md) | 本地开发、Docker、CI | ✅ 可继续使用 |
| [07-执行计划](./execution-plan.md) | 阶段化执行计划（基于代码现状） | ✅ 当前执行 |

## 相关资源

- 根目录 [README.md](../README.md) — 旧方向快速上手（历史）
- [shanghai-chengkao-70d-design-v4.md](../shanghai-chengkao-70d-design-v4.md) — 旧设计文档（历史）

## 包命名约定

| 包名 | 路径 | 职责 |
| --- | --- | --- |
| `@shck/shared` | `packages/shared` | 跨端共享类型、科目、计划模板、复习间隔算法 |
| `@shck/server` | `packages/server` | NestJS REST API |
| `@shck/web` | `packages/web` | Vue 3 前端 SPA |
