import Link from "next/link"
import {
  VENTURE_CATEGORY_LANDINGS,
  VENTURE_ZONE_LANDINGS,
} from "@/lib/venture-seo"

export function VentureSeoNavLinks() {
  return (
    <nav
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6"
      aria-label="Explorar por categoría y zona"
    >
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Por categoría
        </h2>
        <ul className="flex flex-wrap gap-2">
          {VENTURE_CATEGORY_LANDINGS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/emprendimientos/${c.slug}`}
                className="text-sm px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {c.h1}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Por zona
        </h2>
        <ul className="flex flex-wrap gap-2">
          {VENTURE_ZONE_LANDINGS.map((z) => (
            <li key={z.slug}>
              <Link
                href={`/emprendimientos/${z.slug}`}
                className="text-sm px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {z.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        <Link href="/sugerir-emprendimiento" className="text-primary hover:underline">
          Sugerir un emprendimiento
        </Link>{" "}
        que falte en el listado.
      </p>
    </nav>
  )
}
