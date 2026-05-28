'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Sidebar from '@/components/sidebar';
import DOMPurify from 'dompurify';

/* ── 文章详情页 ─────────────────────────────── */
export default function PostDetailPage() {
  const params = useParams();
  const slug = params?.slug;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    (async () => {
      // try v1 API first, then fallback
      const urls = [`/api/v1/posts/${slug}`, `/api/posts/${slug}`];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            setPost(json.data || json);
            return;
          }
        } catch { /* try next */ }
      }
      setError('文章不存在或加载失败');
    })().finally(() => setLoading(false));
  }, [slug]);

  const dateStr = post?.created_at
    ? new Date(post.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const readingTime = Math.max(
    1,
    Math.ceil(((post?.content?.length || 500) / 500))
  );

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── 左侧：文章内容 ─────────────── */}
          <article className="flex-1 min-w-0">
            {/* 骨架屏 */}
            {loading && (
              <div className="bg-white rounded-lg border border-gray-100 p-6 sm:p-8 animate-fade-in">
                <div className="h-8 bg-gray-100 rounded skeleton w-3/4 mb-4" />
                <div className="flex gap-3 mb-6">
                  <div className="h-4 bg-gray-100 rounded skeleton w-20" />
                  <div className="h-4 bg-gray-100 rounded skeleton w-24" />
                  <div className="h-4 bg-gray-100 rounded skeleton w-16" />
                </div>
                <div className="h-64 bg-gray-100 rounded skeleton mb-6" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 bg-gray-100 rounded skeleton" style={{ width: `${85 - i * 8}%` }} />
                  ))}
                </div>
              </div>
            )}

            {/* 错误 / 404 */}
            {!loading && error && (
              <div className="bg-white rounded-lg border border-gray-100 p-12 text-center">
                <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <h1 className="text-xl font-bold text-gray-800 mb-2">文章未找到</h1>
                <p className="text-gray-500 mb-6">{error}</p>
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  返回首页
                </Link>
              </div>
            )}

            {/* 正文 */}
            {!loading && !error && post && (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm animate-fade-in">
                {/* 封面 */}
                {post.cover_image && (
                  <div className="w-full aspect-[2/1] overflow-hidden rounded-t-lg bg-gray-100">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* 标题 */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 leading-tight mb-4">
                    {post.title}
                  </h1>

                  {/* 元信息 */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-100">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      {post.author || '管理员'}
                    </span>
                    <span className="text-gray-200">·</span>
                    <span>{dateStr}</span>
                    <span className="text-gray-200">·</span>
                    <span>{readingTime} 分钟阅读</span>
                    <span className="text-gray-200">·</span>
                    <span>{post.views || 0} 阅读</span>

                    {/* 分类/标签 */}
                    {post.categories?.length > 0 && (
                      <>
                        <span className="text-gray-200">·</span>
                        <div className="flex gap-1.5">
                          {post.categories.map((cat) => (
                            <span key={cat.id || cat.slug} className="inline-flex items-center px-2 py-0.5 text-xs text-blue-600 bg-blue-50 rounded">
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 正文 */}
                  <div
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
                  />

                  {/* 标签 */}
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag.id || tag.slug}
                          href={`/tag/${tag.slug}`}
                          className="inline-flex items-center px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                          # {tag.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* 分享 */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                    <span className="text-sm text-gray-400">觉得不错？分享给朋友</span>
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded hover:text-blue-600 hover:border-blue-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.318a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
                      </svg>
                      {copied ? '已复制' : '复制链接'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 上一篇 / 下一篇 */}
            {!loading && !error && post && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link
                  href="/"
                  className="flex-1 bg-white rounded-lg border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  <span className="text-xs text-gray-400">← 上一篇</span>
                  <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors mt-1 line-clamp-1">
                    返回首页查看更多文章
                  </p>
                </Link>
              </div>
            )}

            {/* 回到顶部 */}
            {!loading && !error && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-full hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  回到顶部
                </button>
              </div>
            )}
          </article>

          {/* ── 右侧边栏 ─────────────────── */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0">
            <div className="lg:sticky lg:top-20">
              <Sidebar />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
