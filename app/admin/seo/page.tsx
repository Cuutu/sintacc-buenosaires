import Link from "next/link"
import { getAdminSeoSnapshot } from "@/lib/admin-seo"
import { adminUi } from "@/lib/admin-ui"

export default async function AdminSeoPage() {
  const snapshot = await getAdminSeoSnapshot()

  return (
    <div className="mx-auto max-w-[1280px]">
      <h1 className={adminUi.title}>SEO</h1>
      <p className={`mt-2 ${adminUi.subtitle}`}>
        Cobertura e indexación de páginas públicas. La calidad de ficha se trabaja en Lugares.
      </p>

      <section className="mt-8">
        <h2 className={adminUi.label}>Datos disponibles</h2>
        <ul className={`mt-4 space-y-3 ${adminUi.card} p-5`}>
          {snapshot.ready.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 border-b border-[#E8E1D6] pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[#234A33]">{row.label}</p>
                <p className="mt-0.5 text-xs text-[#6B746C]">{row.note}</p>
              </div>
              <span className="flex items-center gap-3">
                <span className="tabular-nums text-[#234A33]">{row.value?.toLocaleString("es-AR")}</span>
                {row.href ? (
                  <Link href={row.href} className={adminUi.chip}>
                    Ver
                  </Link>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className={adminUi.label}>Tracking pendiente</h2>
        <ul className={`mt-4 space-y-3 ${adminUi.card} p-5`}>
          {snapshot.pending.map((row) => (
            <li key={row.id} className="border-b border-[#E8E1D6] pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#234A33]">{row.label}</p>
                <span className="text-xs font-medium text-[#6B746C]">No disponible todavía</span>
              </div>
              <p className="mt-1 text-xs text-[#6B746C]">{row.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
