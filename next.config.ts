// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.116'],
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
