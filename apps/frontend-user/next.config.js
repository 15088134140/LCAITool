/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 Next.js 内置 gzip 压缩：compress 默认开启会对带 Accept-Encoding: gzip
  // 的响应启用压缩，而 gzip 需积累数据才能输出，导致任务进度 SSE 流被缓冲到
  // 响应结束才一次性返回（用户看不到实时步骤）。关闭后 SSE 可实时推送。
  // 生产环境若需压缩，由前置 nginx 对非 SSE 响应压缩，并对 text/event-stream 关闭 gzip。
  compress: false,
  transpilePackages: ["@lcaitool/ui"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
