"use client"

import type { ReactNode } from "react"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { adminButtonClass } from "./button"

/**
 * Menú "⋯" para las acciones secundarias de una fila o tarjeta. Es de Radix:
 * se cierra con Escape, con un clic afuera y al elegir una opción.
 * Las acciones peligrosas van al final, separadas y en rojo.
 */
export type ActionMenuItem = {
  label: string
  onSelect: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}

export function ActionMenu({
  label,
  items,
  align = "end",
}: {
  /** Para lectores de pantalla: "Más acciones para Polvorín". */
  label: string
  items: ActionMenuItem[]
  align?: "start" | "end"
}) {
  const safe = items.filter((i) => !i.danger)
  const danger = items.filter((i) => i.danger)
  const row = (item: ActionMenuItem) => (
    <DropdownMenuItem
      key={item.label}
      disabled={item.disabled}
      onSelect={item.onSelect}
      className={cn("min-h-10 gap-2", item.danger && "text-danger focus:bg-danger-soft focus:text-danger")}
    >
      {item.icon}
      {item.label}
    </DropdownMenuItem>
  )
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={label} className={adminButtonClass({ variant: "secondary", size: "icon", className: "rounded-full" })}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[11rem]">
        {safe.map(row)}
        {safe.length > 0 && danger.length > 0 ? <DropdownMenuSeparator /> : null}
        {danger.map(row)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
