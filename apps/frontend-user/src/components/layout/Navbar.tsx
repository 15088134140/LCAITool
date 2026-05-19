'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  // 登录、注册、验证页面不显示全局导航栏，使用页面自己的导航
  // 用户中心及其子页面、订单页面也不显示全局导航栏
  const hideNavPages = ['/login', '/register', '/verification', '/user-center', '/orders'];
  if (hideNavPages.some(page => pathname === page || pathname.startsWith(page + '/'))) {
    return null;
  }

  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/tools', label: '全部工具' },
    { href: '/vote', label: '用户共创' },
    { href: '/feedback', label: '帮助反馈' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="font-bold text-xl text-[#1E3A5F]">灵创AI</span>
          </Link>

          {/* 导航链接 */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2 ${
                  pathname === link.href
                    ? 'text-[#1E3A5F] bg-slate-50'
                    : 'text-slate-500 hover:text-[#1E3A5F] hover:bg-slate-50'
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Link
              href="/user-center"
              className="hidden sm:block px-4 py-2 text-[#1E3A5F] font-medium hover:bg-[#F1F3F5] rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2"
            >
              个人中心
            </Link>
            <Link
              href="/pricing"
              className="btn-primary px-5 py-2 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-2"
            >
              充值套餐
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
