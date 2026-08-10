# Daily Learning 部署文档

本文记录 Daily Learning 当前生产环境的实际部署与后续更新流程。

## 1. 部署架构

项目生产环境使用 Docker Compose 管理三个服务：

```text
Browser
   │
   │ :8080
   ▼
┌──────────────┐
│ Nginx / Web  │
│ Vue 静态资源  │
└──────┬───────┘
       │ /api/v1/*
       ▼
┌──────────────┐
│ NestJS API   │
│ :3000        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ MySQL 8.4    │
│ mysql_data   │
└──────────────┘
```

当前服务器配置：

```text
Ubuntu
2 Core CPU
1.6 GB RAM
Docker
Docker Compose
```

由于服务器内存较小，**Web 前端不在服务器执行 Vue/Vite 编译**。

前端采用：

```text
本地构建 dist
    ↓
上传服务器
    ↓
Docker + Nginx
```

后端则直接在服务器通过 Docker 构建。

---

## 2. 项目目录

服务器部署目录：

```text
/opt/daily-learning
```

主要文件：

```text
daily-learning/
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.server
│   ├── Dockerfile.web
│   └── nginx.conf
│
├── packages/
│   ├── server/
│   ├── shared/
│   └── web/
│       └── dist/
│
├── .env
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

---

# 3. 首次部署

## 3.1 拉取项目

```bash
cd /opt

git clone https://github.com/miqili/daily-learning.git

cd daily-learning
```

确认分支：

```bash
git checkout master
git pull
```

---

## 3.2 配置 `.env`

项目根目录创建：

```bash
cp .env.example .env
```

编辑：

```bash
vim .env
```

示例：

```env
# Server

PORT=3000
FRONTEND_ORIGIN=http://YOUR_SERVER_IP:8080
JWT_SECRET=YOUR_RANDOM_JWT_SECRET


# Application Database

DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=study_app
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_DATABASE=daily_learning


# Docker MySQL

MYSQL_ROOT_PASSWORD=YOUR_MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=daily_learning
MYSQL_USER=study_app
MYSQL_PASSWORD=YOUR_DATABASE_PASSWORD
```

注意：

```text
DB_PASSWORD
```

和：

```text
MYSQL_PASSWORD
```

需要保持一致。

`.env` 包含数据库密码和 JWT Secret，禁止提交到 Git。

---

## 3.3 校验 Docker Compose

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  config --quiet
```

没有输出表示配置正常。

---

## 3.4 启动 MySQL

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  up -d mysql
```

查看：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  ps
```

等待 MySQL：

```text
daily-learning-mysql    Up (healthy)
```

再继续后面的操作。

---

## 3.5 构建 API

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  build api
```

---

## 3.6 执行数据库 Migration

当前生产 API 镜像不依赖 pnpm 执行 migration，直接调用已经编译好的 TypeORM DataSource：

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

  console.log(
    'Executed migrations:',
    migrations.map(item => item.name)
  );

  await AppDataSource.destroy();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
"
```

Migration 可以重复执行。

TypeORM 只会执行尚未执行的 migration。

---

## 3.7 初始化 Seed

仅首次部署需要：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  run --rm api \
  node packages/server/dist/database/seed.js
```

除非确认 seed 本身是幂等的，否则不要在每次部署时执行。

---

# 4. Web 前端部署

由于生产服务器只有约 1.6 GB 内存，不在服务器执行：

```bash
pnpm build:shared
pnpm --filter @shck/web build
```

否则 TypeScript / Vite 构建可能耗尽服务器内存。

## 4.1 本地构建

在开发电脑项目根目录：

```bash
pnpm install --frozen-lockfile

pnpm build:shared

pnpm --filter @shck/web build
```

完成后应该生成：

```text
packages/web/dist/
```

确认其中至少存在：

```text
packages/web/dist/index.html
packages/web/dist/assets/
```

生产 API 使用同源路径：

```text
/api/v1
```

因此构建时确保 `VITE_API_BASE_URL` 使用 `/api/v1`。

---

## 4.2 上传 Web dist

将本地：

```text
packages/web/dist
```

上传至服务器：

```text
/opt/daily-learning/packages/web/dist
```

例如：

```bash
scp -r packages/web/dist \
  root@YOUR_SERVER_IP:/opt/daily-learning/packages/web/
```

服务器确认：

```bash
ls -la /opt/daily-learning/packages/web/dist
```

---

## 4.3 构建 Web 镜像

当前 `Dockerfile.web` 应直接将已经构建好的 dist 放入 Nginx：

```dockerfile
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY packages/web/dist /usr/share/nginx/html

EXPOSE 80
```

服务器执行：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  build web
```

该过程不再执行 Node / pnpm / Vite 编译，因此应该很快完成。

---

# 5. 启动项目

所有镜像准备完成后：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  up -d
```

查看状态：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  ps
```

正常状态：

```text
daily-learning-mysql    Up (healthy)
daily-learning-api      Up
daily-learning-web      Up
```

浏览器访问：

```text
http://YOUR_SERVER_IP:8080
```

---

# 6. 停止项目

停止全部服务：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  down
```

这不会删除 MySQL 数据。

不要执行：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  down -v
```

