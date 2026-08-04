# 开发与部署

## 环境要求

| 工具 | 版本 |
| --- | --- |
| Node.js | 20+ |
| pnpm | 10+ |
| MySQL | 8+ |

## 本地开发

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your-password
DB_DATABASE=sys
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 初始化数据库

```bash
pnpm db:migrate    # 执行 TypeORM 迁移
pnpm db:seed       # 写入演示数据
```

### 4. 启动开发服务

```bash
# 方式一：并行启动前后端
pnpm dev

# 方式二：分别启动
pnpm dev:server    # NestJS → http://localhost:3000
pnpm dev:web       # Vite   → http://localhost:5173
```

### 5. 登录体验

打开 http://localhost:5173，使用种子账号：

- 用户名：`demo`
- 密码：`Study70Days!`

首次登录后需在 Dashboard 初始化 70 天计划。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 并行启动 server + web |
| `pnpm dev:server` | 仅启动后端（watch 模式） |
| `pnpm dev:web` | 仅启动前端（Vite HMR） |
| `pnpm build` | 构建 shared → server → web |
| `pnpm build:shared` | 仅构建共享包 |
| `pnpm lint` | 全仓库 TypeScript 类型检查 |
| `pnpm db:migrate` | 运行数据库迁移 |
| `pnpm db:seed` | 运行种子脚本 |

## 项目配置

### TypeScript

根目录 `tsconfig.base.json` 提供共享编译选项，各包 extends 此配置。

### Prettier

根目录 `.prettierrc` 统一代码格式。

### ESLint

根目录安装 `@typescript-eslint`，各包通过 `tsc --noEmit` 做类型检查。

## Docker 部署

### 构建与启动

```bash
docker compose -f docker/docker-compose.yml up --build
```

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| api | 3000 | NestJS 后端 |
| web | 8080 | Nginx 托管前端静态资源 |

### 文件说明

| 文件 | 说明 |
| --- | --- |
| `docker/Dockerfile.server` | 多阶段构建 NestJS |
| `docker/Dockerfile.web` | 多阶段构建 Vue + Nginx |
| `docker/nginx.conf` | 静态资源 + API 反向代理 |
| `docker/docker-compose.yml` | 编排 api + web |

Web 容器构建时通过 `VITE_API_BASE_URL` 注入 API 地址（默认 `http://localhost:3000/api/v1`）。

## CI/CD

GitHub Actions 工作流：`.github/workflows/ci.yml`

**触发条件：** push / PR 到 `main` 分支

**步骤：**

1. checkout
2. setup Node 20 + pnpm 10
3. `pnpm install --frozen-lockfile`
4. `pnpm lint`
5. `pnpm build`

CI 不连接数据库，仅验证编译与类型安全。

## 新增数据库变更

1. 在 `packages/server/src/database/migrations/` 创建新迁移文件
2. 更新对应 Entity
3. 运行 `pnpm db:migrate`

> 项目禁用 `synchronize: true`，所有 schema 变更必须通过 migration。

## 前端环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | API 基础地址 |

可在 `packages/web/.env` 或 Docker 构建参数中覆盖。

## 目录忽略

`.gitignore` 排除：

- `node_modules/`
- `dist/`
- `.env`（含敏感配置）
- `.DS_Store`
