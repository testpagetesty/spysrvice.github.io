/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['oilwcbfyhutzyjzlqbuk.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
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
