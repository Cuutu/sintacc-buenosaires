# PR body — paste in GitHub

**Branch:** `mobile-hardening-preview` → `main`  
**Compare:** https://github.com/Cuutu/sintacc-buenosaires/compare/main...mobile-hardening-preview?expand=1

## Summary
- Lote 1: map single-variant + lifecycle hardening; favorites never blank; recoverable client error boundaries
- Lote 2: edge-to-edge safe areas (`overlaysWebView` + CSS tokens)
- Lote 3: mobile overflow fixes + Playwright hermetic critical/resilience (Chromium + WebKit)
- Capacitor: release always `https://www.celimap.com.ar`

## Risks
- TestFlight WebView picks up new production web immediately after Vercel deploy
- P2.5 device validation still pending (notch / home indicator)
- GitHub CI may show **pre-existing** failures — compare to `main`; block only **new** failures

## Tests (local preflight)
- npm ci · lint (warnings preexistentes)
- Jest Lotes 1–3: **56 PASS**
- Playwright `@critical` Chromium+WebKit: **14/14 PASS**
- next build OK
- tsc: exit 1 por errores **preexistentes** en `__tests__/api/reviews` + `place-incomplete`
- Release JSON nativo → solo `https://www.celimap.com.ar`
- stash `KEEP-backup-wip-pre-lote1` intacto
- Sin migraciones DB

## Rollback
- Deployment: `dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF` (2026-08-02 21:14, commit `d8ec492`)
- `vercel promote dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF --yes`
- Doc: `docs/baselines/prod-rollback-lote123.md`

## Out of scope
- P2.5 device (bloqueante publish externo)
- Sentry
- Codemagic hasta smoke prod verde
- App Store review
- Limpieza Android build artifacts
