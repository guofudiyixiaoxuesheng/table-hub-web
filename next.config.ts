// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 手机在同一局域网访问开发服务器时，DHCP 可能改变电脑的末段 IP。
  // 只放行当前私有网段，避免每次换网都要改一个固定 IP。
  allowedDevOrigins: ['192.168.1.*'],
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        // Next 与 uvicorn 在同一台电脑运行；代理走回环地址，不能依赖当前局域网 IP。
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
