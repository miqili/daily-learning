# 2026-08-11 版本发布说明：每日词单与配置集中管理

## 1. 发布摘要

| 项目 | 内容 |
| --- | --- |
| 发布标识 | `2026-08-11-stable-vocabulary-queue` |
| 发布状态 | 待生产部署 |
| 影响范围 | API、Web、MySQL |
| 必须执行 Migration | 是 |
| 需要执行 Seed | 否，禁止执行 |
| 预计停机 | 无需主动停机；最终替换容器时会有短暂连接切换 |
| 数据兼容性 | Migration 仅新增字段和索引，不删除现有学习数据 |

本版本解决以下问题：

1. 移动端存在每日单词目标、可用学习时间等配置入口，配置分散。
2. 背完部分单词后退出，再进入会从页面进度 0 开始。
3. 同一天多次进入单词页可能重新抽取新词，导致当日任务不断增加。
4. “不认识”的单词会立即重新进入队列，无法正常结束当天学习。
5. 浏览器本地保存的可用时间无法在桌面端和移动端之间共享。

## 2. 用户可见变更

### 移动端

- 移除单词页的每日目标配置按钮。
- 移除“我的”页面中的可用学习时间编辑区域。
- 移除今日任务页的“调整可用时间”入口。
- 单词页明确显示“今日词单已固定”。
- 显示今日固定总数、新词数、复习数和已完成进度。
- 退出或刷新后从剩余单词继续，不再从 0 开始。

### 桌面后台

- 每日单词目标继续在 `/vocabulary` 管理。
- 可用学习时间继续在 `/plan` 管理。
- 可用时间保存到后端 `user_settings`，移动端读取同一份配置。
- 当天修改单词目标不会重置当天词单，新目标从次日开始生效。

## 3. 每日单词分配规则

每日词单以 Asia/Shanghai 的自然日为边界，即北京时间 `00:00` 切换。

当天首次请求 `/api/v1/vocabulary/today` 时：

1. 优先加入到期复习单词。
2. 使用新词补充剩余容量，但不超过后台配置的新词目标。
3. 默认单日容量为 50；当新词目标高于 50 时，以新词目标为容量；最大 500。
4. 将队列日期、类型、顺序和完成状态写入数据库。

当天后续请求只读取已生成的固定队列，不再重新抽词。每完成一张词卡，API 会立即写入今日完成时间。

复习间隔：

- 选择“认识”：掌握度提升一级，并按现有间隔规则安排复习。
- 选择“不认识”：掌握度回到 L0，安排到次日复习，不在当天立即循环出现。

升级当天会读取旧数据中的“今天已完成记录”和“仍未完成记录”，尽量重建当天进度，避免升级后直接显示为 0。

## 4. 数据库变更

必须执行以下 Migration：

```text
StableVocabularyQueue1786406400000
```

源文件：

```text
packages/server/src/database/migrations/2026081109-stable-vocabulary-queue.ts
```

新增结构：

| 表 | 字段或索引 | 用途 |
| --- | --- | --- |
| `user_settings` | `study_availability_json` | 保存桌面后台配置的可用学习时间 |
| `vocabulary_progress` | `queue_date` | 当前记录所属的每日词单日期 |
| `vocabulary_progress` | `queue_kind` | 区分新词 `NEW` 与复习 `REVIEW` |
| `vocabulary_progress` | `queue_position` | 固定当天展示顺序 |
| `vocabulary_progress` | `queue_completed_at` | 保存当天完成时间 |
| `vocabulary_progress` | `idx_vocabulary_daily_queue` | 加速按用户和日期读取每日词单 |

如果未执行 Migration，新 API 登录或读取用户设置时会出现：

```text
Unknown column 'UserSettings.study_availability_json' in 'field list'
```

## 5. 部署前检查

开发电脑执行：

```bash
git status --short
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

确认生产数据库已有可恢复备份。备份流程见 [部署文档：数据库备份](../DEPLOYMENT.md#10-数据库备份)。

确认本次发布内容包含：

```text
packages/server/src/database/migrations/2026081109-stable-vocabulary-queue.ts
packages/server/src/database/data-source.ts
packages/server/src/vocabulary/vocabulary.service.ts
packages/web/src/views/mobile/MobileVocabularyView.vue
```

## 6. 生产部署步骤

生产目录默认为 `/opt/daily-learning`。以下步骤不能跳过或调换 Migration 与新 API 的先后关系。

### 6.1 拉取代码

```bash
cd /opt/daily-learning
git pull origin master
git status --short
```

工作区应保持干净。如果服务器存在未提交修改，停止部署并先确认这些修改的来源。

### 6.2 构建新 API 镜像

Migration 文件需要先编译进入 API 镜像：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  build api
```

不要先启动新 API。

### 6.3 使用新 API 镜像执行 Migration

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  run --rm api \
  node -e "
const { AppDataSource } = require('./packages/server/dist/database/data-source.js');

