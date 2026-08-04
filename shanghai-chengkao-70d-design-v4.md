将最新的 **UI Style Guide 约束规范 (v4.0)** 全面融入并替换现有文档中的旧视觉章节，进行了**无冲突合并与规范统一**。

以下是合并调整后的最新完整文档：

---

# 🚀 上海成考专升本（计算机类）70天真题针对性备考系统完整设计文档 (V4.0 终极全闭环版)

> **项目目标**：针对上海市成人高考专升本（理工/计算机类），以**近 7 年真题考点针对性检索**与**全真套卷模考**为核心，结合 **70 天紧凑型倒计时**，通过三科每日任务拆解、错题消灭算法与量化追踪，确保总分达到 150+ 分。
> 
> 
> **架构形式**：采用 **pnpm workspace (Monorepo)** 多项目单 Git 仓库管理模式，全栈 TypeScript 驱动。
> 
> 

---

## 1. UI / UX 设计规范说明文档 (Style Guide)

### 1.1 设计核心理念 (Design Principles)

* **轻量透气 (Lightweight & Spacious)：** 降低容器感知，去除重描边，通过充裕的留白、轻微边框与微妙阴影构建清晰的视觉空间层级。
* **清晰聚焦 (Clear Focus)：** 倒计时、学习进度、任务状态等核心指标采用高对比度与现代几何无衬线字体强化展示，次要信息优雅沉底。
* **全端映射 (Cross-Platform Consistency)：** PC 端与 Mobile 端在色彩语义、图标语言、状态组件及交互逻辑上保持 100% 一致性。

### 1.2 色彩系统 (Color Palette)

#### 1.2.1 品牌色与语义色 (Brand & Semantic Colors)

全站采用符合现代化 SaaS 质感的 Tailwind / Radix 色彩板，避免使用高饱和刺眼色彩。

| 角色/语义 | 浅色模式 (Light) | 暗黑模式 (Dark) | 典型应用场景 |
| --- | --- | --- | --- |
| **品牌主色 (Brand/Primary)** | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | 核心 CTA 按钮、高亮 Tab、核心进度条、选中态 Icon |
| **主色悬停 (Hover)** | `#1D4ED8` (Blue 700) | `#60A5FA` (Blue 400) | 按钮 Hover、可点击文本 Hover |
| **浅色激活 (Subtle Active)** | `#EFF6FF` (Blue 50) | `#1E3A8A` (Blue 900/40%) | 侧边栏选中背景、轻量 Badge 背景 |
| **成功/已完成 (Success)** | `#16A34A` (Green 600) | `#22C55E` (Green 500) | “已完成”状态标签、打卡成功图标 |
| **进行中 (Warning/Processing)** | `#D97706` (Amber 600) | `#F59E0B` (Amber 500) | “进行中”状态标签、倒计时提示 |
| **待开始/中性 (Neutral/Muted)** | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | “待开始”状态、次要图标、辅助文本 |

#### 1.2.2 背景与卡片层级 (Background & Surface)

禁用纯黑（`#000000`），采用具深空冷调的灰蓝色系建立暗色空间。

| 层级 (Layer) | 浅色模式 (Light) | 暗黑模式 (Dark) | 作用描述 |
| --- | --- | --- | --- |
| **全局底色 (App Canvas)** | `#F8FAFC` (Slate 50) | `#0F172A` (Slate 900) | 页面最底层背景 |
| **一阶容器 (Surface/Card)** | `#FFFFFF` (White) | `#1E293B` (Slate 800) | 内容卡片、侧边栏、顶部导航栏 |
| **二阶容器 (Elevated/Popover)** | `#FFFFFF` (White) | `#334155` (Slate 700) | 下拉菜单、Cmd+K 搜索弹窗、Tooltip |
| **分割线/边框 (Border)** | `#E2E8F0` (Slate 200) | `#334155` (Slate 700) | 卡片 1px 轻量微边框 |

### 1.3 字体与排版规范 (Typography)

#### 1.3.1 字体栈 (Font Family)

* **无衬线主字体 (Sans-serif)：** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
* **等宽/数字字体 (Monospace/Numbers)：** `Inter, "SF Pro Display", DIN, "JetBrains Mono"` （倒计时大数字、百分比推荐优先使用）

#### 1.3.2 字阶层级 (Type Scale)

