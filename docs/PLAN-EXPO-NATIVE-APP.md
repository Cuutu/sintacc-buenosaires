# Plan: App Nativa Celimap con Expo (React Native)

**Objetivo:** App mobile best-in-class (UX nativa, offline, push, deep links) consumiendo el backend Next.js actual.

---

## A) Recomendación: Monorepo vs Repo Separado

### Recomendación final: **Monorepo**

| Aspecto | Monorepo | Repo separado |
|---------|----------|---------------|
| **Compartir código** | `packages/shared` importable por web y mobile | Duplicar o publicar paquete npm privado |
| **Sincronización tipos** | Un cambio → ambas apps actualizadas | Riesgo de desincronización |
| **CI/CD** | Un pipeline, tests compartidos | Dos pipelines, más complejidad |
| **Onboarding** | Un clone, todo en un lugar | Dos repos para clonar |
| **Conflictos** | Posibles en package.json raíz | Aislados |
| **Turborepo/nx** | Cache de builds, builds incrementales | No aplica |

**Pros monorepo:**
- Tipos TS, Zod schemas y constants compartidos sin duplicar
- Refactors en DTOs benefician web y mobile
- Un solo `package.json` raíz para dependencias comunes (zod, date-fns)
- Expo EAS soporta monorepos nativamente (SDK 52+)

**Contras monorepo:**
- Setup inicial más trabajo (Turborepo o pnpm/yarn workspaces)
- Build de `shared` debe correr antes de mobile

**Contras repo separado:**
- Duplicar `lib/validations.ts`, `lib/constants.ts`, interfaces de modelos
- Cada cambio de API requiere actualizar ambos repos manualmente

---

## B) Arquitectura Propuesta

```
sintacc-bsas/                    # Monorepo raíz
├── package.json                 # Workspaces, scripts raíz
├── pnpm-workspace.yaml          # o package.json "workspaces"
├── turbo.json                   # (opcional) Turborepo
│
├── packages/
│   └── shared/                  # Tipos, schemas, constants
│       ├── package.json
│       ├── src/
│       │   ├── index.ts          # Re-exporta todo
│       │   ├── types/            # IPlace, IReview, etc. (sin Mongoose)
│       │   ├── schemas/          # Zod (placeSchema, reviewSchema...)
│       │   └── constants/        # TYPES, NEIGHBORHOODS, PLACE_TAGS
│       └── tsconfig.json
│
├── apps/
│   ├── web/                     # Next.js actual (migrado)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/                 # fetchApi, auth, mongodb, etc.
│   │   ├── models/              # Mongoose (solo web/backend)
│   │   └── package.json
│   │
│   └── mobile/                  # Expo (nuevo)
│       ├── app/                 # Expo Router (file-based)
│       ├── components/
│       ├── lib/                 # api client, auth, storage
│       ├── assets/
│       ├── app.json
│       ├── eas.json
│       └── package.json
```

**Contenido de `packages/shared`:**
- Tipos: `IPlace`, `IReview`, `PlaceWithStats`, etc. (interfaces puras, sin `Document`)
- Schemas: `placeSchema`, `reviewSchema`, `suggestionSchema`, `contaminationReportSchema`
- Constants: `TYPES`, `NEIGHBORHOODS`, `PLACE_TAGS`, `TAG_BADGE_CONFIG`, `getTagBadgeConfig`
- Helpers: `inferSafetyLevel`, `getSafetyBadge` (de featured-utils)

**Dependencias:**
- `packages/shared`: solo `zod` (y tal vez `date-fns` si lo usás en validaciones)
- `apps/web`: `@celimap/shared` como workspace dependency
- `apps/mobile`: `@celimap/shared` como workspace dependency

**Nombre del paquete:** `@celimap/shared` (en `packages/shared/package.json`: `"name": "@celimap/shared"`).

---

## C) Pantallas MVP (Must-Have)

