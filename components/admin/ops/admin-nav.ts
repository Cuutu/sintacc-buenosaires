export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", match: "exact" as const },
  { href: "/admin/lugares", label: "Lugares", badge: "suggestionsPending" as const },
  { href: "/admin/emprendimientos", label: "Emprendimientos", badge: "ventureSuggestionsPending" as const },
  { href: "/admin/resenas", label: "Reseñas", badge: "reviewsPending" as const },
  { href: "/admin/mensajes", label: "Mensajes", badge: "contactsPending" as const },
  { href: "/admin/destacados", label: "Destacados" },
  { href: "/admin/guias", label: "Guías" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/configuracion", label: "Configuración" },
] as const
