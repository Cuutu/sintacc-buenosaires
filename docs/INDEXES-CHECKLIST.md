# Checklist de índices MongoDB

## Índices principales

| Colección | Índice | Propósito |
|-----------|--------|-----------|
| Place | `{ location: "2dsphere" }` | GeoNear, lugares cercanos |
| Place | `{ name: "text", address: "text", neighborhood: "text" }` | Búsqueda full-text |
| Place | `{ status: 1, type: 1 }` | Filtros lista |
| Place | `{ neighborhood: 1, type: 1 }` | Filtro por barrio |
| Review | `{ placeId: 1, status: 1 }` | Reviews por lugar |
| Review | `{ placeId: 1, createdAt: -1 }` | Paginación + sort |
| Review | `{ userId: 1, createdAt: -1 }` | Reviews por usuario |
| RateLimit | `{ userId: 1, type: 1, date: 1 }` (unique) | Rate limit user |
| RateLimit | `{ date: 1 }` (TTL 8 días) | Limpieza automática |
| RateLimitIp | `{ ip: 1, type: 1, windowStart: 1 }` (unique) | Rate limit IP |
| RateLimitIp | `{ windowStart: 1 }` (TTL 8 días) | Limpieza automática |

## Verificación

```bash
npx tsx scripts/check-indexes.ts
```

## TTL (Time To Live)

RateLimit y RateLimitIp tienen TTL de 8 días. MongoDB elimina automáticamente documentos donde:
- `date` (RateLimit) o `windowStart` (RateLimitIp) + 8 días < now

Esto evita acumulación infinita de datos de rate limiting.
