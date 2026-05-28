import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: {
    default: 'ZeroBlog - 探索技术与创意的交汇',
    template: '%s | ZeroBlog',
  },
  description: '一个简洁优雅的个人技术博客，分享前端开发、后端架构与开源项目的实践经验。',
  keywords: ['博客', '技术', '前端', '后端', 'Next.js', '开源'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-800`}
      >
        {children}
      </body>
    </html>
  );
}
