# Auditoría técnica móvil — CeliMap (iOS / Android)

**Fecha:** 2026-08-02  
**Alcance:** repo `sintacc-bsas` + shell Capacitor (TestFlight / Play)  
**Modo:** solo lectura. Sin cambios de código en producción.  
**Nota WIP:** working tree tiene fixes locales no deployados (`AppErrorBoundary`, `NativeStatusBar`, `viewportFit: cover`, padding top en `LayoutChrome`). TestFlight carga `https://www.celimap.com.ar` → **producción = HEAD commit**, no WIP.

---

## 1. Resumen ejecutivo

App nativa = **Capacitor 8** con WebView remoto a producción Next.js. Casi toda UI es web. Crash “Application error: a client-side exception has occurred” = excepción React no capturada + **sin** `error.tsx` / `global-error.tsx` / Error Boundary global en prod.

Safe-area rota en iOS porque producción **no declara** `viewport-fit=cover` y Capacitor WebView suele dibujar bajo status bar → `env(safe-area-inset-*)` = `0` mientras controles usan esos env.

Overflow horizontal: patrón `100vw` + padding negativo (`StatsRow`, popups mapa).

Resiliencia mapa parcial (`MapErrorBoundary`), pero throw dentro de `useEffect` **no** lo captura Error Boundary. Sin Sentry. Sin suite E2E móvil.

---

## 2. Arquitectura encontrada

