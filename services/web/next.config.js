/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  output: isDev ? undefined : 'export',
  trailingSlash: isDev ? false : true,
  images: {
    unoptimized: !isDev
  }
};

module.exports = nextConfig
