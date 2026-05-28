"use client"

import { Suspense } from "react"
import SugerirEmprendimientoContent from "./SugerirEmprendimientoContent"

export default function SugerirEmprendimientoPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <SugerirEmprendimientoContent />
    </Suspense>
  )
}
