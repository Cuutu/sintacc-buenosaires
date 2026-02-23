# Plan Técnico: App Móvil Celimap

**Objetivo:** Publicar una app descargable en Google Play y Apple App Store sin reescribir el backend, reutilizando APIs, lógica y diseño existentes.

---

## 1. Resumen Ejecutivo

**Recomendación final: Opción 3 - Capacitor**

Capacitor permite empaquetar tu web Next.js actual como app nativa con mínimos cambios: no exige reescribir UI ni lógica, tu backend y MongoDB siguen tal cual, NextAuth funciona vía WebView, Mapbox GL JS ya corre en mobile, y los endpoints existentes se consumen sin cambios. El costo inicial es bajo (~2-3 semanas MVP), el mantenimiento es un único código base (web + app), y el riesgo de rechazo en stores es menor que en PWA wrapper. Las únicas adaptaciones importantes son: configurar URL base absoluta para `fetchApi`, ajustar deep links con `@capacitor/app`, y agregar `capacitor.config.ts`. Para push notifications (Fase 2) se usa `@capacitor/push-notifications`. La alternativa React Native/Expo sería más costosa (~4-6 semanas) y duplicaría esfuerzo, pero ofrecería mejor UX nativa si más adelante priorizas performance o gestos.

---

## 2. Tabla Comparativa de las 3 Opciones

| Criterio | PWA + Wrappers (TWA/Bubblewrap) | React Native / Expo | Capacitor / Ionic |
|----------|----------------------------------|---------------------|-------------------|
| **Tiempo MVP** | 2-4 semanas | 4-6 semanas | 2-3 semanas |
| **Costo desarrollo** | Bajo | Alto | Medio |
| **Complejidad técnica** | Media | Alta | Baja |
| **Experiencia de usuario** | Buena (casi web) | Excelente (100% nativa) | Muy buena (web en WebView optimizada) |
| **Mantenimiento** | Bajo (1 codebase) | Alto (2 codebases) | Bajo (1 codebase) |
| **Reutilización de código** | 100% web | ~0% UI, ~100% APIs | ~95% web |
| **Performance mapa** | Buena | Excelente (Mapbox React Native) | Buena (Mapbox GL JS) |
| **Push notifications** | Limitado (Web Push) | Nativo completo | Nativo completo |
| **Offline** | Service Worker | AsyncStorage + persistencia | Capacitor Storage + cache |
| **Apple review risk** | Medio (WebView policies) | Bajo | Medio-Bajo |
| **Deep links** | Complejo (Universal Links) | Nativo | Nativo (`@capacitor/app`) |
| **Auth móvil** | WebView OAuth OK | Requiere OAuth móvil | WebView OAuth OK |

---

## 3. Opciones Detalladas

### Opción 1: PWA + Wrappers (Trusted Web Activity / Bubblewrap / iOS)

#### Pros
- **100% reutilización** del código web actual.
- No requiere cambios en el repo excepto agregar PWA (manifest, service worker).
- Costo mínimo: solo configurar `next-pwa`, manifest, íconos.
- Una sola codebase: web y app son idénticas.

#### Contras
- **Android:** TWA (Bubblewrap) funciona bien; la app es básicamente Chrome mostrando tu PWA.
- **iOS:** No hay TWA oficial. Opciones: Safari Add to Home Screen (limitado), o wrapper custom (Cordova/WebView) → terminas cerca de Capacitor.
- **UX:** Sensación de "web dentro de app"; gestos nativos limitados.
- **Push:** Web Push en Android limitado; en iOS muy restringido.
- **Apple review:** Pueden cuestionar si la app aporta valor más allá del sitio web; es recomendable tener features exclusivas en la app.

#### Qué se reutiliza
- Todo: `app/`, `components/`, `lib/`, `models/`, `app/api/*`.
- Solo se agrega: `public/manifest.json`, `next.config.js` con `next-pwa`, íconos, service worker.

#### Qué se reescribe
- Nada crítico. Ajustes menores:
  - `lib/fetchApi.ts`: Soporte para `NEXT_PUBLIC_API_URL` en PWA (para que funcione en standalone).
  - Rutas con `?utm_source=app` para analytics.

#### Riesgos específicos
- **Mapbox:** Funciona igual; ya usas `mapbox-gl` compatible con WebView.
- **Auth:** NextAuth en WebView; OAuth puede abrir browser externo según configuración. Verificar `NEXTAUTH_URL` para el dominio de producción.
- **Deep links:** Requiere Universal Links (iOS) y App Links (Android) con `assetlinks.json` y `apple-app-site-association`.
- **Offline:** Service worker cacheando `/mapa`, `/lugar/[id]` y assets. Limitado por tamaño de cache.
- **Push:** Web Push en Android; iOS muy limitado.

