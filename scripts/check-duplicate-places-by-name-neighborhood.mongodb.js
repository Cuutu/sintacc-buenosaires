/**
 * Busca lugares duplicados por mismo nombre y mismo barrio.
 *
 * Pensado para ejecutarse manualmente en mongosh / MongoDB Compass Shell.
 *
 * Opcion A, desde mongosh ya conectado:
 *   load("C:/Users/Franco/Desktop/sintacc-bsas/scripts/check-duplicate-places-by-name-neighborhood.mongodb.js")
 *
 * Opcion B, desde terminal:
 *   mongosh "$MONGODB_URI" scripts/check-duplicate-places-by-name-neighborhood.mongodb.js
 *
 * Opcionales antes de cargar el script:
 *   globalThis.STATUS_FILTER = "approved"
 *   globalThis.LIMIT = 100
 */

(() => {
  const COLLECTION = "places"
  const LIMIT = Number(globalThis.LIMIT ?? 50)
  const STATUS_FILTER = globalThis.STATUS_FILTER

  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")

  const formatDate = (value) => {
    if (!value) return ""
    if (typeof value.toISOString === "function") return value.toISOString()
    return String(value)
  }

  const query = {}
  if (STATUS_FILTER) query.status = STATUS_FILTER

  const projection = {
    name: 1,
    neighborhood: 1,
    address: 1,
    addressText: 1,
    status: 1,
    slug: 1,
    type: 1,
    safetyLevel: 1,
    createdAt: 1,
    updatedAt: 1,
  }

  const groups = new Map()

  db.getCollection(COLLECTION)
    .find(query, projection)
    .forEach((place) => {
      const nameKey = normalize(place.name)
      const neighborhoodKey = normalize(place.neighborhood)
      if (!nameKey || !neighborhoodKey) return

      const key = `${neighborhoodKey}||${nameKey}`
      if (!groups.has(key)) {
        groups.set(key, {
          nameKey,
          neighborhoodKey,
          places: [],
        })
      }
      groups.get(key).places.push(place)
    })

  const duplicates = Array.from(groups.values())
    .filter((group) => group.places.length > 1)
    .sort((a, b) => {
      const countDiff = b.places.length - a.places.length
      if (countDiff !== 0) return countDiff
      const neighborhoodDiff = a.neighborhoodKey.localeCompare(b.neighborhoodKey, "es")
      if (neighborhoodDiff !== 0) return neighborhoodDiff
      return a.nameKey.localeCompare(b.nameKey, "es")
    })
    .slice(0, LIMIT)

  const totalDuplicateDocs = duplicates.reduce((sum, group) => sum + group.places.length, 0)
  const extraDocs = duplicates.reduce((sum, group) => sum + group.places.length - 1, 0)

  print("")
  print("Duplicados por mismo nombre + mismo barrio")
  print("DB: " + db.getName())
  print("Coleccion: " + COLLECTION)
  print("Filtro status: " + (STATUS_FILTER || "todos"))
  print("Grupos encontrados: " + duplicates.length)
  print("Documentos en grupos duplicados: " + totalDuplicateDocs)
  print("Documentos extra posibles duplicados: " + extraDocs)
  print("")

  if (duplicates.length === 0) {
    print("No se encontraron duplicados con ese criterio.")
    return
  }

  duplicates.forEach((group, index) => {
    const first = group.places[0]
    print("=".repeat(90))
    print(
      `${index + 1}. ${first.name || group.nameKey} | ${first.neighborhood || group.neighborhoodKey} | ${group.places.length} registros`
    )
    print("-".repeat(90))

    group.places.forEach((place) => {
      print("id:          " + place._id)
      print("nombre:      " + (place.name || ""))
      print("barrio:      " + (place.neighborhood || ""))
      print("direccion:   " + (place.addressText || place.address || ""))
      print("status:      " + (place.status || ""))
      print("tipo:        " + (place.type || ""))
      print("seguridad:   " + (place.safetyLevel || ""))
      print("slug:        " + (place.slug || ""))
      print("createdAt:   " + formatDate(place.createdAt))
      print("updatedAt:   " + formatDate(place.updatedAt))
      print("")
    })
  })

  print("=".repeat(90))
})()
