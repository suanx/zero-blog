'use client';

import { MessageCircle, Heart, Eye } from 'lucide-react';
import { useState } from 'react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  const years = Math.floor(months / 12);
  return `${years}年前`;
}

export default function MobilePostCard({ post, onClick }) {
  const [imgError, setImgError] = useState(false);

  const hasCover = post.cover_image && !imgError;

  return (
    <div
      onClick={() => onClick?.(post)}
      className="bg-white rounded-xl p-3 mb-3 shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex gap-3">
        {/* 左侧图片 100x100 */}
        <div className="w-[100px] h-[100px] rounded-lg overflow-hidden shrink-0 bg-gray-100">
          {hasCover ? (
            <img
              src={post.cover_image}
              alt={post.title || ''}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <span className="text-2xl font-bold text-gray-200">
                {post.title?.[0] || 'Z'}
              </span>
            </div>
          )}
        </div>

        {/* 右侧文字 */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="space-y-1">
            {/* 标签 */}
            {post.is_exclusive && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-white bg-red-500 rounded-full leading-none">
                独家
              </span>
            )}

            {/* 标题 */}
            <h3 className="text-[16px] font-bold text-gray-800 leading-tight line-clamp-2">
              {post.title || '无标题'}
            </h3>

            {/* 摘要 */}
            {post.excerpt && (
              <p className="text-[13px] text-gray-500 leading-snug line-clamp-1">
                {post.excerpt}
              </p>
            )}
          </div>

          {/* 底部元信息 */}
          <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
            <span>{timeAgo(post.created_at)}</span>

            {post.views != null && (
              <span className="flex items-center gap-0.5">
                <Eye size={12} strokeWidth={1.5} />
                {post.views}
              </span>
            )}

            {post.comments_count != null && (
              <span className="flex items-center gap-0.5">
                <MessageCircle size={12} strokeWidth={1.5} />
                {post.comments_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