| 等级 | 字号 (Font Size) | 行高 (Line Height) | 字重 (Font Weight) | 使用场景 |
| --- | --- | --- | --- | --- |
| **Display (特大)** | `48px / 3rem` | `1.1` | Bold (700) | 核心倒计时天数（如：70 天） |
| **H1 (主标题)** | `24px / 1.5rem` | `1.25` | SemiBold (600) | 页面大标题（如：今日任务、70天学习日历） |
| **H2 (模块标题)** | `18px / 1.125rem` | `1.33` | SemiBold (600) | 学科卡片标题（如：高等数学、政治） |
| **Body (正文/默认)** | `14px / 0.875rem` | `1.5` | Regular (400) / Medium (500) | 列表项、按钮文字、正文 |
| **Caption (辅助)** | `12px / 0.75rem` | `1.5` | Regular (400) | 次要提示、时间戳、状态标注 |

### 1.4 布局、间距与圆角 (Layout, Spacing & Radius)

#### 1.4.1 8pt 网格原则

所有 Padding、Margin、Gap 及组件高度均须遵循 8pt 网格原则（微小元素使用 4px）：

* **微间距 (4px / 8px)：** 图标与文本间距、Badge 内部 Padding。
* **组件内边距 (12px / 16px)：** 按钮、Input 框内边距、列表项间距。
* **卡片内边距 (20px / 24px)：** Dashboard 模块卡片 Padding（由原图的紧密布局放宽至 `24px`）。
* **模块外间距 (24px / 32px)：** 各卡片区域之间的 Gap。

#### 1.4.2 圆角规范 (Border Radius)

| 类型 | 尺寸 | 应用组件 |
| --- | --- | --- |
| **Small (`rounded-md`)** | `6px` | Badge 标签、小按钮、Tag |
| **Medium (`rounded-lg`)** | `8px - 10px` | 标准按钮、Input 框、下拉菜单项 |
| **Large (`rounded-xl`)** | `12px - 16px` | Dashboard 模块卡片、Modal 弹窗 |
| **Full (`rounded-full`)** | `9999px` | 头像、胶囊状状态栏（Capsule） |

#### 1.4.3 投影与悬浮深度 (Shadows & Blur)

* **卡片阴影 (Card Shadow)：** `0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)`（极轻微，依靠 1px 微边框搭配）。
* **浮层阴影 (Popover Shadow / Cmd+K)：** `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`（增强立体悬浮感）。
* **毛玻璃效果 (Backdrop Blur)：** Cmd+K 遮罩层须使用 `backdrop-filter: blur(8px); background: rgba(0, 0, 0, 0.4);`。

### 1.5 组件级细则 (Component Guidelines)

#### 1.5.1 侧边导航栏 (Sidebar)

* **默认态：** 文字色使用 Slate 600（Dark: Slate 400），透明背景。
* **选中态 (Active)：**
* 背景采用 `Brand Blue 50`（Dark: `Blue 900/40%`）。
* 图标与文字统一为 `Brand Blue 600`（Dark: `Blue 400`），字重加粗（Medium 500）。
* 左侧带有 3px 宽度的品牌色圆角指示条（Indicator Bar）。



#### 1.5.2 卡片组件 (Card Component)

* **学科任务卡片（高数 / 政治 / 英语）：**
* 头部 Icon 增加带有 10% 透明度的品牌底色衬底。
* 任务列表取消重背景色，统一使用纯文字 + 状态点（Dot）或轻量 Badge（“已完成”、“进行中”、“待开始”）。



#### 1.5.3 搜索弹窗组件 (Cmd + K Modal)

* **尺寸与对齐：** 宽度固定为 `640px`，顶部距离视口 `15%vh`。
* **搜索框（Search Bar）：** 采用大号无边框 Input（高度 `56px`，字号 `16px`），前置放大镜 Icon。
* **快捷键提示：** 使用键盘样式 Chip（如 `Enter 确认`、`Esc 关闭`，带有微边框和微阴影 `<kbd>` 样式）。

---

## 2. 前端组件层次与基本架构 (Frontend Architecture)

采用**模块化分层 (Layered Architecture)**，配合 Pinia 与 Vue Router 进行组合式开发，确保前端工程易于扩展与维护。

### 2.1 架构分层设计

