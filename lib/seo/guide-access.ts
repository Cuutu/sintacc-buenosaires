/**
 * Acceso a guías borrador.
 * Producción: drafts solo admin (o 404).
 * development / preview Vercel: visibles con banner.
 */

export function isDraftGuidePreviewEnv(): boolean {
  if (process.env.NODE_ENV === "development") return true
  if (process.env.VERCEL_ENV === "preview") return true
  return false
}
