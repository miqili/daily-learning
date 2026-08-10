# Study Web 项目索引

`@shck/web` 是 Study 的 Vue 3 单页应用，同时维护桌面端与移动端体验。当前正式 UI 只存在于 Vue 组件与 `src/assets/main.css`，不维护平行 HTML 原型。

## 快速定位

| 位置 | 职责 |
| --- | --- |
| `index.html` | Vite 运行入口与浏览器标题 |
| `src/main.ts` | Vue、Pinia、Router、Vant 和全局样式装配 |
| `src/App.vue` | 应用根组件 |
| `src/router/index.ts` | 桌面端/移动端路由、鉴权和 UI 模式切换 |
| `src/assets/main.css` | 当前全局设计变量、通用组件和响应式样式 |
| `src/layouts/` | 桌面侧栏布局与移动底部导航 |
| `src/views/` | 桌面页面与共享任务执行页 |
| `src/views/mobile/` | 移动端定制页面 |

## 页面路由

桌面端：

| 路由 | 页面文件 |
| --- | --- |
| `/login` | `views/LoginView.vue` |
| `/` | `views/DashboardView.vue` |
| `/task/:taskId` | `views/TaskExecutionView.vue` |
| `/mistakes` | `views/MistakesView.vue` |
| `/vocabulary` | `views/VocabularyView.vue` |
| `/phrases` | `views/PhrasesView.vue` |
| `/essays` | `views/EssaysView.vue` |
| `/plan` | `views/PlanSettingsView.vue` |

移动端：

| 路由 | 页面文件 |
| --- | --- |
| `/m/tasks` | `views/mobile/MobileTasksView.vue` |
| `/m/task/:taskId` | 共享 `TaskExecutionView.vue` |
| `/m/search` | `views/mobile/MobileSearchView.vue` |
| `/m/me` | `views/mobile/MobileMeView.vue` |
| `/m/subject/:subjectId` | `views/mobile/MobileSubjectView.vue` |
| `/m/vocabulary` | `views/mobile/MobileVocabularyView.vue` |
| `/m/phrases` | `views/mobile/MobilePhrasesView.vue` |
| `/m/essays` | `views/mobile/MobileEssaysView.vue` |
| `/m/papers` | `views/mobile/MobilePapersView.vue` |

路由通过 `meta.navKey` 控制唯一菜单选中状态。判断移动端路径时必须使用 `/m` 或 `/m/` 边界，不能使用会误匹配 `/mistakes` 的裸 `startsWith('/m')`。

## 前端分层

### API

`src/api/` 与后台业务域一一对应：账户、计划、知识、真题、错题、词汇、作文和学习记录。`client.ts` 负责 Axios 实例、JWT 请求头与统一响应解包。

新增接口时，先在对应 API 文件声明输入和响应类型，再由页面或 Store 调用；页面中不要直接创建第二个 Axios 实例。

### 状态

| Store | 职责 |
| --- | --- |
| `useUserStore.ts` | 登录态和当前用户 |
| `usePlanStore.ts` | 计划汇总、日期任务和完成状态 |
| `useStudyScheduleStore.ts` | 工作日/周末容量、延期任务和前端排程设置 |

### 组件与工具

| 目录 | 职责 |
| --- | --- |
| `components/common/` | 通用渲染组件，例如 KaTeX |
| `components/plan/` | 计划任务组件 |
| `components/mobile/` | 移动端公共组件 |
| `utils/markdown.ts` | Markdown 与数学公式渲染 |
| `utils/studySchedule.ts` | 时间容量和任务时长计算 |
| `utils/taskDestination.ts` | 时间轴任务到学习资源的路由映射 |
| `utils/isMobile.ts` | 视口模式判断 |
| `utils/speech.ts` | 英语发音 |

## UI 维护规则

1. `src/assets/main.css` 是唯一全局视觉基线。
2. 页面专属样式优先放在对应 Vue 文件的 scoped style 中。
3. 桌面和移动端信息架构不同的页面分别实现，不强行用一套布局缩放。
4. 不新增 `design-demos` 或独立 HTML UI 稿；设计确认后直接落到正式组件。
5. 菜单选中状态使用路由 `meta.navKey`，确保同时只有一个主菜单高亮。
6. 真题页面必须展示来源类型与完整度，不能用“真题”标题隐藏可信度差异。

## 常用命令

在仓库根目录执行：

```bash
pnpm dev:web
pnpm --filter @shck/web lint
pnpm --filter @shck/web build
pnpm --filter @shck/web preview
```

本地开发地址为 `http://localhost:5173`。Vite 将 `/api` 代理到 `http://127.0.0.1:3000`；可通过 `VITE_PROXY_TARGET` 覆盖。生产环境可通过 `VITE_API_BASE_URL` 指定 API 基础地址。

## 修改指引

- 新增桌面页面：添加 `views/*View.vue`，在 Router 注册并设置 `navKey`。
- 新增移动页面：添加 `views/mobile/*View.vue`，路由放在 `/m` 下并归属正确的主导航。
- 新增跨页面状态：使用 Pinia Store；纯计算逻辑放入 `utils/` 或 `@shck/shared`。
- 修改 API：同步更新 TypeScript 接口，保持蛇形字段与后台响应一致。
- 修改任务跳转：检查桌面和移动端两个目标路径。
- 提交前至少运行 Web 类型检查和生产构建。

全局产品与架构说明见 [项目文档](../../docs/README.md)，后台索引见 [Server 项目索引](../server/README.md)。
