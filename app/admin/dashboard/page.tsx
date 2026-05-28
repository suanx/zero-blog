'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Recharts - dynamic import handled via regular import (client component)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Types ──────────────────────────────────────────
interface Stats {
  total_posts: number;
  total_comments: number;
  total_users: number;
  pending_comments: number;
  total_categories?: number;
  total_tags?: number;
  trend: { day: string; count: number }[];
  recent_comments: {
    id: number;
    author_name: string;
    content: string;
    post_title?: string;
    post_slug?: string;
    status: string;
    created_at: string;
  }[];
  popular_posts: {
    id: number;
    title: string;
    slug: string;
    views: number;
    created_at: string;
  }[];
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

// ── Helpers ────────────────────────────────────────
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

function formatDayLabel(day: string): string {
  // day is "YYYY-MM-DD", return "MM/DD"
  const parts = day.split('-');
  if (parts.length >= 3) return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  return day;
}

// ── StatCard Component ─────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            color
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <p
          className={cn(
            'text-xs mt-2',
            trend >= 0 ? 'text-green-600' : 'text-red-500'
          )}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% 较上周
        </p>
      )}
    </div>
  );
}

// ── Skeleton Components ────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-64">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton
                className="w-full rounded-t"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CommentsSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom Chart Tooltip ───────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">
          {payload[0].value} 篇文章
        </p>
      </div>
    );
  }
  return null;
}

// ── Main Dashboard ─────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setUser(getUser());
    loadStats();
  }, [router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');

      // Try v1 API first, fallback to legacy
      let res = await fetch('/api/v1/admin/stats', {
        headers: { 'Admin-Token': getToken() },
      });

      if (!res.ok) {
        res = await fetch('/api/admin/stats', {
          headers: { 'Admin-Token': getToken() },
        });
      }

      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        router.replace('/admin/login');
        return;
      }

      const data = await res.json();
      const statsData = data.stats || data.data || data;

      setStats({
        total_posts: statsData.total_posts ?? 0,
        total_comments: statsData.total_comments ?? 0,
        total_users: statsData.total_users ?? 0,
        pending_comments: statsData.pending_comments ?? 0,
        total_categories: statsData.total_categories ?? 0,
        total_tags: statsData.total_tags ?? 0,
        trend: statsData.trend || [],
        recent_comments: statsData.recent_comments || [],
        popular_posts: statsData.popular_posts || [],
      });
    } catch {
      setError('加载统计数据失败');
      // Set default values on error
      setStats({
        total_posts: 0,
        total_comments: 0,
        total_users: 0,
        pending_comments: 0,
        trend: [],
        recent_comments: [],
        popular_posts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Loading State ────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <CommentsSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // ── Error with no data ───────────────────────────
  if (error && !stats) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-[#4945FF] text-white rounded-lg text-sm font-medium hover:bg-[#3A34E8] transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  // ── Chart data ───────────────────────────────────
  const chartData = (stats?.trend || []).map((d) => ({
    name: formatDayLabel(d.day),
    count: d.count,
    fullDate: d.day,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            欢迎回来{user?.name ? `，${user.name}` : ''} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            这是你的博客管理概览
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#4945FF] text-white rounded-lg text-sm font-medium hover:bg-[#3A34E8] transition-colors"
        >
          <FileText className="w-4 h-4" />
          新建文章
        </Link>
      </div>

      {/* ── Stat Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总文章数"
          value={stats?.total_posts ?? 0}
          icon={FileText}
          color="bg-[#4945FF]"
        />
        <StatCard
          title="总评论数"
          value={stats?.total_comments ?? 0}
          icon={MessageSquare}
          color="bg-[#5CB176]"
        />
        <StatCard
          title="总用户数"
          value={stats?.total_users ?? 0}
          icon={Users}
          color="bg-[#7B61FF]"
        />
        <StatCard
          title="待审核评论"
          value={stats?.pending_comments ?? 0}
          icon={Clock}
          color="bg-[#F5A623]"
        />
      </div>

      {/* ── Middle Section: Chart + Comments ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-Day Trend Chart */}
        <Card className="lg:col-span-2 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                近7天发布趋势
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f5"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#999' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#999' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="#4945FF"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                暂无趋势数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Latest Comments */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                最新评论
              </CardTitle>
              <Link
                href="/admin/comments"
                className="text-xs text-[#4945FF] hover:underline flex items-center gap-0.5"
              >
                查看全部
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recent_comments && stats.recent_comments.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_comments.slice(0, 5).map((comment) => (
                  <div key={comment.id} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {comment.author_name || '匿名'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                          comment.status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : comment.status === 'spam'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-yellow-50 text-yellow-700'
                        )}
                      >
                        {comment.status === 'approved'
                          ? '已通过'
                          : comment.status === 'spam'
                          ? '垃圾'
                          : '待审'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {comment.content}
                    </p>
                    {comment.post_title && (
                      <p className="text-[11px] text-gray-400 mt-1 truncate">
                        评论于 {comment.post_title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                暂无评论
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Section: Popular Posts Table ──────── */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">热门文章</CardTitle>
            <Link
              href="/admin/posts"
              className="text-xs text-[#4945FF] hover:underline flex items-center gap-0.5"
            >
              查看全部
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.popular_posts && stats.popular_posts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 w-8">
                      #
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500">
                      标题
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 hidden sm:table-cell">
                      发布日期
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-500">
                      <span className="flex items-center justify-end gap-1">
                        <Eye className="w-3 h-3" />
                        浏览
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.popular_posts.map((post, index) => (
                    <tr
                      key={post.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                            index === 0
                              ? 'bg-[#4945FF] text-white'
                              : index === 1
                              ? 'bg-[#7B61FF] text-white'
                              : index === 2
                              ? 'bg-[#B5C0FF] text-[#4945FF]'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Link
                          href={`/posts/${post.slug}`}
                          target="_blank"
                          className="font-medium text-gray-900 hover:text-[#4945FF] transition-colors line-clamp-1"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs hidden sm:table-cell">
                        {formatDate(post.created_at)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                          {(post.views ?? 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">
              暂无文章数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
