import {
  BarChart3,
  BookOpen,
  Globe,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareText,
  Sparkles,
  Stamp,
  Store,
  type LucideIcon,
} from "lucide-react"
import type { AdminCounts } from "@/lib/admin-ops"

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  match?: "exact"
  /** Contador de pendientes que se muestra al lado (Cola, reseñas, mensajes). */
  badge?: keyof AdminCounts
  /** Texto para lectores de pantalla: "5 en la cola". */
  badgeLabel?: string
}

export type AdminNavGroup = { label: string | null; items: AdminNavItem[] }

/** Menú del admin, agrupado. Mismo nombre en el menú y en el título de cada pantalla. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Inicio", icon: LayoutDashboard, match: "exact" }],
  },
  {
    label: "Contenido",
    items: [
      { href: "/admin/lugares", label: "Lugares", icon: MapPin, badge: "suggestionsPending", badgeLabel: "en la cola" },
      {
        href: "/admin/emprendimientos",
        label: "Emprendimientos",
        icon: Store,
        badge: "ventureSuggestionsPending",
        badgeLabel: "en la cola",
      },
      { href: "/admin/destacados", label: "Destacados", icon: Sparkles },
      { href: "/admin/guias", label: "Guías", icon: BookOpen },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { href: "/admin/resenas", label: "Reseñas", icon: MessageSquareText, badge: "reviewsPending", badgeLabel: "pendientes" },
      { href: "/admin/mensajes", label: "Mensajes", icon: Mail, badge: "contactsPending", badgeLabel: "sin responder" },
    ],
  },
  {
    label: "Crecimiento",
    items: [
      { href: "/admin/tarjetas", label: "Tarjetas", icon: Stamp },
      { href: "/admin/seo", label: "SEO", icon: Globe },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/configuracion", label: "Redes sociales", icon: Megaphone },
    ],
  },
]

export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items)

export function isAdminNavActive(item: Pick<AdminNavItem, "href" | "match">, pathname: string): boolean {
  return item.match === "exact"
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** Las cuatro de la barra de abajo en el celular; el resto va en "Más". */
export const ADMIN_MOBILE_PRIMARY = ["/admin/lugares", "/admin/emprendimientos", "/admin/resenas", "/admin/mensajes"]
