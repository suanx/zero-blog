-- ============================================
-- Zero Blog — Turso (libSQL) 数据库 Schema
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','editor','user')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  content      TEXT    NOT NULL DEFAULT '',
  excerpt      TEXT    NOT NULL DEFAULT '',
  cover_image  TEXT    NOT NULL DEFAULT '',
  published    INTEGER NOT NULL DEFAULT 0,
  author_id    INTEGER NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_posts_slug      ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author    ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);

-- ============================================
-- FTS5 全文搜索
-- ============================================
CREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(
  title,
  content,
  excerpt,
  content='posts',
  content_rowid='id',
  tokenize='unicode61'
);

-- 保持 FTS 索引与 posts 表同步的触发器
CREATE TRIGGER IF NOT EXISTS post_fts_insert AFTER INSERT ON posts BEGIN
  INSERT INTO post_fts(rowid, title, content, excerpt)
  VALUES (new.id, new.title, new.content, new.excerpt);
END;

CREATE TRIGGER IF NOT EXISTS post_fts_update AFTER UPDATE ON posts BEGIN
  DELETE FROM post_fts WHERE rowid = old.id;
  INSERT INTO post_fts(rowid, title, content, excerpt)
  VALUES (new.id, new.title, new.content, new.excerpt);
END;

CREATE TRIGGER IF NOT EXISTS post_fts_delete AFTER DELETE ON posts BEGIN
  DELETE FROM post_fts WHERE rowid = old.id;
END;