| Pieza | Evidencia |
|-------|-----------|
| Framework móvil | **Capacitor 8.4.2** (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`) |
| No es | Expo / React Native / Cordova puro |
| Web | Next.js **14.2** + React **18.3** |
| Carga web | `capacitor.config.ts` → `server.url: "https://www.celimap.com.ar"` |
| Fallback offline | `www/index.html` (mensaje “necesitás conexión”) |
| Pantallas nativas | Splash + WebView. Cero pantallas UI nativas |
| Pantallas web | `/`, `/mapa`, `/favoritos`, `/sugerir`, `/perfil`, `/login`, `/lugar/[id]`, auth handoff, etc. |
| User-Agent | `appendUserAgent: " CelimapNative/1"` |
| Plugins | App, Browser, SplashScreen, StatusBar |
| Auth nativa | Browser externo + deep link `celimap://auth/handoff` |
| App ID | `com.celimap.app` |

### Versiones relevantes

- Capacitor: `^8.4.2`
- Next: `^14.2.0` / React: `^18.3.0`
- Mapbox GL: `mapbox-gl ^3.1.0` + `react-map-gl ^7.1.7`
- next-auth: `^4.24.0`
- iOS min: **15.0** (`IPHONEOS_DEPLOYMENT_TARGET`)
- Android: `minSdk 24`, `targetSdk/compileSdk 36`
- versionName/versionCode Android: `1.0.0` / `1`

### Dev vs producción vs TestFlight

| Ambiente | Qué corre |
|----------|-----------|
| `next dev` | localhost, PWA off |
| Producción web | Vercel → `www.celimap.com.ar` |
| TestFlight / Play | Binario Capacitor + **misma URL remota** producción |
| Build nativo local | `cap sync` + Xcode/Gradle; UI sigue siendo URL remota |

Cambiar JS/CSS = deploy web. Cambiar permisos/plist/manifest = nuevo binario store.

### Variables de entorno (web; nativo no embebe `.env`)

Requeridas (`scripts/check-env.ts`): `MONGODB_URI`, `NEXTAUTH_*`, `GOOGLE_CLIENT_*`, `NEXT_PUBLIC_MAPBOX_TOKEN`, Cloudinary.  
Críticas cliente móvil: `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_BASE_URL`, OAuth Google + `NEXTAUTH_URL` alineado a dominio prod.

### Rutas / deep links

- Scheme: `celimap://` (iOS Info.plist + Android intent-filter)
- App Links: `https://www.celimap.com.ar`, `https://celimap.com.ar` (entitlements + manifest `autoVerify`)
- Auth: `/auth/mobile-return` → `celimap://auth/handoff?code=…` → `/api/auth/handoff`

### Bottom nav (web)

Mapa, Guardados, Sugerir, Explorar (toggle lista), Perfil/Login.

---

## 3. Errores críticos

### C1 — Sin red de seguridad ante crash cliente (prod)

**Evidencia:** HEAD `app/layout.tsx` sin Error Boundary. No existen `app/error.tsx` ni `app/global-error.tsx`.  
WIP local agrega `AppErrorBoundary` (aún no en prod).

**Escenario:** cualquier throw en render de cliente → pantalla Next: *“Application error: a client-side exception has occurred”*. App inutilizable hasta kill.

**Plataforma:** iOS + Android WebView (+ Safari).  
**Severidad:** Crítica.  
**Fix:** `error.tsx` + `global-error.tsx` + boundary raíz + boundaries por ruta (mapa, ficha, favoritos).  
**Regresión:** baja si fallback solo UI.

### C2 — `viewport-fit=cover` ausente en producción

**Evidencia:** HEAD:

```ts
export const viewport: Viewport = {
  themeColor: "#0b1220",
};
```

WIP local sí agrega `viewportFit: "cover"`. Sin eso, en iOS WebView `env(safe-area-inset-*)` suele ser **0**.

**Escenario:** notch / Dynamic Island / home indicator. Controles “usan” safe-area pero inset = 0 → solapados o cortados.

**Plataforma:** iOS fuerte; Android gesture nav moderado.  
**Severidad:** Crítica (UI).  
**Fix:** `viewportFit: "cover"` + estrategia StatusBar coherente (ver C3/A1).

### C3 — Controles mapa / chrome bajo status bar iOS

**Evidencia producción:**

- `MapTopBar`: `top-[calc(0.75rem+env(safe-area-inset-top))]` — inset 0 → ~12px bajo notch.
- `LayoutChrome` HEAD: solo `pb-[calc(5rem+env(safe-area-inset-bottom))]` — **sin** padding top.
- Ruta `/mapa` full-bleed `100dvh` sin offset top nativo.
- Plugin StatusBar en config `style: DARK`, pero **sin** componente runtime en prod que configure `setOverlaysWebView`.

**Repro:** TestFlight iPhone con notch → abrir `/mapa` → buscador bajo status bar; home/perfil títulos cerca del reloj.

**Severidad:** Crítica (usabilidad).  
**Fix global (propuesto, no implementado):**

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
```

+ `viewport-fit=cover`  
+ StatusBar: decidir **una** política:
  - A) `overlay: true` + CSS insets en fixed/sticky, **o**
  - B) `overlay: false` + **no** sumar inset top otra vez  

WIP `NativeStatusBar` usa `overlay: false` + comentario invertido (“false → inset > 0”). Con overlay false, insets web suelen ser 0. Revisar antes de ship.

### C4 — `MapErrorBoundary` no atrapa fallo init Mapbox en `useEffect`

**Evidencia:** `MapboxMap.tsx` ~488–530: init en `useEffect`; catch re-`throw`. Error Boundaries **no** capturan errores de effects.

**Escenario:** WebGL fallido / token inválido / WebView viejo → throw no aislado; riesgo crash pantalla o mapa muerto sin UI retry del boundary.

**Severidad:** Crítica (mapa).  
**Fix:** setState de error en catch + render fallback; o `map.on('error')`; no rethrow desde effect. Boundary solo para errores de render.

### C5 — Sin mapa si falta `NEXT_PUBLIC_MAPBOX_TOKEN`

**Evidencia:** si no hay token → `console.error` + `return` sin UI; contenedor vacío.

**Severidad:** Crítica si env prod mal.  
**Fix:** UI fallback “mapa no disponible” + lista usable.

### C6 — `disposedRef` + React Strict Mode mata remount del mapa

**Evidencia:** `MapboxMap.tsx` cleanup setea `disposedRef=true`; Strict Mode re-ejecuta effect en misma instancia → ve flag true → `instance.remove()` → nunca asigna `map.current`.

**Escenario:** dev Strict Mode; posible remount raro en prod. Mapa muerto / blanco.

**Severidad:** Crítica (mapa).  
**Fix:** al inicio del effect `disposedRef.current = false`, o flag local por closure (no ref compartida entre mounts).

### C7 — `/mapa` monta Desktop primero en mobile → doble Mapbox

**Evidencia:** `useMediaQuery` default `false` → `MapScreen` pinta `MapDesktop` → luego `isMobile=true` → unmount + `MapMobile` = **segundo** init WebGL.

**Escenario:** cold start mapa en iPhone/Android. OOM / WebGL fail / flash sidebar `min-w-[440px]`.

**Severidad:** Crítica.  
**Fix:** `boolean | null` hasta medir + skeleton; no montar Desktop en phone; `dynamic(..., { ssr: false })` Mapbox.

---

## 4. Errores altos / medios / bajos

### Altos

| ID | Hallazgo | Archivo | Escenario | Fix |
|----|----------|---------|-----------|-----|
| A1 | Safe-area inconsistente (bottom sí, top no; mapa exception) | `LayoutChrome`, `MapTopBar`, `BottomNav`, `MapMobile`, `MapLegend` | iOS notch | Tokens CSS globales + un solo contrato StatusBar |
| A2 | `useIsMobile` arranca `false` | `useMediaQuery.ts` | Flash Navbar desktop en móvil; layout shift | Default SSR-safe o `matchMedia` sync + skeleton chrome |
| A3 | `_id.toString()` sin guard en render/memo | `MapboxMap` 412+, `PlacesList`, `FeaturedCarousel` 97, `getPlacePath` | Place sin `_id` → throw render → C1 | Optional chaining + filtrar datos inválidos |
| A4 | Offline / red lenta | Capacitor `server.url` remoto | Sin red → WebView falla; `www/index.html` solo si no hay remote | Mensaje nativo offline + cache mínima o bundled shell |
| A5 | Toast geo habla de “navegador” | `MapMobile.tsx` 125–128 | Permiso denegado en app store | Copy: Ajustes → Celimap → Ubicación |
| A6 | Links `target="_blank"` | ficha lugar, sticky maps, popups | iOS WKWebView / Android: tabs raras o fuera app | `@capacitor/browser` o `window.open` con bridge |
| A7 | Sin Sentry / logging prod | — | Crash TestFlight sin stack | Sentry browser + release + userAgent CelimapNative |
| A8 | Favoritos: `!session` redirect en loading | `favoritos/page.tsx` 44–80 | Session loading → manda a `/login` aunque user logueado | Usar `status` como perfil (`loading` / `unauthenticated`) |
| A9 | `@capacitor/browser` en JS pero no en SPM/Gradle plugins list | `Package.swift`, `capacitor.settings.gradle` | OAuth nativo falla open browser | `npx cap sync` + verificar plugin nativo registrado |
| A10 | BottomSheet sin espacio BottomNav | `BottomSheet.tsx` | Lista mapa tapada por nav | `pb-[calc(5rem+sab)]` o `--bottom-chrome` |
| A11 | `MapDesktop` `min-w-[440px]` | `MapDesktop.tsx` | Tablet 769–900 overflow horizontal | `min-w-0` / breakpoint stack |

### Medios

| ID | Hallazgo | Evidencia | Fix |
|----|----------|-----------|-----|
| M1 | Overflow `100vw` | `StatsRow` `w-[min(calc(100vw-2rem),280px)]` + `-mx-4`; popups `calc(100vw - Npx)` | Usar `100%` / `min(100%, …)` |
| M2 | Chips mapa `shrink-0` + scroll horizontal | `MapTopBar` overlay | OK si contenedor no desborda; verificar 320px |
| M3 | Landscape permitido iOS | Info.plist orientations | Mapa/UI no auditados landscape; considerar portrait-only móvil |
| M4 | `confirm()` en favoritos | `favoritos/page.tsx` 68 | OK iOS; UX fea; preferir dialog propio |
| M5 | Clipboard sin `share` | `ShareButton.tsx` | iOS WebView a veces bloquea clipboard sin gesto claro; ya hay try/catch |
| M6 | GeolocateControl + FAB duplican paths | `MapboxMap` + `MapMobile` | Unificar; manejar PERMISSION_DENIED copy nativo |
| M7 | Cluster IDs enormes | `cluster:${ids.join(":")}` | Muchos lugares → string enorme / perf | Hash de IDs |
| M8 | PWA InstallPrompt en WebView | Android inyecta dismiss; iOS depende detección | Confirmar `isNativeApp` + UA en todos paths |
| M9 | `appleWebApp.statusBarStyle: "default"` | layout metadata | Conflicto visual con tema oscuro app |
| M10 | Android `versionCode 1` | `app/build.gradle` | Bloquea updates Play si no incrementa |

### Bajos

| ID | Hallazgo | Fix |
|----|----------|-----|
| B1 | `MobileShell` no-op | Limpiar o usar de verdad |
| B2 | Tests solo Jest unitarios API/lib; 0 Playwright | Suite §8 |
| B3 | Remotion en deps app | No afecta móvil; ruido bundle mental |
| B4 | `armv7` en UIRequiredDeviceCapabilities | Legacy; revisar |
| B5 | Comentario invertido overlay StatusBar (WIP) | Corregir al implementar |

---

## 5. Evidencia concreta (archivos / líneas)

### Producción (HEAD) — viewport sin cover

`app/layout.tsx` (commit): solo `themeColor`.

### Producción — LayoutChrome sin top inset

`components/layout/LayoutChrome.tsx` (commit): `pb-[calc(5rem+env(safe-area-inset-bottom))]` únicamente.

### MapTopBar (prod)

`top-[calc(0.75rem+env(safe-area-inset-top))]` — depende de inset > 0.

### Capacitor remote

```ts
// capacitor.config.ts
server: { url: "https://www.celimap.com.ar", cleartext: false }
```

### Map init throw en effect

`components/map-view/MapboxMap.tsx` ~501–529: `new mapboxgl.Map(...)` en try; catch → `throw new Error(...)`.

### Sin error routes

Glob: **0** `error.tsx` / `global-error.tsx`.

### Resiliencia parcial

- `MapErrorBoundary.tsx` — existe, wrap en MapMobile/Desktop.
- `AppErrorBoundary.tsx` — **solo WIP**, no HEAD.
- Stats/Featured: catch → empty/null (bien).
- `fetchApi`: AbortError → 408 (bien).
- Sin `unhandledrejection` global.

### iOS permisos

`Info.plist`: Location WhenInUse + Always texts. Sin cámara/mic. ATS default (HTTPS OK). Deep link `celimap`. Orientaciones portrait+landscape.

### Android

`INTERNET`, `ACCESS_COARSE/FINE_LOCATION`. `usesCleartextTraffic=false`. `singleTask`. `adjustResize`. Hardware WebView tune en `MainActivity.java` (DOM storage, splash hasta pageReady, inject anti-PWA).

---

## 6. Pasos para reproducir

### R1 — Application error

1. TestFlight, red OK.  
2. Navegar Home → Mapa → Favoritos → ficha lugar → back rápido ×5.  
3. O forzar place API con `_id` null (staging).  
4. Esperar pantalla blanca Next “Application error…”.

### R2 — Bajo status bar iOS

1. iPhone notch/Dynamic Island, TestFlight.  
2. Abrir Mapa.  
3. Buscador toca/queda bajo hora/batería.  
4. Home: hero/badge cerca del status bar (sin pt safe).

### R3 — Overflow horizontal

1. iPhone SE / 320–360 CSS px.  
2. Home → StatsRow swipe.  
3. Verificar scroll horizontal de **página** (no solo carrusel).  
4. Zoom texto 150% + nombres largos en chips mapa.

### R4 — Mapa WebGL / token

1. Bloquear WebGL o quitar token en preview.  
2. Abrir `/mapa`.  
3. Ver mapa vacío / crash según path error.

### R5 — Geo denegada

1. Denegar ubicación a Celimap.  
2. FAB “cerca”.  
3. Toast habla de “navegador”, no de Ajustes app.

### R6 — Offline

1. Modo avión → abrir app.  
2. WebView no carga celimap.com.ar.

---

## 7. Diferencias iOS vs Android

| Tema | iOS (WKWebView) | Android (MainActivity WebView) |
|------|-----------------|--------------------------------|
| Safe-area / notch | Crítico; insets dependen viewport-fit | Menos notch; gesture bar vía inset bottom |
| StatusBar plugin | Necesita config runtime | `statusBarColor` en styles.xml ayuda fondo |
| PWA prompt | Detección standalone frágil | JS inject dismiss en `MainActivity` |
| Deep links | URL scheme + associated domains | intent-filter + autoVerify |
| Back | Gesture/swipe | Botón atrás WebView/history Capacitor |
| Soft keyboard | viewport shrink variable | `adjustResize` declarado |
| OAuth | Browser plugin popover | Custom tab / browser externo |
| Geo copy | Igual bug “navegador” | Igual |
| Splash | LaunchScreen | SplashScreen API + keepOnScreenCondition |

---

## 8. Corrección recomendada (sin implementar)

### Capa A — Crash survival (prioridad 1)

1. `app/global-error.tsx` + `app/error.tsx` con CTA “Reintentar” / home.  
2. `AppErrorBoundary` raíz (como WIP).  
3. Boundaries hijos: MapScreen, PlacePage, Favoritos.  
4. Mapbox: error state en component, **no** throw en effect.  
5. Guard `_id` / `location` en listas y `getPlacePath`.  
6. Sentry + tag `native=true` si UA `CelimapNative`.

### Capa B — Safe area global (prioridad 1)

1. `viewportFit: "cover"`.  
2. CSS vars `--safe-*`.  
3. Una política StatusBar (overlay true **o** false, no mezcla).  
4. Aplicar vars en: `LayoutChrome`, `MapTopBar`, `BottomNav`, FABs, sheets, toasts, sticky ficha.  
5. `/mapa`: top bar usa `--safe-top`; bottom usa nav + `--safe-bottom`.

### Capa C — Overflow (prioridad 2)

1. Ban `100vw` en contenedores padded → `100%`.  
2. `overflow-x: clip` en `body` solo tras fix causes.  
3. Checklist viewports 320–430 + tablet + font scale.

### Capa D — Nativo (prioridad 2)

1. Copy permisos geo para app.  
2. Abrir externos con Capacitor Browser.  
3. Offline UX.  
4. Increment `versionCode`.  
5. Evaluar portrait-only phone.

### Capa E — Auth / sesión (prioridad 2)

1. Favoritos como Perfil (`status` gating).  
2. 401 en `fetchApi` → redirect login con return URL.  
3. Test handoff deep link E2E.

---

## 9. Riesgo de regresión

| Cambio | Riesgo | Mitigación |
|--------|--------|------------|
| viewport-fit + overlay StatusBar | Alto visual (doble padding) | Elegir una política; QA iPhone 14/15/16 + SE |
| Error boundaries | Bajo | No cambiar data flow |
| Map init sin throw | Bajo-medio | MapErrorBoundary + empty state |
| Quitar 100vw | Bajo | Visual home/mapa |
| Browser para links externos | Medio OAuth/maps | Probar login + Cómo llegar |
| Portrait lock | Medio iPad | Solo iPhone |

---

## 10. Orden sugerido de implementación

1. **Deploy web:** `error.tsx` / `global-error.tsx` / AppErrorBoundary.  
2. **Mapbox:** reset `disposedRef` + no throw en effect + no montar Desktop en mobile (`useIsMobile` null).  
3. **Deploy web:** `viewportFit: cover` + CSS safe tokens + LayoutChrome/MapTopBar/BottomNav/Sheet.  
4. **Guards** `_id`/location + favoritos `status`.  
5. **cap sync** Browser plugin + **NativeStatusBar** política correcta (binario si hace falta).  
6. Overflow (`min-w-[440]`, `100vw`) / copy geo / links externos.  
7. Sentry.  
8. Suite Playwright + checklist release.  
9. Binario: versionCode, offline, portrait si aplica.  

CI store: Codemagic (`ios-testflight`, `android-aab`); iOS `CURRENT_PROJECT_VERSION` 5 / marketing 1.0.

> Pasos 1–4 arreglan mayoría de bugs reportados **sin** nuevo binario (URL remota). Paso 5+ pueden requerir rebuild store.

---

## 11. Pruebas necesarias (suite mínima)

### Web (Playwright)

- Render rutas: `/`, `/mapa`, `/favoritos`, `/sugerir`, `/perfil`, `/login`, `/lugar/:id`.  
- Fail test si `pageon('pageerror')` o `console.error` no allowlisted.  
- Nav bottom tabs round-trip.  
- Abrir/cerrar mapa + `?list=open` ×5.  
- Mock API 500 / [] / 401.  
- Geo: grant / deny / unavailable (permissions API).  
- Screenshots 320, 360, 375, 390, 414, 430, 768.  
- Assert `document.scrollWidth <= viewport width`.  
- Safe-area: CSS computed padding con emulated `viewport-fit` / overlay.  
- Keyboard: focus search mapa.  

### Nativo

- Maestro / Detox / Appium smoke: cold start, mapa, geo prompt, background/foreground, OAuth handoff, airplane mode.  
- Device matrix: iPhone SE, 14, 16 Pro; Pixel gesture nav; Android 10 + 14.

### Unit (existente + gaps)

- Mantener Jest API.  
- Agregar: `isNativeApp`, parse handoff URL, normalize place sin `_id`.

---

## 12. Checklist obligatorio pre-release

### Web (antes deploy Vercel)

- [ ] `viewportFit: "cover"` en metadata  
- [ ] `error.tsx` + `global-error.tsx` presentes  
- [ ] Error boundary raíz montado  
- [ ] Mapa: fallback sin throw en effect; token missing → UI  
- [ ] Safe-area top/bottom en chrome + mapa  
- [ ] Sin overflow horizontal en 320–430  
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` prod OK  
- [ ] OAuth Google redirect URIs OK  
- [ ] Playwright smoke verde  
- [ ] Probar UA `CelimapNative` en staging si posible  

### Binario iOS (TestFlight)

- [ ] Info.plist location strings OK  
- [ ] URL scheme `celimap`  
- [ ] Associated domains  
- [ ] StatusBar política alineada con CSS  
- [ ] Min iOS 15 smoke  
- [ ] OAuth Browser → deep link → sesión  
- [ ] Airplane mode mensaje usable  
- [ ] Build number incrementado  

### Binario Android (Play)

- [ ] versionCode++  
- [ ] Permisos location  
- [ ] App Links hosts  
- [ ] Back desde mapa/login  
- [ ] WebView DOM storage  
- [ ] Release signing `key.properties`  
- [ ] targetSdk 36 smoke  

### Dispositivo real (bloqueante)

- [ ] iPhone notch: mapa top bar no tapa status  
- [ ] iPhone: home indicator no tapa BottomNav  
- [ ] Android gesture: BottomNav usable  
- [ ] Geo allow + deny  
- [ ] Sin “Application error” en flujo tabs 10 min  
- [ ] Ficha lugar + compartir + maps externo  

---

## Anexo — WIP local (no prod)

Archivos modificados/nuevos en working tree (no asumir en TestFlight):

- `app/layout.tsx` — viewportFit + AppErrorBoundary + NativeStatusBar  
- `components/AppErrorBoundary.tsx` (nuevo)  
- `components/native/NativeStatusBar.tsx` (nuevo) — `overlay: false` (revisar semántica)  
- `components/layout/LayoutChrome.tsx` — `pt-[env(safe-area-inset-top)]` excepto mapa  
- `MapTopBar` — top `1.1rem` + fallback `0px`  
- `lib/native-app.ts` — detección Capacitor más amplia  

**No mergear a ciegas:** overlay false + padding CSS puede **doblar** o **anular** insets.

---

## Anexo — Qué NO se auditó en runtime device

Sin acceso a TestFlight device en esta sesión. Hallazgos son estáticos desde repo + config. Repros §6 requieren confirmación en hardware.

---

**Estado:** auditoría completa. Esperando aprobación antes de cualquier cambio de código.
