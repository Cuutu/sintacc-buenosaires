# Auditoría técnica completa - SinTACC BSAS (Celimap)

**Fecha:** Febrero 2025  
**Rol:** Tech Lead  
**Objetivo:** Identificar riesgos futuros, bugs potenciales, deuda técnica y proponer mejoras priorizadas.

---

## 1. Mapa del proyecto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14 App Router)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ app/                                                                         │
│ ├── page.tsx (Home) ──────────────────┐                                     │
│ ├── layout.tsx (Providers, Navbar, Footer)                                  │
│ ├── mapa/page.tsx ────────────────────┼──► components/ (map-view, search)  │
│ ├── lugar/[id]/page.tsx ──────────────┤     components/ui/ (shadcn)          │
│ ├── sugerir/page.tsx                   │     components/featured/             │
│ ├── favoritos/page.tsx                 │     components/admin/                │
│ ├── admin/page.tsx                     │     components/ContactModal, etc.    │
│ ├── perfil/page.tsx                   │                                     │
│ └── login/page.tsx                    │                                     │
└────────────────────────────────────────┼─────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ API Routes (app/api/)                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ /api/places, /api/places/[id], /api/places/near ──► Place model               │
│ /api/reviews ───────────────────────────────────► Review + rate-limit         │
│ /api/contamination-reports ─────────────────────► ContaminationReport         │
│ /api/suggestions ───────────────────────────────► Suggestion (sin rate limit) │
│ /api/contact ───────────────────────────────────► Contact + Resend (sin limit)│
│ /api/upload ───────────────────────────────────► Cloudinary (folder user-ctl)│
│ /api/favorites ─────────────────────────────────► Favorite (phase2)           │
│ /api/stats ─────────────────────────────────────► Public, sin auth            │
│ /api/admin/* ───────────────────────────────────► requireAdmin               │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ lib/                                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ mongodb.ts (conexión con cache global)    auth.ts (NextAuth + DB en session)  │
│ rate-limit.ts (MongoDB, checkRateLimit)  validations.ts (Zod + sanitizeHtml) │
│ middleware.ts (requireAuth/requireAdmin)   features.ts (FEATURES env)          │
│ geocode.ts (Mapbox API)                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ models/ (Mongoose)                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Place, Review, Suggestion, User, Contact, ContaminationReport, RateLimit,     │
│ Favorite                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Conexiones principales:**
- Home → StatsRow (stats API) + FeaturedSection (places API)
- Mapa → places API (filtros) + geocode (Mapbox)
- Lugar/[id] → places/[id], reviews, contamination-reports
- Sugerir → suggestions API
- Admin → admin/* APIs (suggestions, reviews, places, contacts)

---

## 2. Top 15 riesgos futuros

| # | Riesgo | Impacto | Prob. | Evidencia | Fix recomendado |
|---|--------|---------|-------|-----------|------------------|
| 1 | **Email personal en .env.example** | 4 | 5 | `.env.example` L24, `docs/RESEND-SETUP.md`, `docs/VERCEL-ENV-VARS.md` | Reemplazar por placeholder `tu-email@ejemplo.com` |
| 2 | **Place detail: 404 se renderiza como lugar** | 4 | 5 | `app/lugar/[id]/page.tsx` L59-62: no chequea `res.ok`, setPlace(data) con `{error}` | Verificar `res.ok` y setPlace(null) en error |
| 3 | **Contact y Suggestions sin rate limiting** | 4 | 4 | `app/api/contact/route.ts`, `app/api/suggestions/route.ts` | Agregar checkRateLimit (ej. 5 contact/día, 10 suggestions/día) |
| 4 | **Places GET: limit sin máximo** | 3 | 5 | `app/api/places/route.ts` L21: `limit` sin cap | `limit = Math.min(parseInt(limit) \|\| 20, 100)` |
| 5 | **Near API: lat/lng/radius sin validación** | 3 | 4 | `app/api/places/near/route.ts` L17-20 | Validar rango lat/lng, cap radius (ej. 50km) |
| 6 | **places/[id] GET: N+1 y carga full reviews** | 4 | 4 | `app/api/places/[id]/route.ts` L33-45: trae todas las reviews para calcular avg | Usar aggregation en vez de find + reduce |
| 7 | **Auth: query a DB en cada session** | 3 | 5 | `lib/auth.ts` L46-55: User.findOne en cada getServerSession | Cachear role en JWT o usar session strategy con menos DB |
| 8 | **Upload: folder user-controlled** | 3 | 3 | `app/api/upload/route.ts` L17: `folder` desde formData | Whitelist: solo `celimap` o `places` |
| 9 | **Stats API público sin rate limit** | 2 | 4 | `app/api/stats/route.ts` | Rate limit por IP o cache corto (60s) |
| 10 | **Seed elimina todos los Place** | 5 | 2 | `scripts/seed.ts` L13-14: `Place.deleteMany({})` | Confirmación interactiva o flag `--force` |
| 11 | **next.config: images.domains deprecated** | 2 | 5 | `next.config.js` L4-5 | Migrar a `images.remotePatterns` (Next.js 14) |
| 12 | ~~Repositorios no usados en APIs~~ | — | — | ~~Resuelto: carpeta `lib/repositories/` eliminada~~ | — |
| 13 | **No hay sitemap ni robots.txt** | 3 | 5 | No existen `sitemap.ts`, `robots.ts` | Agregar para SEO (places indexables) |
| 14 | **Varios fetches sin res.ok** | 3 | 4 | `app/mapa/page.tsx`, `favoritos`, `place-detail-modal`, `StatsRow`, etc. | Crear helper `fetchApi` que valide res.ok |
| 15 | **Rate limit: race condition** | 2 | 2 | `lib/rate-limit.ts`: $inc antes de check, 2 requests simultáneos podrían pasar | Aceptable para 3/día; documentar o usar $max condicional |

---

## 3. Quick wins (<1h)

| # | Tarea | Tiempo | Prioridad |
|---|-------|--------|-----------|
| 1 | Eliminar email personal de .env.example y docs | 15 min | 🔴 Crítica |
| 2 | Cap limit/radius en places y near APIs | 15 min | Alta |
| 3 | Verificar res.ok en lugar/[id] fetchPlace | 15 min | Alta |
| 4 | Rate limiting en contact (5/día) | 20 min | Alta |
| 5 | Rate limiting en suggestions (10/día) | 20 min | Alta |
| 6 | Whitelist folder en upload | 10 min | Media |

---

## 4. Mejoras medianas (1-2 días)

| # | Tarea | Descripción |
|---|-------|-------------|
| 1 | Optimizar places/[id] stats | Usar `Review.aggregate` para avg/count en vez de traer todas las reviews |
| 2 | Cache en session callback | Evitar User.findOne en cada request; cachear role en token |
| 3 | Migrar images.domains a remotePatterns | Actualizar next.config para Next.js 14 |
| 4 | Helper fetchApi + res.ok en componentes | Centralizar manejo de errores de fetch |
| 5 | Sitemap y robots.txt | app/sitemap.ts, app/robots.ts con lugares públicos |

---

## 5. Mejoras grandes (1-2 semanas)

| Semana | Tarea |
|--------|-------|
| 1 | **Observabilidad**: Logging estructurado, métricas básicas (Vercel Analytics o similar), alertas en errores 5xx |
| 2 | **Escalabilidad**: Índices MongoDB audit, caching de stats (Redis o in-memory), paginación en reviews |
| 3 | **Seguridad**: Rate limit global (IP) con middleware, revisión de CORS si hay API pública |
| 4 | **DX**: Unificar capa de datos (repos vs modelos), tests E2E para flujos críticos |

---

## 6. Checklist de producción

| Item | Estado | Notas |
|------|--------|-------|
| Env vars requeridas | ⚠️ | check-env.ts existe; CONTACT_EMAIL, RESEND no están en required |
| Secretos fuera del repo | ✅ | .env en .gitignore |
| Backups MongoDB | ❓ | Asunción: Atlas backup habilitado |
| Rate limits | ✅ | reviews, contamination, contact, suggestions, stats, listas |
| Monitoreo/alertas | ⚠️ | Logger JSON existe; falta alerta en 5xx |
| CORS | ✅ | Next.js default (same-origin) |
| HTTPS | ✅ | Vercel lo maneja |
| Validación de inputs | ✅ | Zod en APIs |
| Sanitización HTML | ✅ | sanitizeHtml en reviews/reports |
| Auth en rutas admin | ✅ | requireAdmin |

---

## Asunciones

1. **MongoDB Atlas**: Se asume que los backups están configurados. Validar en dashboard.
2. **Resend**: Límite de envío según plan; sin rate limit en contact, spam podría agotar cuota.
3. **Mapbox**: Token público (NEXT_PUBLIC_) expuesto en cliente; es esperado. Restricciones en Mapbox Studio (allowed URLs).

---

## Cambios implementados (Quick wins)

| Archivo | Cambio |
|---------|--------|
| `.env.example` | `CONTACT_EMAIL` → placeholder `tu-email@ejemplo.com` |
| `docs/RESEND-SETUP.md`, `docs/VERCEL-ENV-VARS.md` | Reemplazado email personal por placeholder |
| `app/api/places/route.ts` | `limit` con cap 1-100, `page` mínimo 1 |
| `app/api/places/near/route.ts` | Validación lat/lng (-90 a 90, -180 a 180), radius 100m-50km |
| `app/lugar/[id]/page.tsx` | Verificación `res.ok` en fetchPlace, setPlace(null) en error |
| `app/api/contact/route.ts` | Rate limit 5 mensajes/día por usuario |
| `app/api/suggestions/route.ts` | Rate limit 10 sugerencias/día por usuario |
| `app/api/upload/route.ts` | Whitelist folder: solo `celimap` o `places` |

---

## Hallazgos adicionales (build/test)

- **Jest**: `jest-environment-jsdom` no está instalado → `npm install -D jest-environment-jsdom`
- **Mongoose**: Duplicate index en `{email:1}` en User model (index: true + schema.index)
- **ESLint**: Warnings de `react-hooks/exhaustive-deps` y `@next/next/no-img-element` en varios componentes

---

## Modelos nuevos (post-auditoría)

- **List**: listas públicas con likes
- **ListLike**: registro de likes por usuario
- Índices recomendados: ver `docs/INDEXES-CHECKLIST.md`
