/**
 * La ficha pública muestra `addressText` (si existe) y no `address`.
 * Si el admin actualiza solo `address`, el visitante sigue viendo la calle vieja.
 */
export function syncAddressTextOnPatch<T extends {
  address?: string
  addressText?: string
}>(patch: T): T {
  const address = patch.address?.trim()
  if (!address) return patch
  if (patch.addressText !== undefined) {
    const text = patch.addressText.trim()
    return text === patch.addressText ? patch : { ...patch, addressText: text }
  }
  return { ...patch, addressText: address }
}
