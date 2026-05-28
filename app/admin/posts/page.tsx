'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string;
  published: boolean;
  views: number;
  author: string;
  created_at: string;
  updated_at: string;
  categories: { id: number; name: string; slug: string }[];
  tags: { id: number; name: string; slug: string }[];
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ApiResponse {
  status: string;
  data: Post[];
  meta: PaginationMeta;
}

// ── Helpers ────────────────────────────────────────────
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
  } catch {
    return dateStr;
  }
}

// ── Pagination Component ───────────────────────────────
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getVisiblePages = (): (number | '...')[] => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-muted-foreground">
        第 {page} / {totalPages} 页
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getVisiblePages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 text-xs',
                p === page && 'pointer-events-none'
              )}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Skeleton Table Rows ────────────────────────────────
function SkeletonTableRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-[200px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[80px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[60px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[60px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-[120px]" />
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Main Page Component ────────────────────────────────
export default function AdminPostsPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 15,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 15;

  const loadPosts = useCallback(
    async (page: number = 1) => {
      try {
        const token = getToken();
        if (!token) {
          router.push('/admin/login');
          return;
        }

        const params = new URLSearchParams({
          admin: 'true',
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (search) params.set('search', search);
        if (statusFilter === 'published') params.set('published', 'true');
        if (statusFilter === 'draft') params.set('published', 'false');

        const res = await fetch(`/api/v1/posts?${params}`, {
          headers: { 'Admin-Token': token },
        });

        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }

        if (!res.ok) {
          throw new Error('加载失败');
        }

        const json: ApiResponse = await res.json();
        setPosts(json.data || []);
        setPagination(json.meta || { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
      } catch (err) {
        console.error('加载文章列表失败:', err);
      } finally {
        setLoading(false);
      }
    },
    [router, search, statusFilter]
  );

  // Initial load
  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  // Reset to page 1 on filter change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setLoading(true);
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/posts/${deletingPost.slug}`, {
        method: 'DELETE',
        headers: { 'Admin-Token': token },
      });

      if (res.ok || res.status === 204) {
        setDeletingPost(null);
        loadPosts(pagination.page);
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

  const handlePageChange = (page: number) => {
    setLoading(true);
    loadPosts(page);
  };

  // ── Render ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">文章管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理你的博客文章，共 {pagination.total} 篇
          </p>
        </div>
        <Link href="/admin/posts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新建文章
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文章标题..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setLoading(true);
                  loadPosts(1);
                }
              }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
              >
                <X className="h-3.5 w-3.5" />
                清除筛选
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">标题</TableHead>
                <TableHead className="font-semibold">作者</TableHead>
                <TableHead className="font-semibold">状态</TableHead>
                <TableHead className="font-semibold text-right">阅读量</TableHead>
                <TableHead className="font-semibold">创建时间</TableHead>
                <TableHead className="font-semibold text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonTableRows />
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <FileText className="h-10 w-10 opacity-40" />
                      <p className="text-sm">暂无文章</p>
                      <Link href="/admin/posts/new">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-3.5 w-3.5" />
                          创建第一篇文章
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow
                    key={post.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        {post.cover_image ? (
                          <div className="h-10 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={post.cover_image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[280px]">
                            {post.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {post.categories?.slice(0, 2).map((cat) => (
                              <Badge
                                key={cat.id}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {cat.name}
                              </Badge>
                            ))}
                            {post.tags?.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {post.author || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {post.published ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 hover:bg-emerald-500/10">
                          已发布
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          草稿
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        {post.views ?? 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/posts/edit/${post.slug}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingPost(post)}
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

        {/* Pagination */}
        {!loading && posts.length > 0 && (
          <div className="border-t px-4">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPost}
        onOpenChange={(open) => {
          if (!open) setDeletingPost(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除文章「{deletingPost?.title}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingPost(null)}
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
