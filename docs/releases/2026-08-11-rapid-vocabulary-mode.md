# 2026-08-11 版本发布说明：零基础快速词汇模式

## 1. 发布摘要

| 项目 | 内容 |
| --- | --- |
| 发布标识 | `2026-08-11-rapid-vocabulary-mode` |
| 发布状态 | 待生产部署 |
| 依赖版本 | `2026-08-11-stable-vocabulary-queue` |
| 影响范围 | API、移动端 Web、MySQL |
| 后台管理端 | 不修改 |
| 必须执行 Migration | 是，共 2 个且必须按顺序执行 |
| 需要执行 Seed | 否，禁止执行 |

本版本面向有效词汇量约 50–100 的用户，将新词学习从连续点击“不认识”改为：

```text
首次学习 → 即时检测 → 答错延迟复现 → 到期复习
```

默认每天分配 20 个新词，到期复习独立计算，不挤占新词名额。

## 2. 用户可见变更

- 移动端词汇页使用全新的专业成人教育视觉，不修改桌面后台。
- 点击“背单词”直接进入当前学习卡，不先展示规则或分组说明。
- 退出学习后显示精简进度：新词、复习的完成数和剩余数。
- 新词第一次出现只要求学习，不再询问“认识/不认识”。
- 每 5 个词组成一组，完成首次学习后进入三选一即时检测。
- 到期复习也使用三选一，不再要求先“查看释义”再自评认识程度。
- 第一次答错的词至少经过 4 张其他卡片后再出现。
- 第二次仍答错不会无限循环，系统结束当天任务并安排次日重点复习。
- 今日词单、顺序、卡片阶段和完成进度保存在服务端，退出、刷新和换设备均可续学。
- 可靠词条展示构词或词族；其余词使用已有短语或例句，不生成未经审核的词根。

## 3. 数据库变更

生产数据库必须依次执行：

```text
StableVocabularyQueue1786406400000
RapidVocabularyMode1786407000000
```

对应文件：

```text
packages/server/src/database/migrations/2026081109-stable-vocabulary-queue.ts
packages/server/src/database/migrations/2026081110-rapid-vocabulary-mode.ts
```

第二个 Migration 在 `vocabulary_progress` 新增：

| 字段/索引 | 用途 |
| --- | --- |
| `learning_stage` | `INTRO/CHECK/RETRY/TODAY_DONE/REVIEW` |
| `same_day_attempts` | 当天检测次数 |
| `same_day_correct_count` | 当天答对次数 |
| `last_grade` | 最近结果 `AGAIN/GOOD` |
| `stable_review_count` | 连续稳定识别次数 |
| `idx_vocabulary_learning_flow` | 加速读取用户当天学习阶段 |

Migration 会把现有到期卡映射为 `REVIEW`、已完成的新词映射为 `TODAY_DONE`、未完成的新词映射为 `INTRO`，不删除词库、掌握度或历史复习数据。

## 4. API 变更

保留原接口：

```text
GET   /api/v1/vocabulary/today
PATCH /api/v1/vocabulary/progress/:id/review
```

新增接口：

```text
PATCH /api/v1/vocabulary/progress/:id/introduce
PATCH /api/v1/vocabulary/progress/:id/answer
```

`GET /vocabulary/today` 新增快速模式统计、分组、学习阶段和结构化记忆信息。原有核心字段保留，桌面词汇页和旧客户端可继续使用。

## 5. 部署前检查

在开发电脑执行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

确认生产数据库已有可恢复备份，并确认发布包包含两个 Migration。不要执行 `pnpm db:seed`。

## 6. 生产部署步骤

### 6.1 拉取并检查代码

```bash
cd /opt/daily-learning
git pull origin master
git status --short
```

服务器工作区必须干净；有未提交修改时停止部署。

### 6.2 构建新 API 镜像，但先不要启动

```bash
docker compose --env-file .env -f docker/docker-compose.yml build api
```

### 6.3 使用新 API 镜像执行全部待运行 Migration

```bash
docker compose --env-file .env -f docker/docker-compose.yml run --rm api node -e "
const { AppDataSource } = require('./packages/server/dist/database/data-source.js');
(async () => {
  await AppDataSource.initialize();
  const migrations = await AppDataSource.runMigrations();
  console.log('Executed migrations:', migrations.map(item => item.name));
  await AppDataSource.destroy();
})().catch(error => { console.error(error); process.exit(1); });
"
```