---

### Opción 2: React Native / Expo

#### Pros
- UX 100% nativa (gestos, animaciones, performance).
- Mapbox tiene SDK oficial (`@rnmapbox/maps`).
- Push notifications nativo completo en iOS y Android.
- Deep links nativos con `expo-linking`.
- Mejor percepción de "app profesional".

#### Contras
- **Reescribir toda la UI:** Componentes React web no son reutilizables en RN (DOM vs. native).
- **Tiempo:** 4-6 semanas MVP mínimo.
- **Mantenimiento:** Dos codebases: web (Next.js) y app (Expo).
- **Auth:** NextAuth no corre en RN. Necesitas:
  - `expo-auth-session` + Google OAuth en modo nativo, O
  - Backend que emita JWT/Custom Token y consumirlo en la app.
- **Costo:** Mayor inversión en desarrollo y QA.

#### Qué se reutiliza
- **APIs:** Todas (`/api/places`, `/api/reviews`, etc.) tal cual.
- **Modelos/interfaces:** `IPlace`, `IReview`, etc. se copian a un paquete compartido o se duplican.
- **Lógica de negocio:** Geocodificación, validaciones Zod, reglas de rate limit (si están en backend).
- **Backend:** Cero cambios; las APIs son REST estándar.

#### Qué se reescribe
- Toda la UI: pantallas de mapa, detalle de lugar, favoritos, perfil, login, admin (si aplica).
- Navegación: React Navigation en lugar de Next.js router.
- `fetchApi`: Reemplazo con `fetch` + URL base `https://celimap.com` + manejo de tokens.
- Auth: Flujo OAuth nativo o endpoint custom que devuelva JWT.

#### Estructura propuesta Expo

```
celimap-mobile/           # Nuevo proyecto
├── app/                  # Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx     # Mapa
│   │   ├── favoritos.tsx
│   │   └── perfil.tsx
│   ├── lugar/[id].tsx    # Detalle lugar
│   ├── sugerir.tsx
│   └── _layout.tsx
├── components/
│   ├── map/MapView.tsx   # @rnmapbox/maps
│   ├── place/PlaceCard.tsx
│   └── ...
├── lib/
│   ├── api.ts            # fetchApi con BASE_URL
│   └── auth.ts           # SessionProvider custom
├── types/                # Copia de IPlace, IReview, etc.
└── package.json
```

**Consumo de APIs actuales:**
- `fetch('https://tu-dominio.com/api/places?limit=999')` con headers `Cookie` si usas session, o `Authorization: Bearer <token>` si implementas JWT.
- Para auth: endpoint `POST /api/auth/mobile-token` que reciba el token de Google (desde `expo-auth-session`) y devuelva un JWT propio, almacenado en AsyncStorage.

---

### Opción 3: Capacitor / Ionic (wrap de web + plugins nativos)

#### Pros
- **~95% reutilización:** La app es tu Next.js compilado dentro de un WebView.
- Un solo codebase; cambios en web se reflejan en la app con un rebuild.
- Plugins nativos: push, storage, geolocation, deep links, status bar.
- NextAuth funciona: el WebView maneja OAuth como en el navegador.
- Mapbox GL JS ya funciona en WebView sin cambios.
- Tiempo MVP: 2-3 semanas.
- Mantenimiento bajo.

#### Contras
- WebView no es 100% nativa: scroll y animaciones pueden sentirse ligeramente diferentes.
- Depende de que tu web sea responsive (ya tienes `MapMobile`, bottom sheet, etc.).
- Algunos plugins requieren config nativa (iOS/Android).

#### Qué se reutiliza
- Todo el frontend: `app/`, `components/`, `lib/` (excepto ajustes menores).
- Todas las APIs.
- NextAuth, Mapbox, Tailwind, componentes UI.

#### Qué se reescribe / adapta
- **fetchApi:** Añadir `NEXT_PUBLIC_API_URL` para requests en app (ej: `https://celimap.com`).
- **Deep links:** Usar `App.addListener('appUrlOpen', ...)` para abrir `/lugar/[id]`.
- **Config:** `capacitor.config.ts`, `ios/`, `android/` generados por Capacitor.
- **Build:** Script para exportar Next.js estático y copiar a `www/` antes de `cap sync`.

#### Integración Capacitor

