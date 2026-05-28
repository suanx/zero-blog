# Zero Blog 部署教程

> **技术栈**：Next.js 16 (App Router) + TailwindCSS 4 + Turso (libSQL) + EdgeOne Pages

---

## 1. 前提准备

### 1.1 注册 EdgeOne Pages 账号

1. 访问 [https://pages.edgeone.com](https://pages.edgeone.com)
2. 点击 **"注册"**，支持邮箱注册或第三方登录
3. ⚠️ **推荐使用国际站**（非 `console.edgeone.cn`），避免中国大陆节点需要 ICP 备案

### 1.2 注册 Turso 账号

1. 访问 [https://turso.tech](https://turso.tech)
2. 点击 **"Sign Up"**，支持 GitHub / Google 登录
3. 登录后进入 Dashboard

### 1.3 GitHub 仓库准备

1. 将项目代码推送到 GitHub 仓库（如 `yourname/zero-blog`）
2. 确保 `main` 分支包含最新代码

---

## 2. 配置 Turso 数据库

### 2.1 安装 Turso CLI

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
iwr -useb https://get.tur.so/install.ps1 | iex

# 验证安装
turso --version
```

### 2.2 登录并创建数据库

```bash
# 登录 Turso
turso auth login

# 创建数据库（选择离用户最近的区域）
turso db create zero-blog

# 查看数据库 URL
turso db show zero-blog --url
# 输出示例：libsql://zero-blog-xxx.turso.io

# 创建认证 Token
turso db tokens create zero-blog
# 输出示例：eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# 记录以上两个值，后续配置环境变量时使用
```

### 2.3 执行 Schema 建表

通过 Turso Dashboard（Web 界面）或 CLI 执行 SQL：

**方式一：Dashboard Web 界面**
1. 登录 [https://turso.tech/dashboard](https://turso.tech/dashboard)
2. 选择数据库 → 点击 **"SQL"** 标签
3. 粘贴以下 SQL 并执行

**方式二：CLI 执行**
```bash
# 执行基础 Schema
turso db shell zero-blog < schema.sql

# 执行迁移 002（分类与标签）
turso db shell zero-blog < migrations/002_categories_tags.sql

# 执行迁移 003（评论、设置等）
turso db shell zero-blog < migrations/003_admin_tables.sql

# （可选）执行迁移 004（RBAC、国际化、Events）
turso db shell zero-blog < migrations/004_rbac_i18n_events.sql

# （可选）导入种子数据
turso db shell zero-blog < seed.sql
```

#### 完整 SQL 内容

**schema.sql（基础表 + FTS5）：**

```sql
-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'editor', 'user')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image TEXT,
    author_id INTEGER DEFAULT 1,
    published INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- FTS5 全文搜索虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(
    title, content, excerpt,
    content=posts,
    content_rowid=id
);

-- FTS5 触发器：保持同步
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
    INSERT INTO post_fts(rowid, title, content, excerpt)
    VALUES (new.id, new.title, new.content, new.excerpt);
END;

CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
    INSERT INTO post_fts(post_fts, rowid, title, content, excerpt)
    VALUES ('delete', old.id, old.title, old.content, old.excerpt);
END;

CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
    INSERT INTO post_fts(post_fts, rowid, title, content, excerpt)
    VALUES ('delete', old.id, old.title, old.content, old.excerpt);
    INSERT INTO post_fts(rowid, title, content, excerpt)
    VALUES (new.id, new.title, new.content, new.excerpt);
END;
```

**migrations/002_categories_tags.sql：**

```sql
-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章-分类关联表
CREATE TABLE IF NOT EXISTS post_categories (
    post_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 文章-标签关联表
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_post_categories_post ON post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_post_categories_category ON post_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
```

**migrations/003_admin_tables.sql：**

```sql
-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_id INTEGER,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'spam')),
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
```

### 2.4 验证建表

```bash
# 查看所有表
turso db shell zero-blog ".tables"

# 预期输出：
# categories    post_categories    post_tags
# posts         post_fts           posts_au
# posts_ad      posts_ai           settings
# tags          users              comments
```

### 2.5 数据库区域建议

```bash
# 查看当前区域
turso db locations

# 如果主要用户在中国，可添加亚太区域
turso db replicate zero-blog sin
```

> 💡 **提示**：EdgeOne Pages 全球加速可以覆盖大部分场景，数据库区域影响较小。

---

## 3. 配置 EdgeOne Pages 项目

### 3.1 创建项目

1. 登录 [EdgeOne Pages 控制台](https://pages.edgeone.com)
2. 点击 **"创建项目"**
3. 选择 **"连接到 Git 仓库"**
4. 授权 GitHub 并选择你的仓库
5. 基本配置：
   - **项目名称**：`zero-blog`
   - **框架预设**：`Next.js`
   - **构建命令**：`npm run build`（通常自动检测）
   - **输出目录**：`.next`
   - **安装命令**：`npm install`

### 3.2 配置环境变量

在项目设置 → **"环境变量"** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `TURSO_DATABASE_URL` | `libsql://zero-blog-xxx.turso.io` | Turso 数据库 URL |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOi...` | Turso 认证 Token |
| `ADMIN_TOKEN` | `your-custom-admin-token` | 管理后台鉴权 Token（自定义强密码） |
| `NODE_ENV` | `production` | 生产环境标识 |

