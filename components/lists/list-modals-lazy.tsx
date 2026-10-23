"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, type ComponentProps } from "react"

type CreateListModalProps = ComponentProps<(typeof import("@/components/lists/CreateListModal"))["CreateListModal"]>
type ManageListModalProps = ComponentProps<(typeof import("@/components/lists/ManageListModal"))["ManageListModal"]>

const loadCreateListModal = () => import("@/components/lists/CreateListModal")
const loadManageListModal = () => import("@/components/lists/ManageListModal")

/** Hover, pointerdown o foco en "Nueva lista": empieza a bajar el modal. */
export function preloadCreateListModal(): void {
  void loadCreateListModal().catch(() => undefined)
}

/** Lo mismo para "Gestionar". */
export function preloadManageListModal(): void {
  void loadManageListModal().catch(() => undefined)
}

const CreateListModalInner = dynamic(() => loadCreateListModal().then((m) => m.CreateListModal), { ssr: false })
const ManageListModalInner = dynamic(() => loadManageListModal().then((m) => m.ManageListModal), { ssr: false })

/** Se monta la primera vez que se abre y después queda montado (para la animación de cierre). */
function useMountedOnceOpen(open: boolean): boolean {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) setMounted(true)
  }, [open])
  return mounted
}

/**
 * Los modales de listas (Radix Dialog, subida de imagen, buscador de lugares) venían
 * en el JS inicial de /favoritos y /listas aunque la mayoría solo mira sus guardados.
 */
export function LazyCreateListModal(props: CreateListModalProps) {
  const mounted = useMountedOnceOpen(props.open)
  if (!mounted) return null
  return <CreateListModalInner {...props} />
}

export function LazyManageListModal(props: ManageListModalProps) {
  const mounted = useMountedOnceOpen(props.open)
  if (!mounted) return null
  return <ManageListModalInner {...props} />
}
