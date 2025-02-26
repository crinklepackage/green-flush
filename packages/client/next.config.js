/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@wavenotes-new/shared'],
  reactStrictMode: true,
  // Disable the build error overlay
  typescript: {
    // !! WARN !!
    // Dangerously allows production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Disable ESLint during builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Add API routes rewrites to forward requests to the Express API server
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('API URL for rewrites:', apiUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`, // Proxy to Express API
      },
    ];
  },
}

module.exports = nextConfig 