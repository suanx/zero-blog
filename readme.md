# 🚀 Zero Blog

基于 **Next.js 16 + Turso (libSQL) + TailwindCSS 4** 的现代博客系统，部署于 EdgeOne Pages。

## ✨ 功能特性

- **文章管理** — 创建、编辑、删除文章，支持 Markdown 内容与封面图
- **分类 & 标签** — 多对多关联，支持 CRUD，按分类/标签筛选文章
- **评论系统** — 支持待审/通过/垃圾三种状态，管理后台批量审核
- **用户管理** — 角色权限（admin/editor/viewer），创建/编辑/删除用户
- **系统设置** — 站点名称、Logo、社交链接、SEO 关键词、分析代码可配置
- **数据仪表盘** — 统计卡片、7 天发布趋势、热门文章排行、最新评论
- **分页查询** — API 层统一 `LIMIT/OFFSET` 分页，返回总数和页码信息
- **管理后台** — 侧边栏导航 + 7 个管理模块，Token 认证保护（timing-safe 比较）
- **响应式设计** — 移动端适配，骨架屏加载态，暗色模式支持
- **安全加固** — Token 时序攻击防护、生产环境错误信息隔离、批量关联操作防 N+1
- **Edge 部署** — Turso 边缘数据库 + EdgeOne Pages，全球低延迟

## 📁 项目结构

```
zero-blog/
├── app/
│   ├── layout.tsx              # 根布局（TailwindCSS + 暗色模式）
│   ├── page.js                 # 首页：文章列表（分页 + 骨架屏）
│   ├── globals.css             # 全局样式
│   ├── posts/[slug]/page.js    # 文章详情页（next/image + Markdown + 分享）
│   ├── admin/
│   │   ├── layout.js           # 管理后台布局（侧边栏 + 顶栏）
│   │   ├── login/page.js       # 管理员登录页（Token 验证）
│   │   ├── dashboard/page.js   # 仪表盘（统计卡片 + 趋势 + 热门文章）
│   │   ├── posts/page.js       # 文章管理（CRUD + Markdown 预览 + 分页）
│   │   ├── comments/page.js    # 评论管理（审核/标记垃圾/删除）
│   │   ├── users/page.js       # 用户管理（角色筛选 + CRUD）
│   │   ├── categories/page.js  # 分类管理（CRUD + 文章引用检测）
│   │   ├── tags/page.js        # 标签管理（CRUD + 文章引用检测）
│   │   └── settings/page.js    # 系统设置（站点/社交链接/SEO）
│   └── api/
│       ├── health/route.ts     # 健康检查
│       ├── posts/route.js      # GET: 文章列表 | POST: 创建文章
│       ├── posts/[slug]/       # GET/PUT/DELETE: 文章操作
│       ├── categories/route.js # GET: 分类列表（1 小时缓存）
│       ├── tags/route.js       # GET: 标签列表（1 小时缓存）
│       └── admin/
│           ├── users/          # GET/POST + [id] PUT/DELETE
│           ├── comments/       # GET + [id] PUT/DELETE
│           ├── taxonomy/       # GET/POST + [id] PUT/DELETE（分类/标签共用）
│           ├── settings/       # GET/PUT（批量更新）
│           └── stats/          # GET 聚合统计
├── lib/
│   ├── db.js                   # Turso 数据库客户端（旧版，保留兼容）
│   └── api-helpers.js          # 认证/校验/分页/错误处理（旧版，保留兼容）
├── src/lib/                    # ⭐ v1 新架构（Strapi 风格分层）
│   ├── config.js               # 环境变量统一管理
│   ├── db.js                   # 数据库客户端（增强版，含事务辅助）
│   ├── models.js               # 数据模型定义（单一数据源）
│   ├── utils/
│   │   ├── response.js         # 统一 API 响应格式
│   │   ├── errors.js           # 自定义错误类
│   │   ├── auth.js             # JWT + RBAC 鉴权
│   │   ├── logger.js           # 结构化日志
│   │   └── validate.js         # 请求验证引擎
│   ├── services/               # 业务逻辑层
│   │   ├── postService.js      # 文章 CRUD + 关联 + 版本历史
│   │   ├── commentService.js   # 评论管理
│   │   ├── userService.js      # 用户管理
│   │   ├── taxonomyService.js  # 分类/标签
│   │   ├── settingsService.js  # 系统设置
│   │   ├── statsService.js     # 仪表盘统计
│   │   └── translationService.js # i18n 翻译
│   ├── plugins/
│   │   ├── manager.js          # 插件管理器
│   │   └── ai-plugin.js        # AI 辅助插件
│   └── events/
│       ├── emitter.js          # 事件发射器
│       └── webhookService.js   # Webhook 异步推送
├── migrations/
│   ├── 002_categories_tags.sql # 分类/标签表
│   ├── 003_admin_tables.sql   # 评论/设置表 + views 字段 + 索引
│   └── 004_rbac_i18n_events.sql # RBAC + 翻译 + 版本历史 + Webhook 表
├── schema.sql                  # 核心表（users + posts）
└── seed.sql                    # 种子数据
```

