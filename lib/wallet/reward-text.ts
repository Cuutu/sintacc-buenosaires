/** Texto del cambio de sellos o premio (sin dependencias: lo usan la tarjeta y el formulario del local). */
export function rewardChangeText(placeName: string, total: number, reward: string): string {
  return `Nuevas condiciones en ${placeName}: con ${total} ${total === 1 ? "sello" : "sellos"} te llevás ${reward}.`
}
