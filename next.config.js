/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'tile.openstreetmap.org' },
      { protocol: 'https', hostname: '*.tile.openstreetmap.org' },
      { protocol: 'https', hostname: 'earthengine.googleapis.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      'pg', 'pg-native', 'googleapis',
      'google-auth-library', 'bcryptjs', 'jsonwebtoken',
    ],
  },
  env: { NEXT_PUBLIC_APP_NAME: 'Cognentrz' },
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, path: false, net: false, tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
