"use client"

import * as React from "react"
import type { LocationStatus } from "./useUserLocation"
import type { UserLatLng } from "./geo"
import {
  MAP_SORT_STORAGE_KEY,
  parseStoredSort,
  shouldAskLocationForNearest,
  shouldFallbackNearestToRecommended,
  shouldShowLocationCta,
  type PlaceSortOption,
} from "./place-sort"

function readStoredSort(): PlaceSortOption | null {
  if (typeof window === "undefined") return null
  try {
    return parseStoredSort(window.sessionStorage.getItem(MAP_SORT_STORAGE_KEY))
  } catch {
    return null
  }
}

function writeStoredSort(sort: PlaceSortOption): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(MAP_SORT_STORAGE_KEY, sort)
  } catch {
    /* storage bloqueado */
  }
}

type LocationApi = {
  coords: UserLatLng | null
  status: LocationStatus
  request: (options?: { silent?: boolean }) => void
}

export function useMapPlaceSort(location: LocationApi) {
  const storedOnMount = React.useRef(readStoredSort())
  const userPickedRef = React.useRef(storedOnMount.current != null)
  const [sort, setSortState] = React.useState<PlaceSortOption>(
    () => storedOnMount.current ?? "recommended"
  )
  const coords = location.coords
  const status = location.status
  const requestLocation = location.request

  React.useEffect(() => {
    if (userPickedRef.current) return
    if (status !== "granted") return
    setSortState("nearest")
  }, [status])

  const setSort = React.useCallback(
    (next: PlaceSortOption) => {
      userPickedRef.current = true
      writeStoredSort(next)
      setSortState(next)
      // Pedir geolocation acá (gesto del select/CTA). Desde useEffect el browser
      // traga el prompt y el sort se revierte a Recomendados.
      if (shouldAskLocationForNearest({ sort: next, hasCoords: Boolean(coords) })) {
        requestLocation()
      }
    },
    [coords, requestLocation]
  )

  React.useEffect(() => {
    if (
      !shouldFallbackNearestToRecommended({
        sort,
        status,
        hasCoords: Boolean(coords),
      })
    ) {
      return
    }
    userPickedRef.current = true
    writeStoredSort("recommended")
    setSortState("recommended")
  }, [sort, coords, status])

  const showLocationCta = shouldShowLocationCta({
    sort,
    status,
    hasCoords: Boolean(coords),
  })

  return { sort, setSort, showLocationCta }
}