首次部署这批改动时，输出应按顺序包含：

```text
StableVocabularyQueue1786406400000
RapidVocabularyMode1786407000000
```

若执行列表为空，必须继续做 7.1 的字段检查；字段不存在说明镜像未包含 Migration，禁止启动新 API。

### 6.4 本地构建 Web 并上传

开发电脑执行：

```bash
pnpm build:shared
pnpm --filter @shck/web build
scp -r packages/web/dist root@YOUR_SERVER_IP:/opt/daily-learning/packages/web/
```

### 6.5 构建 Web 镜像并切换版本

```bash
cd /opt/daily-learning
docker compose --env-file .env -f docker/docker-compose.yml build web
docker compose --env-file .env -f docker/docker-compose.yml up -d
docker compose --env-file .env -f docker/docker-compose.yml ps
docker logs daily-learning-api --tail 100
docker logs daily-learning-web --tail 50
```

日志不得出现 `Unknown column`、`QueryFailedError` 或 `/api/v1/vocabulary/today` 的 500 错误。

## 7. 部署后验收

### 7.1 数据库字段

```bash
docker compose --env-file .env -f docker/docker-compose.yml run --rm api node -e "
const { AppDataSource } = require('./packages/server/dist/database/data-source.js');
(async () => {
  await AppDataSource.initialize();
  const rows = await AppDataSource.query(\"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vocabulary_progress' AND COLUMN_NAME IN ('queue_date','learning_stage','same_day_attempts','same_day_correct_count','last_grade','stable_review_count') ORDER BY COLUMN_NAME\");
  console.table(rows);
  await AppDataSource.destroy();
})().catch(error => { console.error(error); process.exit(1); });
"
```

预期返回 6 个字段。登录不应再出现：

```text
Unknown column 'UserSettings.study_availability_json' in 'field list'
```

### 7.2 移动端业务验收

1. 使用现有账号登录，打开 `/m/vocabulary`。
2. 确认移动端没有每日目标或学习时间配置入口。
3. 记录今日新词数、到期复习数和第一张卡。
4. 完成 5 张首次学习卡，确认随后进入三选一检测。
5. 故意答错一次，确认错误词没有立即出现。
6. 答对另一词后退出页面并重新进入，确认完成进度保留。
7. 多次刷新，确认今日新词、顺序与阶段不变。
8. 新词做完后确认可以继续独立的到期复习。

### 7.3 API 冒烟验收

重点观察：

```text
POST  /api/v1/auth/login
GET   /api/v1/vocabulary/today
PATCH /api/v1/vocabulary/progress/:id/introduce
PATCH /api/v1/vocabulary/progress/:id/answer
PATCH /api/v1/vocabulary/progress/:id/review
```

## 8. 回滚方案

推荐只回滚 API 与 Web，保留两个 Migration。新增字段允许为空或有默认值，旧代码会忽略它们，这是数据风险最低的方案。

回滚顺序：

1. 切回上一稳定 API 与 Web 镜像。
2. 启动旧版本并验证登录和词汇页。
3. 保留 Migration，不执行 `undoLastMigration()`。

只有在应用已回滚、数据库已备份且明确需要删除新字段时，才允许按逆序回退 Migration。数据库回退会丢失快速模式卡片阶段，不作为常规回滚方式。

## 9. 本地验收记录

2026-08-11 已完成：

- 两个 Migration 在本地 MySQL 成功执行。
- `demo / Study70Days!` 登录成功。
- 隔离测试账号首次生成 `20 新词 / 0 复习`。
- 连续请求今日队列，20 个记录 ID 与顺序完全一致。
- 前 5 张首次学习完成后进入 `CHECK`。
- 第一次答错后进入 `RETRY`，实测位于后续第 10 张卡，满足至少间隔 4 张。
- 答对后重新请求，进度稳定为 `1/20`。
- 升级当天已有纯复习队列时，会保留旧记录并补入 20 个新词，分组不再为空。
- 页面实测进入即显示学习卡；退出后进度重新拉取；到期复习三选一答题后完成数立即更新。
- Server 与 Web 生产构建通过。

## 10. 发布完成记录

| 项目 | 记录 |
| --- | --- |
| 部署时间 |  |
| 部署提交 |  |
| 数据库备份位置 |  |
| Migration 输出 |  |
| API 镜像 ID |  |
| Web 镜像 ID |  |
| 登录验收 |  |
| 快速词汇验收 |  |
| 异常与处理 |  |
