/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/mapa-para-celiacos", destination: "/mapa", permanent: true },
      { source: "/mapa-para-celiacos/", destination: "/mapa", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  env: {
    FEATURES: process.env.FEATURES || 'phase1',
  },
}

module.exports = nextConfig
