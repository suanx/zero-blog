import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Link href="/" className="font-bold text-gray-800 hover:text-blue-600 transition-colors">
            Zero<span className="text-blue-600">Blog</span>
          </Link>
          <p className="text-xs text-gray-400 leading-relaxed max-w-md">
            探索技术与创意的交汇，分享前端开发、后端架构与开源项目的实践经验。
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
            <span className="text-gray-200">|</span>
            <Link href="/about" className="hover:text-blue-600 transition-colors">关于</Link>
            <span className="text-gray-200">|</span>
            <Link href="/admin/login" className="hover:text-blue-600 transition-colors">管理</Link>
          </div>
          <p className="text-xs text-gray-300">
            &copy; {year} ZeroBlog. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
