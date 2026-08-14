"use client"

import Image from "next/image"
import {
  Copy,
  ExternalLink,
  Lock,
  MoreHorizontal,
  Settings2,
  Globe,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ListWithDetails } from "@/components/lists/ListCard"
import {
  LIST_LINK_STATUS,
  LIST_VISIBILITY,
} from "@/lib/lists/constants"
import { cn } from "@/lib/utils"

function formatRelative(value?: string | Date) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return "Actualizada hoy"
  if (days === 1) return "Actualizada ayer"
  if (days < 7) return `Actualizada hace ${days} días`
  return `Actualizada el ${d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`
}

interface OwnerListCardProps {
  list: ListWithDetails & { updatedAt?: string | Date }
  onManage: () => void
  onCopyLink: () => void
  onPreview: () => void
  onDuplicate: () => void
  onRegenerate: () => void
  onRevoke: () => void
  onEnable: () => void
  onDelete: () => void
}

export function OwnerListCard({
  list,
  onManage,
  onCopyLink,
  onPreview,
  onDuplicate,
  onRegenerate,
  onRevoke,
  onEnable,
  onDelete,
}: OwnerListCardProps) {
  const isPrivate =
    list.visibility === LIST_VISIBILITY.PRIVATE_LINK || list.isPublic === false
  const linkActive =
    isPrivate &&
    list.linkStatus !== LIST_LINK_STATUS.REVOKED &&
    Boolean(list.privateSharePath)
  const revoked =
    isPrivate && list.linkStatus === LIST_LINK_STATUS.REVOKED

  const places = list.placeIds ?? []
  const photos = [
    list.coverImage,
    ...places.map((p) => ("photos" in p ? p.photos?.[0] : undefined)),
  ].filter(Boolean) as string[]
  const uniquePhotos = [...new Set(photos)].slice(0, 4)
  const updated = formatRelative(list.updatedAt)
  const placesLabel = `${places.length} lugar${places.length !== 1 ? "es" : ""}`

  const statusLabel = !isPrivate
    ? "Pública"
    : revoked
      ? "Acceso revocado"
      : linkActive
        ? "Enlace activo"
        : "Privada"

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-olive/10 bg-card">
      <button
        type="button"
        onClick={onManage}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="relative h-[132px] w-full overflow-hidden bg-card">
          {uniquePhotos.length >= 2 ? (
            <div
              className={cn(
                "grid h-full w-full gap-0.5",
                uniquePhotos.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
              )}
            >
              {uniquePhotos.slice(0, 4).map((src) => (
                <div key={src} className="relative min-h-0">
                  <Image src={src} alt="" fill className="object-cover" sizes="200px" />
                </div>
              ))}
            </div>
          ) : uniquePhotos[0] ? (
            <Image
              src={uniquePhotos[0]}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-olive/15 to-card text-muted-foreground">
              <MapPin className="h-7 w-7 text-primary/40" />
              <span className="text-xs font-medium">{placesLabel}</span>
            </div>
          )}

          <span
            className={cn(
              "absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
              isPrivate
                ? revoked
                  ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                  : "border-primary/30 bg-black/55 text-primary"
                : "border-olive/15 bg-black/55 text-white/85"
            )}
          >
            {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {statusLabel}
          </span>
        </div>

        <div className="space-y-1 px-3.5 pb-2 pt-3">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-olive">
            {list.name}
          </h3>
          {list.destination ? (
            <p className="truncate text-xs text-primary/85">{list.destination}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {placesLabel}
            {updated ? ` · ${updated}` : ""}
          </p>
        </div>
      </button>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-olive/10 p-3">
        {isPrivate ? (
          <Button
            type="button"
            size="sm"
            className="h-9 flex-1 gap-1.5"
            disabled={!linkActive}
            onClick={onCopyLink}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar enlace
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 flex-1 gap-1.5"
            onClick={onManage}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gestionar
          </Button>
        )}

        {isPrivate ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 gap-1.5"
            onClick={onManage}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gestionar
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9"
              aria-label={`Más acciones para ${list.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isPrivate ? (
              <DropdownMenuItem
                disabled={!linkActive}
                onSelect={onPreview}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Vista previa
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={onPreview}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Ver pública
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onDuplicate}>Duplicar lista</DropdownMenuItem>
            {isPrivate ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onRegenerate}>
                  Regenerar enlace
                </DropdownMenuItem>
                {revoked ? (
                  <DropdownMenuItem onSelect={onEnable}>
                    Reactivar acceso
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={onRevoke}>
                    Revocar acceso
                  </DropdownMenuItem>
                )}
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onDelete}>
              Eliminar lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}