```text
+-----------------------------------------------------------------------+
|                            @shck/web (Vue 3)                          |
+-----------------------------------------------------------------------+
| [Layer 1: Views / Pages] (路由页面层)                                  |
|  ├── DashboardView (70天主看板)   ├── SearchPointView (真题检索)       |
|  ├── MockExamView (全真套卷模考)  ├── TaskDetailView (每日任务)        |
|  └── MistakeNotebookView (错题本)                                     |
+-----------------------------------------------------------------------+
| [Layer 2: Business Components] (业务组件层)                           |
|  ├── CountdownHeader (倒计时组件) ├── TaskCardGroup (三科任务卡片)      |
|  ├── PointSearchModal (Cmd+K弹框) ├── QuestionDetailDrawer (真题抽屉)  |
|  ├── KatexRenderer (LaTeX公式组件)├── ExamSheet (答题卡与计时器)       |
+-----------------------------------------------------------------------+
| [Layer 3: UI Primitives] (基础UI组件/原子组件)                         |
|  ├── BaseButton, BaseInput, BaseBadge, BaseCard, BaseProgress         |
+-----------------------------------------------------------------------+
| [Layer 4: State & Services] (状态管理与服务层)                         |
|  ├── Stores: useTaskStore, useQuestionStore, useExamStore, useUser    |
|  └── Services: Axios Client (集成 @shck/shared API Response 类型)      |
+-----------------------------------------------------------------------+
```[cite: 4]

### 2.2 前端目录树与文件架构 (`packages/web`)

```text
packages/web/
├── public/
├── src/
│   ├── api/                    # API 请求封装 (使用 Axios)
│   │   ├── client.ts           # 统一 Axios 实例 (含 JWT 拦截器)
│   │   ├── task.ts             # 任务打卡相关接口
│   │   ├── question.ts         # 考点检索相关接口
│   │   └── exam.ts             # 试卷与模考相关接口
│   ├── assets/                 # 全局样式与静态资源
│   │   └── main.css            # Tailwind 引入与 KaTeX 样式加载
│   ├── components/             # 组件库
│   │   ├── common/             # 通用基础 UI 组件 (Badge, Button, Modal, Card, KatexRenderer)
│   │   ├── dashboard/          # 看板专有组件 (Countdown, ProgressRing)
│   │   ├── task/               # 任务卡片与列表组件 (TaskItem, TaskGroup)
│   │   ├── search/             # 检索组件 (CmdKModal, TagFilter)
│   │   └── exam/               # 模考组件 (Timer, AnswerCard, QuestionViewer)
│   ├── layouts/                # 布局组件
│   │   ├── DefaultLayout.vue   # 主布局 (AppHeader + Sidebar + Content)
│   │   └── MobileLayout.vue    # 移动端专用布局 (BottomNavigation)
│   ├── router/                 # Vue Router 路由配置
│   │   └── index.ts
│   ├── stores/                 # Pinia 状态管理
│   │   ├── useTaskStore.ts     # 管理70天打卡进度与任务状态
│   │   ├── useQuestionStore.ts # 管理考点检索与筛选项
│   │   ├── useExamStore.ts     # 管理模考进行状态与答题卡
│   │   └── useUserStore.ts     # 用户登录态与考情配置
│   ├── views/                  # 页面级组件
│   │   ├── Dashboard/          # 首页主看板
│   │   ├── QuestionSearch/     # 考点检索页
│   │   ├── MockExam/           # 全真套卷模考页
│   │   └── Mistakes/           # 错题笔记本与复习队列
│   ├── App.vue
│   └── main.ts
├── index.html
├── package.json                # 包名: @shck/web
├── tailwind.config.js          # Tailwind 拓展与主题配置
├── tsconfig.json
└── vite.config.ts              # Vite 构建配置 (含路径别名 @/ -> src/)
```[cite: 4]

---

## 3. 全套 Monorepo 项目结构与命名规范

为保证团队协作规范及 Monorepo 依赖清晰，统一采用以下命名约定[cite: 4]：

- **Git 仓库根目录**：`shanghai-chengkao-70d`[cite: 4]
- **NPM 包前缀 (Scope)**：`@shck/` (取自 **Shanghai ChengKao**)[cite: 4]
- **子项目包名**[cite: 4]：
  - **前端应用**：`@shck/web`[cite: 4]
  - **后端 API 服务**：`@shck/server`[cite: 4]
  - **共享基础库**：`@shck/shared`[cite: 4]

