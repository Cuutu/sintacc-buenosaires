/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
})

const nextConfig = {
  async redirects() {
    return [
      { source: "/mapa-para-celiacos", destination: "/mapa", permanent: true },
      { source: "/mapa-para-celiacos/", destination: "/mapa", permanent: true },
      { source: "/mapa-celiacos", destination: "/mapa", permanent: true },
      { source: "/sin-gluten", destination: "/sin-gluten-argentina", permanent: true },
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

module.exports = withPWA(nextConfig)
