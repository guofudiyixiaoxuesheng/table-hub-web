// next.config.js
/** @type {import('next').NextConfig} */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";

const nextConfig = {
  // 手机在同一局域网访问开发服务器时，DHCP 可能改变电脑的末段 IP。
  // 只放行当前私有网段，避免每次换网都要改一个固定 IP。
  allowedDevOrigins: ['192.168.1.*'],
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        // 本地开发时走回环地址；Docker 生产环境由 API_PROXY_TARGET 指向 api 服务。
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
