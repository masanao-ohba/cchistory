import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // Toggle dev indicators based on NODE_ENV
  // Development mode: show indicators (unless explicitly disabled)
  // Production mode: hide indicators (unless explicitly enabled)
  devIndicators: process.env.SHOW_DEV_INDICATORS
    ? process.env.SHOW_DEV_INDICATORS === 'true'
    : process.env.NODE_ENV === 'development',
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
