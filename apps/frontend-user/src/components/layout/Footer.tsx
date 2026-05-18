'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  // 登录、注册、验证页面不显示全局底部
  const authPages = ['/login', '/register', '/verification'];
  if (authPages.includes(pathname)) {
    return null;
  }

  return (
    <footer className="bg-[#0F172A] py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* 品牌信息 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="font-bold text-xl text-white">灵创AI工具箱</span>
            </div>
            <p className="text-[#94A3B8] mb-6 max-w-sm">
              专业场景AI工具集合平台，深耕细分场景，做深做透每一个工具，让AI创作触手可及。
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors focus-ring"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors focus-ring"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors focus-ring"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </a>
            </div>
          </div>

          {/* 产品 */}
          <div>
            <h4 className="font-semibold text-white mb-4">产品</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/tools" className="footer-link">
                  工具列表
                </Link>
              </li>
              <li>
                <Link href="/tools" className="footer-link">
                  新上线
                </Link>
              </li>
              <li>
                <Link href="/vote" className="footer-link">
                  构思中
                </Link>
              </li>
              <li>
                <a href="#" className="footer-link">
                  API文档
                </a>
              </li>
            </ul>
          </div>

          {/* 支持 */}
          <div>
            <h4 className="font-semibold text-white mb-4">支持</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/feedback" className="footer-link">
                  帮助中心
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="footer-link">
                  反馈建议
                </Link>
              </li>
              <li>
                <a href="#" className="footer-link">
                  商务合作
                </a>
              </li>
              <li>
                <a href="#" className="footer-link">
                  开发者入驻
                </a>
              </li>
            </ul>
          </div>

          {/* 账户 */}
          <div>
            <h4 className="font-semibold text-white mb-4">账户</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/login" className="footer-link">
                  登录
                </Link>
              </li>
              <li>
                <Link href="/register" className="footer-link">
                  注册
                </Link>
              </li>
              <li>
                <Link href="/user-center" className="footer-link">
                  个人中心
                </Link>
              </li>
              <li>
                <Link href="/orders" className="footer-link">
                  消费明细
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#64748B] text-sm">© 2024 灵创AI工具箱. 保留所有权利.</p>
          <div className="flex items-center gap-6 text-sm text-[#64748B]">
            <span>安全认证</span>
            <span>ICP备案号</span>
            <span>公安备案</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
