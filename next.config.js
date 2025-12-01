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
  // Увеличиваем лимит размера тела запроса для API routes
  // Supabase Storage поддерживает файлы до 50MB, поэтому увеличиваем лимит
  api: {
    bodyParser: {
      sizeLimit: '50mb', // 50MB лимит для поддержки больших файлов
    },
  },
  // Для App Router используем экспериментальную конфигурацию
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // 50MB для server actions
    },
  },
}

module.exports = nextConfig
