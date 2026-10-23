import { LIST_LINK_STATUS, LIST_VISIBILITY } from "@/lib/lists/constants"

/**
 * Cómo se comparte una lista, en las palabras que ve la gente:
 * - "public": Pública, la ve cualquiera en /listas.
 * - "link": Con enlace, solo quien tiene el enlace privado.
 * - "private": Privada, solo vos (privada con el enlace revocado).
 */
export type ListShareState = "public" | "link" | "private"

export const LIST_SHARE_LABELS: Record<ListShareState, string> = {
  public: "Pública",
  link: "Con enlace",
  private: "Privada",
}

export const LIST_SHARE_HINTS: Record<ListShareState, string> = {
  public: "La ve cualquiera en CeliMap, en las listas de la comunidad.",
  link: "Solo la ven las personas que tengan el enlace.",
  private: "Solo la ves vos.",
}

type ShareInput = {
  visibility?: string | null
  isPublic?: boolean | null
  linkStatus?: string | null
}

export function listShareState(list: ShareInput): ListShareState {
  const isPrivate = list.visibility === LIST_VISIBILITY.PRIVATE_LINK || list.isPublic === false
  if (!isPrivate) return "public"
  if (list.linkStatus === LIST_LINK_STATUS.REVOKED || list.linkStatus === LIST_LINK_STATUS.ARCHIVED) {
    return "private"
  }
  return "link"
}

/** Enlace para compartir: el público, el privado (si está activo) o null (Privada). */
export function listShareUrl(
  list: ShareInput & { _id: string; privateSharePath?: string | null },
  origin: string
): string | null {
  const state = listShareState(list)
  if (state === "public") return `${origin}/listas/${list._id}`
  if (state === "link" && list.privateSharePath) return `${origin}${list.privateSharePath}`
  return null
}

/** Lo que se guarda en la lista para cada opción (la privada es "con enlace" con el enlace revocado). */
export function visibilityForShareState(state: ListShareState): "PUBLIC" | "PRIVATE_LINK" {
  return state === "public" ? "PUBLIC" : "PRIVATE_LINK"
}

/**
 * Acción del enlace privado que hace falta después de guardar para pasar de `prev` a
 * `next`: "revoke" para dejarla privada, "enable" para volver a darle enlace.
 */
export function linkActionForShareChange(prev: ListShareState | null, next: ListShareState): "revoke" | "enable" | null {
  if (next === "private" && prev !== "private") return "revoke"
  if (next === "link" && prev === "private") return "enable"
  return null
}
