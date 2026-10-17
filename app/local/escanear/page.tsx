import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { normalizeEmail } from "@/lib/wallet/loyalty"
import { staffProgramFilter } from "@/lib/wallet/branches"
import { CardScanner } from "@/components/wallet/CardScanner"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Escanear tarjeta" }

/**
 * El local escanea la tarjeta del cliente sin salir de CeliMap (web o app).
 * Ojo: esta página habilita la cámara con su propio Permissions-Policy (next.config.js),
 * así que se abre con <a> (carga completa) y no con <Link>.
 */
export default async function EscanearPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login?callbackUrl=/local/escanear")

  const isAdmin = session.user.role === "admin"
  const email = normalizeEmail(session.user.email)
  await connectDB()
  const isStaff = isAdmin || (email ? Boolean(await LoyaltyProgram.exists(staffProgramFilter(email))) : false)

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
      <div>
        <a href="/local" className="text-sm font-semibold text-terracotta-strong underline">
          Volver al panel
        </a>
        <h1 className="mt-3 text-2xl font-bold text-olive">Escanear tarjeta</h1>
        <p className="mt-1 text-olive/80">El cliente abre su tarjeta en el Wallet y vos apuntás al QR.</p>
      </div>
      {isStaff ? (
        <CardScanner />
      ) : (
        <p className="rounded-2xl bg-cream-card p-5 text-olive/80">
          Tu cuenta ({session.user.email}) no está asociada a ningún local. Escribinos a contacto@celimap.com.ar
          para sumarte.
        </p>
      )}
    </main>
  )
}
