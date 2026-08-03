# Propuesta sink Sentry (bloqueante antes de release externo)

Hoy `reportClientError` → `console.error` / sink pluggable. TestFlight no ve logs.

## Variables

| Var | Uso |
|-----|-----|
| `NEXT_PUBLIC_SENTRY_DSN` | DSN público browser (vacío = off) |
| `SENTRY_AUTH_TOKEN` | CI upload source maps (secreto, no client) |
| `SENTRY_ORG` / `SENTRY_PROJECT` | CI |
| `NEXT_PUBLIC_VERCEL_ENV` | `production` / `preview` / `development` |
| `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` | release tag (ya en reporter) |

## Wiring mínimo

```ts
// solo si DSN presente
import * as Sentry from "@sentry/nextjs"
setClientErrorSink((report) => {
  Sentry.captureException(new Error(report.message), {
    tags: {
      source: report.source,
      platform: report.platform,
      native: String(report.native),
    },
    extra: {
      route: report.route,
      digest: report.digest,
      // stack ya sanitizado
      stack: report.stack,
    },
  })
})
```

## Reglas

- Reusar `sanitizeMessage` / `sanitizeStack` antes de enviar
- **No** enviar: email, token, coords, body input, session id, Authorization
- Sampling: prod `tracesSampleRate` ≤ 0.1; errors sample 1.0 al inicio, bajar si ruido
- Environments separados: `production` vs `preview` vs `native-preview`
- Source maps: upload en CI del mismo commit que el deploy web (WebView remoto = maps del deploy web)
- Release = `celimap@${SHA}` alineado a deploy Vercel
- Feature flag: sin DSN → sink null / console only

## Staging vs prod

- Preview Vercel: DSN proyecto `celimap-preview` o environment `preview`
- Prod: DSN `celimap-prod`
- Binario nativo hereda environment del `server.url` cargado

## Bloqueo

Sin sink remoto → **no** publicar TestFlight/Play externo nuevo tras cambios crash-sensitive.
