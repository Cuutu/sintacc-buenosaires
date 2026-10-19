"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import type { ContaminationReportForm as ContaminationReportFormType } from "@/components/contamination-report-form"

const loadReportForm = () => import("@/components/contamination-report-form")

type ReportFormComponent = typeof ContaminationReportFormType

interface LazyContaminationReportFormProps {
  placeId: string
  onSuccess?: () => void
  /** El botón que abre el reporte. Se muestra igual antes y después de cargar. */
  trigger: ReactNode
}

/**
 * El reporte de contaminación (Radix Dialog) se baja al tocar el botón. Hasta entonces
 * se muestra el mismo botón, así que no se mueve nada; mientras baja, queda donde está
 * y el diálogo se abre apenas llega.
 */
export function LazyContaminationReportForm({ placeId, onSuccess, trigger }: LazyContaminationReportFormProps) {
  const [Form, setForm] = useState<ReportFormComponent | null>(null)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)

  const preload = useCallback(() => {
    void loadReportForm().catch(() => undefined)
  }, [])

  const open = useCallback(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    loadReportForm()
      .then((mod) => setForm(() => mod.ContaminationReportForm))
      .catch(() => {
        toast.error("No se pudo abrir el reporte. Revisá la conexión y probá de nuevo.")
      })
      .finally(() => {
        loadingRef.current = false
        setLoading(false)
      })
  }, [])

  if (Form) {
    return <Form placeId={placeId} onSuccess={onSuccess} trigger={trigger} defaultOpen />
  }

  return (
    <div
      className="w-full"
      aria-busy={loading || undefined}
      onClick={open}
      onPointerEnter={preload}
      onPointerDown={preload}
      onFocus={preload}
    >
      {trigger}
    </div>
  )
}
