"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { branchAreaFor, findRepeatedNames } from "@/lib/place-branch-name"
import { getCanonicalPlaceArea } from "@/lib/place-location-display"
import type { PlaceLocationFields } from "@/lib/place-location-display"

const EMPTY: ReadonlySet<string> = new Set()
const SEP = "\u0000"
const RepeatedNamesContext = createContext<ReadonlySet<string>>(EMPTY)

/**
 * Envuelve una lista (o el mapa) con los nombres que se repiten en lo que se muestra.
 * Recibe solo los nombres: desde una página del servidor no hace falta mandar los lugares.
 */
export function RepeatedNamesProvider({ names, children }: { names: Array<string | null | undefined>; children: ReactNode }) {
  // Se recalcula solo si cambian los nombres (no en cada render del mapa).
  const key = names.map((name) => name ?? "").join(SEP)
  const repeated = useMemo(() => findRepeatedNames(key.split(SEP).map((name) => ({ name }))), [key])
  return <RepeatedNamesContext.Provider value={repeated}>{children}</RepeatedNamesContext.Provider>
}

type BranchPlace = PlaceLocationFields & { name?: string | null }

/** El barrio de la sucursal si el nombre se repite en la lista; si no, null. */
export function useBranchArea(place: BranchPlace): string | null {
  const repeated = useContext(RepeatedNamesContext)
  if (repeated.size === 0) return null
  return branchAreaFor(place, getCanonicalPlaceArea(place) || place.neighborhood, repeated)
}

/**
 * El nombre y, si se repite (sucursales), el barrio al lado: "Celigourmet · Palermo".
 * El barrio va en letra normal y más chica para que se lea como dato, no como nombre.
 */
export function PlaceNameWithBranch({ place }: { place: BranchPlace & { name: string } }) {
  const area = useBranchArea(place)
  return (
    <>
      {place.name}
      {area ? (
        <span className="ml-1 whitespace-nowrap font-sans text-[0.62em] font-bold not-italic tracking-normal opacity-80">
          · {area}
        </span>
      ) : null}
    </>
  )
}
