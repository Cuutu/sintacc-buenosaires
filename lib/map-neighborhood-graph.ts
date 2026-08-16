/** Barrios vecinos CABA — prefetch en background, no bloquea UI. */
const ADJACENT: Record<string, readonly string[]> = {
  Palermo: ["Recoleta", "Belgrano", "Villa Crespo", "Colegiales", "Almagro"],
  Recoleta: ["Palermo", "Retiro", "Balvanera", "Almagro"],
  Belgrano: ["Palermo", "Colegiales", "Núñez", "Villa Urquiza"],
  "Villa Crespo": ["Palermo", "Almagro", "Caballito", "Chacarita"],
  Colegiales: ["Palermo", "Belgrano", "Villa Crespo"],
  Almagro: ["Palermo", "Recoleta", "Balvanera", "Caballito", "Villa Crespo"],
  Caballito: ["Almagro", "Villa Crespo", "Flores", "Parque Chacabuco", "Boedo"],
  "Villa Urquiza": ["Belgrano", "Colegiales", "Saavedra"],
  Núñez: ["Belgrano", "Saavedra"],
  Saavedra: ["Núñez", "Villa Urquiza"],
  Retiro: ["Recoleta", "San Nicolás", "Puerto Madero"],
  Balvanera: ["Recoleta", "Almagro", "Monserrat", "San Nicolás"],
  Monserrat: ["San Telmo", "Balvanera", "Puerto Madero", "Constitución"],
  "San Telmo": ["Monserrat", "La Boca", "Barracas", "Constitución", "Puerto Madero"],
  "Puerto Madero": ["Retiro", "San Telmo", "Monserrat"],
  "La Boca": ["San Telmo", "Barracas"],
  Barracas: ["La Boca", "San Telmo", "Constitución"],
  Constitución: ["Monserrat", "San Telmo", "Barracas", "Boedo"],
  Boedo: ["Almagro", "Caballito", "Constitución", "Parque Chacabuco"],
  "Parque Chacabuco": ["Caballito", "Boedo"],
}

export function getAdjacentNeighborhoods(neighborhood: string): string[] {
  const direct = ADJACENT[neighborhood]
  if (direct) return [...direct]
  const match = Object.keys(ADJACENT).find(
    (key) => key.toLowerCase() === neighborhood.trim().toLowerCase()
  )
  return match ? [...ADJACENT[match]] : []
}