| # | Pantalla | Descripción | Prioridad |
|---|----------|-------------|------------|
| 1 | **Home** | Stats (lugares, reseñas, usuarios) + CTA "Abrir mapa" / "Sugerir lugar" | P0 |
| 2 | **Mapa** | Mapbox con marcadores, clustering, filtros (tipo, barrio), búsqueda, botón "Cerca mío" | P0 |
| 3 | **Detalle lugar** | Status sin TACC, dirección, cómo llegar (abrir en Maps/WhatsApp), reseñas, reportar contaminación | P0 |
| 4 | **Buscar** | Barra de búsqueda con autocomplete (Mapbox Geocoding o API propia), filtros, resultados en lista | P0 |
| 5 | **Favoritos** | Lista de lugares favoritos (requiere login) | P0 |
| 6 | **Sugerir lugar** | Formulario completo o quick mode (link Instagram/Maps) – requiere login | P0 |
| 7 | **Login / Perfil** | Google Sign-In, perfil básico, cerrar sesión | P0 |

Admin NO va en mobile (solo web).

---

## D) Plan por Fases

### Fase 0: Preparar backend para mobile (1 semana)

- **CORS:** Permitir requests desde origen mobile (headers `Origin` en dev; en prod la app hace fetch a tu dominio, no hay CORS típico salvo que uses un proxy).
- **Auth:** Nuevo endpoint `POST /api/auth/mobile-token` que recibe `idToken` de Google y devuelve JWT propio.
- **Headers:** Aceptar `Authorization: Bearer <token>` además de cookies de NextAuth.
- **Middleware:** Extender `requireAuth` para validar JWT si no hay session.
- **Rate limit:** Mismos límites; identificar por `userId` (JWT) o IP.
- **Versionado:** Opcional `Accept: application/vnd.celimap.v1+json` o query `?v=1` para futuro.

### Fase 1: MVP publicable (3–4 semanas)

- Monorepo + `packages/shared` + migración web a `apps/web`
- Proyecto Expo en `apps/mobile`
- Pantallas MVP 1–7
- API client con Bearer token
- Mapbox con clustering
- Auth con Google + JWT
- Deep links básicos
- Build EAS (Android + iOS)
- Internal testing en TestFlight y Play Console

### Fase 2: Offline + Push + Analytics (2–3 semanas)

- Cache SQLite/AsyncStorage: lugares vistos + favoritos
- Estrategia de invalidación (TTL, refresh on focus)
- Expo Push Notifications + modelo `Device` en MongoDB
- Analytics (PostHog o Expo Analytics)
- Eventos: buscar, ver_lugar, reportar, reseñar, favorito

### Fase 3: Features premium (opcional)

- Notificaciones contextuales (nuevo lugar cerca)
- Mejoras de UX (animaciones, gestos)
- Optimizaciones de performance

---

## E) Auth: Solución Recomendada

### Problema

NextAuth usa cookies HTTP-only. React Native no envía cookies automáticamente a dominios externos de forma confiable. Las APIs usan `getServerSession(authOptions)` que lee cookies.

### Solución recomendada: **JWT propio + Google Sign-In nativo**

1. **Flujo:**
   - Usuario toca "Iniciar sesión con Google" en la app.
   - `expo-auth-session` o `@react-native-google-signin/google-signin` abre OAuth.
   - Google devuelve `idToken` (JWT de Google).
   - App envía `POST /api/auth/mobile-token` con `{ idToken: "..." }`.
   - Backend verifica el `idToken` con la librería de Google, busca/crea usuario en MongoDB, genera JWT propio (`{ sub: userId, role, exp }`).
   - App guarda el JWT en `SecureStore` y lo envía en `Authorization: Bearer <token>` en cada request.

2. **Backend – nuevo endpoint:**

```
POST /api/auth/mobile-token
Content-Type: application/json
{ "idToken": "eyJhbGc..." }

Response 200:
{ "token": "eyJ...", "user": { "id": "...", "email": "...", "name": "...", "image": "...", "role": "user" } }
```

