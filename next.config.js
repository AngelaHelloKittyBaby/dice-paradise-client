/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['via.placeholder.com', 'api.dicebear.com'],
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
