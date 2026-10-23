"use client"

import { Copy, ExternalLink, MoreHorizontal, Settings2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ListCardFace, ListShareChip, type ListWithDetails } from "@/components/lists/ListCard"
import { listsUi } from "@/components/lists/lists-ui"
import { listShareState } from "@/lib/lists/share-state"
import { cn } from "@/lib/utils"

interface OwnerListCardProps {
  list: ListWithDetails
  onManage: () => void
  onCopyLink: () => void
  onPreview: () => void
  onDuplicate: () => void
  onRegenerate: () => void
  onDelete: () => void
}

/**
 * Tarjeta de "Mis listas": la misma cara que en /listas, con el sello de cómo se
 * comparte (Pública / Con enlace / Privada) y las acciones abajo. "Copiar enlace" está
 * también en las públicas; en las privadas (solo vos) no hay enlace que copiar.
 */
export function OwnerListCard({
  list,
  onManage,
  onCopyLink,
  onPreview,
  onDuplicate,
  onRegenerate,
  onDelete,
}: OwnerListCardProps) {
  const state = listShareState(list)
  const canCopy = state === "public" || (state === "link" && Boolean(list.privateSharePath))

  return (
    <ListCardFace list={list} chip={<ListShareChip list={list} />}>
      {/* En 2 y 3 columnas la tarjeta mide ~300 px: sin íconos, "Copiar enlace" entra entero. */}
      <div className="mt-2 flex gap-2 px-1 pb-1">
        <button type="button" className={cn(listsUi.secondary, "flex-1 px-3 sm:px-2")} onClick={onManage}>
          <Settings2 className="h-4 w-4 sm:hidden" aria-hidden />
          Gestionar
        </button>
        <button
          type="button"
          className={cn(listsUi.secondary, "flex-1 px-3 sm:px-2")}
          onClick={onCopyLink}
          disabled={!canCopy}
          title={canCopy ? undefined : "Las listas privadas no tienen enlace"}
        >
          <Copy className="h-4 w-4 sm:hidden" aria-hidden />
          Copiar enlace
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={listsUi.icon} aria-label={`Más acciones para ${list.name}`}>
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={onPreview}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              {state === "public" ? "Ver lista" : "Vista previa"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>Duplicar lista</DropdownMenuItem>
            {state === "link" ? (
              <DropdownMenuItem onSelect={onRegenerate}>Regenerar enlace</DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onDelete}>
              Eliminar lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </ListCardFace>
  )
}
