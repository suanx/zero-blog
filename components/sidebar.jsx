'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Sidebar() {
  const [hotPosts, setHotPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/posts?pageSize=5').then((r) => r.json()).catch(() => null),
      fetch('/api/tags').then((r) => r.json()).catch(() => null),
    ]).then(([postsRes, tagsRes]) => {
      if (postsRes?.data) setHotPosts(postsRes.data);
      if (tagsRes?.data) setTags(tagsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <aside className="space-y-5 w-full">
      {/* ── 个人信息卡片 ─────────────────── */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
        {/* 渐变封面 */}
        <div className="h-20 bg-gradient-to-r from-blue-500 to-blue-600 relative">
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        {/* 信息 */}
        <div className="pt-10 pb-5 px-4 text-center">
          <h3 className="font-bold text-gray-800 text-base">ZeroBlog</h3>
          <p className="text-xs text-gray-400 mt-1">探索技术与创意的交汇</p>
          <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
            <div>
              <div className="font-semibold text-gray-800 text-sm">0</div>
              <div>文章</div>
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">0</div>
              <div>分类</div>
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">0</div>
              <div>标签</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 热门文章 ─────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          <h3 className="font-bold text-gray-800 text-sm">热门文章</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded skeleton" />
                  <div className="h-3 bg-gray-100 rounded skeleton w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : hotPosts.length > 0 ? (
          <div className="space-y-3">
            {hotPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="flex gap-3 group"
              >
                <span
                  className={`w-5 h-5 rounded text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium ${
                    index < 3
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm text-gray-700 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                    {post.title}
                  </h4>
                  <span className="text-xs text-gray-400 mt-0.5 block">
                    {post.views || 0} 阅读
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">暂无文章</p>
        )}
      </div>

      {/* ── 标签云 ───────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="font-bold text-gray-800 text-sm">标签</h3>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id || tag.slug}
                href={`/tag/${tag.slug}`}
                className="inline-block px-3 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">暂无标签</p>
        )}
      </div>

      {/* ── 友情链接 ─────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 className="font-bold text-gray-800 text-sm">友情链接</h3>
        </div>
        <div className="space-y-2.5">
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <span className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">N</span>
            <span className="truncate">Next.js</span>
          </a>
          <a
            href="https://tailwindcss.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <span className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-cyan-500 shrink-0">T</span>
            <span className="truncate">Tailwind CSS</span>
          </a>
          <a
            href="https://turso.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <span className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">S</span>
            <span className="truncate">Turso</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
