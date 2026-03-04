import Link from "next/link"

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const prevPage = currentPage > 1 ? currentPage - 1 : null
  const nextPage = currentPage < totalPages ? currentPage + 1 : null

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-2 mt-8">
      {prevPage && (
        <Link
          href={prevPage === 1 ? basePath : `${basePath}?page=${prevPage}`}
          className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium"
        >
          ← Anterior
        </Link>
      )}
      <span className="text-sm text-muted-foreground px-4">
        Página {currentPage} de {totalPages}
      </span>
      {nextPage && (
        <Link
          href={`${basePath}?page=${nextPage}`}
          className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium"
        >
          Siguiente →
        </Link>
      )}
    </nav>
  )
}
