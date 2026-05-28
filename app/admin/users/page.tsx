'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  User,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/admin/page-header';

// ── Types ──────────────────────────────────────────────
interface UserItem {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  created_at: string;
}

interface ApiResponse {
  status: string;
  data: UserItem[];
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

// ── Role Badge ─────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; className: string }> = {
    admin: {
      label: '管理员',
      className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50',
    },
    editor: {
      label: '编辑',
      className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50',
    },
    viewer: {
      label: '观察者',
      className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
    },
  };
  const c = config[role] || config.viewer;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

// ── Avatar ─────────────────────────────────────────────
function UserAvatar({ name }: { name: string }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
      {initial}
    </div>
  );
}

// ── Skeleton Rows ──────────────────────────────────────
function SkeletonTableRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-9 w-9 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
          <TableCell><Skeleton className="h-5 w-[60px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
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

// ── User Form ──────────────────────────────────────────
interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

function UserForm({
  data,
  onChange,
  isEdit,
}: {
  data: UserFormData;
  onChange: (d: UserFormData) => void;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="user-name">姓名</Label>
        <Input
          id="user-name"
          placeholder="请输入姓名"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-email">邮箱</Label>
        <Input
          id="user-email"
          type="email"
          placeholder="请输入邮箱"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-password">
          密码{isEdit ? '（留空则不修改）' : ''}
        </Label>
        <Input
          id="user-password"
          type="password"
          placeholder={isEdit ? '留空则不修改' : '请输入密码'}
          value={data.password}
          onChange={(e) => onChange({ ...data, password: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>角色</Label>
        <Select value={data.role} onValueChange={(v) => onChange({ ...data, role: v })}>
          <SelectTrigger>
            <SelectValue placeholder="选择角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">管理员</SelectItem>
            <SelectItem value="editor">编辑</SelectItem>
            <SelectItem value="viewer">观察者</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch('/api/v1/admin/users', {
        headers: { 'Admin-Token': token },
      });

      if (res.status === 401) return;
      if (!res.ok) throw new Error('加载失败');

      const json: ApiResponse = await res.json();
      setUsers(json.data || []);
    } catch (err) {
      console.error('加载用户列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'viewer' });
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('请填写姓名和邮箱');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('请输入密码');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const isEdit = !!editingUser;

      const body: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) {
        body.password = formData.password;
      }

      const url = isEdit
        ? `/api/v1/admin/users/${editingUser.id}`
        : '/api/v1/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Admin-Token': token,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setDialogOpen(false);
        loadUsers();
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
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Admin-Token': token },
      });

      if (res.ok || res.status === 204) {
        setDeletingUser(null);
        loadUsers();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description={`管理后台用户，共 ${users.length} 位`}
        actions={
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            新建用户
          </Button>
        }
      />

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold w-12">头像</TableHead>
                <TableHead className="font-semibold">邮箱</TableHead>
                <TableHead className="font-semibold">姓名</TableHead>
                <TableHead className="font-semibold">角色</TableHead>
                <TableHead className="font-semibold">创建时间</TableHead>
                <TableHead className="font-semibold text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonTableRows />
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Users className="h-10 w-10 opacity-40" />
                      <p className="text-sm">暂无用户</p>
                      <Button variant="outline" size="sm" className="gap-2" onClick={openCreateDialog}>
                        <Plus className="h-3.5 w-3.5" />
                        创建第一个用户
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <UserAvatar name={user.name} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{user.name}</span>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingUser(user)}
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
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? '编辑用户' : '新建用户'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? '修改用户信息' : '创建一个新的后台用户'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            data={formData}
            onChange={setFormData}
            isEdit={!!editingUser}
          />
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
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除用户「{deletingUser?.name}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingUser(null)}
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
