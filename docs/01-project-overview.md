> ⚠️ **历史文档**：本文描述旧方向（上海成考通用刷题 MVP），已不再是目标方向。
> 当前方向见 [00-产品方向](./00-product-vision.md)，本文仅作历史参考。

# 项目概览

## 项目定位

**上海成考专升本（计算机类）70 天备考系统**（代号 `shanghai-chengkao-70d`）是一套面向上海市成人高考专升本理工/计算机类的备考工具。以近 7 年真题考点检索与全真套卷模考为核心，结合 70 天倒计时计划、三科每日任务拆解、错题消灭算法与量化追踪，帮助考生系统备考。

当前版本为 **可运行 MVP**，设计规范来源于 `shanghai-chengkao-70d-design-v4.md`。

## 已实现功能

| 模块 | 交付内容 |
| --- | --- |
| 账户与鉴权 | 注册、登录、7 天 JWT、个人考试日期配置 |
| 70 天计划 | 以考试日倒推 69 天，创建 210 条三科任务；按天查看、打卡、全局进度 |
| 真题检索 | 科目、考点标签、题干关键词筛选；KaTeX 行内/块级公式渲染 |
| 模考闭环 | 选卷、倒计时、答案本地缓存、客观题自动批改、主观题自评分、考试记录 |
| 错题复习 | 模考错题自动入队；L0–L4 掌握度、1/2/4/7 天间隔、到期复习队列 |
| 体验界面 | PC 侧栏看板与 Mobile 底部导航、浅/暗色、8pt 间距与 v4.0 色彩语义 |
| 工程与部署 | pnpm workspace、TypeORM migration、种子脚本、Docker、GitHub Actions CI |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 包管理 | pnpm 10 + workspace |
| 语言 | TypeScript 5.8 |
| 前端 | Vue 3.5、Vue Router 4、Pinia 3、Vite 6、Tailwind CSS 3、KaTeX |
| 后端 | NestJS 10、TypeORM 0.3、class-validator |
| 数据库 | MySQL 8（InnoDB、utf8mb4） |
| 鉴权 | JWT（@nestjs/jwt）+ bcryptjs |
| 部署 | Docker Compose + Nginx |
| CI | GitHub Actions（lint + build） |

## 三科科目

系统覆盖三门考试科目，在 `@shck/shared` 中统一定义：

- `POLITICS` — 政治
- `ENGLISH` — 英语
- `MATH` — 高等数学（一）

## 70 天计划四阶段

计划模板按天数分为四个阶段，每天生成 3 条任务（每科 1 条）：

| 阶段 | 天数范围 | 侧重点 |
| --- | --- | --- |
| Phase 1 | Day 1–20 | 基础夯实：高频词、求导公式、根本原因类考点 |
| Phase 2 | Day 21–45 | 强化训练：阅读定位、罗必达法则、新时代思想 |
| Phase 3 | Day 46–60 | 真题冲刺：三科各完成一套真题 |
| Phase 4 | Day 61–70 | 错题清零：复刷错题队列、默写模板与公式 |

阶段模板定义在 `packages/shared/src/index.ts` 的 `phaseTemplates` 中。

## 种子数据说明

种子脚本写入 **2019–2025 年三科共 21 套结构化练习卷** 和 **42 道示例题**，用于验证系统流程。

> 这些内容为演示数据，不应被视作或替代正式真题。正式上线前请在确认版权与准确性后导入真题内容。

体验账号：`demo` / `Study70Days!`

## 仓库目录结构

```
daily-learning/
├── .github/workflows/ci.yml   # CI 流水线
├── docker/                    # Docker 构建与编排
│   ├── docker-compose.yml
│   ├── Dockerfile.server
│   ├── Dockerfile.web
│   └── nginx.conf
├── docs/                      # 项目技术文档（本目录）
├── packages/
│   ├── shared/                # 共享类型与业务常量
│   ├── server/                # NestJS 后端
│   └── web/                   # Vue 3 前端
├── package.json               # 根脚本（dev / build / db:*）
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── shanghai-chengkao-70d-design-v4.md  # 产品设计文档
```