### 3.1 完整目录树总览

```text
shanghai-chengkao-70d/           # 根仓库目录
├── .github/                     # CI/CD 自动化构建与部署工作流
│   └── workflows/
│       └── deploy.yml
├── .husky/                      # Git Hooks 代码提交规范约束
├── docker/                      # Docker 部署配置文件
│   ├── Dockerfile.server
│   ├── Dockerfile.web
│   └── docker-compose.yml
├── packages/                    # 核心业务包与共享依赖
│   ├── web/                     # 【前端应用】@shck/web (Vue 3 + Vite + Tailwind CSS + KaTeX)
│   ├── server/                  # 【后端服务】@shck/server (NestJS 10 + TypeORM + MySQL)
│   └── shared/                  # 【共享类型/DTO】@shck/shared (TS Types & DTOs & Seed Data)
├── .eslintrc.js                 # 根目录统一 ESLint 配置
├── .gitignore
├── .prettierrc                  # 根目录统一 Prettier 配置
├── package.json                 # 根目录 package.json (全局 Dev/Build 脚本)
├── pnpm-workspace.yaml          # pnpm 工作区定义
├── README.md
└── tsconfig.base.json           # TS 通用基类配置
```[cite: 4]

### 3.2 packages 核心子项目职责说明

1. **`packages/shared` (`@shck/shared`)**[cite: 4]
   - **职责**：定义三科枚举、接口（Interface）、DTO 校验类、70天初始化 Seed 种子数据及 API 统一响应结构[cite: 4]。
   - **编译输出**：使用 `tsup` 秒级构建为 ESM/CJS 库，供 `@shck/web` 与 `@shck/server` 无缝引用[cite: 4]。

2. **`packages/server` (`@shck/server`)**[cite: 4]
   - **职责**：基于 NestJS 搭建 RESTful 服务[cite: 4]。负责 JWT 用户鉴权、70 天每日任务动态生成、近 7 年真题考点全文检索、套卷模考批改与 MySQL 持久化[cite: 4]。

3. **`packages/web` (`@shck/web`)**[cite: 4]
   - **职责**：基于 Vue 3 + Tailwind CSS + KaTeX 构建[cite: 4]。自适应支持 PC 大屏看板（多列并排）、全真模考界面与移动端手机布局（单列卡片、手势打卡）[cite: 4]。

---

## 4. 系统关键配置文件定义

### 4.1 根目录 `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```[cite: 4]

### 4.2 根目录 `package.json`

```json
{
  "name": "shanghai-chengkao-70d",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter @shck/web dev",
    "dev:server": "pnpm --filter @shck/server start:dev",
    "dev:shared": "pnpm --filter @shck/shared dev",
    "dev": "pnpm --parallel --filter \"@shck/*\" dev",
    "build:shared": "pnpm --filter @shck/shared build",
    "build:web": "pnpm --filter @shck/shared build && pnpm --filter @shck/web build",
    "build:server": "pnpm --filter @shck/shared build && pnpm --filter @shck/server build",
    "lint": "pnpm --recursive run lint"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "husky": "^9.0.0",
    "prettier": "^3.2.0",
    "typescript": "^5.3.0"
  }
}
```[cite: 4]

### 4.3 共享包 `packages/shared/package.json`

```json
{
  "name": "@shck/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```[cite: 4]

---

## 5. 近 7 年真题考点针对性检索与备考设计

针对成考“高频考点高度重复”的特点，系统将 2019–2025 年真题拆解为具体的**针对性考点标签（Point Tags）**[cite: 4]：

| 科目 | 针对性检索考点标签 | 出题规律与精准打法 |
| :--- | :--- | :--- |
| **高等数学（一）** | `求导公式` `复合求导` `罗必达法则` `凑微分积分` `牛顿-莱布尼茨公式` `偏导数` | 高数前三章占分超 80%。针对性检索“罗必达法则”和“求导公式”，刷透对应大题即可稳拿 40-50 分基础分[cite: 4]。 |
| **政治** | `根本原因/首要问题` `标志性事件` `新时代思想` `简答题要点` `论述题框架` | 单选重复率极高，检索对应标签直接背诵历年原题考点；大题直接调取“三段式”答题模板[cite: 4]。 |
| **英语** | `高频120词` `阅读-细节定位` `阅读-转折对比` `语法-时态` `通用书信模板` | 针对性练习“阅读细节定位”（直接回原文找答案）；考前强化“通用书信模板”无误默写[cite: 4]。 |

