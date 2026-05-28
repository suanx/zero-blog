'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  FolderTree,
  Settings,
  ExternalLink,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/taxonomy', label: 'Categories', icon: FolderTree },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[250px] bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-700/60">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">Zero Blog</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/60">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ExternalLink className="w-5 h-5 shrink-0" />
          <span>View Blog</span>
        </Link>
      </div>
    </aside>
  );
}