**1. Estructura de carpetas**
```
sintacc-bsas/
├── app/                    # Sin cambios
├── components/             # Sin cambios
├── lib/                    # Ajuste en fetchApi
├── capacitor.config.ts     # NUEVO
├── ios/                    # Generado por Capacitor
├── android/                # Generado por Capacitor
├── public/
└── package.json
```

**2. `capacitor.config.ts`**
```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.celimap.app',
  appName: 'Celimap',
  webDir: 'out',  // Next.js export estático
  server: {
    url: process.env.CAPACITOR_LIVE_RELOAD 
      ? 'http://192.168.1.X:3000' 
      : undefined,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 0 },
  },
};
```

**3. Estrategia de build - Dos enfoques**

**Enfoque A) URL remota (recomendado para Celimap)**  
La app carga tu web en vivo desde `https://celimap.com`. Cero cambios en Next.js.

```ts
// capacitor.config.ts - Producción
const config: CapacitorConfig = {
  appId: 'com.celimap.app',
  appName: 'Celimap',
  webDir: 'www',  // Debe existir con index.html mínimo (fallback si falla la URL)
  server: {
    url: 'https://celimap.com',
    cleartext: false,
  },
};
```

- **Pros:** Sin export, sin rutas estáticas; `/lugar/[id]` y todo funciona igual que en web.
- **Contras:** Requiere conexión para cargar; la doc de Capacitor indica que `server.url` es "for live-reload, not production", pero es un patrón común para apps que wrap su web ya desplegada.
- **Desarrollo:** `server.url: 'http://TU_IP:3000'`, `cleartext: true` para live reload en dispositivo.

**Enfoque B) Export estático**  
Requiere adaptar rutas dinámicas. Con `output: 'export'` en Next.js, las rutas como `/lugar/[id]` necesitan `generateStaticParams`; para IDs dinámicos podrías usar una ruta `/lugar/[[...id]]` que exporte una sola página y cargue el lugar vía `fetch` en cliente según el path. Implica más refactor. Las APIs siguen en el servidor; el frontend hace fetch a `https://celimap.com/api/...`.

**Recomendación:** Usar **Enfoque A** (URL remota). Mantener Next.js tal cual; la app es un WebView que carga tu dominio. Crear un `www/index.html` mínimo como fallback por si la URL no responde.

**4. `lib/fetchApi.ts` - Base URL**
```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchApi<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const url = typeof input === 'string' && input.startsWith('/')
    ? `${BASE_URL}${input}`
    : input;
  // ... resto igual
}
```

En `.env.production` para build de app: `NEXT_PUBLIC_API_URL=https://celimap.com`

**5. Deep links - `app/layout.tsx` o componente global**
```ts
import { App } from '@capacitor/app';

useEffect(() => {
  App.addListener('appUrlOpen', ({ url }) => {
    const slug = url.split('celimap.com').pop();
    if (slug?.startsWith('/lugar/')) {
      router.push(slug);
    }
  });
}, []);
```

**6. Rutas y navegación**
- Next.js `Link` y `useRouter` funcionan igual.
- Para links externos que abran la app: configurar Universal Links (iOS) y App Links (Android) con tu dominio.

#### Riesgos específicos Capacitor
- **Mapbox:** Funciona; ya usas `mapbox-gl` en web. En WebView puede haber pequeños delays en touch; aceptable.
- **Auth:** NextAuth en WebView; OAuth abre browser y vuelve a la app. Configurar scheme en Capacitor para el callback (ej: `celimap://`).
- **Deep links:** Plugin `@capacitor/app` + configuración en `ios/` y `android/` para los schemes.
- **Offline:** `@capacitor/preferences` para cache de IDs de lugares vistos; datos se piden al tener conexión.
- **Push:** `@capacitor/push-notifications` en Fase 2.

---

## 4. Roadmap por Fases

### Fase 0: Preparación del repo (1 semana)

- [ ] Decidir opción final (recomendado: Capacitor).
- [ ] Crear branch `mobile-app`.
- [ ] Configurar variables de entorno para app: `NEXT_PUBLIC_API_URL`.
- [ ] Ajustar `lib/fetchApi.ts` para base URL.
- [ ] Verificar que todas las rutas críticas sean responsive (mapa, lugar, favoritos, login).
- [ ] Configurar CORS si la app va a hacer requests desde otro origin (si usas URL remota).
- [ ] Revisar y documentar todos los endpoints usados por el frontend.

### Fase 1: MVP mobile (2-3 semanas)