---

## 6. MySQL 数据库 Schema 设计

在 `@shck/server` 中采用 TypeORM 进行映射，表结构与前缀保持统一[cite: 4]：

```sql
-- 1. 用户表 (包含目标考试时间与打卡配置)
CREATE TABLE `sys_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '角色: USER / ADMIN',
  `exam_date` DATE NOT NULL DEFAULT '2026-10-24' COMMENT '目标考试日期',
  `plan_start_date` DATE NULL COMMENT '计划启动日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 全真试卷套卷表
CREATE TABLE `exam_papers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(100) NOT NULL COMMENT '试卷名称，如: 2023年上海成考高数(一)真题',
  `subject` ENUM('POLITICS', 'ENGLISH', 'MATH') NOT NULL COMMENT '科目',
  `year` INT NOT NULL COMMENT '年份 (2019-2025)',
  `total_score` INT NOT NULL DEFAULT 150 COMMENT '总分',
  `time_limit_mins` INT NOT NULL DEFAULT 150 COMMENT '考试时长(分钟)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 近 7 年真题考点库表 (支持单题检索与套卷关联)
CREATE TABLE `exam_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `paper_id` INT NULL COMMENT '所属套卷ID (可为NULL)',
  `sort_order` INT DEFAULT 0 COMMENT '套卷内题目序号',
  `subject` ENUM('POLITICS', 'ENGLISH', 'MATH') NOT NULL COMMENT '科目',
  `year` INT NOT NULL COMMENT '真题年份 (2019-2025)',
  `question_type` VARCHAR(20) NOT NULL COMMENT '题型: SINGLE / SHORT_ANSWER / BIG_QUESTION',
  `point_tag` VARCHAR(50) NOT NULL COMMENT '针对性考点标签 (如: 罗必达法则)',
  `content` TEXT NOT NULL COMMENT '题目内容 (包含 LaTeX 公式语法与图片占位符)',
  `options_json` JSON NULL COMMENT '单选题选项 [{"key":"A","text":"..."},...]',
  `answer` TEXT NOT NULL COMMENT '标准答案及解析',
  `score` INT DEFAULT 5 COMMENT '本题分值',
  INDEX `idx_subject_tag` (`subject`, `point_tag`),
  INDEX `idx_paper_id` (`paper_id`),
  FULLTEXT INDEX `ft_search` (`content`, `point_tag`) COMMENT '支持全文检索'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 70 天每日任务表
CREATE TABLE `daily_tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '关联用户ID',
  `day_number` INT NOT NULL COMMENT '第 1 ~ 70 天',
  `task_date` DATE NOT NULL COMMENT '实际关联日期',
  `subject` ENUM('POLITICS', 'ENGLISH', 'MATH') NOT NULL COMMENT '科目',
  `content` TEXT NOT NULL COMMENT '每日任务描述',
  `target_tag` VARCHAR(50) NULL COMMENT '关联的真题针对性考点标签',
  `is_completed` TINYINT(1) DEFAULT 0 COMMENT '完成状态: 0未完成, 1已完成',
  `completed_at` DATETIME NULL COMMENT '打卡时间',
  FOREIGN KEY (`user_id`) REFERENCES `sys_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 错题与针对性复盘记录表 (支持间隔重复复习算法)
CREATE TABLE `user_mistakes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '关联用户ID',
  `question_id` INT NOT NULL COMMENT '关联真题ID',
  `user_notes` TEXT NULL COMMENT '错题心得/公式笔记',
  `mastery_level` INT DEFAULT 0 COMMENT '掌握度 (0~5)',
  `next_review_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '下一次复习时间',
  `review_count` INT DEFAULT 0 COMMENT '复习总次数',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `sys_users`(`id`),
  FOREIGN KEY (`question_id`) REFERENCES `exam_questions`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 用户模考记录与答题卡表
