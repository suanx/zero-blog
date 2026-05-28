# Zero Blog — 全面功能与安全检查报告

**检查日期**：2026-05-28
**项目版本**：Next.js 16.2.6 | TailwindCSS 4 | Turso

---

## 1. 环境与配置

### ✅ 1.1 `.env.example` 文件存在且包含所有必需变量
- 文件路径：`zero-blog/.env.example`
- 包含：`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`ADMIN_TOKEN`
- ⚠️ 注意：`JWT_SECRET` 已从代码中移除（项目使用 Admin-Token 鉴权，不使用 JWT），但审计清单中提及。**无需添加。**

### ✅ 1.2 `next.config.ts` 图片域名配置
- 已配置 `images.remotePatterns` 允许所有 HTTPS 域名
- 文件：`next.config.ts` 第 6-12 行

### ✅ 1.3 `package.json` 脚本完整
- `dev` → `next dev`
- `build` → `next build`
- `start` → `next start`
- `lint` → `eslint`
- 额外：`edgeone:init`、`edgeone:dev`、`edgeone:deploy`

### ✅ 1.4 `edgeone.json` 部署配置正确
- `buildCommand`: `npm run build`
- `outputDir`: `.next`
- `installCommand`: `npm install`
- `framework`: `nextjs`
- 环境变量声明：TURSO_DATABASE_URL、TURSO_AUTH_TOKEN、ADMIN_TOKEN
- 函数最大时长：30s

---

## 2. 数据库

### ✅ 2.1 表结构完整
| 表名 | 文件 | 说明 |
|------|------|------|
| `users` | schema.sql | 用户表（id, email, password_hash, name, role） |
| `posts` | schema.sql | 文章表（title, slug, content, excerpt, cover_image, published, views） |
| `post_fts` | schema.sql | FTS5 全文搜索虚拟表 |
| `categories` | migrations/002 | 分类表 |
| `tags` | migrations/002 | 标签表 |
| `post_categories` | migrations/002 | 文章-分类关联表 |
| `post_tags` | migrations/002 | 文章-标签关联表 |
| `comments` | migrations/003 | 评论表（含 pending/approved/spam 状态） |
| `settings` | migrations/003 | 系统设置表 |
| `post_translations` | migrations/004 | 文章翻译表 |
| `post_versions` | migrations/004 | 文章版本历史 |
| `webhooks` | migrations/004 | Webhook 配置 |
| `webhook_deliveries` | migrations/004 | Webhook 投递记录 |

### ✅ 2.2 数据库客户端正确导出
- `lib/db.js` 导出：`db`（Proxy 懒加载）、`executeQuery`、`executeBatch`
- 使用 `@libsql/client/web` 驱动
- 模块级懒初始化（不阻塞导入时）

### ✅ 2.3 SQL 查询参数化
- `lib/api-helpers.js` 中 `paginatedQuery`、`adminPaginatedQuery` 使用 `?` 占位符
- `lib/api-helpers.js` 中 `syncAssociations` 使用参数化
- `app/api/admin/users/route.js` 中动态条件使用参数化
- ✅ **未发现直接拼接用户输入的 SQL**

### ✅ 2.4 CRUD 操作完整
- 创建文章：`POST /api/posts` + Admin-Token
- 读取文章：`GET /api/posts`（列表+分页）、`GET /api/posts/:slug`（详情）
- 更新文章：`PUT /api/posts/:slug` + Admin-Token
- 删除文章：`DELETE /api/posts/:slug` + Admin-Token

---

## 3. API 功能

### ✅ 3.1 `GET /api/posts` 分页和筛选
- 支持 `page`、`pageSize` 参数
- 支持 `category`（按分类 slug 筛选）
- 支持 `tag`（按标签 slug 筛选）
- 支持 `admin=true` 显示未发布文章
- 返回 `total`、`totalPages` 分页信息
- 关联查询分类和标签

### ✅ 3.2 `GET /api/posts/:slug` 单篇详情
- 返回完整文章内容 + 分类 + 标签
- 返回作者信息
- 设置 Cache-Control 缓存头

### ✅ 3.3 写操作鉴权
- `POST /api/posts` → 验证 `Admin-Token` 请求头
- `PUT /api/posts/:slug` → 验证 `Admin-Token`
- `DELETE /api/posts/:slug` → 验证 `Admin-Token`
- 使用 `crypto.timingSafeEqual` 防时序攻击

### ✅ 3.4 评论 API
- `GET /api/admin/comments` — 管理评论列表（分页+状态筛选）
- `POST /api/v1/comments` — 提交评论
- `PUT /api/admin/comments/:id` — 更新评论状态
- `DELETE /api/admin/comments/:id` — 删除评论
- 评论状态支持：pending、approved、spam

### ✅ 3.5 用户管理 API
- `GET /api/admin/users` — 用户列表（分页+角色筛选）
- `POST /api/admin/users` — 创建用户（含邮箱唯一性校验）
- `PUT /api/admin/users/:id` — 更新用户
- `DELETE /api/admin/users/:id` — 删除用户

### ✅ 3.6 输入验证
- `lib/api-helpers.js` 中 `validatePost` 函数：
  - slug 格式验证：`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
  - title 长度限制：200 字符
  - content 长度限制：1,000,000 字符

