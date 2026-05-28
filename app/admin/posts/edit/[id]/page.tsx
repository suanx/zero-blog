'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Trash2,
  Image,
  Tag,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('@/components/richtexteditor'), { ssr: false });
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
interface TaxonomyItem {
  id: number;
  name: string;
  slug: string;
}

interface PostData {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string;
  published: boolean | number;
  views: number;
  created_at: string;
  updated_at: string;
  author: string;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

interface TaxonomyResponse {
  status: string;
  data: TaxonomyItem[];
}

interface PostResponse {
  status: string;
  data: PostData;
}

// ── Helpers ────────────────────────────────────────────
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

// ── Main Component ─────────────────────────────────────
export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postSlug = params.id as string; // [id] param is actually the slug

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [published, setPublished] = useState(false);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);

  // Data state
  const [originalPost, setOriginalPost] = useState<PostData | null>(null);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load post data ──────────────────────────────────
  const loadPost = useCallback(async () => {
    if (!postSlug) return;

    try {
      const token = getToken();
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetch(`/api/v1/posts/${postSlug}`, {
        headers: { 'Admin-Token': token },
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        throw new Error('文章不存在');
      }

      const json: PostResponse = await res.json();
      const post = json.data;

      setOriginalPost(post);
      setTitle(post.title || '');
      setSlug(post.slug || '');
      setContent(post.content || '');
      setExcerpt(post.excerpt || '');
      setCoverImage(post.cover_image || '');
      setPublished(!!post.published);
      setCategoryIds((post.categories || []).map((c) => c.id));
      setTagIds((post.tags || []).map((t) => t.id));
    } catch (err) {
      console.error('加载文章失败:', err);
      alert('加载文章失败');
      router.push('/admin/posts');
    } finally {
      setLoading(false);
    }
  }, [postSlug, router]);

  // ── Load taxonomy ────────────────────────────────────
  const loadTaxonomy = useCallback(async () => {
    try {
      const token = getToken();
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/v1/admin/taxonomy?type=category', {
          headers: { 'Admin-Token': token },
        }),
        fetch('/api/v1/admin/taxonomy?type=tag', {
          headers: { 'Admin-Token': token },
        }),
      ]);

      if (catRes.status === 401 || tagRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const catData: TaxonomyResponse = await catRes.json();
      const tagData: TaxonomyResponse = await tagRes.json();
      setCategories(catData.data || []);
      setTags(tagData.data || []);
    } catch {
      console.error('加载分类/标签失败');
    } finally {
      setTaxonomyLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/admin/login');
      return;
    }
    loadPost();
    loadTaxonomy();
  }, [loadPost, loadTaxonomy, router]);

  // ── Auto-generate slug from title ────────────────────
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  };

  // ── Toggle taxonomy item ─────────────────────────────
  const toggleCategory = (id: number) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTag = (id: number) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Submit update ────────────────────────────────────
  const handleSubmit = async (publish: boolean) => {
    if (!title.trim()) {
      alert('请输入文章标题');
      return;
    }
    if (!slug.trim()) {
      alert('请填写文章 Slug');
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/posts/${postSlug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Admin-Token': token,
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content,
          excerpt,
          cover_image: coverImage,
          published: publish,
          category_ids: categoryIds,
          tag_ids: tagIds,
        }),
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || '更新失败');
        return;
      }

      router.push('/admin/posts');
    } catch {
      alert('网络错误，请重试');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete post ──────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/posts/${postSlug}`, {
        method: 'DELETE',
        headers: { 'Admin-Token': token },
      });

      if (res.ok || res.status === 204) {
        router.push('/admin/posts');
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

  // ── Loading State ────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-1/2" />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/posts">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">编辑文章</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {originalPost?.title || '加载中...'}
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Main Content (2/3) ──────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="输入文章标题..."
              className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary shadow-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Slug:</Label>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="article-url-slug"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <Label className="text-sm font-medium mb-3 block">文章内容</Label>
            <RichTextEditor
              initialContent={content}
              onChange={setContent}
              placeholder="开始写作..."
            />
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <Label className="text-sm font-medium mb-3 block">文章摘要</Label>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="文章摘要..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        {/* ── Right: Sidebar (1/3) ──────────────────── */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">发布设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">状态</Label>
                <Select
                  value={published ? 'published' : 'draft'}
                  onValueChange={(v) => setPublished(v === 'published')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5" />
                  封面图片
                </Label>
                <Input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="text-xs"
                />
                {coverImage && (
                  <div className="rounded-lg overflow-hidden border bg-muted mt-2">
                    <img
                      src={coverImage}
                      alt="封面预览"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  分类
                </Label>
                {taxonomyLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                ) : categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <Badge
                        key={cat.id}
                        variant={categoryIds.includes(cat.id) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors text-xs',
                          categoryIds.includes(cat.id)
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">暂无分类</p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  标签
                </Label>
                {taxonomyLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                ) : tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={tagIds.includes(tag.id) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors text-xs',
                          tagIds.includes(tag.id)
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">暂无标签</p>
                )}
              </div>

              {/* Stats */}
              {originalPost && (
                <div className="pt-2 border-t space-y-1">
                  <p className="text-xs text-muted-foreground">
                    作者: {originalPost.author || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    阅读量: {originalPost.views ?? 0}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => handleSubmit(true)}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              保存并发布
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={() => handleSubmit(false)}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存为草稿
            </Button>
            <div className="pt-3 border-t">
              <Button
                variant="destructive"
                className="w-full gap-2"
                size="lg"
                onClick={() => setShowDeleteDialog(true)}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
                删除文章
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除文章「{originalPost?.title}」吗？此操作不可恢复，所有关联的评论也将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
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
