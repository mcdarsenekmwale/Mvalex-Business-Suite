/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Replace node: prefixed built-ins with empty modules on the client
      const alias = config.resolve.alias || {};
      alias['node:crypto'] = false;
      alias['node:stream'] = false;
      alias['node:util'] = false;
      alias['node:buffer'] = false;
      alias['node:path'] = false;
      alias['node:os'] = false;
      alias['node:fs'] = false;
      alias['node:net'] = false;
      alias['node:tls'] = false;
      alias['node:child_process'] = false;
      alias['node:dns'] = false;
      alias['node:process'] = false;
      config.resolve.alias = alias;

      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        path: false,
        os: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
      };
    }

    return config;
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,PATCH,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