`-v` 会删除 Compose 管理的 volume，可能导致 MySQL 数据丢失。

---

# 7. 日常更新部署

正常版本发布流程：

```text
代码合并 master
      ↓
服务器 git pull
      ↓
重新构建 API
      ↓
执行 Migration
      ↓
本地构建 Web
      ↓
上传 Web dist
      ↓
重新构建 Web 镜像
      ↓
docker compose up -d
      ↓
验证
```

## 7.1 拉取最新代码

服务器：

```bash
cd /opt/daily-learning

git pull origin master
```

---

## 7.2 更新 API

如果后端代码有修改：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  build api
```

---

## 7.3 执行 Migration

如果版本可能包含数据库 migration：

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

  console.log(
    'Executed migrations:',
    migrations.map(item => item.name)
  );

  await AppDataSource.destroy();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
"
```

没有新 migration 时，TypeORM 不会重复执行旧 migration。

不要在正常版本更新时重新执行 seed。

---

## 7.4 更新 Web

开发电脑：

```bash
git pull origin master

pnpm install --frozen-lockfile

pnpm build:shared

pnpm --filter @shck/web build
```

将新的：

```text
packages/web/dist
```

上传到：

```text
/opt/daily-learning/packages/web/dist
```

然后服务器：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  build web
```

---

## 7.5 应用新版本

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  up -d
```

检查：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  ps
```

---

# 8. 部署后验证

每次部署完成至少检查以下内容。

### 容器状态

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  ps
```

三个服务都应该正常运行。

### API 日志

```bash
docker logs daily-learning-api --tail 100
```

确认 NestJS 正常启动，并且没有数据库连接错误。

### Web 日志

```bash
docker logs daily-learning-web --tail 100
```

### MySQL 日志

```bash
docker logs daily-learning-mysql --tail 100
```

### 页面验证

访问：

```text
http://YOUR_SERVER_IP:8080
```

至少测试：

```text
登录
首页
/api/v1 请求
核心学习功能
```

浏览器 DevTools → Network 中确认 API 请求没有出现 4xx / 5xx 异常。

---

# 9. 常用运维命令

查看所有服务：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  ps
```

实时查看 API：

```bash
docker logs -f daily-learning-api
```

实时查看 Web：

```bash
docker logs -f daily-learning-web
```

实时查看 MySQL：

```bash
docker logs -f daily-learning-mysql
```

重启 API：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  restart api
```

重启 Web：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  restart web
```

启动全部：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  up -d
```

停止全部：

```bash
docker compose \
  --env-file .env \
  -f docker/docker-compose.yml \
  down
```

---

# 10. 数据库备份

建议正式使用后定期备份 MySQL。

执行：

```bash
docker exec daily-learning-mysql \
  mysqldump \
  -ustudy_app \
  -p \
  daily_learning > daily_learning_backup.sql
```

输入数据库密码后生成：

```text
daily_learning_backup.sql
```

建议将备份复制到服务器之外保存。

---

# 11. 服务器内存

当前服务器内存较小：

```text
CPU: 2 Core
RAM: 1.6 GB
```

建议配置约 2 GB Swap 作为 OOM 保护。

创建：

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

检查：

```bash
free -h
```

设置重启后继续生效：

```bash
grep -q '^/swapfile ' /etc/fstab || \
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Swap 只是运行时兜底，不代表应该重新在服务器执行大型 Vue/Vite 构建。

---

# 12. 部署原则

生产环境遵循以下原则：

1. `.env` 永远不提交 Git。
2. MySQL 不暴露公网端口。
3. API 只通过 Docker 网络提供给 Nginx。
4. Web 统一通过 Nginx 暴露。
5. 前端在本地构建，服务器只运行静态资源。
6. 数据库使用 Docker Volume 持久化。
7. 更新版本可以执行 Migration，但不要自动重复 Seed。
8. 不执行 `docker compose down -v`。
9. 数据库结构修改必须通过 Migration 管理。
10. 正式数据需要定期备份。

---

# 13. 当前部署状态

| 模块              | 状态   |
| ----------------- | ------ |
| Ubuntu            | ✅     |
| Docker            | ✅     |
| Docker Compose    | ✅     |
| MySQL 8.4         | ✅     |
| MySQL Volume      | ✅     |
| TypeORM Migration | ✅     |
| NestJS API        | ✅     |
| Vue Web           | ✅     |
| Nginx             | ✅     |
| 本地 Web Build    | ✅     |
| HTTPS             | 待配置 |
| 自动数据库备份    | 待配置 |
| CI/CD             | 待配置 |

---

# 14. 后续推荐

当前手工部署流程稳定后，下一阶段建议改造成：

```text
Push / Merge master
        ↓
GitHub Actions
        ↓
Build API Image
Build Web Image
        ↓
Push Docker Registry
        ↓
服务器 docker pull
        ↓
Run Migration
        ↓
docker compose up -d
```

这样生产服务器将彻底不承担 Node/Vite 编译工作。

最终服务器只负责：

```text
Docker Pull
Docker Run
MySQL
NestJS
Nginx
```

更适合当前 2C / 1.6 GB 的服务器配置。