CREATE TABLE `user_exam_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `paper_id` INT NOT NULL COMMENT '试卷ID',
  `user_answers_json` JSON NOT NULL COMMENT '用户答案键值对 {"101":"A", "102":"..."}',
  `objective_score` INT DEFAULT 0 COMMENT '客观题得分',
  `subjective_score` INT DEFAULT 0 COMMENT '主观题自评分',
  `total_score` INT DEFAULT 0 COMMENT '最终总得分',
  `time_spent_secs` INT NOT NULL COMMENT '耗时(秒)',
  `status` VARCHAR(20) DEFAULT 'COMPLETED' COMMENT '状态: SUBMITTED / COMPLETED',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `sys_users`(`id`),
  FOREIGN KEY (`paper_id`) REFERENCES `exam_papers`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```[cite: 4]

---

## 7. NestJS 后端核心 API 规格设计

### 7.1 真题考点针对性检索 API

- **HTTP Method**: `GET`[cite: 4]
- **Path**: `/api/v1/questions/search`[cite: 4]
- **Query Params**: `subject=MATH&tag=罗必达法则&keyword=极限`[cite: 4]
- **Response Body**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "list": [
      {
        "id": 1024,
        "subject": "MATH",
        "year": 2023,
        "point_tag": "罗必达法则",
        "content": "求极限 $\\lim_{x \\to 0} \\frac{\\sin x - x}{x^3}$",
        "answer": "连续使用二次罗必达法则，解得 $-\\frac{1}{6}$"
      }
    ]
  }
}
```[cite: 4]

### 7.2 获取指定天数的打卡任务与考前计划初始化 API

- **HTTP Method**: `POST`[cite: 4]
- **Path**: `/api/v1/tasks/init-plan`[cite: 4]
- **Request Body**: `{"exam_date": "2026-10-24"}`[cite: 4]
- **Response Body**:

```json
{
  "code": 200,
  "message": "70天针对性备考计划生成成功！",
  "data": {
    "plan_start_date": "2026-08-15",
    "exam_date": "2026-10-24",
    "total_tasks_created": 210
  }
}
```[cite: 4]

- **HTTP Method**: `GET`[cite: 4]
- **Path**: `/api/v1/tasks/day/:dayNumber`[cite: 4]
- **Response Body**:

```json
{
  "code": 200,
  "data": {
    "day_number": 15,
    "task_date": "2026-08-29",
    "tasks": [
      {
        "id": 101,
        "subject": "POLITICS",
        "content": "刷真题单选题 25 道，重点复习【根本原因/标志】类考点",
        "target_tag": "根本原因/标志性事件",
        "is_completed": true
      },
      {
        "id": 102,
        "subject": "ENGLISH",
        "content": "高频 120 词 Day 5（12 词）+ 阅读逆向定位打卡",
        "target_tag": "高频120词",
        "is_completed": false
      },
      {
        "id": 103,
        "subject": "MATH",
        "content": "练习 5 道复合函数求导大题，掌握链式法则",
        "target_tag": "复合求导",
        "is_completed": false
      }
    ]
  }
}
```[cite: 4]

### 7.3 全真套卷模考提交与自动批改 API

- **HTTP Method**: `POST`[cite: 4]
- **Path**: `/api/v1/exams/:paperId/submit`[cite: 4]
- **Request Body**:

```json
{
  "time_spent_secs": 5400,
  "answers": {
    "1001": "A",
    "1002": "C",
    "1003": "连续二次使用罗必达法则..."
  }
}
```[cite: 4]

- **Response Body**:

```json
{
  "code": 200,
  "data": {
    "record_id": 88,
    "objective_score": 75,
    "total_questions": 30,
    "correct_count": 15,
    "wrong_question_ids": [1002, 1005],
    "message": "客观题已自动批改，错题已自动推送到错题消灭队列！"
  }
}
```[cite: 4]

---

## 8. 前端 UI 与 PC / 移动端自适应布局原型

根据全新的 **Style Guide v4.0** 约束规范（去边框、卡片内边距放宽至 24px、毛玻璃与轻微阴影），全站界面映射如下：

```text
+-------------------------------------------------------------------+
| [PC 端看板] - 轻量极简 SaaS 布局                                    |
| Header: [倒计时 55 天]  [ Cmd+K 考点搜索 ]  [全真模考]      [用户]  |
|                                                                   |
|  +-------------------+ +-------------------+ +------------------+ |
|  | 政治 (POLITICS)   | | 英语 (ENGLISH)    | | 高数一 (MATH)    | |
|  | [x] 刷题25道      | | [x] 120词 Day 5   | | [ ] 罗必达法则大题| |
|  |     [Tag:根本原因]| |     [Tag:高频词]  | |     [Tag:罗必达]   | |
|  +-------------------+ +-------------------+ +------------------+ |
+-------------------------------------------------------------------+

