/** @type {import('next').NextConfig} */
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://192.168.21.17:8000';

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['via.placeholder.com', 'api.dicebear.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(mp3|ogg|wav)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[hash][ext]',
      },
    });

    return config;
  },
};

module.exports = nextConfig;
