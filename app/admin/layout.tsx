"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/sidebar";
import AdminHeader from "@/components/admin/header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login page renders without the admin layout
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
    }
  }, [router]);

  // Derive page title and breadcrumbs from pathname
  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`lg:block ${sidebarOpen ? "block" : "hidden"}`}>
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="admin-main">
        <AdminHeader
          title={pageTitle}
          breadcrumbs={breadcrumbs}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="admin-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/admin/dashboard": "仪表盘",
    "/admin/posts": "文章管理",
    "/admin/posts/new": "新建文章",
    "/admin/comments": "评论管理",
    "/admin/users": "用户管理",
    "/admin/taxonomy": "分类/标签管理",
    "/admin/settings": "系统设置",
  };
  // Check edit pattern
  if (pathname.startsWith("/admin/posts/edit/")) return "编辑文章";
  return map[pathname] || "管理后台";
}

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];
  let path = "";
  for (const part of parts) {
    path += "/" + part;
    const label = getPageTitle(path);
    const isLast = path === pathname;
    crumbs.push({
      label,
      href: isLast ? undefined : path,
    });
  }
  return crumbs;
}