+-----------------------------------+
|  [移动端] - 垂直卡片 + 底部 Tab   |
|  Day 15 / 70             [85%]    |
|  -------------------------------  |
|  (POLITICS) 刷题25道          [v] |
|  (ENGLISH)  120词 Day 5       [v] |
|  (MATH)     罗必达法则大题    [ ] |
|  -------------------------------  |
|  [ 今日打卡 ] [ 考点检索 ] [ 错题 ] |
+-----------------------------------+

```

---

## 9. 70 天针对性真题拆解路线图

```text
[D01 - D20] 基础与高频突破 ──> [D21 - D45] 核心大题与技巧攻坚 ──> [D46 - D60] 近7年真题全真模考 ──> [D61 - D70] 错题针对性重刷与冲刺
```[cite: 4]

### 阶段一：基础与高频考点突破（第 1 – 20 天）
- **高等数学（一）**：检索 `求导公式`，熟记 12 个基本求导公式，每天练习 5 道基础求导题[cite: 4]。
- **英语**：检索 `高频120词`，每天记忆 12 词（10 天一轮，前 20 天完成两轮强化）[cite: 4]。
- **政治**：检索 `根本原因/标志性事件`，每天刷 25 道真题单选，背诵定性结论[cite: 4]。

### 阶段二：真题核心大题与定位技巧（第 21 – 45 天）
- **高等数学（一）**：重点检索 `罗必达法则` 与 `凑微分积分`，攻克解答题前两道送分大题[cite: 4]。
- **英语**：检索 `阅读-细节定位`，练习“先看题干、回原文找原句”法，每天 2 篇真题阅读[cite: 4]。
- **政治**：检索 `新时代思想`，背诵简答题条目与论述题“三段式”框架[cite: 4]。

### 阶段三：近 7 年成考真题模考（第 46 – 60 天）
- 按套卷做 2019–2025 年上海/全国成考真题，利用系统检索功能对所有错题进行考点归类与二次重做[cite: 4]。
- 英语开始无误默写通用书信作文模板[cite: 4]。

### 阶段四：错题针对性清理与冲刺（第 61 – 70 天）
- 调取 `user_mistakes` 表中掌握度较低的针对性考点，集中清理高数与政治错题[cite: 4]。
- 重新默写高数公式表与英语作文模板，保持考前手感[cite: 4]。

---

## 10. 缺失计划补齐与系统闭环设计 (V4.0 核心新增)

针对系统架构落地、业务逻辑完整性与生产运维，补齐以下五大核心模块[cite: 4]：

### 10.1 70 天每日任务动态生成与 Seed 种子机制

为解决新用户注册或调整考试日期时任务数据分配问题，系统采用静态模版数据结合动态日期倒推机制[cite: 4]：

1. **Seed 模版定义**：在 `@shck/shared` 中内置 `standard_70d_plan.json`，其中包含 Day 1 至 Day 70 三科的标准任务模板、目标 Tag 及建议权重[cite: 4]。
2. **初始化逻辑 (`TaskService.initUserPlan`)**[cite: 4]：
   - 用户设置目标考试时间 $T_{exam}$（如 2026-10-24）[cite: 4]。
   - 系统以 $T_{exam} - 69\text{天}$ 计算倒推计划启动日 $T_{start}$[cite: 4]。
   - 批量向 `daily_tasks` 插入 210 条记录（70 天 $\times$ 3 科），将每条任务绑定具体的 `task_date`[cite: 4]。

### 10.2 错题消灭算法与复习队列调度机制

系统采用基于**简化版艾宾浩斯记忆遗忘曲线**与**莱特纳卡片箱 (Leitner System)** 的错题消灭算法[cite: 4]：

```text
[新错题/模考错题] ──> 掌握度 L0 (下次复习: +1天)
     │
     ├── 答对 ──> 掌握度 L1 (下次复习: +2天) ──> 答对 ──> L2 (+4天) ──> L3 (+7天) ──> L5 (已消灭)
     └── 答错 ──> 掌握度重置为 L0 (下次复习: 当天)
