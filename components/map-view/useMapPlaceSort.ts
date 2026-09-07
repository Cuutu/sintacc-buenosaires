"use client"

import * as React from "react"
import type { LocationStatus } from "./useUserLocation"
import type { UserLatLng } from "./geo"
import {
  MAP_SORT_STORAGE_KEY,
  defaultSortForLocation,
  parseStoredSort,
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
  const askedForNearestRef = React.useRef(false)
  const [sort, setSortState] = React.useState<PlaceSortOption>(
    () => storedOnMount.current ?? "recommended"
  )

  React.useEffect(() => {
    if (userPickedRef.current) return
    if (location.status !== "granted") return
    setSortState("nearest")
  }, [location.status])

  const setSort = React.useCallback((next: PlaceSortOption) => {
    userPickedRef.current = true
    writeStoredSort(next)
    setSortState(next)
  }, [])

  React.useEffect(() => {
    if (sort !== "nearest") {
      askedForNearestRef.current = false
      return
    }
    if (location.coords) return
    if (
      location.status === "denied" ||
      location.status === "error" ||
      location.status === "unavailable"
    ) {
      userPickedRef.current = true
      writeStoredSort("recommended")
      setSortState("recommended")
      return
    }
    if (location.status === "granted") return
    if (askedForNearestRef.current) return
    if (location.status === "prompt" || location.status === "unknown") {
      askedForNearestRef.current = true
      location.request()
    }
  }, [sort, location.coords, location.status, location.request])

  const showLocationCta = shouldShowLocationCta({
    sort,
    status: location.status,
    hasCoords: Boolean(location.coords),
  })

  return { sort, setSort, showLocationCta }
}
