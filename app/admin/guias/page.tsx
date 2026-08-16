import Link from "next/link"
import { getPublishedGuides } from "@/lib/seo/guides"
import { adminUi } from "@/lib/admin-ui"

export default function AdminGuiasPage() {
  const published = getPublishedGuides().length
  return (
    <div className="mx-auto max-w-[1280px]">
      <h1 className={adminUi.title}>Guías</h1>
      <p className={`mt-2 ${adminUi.subtitle}`}>
        {published === 0
          ? "No hay guías publicadas todavía."
          : `${published} guía${published === 1 ? "" : "s"} publicada${published === 1 ? "" : "s"} en /guias.`}
      </p>
      <article className={`${adminUi.card} mt-6 p-5`}>
        <p className="text-sm font-medium text-[#234A33]">Editor de orden</p>
        <p className="mt-1 text-sm text-[#6B746C]">
          No disponible todavía. Las guías se editan en el código de contenido, no hay panel de orden o fechas.
        </p>
      </article>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/guias" className={adminUi.btnGhost}>
          Ver guías publicadas
        </Link>
        <Link href="/listas" className={adminUi.btnGhost}>
          Listas
        </Link>
      </div>
    </div>
  )
}
