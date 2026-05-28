'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/admin/page-header';

// ── Types ──────────────────────────────────────────────
interface TaxonomyItem {
  id: number;
  name: string;
  slug: string;
  count: number;
  created_at: string;
}

interface ApiResponse {
  status: string;
  data: TaxonomyItem[];
}

// ── Helpers ────────────────────────────────────────────
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

// ── Skeleton Rows ──────────────────────────────────────
function SkeletonTableRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
          <TableCell>
            <div className="flex gap-1 justify-end">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Taxonomy Form ──────────────────────────────────────
function TaxonomyForm({
  data,
  onChange,
}: {
  data: { name: string; slug: string };
  onChange: (d: { name: string; slug: string }) => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="tax-name">名称</Label>
        <Input
          id="tax-name"
          placeholder="请输入名称"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tax-slug">别名 (Slug)</Label>
        <Input
          id="tax-slug"
          placeholder="请输入别名，如 technology"
          value={data.slug}
          onChange={(e) => onChange({ ...data, slug: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Taxonomy Table ─────────────────────────────────────
function TaxonomyTable({
  items,
  loading,
  type,
  onEdit,
  onDelete,
}: {
  items: TaxonomyItem[];
  loading: boolean;
  type: string;
  onEdit: (item: TaxonomyItem) => void;
  onDelete: (item: TaxonomyItem) => void;
}) {
  const Icon = type === 'category' ? FolderTree : Tag;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">名称</TableHead>
            <TableHead className="font-semibold">别名 (Slug)</TableHead>
            <TableHead className="font-semibold text-center">文章数</TableHead>
            <TableHead className="font-semibold text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <SkeletonTableRows />
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Icon className="h-10 w-10 opacity-40" />
                  <p className="text-sm">
                    暂无{type === 'category' ? '分类' : '标签'}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {item.slug}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-muted-foreground">{item.count ?? 0}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────
export default function AdminTaxonomyPage() {
  const [activeTab, setActiveTab] = useState('category');

  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null);
  const [formData, setFormData] = useState<{ name: string; slug: string }>({
    name: '',
    slug: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deletingItem, setDeletingItem] = useState<TaxonomyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(
    async (type: string) => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`/api/v1/admin/taxonomy?type=${type}`, {
          headers: { 'Admin-Token': token },
        });

        if (res.status === 401) return;
        if (!res.ok) throw new Error('加载失败');

        const json: ApiResponse = await res.json();
        if (type === 'category') {
          setCategories(json.data || []);
        } else {
          setTags(json.data || []);
        }
      } catch (err) {
        console.error('加载分类/标签失败:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    loadItems('category');
    loadItems('tag');
  }, [loadItems]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({ name: '', slug: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (item: TaxonomyItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, slug: item.slug });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('请输入名称');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const isEdit = !!editingItem;
      const type = activeTab;

      const url = isEdit
        ? `/api/v1/admin/taxonomy/${editingItem.id}`
        : '/api/v1/admin/taxonomy';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Admin-Token': token,
        },
        body: JSON.stringify({ ...formData, type }),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadItems(type);
      } else {
        const data = await res.json();
        alert(data.message || '保存失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/admin/taxonomy/${deletingItem.id}`, {
        method: 'DELETE',
        headers: { 'Admin-Token': token },
      });

      if (res.ok || res.status === 204) {
        setDeletingItem(null);
        loadItems(activeTab);
      } else {
        const data = await res.json();
        alert(data.message || '删除失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const currentItems = activeTab === 'category' ? categories : tags;
  const currentLabel = activeTab === 'category' ? '分类' : '标签';

  return (
    <div className="space-y-6">
      <PageHeader
        title="分类/标签管理"
        description="管理博客文章的分类和标签"
        actions={
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            新建{currentLabel}
          </Button>
        }
      />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="category" className="gap-2">
                <FolderTree className="h-4 w-4" />
                分类
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {categories.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="tag" className="gap-2">
                <Tag className="h-4 w-4" />
                标签
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {tags.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="category" className="mt-0">
            <TaxonomyTable
              items={categories}
              loading={loading}
              type="category"
              onEdit={openEditDialog}
              onDelete={setDeletingItem}
            />
          </TabsContent>

          <TabsContent value="tag" className="mt-0">
            <TaxonomyTable
              items={tags}
              loading={loading}
              type="tag"
              onEdit={openEditDialog}
              onDelete={setDeletingItem}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? `编辑${currentLabel}`
                : `新建${currentLabel}`}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? `修改${currentLabel}信息`
                : `创建一个新的${currentLabel}`}
            </DialogDescription>
          </DialogHeader>
          <TaxonomyForm data={formData} onChange={setFormData} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除{currentLabel}「{deletingItem?.name}」吗？
              {deletingItem?.count ? `关联了 ${deletingItem.count} 篇文章，` : ''}
              此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingItem(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
