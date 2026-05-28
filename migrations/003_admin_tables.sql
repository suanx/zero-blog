-- ============================================
-- 零博客 — 管理后台扩展表
-- ============================================

-- ── 评论表 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id       INTEGER NOT NULL,
  author_name   TEXT    NOT NULL DEFAULT '',
  author_email  TEXT    NOT NULL DEFAULT '',
  content       TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'spam')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- ── 系统设置表 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ── 文章阅读量 ──────────────────────────────────────
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

-- ── 用户角色扩展（user → viewer） ───────────────────
-- libSQL 不支持 ALTER CHECK，需重建表
-- 先创建临时表，迁移数据，再替换
CREATE TABLE IF NOT EXISTS users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, email, password_hash, name, role, created_at)
SELECT id, email, password_hash, name,
       CASE WHEN role = 'user' THEN 'viewer' ELSE role END,
       created_at
FROM users;

DROP TABLE IF EXISTS users;
ALTER TABLE users_new RENAME TO users;

-- ── 索引 ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_post    ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status  ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_views      ON posts(views DESC);

-- ── 默认设置 ────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name', 'Zero Blog'),
  ('site_description', '基于 Next.js + Turso 的现代博客'),
  ('site_logo', ''),
  ('posts_per_page', '10'),
  ('social_twitter', ''),
  ('social_github', ''),
  ('social_wechat', ''),
  ('seo_keywords', ''),
  ('analytics_id', '');
