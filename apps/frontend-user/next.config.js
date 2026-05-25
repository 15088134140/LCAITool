/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lcaitool/ui"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
