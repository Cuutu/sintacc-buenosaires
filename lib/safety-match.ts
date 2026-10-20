/**
 * Cómo se muestra el estado de un lugar, en Mongo: lo mismo que inferSafetyLevel
 * (tags primero y `opciones_sin_tacc` gana sobre `100_gf`; `safetyLevel` solo si
 * los tags no dicen nada). Así los conteos de las landings coinciden con los badges.
 */
export const DISPLAY_DEDICATED_MATCH = {
  $or: [
    { $and: [{ tags: "100_gf" }, { tags: { $ne: "opciones_sin_tacc" } }] },
    { tags: { $nin: ["100_gf", "opciones_sin_tacc"] }, safetyLevel: "dedicated_gf" },
  ],
}

export const DISPLAY_OPTIONS_MATCH = {
  $or: [
    { tags: "opciones_sin_tacc" },
    { tags: { $nin: ["100_gf", "opciones_sin_tacc"] }, safetyLevel: "gf_options" },
  ],
}
