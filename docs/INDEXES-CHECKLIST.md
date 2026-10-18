# Checklist de índices MongoDB

## Índices principales

> `{ location: "2dsphere" }` ya no se usa (oct. 2026): `location` es `{ lat, lng }`, no GeoJSON, y
> `$geoNear` lo leía al revés. Si sigue en Atlas, se puede borrar con
> `db.places.dropIndex("location_2dsphere")`.

| Colección | Índice | Propósito |
|-----------|--------|-----------|
| Place | `{ status: 1, "location.lat": 1, "location.lng": 1 }` | Lugares cercanos (rectángulo + distancia en JS, `lib/places-near.ts`) |
| Place | `{ name: "text", address: "text", neighborhood: "text" }` | Búsqueda full-text |
| Place | `{ status: 1, type: 1 }` | Filtros lista |
| Place | `{ status: 1, province: 1, locality: 1, createdAt: -1 }` | Landing de ciudad (filtro + orden) |
| Place | `{ status: 1, province: 1, createdAt: -1 }` | Landing de provincia (filtro + orden) |
| Place | `{ neighborhood: 1, type: 1 }` | Filtro por barrio |
| Review | `{ placeId: 1, status: 1 }` | Reviews por lugar |
| Review | `{ placeId: 1, createdAt: -1 }` | Paginación + sort |
| Review | `{ userId: 1, createdAt: -1 }` | Reviews por usuario |
| RateLimit | `{ userId: 1, type: 1, date: 1 }` (unique) | Rate limit user |
| RateLimit | `{ date: 1 }` (TTL 8 días) | Limpieza automática |
| RateLimitIp | `{ ip: 1, type: 1, windowStart: 1 }` (unique) | Rate limit IP |
| RateLimitIp | `{ windowStart: 1 }` (TTL 8 días) | Limpieza automática |
| List | `{ isPublic: 1, likesCount: -1, createdAt: -1 }` | Top listas públicas |
| List | `{ createdBy: 1, updatedAt: -1 }` | Mis listas |
| List | `{ privateAccessToken: 1 }` (unique sparse) | Lookup enlace privado |
| List | `{ visibility: 1, linkStatus: 1, updatedAt: -1 }` | Filtrado privado / estado |
| ListLike | `{ listId: 1, userId: 1 }` (unique) | Un like por usuario por lista |
| ProductEvent | `{ ts: 1 }` (TTL 180 días) | Limpieza de analytics first-party |
| ProductEvent | `{ name: 1, ts: -1 }` | Insights por evento |
| ProductEvent | `{ distinctId: 1, ts: -1 }` | Usuarios anónimos y retención |
| LoyaltyProgram | `{ placeId: 1 }`, `{ staffEmails: 1 }` | Programa del local / panel /local |
| LoyaltyProgram | `{ "branches.placeId": 1 }`, `{ "branches.staffEmails": 1 }` | Sucursales: un lugar en un solo programa / panel del personal de cada sucursal |
| LoyaltyCard | `{ serialNumber: 1 }` (unique), `{ programId: 1 }` | QR de la tarjeta / métricas |
| LoyaltyCard | `{ programId: 1, requestKey: 1 }` (unique, parcial: sólo con requestKey) | Un doble toque en "Agregar" no crea dos tarjetas |
| LoyaltyStamp | `{ programId: 1, createdAt: -1 }` | Sellos por semana |
| LoyaltyDevice | `{ deviceLibraryIdentifier: 1, serialNumber: 1 }` (unique), `{ serialNumber: 1 }` | Servicio web de Apple Wallet |

## Verificación

```bash
npx tsx scripts/check-indexes.ts
```

## TTL (Time To Live)

RateLimit y RateLimitIp tienen TTL de 8 días. MongoDB elimina automáticamente documentos donde:
- `date` (RateLimit) o `windowStart` (RateLimitIp) + 8 días < now

Esto evita acumulación infinita de datos de rate limiting.
