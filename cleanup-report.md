# Zero-Blog 项目清理报告

> 生成时间：2026-05-28  
> 项目路径：`zero-blog/`

---

## 1. 项目基本信息

| 项目属性 | 详情 |
|---------|------|
| 技术栈 | Next.js 16.2.6 (App Router) + TailwindCSS 4 + Turso + EdgeOne Pages |
| 源文件数量 | 93 个（不含 node_modules、.next、.tokeny） |
| 包管理器 | npm |

---

## 2. 未使用的 npm 依赖

以下依赖在 `package.json` 中声明，但**未被任何源文件 import**：

| # | 包名 | 声明位置 | 原因说明 | 风险等级 |
|---|------|---------|---------|---------|
| 1 | `@tursodatabase/serverless` | dependencies | 项目使用的是 `@libsql/client`，此包未被 import | 🟢 低 |
| 2 | `react-markdown` | dependencies | 富文本渲染已改用 TipTap，此包未被 import | 🟢 低 |
| 3 | `remark-gfm` | dependencies | 同上，未被 import | 🟢 低 |
| 4 | `@radix-ui/react-navigation-menu` | dependencies | 未被任何组件 import | 🟢 低 |
| 5 | `@radix-ui/react-popover` | dependencies | 未被任何组件 import | 🟢 低 |

**建议操作**：执行以下命令移除：

```bash
npm uninstall @tursodatabase/serverless react-markdown remark-gfm @radix-ui/react-navigation-menu @radix-ui/react-popover
```

---

## 3. 未使用的 UI 组件

以下组件文件存在但**未被任何页面或布局 import**：

| # | 文件路径 | 组件名称 | 未使用原因 | 建议 |
|---|---------|---------|-----------|------|
| 1 | `components/postcard.jsx` | PostCard | 首页已改用 `MobilePostCard` | 🗑️ 删除 |
| 2 | `components/pagination.jsx` | Pagination | 管理后台使用 `components/admin/pagination` | 🗑️ 删除 |
| 3 | `components/ui/tooltip.tsx` | Tooltip | 未被任何页面 import | 🗑️ 删除 |
| 4 | `components/ui/separator.tsx` | Separator | 未被任何页面 import | 🗑️ 删除 |
| 5 | `components/ui/avatar.tsx` | Avatar | 未被任何页面 import（仅自身引用 Radix） | 🗑️ 删除 |

**建议操作**：直接删除上述 5 个文件。

---

## 4. 空目录

| # | 目录路径 | 原因说明 | 当前状态 |
|---|---------|---------|---------|
| 1 | `app/admin/categories/` | 分类管理已迁移至 `app/admin/taxonomy/` | 空目录 |
| 2 | `app/admin/tags/` | 标签管理已迁移至 `app/admin/taxonomy/` | 空目录 |

**建议操作**：删除这两个空目录。

---

## 5. 重复代码分析

### 5.1 双数据库客户端

| 对比项 | `lib/db.js` | `src/lib/db.js` |
|-------|-------------|-----------------|
| 位置 | 项目根级 `lib/` | `src/lib/` |
| 功能 | 数据库连接与查询 | 数据库连接与查询 |
| 使用者 | 前端 API (`/api/posts`, `/api/admin/*`) | v1 API (`/api/v1/*`) |
| 状态 | ✅ 前端实际使用 | ⚠️ 仅 v1 API 使用 |

**问题**：两个文件提供完全相同的功能，造成维护负担。

**建议**：统一为一个数据库客户端，推荐保留 `lib/db.js`。

### 5.2 双 API 体系

| 对比项 | `/api/*`（简化版） | `/api/v1/*`（服务层版） |
|-------|------------------|----------------------|
| 架构 | 直接数据库查询 | 使用 Service 层封装 |
| 前端调用 | ✅ 是 | ❌ 否 |
| 功能完整性 | 完整 | 完整 |
| 状态 | 生产使用 | 预留升级架构 |

**问题**：两套 API 提供完全相同的功能，`/api/v1/*` 未被前端实际使用。

**建议**：
- 短期：保留两套 API，标记 v1 为"预留"
- 长期：待前端迁移至 v1 API 后，移除旧版简化 API

---

## 6. 清理操作汇总

### 6.1 推荐立即执行的操作

| 操作类型 | 数量 | 影响范围 | 风险 |
|---------|------|---------|------|
| 移除未使用依赖 | 5 个 | package.json | 🟢 低 |
| 删除未使用组件 | 5 个 | components/ | 🟢 低 |
| 清理空目录 | 2 个 | app/admin/ | 🟢 低 |

### 6.2 可选的后续优化

| 操作类型 | 说明 | 建议时机 |
|---------|------|---------|
| 统一数据库客户端 | 合并 `lib/db.js` 和 `src/lib/db.js` | 下次重构时 |
| 清理 v1 API | 等待前端完全迁移后移除旧 API | 计划重构时 |

---

## 7. 完整清理命令参考

```bash
# 1. 移除未使用的 npm 依赖
cd zero-blog
npm uninstall @tursodatabase/serverless react-markdown remark-gfm @radix-ui/react-navigation-menu @radix-ui/react-popover

# 2. 删除未使用的组件文件
rm components/postcard.jsx
rm components/pagination.jsx
rm components/ui/tooltip.tsx
rm components/ui/separator.tsx
rm components/ui/avatar.tsx

# 3. 清理空目录
rmdir app/admin/categories
rmdir app/admin/tags

# 4. 验证项目仍可正常构建
npm run build
```

---

## 8. 预期清理效果

| 指标 | 清理前 | 清理后 | 改善 |
|------|-------|-------|------|
| npm 依赖数量 | 待统计 | 减少 5 个 | ↓ |
| 组件文件数量 | 待统计 | 减少 5 个 | ↓ |
| 空目录数量 | 2 个 | 0 个 | ↓ 100% |
| 项目体积 | 待统计 | 减小 | ↓ |

---

*报告完成。建议在清理后运行完整测试以确保功能正常。*
