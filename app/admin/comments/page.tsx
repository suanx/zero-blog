'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Shield,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import PageHeader from '@/components/admin/page-header';
import Pagination from '@/components/admin/pagination';

// ── Types ──────────────────────────────────────────────
interface Comment {
  id: number;
  author_name: string;
  author_email: string;
  content: string;
  post_id: number;
  post_title: string;
  status: 'pending' | 'approved' | 'spam';
  created_at: string;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ApiResponse {
  status: string;
  data: Comment[];
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

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ── Status Badge ───────────────────────────────────────
function StatusBadge({ status }: { status: Comment['status'] }) {
  const config = {
    pending: {
      label: '待审核',
      className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50',
    },
    approved: {
      label: '已通过',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    },
    spam: {
      label: '垃圾评论',
      className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
    },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

// ── Skeleton Rows ──────────────────────────────────────
function SkeletonTableRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
          <TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
          <TableCell>
            <div className="flex gap-1 justify-end">
              <Skeleton className="h-8 w-8 rounded-md" />
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
export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 15,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingComment, setDeletingComment] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 15;

  const loadComments = useCallback(
    async (page: number = 1) => {
      try {
        const token = getToken();
        if (!token) return;

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (statusFilter !== 'all') params.set('status', statusFilter);

        const res = await fetch(`/api/v1/admin/comments?${params}`, {
          headers: { 'Admin-Token': token },
        });

        if (res.status === 401) return;

        if (!res.ok) throw new Error('加载失败');

        const json: ApiResponse = await res.json();
        setComments(json.data || []);
        setPagination(json.meta || { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
      } catch (err) {
        console.error('加载评论列表失败:', err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    setLoading(true);
    loadComments(1);
  }, [loadComments]);

  const handleStatusChange = async (comment: Comment, newStatus: Comment['status']) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/admin/comments/${comment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Admin-Token': token,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        loadComments(pagination.page);
      }
    } catch (err) {
      console.error('更新评论状态失败:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingComment) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/admin/comments/${deletingComment.id}`, {
        method: 'DELETE',
        headers: { 'Admin-Token': token },
      });

      if (res.ok || res.status === 204) {
        setDeletingComment(null);
        loadComments(pagination.page);
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
    loadComments(page);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="评论管理"
        description={`管理博客评论，共 ${pagination.total} 条`}
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="spam">垃圾评论</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">作者</TableHead>
                <TableHead className="font-semibold">内容</TableHead>
                <TableHead className="font-semibold">关联文章</TableHead>
                <TableHead className="font-semibold">状态</TableHead>
                <TableHead className="font-semibold">提交时间</TableHead>
                <TableHead className="font-semibold text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonTableRows />
              ) : comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 opacity-40" />
                      <p className="text-sm">暂无评论</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                comments.map((comment) => (
                  <TableRow
                    key={comment.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <span className="text-sm font-medium">{comment.author_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground max-w-[300px] block truncate">
                        {truncate(comment.content, 80)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {comment.post_title || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={comment.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {comment.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                            title="通过"
                            onClick={() => handleStatusChange(comment, 'approved')}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {comment.status !== 'spam' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                            title="标记垃圾"
                            onClick={() => handleStatusChange(comment, 'spam')}
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="删除"
                          onClick={() => setDeletingComment(comment)}
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
        {!loading && comments.length > 0 && (
          <div className="border-t">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingComment}
        onOpenChange={(open) => {
          if (!open) setDeletingComment(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此条评论吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingComment(null)}
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
