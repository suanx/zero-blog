'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronRight, User, Settings, LogOut, Menu } from 'lucide-react';
import type { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  onMenuToggle?: () => void;
}

export default function AdminHeader({ title, breadcrumbs = [], onMenuToggle }: AdminHeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/admin/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30">
      {/* Left: Mobile menu + Title & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="w-3 h-3" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-gray-600 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-600">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 ml-4">
        {/* Search */}
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">admin@zeroblog.dev</p>
              </div>
              <Link
                href="/admin/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
