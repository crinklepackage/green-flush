/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['@wavenotes-new/shared'],
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
} 