- [ ] Integrar Capacitor (o la opción elegida).
- [ ] Configurar `capacitor.config.ts`, crear proyectos `ios/` y `android/`.
- [ ] Ajustar build: Next.js export o URL remota según estrategia.
- [ ] Probar mapa Mapbox en dispositivo real (permisos de ubicación).
- [ ] Probar flujo de login (NextAuth) en app.
- [ ] Implementar deep links para `/lugar/[id]`.
- [ ] Probar navegación principal: home, mapa, lugar, favoritos, perfil, sugerir.
- [ ] Íconos y splash screen para la app.
- [ ] Ajustar `viewport` y `theme-color` para standalone.
- [ ] Pruebas en dispositivos físicos iOS y Android.

### Fase 2: Mejoras (2-4 semanas)

- [ ] Push notifications: `@capacitor/push-notifications`.
- [ ] Backend: endpoint para registrar device tokens (colección `Device` o similar).
- [ ] Offline básico: cache de lugares vistos con `@capacitor/preferences` o SQLite.
- [ ] Favoritos sync: ya existe API; asegurar persistencia local si hay offline.
- [ ] Analytics: eventos (buscar, ver_lugar, reportar_contaminacion, reseñar) con PostHog/Vercel Analytics.
- [ ] Deep links para compartir: "Compartir lugar" que genere link `https://celimap.com/lugar/[id]`.
- [ ] Rate limiting y manejo de errores de red mejorado en la app.

---

## 5. Checklist de Requerimientos por Store

### Android (Google Play)

