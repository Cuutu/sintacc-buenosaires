/**
 * Fechas editoriales explícitas para páginas estáticas del sitemap.
 * No usar new Date() / hora de deploy como lastmod.
 * Actualizar solo cuando el contenido de esa página cambie de forma editorial.
 */
export const STATIC_PAGE_LASTMOD: Record<string, string> = {
  "/": "2026-03-01",
  "/mapa": "2026-02-15",
  "/mapa-sin-tacc": "2026-02-15",
  "/mapa-celiaco": "2026-02-15",
  "/mapa-para-celiacos": "2026-03-10",
  "/explorar": "2026-02-01",
  "/sugerir": "2026-01-15",
  "/sin-gluten-argentina": "2026-03-01",
  "/que-es-celimap": "2026-03-10",
  "/como-funciona": "2026-03-10",
  "/como-verificamos-los-lugares": "2026-03-10",
  "/privacidad": "2025-11-01",
  "/terminos": "2026-08-14",
  "/listas": "2026-02-01",
  "/emprendimientos": "2026-02-01",
}

export function staticPageLastModified(path: string): Date | undefined {
  const iso = STATIC_PAGE_LASTMOD[path]
  if (!iso) return undefined
  return new Date(`${iso}T12:00:00.000Z`)
}
