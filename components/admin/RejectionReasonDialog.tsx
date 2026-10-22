"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AdminButton } from "@/components/admin/ui/button"

const QUICK_REASONS = [
  "Ya existe publicado en Celimap.",
  "Faltan datos para poder verificarlo.",
  "La direccion o ubicacion no parece correcta.",
  "No pudimos confirmar que sea apto para celiacos/sin gluten.",
]

type RejectionReasonDialogProps = {
  open: boolean
  title: string
  description: string
  itemName?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void> | void
}

export function RejectionReasonDialog({
  open,
  title,
  description,
  itemName,
  onOpenChange,
  onConfirm,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setReason("")
      setSubmitting(false)
    }
  }, [open])

  const trimmedReason = reason.trim()

  const handleConfirm = async () => {
    if (!trimmedReason) return
    setSubmitting(true)
    try {
      await onConfirm(trimmedReason)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-warning-bar bg-warning-soft">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {itemName ? (
              <span className="mt-1 block font-medium text-olive">{itemName}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((quickReason) => (
              <AdminButton
                variant="secondary"
                key={quickReason}
                type="button"
                className="h-auto whitespace-normal py-1.5 text-left"
                onClick={() => setReason(quickReason)}
              >
                {quickReason}
              </AdminButton>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Escribi el motivo que le va a llegar al usuario..."
            className="min-h-28 resize-none"
            maxLength={700}
          />
          <p className="text-right text-xs text-ink-muted">{reason.length}/700</p>
        </div>

        <DialogFooter>
          <AdminButton
            variant="secondary"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </AdminButton>
          <AdminButton
            variant="danger"
            type="button"
            onClick={handleConfirm}
            disabled={!trimmedReason || submitting}
          >
            {submitting ? "Rechazando..." : "Rechazar y avisar"}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
