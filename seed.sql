-- ============================================
-- 种子数据 — 测试用用户 & 文章
-- ============================================

-- 管理员用户（密码哈希为占位值，实际项目用 bcrypt 等）
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@zero.blog', '$2b$10$placeholder_hash_not_real', 'Zero Admin', 'admin');

-- 测试文章 1（已发布）
INSERT INTO posts (title, slug, content, excerpt, cover_image, published, author_id)
VALUES (
  '用 Turso 搭建下一代博客',
  'building-next-gen-blog-with-turso',
  '## 为什么选择 Turso？

Turso 是基于 libSQL 的边缘数据库，兼容 SQLite 协议，天然适合内容型应用。

### 核心优势

1. **边缘部署** — 数据就近读取，延迟极低
2. **SQLite 兼容** — 零学习成本，本地开发直接用
3. **嵌入式复制** — 支持只读副本嵌入应用进程

```sql
SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC;
```

让我们开始吧！',
  '了解如何用 Turso 边缘数据库 + Next.js App Router 构建高性能博客系统。',
  '/images/turso-blog.jpg',
  1,
  1
);

-- 测试文章 2（草稿）
INSERT INTO posts (title, slug, content, excerpt, cover_image, published, author_id)
VALUES (
  'App Router 数据获取最佳实践',
  'app-router-data-fetching-best-practices',
  '## Server Components vs Client Components

在 Next.js App Router 中，数据获取策略直接影响性能。

### Server Components（默认）

- 可直接访问后端资源
- 零客户端 JS 开销
- 适合 SEO 关键内容

### Client Components

- 适合交互密集场景
- 使用 `"use client"` 指令

> 💡 混合使用两者才是最佳策略。',
  '深入理解 Next.js App Router 中 Server/Client Components 的数据获取模式。',
  '/images/app-router.jpg',
  0,
  1
);
