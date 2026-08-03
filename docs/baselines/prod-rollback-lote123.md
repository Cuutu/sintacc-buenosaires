# Rollback — deployment productivo pre-merge Lotes 1–3

**Registrado:** 2026-08-03 (pre-merge `mobile-hardening-preview`)

## Deployment actual (baseline rollback)

| Campo | Valor |
|-------|-------|
| Project | `sintacc-map` (cuutus-projects) |
| Deployment ID | `dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF` |
| URL deployment | `https://sintacc-39zebdxyq-cuutus-projects.vercel.app` |
| Aliases | `https://www.celimap.com.ar`, `https://celimap.com.ar` |
| Status | Ready · Production |
| Created | 2026-08-02 21:14:16 GMT-0300 |
| Git commit (main) | `d8ec492` — *Agregado lo de privacidad* (mismo timestamp deploy) |

## Procedimiento rollback (solo web)

Sin migraciones DB. Cambios Lotes 1–3 = frontend/client + shell config; **rollback web suficiente**.

```bash
# Opción A — promover deployment anterior
vercel promote dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF --yes

# Opción B — rollback alias producción
vercel rollback www.celimap.com.ar --yes
```

También: Vercel Dashboard → Project `sintacc-map` → Deployments → `dpl_8UqqcQ2rhfB4hGs1JoC2NBfqqWyF` → **Promote to Production**.

## Irreversible?

**No.** Sin migraciones Mongo. Sin cambios de schema. Sin secretos rotados. Rollback = redeploy web.

Binario TestFlight viejo sigue apuntando a `www.celimap.com.ar` → al hacer rollback web, TF recibe versión anterior automáticamente.
