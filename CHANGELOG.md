# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

## [Unreleased]

### Added
- (C1) getClientIp: x-vercel-forwarded-for, cf-connecting-ip; tests
- (C2) Upload: validación magic bytes MIME; tests
- (C3) Review index { placeId: 1, createdAt: -1 }
- (C4) Stats cache in-memory 60s + rate limit IP
- (I5) lib/logger: JSON estructurado, logApiError
- (I6) /api/health: DB + env vars
- (I7) TTL RateLimit/RateLimitIp (8 días); scripts/check-indexes.ts; docs/INDEXES-CHECKLIST.md
- (I8) fetchApi: AbortController timeout 15s, FetchApiError 408

### Changed
- Stats API: requiere rate limit por IP antes de consultar DB
- (PR2) places/[id] GET: usa Review.aggregate para stats (avgRating, totalReviews, safeFeelingCount) en vez de cargar todas las reviews
- (PR3) Session callback ya no consulta User en cada request; usa JWT
- (PR4) Migración de images.domains a images.remotePatterns (Next.js 14)
- (PR5) lugar, mapa, StatsRow, place-detail-modal, FeaturedSection, favoritos usan fetchApi; toast en errores
- (PR6) SEO: sitemap.xml y robots.txt generados automáticamente
