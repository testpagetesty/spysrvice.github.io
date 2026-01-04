/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.ru1.storage.beget.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.beget.cloud',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Для App Router используем экспериментальную конфигурацию
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // 50MB для server actions
    },
  },
}

module.exports = nextConfig
