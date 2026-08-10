# Study Server 项目索引

`@shck/server` 是 Study 的 NestJS REST API，负责账户、正式学习计划、知识库、真题、错题、词汇、作文和学习记录。所有接口统一使用 `/api/v1` 前缀。

## 快速定位

| 位置 | 职责 |
| --- | --- |
| `src/main.ts` | 应用启动、CORS、全局参数校验、API 前缀 |
| `src/app.module.ts` | 根模块和业务模块装配 |
| `src/common/api-response.ts` | 统一 API 响应结构 |
| `src/entities/` | TypeORM 实体，是当前数据模型入口 |
| `src/database/data-source.ts` | MySQL 与迁移配置 |
| `src/database/migrations/` | 数据库结构演进 |
| `src/database/seed.ts` | 内置账户、科目、知识、词汇、真题和正式计划同步 |

## 业务模块

| 模块目录 | API 前缀 | 职责 |
| --- | --- | --- |
| `auth/` | `/auth` | 注册、登录、JWT、当前用户 |
| `subjects/` | `/subjects` | 政治、英语、高等数学（一）科目管理 |
| `plan/` | `/plan` | 正式计划生成、日期查询、任务完成状态 |
| `knowledge/` | `/knowledge` | 三科知识库、筛选、检索与管理 |
| `papers/` | `/papers` | 真题、题目、答案、来源和完整度 |
| `mistakes/` | `/mistakes` | 错题管理、到期队列、L0–L4 复习 |
| `vocabulary/` | `/vocabulary` | 词库、短语、扩展信息与复习进度 |
| `essays/` | `/essays` | 作文模板与个人作文 |
| `sessions/` | `/sessions` | 学习时长记录和汇总 |

每个业务模块遵循相同结构：

```text
*.controller.ts  HTTP 路由与鉴权入口
*.dto.ts         请求参数与 class-validator 规则
*.service.ts     业务逻辑与数据库访问
*.module.ts      NestJS 依赖装配
```

## 数据与内置内容

| 文件 | 内容 |
| --- | --- |
| `database/builtin-knowledge.ts` | 当前三科正式知识库入口 |
| `database/builtin-knowledge-2026.ts` | 2026 补充知识内容 |
| `database/builtin-vocabulary.ts` | 内置英语词库 |
| `database/builtin-essay-templates.ts` | 英语作文模板 |
| `database/builtin-verified-papers.ts` | 有明确来源并完成核验的真题 |
| `database/sync-verified-papers.ts` | 真题幂等同步与现有题库审计 |

真题的题量完整度与来源可信度是两个独立字段，不能因为题量完整就标记为已核验。Seed 不得生成冒充真题的示例题。

## 核心数据表

- 用户：`sys_users`、`user_settings`
- 学习：`subjects`、`study_plans`、`study_sessions`
- 内容：`knowledge_items`
- 真题：`exam_papers`、`exam_questions`
- 复习：`mistakes`
- 词汇：`vocabulary_decks`、`vocabulary_words`、`vocabulary_phrases`、`vocabulary_progress`
- 作文：`essay_templates`、`my_essays`

生产和本地均保持 TypeORM `synchronize: false`。任何字段或索引变化都必须新增迁移，不能依赖实体自动同步。

## 常用命令

在仓库根目录执行：

```bash
pnpm dev:server
pnpm --filter @shck/server lint
pnpm --filter @shck/server build
pnpm db:migrate
pnpm db:seed
pnpm db:papers:sync
```

编译后启动：

```bash
pnpm --filter @shck/server start
```

## 环境变量

后台读取根目录 `.env`：

```text
PORT
FRONTEND_ORIGIN
JWT_SECRET
DB_HOST
DB_PORT
DB_USERNAME
DB_PASSWORD
DB_DATABASE
```

本地默认端口为 `3000`，健康的 API 地址应以 `http://localhost:3000/api/v1` 开头。

## 修改指引

- 新增接口：先补 DTO，再实现 Service，最后开放 Controller 路由。
- 新增业务域：创建独立模块并在 `app.module.ts` 注册。
- 修改计划内容：优先修改 `@shck/shared` 中的正式计划，不在 Server 复制一份逻辑。
- 修改数据库：新增迁移并同时更新实体。
- 修改内置数据：保证 Seed 可重复执行，不能覆盖用户自行录入的数据。
- 提交前执行类型检查和生产构建。

全局产品与架构说明见 [项目文档](../../docs/README.md)。
