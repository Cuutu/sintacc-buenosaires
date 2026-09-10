/** @type {import('next').NextConfig} */
/**
 * PWA web (next-pwa):
 * - register:false → registro solo en navegador vía <PwaRegister /> (nativo no registra).
 * - skipWaiting/clientsClaim false → SW nuevo queda en "waiting".
 *   Ciclo real: waiting → usuario acepta banner → SKIP_WAITING → controllerchange → 1 reload.
 *   Postergar = seguir con build actual. NO afirmar activación automática en cold start.
 * - NO regla runtime NetworkOnly sobre /_next/static (contradice precache).
 *   (La palabra NetworkOnly solo aparece en este comentario de documentación.)
 * - Assets hasheados: sin runtime route (precache + cleanupOutdatedCaches).
 * - Offline: fonts/images/api runtime.
 */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  skipWaiting: false,
  clientsClaim: false,
  runtimeCaching: [
    // NO añadir /_next/static aquí — precacheAndRoute ya versiona por build;
    // cleanupOutdatedCaches() elimina precache de builds anteriores.
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/(?!auth\/).*/i,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
})

const nextConfig = {
  async redirects() {
    return [
      // /mapa-para-celiacos es página institucional real (no redirigir).
      { source: "/mapa-celiacos", destination: "/mapa-para-celiacos", permanent: true },
      { source: "/mapa-celiacos/", destination: "/mapa-para-celiacos", permanent: true },
      { source: "/sin-gluten", destination: "/sin-gluten-argentina", permanent: true },
      { source: "/politica-de-privacidad", destination: "/privacidad", permanent: true },
      { source: "/politica-de-privacidad/", destination: "/privacidad", permanent: true },
      // Huérfana SSG: canonical ya era /sin-gluten/:ciudad/:cat. Pretty /{cat}-sin-gluten/{ciudad} ya 301 en middleware.
      { source: "/categoria/:category/:ciudadSlug", destination: "/sin-gluten/:ciudadSlug/:category", permanent: true },
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
  // Lint y tsc viven en GitHub Actions (.github/workflows/ci.yml: npm run lint + npx tsc --noEmit).
  // Si se saca el CI, revertir ignoreDuringBuilds / ignoreBuildErrors.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  env: {
    FEATURES: process.env.FEATURES || 'phase1',
    NEXT_PUBLIC_BUILD_SHA: (
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_BUILD_SHA ||
      'local'
    ).slice(0, 12),
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: (
      process.env.VERCEL_DEPLOYMENT_ID ||
      process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ||
      ''
    ).slice(0, 64),
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    outputFileTracingIncludes: {
      "/api/admin/social/generate-image": ["./assets/fonts/**"],
    },
  },
  async headers() {
    // CSP conservador: Next (inline), Vercel Analytics, Mapbox, OAuth, Cloudinary, avatares Google.
    // Si algo de mapa/login se rompe en prod, bajar a report-only y dejar nosniff/frame/referrer.
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://api.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://accounts.google.com https://appleid.apple.com https://places.googleapis.com https://res.cloudinary.com",
      "worker-src 'self' blob:",
      "frame-src 'self' https://accounts.google.com https://appleid.apple.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://appleid.apple.com",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ")

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
      },
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
    ]

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
