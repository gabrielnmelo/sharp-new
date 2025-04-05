/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  transpilePackages: [
    'firebase', 
    '@firebase/auth', 
    '@firebase/app', 
    'undici'
  ],
  reactStrictMode: false,
  swcMinify: true,
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      poll: 800,
      aggregateTimeout: 300,
    };
    return config;
  },
};

module.exports = nextConfig;