> ⚠️ **重要**：`ADMIN_TOKEN` 请设置为高强度随机字符串，管理 API 鉴权依赖此 Token。

### 3.3 选择加速区域

- 在创建项目时，**加速区域**选择 **"全球可用区（不含中国大陆）"**
- 这样不需要 ICP 备案即可访问

### 3.4 首次部署

1. 完成以上配置后，点击 **"部署"**
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后获得预览 URL：`https://xxx.edgeone.app`

### 3.5 验证部署

```bash
# 测试首页
curl https://xxx.edgeone.app

# 测试文章列表 API
curl https://xxx.edgeone.app/api/posts

# 测试管理 API（需要 Admin-Token）
curl -H "Admin-Token: your-custom-admin-token" \
     https://xxx.edgeone.app/api/admin/posts?admin=true
```

---

## 4. GitHub Actions 自动化部署

### 4.1 获取 EdgeOne API Token

1. 登录 EdgeOne Pages 控制台
2. 进入 **"账号设置"** → **"API Token"**
3. 点击 **"创建 Token"**
4. 选择权限：`Pages: Full Access`
5. 复制生成的 Token

### 4.2 配置 GitHub Secrets

1. 进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **"New repository secret"**
3. 添加：
   - **Name**：`EDGEONE_API_TOKEN`
   - **Secret**：粘贴上面获取的 API Token

### 4.3 自动化部署文件

项目已包含 `.github/workflows/deploy-edgeone.yml`，内容如下：

```yaml
name: Deploy to EdgeOne Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}
          ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}

      - name: Deploy to EdgeOne Pages
        uses: edgeone/deploy-pages-action@main
        with:
          api_token: ${{ secrets.EDGEONE_API_TOKEN }}
          project_name: zero-blog
```

> 💡 **可选**：如果希望在 Actions 中使用环境变量，还需要在 GitHub Secrets 中添加 `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN` 和 `ADMIN_TOKEN`。

### 4.4 触发部署

- **自动触发**：推送到 `main` 分支
- **手动触发**：GitHub → Actions → Deploy to EdgeOne Pages → Run workflow

---

## 5. 自定义域名绑定

### 5.1 添加域名

1. 在 EdgeOne Pages 项目设置 → **"域名管理"**
2. 点击 **"添加域名"**
3. 输入你的域名，如 `www.yourblog.com`

### 5.2 配置 DNS

在你的域名 DNS 管理界面，添加 CNAME 记录：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| CNAME | `www` | `xxx.edgeone.app` |
| CNAME | `@` | `xxx.edgeone.app`（可选，用于根域名） |

> ⚠️ 根域名（`@`）使用 CNAME 可能与某些 DNS 服务商冲突，建议使用 `www` 子域名。

### 5.3 SSL 证书

- EdgeOne Pages **自动签发 SSL 证书**，无需手动配置
- DNS 解析生效后（通常 5-30 分钟），证书自动下发
- 支持 HTTP → HTTPS 自动跳转

### 5.4 验证域名

```bash
# 测试新域名
curl -I https://www.yourblog.com

# 应返回 HTTP/2 200 和有效的 SSL 证书
```

---

## 6. 部署后验证

### 6.1 前台页面检查

| 页面 | URL | 预期结果 |
|------|-----|----------|
| 首页 | `/` | 文章列表正常显示，卡片布局正确 |
| 文章详情 | `/posts/{slug}` | Markdown 内容渲染正常，图片自适应 |
| 分类筛选 | `/?category={slug}` | 仅显示该分类下的文章 |
| 标签筛选 | `/?tag={slug}` | 仅显示该标签下的文章 |

### 6.2 管理后台检查

| 页面 | URL | 需要操作 |
|------|-----|----------|
| 登录页 | `/admin/login` | 输入 Admin-Token 登录 |
| 仪表盘 | `/admin/dashboard` | 查看统计数据 |
| 文章管理 | `/admin/posts` | 创建/编辑/删除文章 |
| 分类标签 | `/admin/taxonomy` | 管理分类和标签 |
| 评论管理 | `/admin/comments` | 审核评论 |
| 用户管理 | `/admin/users` | 管理用户 |
| 系统设置 | `/admin/settings` | 修改站点设置 |

### 6.3 API 功能测试