---

## 4. 安全性

### ✅ 4.1 Timing-safe Token 比较
- `lib/api-helpers.js` 第 8-12 行：`crypto.timingSafeEqual`
- `src/lib/utils/auth.js` 中同样使用 timing-safe 比较

### ✅ 4.2 错误响应不泄露内部信息
- `lib/api-helpers.js` `errorResponse` 函数（第 126-133 行）：
  - 生产环境：仅返回 `{ error: "用户友好消息" }`
  - 开发环境：额外返回 `{ detail: error.message }`
- `src/lib/utils/response.js` 中同样逻辑

### ✅ 4.3 DOMPurify 净化 HTML
- `app/posts/[slug]/page.js` 第 9 行：`import DOMPurify from 'dompurify'`
- 第 161 行：`dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}`
- TipTap 编辑器产生的 HTML 在渲染前被净化

### ⚠️ 4.4 Rate Limiting（未实现）
- **当前状态**：所有 API 路由未实现频率限制
- **风险**：评论提交、登录尝试可能被滥用
- **修复方案**：在 EdgeOne Pages 层面配置 WAF 规则，或在 middleware 中实现简单限流

### ⚠️ 4.5 登录功能
- `app/api/admin/login/route.js` — 检查密码是否匹配（使用 bcrypt 比较）
- `app/admin/login/page.tsx` — 前端登录页面
- **注意**：登录后使用 localStorage 存储 admin token，非 JWT session。适合当前的 token 认证架构。

---

## 5. 前端页面

### ✅ 5.1 布局组件
- `app/layout.js` — 根布局：HTML + body + globals.css
- `app/admin/layout.tsx` — 管理后台布局：Sidebar + Header + Main content

### ✅ 5.2 移动端适配
- `components/bottomtabbar.jsx` — 底部 Tab Bar（首页/分类/标签/设置）
- `components/mobilepostcard.jsx` — 移动端文章卡片（紧凑布局）
- 首页响应式：桌面端两栏布局，移动端单栏+底部 Tab

### ✅ 5.3 "use client" 声明
- 所有需要交互的页面组件已正确声明 `"use client"`
- `app/admin/*.tsx` 页面均使用客户端渲染
- `app/posts/[slug]/page.js` 使用客户端渲染

---

## 6. 部署兼容性

### ✅ 6.1 无 Node.js 专有模块
- API 路由仅使用 `crypto`（Node.js 内置，Edge One 支持 Web Crypto）
- 数据库使用 `@libsql/client/web`（Web 兼容驱动）
- ✅ **未使用 `fs`、`path`、`child_process` 等**

### ✅ 6.2 GitHub Actions 配置
- 文件：`.github/workflows/deploy-edgeone.yml`
- 触发：push 到 main 分支 + 手动触发
- 步骤：Checkout → Node.js 20 → npm ci → npm run build → Deploy to EdgeOne
- 使用 `edgeone/deploy-pages-action@main`

### ✅ 6.3 `.gitignore` 完整
- 已排除：`/node_modules`、`/.next/`、`.env*`、`/out/`、`*.tsbuildinfo`、`next-env.d.ts`
- ✅ `.env.local` 不会被提交

---

## 7. 未通过项汇总

| # | 项目 | 状态 | 严重性 | 修复建议 |
|---|------|------|--------|----------|
| 1 | Rate Limiting 未实现 | ⚠️ | 中 | 在 EdgeOne WAF 配置限流规则，或添加 middleware 限流 |
| 2 | 5 个未使用的 npm 依赖 | ⚠️ | 低 | `npm uninstall @tursodatabase/serverless react-markdown remark-gfm @radix-ui/react-navigation-menu @radix-ui/react-popover` |
| 3 | 5 个未使用的组件文件 | ⚠️ | 低 | 删除 postcard.jsx、pagination.jsx、tooltip.tsx、separator.tsx、avatar.tsx |
| 4 | 2 个空目录 | ⚠️ | 低 | 删除 app/admin/categories/ 和 app/admin/tags/ |
| 5 | 重复的数据库客户端 | ⚠️ | 低 | lib/db.js 和 src/lib/db.js 功能重复，建议长期统一 |
