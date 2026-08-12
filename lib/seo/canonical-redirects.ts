/**
 * Helpers de redirect SEO (testeables sin NextRequest completo).
 * Destino canónico siempre https://www.celimap.com.ar (nunca http://www/ ni apex).
 */

import { CANONICAL_ORIGIN } from "@/lib/base-url"

export const APEX_HOST = "celimap.com.ar"
export const WWW_HOST = "www.celimap.com.ar"

const TOP_CITY_PATTERN = /^\/top-sin-gluten-([a-z0-9-]+)$/i
const TOP_CITY_NESTED_PATTERN = /^\/top-sin-gluten\/ciudad\/([a-z0-9-]+)$/i

export function isApexCelimapHost(host: string | null | undefined): boolean {
  if (!host) return false
  const h = host.toLowerCase().split(":")[0]
  return h === APEX_HOST
}

/**
 * Destino www conservando path + query.
 * Usa CANONICAL_ORIGIN literal — no interpolar `http:` + `//www/` a mano.
 */
export function buildWwwRedirectUrl(input: {
  pathname: string
  search?: string
}): string {
  const path =
    !input.pathname || input.pathname === "/"
      ? ""
      : input.pathname.startsWith("/")
        ? input.pathname
        : `/${input.pathname}`
  const search =
    input.search && input.search !== "?"
      ? input.search.startsWith("?")
        ? input.search
        : `?${input.search}`
      : ""
  return `${CANONICAL_ORIGIN}${path}${search}`
}

/**
 * Si path es /top-sin-gluten-{ciudad} o /top-sin-gluten/ciudad/{ciudad},
 * devolver /sin-gluten/{ciudad}. Sin ranking real documentado.
 */
export function resolveTopSinGlutenRedirect(
  pathname: string
): string | null {
  const flat = pathname.match(TOP_CITY_PATTERN)
  if (flat?.[1]) return `/sin-gluten/${flat[1].toLowerCase()}`
  const nested = pathname.match(TOP_CITY_NESTED_PATTERN)
  if (nested?.[1]) return `/sin-gluten/${nested[1].toLowerCase()}`
  return null
}