```bash
# 1. 获取文章列表
curl https://your-domain.com/api/posts

# 2. 获取文章详情
curl https://your-domain.com/api/posts/my-first-post

# 3. 创建文章（需要 Admin-Token）
curl -X POST https://your-domain.com/api/posts \
  -H "Content-Type: application/json" \
  -H "Admin-Token: your-custom-admin-token" \
  -d '{
    "title": "测试文章",
    "slug": "test-post",
    "content": "这是一篇测试文章的内容。",
    "excerpt": "测试摘要",
    "published": true
  }'

# 4. 更新文章
curl -X PUT https://your-domain.com/api/posts/test-post \
  -H "Content-Type: application/json" \
  -H "Admin-Token: your-custom-admin-token" \
  -d '{"title": "更新后的标题"}'

# 5. 删除文章
curl -X DELETE https://your-domain.com/api/posts/test-post \
  -H "Admin-Token: your-custom-admin-token"

# 6. 提交评论
curl -X POST https://your-domain.com/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "post_slug": "my-first-post",
    "author_name": "访客",
    "author_email": "visitor@example.com",
    "content": "好文章！"
  }'
```

---

## 7. 常见问题 FAQ

### Q1: 部署后页面显示 404

**原因**：构建输出配置不正确

**解决**：
- 确认 `edgeone.json` 中 `"outputDir": ".next"`
- 确认 `package.json` 中有 `"build": "next build"` 脚本
- 检查 EdgeOne 控制台构建日志是否有报错

---

### Q2: 数据库连接失败（500 错误）

**原因**：环境变量未正确配置或 Token 过期

**解决**：
```bash
# 1. 检查环境变量是否正确
# 在 EdgeOne Pages 控制台 → 项目设置 → 环境变量 确认：
# - TURSO_DATABASE_URL 格式为 libsql://xxx.turso.io
# - TURSO_AUTH_TOKEN 以 eyJ 开头

# 2. 如果 Token 过期，重新生成
turso db tokens create zero-blog
# 然后更新 EdgeOne 的 TURSO_AUTH_TOKEN 环境变量

# 3. 本地测试连接
turso db shell zero-blog "SELECT 1"
```

---

### Q3: 图片无法加载

**原因**：`next.config.ts` 未配置 `images.remotePatterns`

**解决**：确认 `next.config.ts` 包含：

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
```

---

### Q4: 中国大陆访问较慢

**原因**：当前选择了"全球可用区（不含中国大陆）"

**说明**：
- 未备案无法使用中国大陆节点
- EdgeOne 全球 CDN 加速可以提供较好的海外访问体验
- 如需中国大陆加速，需完成 ICP 备案后在 EdgeOne 控制台切换区域

---

### Q5: 环境变量不生效

**原因**：环境变量修改后未重新部署

**解决**：
- EdgeOne Pages 修改环境变量后需要**重新部署**才能生效
- 在控制台 → 项目 → 部署记录 → 点击"重新部署"
- 或触发一次新的 Git push

---

### Q6: 管理后台无法登录

**原因**：Admin-Token 不匹配

**解决**：
- 确认登录时输入的 Token 与 EdgeOne 环境变量中的 `ADMIN_TOKEN` 完全一致
- Token 区分大小写，前后不要有多余空格
- 建议先在本地 `.env.local` 中测试确认 Token 可用

---

### Q7: 构建时 TypeScript 错误

**解决**：
```bash
# 本地先验证构建
npm run build

# 修复所有错误后提交
git add -A
git commit -m "fix: resolve build errors"
git push origin main
```

---

### Q8: GitHub Actions 部署失败

**原因**：`EDGEONE_API_TOKEN` 未配置或无权限

**解决**：
1. 确认 GitHub Secrets 中已添加 `EDGEONE_API_TOKEN`
2. 确认 Token 有 `Pages: Full Access` 权限
3. 在 GitHub → Actions 查看详细错误日志
4. 确认 `project_name` 与 EdgeOne 项目名一致

---

### Q9: 评论功能不工作

**说明**：评论 API 在 `/api/v1/comments`，前端提交评论的表单指向此端点。如果使用简化版 API（`/api/comments`），需确认对应路由是否存在。

---

### Q10: FTS5 全文搜索不工作

**说明**：`post_fts` 虚拟表和触发器需要在建表时创建。如果忘记执行 `schema.sql`，可以单独补执行 FTS5 相关 SQL（见第 2.3 节 schema.sql 内容）。

---

## 附录：一键初始化脚本

```bash
#!/bin/bash
# init-turso.sh — 一键初始化 Turso 数据库

set -e

DB_NAME="zero-blog"

echo "1. 创建数据库..."
turso db create $DB_NAME

URL=$(turso db show $DB_NAME --url)
TOKEN=$(turso db tokens create $DB_NAME)

echo "2. 执行 Schema..."
turso db shell $DB_NAME < schema.sql
turso db shell $DB_NAME < migrations/002_categories_tags.sql
turso db shell $DB_NAME < migrations/003_admin_tables.sql
turso db shell $DB_NAME < migrations/004_rbac_i18n_events.sql

echo "3. 导入种子数据..."
turso db shell $DB_NAME < seed.sql

echo ""
echo "========================================="
echo "数据库初始化完成！"
echo "========================================="
echo "DATABASE_URL: $URL"
echo "AUTH_TOKEN:   $TOKEN"
echo ""
echo "请将以上值配置到 EdgeOne Pages 环境变量中"
echo "========================================="
```

保存为 `init-turso.sh` 并执行：

```bash
chmod +x init-turso.sh
./init-turso.sh
```
