import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // Toggle dev indicators via environment variable (default: hide)
  // Note: In Next.js 15.5+, devIndicators configuration has changed
  // Setting to false completely disables all dev indicators
  devIndicators: process.env.SHOW_DEV_INDICATORS === 'true',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8000/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://backend:8000/ws/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
