import Link from 'next/link';

export function Footer() {
  const footerLinks = {
    产品: [
      { label: '所有工具', href: '/tools' },
      { label: '定价方案', href: '/pricing' },
      { label: 'API接口', href: '/api' },
    ],
    关于: [
      { label: '关于我们', href: '/about' },
      { label: '联系我们', href: '/contact' },
      { label: '加入团队', href: '/careers' },
    ],
    帮助: [
      { label: '帮助中心', href: '/help' },
      { label: '使用文档', href: '/docs' },
      { label: '意见反馈', href: '/feedback' },
    ],
    法律: [
      { label: '服务条款', href: '/terms' },
      { label: '隐私政策', href: '/privacy' },
    ],
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* 品牌信息 */}
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-dark to-brand-light rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <span className="text-xl font-bold text-gray-900">灵创AI工具箱</span>
            </div>
            <p className="text-gray-600 text-sm mb-4 max-w-xs">
              深耕专业场景的精品AI工具集合平台，为创作者和企业提供智能、高效的生产力工具。
            </p>
          </div>

          {/* 链接组 */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-brand-dark transition-colors footer-link"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 底部版权 */}
        <div className="border-t border-gray-200 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} 灵创AI工具箱. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
