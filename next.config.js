/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
  },
  env: {
    FEATURES: process.env.FEATURES || 'phase1',
  },
}

module.exports = nextConfig
