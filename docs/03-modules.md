# 模块详解

## @shck/shared — 共享包

**路径：** `packages/shared/src/index.ts`

| 导出 | 说明 |
| --- | --- |
| `SUBJECTS` / `Subject` | 三科枚举：POLITICS、ENGLISH、MATH |
| `QUESTION_TYPES` / `QuestionType` | 题型：SINGLE、SHORT_ANSWER、BIG_QUESTION |
| `ApiResponse<T>` | 统一 API 响应类型 |
| `TaskTemplate` | 每日任务模板结构 |
| `getPlanTemplates(dayNumber)` | 按天数返回当天 3 科任务模板 |
| `reviewIntervalDays(masteryLevel)` | 错题复习间隔（1/2/4/7 天） |

`phaseTemplates` 按 4 个阶段维护每日任务内容，是 70 天计划生成的唯一数据源。

---

## Auth 模块 — 账户与鉴权

**路径：** `packages/server/src/auth/`

| 文件 | 职责 |
| --- | --- |
| `auth.controller.ts` | 注册、登录、获取当前用户 |
| `auth.service.ts` | bcrypt 密码哈希、JWT 签发 |
| `jwt-auth.guard.ts` | JWT 验证守卫 |
| `current-user.decorator.ts` | 从 JWT payload 提取当前用户 ID |

**核心逻辑：**

- 密码使用 bcrypt（cost=12）哈希存储
- JWT payload 包含 `{ id, username, role }`
- 注册时可指定 `exam_date`，默认 `2026-10-24`

**前端对应：** `stores/useUserStore.ts`、`api/auth.ts`、`views/LoginView.vue`

---

## Tasks 模块 — 70 天计划

**路径：** `packages/server/src/tasks/`

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/tasks/init-plan` | POST | 初始化计划，生成 210 条任务 |
| `/tasks/summary` | GET | 全局进度摘要 |
| `/tasks/day/:dayNumber` | GET | 获取指定天（1–70）的任务 |
| `/tasks/:id/completion` | PATCH | 打卡 / 取消打卡 |

**核心逻辑（TasksService）：**

1. **initPlan** — 以 `exam_date` 倒推 69 天得到 `plan_start_date`，遍历 Day 1–70，每天调用 `getPlanTemplates()` 生成 3 条 `daily_tasks`，写入前先删除该用户旧任务
2. **getSummary** — 计算 `current_day`（基于 plan_start_date 与今天日期差）、完成率、剩余天数
3. **setCompletion** — 更新 `is_completed` 和 `completed_at`

**前端对应：** `stores/useTaskStore.ts`、`views/DashboardView.vue`、`components/task/TaskGroup.vue`

---

## Questions 模块 — 题库检索

**路径：** `packages/server/src/questions/`

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/questions/search` | GET | 按科目/标签/关键词搜索 |
| `/questions/papers` | GET | 试卷列表 |
| `/questions/papers/:id` | GET | 试卷详情（含题目，不含答案） |

**搜索参数：**

- `subject` — 科目筛选
- `tag` — 考点标签模糊匹配
- `keyword` — 题干或标签关键词
- `limit` — 返回条数上限

**前端对应：** `views/QuestionSearchView.vue`、`components/common/KatexRenderer.vue`

KaTeX 组件支持 `$...$` 行内公式和 `$$...$$` 块级公式渲染。

---

## Exams 模块 — 模考

**路径：** `packages/server/src/exams/`

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/exams/:paperId/submit` | POST | 提交答卷 |

**提交参数：**

- `answers` — `{ [questionId]: answer }` 用户答案
- `subjective_score` — 主观题自评分
- `time_spent_secs` — 用时（秒）

**批改逻辑：**

1. 仅 `SINGLE` 题型参与客观题自动批改（答案 trim + 大写比较）
2. `objective_score` = 正确客观题分值之和
3. `total_score` = min(试卷满分, objective_score + subjective_score)
4. 错题自动调用 `MistakesService.upsertMistake` 入队

**前端对应：** `views/MockExamView.vue`、`api/exam.ts`

模考过程中答案缓存在浏览器 localStorage，防止意外刷新丢失。

---

## Mistakes 模块 — 错题复习

**路径：** `packages/server/src/mistakes/`

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/mistakes/review-queue` | GET | 获取到期复习队列 |
| `/mistakes/:id/review` | PATCH | 提交复习结果 |

**掌握度模型（L0–L4）：**

| 等级 | 含义 | 下次复习间隔 |
| --- | --- | --- |
| L0 | 新入队 / 答错 | 立即 |
| L1 | 第 1 次答对 | 1 天 |
| L2 | 第 2 次答对 | 2 天 |
| L3 | 第 3 次答对 | 4 天 |
| L4 | 第 4 次答对 | 7 天（之后视为已掌握） |

**review-queue 筛选条件：** `next_review_at <= now` 且 `mastery_level < 4`

**前端对应：** `views/MistakesView.vue`、`api/mistake.ts`

---

## Web 前端页面

| 路由 | 页面 | 功能 |
| --- | --- | --- |
| `/login` | LoginView | 登录 / 注册 |
| `/` | DashboardView | 倒计时、今日任务、进度、打卡 |
| `/search` | QuestionSearchView | 真题考点检索 |
| `/mock-exam` | MockExamView | 选卷、答题、提交 |
| `/mistakes` | MistakesView | 错题复习队列 |

**布局：** `DefaultLayout.vue` 提供 PC 侧栏导航 + Mobile 底部 Tab 导航，遵循 v4.0 UI 规范（浅/暗色、8pt 间距、Blue 600 品牌色）。

**路由守卫：** 除 `/login` 外所有页面需 JWT；已登录用户访问 `/login` 自动跳转首页。
