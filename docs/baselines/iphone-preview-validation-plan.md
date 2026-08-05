# iPhone Preview Validation — Preflight / Aprobación

**Rama:** `mobile-hardening-preview` (local, **sin push**)  
**Stash:** `stash@{0}: KEEP-backup-wip-pre-lote1` — **INTACTO**  
**Fecha:** 2026-08-03  
**Prohibido hasta aprobación:** push · Vercel deploy · Codemagic run · TestFlight upload · merge · prod

---

## FASE 1 — CI detectado

| Item | Valor |
|------|-------|
| **Servicio iOS/TestFlight** | **Codemagic** (`codemagic.yaml`) |
| **Workflow iOS Release** | `ios-testflight` → IPA + `submit_to_testflight: true` |
| **Workflow iOS Preview (nuevo)** | `ios-testflight-preview` |
| **Workflow Android** | `android-aab` (AAB; no TF) |
| **GitHub Actions** | `.github/workflows/ci.yml` — solo lint/tsc/jest en PR/`main` (**no** genera iOS) |
| **Trigger Codemagic** | **No en YAML** — se configura en UI Codemagic (manual / push / tag). Docs: correr workflow `ios-testflight` a mano |
| **Rama típica** | Repo `Cuutu/sintacc-buenosaires`; builds históricos desde `main` (UI) |
| **Certs / profiles** | `ios_signing.distribution_type: app_store` + integration `app_store_connect: Celimap` + group `app_store_credentials` (valores **no** en repo) |
| **CFBundleVersion** | `CURRENT_PROJECT_VERSION` en `project.pbxproj` (ahora **5**); script Codemagic = max(TF, AppStore, project)+1 |
| **TestFlight upload** | `publishing.app_store_connect.submit_to_testflight: true`, `submit_to_app_store: false` |
| **Bundle ID** | `com.celimap.app` / Apple ID app `6797278308` |
| **Manual builds** | Sí — Codemagic UI permite start workflow + env vars |

### Secretos / groups (nombres solo)

Codemagic groups: `app_store_credentials`, `android_credentials`  
Vars tipicas (nombres): `CM_KEYSTORE_*`, integration ASC tokens, `CAPACITOR_SERVER_URL` (solo preview workflow)

---

## FASE 2 — Commits locales (7)

```
5bb747e fix(map): harden mobile map lifecycle
215e150 fix(auth): prevent blank favorites state
70554dc feat(errors): add recoverable client error boundaries
2173e23 fix(mobile): implement edge-to-edge safe areas
567117c fix(responsive): resolve mobile overflow
ec46aa5 test(e2e): add Playwright mobile coverage
229f0e7 chore(capacitor): sync native preview configuration
```

Excluido: `android/**/build`, `public/sw.js`, `.bak`, logs ruidosos, secretos.  
Nota: `ec46aa5` también metió docs baselines Lote1/2/P2.5 (histórico); no es código runtime.

---

## FASE 3 — Preview Vercel (pendiente aprobación)

| Item | Valor |
|------|-------|
| **Proyecto** | `sintacc-map` (team `cuutus-projects`) |
| **Prod URL** | `https://www.celimap.com.ar` — **no tocar** |
| **Rama** | `mobile-hardening-preview` (tras push) |
| **Comando** | Push rama → Vercel Preview auto; o `vercel --prebuilt` / deploy from git (CLI) |
| **Cómo WebView** | Binario Capacitor `server.url` = HTTPS preview |

### Variables Preview (nombres, sin valores)

Obligatorias Preview:
- `MONGODB_URI` — **staging / no prod mutable**
- `NEXTAUTH_URL` — URL preview exacta
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (+ redirect URI preview)
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_BASE_URL` (si aplica)

Recomendadas: Cloudinary, Resend, `ADMIN_EMAILS`, `FEATURES`

### Preview Protection

Si Vercel **Deployment Protection** (SSO/password) está ON → WebView Capacitor **no** puede auth.  
**No** meter bypass token en código/query/repo.  
Opciones: (a) desactivar protection solo Preview branch, (b) URL staging propia sin protection, (c) protection con allowlist IP (no sirve TF).  
**Parar y elegir antes de sync nativo.**

### CI checks en Preview

- Vercel build = `next build` (+ lint en GHA si hay PR)
- E2E crítico: correr en local/CI (`test:e2e:critical`) antes de Codemagic; opcional GitHub Action en PR

---

## FASE 4 — iOS Preview config

Ya en `capacitor.config.ts` + `codemagic.yaml`:

- `CAPACITOR_SERVER_MODE=preview` + `CAPACITOR_SERVER_URL=<https preview>`
- Falla sin URL / URL prod / `CAPACITOR_RELEASE_LOCK` con vars preview
- Release workflow: lock + post-sync grep prod
- `appName`: **CeliMap Preview** (mismo bundle ID)
- UA: `CelimapPreview/1`
- UI: `PreviewBadge` (env/host)
- Build number: auto +1 en Codemagic (único vs TF/AS)
- **Grupo TF:** mismo App ID → subir a grupo interno **“Preview”** (crear en ASC; no External)

`ios/App/App/capacitor.config.json` en git sigue **prod** (correcto; preview solo en CI sync).

---

## FASE 5 — Observabilidad Preview (alternativa a Sentry)

`console.error` solo **no alcanza** en TF remoto.

**Disponible ahora (sin Sentry):**
1. `POST /api/client-errors` — solo Preview; sanitiza; log Vercel Functions
2. `PreviewBadge` — host / env / SHA
3. `window.__celimapLastError`
4. Codemagic build logs + Xcode logs artifacts

**Sentry** (propuesto `docs/baselines/p25/sentry-sink-proposal.md`) — pendiente autorización; bloqueante para **external** TF, no necesariamente internal Preview si Vercel logs OK.

---

## FASE 6 — Preflight (correr local; ver resultados en chat)

Checklist:
- [ ] npm ci
- [ ] lint
- [ ] Jest Lotes 1–3
- [ ] Playwright crítico Chromium + WebKit
- [ ] tsc
- [ ] next build
- [ ] `npx cap sync ios` — **requiere Mac/Xcode**; en Windows solo validar config/guards Jest
- [ ] JSON nativo Release = prod
- [ ] sin secretos en git
- [ ] stash KEEP intacto

---

## FASE 7 — Esperar aprobación

### Acciones externas (NO ejecutadas)

1. `git push -u origin mobile-hardening-preview`
2. Abrir PR (opcional) → GitHub CI
3. Vercel Preview deploy (auto on push)
4. Confirmar URL HTTPS + protection OFF o staging seguro
5. Set Codemagic env `CAPACITOR_SERVER_URL=<preview>`
6. Start workflow **`ios-testflight-preview`**
7. Asignar build a grupo interno **Preview**
8. Instalar en iPhone · validar mapa/safe-area/favoritos/errores

### Riesgos

- Preview Protection bloquea WebView
- Mongo Preview = prod → **mutación accidental**
- Mismo bundle ID: tester puede confundir builds Preview vs Release (mitiga nombre + badge)
- OAuth Google sin redirect preview → login roto
- Build number race si dos Codemagic concurrentes
- `cap sync ios` en Windows incompleto (OK: Codemagic Mac hace sync)

### Build number esperado

Proyecto local: **5**. Upload = max(TF, AS, 5)+1 (lo imprime Codemagic).
