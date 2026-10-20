/**
 * Marca de un lugar a partir del nombre, para no mostrar dos sucursales de la misma
 * en una lista corta (destacados de la home). "Churros El Topo #SINTACC" y
 * "Churros El Topo #SinTacc" son la misma marca. No sirve para detectar duplicados de
 * la base: dos sucursales son lugares distintos.
 */

/** Lo que se le suele agregar al nombre y no es parte de la marca. */
const QUALIFIERS = [
  /#\S+/g,
  /\b100\s*%/g,
  /\bsin\s+(tacc|gluten)\b/g,
  /\bgluten\s*free\b/g,
  /\bapto\s+celiacos?\b/g,
]

const STOPWORDS = new Set(["la", "el", "los", "las", "de", "del", "y", "the", "le", "di"])

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/**
 * Clave de marca: sin tildes ni mayúsculas, sin "#SinTacc", "100%", "sin gluten", sin
 * lo que va después de " - ", " | " o "(" (la sucursal) y sin el barrio al final.
 */
export function placeBrandKey(name: string, neighborhood?: string | null): string {
  let key = plain(name)
  key = key.split(/\s[-–—|·]\s|\(/)[0] ?? key
  for (const pattern of QUALIFIERS) key = key.replace(pattern, " ")
  key = key.replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim()

  const hood = neighborhood ? plain(neighborhood).replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim() : ""
  if (hood && key.endsWith(` ${hood}`)) key = key.slice(0, -hood.length - 1).trim()
  return key
}

function significantWords(key: string): string[] {
  return key.split(" ").filter((word) => word && !STOPWORDS.has(word))
}

/**
 * Misma marca si la clave es igual o si una empieza con la otra entera y la corta tiene
 * al menos dos palabras con peso ("Dulce Ciervo" y "Dulce Ciervo Café" sí; "La Panera"
 * y "La Panera Rosa" no).
 */
export function isSameBrand(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return long.startsWith(`${short} `) && significantWords(short).length >= 2
}

/** Deja el primero de cada marca, en el orden recibido. */
export function uniqueByBrand<T extends { name: string; neighborhood?: string | null }>(items: T[]): T[] {
  const keys: string[] = []
  const out: T[] = []
  for (const item of items) {
    const key = placeBrandKey(item.name, item.neighborhood)
    if (keys.some((seen) => isSameBrand(seen, key))) continue
    keys.push(key)
    out.push(item)
  }
  return out
}
