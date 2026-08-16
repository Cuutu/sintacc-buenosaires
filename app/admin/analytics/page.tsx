import { getAdminCounts } from "@/lib/admin-ops"
import { adminUi } from "@/lib/admin-ui"

export default async function AdminAnalyticsPage() {
  const counts = await getAdminCounts()
  const available = [
    { label: "Lugares publicados", value: counts.placesApproved, note: "Fichas con status aprobado." },
    { label: "Lugares totales", value: counts.placesTotal, note: "Incluye pendientes." },
    { label: "Sugerencias pendientes", value: counts.suggestionsPending, note: "Cola de locales." },
    { label: "Marcas por validar", value: counts.ventureSuggestionsPending, note: "Cola de emprendimientos." },
    { label: "Destacados activos", value: counts.featuredCount, note: "Selección manual del admin." },
    { label: "Mensajes pendientes", value: counts.contactsPending, note: "Bandeja de contacto." },
    { label: "Reseñas ocultas", value: counts.reviewsHidden, note: "Reportes o moderación." },
    { label: "Lugares sin foto", value: counts.placesNoPhoto, note: "Hueco de calidad, no tráfico." },
    { label: "Lugares sin horarios", value: counts.placesNoHours, note: "Hueco de calidad, no tráfico." },
  ]
  const pending = [
    {
      label: "Tiempo promedio de aprobación",
      why: "No se guarda timestamp de primer approve vs createdAt agregado.",
    },
    {
      label: "Ciudades con más crecimiento",
      why: "No hay serie histórica de altas por ciudad.",
    },
    {
      label: "Lugares más vistos",
      why: "No hay tracking de vistas de ficha.",
    },
    {
      label: "Marcas más vistas",
      why: "No hay tracking de vistas de emprendimientos.",
    },
    {
      label: "CTR de destacados",
      why: "No hay eventos de impresión o click en home.",
    },
  ]

  return (
    <div className="mx-auto max-w-[1280px]">
      <h1 className={adminUi.title}>Analytics</h1>
      <p className={`mt-2 ${adminUi.subtitle}`}>
        Solo métricas que ya existen en la base. El resto queda marcado como tracking pendiente.
      </p>

      <section className="mt-8">
        <h2 className={adminUi.label}>Datos disponibles</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {available.map((row) => (
            <article key={row.label} className={`${adminUi.card} p-5`}>
              <p className="text-sm text-[#6B746C]">{row.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-[#234A33]">
                {row.value.toLocaleString("es-AR")}
              </p>
              <p className="mt-2 text-xs text-[#6B746C]">{row.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className={adminUi.label}>Tracking pendiente</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {pending.map((row) => (
            <article key={row.label} className={`${adminUi.card} p-5`}>
              <p className="text-sm font-medium text-[#234A33]">{row.label}</p>
              <p className="mt-2 text-sm text-[#6B746C]">Sin datos todavía</p>
              <p className="mt-1 text-xs text-[#6B746C]">
                Disponible cuando se active el tracking correspondiente. {row.why}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
