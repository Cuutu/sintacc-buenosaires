import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getCategoryLabel } from "@/lib/venture-constants"
import { SuggestVentureCta } from "./SuggestVentureCta"

type VenturesEmptyStateProps = {
  search?: string
  categoryId?: string | null
  onClearHref?: string
}

export function VenturesEmptyState({
  search,
  categoryId,
  onClearHref = "/emprendimientos",
}: VenturesEmptyStateProps) {
  const categoryLabel = categoryId ? getCategoryLabel(categoryId) : null
  const heading = search
    ? `0 resultados para “${search}”`
    : categoryLabel
      ? `Todavía no hay emprendimientos en ${categoryLabel}`
      : "Todavía no hay emprendimientos publicados"

  return (
    <div className="rounded-2xl border border-[#E8E1D6] bg-[#FDFBF7] px-6 py-10 text-center md:px-10">
      <h3 className="mb-3 text-lg font-bold text-[#1F4D35]">{heading}</h3>
      <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#5F6B63]">
        Probá otra búsqueda o sugerí uno. Lo revisamos antes de publicarlo.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild variant="outline" className="min-h-[48px]">
          <Link href={onClearHref}>Limpiar filtros</Link>
        </Button>
        <SuggestVentureCta />
      </div>
    </div>
  )
}