## 🗄️ 数据库设计

| 表名 | 说明 |
|------|------|
| `users` | 用户（id, email, password_hash, name, role[admin/editor/viewer]） |
| `posts` | 文章（id, title, slug, content, excerpt, cover_image, published, views, author_id） |
| `comments` | 评论（id, post_id, author_name, author_email, content, status[pending/approved/spam]） |
| `categories` | 分类（id, name, slug） |
| `tags` | 标签（id, name, slug） |
| `post_categories` | 文章↔分类 多对多关联 |
| `post_tags` | 文章↔标签 多对多关联 |
| `settings` | 系统设置（key, value） |

**预置种子数据：** 5 个分类（前端开发、后端技术、DevOps、数据库、开源项目）+ 7 个标签

## 🔌 API 端点

### 文章

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/api/posts` | 文章列表（分页 + 筛选） | ❌ |
| `POST` | `/api/posts` | 创建文章 | ✅ Admin-Token |
| `GET` | `/api/posts/[slug]` | 文章详情 | ❌ |
| `PUT` | `/api/posts/[slug]` | 更新文章 | ✅ Admin-Token |
| `DELETE` | `/api/posts/[slug]` | 删除文章 | ✅ Admin-Token |

#### GET `/api/posts` — 文章列表

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码，最小 1 |
| `pageSize` | number | 10 | 每页条数，范围 1–100 |
| `category` | string | — | 按分类 slug 筛选 |
| `tag` | string | — | 按标签 slug 筛选 |
| `admin` | string | — | 传 `true` 显示草稿，需 Admin-Token |

**响应格式：**

```json
{
  "posts": [
    {
      "id": 1,
      "title": "Hello World",
      "slug": "hello-world",
      "excerpt": "...",
      "cover_image": "https://...",
      "created_at": "2025-01-01T00:00:00.000Z",
      "author": "Admin",
      "categories": [{ "id": 1, "name": "前端开发", "slug": "frontend" }],
      "tags": [{ "id": 1, "name": "JavaScript", "slug": "javascript" }]
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

**缓存策略：** `Cache-Control: private, no-cache`

#### POST `/api/posts` — 创建文章

**请求头：**

```
Content-Type: application/json
Admin-Token: <your-admin-token>
```

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 标题，最长 200 字符 |
| `slug` | string | ✅ | URL slug，仅允许 `[a-z0-9-]`，需全局唯一 |
| `content` | string | — | Markdown 内容，最长 1,000,000 字符 |
| `excerpt` | string | — | 摘要 |
| `cover_image` | string | — | 封面图 URL |
| `published` | boolean | — | 是否发布（默认 `false`） |
| `category_ids` | number[] | — | 分类 ID 数组 |
| `tag_ids` | number[] | — | 标签 ID 数组 |

**响应（201）：**

```json
{ "message": "文章创建成功", "id": 1, "slug": "hello-world" }
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 400 | 缺少必填字段、slug 格式无效、字段超长 |
| 401 | Admin-Token 无效或缺失 |
| 409 | slug 已存在 |
| 500 | 服务器内部错误（生产环境不泄露详情） |

#### GET `/api/posts/[slug]` — 文章详情

**响应格式：**

```json
{
  "post": {
    "id": 1,
    "title": "Hello World",
    "slug": "hello-world",
    "content": "# Hello\n\n...",
    "excerpt": "...",
    "cover_image": "https://...",
    "published": 1,
    "created_at": "...",
    "updated_at": "...",
    "author": "Admin",
    "categories": [...],
    "tags": [...]
  }
}
```

**缓存策略：** `Cache-Control: private, no-cache`

#### PUT `/api/posts/[slug]` — 更新文章

**请求体（所有字段均可选，至少提供一个）：**

同 POST，额外支持 `slug` 字段用于修改 slug（修改时检查唯一性，冲突返回 409）。

**响应：**

```json
{ "message": "文章更新成功", "slug": "new-slug" }
```

#### DELETE `/api/posts/[slug]` — 删除文章

**响应：**

```json
{ "message": "文章已删除", "slug": "hello-world" }
```

### 分类 & 标签

| 方法 | 路径 | 说明 | 缓存 |
|------|------|------|------|
| `GET` | `/api/categories` | 所有分类（含文章数） | `public, max-age=3600` |
| `GET` | `/api/tags` | 所有标签（含文章数） | `public, max-age=3600` |

**GET `/api/categories` 响应：**

```json
{
  "categories": [
    { "id": 1, "name": "前端开发", "slug": "frontend", "post_count": 3 }
  ]
}
```

**GET `/api/tags` 响应：**

```json
{
  "tags": [
    { "id": 1, "name": "JavaScript", "slug": "javascript", "post_count": 5 }
  ]
}
```

### 请求示例

```bash
# 创建文章（含分类和标签）
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Admin-Token: your-admin-token" \
  -d '{
    "title": "Hello World",
    "slug": "hello-world",
    "content": "# Hello\n\nThis is my first post.",
    "category_ids": [1, 2],
    "tag_ids": [1, 3]
  }'

# 分页查询 + 按分类筛选
curl "http://localhost:3000/api/posts?category=frontend&page=1&pageSize=10"

# 管理员查看全部文章（含草稿）
curl "http://localhost:3000/api/posts?admin=true&page=1&pageSize=20" \
  -H "Admin-Token: your-admin-token"
```

### 管理后台 API

所有 Admin API 均需 `Admin-Token` Header 认证，路径前缀 `/api/admin/`。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/stats` | 聚合统计（文章/评论/用户数、7 天趋势、热门文章） |
| `GET/POST` | `/api/admin/users` | 用户列表（支持 `?role=` 筛选）/ 创建用户 |
| `PUT/DELETE` | `/api/admin/users/[id]` | 更新角色/密码 / 删除用户 |
| `GET` | `/api/admin/comments` | 评论列表（支持 `?status=&post_id=` 筛选） |
| `PUT/DELETE` | `/api/admin/comments/[id]` | 更新状态 / 删除评论 |
| `GET/POST` | `/api/admin/taxonomy?type=category\|tag` | 分类或标签列表 / 创建 |
| `PUT/DELETE` | `/api/admin/taxonomy/[id]?type=...` | 更新 / 删除（有关联文章则拒绝） |
| `GET/PUT` | `/api/admin/settings` | 获取全部设置 / 批量更新 |

## 🔒 安全机制

| 机制 | 说明 |
|------|------|
| **Token 时序安全比较** | 使用 `crypto.timingSafeEqual` 防止时序攻击 |
| **生产环境错误隔离** | 500 错误仅返回用户友好消息，开发环境附加 `detail` |
| **批量关联操作** | 分类/标签关联通过 `executeBatch` 事务执行，避免 N+1 查询 |
| **分页上限** | `pageSize` 最大 100，防止一次拉取过多数据 |
| **输入校验** | slug 格式 `[a-z0-9-]`、标题 ≤200 字符、内容 ≤1M 字符 |

## 🚀 快速开始

### 1. 克隆并安装

```bash
git clone <your-repo-url>
cd zero-blog
npm install
```

### 2. 配置环境变量

复制 `.env.example` 并填入实际值：

```bash
cp .env.example .env.local
```

```env
# Turso 数据库
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# 管理后台（自定义密钥，用于 API 认证）
ADMIN_TOKEN=your-admin-token
```

### 3. 初始化数据库

在 Turso 控制台或本地执行 SQL 文件：

```bash
# 创建表结构
turso db shell your-db < schema.sql
turso db shell your-db < seed.sql

# 添加分类/标签（可选）
turso db shell your-db < migrations/002_categories_tags.sql

# 添加管理后台扩展表（评论/设置/阅读量）
turso db shell your-db < migrations/003_admin_tables.sql
```

### 4. 启动开发服务器

```bash
npm run dev
```

- 首页：http://localhost:3000
- 文章详情：http://localhost:3000/posts/building-next-gen-blog-with-turso
- 管理后台：http://localhost:3000/admin/login

## 🔐 管理后台

访问 `/admin/login`，输入 `ADMIN_TOKEN` 环境变量的值进行登录。

登录后通过左侧边栏导航切换模块：

| 模块 | 路径 | 说明 |
|------|------|------|
| 📊 仪表盘 | `/admin/dashboard` | 统计卡片、7 天发布趋势、热门文章、最新评论 |
| 📝 文章管理 | `/admin/posts` | 创建/编辑/删除文章，Markdown 实时预览，分类/标签筛选 |
| 💬 评论管理 | `/admin/comments` | 审核评论（通过/标记垃圾），按状态/文章筛选 |
| 👥 用户管理 | `/admin/users` | 创建/编辑/删除用户，角色筛选（admin/editor/viewer） |
| 📁 分类管理 | `/admin/categories` | CRUD 分类，删除时检测文章引用 |
| 🏷️ 标签管理 | `/admin/tags` | CRUD 标签，删除时检测文章引用 |
| ⚙️ 系统设置 | `/admin/settings` | 站点名称、Logo、社交链接、SEO 关键词、分析代码 |


## 🏗️ v1 API 架构（Strapi 风格分层）

v1 API 采用分层架构，与旧版 `/api/*` 并行存在，不破坏现有前端。

### 架构分层

```
Request → Controller (route.js) → Service (业务逻辑) → DB (executeQuery)
                                   ↓
                              Events (emitter) → Webhooks / AI Plugin
```

- **Controller 层** (`app/api/v1/*/route.js`) — HTTP 请求解析、鉴权、响应格式化
- **Service 层** (`src/lib/services/*.js`) — 纯业务逻辑，不依赖 HTTP
- **Utils** (`src/lib/utils/`) — 统一响应、错误类、验证、鉴权、日志
- **Events** (`src/lib/events/`) — 内存事件发射器 + Webhook 异步推送
- **Plugins** (`src/lib/plugins/`) — 插件管理器 + AI 辅助插件

### 统一响应格式

```json
// 成功
{ "status": "success", "data": [...], "message": "...", "meta": { "page": 1, "total": 42 } }

// 错误
{ "status": "error", "message": "用户友好消息", "code": "VALIDATION_ERROR", "detail": "..." }
```

### v1 API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `GET` | `/api/v1/posts` | 文章列表（分页+筛选） | ❌ |
| `POST` | `/api/v1/posts` | 创建文章 | ✅ admin/editor |
| `GET` | `/api/v1/posts/[slug]` | 文章详情 | ❌ |
| `PUT` | `/api/v1/posts/[slug]` | 更新文章 | ✅ admin/editor |
| `DELETE` | `/api/v1/posts/[slug]` | 删除文章 | ✅ admin |
| `POST` | `/api/v1/comments` | 提交评论 | ❌ |
| `GET` | `/api/v1/posts/[slug]/translations` | 获取翻译 | ❌ |
| `POST` | `/api/v1/posts/[slug]/translations` | 创建/更新翻译 | ✅ admin/editor |
| `GET` | `/api/v1/admin/users` | 用户列表 | ✅ admin |
| `POST` | `/api/v1/admin/users` | 创建用户 | ✅ admin |
| `PUT` | `/api/v1/admin/users/[id]` | 更新用户 | ✅ admin |
| `DELETE` | `/api/v1/admin/users/[id]` | 删除用户 | ✅ admin |
| `GET` | `/api/v1/admin/comments` | 评论列表 | ✅ admin |
| `PUT` | `/api/v1/admin/comments/[id]` | 更新评论状态 | ✅ admin |
| `DELETE` | `/api/v1/admin/comments/[id]` | 删除评论 | ✅ admin |
| `GET` | `/api/v1/admin/taxonomy` | 分类/标签列表 | ✅ admin |
| `POST` | `/api/v1/admin/taxonomy` | 创建分类/标签 | ✅ admin |
| `PUT` | `/api/v1/admin/taxonomy/[id]` | 更新分类/标签 | ✅ admin |
| `DELETE` | `/api/v1/admin/taxonomy/[id]` | 删除分类/标签 | ✅ admin |
| `GET` | `/api/v1/admin/settings` | 获取设置 | ✅ admin |
| `PUT` | `/api/v1/admin/settings` | 更新设置 | ✅ admin |
| `GET` | `/api/v1/admin/stats` | 仪表盘统计 | ✅ admin |

### 新增数据库表（Migration 004）

| 表名 | 说明 |
|------|------|
| `post_translations` | 文章翻译（post_id, locale, title, content, excerpt） |
| `post_versions` | 文章版本历史（每次创建/更新自动记录） |
| `webhooks` | Webhook 注册（url, events, secret, active） |
| `webhook_deliveries` | Webhook 投递记录（含重试状态） |


## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Next.js 16](https://nextjs.org) | React 框架（App Router） |
| [React 19](https://react.dev) | UI 库 |
| [TailwindCSS 4](https://tailwindcss.com) | 原子化 CSS 框架 |
| [Turso](https://turso.tech) | 边缘数据库（libSQL/SQLite 兼容） |
| [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) | Turso 数据库驱动 |
| [next/image](https://nextjs.org/docs/app/api-reference/components/image) | 图片优化组件 |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown 渲染 |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | GitHub Flavored Markdown |
| [EdgeOne Pages](https://edgeone.ai) | 边缘部署平台 |

## 📦 部署

### EdgeOne Pages（推荐）

项目已预配置 EdgeOne Pages 部署：

1. 在 [EdgeOne Pages](https://console.edgeone.ai) 创建项目
2. 关联 GitHub 仓库
3. 在部署平台设置环境变量：`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`ADMIN_TOKEN`
4. 推送到 `main` 分支自动触发部署

### 手动部署

```bash
npm run build
npm run start
```

## 📄 License

MIT
