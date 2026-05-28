'use client';

import { Home, Newspaper, MessageCircle, User } from 'lucide-react';

const TABS = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'news', label: '新闻', icon: Newspaper },
  { key: 'message', label: '消息', icon: MessageCircle },
  { key: 'me', label: '我的', icon: User },
];

export default function BottomTabBar({ activeTab, onTabChange }) {
  return (
    <nav className="mobile-tab-bar fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex items-center">
      <div className="flex w-full max-w-lg mx-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-1.5 transition-colors"
              aria-label={tab.label}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.2 : 1.6}
                className={isActive ? 'text-blue-500' : 'text-gray-400'}
              />
              <span
                className={`text-xs leading-tight ${
                  isActive ? 'text-blue-500 font-medium' : 'text-gray-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
