"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { isNativeApp } from "@/lib/native-app"

/** Misma clave que usa OnboardingModal al terminar o cerrar la bienvenida. */
const STORAGE_KEY = "celimap_onboarded"

const OnboardingModal = dynamic(
  () => import("@/components/onboarding/OnboardingModal").then((m) => m.OnboardingModal),
  { ssr: false }
)

/**
 * La bienvenida solo se muestra en la home, a quien no la vio y fuera de la app.
 * Antes el modal (con su Dialog y sus imágenes) venía en el JS de todas las
 * páginas y se abría también en fichas, landings y guías: en la ficha era el LCP
 * de las visitas nuevas. Ahora el código del modal se baja solo cuando hace falta.
 */
export function OnboardingGate() {
  const pathname = usePathname()
  const [eligible, setEligible] = useState(false)

  useEffect(() => {
    if (pathname !== "/") return
    try {
      if (isNativeApp() || localStorage.getItem(STORAGE_KEY) === "1") return
    } catch {
      // localStorage bloqueado: se muestra igual, como antes
    }
    setEligible(true)
  }, [pathname])

  if (!eligible || pathname !== "/") return null
  return <OnboardingModal />
}
