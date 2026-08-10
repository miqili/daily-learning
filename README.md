# Study

面向 2026 年成人本科考试的个人学习系统。当前正式计划从 2026-08-10 学习到 2026-10-16，考试日为 2026-10-17；工作日安排轻量任务，周六、周日安排深度学习与真题。

## 当前能力

- 68 天学习时间轴与每日任务直达
- 政治、英语、高等数学（一）知识库
- 真题题库、来源核验与完整度标记
- 错题复习、词汇与短语、英语作文
- 学习时长记录和完成进度
- 独立适配的桌面端与移动端界面

## 技术栈

- Web：Vue 3、Vue Router、Pinia、Vant、KaTeX、Vite
- API：NestJS、TypeORM、MySQL、JWT
- 工程：TypeScript、pnpm workspace、Docker Compose

## 本地启动

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web：http://localhost:5173
- API：http://localhost:3000/api/v1
- 体验账号：`demo` / `Study70Days!`

常用检查：

```bash
pnpm lint
pnpm build
pnpm db:papers:sync
```

## 项目结构

```text
packages/shared  前后端共享类型与正式学习计划
packages/server  NestJS REST API、迁移与内置数据（README.md）
packages/web     当前唯一 Web UI（Vue 单页应用，README.md）
docker           容器构建与 Nginx 配置
docs/README.md   当前项目完整说明
```

详细架构、模块、数据与维护约定见 [项目文档](./docs/README.md)。开发入口分别见 [Server 项目索引](./packages/server/README.md) 和 [Web 项目索引](./packages/web/README.md)。
