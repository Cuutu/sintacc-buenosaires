"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { listsUi } from "@/components/lists/lists-ui"

export type ListConfirmKind = "delete" | "regenerate"

/**
 * Confirmación de "Eliminar lista" y "Regenerar enlace" en Guardados. Va en su propio
 * archivo para cargarlo al usarlo: el diálogo de Radix pesa ~12 KB y casi nadie lo abre.
 */
export function ListConfirmDialog({
  kind,
  listName,
  loading,
  onCancel,
  onConfirm,
}: {
  kind: ListConfirmKind | null
  listName?: string
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-xl font-extrabold text-[#2D4A34]">
            {kind === "delete" ? "¿Eliminar lista?" : "¿Regenerar enlace?"}
          </DialogTitle>
          <DialogDescription className="text-base text-[#5E6A60]">
            {kind === "delete" ? (
              <>
                Se eliminará <span className="font-bold text-[#2D4A34]">{listName}</span>. Esta acción no se
                puede deshacer.
              </>
            ) : (
              "El enlace anterior deja de funcionar en el momento. Vas a tener que compartir el nuevo."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:space-x-0 [&>*]:flex-1 sm:[&>*]:flex-none">
          <button type="button" className={listsUi.secondary} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={listsUi.primary}
            disabled={loading}
            onClick={onConfirm}
          >
            {kind === "delete" ? "Eliminar" : "Regenerar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
