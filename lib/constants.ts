export const NEIGHBORHOODS = [
  "Palermo",
  "Recoleta",
  "San Telmo",
  "Puerto Madero",
  "Belgrano",
  "Villa Crespo",
  "Caballito",
  "Almagro",
  "Villa Urquiza",
  "Colegiales",
  "Balvanera",
  "Monserrat",
  "La Boca",
  "Barracas",
  "Boedo",
  "Constitución",
  "Retiro",
  "Parque Chacabuco",
  "Núñez",
  "Saavedra",
  "Otro",
]

export const TYPES = [
  { value: "restaurant", label: "Restaurante", emoji: "🍽️" },
  { value: "cafe", label: "Café", emoji: "☕" },
  { value: "bakery", label: "Panadería", emoji: "🥐" },
  { value: "store", label: "Tienda", emoji: "🛒" },
  { value: "icecream", label: "Heladería", emoji: "🍦" },
  { value: "bar", label: "Bar", emoji: "🍺" },
  { value: "other", label: "Otro", emoji: "📍" },
]

export const PLACE_TAGS = [
  { value: "certificado_sin_tacc", label: "Certificado sin TACC" },
  { value: "opciones_sin_tacc", label: "Opciones sin TACC" },
  { value: "100_gf", label: "100% gluten free" },
  { value: "cocina_separada", label: "Cocina separada" },
  { value: "sin_info", label: "Sin información verificada" },
]

/** Config para badges de tags: label legible, estilo */
export const TAG_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  "100_gf": {
    label: "100% sin gluten",
    className: "bg-primary/20 text-primary border-primary/40",
  },
  opciones_sin_tacc: {
    label: "Opciones sin gluten",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  },
  certificado_sin_tacc: {
    label: "Certificado sin gluten",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  cocina_separada: {
    label: "Cocina separada",
    className: "bg-white/10 text-foreground border-white/20",
  },
  sin_info: {
    label: "Sin info verificada",
    className: "bg-muted/50 text-muted-foreground border-border",
  },
}

export function getTagBadgeConfig(tag: string) {
  return (
    TAG_BADGE_CONFIG[tag] ?? {
      label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      className: "bg-muted/50 text-muted-foreground border-border",
    }
  )
}