3. **Implementación backend:**
   - Usar `google-auth-library` para verificar `idToken`.
   - Misma lógica que `signIn` callback de NextAuth: crear/actualizar User, determinar role.
   - Firmar JWT con `NEXTAUTH_SECRET` (o `JWT_SECRET`) para consistencia.
   - Expiración: 30 días (igual que NextAuth).

4. **No mantener NextAuth para mobile:**
   - NextAuth está pensado para web (cookies, redirects).
   - Un endpoint dedicado es más simple y controlable.
   - El web sigue con NextAuth; el mobile usa JWT.

5. **Alternativa descartada:**
   - WebView con NextAuth: funciona pero peor UX (abre browser, vuelve a app) y dependencia de WebView.

---

## F) Mapas: Mapbox en React Native

### Opción principal: `@rnmapbox/maps` (Mapbox)

- SDK oficial para React Native.
- Clustering: usar `supercluster` para agrupar marcadores por zoom.
- Estilo: `mapbox://styles/mapbox/dark-v11` para consistencia con web.
- Permisos: `expo-location` para "Cerca mío".

**Dependencias:**
```bash
npx expo install @rnmapbox/maps
npm install supercluster
```

**Config:** Token en `app.json` o env:
```json
{
  "expo": {
    "plugins": [
      ["@rnmapbox/maps", { "RNMapboxMapsImpl": "mapbox", "RNMapboxMapsDownloadToken": "MAPBOX_DOWNLOADS_TOKEN" }]
    ]
  }
}
```

- `MAPBOX_ACCESS_TOKEN`: token público (pk.*)
- `MAPBOX_DOWNLOADS_TOKEN`: token de descargas (para el SDK; secreto en EAS Secrets)

**Fallback si Mapbox RN complica:** `react-native-maps` con Google Maps. Menos features, pero estable. Para clustering con Mapbox es preferible seguir con `@rnmapbox/maps`.

---

## G) Offline (Obligatorio)

### Estrategia

1. **Qué cachear:**
   - Últimos N lugares vistos (ej. 50), con datos completos.
   - Favoritos del usuario (lista de IDs + datos de lugar).
   - Stats de homepage (lugaresCount, reviewsCount, usersCount).

2. **Persistencia:**
   - `expo-sqlite` para datos estructurados (lugares, favoritos).
   - O `@react-native-async-storage/async-storage` para JSON simple si el volumen es bajo.

3. **Invalidación:**
   - Lugares vistos: TTL 24–48 h; al abrir detalle sin red, mostrar cache si existe.
   - Favoritos: refresh on app focus si hay conexión; guardar en DB local al sincronizar.
   - Stats: TTL 1 h.

4. **Flujo:**
   - Al abrir app sin red: mostrar home con stats cached, mapa con marcadores cacheados (si hay), favoritos.
   - Banner: "Sin conexión. Mostrando datos guardados."
   - Al recuperar red: refresh en background.

5. **Implementación sugerida:**
   - Capa `lib/offline.ts` con funciones `getCachedPlace(id)`, `cachePlace(place)`, `getCachedPlaces()`, `clearExpired()`.
   - API client: intentar red primero; si falla y es GET, devolver de cache cuando aplique.

---

## H) Push Notifications

### Stack

- **Expo Push (EAS):** `expo-notifications` + `expo-device`.
- **Backend:** Colección `Device` en MongoDB: `{ userId, expoPushToken, platform, createdAt }`.
- **Endpoint:** `POST /api/device-tokens` (auth) para registrar token.

### Eventos a notificar (Fase 2)

| Evento | Descripción | Frecuencia |
|--------|-------------|-------------|
| Nuevo lugar cerca | Lugar aprobado a X km del usuario | Semanal (resumen) o instantáneo |
| Cambios en favoritos | Nueva reseña o reporte en lugar favorito | Al detectar cambio |
| Recordatorio | "Hacé tu reseña del lugar X" | Opcional, 1 vez post-visita |