```[cite: 4]

- **掌握度规则**[cite: 4]：
  - `mastery_level = 0`：初始录入/再次答错，下一次复习时间 `next_review_at = NOW() + 1天`[cite: 4]。
  - `mastery_level = 1`：复习答对，`next_review_at = NOW() + 2天`[cite: 4]。
  - `mastery_level = 2`：复习答对，`next_review_at = NOW() + 4天`[cite: 4]。
  - `mastery_level = 3`：复习答对，`next_review_at = NOW() + 7天`[cite: 4]。
  - `mastery_level >= 4`：认定为“高数/政治考点已彻底掌握”，标记为已消灭，不再推送[cite: 4]。
- **每日动态复习推送**：`GET /api/v1/mistakes/review-queue` 实时拉取 `next_review_at <= NOW()` 且 `mastery_level < 4` 的错题[cite: 4]。

### 10.3 数学公式 (LaTeX) 与静态资源/渲染选型

针对高等数学中的微积分、极限公式以及题目图表，前端与后端采用如下渲染选型[cite: 4]：

1. **LaTeX 数学公式渲染**[cite: 4]：
   - 前端集成轻量级高性能渲染库 **KaTeX** (`katex` + `katex/dist/katex.min.css`)[cite: 4]。
   - 封装自定义组件 `<KatexRenderer :content="question.content"/>`[cite: 4]。
   - 组件通过正则匹配 `$ ... $` (行内公式) 与 `$$ ... $$` (块级公式)，实现毫秒级 DOM 节点渲染，无需渲染外部图片[cite: 4]。
2. **题目图片与静态资源托管**[cite: 4]：
   - 后端 `@shck/server` 集成 AWS S3 / 阿里云 OSS SDK[cite: 4]。
   - 图片上传后转换为 CDN 绝对路径 URL（如 `[https://cdn.shck.exam/questions/2023-math-q12.png](https://cdn.shck.exam/questions/2023-math-q12.png)`），插入到 `exam_questions.content` Markdown 语法中[cite: 4]。

### 10.4 全真套卷模考交互与自动批改闭环

1. **界面交互**：进入 `/mock-exam/:paperId` 后，页面进入全屏沉浸模式，右上角显示倒计时器[cite: 4]。
2. **自动保存**：用户答题时， Pinia 本地缓存 `user_answers`，防误刷与掉线[cite: 4]。
3. **提交与自动批改**[cite: 4]：
   - 用户提交后，后端自动对比单选题选项，计算 `objective_score`[cite: 4]。
   - 后端将回答错误的题目自动调用 `MistakeService.upsertMistake` 写入错题库，并将掌握度归零[cite: 4]。
   - 主观题/大题显示标准答案与评分细则，提供“自评分”滑动条，由用户手动确认最终得分[cite: 4]。

### 10.5 部署与运维 (DevOps) 落地计划

基于 Docker 与 GitHub Actions 实现 Monorepo 自动化构建与持续集成[cite: 4]：

1. **Docker 容器化多阶段构建 (`Dockerfile.server`)**[cite: 4]：
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   RUN corepack enable && corepack prepare pnpm@latest --activate
   COPY . .
   RUN pnpm install --frozen-lockfile
   RUN pnpm build:shared && pnpm build:server

   FROM node:20-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/packages/server/dist ./dist
   COPY --from=builder /app/packages/server/package.json ./
   COPY --from=builder /app/node_modules ./node_modules
   EXPOSE 3000
   CMD ["node", "dist/main.js"]
   ```[cite: 4]

2. **CI/CD 工作流 (`.github/workflows/deploy.yml`)**[cite: 4]：
   - **Trigger**：当 `main` 分支有 `git push` 时触发[cite: 4]。
   - **Step 1**：代码 Lint 与 TypeScript 类型检查 (`pnpm lint` & `pnpm tsc`)[cite: 4]。
   - **Step 2**：构建前端静态产物，自动化部署至 Nginx / Vercel CDN[cite: 4]。
   - **Step 3**：构建后端 Docker 镜像并推送至 Docker Registry，通过 SSH 触发服务器 `docker-compose up -d --build` 完成无缝滚动更新[cite: 4]。
   - **Step 4 (Database Migration)**：部署后自动执行 `pnpm typeorm migration:run` 完成数据库结构同步[cite: 4]。

```