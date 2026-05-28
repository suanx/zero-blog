-- ============================================
-- 迁移 002: 分类 & 标签
-- ============================================

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

-- 文章 ↔ 分类（多对多）
CREATE TABLE IF NOT EXISTS post_categories (
  post_id     INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id)     REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 文章 ↔ 标签（多对多）
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pc_category ON post_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_pt_tag      ON post_tags(tag_id);

-- ── 种子数据 ──────────────────────────────────────

-- 分类
INSERT OR IGNORE INTO categories (name, slug) VALUES
  ('前端开发',   'frontend'),
  ('后端技术',   'backend'),
  ('DevOps',    'devops'),
  ('数据库',    'database'),
  ('开源项目',   'open-source');

-- 标签
INSERT OR IGNORE INTO tags (name, slug) VALUES
  ('Next.js',   'nextjs'),
  ('Turso',     'turso'),
  ('TypeScript','typescript'),
  ('React',     'react'),
  ('SQLite',    'sqlite'),
  ('TailwindCSS','tailwindcss'),
  ('Edge',      'edge');

-- 将种子文章关联到分类和标签
INSERT OR IGNORE INTO post_categories (post_id, category_id)
  SELECT p.id, c.id FROM posts p, categories c
  WHERE p.slug = 'building-next-gen-blog-with-turso' AND c.slug IN ('backend', 'database');

INSERT OR IGNORE INTO post_categories (post_id, category_id)
  SELECT p.id, c.id FROM posts p, categories c
  WHERE p.slug = 'app-router-data-fetching-best-practices' AND c.slug = 'frontend';

INSERT OR IGNORE INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t
  WHERE p.slug = 'building-next-gen-blog-with-turso' AND t.slug IN ('turso', 'nextjs');

INSERT OR IGNORE INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t
  WHERE p.slug = 'app-router-data-fetching-best-practices' AND t.slug IN ('nextjs', 'react');
