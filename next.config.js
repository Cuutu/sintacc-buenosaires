/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
})

const nextConfig = {
  async redirects() {
    return [
      { source: "/mapa-para-celiacos", destination: "/mapa-celiaco", permanent: true },
      { source: "/mapa-para-celiacos/", destination: "/mapa-celiaco", permanent: true },
      { source: "/mapa-celiacos", destination: "/mapa-celiaco", permanent: true },
      { source: "/mapa-celiacos/", destination: "/mapa-celiaco", permanent: true },
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
  // Incluir fuentes Satori en el bundle serverless (generate-image)
  experimental: {
    outputFileTracingIncludes: {
      "/api/admin/social/generate-image": ["./assets/fonts/**/*"],
    },
  },
}

module.exports = withPWA(nextConfig)
