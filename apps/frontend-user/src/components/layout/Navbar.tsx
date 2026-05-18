'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/tools', label: '工具中心' },
    { href: '/pricing', label: '定价方案' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-dark to-brand-light rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">灵创AI工具箱</span>
          </Link>

          {/* 导航链接 */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-brand-dark'
                    : 'text-gray-600 hover:text-brand-dark'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-brand-dark transition-colors"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="btn-primary text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              免费注册
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
