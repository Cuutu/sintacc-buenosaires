import Link from "next/link"
import { paginatedPath, paginationItems } from "@/lib/seo/pagination"

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
}

const itemClass =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium"

/**
 * Enlaces numerados en el HTML del servidor (<a href>), además de Anterior y
 * Siguiente: así Google llega a todas las páginas de la serie desde la primera.
 */
export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const prevPage = currentPage > 1 ? currentPage - 1 : null
  const nextPage = currentPage < totalPages ? currentPage + 1 : null
  const items = paginationItems(currentPage, totalPages)

  return (
    <nav aria-label="Paginación" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {prevPage && (
        <Link
          href={paginatedPath(basePath, prevPage)}
          className={`${itemClass} bg-muted hover:bg-muted/80`}
        >
          ← Anterior
        </Link>
      )}
      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className={`${itemClass} text-muted-foreground`} aria-hidden="true">
            …
          </span>
        ) : item === currentPage ? (
          <span
            key={item}
            aria-current="page"
            className={`${itemClass} bg-primary text-primary-foreground`}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={paginatedPath(basePath, item)}
            aria-label={`Página ${item}`}
            className={`${itemClass} bg-muted hover:bg-muted/80`}
          >
            {item}
          </Link>
        )
      )}
      {nextPage && (
        <Link
          href={paginatedPath(basePath, nextPage)}
          className={`${itemClass} bg-muted hover:bg-muted/80`}
        >
          Siguiente →
        </Link>
      )}
    </nav>
  )
}