### Modelo sugerido

```ts
// Device schema
{
  userId: ObjectId,
  expoPushToken: string,
  platform: "ios" | "android",
  preferences?: {
    newPlacesNearby: boolean,
    updatesOnFavorites: boolean,
  },
  lastLocation?: { lat, lng },
  createdAt, updatedAt
}
```

---

## I) Deep Links

### Esquemas

- **Custom scheme:** `celimap://lugar/123` (desarrollo y fallback)
- **Universal Links (iOS):** `https://celimap.com.ar/lugar/123`
- **App Links (Android):** `https://celimap.com.ar/lugar/123`

### Configuración

1. **iOS – Universal Links:**
   - Hosting en `https://celimap.com.ar/.well-known/apple-app-site-association`:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [{
         "appID": "TEAMID.com.celimap.app",
         "paths": ["/lugar/*", "/mapa", "/"]
       }]
     }
   }
   ```

2. **Android – App Links:**
   - `https://celimap.com.ar/.well-known/assetlinks.json`:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.celimap.app",
       "sha256_cert_fingerprints": ["SHA256_FINGERPRINT"]
     }
   }]
   ```

3. **Expo:**
   - `app.json`: `scheme: "celimap"`, `ios.associatedDomains: ["applinks:celimap.com.ar"]`
   - En `app/_layout.tsx` o raíz: `Linking.getInitialURL()` y `Linking.addEventListener('url', ...)` para parsear y navegar a `/lugar/[id]`.

---

## J) Publicación

### EAS Build + Submit

```bash
# Desde apps/mobile/
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
npx eas submit --platform android --profile preview --latest
npx eas submit --platform ios --profile preview --latest
```

### eas.json (ejemplo)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": { "autoIncrement": true }
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./google-service-account.json" },
      "ios": { "appleId": "...", "ascAppId": "..." }
    }
  }
}
```

### Checklist de assets

| Asset | Android | iOS |
|-------|---------|-----|
| App icon | 512x512, 48–192dp | 1024x1024 |
| Splash | 2732x2732 | 2732x2732 |
| Screenshots | 2+ por tipo (phone, tablet) | 6.5", 5.5", iPad |
| Feature graphic | 1024x500 | - |
| Privacy policy | URL pública | URL pública |

---

## K) Testing

### Unit (Jest)

- `packages/shared`: schemas Zod, helpers (`inferSafetyLevel`, etc.).
- `apps/mobile/lib`: API client, funciones de offline.
- Jest config en `apps/mobile/jest.config.js`.

### E2E: **Maestro** (recomendado)

- No requiere cambios en el build nativo.
- YAML legible; tests cross-platform.
- Instalación: `curl -Ls https://get.maestro.mobile.dev | bash`
- Ejecutar: `maestro test flows/` contra simulador o dispositivo.

**Alternativa Detox:** más integrado con RN pero setup más pesado (config nativa, Jest). Para arrancar, Maestro es más simple.

### QA Checklist en dispositivos reales

- [ ] Login con Google en iOS y Android
- [ ] Mapa: cargar, zoom, clustering, filtros
- [ ] "Cerca mío" con permisos de ubicación
- [ ] Detalle lugar: abrir Maps, WhatsApp, Instagram
- [ ] Reseña y reporte de contaminación
- [ ] Favoritos add/remove
- [ ] Sugerir lugar (form completo y quick mode)
- [ ] Offline: sin red, ver lugares cacheados
- [ ] Deep link: abrir `celimap://lugar/ID` y `https://celimap.com.ar/lugar/ID`
- [ ] Push: recibir notificación de prueba

---

## Lista de PRs / Chunks

### PR1: Estructura monorepo + shared package

**Objetivo:** Crear monorepo y paquete compartido sin tocar la web.

