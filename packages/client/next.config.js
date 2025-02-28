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
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Ensure URL has a protocol (http:// or https://)
    if (apiUrl && !apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `https://${apiUrl}`;
    }
    
    console.log('API URL for rewrites:', apiUrl);
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`, // Proxy to Express API
      },
    ];
  },
  
  // Explicitly configure webpack to handle the shared package
  webpack: (config, { isServer }) => {
    // Allows importing from outside of the client directory (monorepo setup)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@wavenotes-new/shared': isServer 
        ? require('path').resolve(__dirname, '../shared/dist')
        : require('path').resolve(__dirname, '../shared/src'),
    };
    
    return config;
  },
}

module.exports = nextConfig 