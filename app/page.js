'use client';

import { useState, useEffect, useCallback } from 'react';
import BottomTabBar from '@/components/bottomtabbar';
import MobilePostCard from '@/components/mobilepostcard';

/* -- 骨架卡片 ----------------------------------- */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
      <div className="flex gap-3">
        <div className="w-[100px] h-[100px] rounded-lg skeleton shrink-0" />
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded skeleton w-20" />
            <div className="h-4 bg-gray-100 rounded skeleton w-full" />
            <div className="h-4 bg-gray-100 rounded skeleton w-3/4" />
            <div className="h-3 bg-gray-100 rounded skeleton w-2/3" />
          </div>
          <div className="flex gap-3 pt-1">
            <div className="h-3 bg-gray-100 rounded skeleton w-16" />
            <div className="h-3 bg-gray-100 rounded skeleton w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- 占位页面（新闻/消息/我的） ---------------- */
function PlaceholderTab({ tabKey }) {
  const info = {
    news: { icon: '📰', label: '新闻', desc: '实时资讯与行业动态' },
    message: { icon: '💬', label: '消息', desc: '暂无新消息' },
    me: { icon: '👤', label: '我的', desc: '个人中心' },
  };
  const { icon, label, desc } = info[tabKey] || { icon: '🚧', label: tabKey, desc: '开发中' };

  return (
    <div className="flex flex-col items-center justify-center pt-32 animate-fade-in">
      <span className="text-5xl mb-4">{icon}</span>
      <h2 className="text-lg font-bold text-gray-800 mb-1">{label}</h2>
      <p className="text-sm text-gray-400">{desc}</p>
      <p className="text-xs text-gray-300 mt-6">该功能正在开发中，敬请期待</p>
    </div>
  );
}

/* -- 主页面 ------------------------------------- */
export default function MobileHomePage() {
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 尝试 v1 API，fallback 到旧 API
      const urls = [
        '/api/v1/posts?pageSize=20',
        '/api/posts?pageSize=20',
      ];
      let data = null;

      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          data = json.data || json.rows || json.posts || json;
          if (Array.isArray(data)) break;
          // 如果返回的是分页对象，取内部数组
          if (data && typeof data === 'object') {
            data = data.data || data.rows || data.posts || null;
            if (Array.isArray(data)) break;
          }
        } catch {
          continue;
        }
      }

      if (!Array.isArray(data)) {
        throw new Error('暂无文章数据');
      }

      setPosts(data);
    } catch (err) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'home') {
      fetchPosts();
    }
  }, [activeTab, fetchPosts]);

  const handlePostClick = (post) => {
    window.location.href = `/posts/${post.slug}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] mobile-scroll-container">
      {/* -- 顶部标题栏 ------------------- */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-[48px] flex items-center justify-center">
          <h1 className="text-[20px] font-bold text-gray-800">ZeroBlog</h1>
        </div>
      </header>

      {/* -- 主内容区 --------------------- */}
      <main className="max-w-lg mx-auto px-4 pt-3 pb-24">
        {/* 首页 Tab */}
        {activeTab === 'home' && (
          <>
            {/* 列表头部 */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-gray-800">最新发布</h2>
              <span className="text-[12px] text-gray-400">{posts.length} 篇文章</span>
            </div>

            {/* 加载中：骨架屏 */}
            {loading && (
              <div>
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* 加载失败 */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-gray-500 mb-3">{error}</p>
                <button
                  onClick={fetchPosts}
                  className="px-4 py-2 text-sm font-medium text-blue-500 bg-blue-50 rounded-full active:bg-blue-100 transition-colors"
                >
                  点击重试
                </button>
              </div>
            )}

            {/* 文章列表 */}
            {!loading && !error && posts.length > 0 && (
              <div>
                {posts.map((post, index) => (
                  <div
                    key={post.id || post.slug || index}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
                  >
                    <MobilePostCard post={post} onClick={handlePostClick} />
                  </div>
                ))}
              </div>
            )}

            {/* 空状态 */}
            {!loading && !error && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm text-gray-500">暂无文章</p>
              </div>
            )}
          </>
        )}

        {/* 其他 Tab 占位 */}
        {activeTab === 'news' && <PlaceholderTab tabKey="news" />}
        {activeTab === 'message' && <PlaceholderTab tabKey="message" />}
        {activeTab === 'me' && <PlaceholderTab tabKey="me" />}
      </main>

      {/* -- 底部导航栏 ------------------- */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
