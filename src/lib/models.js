/**
 * 数据模型定义 — 单一数据源
 *
 * 集中定义所有表结构、字段类型、关系和验证规则。
 * Service 层和 Validation 引擎从此处读取元数据。
 */

// ── 字段类型枚举 ──────────────────────────────────
export const FieldTypes = {
  STRING: "string",
  TEXT: "text",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  DATETIME: "datetime",
  JSON: "json",
};

// ── 表定义 ────────────────────────────────────────

export const models = {
  // ── 用户 ──────────────────────────────────────
  users: {
    tableName: "users",
    label: "用户",
    fields: {
      id:           { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      email:        { type: FieldTypes.STRING,  required: true, unique: true, maxLength: 255 },
      password_hash:{ type: FieldTypes.STRING,  required: true, maxLength: 255 },
      name:         { type: FieldTypes.STRING,  required: false, default: "", maxLength: 100 },
      role:         { type: FieldTypes.STRING,  required: false, default: "viewer", enum: ["admin", "editor", "viewer"] },
      created_at:   { type: FieldTypes.DATETIME, default: "datetime('now')" },
    },
    indexes: [
      { columns: ["email"], unique: true },
    ],
  },

  // ── 文章 ──────────────────────────────────────
  posts: {
    tableName: "posts",
    label: "文章",
    fields: {
      id:           { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      title:        { type: FieldTypes.STRING,  required: true, maxLength: 200 },
      slug:         { type: FieldTypes.STRING,  required: true, unique: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxLength: 200 },
      content:      { type: FieldTypes.TEXT,     required: false, default: "", maxLength: 1_000_000 },
      excerpt:      { type: FieldTypes.TEXT,     required: false, default: "", maxLength: 5000 },
      cover_image:  { type: FieldTypes.STRING,  required: false, default: "", maxLength: 500 },
      published:    { type: FieldTypes.BOOLEAN,  required: false, default: false },
      author_id:    { type: FieldTypes.INTEGER,  required: true, references: "users.id" },
      views:        { type: FieldTypes.INTEGER,  required: false, default: 0 },
      created_at:   { type: FieldTypes.DATETIME, default: "datetime('now')" },
      updated_at:   { type: FieldTypes.DATETIME, default: "datetime('now')" },
    },
    indexes: [
      { columns: ["slug"], unique: true },
      { columns: ["published", "created_at DESC"] },
      { columns: ["author_id"] },
    ],
  },

  // ── 评论 ──────────────────────────────────────
  comments: {
    tableName: "comments",
    label: "评论",
    fields: {
      id:           { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      post_id:      { type: FieldTypes.INTEGER, required: true, references: "posts.id" },
      author_name:  { type: FieldTypes.STRING,  required: true, maxLength: 100 },
      author_email: { type: FieldTypes.STRING,  required: false, maxLength: 255 },
      content:      { type: FieldTypes.TEXT,     required: true, maxLength: 5000 },
      status:       { type: FieldTypes.STRING,  required: false, default: "pending", enum: ["pending", "approved", "spam"] },
      created_at:   { type: FieldTypes.DATETIME, default: "datetime('now')" },
    },
  },

  // ── 分类 ──────────────────────────────────────
  categories: {
    tableName: "categories",
    label: "分类",
    fields: {
      id:     { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      name:   { type: FieldTypes.STRING,  required: true, maxLength: 100 },
      slug:   { type: FieldTypes.STRING,  required: true, unique: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxLength: 100 },
    },
  },

  // ── 标签 ──────────────────────────────────────
  tags: {
    tableName: "tags",
    label: "标签",
    fields: {
      id:   { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      name: { type: FieldTypes.STRING,  required: true, maxLength: 100 },
      slug: { type: FieldTypes.STRING,  required: true, unique: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, maxLength: 100 },
    },
  },

  // ── 文章-分类关联 ────────────────────────────
  post_categories: {
    tableName: "post_categories",
    label: "文章-分类关联",
    fields: {
      post_id:     { type: FieldTypes.INTEGER, required: true, references: "posts.id" },
      category_id: { type: FieldTypes.INTEGER, required: true, references: "categories.id" },
    },
    compositeKey: ["post_id", "category_id"],
  },

  // ── 文章-标签关联 ────────────────────────────
  post_tags: {
    tableName: "post_tags",
    label: "文章-标签关联",
    fields: {
      post_id: { type: FieldTypes.INTEGER, required: true, references: "posts.id" },
      tag_id:  { type: FieldTypes.INTEGER, required: true, references: "tags.id" },
    },
    compositeKey: ["post_id", "tag_id"],
  },

  // ── 设置 ──────────────────────────────────────
  settings: {
    tableName: "settings",
    label: "系统设置",
    fields: {
      key:   { type: FieldTypes.STRING, primary: true, maxLength: 100 },
      value: { type: FieldTypes.TEXT, default: "" },
    },
  },

  // ── 文章翻译（v1 新增） ──────────────────────
  post_translations: {
    tableName: "post_translations",
    label: "文章翻译",
    fields: {
      id:       { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      post_id:  { type: FieldTypes.INTEGER, required: true, references: "posts.id" },
      locale:   { type: FieldTypes.STRING,  required: true, maxLength: 10, enum: ["en", "zh", "ja", "ko", "fr", "de", "es"] },
      title:    { type: FieldTypes.STRING,  required: true, maxLength: 200 },
      content:  { type: FieldTypes.TEXT,    required: false, default: "" },
      excerpt:  { type: FieldTypes.TEXT,    required: false, default: "" },
    },
    indexes: [
      { columns: ["post_id", "locale"], unique: true },
    ],
  },

  // ── 文章版本历史（v1 新增） ──────────────────
  post_versions: {
    tableName: "post_versions",
    label: "文章版本",
    fields: {
      id:        { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      post_id:   { type: FieldTypes.INTEGER, required: true, references: "posts.id" },
      version:   { type: FieldTypes.INTEGER, required: true },
      title:     { type: FieldTypes.STRING,  required: true, maxLength: 200 },
      content:   { type: FieldTypes.TEXT,    required: false, default: "" },
      author_id: { type: FieldTypes.INTEGER, required: false },
      created_at:{ type: FieldTypes.DATETIME, default: "datetime('now')" },
    },
    indexes: [
      { columns: ["post_id", "version"] },
    ],
  },

  // ── Webhook（v1 新增） ────────────────────────
  webhooks: {
    tableName: "webhooks",
    label: "Webhook",
    fields: {
      id:       { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      url:      { type: FieldTypes.STRING,  required: true, maxLength: 500 },
      events:   { type: FieldTypes.TEXT,    required: true },  // JSON 数组: ["post.published", ...]
      secret:   { type: FieldTypes.STRING,  required: false, maxLength: 255 },
      active:   { type: FieldTypes.BOOLEAN, required: false, default: true },
      created_at: { type: FieldTypes.DATETIME, default: "datetime('now')" },
    },
  },

  // ── Webhook 投递记录 ──────────────────────────
  webhook_deliveries: {
    tableName: "webhook_deliveries",
    label: "Webhook 投递记录",
    fields: {
      id:           { type: FieldTypes.INTEGER, primary: true, autoIncrement: true },
      webhook_id:   { type: FieldTypes.INTEGER, required: true, references: "webhooks.id" },
      event:        { type: FieldTypes.STRING,  required: true, maxLength: 100 },
      payload:      { type: FieldTypes.TEXT,    required: true },
      status:       { type: FieldTypes.STRING,  required: false, default: "pending", enum: ["pending", "success", "failed"] },
      attempts:     { type: FieldTypes.INTEGER, required: false, default: 0 },
      last_error:   { type: FieldTypes.TEXT,    required: false },
      created_at:   { type: FieldTypes.DATETIME, default: "datetime('now')" },
    },
    indexes: [
      { columns: ["webhook_id"] },
      { columns: ["status"] },
    ],
  },
};

// ── 关联表映射（便于 Service 层使用） ─────────────
export const associations = {
  post_categories: {
    junction: "post_categories",
    sourceFK: "post_id",
    targetFK: "category_id",
    targetTable: "categories",
  },
  post_tags: {
    junction: "post_tags",
    sourceFK: "post_id",
    targetFK: "tag_id",
    targetTable: "tags",
  },
};

// ── 辅助函数 ──────────────────────────────────────

/**
 * 获取模型定义
 */
export function getModel(modelName) {
  return models[modelName] || null;
}

/**
 * 获取关联配置
 */
export function getAssociation(name) {
  return associations[name] || null;
}

/**
 * 获取表的列名列表（排除主键和 autoIncrement）
 */
export function getFieldNames(modelName) {
  const model = models[modelName];
  if (!model) return [];
  return Object.keys(model.fields).filter(
    (k) => !model.fields[k].primary && !model.fields[k].autoIncrement
  );
}
