import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type BreadcrumbItem = {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

/**
 * Migas de pan. Van en línea (no flex): si no entran, cortan entre palabras, y la
 * flecha queda siempre pegada al texto que le sigue (antes podía quedar colgando
 * al final del renglón).
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm leading-6 text-muted-foreground">
      <Link href="/" className="transition-colors hover:text-foreground">
        Inicio
      </Link>
      {items.map((item, i) => (
        <span key={i} className="whitespace-nowrap">
          <ChevronRight className="mx-1 inline-block h-4 w-4 shrink-0 align-[-3px]" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="whitespace-normal transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="whitespace-normal font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
