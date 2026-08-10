# Study 项目文档

本文是当前项目的唯一详细说明。代码行为优先于文档；功能或架构发生变化时，直接更新本文，不再新增平行版本的设计文档。

## 1. 产品范围

Study 是个人使用的 2026 成人本科备考系统，科目为政治、英语、高等数学（一）。正式学习周期为 2026-08-10 至 2026-10-16，2026-10-17 考试。

时间容量默认值：

| 日期类型 | 可用时间 | 安排原则 |
| --- | ---: | --- |
| 周一至周五 | 90 分钟/天 | 单词、知识点、错题等轻量任务 |
| 周六 | 360 分钟 | 长章节、专项练习、真题 |
| 周日 | 360 分钟 | 长章节、真题、周复盘 |

学习计划分为大纲通关、专项强化、真题实战、考前收口四个阶段。计划的唯一生成逻辑位于 `packages/shared/src/formal-study-plan.ts`。

## 2. 当前功能

| 模块 | 当前实现 |
| --- | --- |
| 学习计划 | 周容量、每日时间轴、任务详情、完成打卡、延期处理 |
| 知识库 | 三科大纲知识点、Markdown 与 KaTeX、科目直达与检索 |
| 真题 | 试卷与题目管理、答案展开、来源类型、原始链接、完整度审计 |
| 错题 | 手动录入、错因分类、L0–L4 掌握度、到期复习队列 |
| 词汇与短语 | 内置词库、分级、音标、词根、近反义词、搭配、复习进度 |
| 作文 | 作文模板与个人作文管理 |
| 学习记录 | 今日学习时长与阶段统计 |
| 账户 | 注册、登录、JWT 鉴权 |

## 3. 技术架构

```text
Vue 3 SPA
   │  REST /api/v1 + JWT
NestJS API
   │  TypeORM
MySQL
```

Monorepo 包职责：

| 包 | 职责 |
| --- | --- |
| `@shck/shared` | 正式学习计划、共享类型、常量 |
| `@shck/server` | NestJS API、TypeORM 实体与迁移、内置数据同步 |
| `@shck/web` | Vue 3 桌面端与移动端单页应用 |

后台使用 NestJS 10、TypeORM、MySQL、JWT、bcryptjs 和 class-validator。前端使用 Vue 3、Vue Router、Pinia、Vant、Axios、KaTeX 与 Vite。

## 4. Web 路由与 UI

桌面端：

| 路由 | 页面 |
| --- | --- |
| `/` | 周计划总览 |
| `/task/:taskId` | 任务执行页 |
| `/mistakes` | 错题本 |
| `/vocabulary` | 单词 |
| `/phrases` | 短语 |
| `/essays` | 作文 |
| `/plan` | 可用时间设置 |

移动端统一位于 `/m/*`，主导航为任务、检索、我的；词汇、短语、作文、真题和科目页均属于“我的”功能域。

当前 UI 的唯一实现来源是：

- `packages/web/src/assets/main.css`
- `packages/web/src/layouts/`
- `packages/web/src/views/`
- `packages/web/src/components/`

`packages/web/index.html` 仅是 Vite 运行入口，不是 UI 原型。项目不再保存独立 HTML 设计稿；后续视觉调整直接修改 Vue 组件和正式样式。

## 5. API 模块

所有接口统一使用 `/api/v1` 前缀。

| 前缀 | 职责 |
| --- | --- |
| `/auth` | 注册、登录、当前用户 |
| `/subjects` | 科目管理 |
| `/plan` | 计划生成、汇总、日期与任务完成状态 |
| `/knowledge` | 知识库增删改查与检索 |
| `/papers` | 试卷、题目、答案与来源信息 |
| `/mistakes` | 错题、复习队列与掌握度 |
| `/vocabulary` | 词库、短语、设置与复习进度 |
| `/essays` | 作文模板与个人作文 |
| `/sessions` | 学习时长记录与汇总 |

具体请求字段以各模块的 `*.controller.ts` 与 `*.dto.ts` 为准，避免维护容易失真的手写接口副本。

## 6. 数据模型

当前核心表：

- `sys_users`、`user_settings`
- `subjects`、`study_plans`、`study_sessions`
- `knowledge_items`
- `exam_papers`、`exam_questions`
- `mistakes`
- `vocabulary_decks`、`vocabulary_words`、`vocabulary_phrases`、`vocabulary_progress`
- `essay_templates`、`my_essays`

数据库结构只通过 `packages/server/src/database/migrations/` 演进，生产环境保持 `synchronize: false`。

## 7. 真题真实性规则

试卷来源类型包括官方原卷、多源核验回忆版、单源回忆版、用户录入、模拟题和来源待核验。界面必须同时显示题量完整度与来源可信度，这两个概念不能混用。

当前同步后的题库为 8 套、373 题：2023 英语为 61 题、150 分的多源核验回忆版；2025 英语为 53/61 题；2024 高数（一）为 9/18 题；现有政治卷题量完整但原始来源链接仍待回溯。

`pnpm db:papers:sync` 只同步 `builtin-verified-papers.ts` 中有来源并完成核验的内容。Seed 不得生成冒充真题的示例题。

## 8. 开发与部署

环境变量见根目录 `.env.example`：

- `PORT`、`FRONTEND_ORIGIN`、`JWT_SECRET`
- `DB_HOST`、`DB_PORT`、`DB_USERNAME`、`DB_PASSWORD`、`DB_DATABASE`

常用命令：

```bash
pnpm dev                 # 同时启动 Web 与 API
pnpm dev:web             # 仅启动 Web
pnpm dev:server          # 仅启动 API
pnpm lint                # 全仓类型检查
pnpm build               # 生产构建
pnpm db:migrate          # 执行数据库迁移
pnpm db:seed             # 同步内置内容与正式计划
pnpm db:papers:sync      # 同步已核验真题
docker compose -f docker/docker-compose.yml up --build
```

本地端口：Web `5173`、API `3000`；Docker Web 入口为 `8080`。

## 9. 维护约定

1. 产品与技术说明只维护本文件和根目录 `README.md`。
2. 不新增独立 HTML UI 原型；当前界面以正式 Vue 代码为准。
3. 新增数据库字段必须提供迁移。
4. 真题没有可追溯来源时不得标记为已核验。
5. 修改正式计划时同步检查工作日/周末容量和 2026-10-16 截止日期。
6. 提交前至少执行 `pnpm lint` 与受影响包的生产构建。

## 10. 已知待补项

- 回溯现有政治卷的原始来源链接并逐题核验。
- 补齐 2025 英语缺失的阅读 Q48–55。
- 对 2024 高数（一）原图进行 OCR 后逐题验算，补齐 18 题、150 分。
- 2024 英语不同公开版本答案存在冲突，核验完成前不导入。
