# 70 天备考计划

**自己用的成人本科（理工类 · 2026）备考工具**：70 天倒计时 + 个性化学习计划 + 每日打卡 + 错题/单词/学习时长闭环。

## 功能

| 模块 | 说明 |
| --- | --- |
| 今日任务 | 70 天倒计时、三科每日任务、打卡、全局与分科进度 |
| 计划配置 | 考试日期、科目增删、按权重重新生成计划 |
| 错题本 | 手动录入 + 错因标注 + L0–L4 间隔复习队列 |
| 单词 | 词库 + 美式发音（TTS）+ 美式音标（可自动获取）+ 分级（高频/核心/拓展）+ 短语 + 每日新词目标与完成估算 |
| 短语 | 独立短语库，与单词可关联，支持分级与筛选 |
| 学习统计 | 今日学习时长、近 7 天柱状图（study_sessions） |
| 手机端 | 底部四栏（首页/任务/检索/我的），按屏幕宽度自动切换；首页倒计时+今日任务+科目直达知识点；每科全部完成才打卡成功；任务页科目 Tab；检索页搜索知识点 |

## 技术栈

- pnpm workspace + TypeScript
- 前端：Vue 3 + Vite + Pinia + Tailwind
- 后端：NestJS + TypeORM + MySQL 8
- 鉴权：JWT + bcryptjs（保留注册/登录）

## 快速开始

```bash
# 1. 环境变量
cp .env.example .env   # 填入本地 MySQL 连接

# 2. 依赖
pnpm install

# 3. 数据库迁移 + 种子（demo 用户 / 三科 / 70 天计划 / 内置 120 词词库）
pnpm db:migrate
pnpm db:seed

# 4. 启动
pnpm dev              # 后端 :3000 + 前端 :5173
```

打开 http://localhost:5173，体验账号：`demo` / `Study70Days!`

> 新用户注册后会自动创建默认三科（政治 / 英语 / 高等数学（一）），内置词库可在「单词」页一键导入。

## 目录结构

```
daily-learning/
├── docs/                    # 文档（00-产品方向 / 07-执行计划 等）
├── docker/                  # Docker 构建与编排
├── packages/
│   ├── shared/              # 共享类型、计划模板、复习间隔算法、分级常量
│   ├── server/              # NestJS 后端（auth/plan/subjects/mistakes/vocabulary/sessions）
│   └── web/                 # Vue 3 前端
└── .github/workflows/ci.yml # CI（lint + build）
```

## 文档

- [00-产品方向](./docs/00-product-vision.md) — 目标与范围
- [07-执行计划](./docs/execution-plan.md) — 阶段化执行状态
