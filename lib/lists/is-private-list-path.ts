import { PRIVATE_LIST_PATH_PREFIX } from "@/lib/lists/constants"

/** Rutas de guía privada — sin chrome global / onboarding / PWA. */
export function isPrivateListPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (
    pathname === PRIVATE_LIST_PATH_PREFIX ||
    pathname.startsWith(`${PRIVATE_LIST_PATH_PREFIX}/`)
  )
}
