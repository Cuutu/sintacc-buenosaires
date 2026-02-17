# PRs implementados según spec de auditoría

Cada PR es independiente y puede mergearse por separado. Tests y CHANGELOG incluidos.

---

## PR 1: Rate limit contact/suggestions/stats (IP + user)

**Archivos:**
- `models/RateLimitIp.ts` (nuevo)
- `lib/rate-limit.ts` (getClientIp, checkRateLimitByIp)
- `app/api/stats/route.ts`
- `app/api/contact/route.ts`
- `app/api/suggestions/route.ts`
- `models/index.ts`
- `__tests__/lib/rate-limit.test.ts`
- `__tests__/api/stats.test.ts`

**Decisión:** IP + user (doble capa). Stats solo IP (público). Contact/suggestions: user 5/10 por día + IP 20/30 por día como techo.

**Límites:**
| Ruta | Por usuario | Por IP |
|------|-------------|--------|
| stats | - | 120 / 15 min |
| contact | 5/día | 20/día |
| suggestions | 10/día | 30/día |

---

## PR 2: Places/[id] aggregation + paginación

**Archivos:**
- `app/api/places/[id]/route.ts` (Review.aggregate para stats)
- `app/api/reviews/route.ts` (page, limit, pagination)
- `app/lugar/[id]/page.tsx` (botón "Ver más reseñas")
- `__tests__/api/reviews.test.ts`

**Cambios:**
- places/[id] GET: aggregation en vez de traer todas las reviews
- reviews GET: page, limit (max 50), pagination en respuesta

---

## PR 3: NextAuth role en JWT

**Archivos:**
- `lib/auth.ts` (jwt callback, session strategy)
- `__tests__/lib/auth.test.ts`

**Cambios:**
- session.strategy = "jwt"
- jwt callback: fetch user solo en primer login, guarda id+role en token
- session callback: lee de token, sin DB

---

## PR 4: next.config images.remotePatterns

**Archivos:**
- `next.config.js`

**Cambios:**
- Reemplazo de `domains` por `remotePatterns` (Next.js 14)

---

## PR 5: Helper fetchApi + UI de error consistente

**Archivos:**
- `lib/fetchApi.ts` (nuevo)
- `app/lugar/[id]/page.tsx`
- `app/mapa/page.tsx`
- `app/favoritos/page.tsx`
- `components/home/StatsRow.tsx`
- `components/place-detail-modal.tsx`
- `components/featured/FeaturedSection.tsx`
- `__tests__/lib/fetchApi.test.ts`

**Cambios:**
- fetchApi valida res.ok, lanza FetchApiError con mensaje del API
- Toast en errores en lugar, mapa, favoritos

---

## PR 6: sitemap.ts y robots.ts

**Archivos:**
- `app/sitemap.ts`
- `app/robots.ts`

**Cambios:**
- sitemap dinámico: /, /mapa, /sugerir + todos los /lugar/[id] aprobados
- robots: allow /, disallow /admin, /api, /login, /perfil, /favoritos
- revalidate: 24h

---

## Cómo mergear como PRs separados

```bash
# Crear ramas por PR
git checkout -b pr/1-rate-limit-ip-user
git add <archivos PR1>
git commit -m "feat: rate limit IP + user para stats, contact, suggestions"
git push origin pr/1-rate-limit-ip-user

# Repetir para cada PR...
```

O mergear todo en `main` si preferís un único release.

---

## PR C1: getClientIp para Vercel/proxies

**Archivos:** `lib/rate-limit.ts`, `__tests__/lib/rate-limit.test.ts`

**Cambios:** Orden headers: x-forwarded-for (primer IP) → x-real-ip → x-vercel-forwarded-for → cf-connecting-ip → unknown.

---

## PR C2: Upload MIME/size/filename seguro

**Archivos:** `app/api/upload/route.ts`, `__tests__/api/upload.test.ts`

**Cambios:** Validación magic bytes (JPEG/PNG/WebP), MIME whitelist, límite 5MB. No se usa filename del usuario (Cloudinary genera).

---

## PR C3: Review index placeId+createdAt

**Archivos:** `models/Review.ts`

**Cambios:** `ReviewSchema.index({ placeId: 1, createdAt: -1 })` para queries con sort/paginación.

---

## PR C4: Stats cache 60s

**Archivos:** `app/api/stats/route.ts`

**Cambios:** Cache in-memory 60s + rate limit IP. Cache-Control: private, max-age=60.

---

## PR I5: Logging estructurado

**Archivos:** `lib/logger.ts`, todas las `app/api/**`

**Cambios:** logger JSON, logApiError(route, error, { request }). Reemplazo de console.error.

---

## PR I6: /api/health

**Archivos:** `app/api/health/route.ts`

**Cambios:** Chequeo DB + env vars críticas. Respuesta { status, checks, timestamp }. 503 si degradado.

---

## PR I7: TTL índices + checklist

**Archivos:** `models/RateLimit.ts`, `models/RateLimitIp.ts`, `scripts/check-indexes.ts`, `docs/INDEXES-CHECKLIST.md`, `package.json`

**Cambios:** TTL 8 días en RateLimit (date) y RateLimitIp (windowStart). Script npm run check-indexes.

---

## PR I8: fetchApi timeout

**Archivos:** `lib/fetchApi.ts`, `__tests__/lib/fetchApi.test.ts`

**Cambios:** AbortController timeout 15s, FetchApiError 408 en timeout, manejo uniforme de errores de red.
