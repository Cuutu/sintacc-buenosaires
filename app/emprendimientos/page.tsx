"use client"

import { Suspense } from "react"
import EmprendimientosPageContent from "./EmprendimientosPageContent"

export default function EmprendimientosPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <EmprendimientosPageContent />
    </Suspense>
  )
}
