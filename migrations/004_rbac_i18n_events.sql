-- ============================================
-- Migration 004: RBAC + i18n + Events + Versions
-- ============================================

-- ── 文章翻译表 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS post_translations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id   INTEGER NOT NULL,
  locale    TEXT    NOT NULL CHECK (locale IN ('en','zh','ja','ko','fr','de','es')),
  title     TEXT    NOT NULL,
  content   TEXT    NOT NULL DEFAULT '',
  excerpt   TEXT    NOT NULL DEFAULT '',
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE (post_id, locale)
);

-- ── 文章版本历史表 ──────────────────────────────
CREATE TABLE IF NOT EXISTS post_versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL,
  version    INTEGER NOT NULL,
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL DEFAULT '',
  author_id  INTEGER,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Webhook 表 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  url        TEXT    NOT NULL,
  events     TEXT    NOT NULL,  -- JSON 数组: ["post.published", ...]
  secret     TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Webhook 投递记录表 ──────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id  INTEGER NOT NULL,
  event       TEXT    NOT NULL,
  payload     TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- ── 索引 ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_post_translations_post   ON post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_post_translations_locale ON post_translations(post_id, locale);
CREATE INDEX IF NOT EXISTS idx_post_versions_post       ON post_versions(post_id, version);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_wh    ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_st    ON webhook_deliveries(status);
