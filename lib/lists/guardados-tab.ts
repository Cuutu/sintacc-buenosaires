export type GuardadosTab = "favoritos" | "listas"

/** Link a Guardados abierto en "Mis listas" (lo usa el perfil). */
export const MIS_LISTAS_HREF = "/favoritos?tab=listas"

/** /favoritos?tab=listas abre directo en "Mis listas"; cualquier otra cosa, en Favoritos. */
export function guardadosTabFromSearch(search: string): GuardadosTab {
  return new URLSearchParams(search).get("tab") === "listas" ? "listas" : "favoritos"
}
