/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/dashboard/workorders',
        destination: '/dashboard/work-orders',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
