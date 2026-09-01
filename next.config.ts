// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.116'],
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://192.168.1.116:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;