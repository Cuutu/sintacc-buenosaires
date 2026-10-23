/** @type {import('next').NextConfig} */
/**
 * PWA web (next-pwa):
 * - register:false → registro solo en navegador vía <PwaRegister /> (nativo no registra).
 * - skipWaiting/clientsClaim false → SW nuevo queda en "waiting".
 *   Ciclo real: waiting → usuario acepta banner → SKIP_WAITING → controllerchange → 1 reload.
 *   Postergar = seguir con build actual. NO afirmar activación automática en cold start.
 * - NO reglas runtime sobre /_next/static: los chunks van directo a la red y al cache
 *   HTTP del navegador (un NetworkOnly ahí hacía que el SW arranque por cada chunk).
 * - Assets hasheados: sin runtime route. Tienen Cache-Control immutable, así que el
 *   navegador los guarda solo.
 * - Offline: fonts/images/api runtime.
 *
 * Precarga vacía (perf-29). Antes precacheaba todos los chunks y todo public/, y la
 * instalación fallaba en el segundo archivo (/_next/app-build-manifest.json da 404):
 * el SW nunca llegó a instalarse en producción. Precargar todo eran ~700 KB gzip
 * extra para cada visitante nuevo y otra tanda en cada deploy, sin beneficio real
 * (no hay página offline y el navegador ya cachea los chunks). Sin precarga, sw.js
 * no cambia entre builds, así que tampoco sale el aviso de actualización en cada deploy.
 *
 * navigationPreload: con un SW activo, cada navegación tiene que esperar a que el SW
 * arranque (50–150 ms en un Android). Con preload, el pedido de la página sale en
 * paralelo y la regla de navegaciones de abajo usa esa respuesta.
 */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  skipWaiting: false,
  clientsClaim: false,
  buildExcludes: [/./],
  additionalManifestEntries: [],
  navigationPreload: true,
  runtimeCaching: [
    // NO añadir /_next/static aquí: son immutable y los cachea el navegador.
    // Navegaciones: siempre a la red, con la respuesta del navigation preload. Todas las
    // navegaciones pasan por acá (también /api/auth/*) para que nunca se pida dos veces.
    {
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkOnly",
    },
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
      // Singular que la gente escribe (y algún link viejo): daba 404 (revisión 23/10).
      { source: "/lista", destination: "/listas", permanent: true },
      { source: "/lista/:id", destination: "/listas/:id", permanent: true },
      // Huérfana SSG: canonical ya era /sin-gluten/:ciudad/:cat. Pretty /{cat}-sin-gluten/{ciudad} ya 301 en middleware.
      { source: "/categoria/:category/:ciudadSlug", destination: "/sin-gluten/:ciudadSlug/:category", permanent: true },
    ];
  },
  // Landings SEO con ISR: la versión limpia (página 1, sin filtros) es estática y
  // las variantes con query van a la ruta hermana /filtrado, dinámica. La URL
  // pública no cambia. /{categoria}-sin-gluten?page= lo resuelve el middleware.
  // Ver lib/seo/landing-variants.ts.
  async rewrites() {
    const variant = (source, destination, keys) =>
      keys.map((key) => ({ source, has: [{ type: "query", key }], destination }))
    // "provincia" es una carpeta propia (/sin-gluten/provincia/...), no una ciudad.
    const ciudad = ":ciudadSlug((?!provincia(?:/|$))[^/]+)"
    return {
      beforeFiles: [
        ...variant(`/sin-gluten/${ciudad}`, "/sin-gluten/:ciudadSlug/filtrado", ["page", "barrio"]),
        ...variant(
          `/sin-gluten/${ciudad}/:categoriaSlug((?!filtrado$)[^/]+)`,
          "/sin-gluten/:ciudadSlug/:categoriaSlug/filtrado",
          ["page"]
        ),
      ],
    }
  },
  images: {
    // Las fotos de Cloudinary van directo a su CDN (components/place-image.tsx).
    // Lo que sigue pasando por acá (Google, imágenes locales) queda 30 días en la
    // caché del servidor en vez de 60 s.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        // Copia propia de las fotos de Cloudinary (lib/image-mirror.ts, docs/RESPALDO-IMAGENES.md).
        protocol: "https",
        hostname: "img.celimap.com.ar",
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
    // CSP conservador: Next (inline), Mapbox, OAuth, Cloudinary, avatares Google.
    // Si algo de mapa/login se rompe en prod, bajar a report-only y dejar nosniff/frame/referrer.
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://img.celimap.com.ar https://lh3.googleusercontent.com https://*.googleusercontent.com https://api.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://*.mapbox.com https://accounts.google.com https://appleid.apple.com https://places.googleapis.com https://res.cloudinary.com",
      "worker-src 'self' blob:",
      // maps.google.com: vista previa del pin en /sugerir y en el admin (output=embed).
      "frame-src 'self' https://accounts.google.com https://appleid.apple.com https://maps.google.com https://www.google.com",
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
      // El local escanea el QR de la tarjeta con la cámara: sólo esta página la habilita
      // (va después para pisar el Permissions-Policy de arriba).
      {
        source: "/local/escanear",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()",
          },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