**Archivos nuevos:**
```
package.json              # raíz: workspaces, "build": "turbo run build"
pnpm-workspace.yaml       # packages: ["packages/*", "apps/*"]
turbo.json               # (opcional) pipeline
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/index.ts
packages/shared/src/types/place.ts
packages/shared/src/types/review.ts
packages/shared/src/types/index.ts
packages/shared/src/schemas/index.ts
packages/shared/src/constants/index.ts
packages/shared/src/utils/safety.ts
```

**Contenido `packages/shared/src/types/place.ts`:**
```ts
export interface IPlace {
  _id: string
  name: string
  type: "restaurant" | "cafe" | "bakery" | "store" | "icecream" | "bar" | "other"
  types?: string[]
  address: string
  neighborhood: string
  location: { lat: number; lng: number }
  addressText?: string
  tags: string[]
  contact?: { instagram?: string; whatsapp?: string; phone?: string; url?: string }
  openingHours?: string
  delivery?: { available?: boolean; rappi?: string; pedidosya?: string }
  photos: string[]
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  // ... resto de campos de models/Place
}
```

**Contenido `packages/shared/src/schemas/index.ts`:** Copiar `placeSchema`, `reviewSchema`, etc. de `lib/validations.ts` (solo Zod, sin Mongoose).

**Comandos:**
```bash
# En raíz del repo
pnpm init
echo 'packages:\n  - "packages/*"\n  - "apps/*"' > pnpm-workspace.yaml
mkdir -p packages/shared/src/{types,schemas,constants,utils}
cd packages/shared && pnpm init
pnpm add zod
pnpm add -D typescript
```

**Criterios:** `packages/shared` exporta tipos y constants; `pnpm build` en shared compila sin errores.

---

### PR2: Migrar web a apps/web

**Objetivo:** Mover Next.js actual a `apps/web` y que use `@celimap/shared`.

**Estructura actual → destino:**
- `app/` → `apps/web/app/`
- `components/` → `apps/web/components/`
- `lib/` → `apps/web/lib/`
- `models/` → `apps/web/models/`
- `public/` → `apps/web/public/`
- `scripts/` → `apps/web/scripts/`
- `next.config.js`, `tailwind.config.ts`, `postcss.config.js` → `apps/web/`

**Archivos a modificar:**
- `apps/web/package.json`: agregar `"@celimap/shared": "workspace:*"`
- Reemplazar en archivos: `from "@/lib/constants"` → `from "@celimap/shared"` (constants)
- Reemplazar: `from "@/lib/validations"` → `from "@celimap/shared"` (schemas) - mantener validations que usen Mongoose/servidor en lib
- `apps/web/tsconfig.json`: paths si es necesario

**Comandos:**
```bash
mkdir -p apps
mv app components lib models public scripts next.config.js tailwind.config.ts postcss.config.js tsconfig.json jest.config.js apps/web/
cp package.json apps/web/ && cd apps/web && pnpm install
# Ajustar "name" en apps/web/package.json a "celimap-web"
pnpm dev
```

**Criterios:** `pnpm dev` en apps/web corre; build `pnpm build` pasa; no se rompe nada.

---

### PR3: Backend – Auth mobile (JWT)

**Objetivo:** Endpoint `POST /api/auth/mobile-token` y soporte Bearer en `requireAuth`.

**Archivos a tocar:**
- `apps/web/app/api/auth/mobile-token/route.ts` (nuevo)
- `apps/web/lib/middleware.ts` (leer `Authorization: Bearer` y validar JWT)
- `apps/web/lib/jwt.ts` (nuevo: sign, verify)
- `apps/web/package.json`: agregar `google-auth-library`

**Lógica:**
1. Recibir `{ idToken }`
2. Verificar con `OAuth2Client.verifyIdToken`
3. Obtener email, buscar/crear User (misma lógica que NextAuth signIn)
4. Firmar JWT `{ sub: userId, role, email, exp }`
5. Devolver `{ token, user }`

