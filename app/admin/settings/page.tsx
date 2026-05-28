'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Globe,
  Search,
  Share2,
  MessageSquare,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/admin/page-header';

// ── Types ──────────────────────────────────────────────
interface SettingsData {
  site_title: string;
  site_description: string;
  seo_keywords: string;
  social_github: string;
  social_twitter: string;
  social_weibo: string;
  comment_moderation: boolean;
}

interface ApiResponse {
  status: string;
  data: SettingsData;
}

// ── Helpers ────────────────────────────────────────────
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

// ── Settings Card ──────────────────────────────────────
function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-[120px]" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page Component ────────────────────────────────
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    site_title: '',
    site_description: '',
    seo_keywords: '',
    social_github: '',
    social_twitter: '',
    social_weibo: '',
    comment_moderation: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch('/api/v1/admin/settings', {
        headers: { 'Admin-Token': token },
      });

      if (res.status === 401) return;
      if (!res.ok) throw new Error('加载失败');

      const json: ApiResponse = await res.json();
      if (json.data) {
        setSettings((prev) => ({ ...prev, ...json.data }));
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = <K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const token = getToken();
      const res = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Admin-Token': token,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="系统设置" description="管理站点全局配置" />
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        description="管理站点全局配置"
      />

      <div className="space-y-6">
        {/* 站点信息 */}
        <SettingsCard title="站点信息" icon={Globe}>
          <div className="space-y-2">
            <Label htmlFor="site_title">站点标题</Label>
            <Input
              id="site_title"
              placeholder="我的博客"
              value={settings.site_title}
              onChange={(e) => updateField('site_title', e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site_description">站点描述</Label>
            <Input
              id="site_description"
              placeholder="一个关于技术、生活和思考的博客"
              value={settings.site_description}
              onChange={(e) => updateField('site_description', e.target.value)}
              className="h-10"
            />
          </div>
        </SettingsCard>

        {/* SEO 设置 */}
        <SettingsCard title="SEO 设置" icon={Search}>
          <div className="space-y-2">
            <Label htmlFor="seo_keywords">SEO 关键词</Label>
            <Textarea
              id="seo_keywords"
              placeholder="用逗号分隔，如：博客, 技术, 前端, Next.js"
              value={settings.seo_keywords}
              onChange={(e) => updateField('seo_keywords', e.target.value)}
              rows={3}
            />
          </div>
        </SettingsCard>

        {/* 社交链接 */}
        <SettingsCard title="社交链接" icon={Share2}>
          <div className="space-y-2">
            <Label htmlFor="social_github">GitHub</Label>
            <Input
              id="social_github"
              placeholder="https://github.com/username"
              value={settings.social_github}
              onChange={(e) => updateField('social_github', e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social_twitter">Twitter / X</Label>
            <Input
              id="social_twitter"
              placeholder="https://twitter.com/username"
              value={settings.social_twitter}
              onChange={(e) => updateField('social_twitter', e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social_weibo">微博</Label>
            <Input
              id="social_weibo"
              placeholder="https://weibo.com/username"
              value={settings.social_weibo}
              onChange={(e) => updateField('social_weibo', e.target.value)}
              className="h-10"
            />
          </div>
        </SettingsCard>

        {/* 评论设置 */}
        <SettingsCard title="评论设置" icon={MessageSquare}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="comment_moderation">评论审核</Label>
              <p className="text-sm text-muted-foreground">
                开启后，新评论需要管理员审核后才会显示
              </p>
            </div>
            <Switch
              id="comment_moderation"
              checked={settings.comment_moderation}
              onCheckedChange={(checked) =>
                updateField('comment_moderation', checked)
              }
            />
          </div>
        </SettingsCard>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pb-8">
          {saved && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              保存成功
            </div>
          )}
          <Button
            className="gap-2 px-6"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </div>
  );
}
