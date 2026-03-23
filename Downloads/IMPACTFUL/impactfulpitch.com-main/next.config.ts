import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/nikhil-s-profile',
        destination: '/nikhil-parmar',
        permanent: true, // This makes it a 301 redirect
      },
      {
        source: '/contact-us',
        destination: '/contact',
        permanent: true, // This makes it a 301 redirect
      },
      {
        source: '/successstory',
        destination: '/success-stories',
        permanent: true, // This makes it a 301 redirect
      },
      {
        source: '/terms',
        destination: '/terms-conditions',
        permanent: true, // This makes it a 301 redirect
      },
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true, // This makes it a 301 redirect
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['react-icons', '@iconify/react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