| Requisito | Acción |
|-----------|--------|
| Cuenta developer | Registrar en [play.google.com/console](https://play.google.com/console) - USD 25 única vez |
| Íconos | 512x512 (Play Store), 48-192dp para la app |
| Screenshots | Mín. 2 por tipo de dispositivo (teléfono, 7" tablet, 10" tablet) |
| Feature graphic | 1024x500 |
| Privacy policy | URL pública obligatoria |
| Permisos | Declarar: ubicación (opcional), internet, posiblemente cámara si subís fotos |
| Keystore | Generar y guardar; firmar el AAB |
| Bundle AAB | `./gradlew bundleRelease` o build en EAS/CI |
| Tracks | Internal testing → Closed testing → Open testing → Production |
| Content rating | Cuestionario IARC |
| Data safety | Declarar datos recopilados (email, ubicación si aplica) |

### iOS (Apple App Store)

| Requisito | Acción |
|-----------|--------|
| Apple Developer Program | USD 99/año |
| Certificados | Distribution Certificate, provisioning profile para App Store |
| App ID | Crear en developer.apple.com, ej. `com.celimap.app` |
| Íconos | 1024x1024 sin transparencia; Asset catalog con todos los tamaños |
| Screenshots | Por tamaño de dispositivo (6.5", 5.5", iPad si aplica) |
| Privacy policy | URL obligatoria |
| Permisos | NSLocationWhenInUseUsageDescription, NSCameraUsageDescription si aplica |
| TestFlight | Subir build, invitar testers internos/externos |
| App Store Connect | Metadata, descripción, keywords, categoría |
| Review | Enviar a revisión; tiempos típicos 24-48h |

### Común

- [ ] Dominio verificado para deep links (Universal Links / App Links).
- [ ] `assetlinks.json` (Android) y `apple-app-site-association` (iOS) en `/.well-known/`.
- [ ] Página de privacidad que explique: datos que recopilás, uso de Google OAuth, Mapbox, analytics.

---

## 6. Tareas Técnicas Detalladas

### Capacitor (opción recomendada)

#### Archivos a crear

- `capacitor.config.ts` (raíz)
- `ios/` (generado con `npx cap add ios`)
- `android/` (generado con `npx cap add android`)
- `resources/icon.png`, `resources/splash.png` (para generar íconos)
- `.well-known/assetlinks.json` (Android)
- `.well-known/apple-app-site-association` (iOS)

#### Archivos a modificar

- `package.json`: agregar `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/app`
- `lib/fetchApi.ts`: soporte `NEXT_PUBLIC_API_URL`
- `app/layout.tsx`: listener de deep links con `App.addListener`
- `next.config.js`: evaluar `output: 'export'` si se empaqueta estático, o dejar normal si se usa URL remota
- `.env.example`: documentar `NEXT_PUBLIC_API_URL`, `NEXTAUTH_URL` para production

#### Estructura de carpetas resultante

```
sintacc-bsas/
├── app/
├── components/
├── lib/
├── public/
├── capacitor.config.ts
├── ios/                    # Proyecto Xcode
├── android/                # Proyecto Android Studio
├── resources/              # Íconos y splash
└── .well-known/            # Deep links
```

### Endpoints nuevos (si aplica)

| Endpoint | Cuándo | Motivo |
|----------|--------|--------|
| `POST /api/device-tokens` | Fase 2 | Registrar device token para push |
| `POST /api/auth/mobile-token` | Solo si eliges RN/Expo | Intercambiar token Google por JWT para app nativa |

Con Capacitor + NextAuth en WebView, **no necesitás endpoints nuevos** para el MVP.

---

## 7. Plan de QA + Testing

### Unit / Integration

- [ ] Tests existentes (`jest`) siguen pasando después de los cambios.
- [ ] `lib/fetchApi` con `BASE_URL`: test unitario mockeando fetch.
- [ ] Validación de rutas protegidas (middleware) en APIs.

### E2E

- [ ] Playwright o Cypress: flujo de búsqueda → seleccionar lugar → ver detalle (contra entorno de staging).
- [ ] Flujo de login con Google (mock o cuenta de test).
- [ ] Envío de reseña y reporte de contaminación.

### Pruebas en dispositivos

- [ ] **Android:** Dispositivo físico o emulador con Play Services (para OAuth).
  - Ubicación: mapa, botón "Cerca mío".
  - Rotación de pantalla.
  - Tamaños: 5", 6", tablet.
- [ ] **iOS:** iPhone físico (emulador puede fallar con OAuth).
  - Safe area, notch.
  - Permisos de ubicación.
- [ ] **Offline:** Activar modo avión, verificar mensajes de error y cache si está implementado.
- [ ] **Deep links:** Abrir `celimap://lugar/123` o `https://celimap.com/lugar/123` y verificar que abra la app en la pantalla correcta.

---

## 8. Plan de Publicación

### Android

1. **Keystore:** `keytool -genkey -v -keystore celimap.keystore -alias celimap -keyalg RSA`
2. **Firmar AAB:** Configurar `android/app/build.gradle` con `signingConfigs`.
3. **Build:** `cd android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`
4. **Play Console:** Crear app, subir AAB, completar store listing, contenido, monetización.
5. **Tracks:** Internal → Closed → Open → Production según tu estrategia de rollout.

### iOS

1. **Apple Developer:** Certificados y Provisioning Profile para distribución.
2. **Xcode:** Archivo de proyecto `ios/App/App.xcworkspace`, seleccionar "Any iOS Device" y Archive.
3. **Distribute App:** Subir a App Store Connect.
4. **App Store Connect:** Crear app, metadata, subir build desde Xcode o Transporter.
5. **TestFlight:** Agregar testers internos y externos; aprobar build para external testing.
6. **Submit for Review:** Cuando esté listo, enviar a revisión.

---

## Consideraciones Específicas

### Mapbox

- **Mobile:** Mapbox GL JS funciona en WebView (Capacitor/PWA). Para RN usarías `@rnmapbox/maps`.
- **Permisos:** Solicitar ubicación solo cuando el usuario toque "Cerca mío"; mensaje claro en el diálogo de permisos.
- **Rendimiento:** Con muchos marcadores, considerar clustering; tu `MapboxMap` actual renderiza uno por uno. Si hay >100 lugares, evaluar `supercluster` o equivalente.

### Auth (NextAuth + JWT)

- **WebView (Capacitor/PWA):** NextAuth usa cookies; el WebView las maneja. Asegurar que `NEXTAUTH_URL` sea tu dominio de producción y que el scheme de callback esté bien configurado.
- **RN:** Requiere flujo alternativo (token Google → backend → JWT propio).

### Deep linking

- Rutas a soportar: `/lugar/[id]`, `/mapa?search=...`, `/favoritos`.
- Configurar en `capacitor.config.ts` y en los proyectos nativos el URL scheme (`celimap://`) y Universal/App Links.

### Analytics

- Eventos sugeridos: `search`, `view_place`, `report_contamination`, `submit_review`, `add_favorite`, `suggest_place`.
- Herramienta: PostHog, Vercel Analytics o Google Analytics 4.

### Offline

- Cache de IDs de lugares visitados recientemente (ej. últimos 20).
- Al abrir la app sin red: mostrar lista cached con mensaje "Sin conexión"; al tener red, refrescar.
- Favoritos: la API ya existe; se pueden cachear localmente para lectura offline.

---

## Conclusión

La opción **Capacitor** te permite tener una app en las tiendas en 2-3 semanas, reutilizando casi todo tu código y manteniendo un solo proyecto. Es el equilibrio óptimo entre tiempo, costo y mantenimiento para Celimap.
