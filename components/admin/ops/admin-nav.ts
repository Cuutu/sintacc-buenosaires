export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", match: "exact" as const },
  { href: "/admin/lugares", label: "Lugares", badge: "suggestionsPending" as const },
  { href: "/admin/marcas", label: "Marcas", badge: "ventureSuggestionsPending" as const },
  { href: "/admin/resenas", label: "Reseñas", badge: "reviewsHidden" as const },
  { href: "/admin/mensajes", label: "Mensajes", badge: "contactsPending" as const },
  { href: "/admin/destacados", label: "Destacados" },
  { href: "/admin/guias", label: "Guías" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/configuracion", label: "Configuración" },
] as const
