/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lcaitool/ui"],
  experimental: {
    serverComponentsExternalPackages: ["@lcaitool/ui"],
  },
};

module.exports = nextConfig;