**Comandos:**
```bash
cd apps/web
pnpm add google-auth-library jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

**Criterios:** `curl -X POST .../api/auth/mobile-token -d '{"idToken":"..."}'` devuelve token y user.

---

### PR4: Backend – CORS y headers

**Objetivo:** Aceptar requests desde mobile (y/o dev).

**Archivos:**
- `apps/web/next.config.js`: headers CORS para `/api/*`
- o middleware `next.config` con `headers()` para `Access-Control-Allow-Origin` si usás dominio distinto

**Criterios:** Request desde Postman/Insomnia con `Origin: capacitor://localhost` (o tu origin) no falla por CORS.

---

### PR5: Crear proyecto Expo

**Objetivo:** App Expo base en `apps/mobile`.

**Comandos:**
```bash
cd apps
npx create-expo-app@latest mobile --template tabs
cd mobile
pnpm add @celimap/shared
pnpm add @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

**Archivos a crear/modificar:**
- `apps/mobile/app.json` – agregar:
  ```json
  {
    "expo": {
      "name": "Celimap",
      "slug": "celimap",
      "scheme": "celimap",
      "plugins": [
        ["@rnmapbox/maps", { "RNMapboxMapsImpl": "mapbox" }]
      ]
    }
  }
  ```
- `apps/mobile/package.json`: `"@celimap/shared": "workspace:*"`
- `apps/mobile/tsconfig.json`: `"baseUrl": ".", "paths": { "@/*": ["./*"] }`

**Criterios:** `pnpm start` abre Expo; app corre en simulador; import desde `@celimap/shared` funciona.

---

### PR6: API client mobile

**Objetivo:** Cliente HTTP que consume APIs con Bearer token.

**Archivos:**
- `apps/mobile/lib/api.ts`: `createApiClient(baseUrl, getToken?)`
- `apps/mobile/lib/endpoints.ts`: funciones `getPlaces`, `getPlace`, `getReviews`, etc.

**Comandos:**
```bash
cd apps/mobile
pnpm add @react-native-async-storage/async-storage
```

**Criterios:** `getPlaces()` y `getPlace(id)` devuelven datos; con token, `getFavorites()` funciona.

---

### PR7: Auth mobile (Google + JWT)

**Objetivo:** Login con Google, guardar JWT, enviarlo en requests.

**Archivos:**
- `apps/mobile/lib/auth.ts`: `signInWithGoogle()`, `getToken()`, `signOut()`
- `apps/mobile/app/(auth)/login.tsx`: pantalla de login
- `apps/mobile/app/_layout.tsx`: AuthProvider que usa el token en el API client

**Comandos:**
```bash
cd apps/mobile
npx expo install expo-auth-session expo-crypto expo-secure-store
# Configurar Google Cloud Console: Android client + iOS client
```

**Criterios:** Login con Google muestra perfil; requests protegidos incluyen token.

---

### PR8: Pantallas Home + Stats

**Objetivo:** Home con stats y CTAs.

**Archivos:**
- `apps/mobile/app/(tabs)/index.tsx`: Home
- `apps/mobile/components/StatsRow.tsx`
- `apps/mobile/lib/endpoints.ts`: `getStats()`

**Criterios:** Home muestra lugaresCount, reviewsCount; botones llevan a mapa y sugerir.

---

### PR9: Pantalla Mapa (Mapbox + clustering)

**Objetivo:** Mapa con marcadores y clustering.

**Archivos:**
- `apps/mobile/app/(tabs)/mapa.tsx`
- `apps/mobile/components/map/MapScreen.tsx`
- `apps/mobile/components/map/ClusteredMarkers.tsx` (supercluster)

**Comandos:**
```bash
cd apps/mobile
npx expo install @rnmapbox/maps expo-location
pnpm add supercluster
```

**Criterios:** Mapa carga, muestra lugares, clustering al hacer zoom out, botón "Cerca mío" centra en ubicación.

---

### PR10: Pantalla Detalle lugar

**Objetivo:** Detalle con datos, reseñas, acciones (Maps, WhatsApp, etc.).

**Archivos:**
- `apps/mobile/app/lugar/[id].tsx`
- `apps/mobile/components/place/PlaceDetail.tsx`
- `apps/mobile/components/place/ReviewList.tsx`
- `apps/mobile/components/place/ContaminationReportForm.tsx`

**Criterios:** Ver lugar, reseñas, reportar contaminación, abrir Maps/WhatsApp.

---

### PR11: Buscar + Favoritos

**Objetivo:** Búsqueda con filtros y lista de favoritos.

**Archivos:**
- `apps/mobile/app/(tabs)/buscar.tsx`
- `apps/mobile/app/(tabs)/favoritos.tsx`
- `apps/mobile/components/search/SearchBar.tsx`
- `apps/mobile/components/search/PlaceFilters.tsx`

**Criterios:** Buscar por texto y filtros; favoritos muestra lista (con login).

---

### PR12: Sugerir lugar

**Objetivo:** Formulario de sugerencia (completo o quick).

**Archivos:**
- `apps/mobile/app/sugerir.tsx`
- `apps/mobile/components/suggestion/SuggestionForm.tsx`

**Criterios:** Enviar sugerencia (requiere login); quick mode con link.

---

### PR13: Perfil + Logout

**Objetivo:** Pantalla perfil y cerrar sesión.

**Archivos:**
- `apps/mobile/app/(tabs)/perfil.tsx`
- `apps/mobile/components/profile/ProfileHeader.tsx`

**Criterios:** Ver email/foto; cerrar sesión limpia token y redirige a login.

---

### PR14: Deep links

**Objetivo:** Abrir `celimap://lugar/123` y URLs universales.

**Archivos:**
- `apps/mobile/app.json`: scheme, associatedDomains
- `apps/mobile/app/_layout.tsx`: listener de Linking
- `apps/web/public/.well-known/apple-app-site-association`
- `apps/web/public/.well-known/assetlinks.json`

**Criterios:** Abrir link externo lleva a detalle del lugar.

---

### PR15: Offline cache

**Objetivo:** Cache de lugares y favoritos.

**Archivos:**
- `apps/mobile/lib/offline.ts`: SQLite o AsyncStorage
- `apps/mobile/lib/api.ts`: fallback a cache cuando no hay red
- Hook `useNetworkStatus` para banner offline

**Criterios:** Sin red, lugares vistos recientes y favoritos se muestran desde cache.

---

### PR16: EAS Build + Submit

**Objetivo:** Builds Android e iOS y envío a stores.

**Archivos:**
- `apps/mobile/eas.json`
- `apps/mobile/app.json`: icon, splash, version
- EAS Secrets: MAPBOX tokens, Google credentials

**Comandos:**
```bash
cd apps/mobile
npx eas login
npx eas build:configure
npx eas build --platform all --profile preview
```

**Criterios:** APK (preview) e IPA (TestFlight) se generan correctamente.

---

## Comandos Rápidos de Referencia

```bash
# Crear Expo app (desde apps/)
npx create-expo-app@latest mobile --template tabs

# Configurar EAS
cd apps/mobile
npx eas login
npx eas build:configure

# Desarrollar
pnpm start              # Metro bundler
pnpm android            # Android emulator
pnpm ios                # iOS simulator (solo Mac)

# Build
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview

# Submit
npx eas submit --platform android --profile production --latest
npx eas submit --platform ios --profile production --latest
```

---

## Tema Visual

- **Dark theme** consistente con web.
- Colores: `#0a0a0a` fondo, `#fafafa` texto, primary (ej. verde/teal para "sin TACC").
- Componentes: React Native Paper o custom con `StyleSheet`; no shadcn (es web).
- Tipografía: `Inter` o `System` (San Francisco / Roboto).