(async () => {
  await AppDataSource.initialize();
  const migrations = await AppDataSource.runMigrations();
  console.log('Executed migrations:', migrations.map(item => item.name));
  await AppDataSource.destroy();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
"
```

首次执行成功时，输出应包含：

```text
StableVocabularyQueue1786406400000
```

如果该 Migration 之前已经执行，执行列表为空是正常的；继续部署前必须完成 7.2 的字段检查。若执行列表为空且字段不存在，说明 API 镜像没有包含新 Migration，不要启动新 API。

不要执行：

```bash
pnpm db:seed
```

正常版本更新不需要 Seed；Seed 会重新生成 demo 正式计划，不应在生产更新中运行。

### 6.4 本地构建 Web

在开发电脑执行：

```bash
git pull origin master
pnpm install --frozen-lockfile
pnpm build:shared
pnpm --filter @shck/web build
```

将新的 `packages/web/dist/` 上传到生产服务器：

```text
/opt/daily-learning/packages/web/dist/
```

例如：

```bash
scp -r packages/web/dist \
  root@YOUR_SERVER_IP:/opt/daily-learning/packages/web/
```

### 6.5 构建 Web 镜像

生产服务器执行：

```bash
cd /opt/daily-learning

docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  build web
```

### 6.6 应用新版本

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  up -d
```

### 6.7 检查容器和日志

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  ps

docker logs daily-learning-api --tail 100
docker logs daily-learning-web --tail 50
```

日志中不得出现：

```text
Unknown column
QueryFailedError
ECONNREFUSED
```

## 7. 部署后验收

### 7.1 基础验收

- 使用现有生产账号登录成功。
- 首页、桌面单词页、移动端今日任务页可以正常打开。
- 浏览器 Network 中没有 `/api/v1` 的 500 响应。

### 7.2 数据库验收

再次执行 6.3 的 Migration 命令时，输出的执行列表应为空，表示没有遗漏的 Migration。

也可以从 API 容器检查字段：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  run --rm api \
  node -e "
const { AppDataSource } = require('./packages/server/dist/database/data-source.js');

(async () => {
  await AppDataSource.initialize();
  const columns = await AppDataSource.query(
    \"SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = 'user_settings' AND COLUMN_NAME = 'study_availability_json') OR (TABLE_NAME = 'vocabulary_progress' AND COLUMN_NAME IN ('queue_date', 'queue_kind', 'queue_position', 'queue_completed_at'))) ORDER BY TABLE_NAME, ORDINAL_POSITION\"
  );
  console.table(columns);
  await AppDataSource.destroy();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
"
```

预期返回 5 个字段。

### 7.3 配置集中管理验收

1. 桌面端进入 `/plan`，修改可用学习时间并保存。
2. 刷新桌面首页，确认计划容量使用新配置。
3. 打开移动端今日任务页，确认读取同一份时间配置。
4. 移动端“我的”和单词页不应出现配置编辑控件。

### 7.4 单词续学验收

1. 在移动端打开单词页，记录“今日固定总数”和第一张单词。
2. 完成至少 2 张词卡。
3. 退出单词页后重新进入。
4. 已完成数应保留，第一张应为之前尚未完成的词，而不是最初第一张。
5. 多次刷新页面，今日固定总数、新词数和复习数应保持不变。
6. 选择一次“不认识”，该词当天不应立刻重新出现。

## 8. 监控重点

部署后首日重点观察：

```bash
docker logs -f daily-learning-api
```

关注以下接口的 5xx：

```text
POST /api/v1/auth/login
GET  /api/v1/plan/settings/availability
PATCH /api/v1/plan/settings/availability
GET  /api/v1/vocabulary/today
PATCH /api/v1/vocabulary/progress/:id/review
```

每日词单以北京时间切换。生产容器即使使用 UTC，本版本也会按 Asia/Shanghai 计算词单日期。

## 9. 回滚方案

### 推荐：只回滚应用，不回滚 Migration

本次 Migration 只增加允许为空的字段和索引，旧版本代码会忽略这些字段。因此紧急回滚时：

1. 将代码切回上一稳定提交或镜像。
2. 重新构建并启动旧 API、旧 Web。
3. 保留本次数据库 Migration，不执行数据库回退。

这是数据风险最低的回滚方式。

### 完整回滚数据库

只有在确认应用代码也已回滚、且确实需要删除新增结构时才执行。执行前必须备份数据库。

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  run --rm api \
  node -e "
const { AppDataSource } = require('./packages/server/dist/database/data-source.js');

(async () => {
  await AppDataSource.initialize();
  await AppDataSource.undoLastMigration();
  await AppDataSource.destroy();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
"
```

完整回滚会删除 `study_availability_json` 和每日词单元数据。现有用户、词库、单词掌握度和历史复习次数不会被删除，但本版本记录的当天固定队列状态会丢失。

## 10. 发布完成记录

部署人员完成后填写：

| 项目 | 记录 |
| --- | --- |
| 部署时间 |  |
| 部署提交 |  |
| 操作人员 |  |
| 数据库备份位置 |  |
| Migration 输出 |  |
| API 镜像 ID |  |
| Web 镜像 ID |  |
| 登录验收 |  |
| 配置同步验收 |  |
| 单词续学验收 |  |
| 异常与处理 |  |
