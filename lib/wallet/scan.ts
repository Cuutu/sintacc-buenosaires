/**
 * El local escanea el QR de la tarjeta del cliente desde /local/escanear.
 * El QR es un link a /local/sellar/<serial>: sólo se aceptan links de CeliMap (o del mismo sitio,
 * para prueba y desarrollo), nunca uno de afuera.
 */

const SELLAR_PATH = /^\/local\/sellar\/([a-f0-9]{32})\/?$/

/** Dominios de CeliMap (www, apex, prueba). */
export function isCelimapHost(host: string): boolean {
  const h = host.toLowerCase()
  return h === "celimap.com.ar" || h.endsWith(".celimap.com.ar")
}

/**
 * Lo que leyó la cámara → ruta para sellar, o null si no es una tarjeta de CeliMap.
 * `currentOrigin` es el sitio donde corre el escáner (acepta sus propios links).
 */
export function stampPathFromScan(text: string, currentOrigin?: string): string | null {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  const sameSite = currentOrigin ? url.origin === currentOrigin : false
  if (!sameSite && (url.protocol !== "https:" || !isCelimapHost(url.hostname))) return null
  const match = url.pathname.match(SELLAR_PATH)
  return match ? `/local/sellar/${match[1]}` : null
}
