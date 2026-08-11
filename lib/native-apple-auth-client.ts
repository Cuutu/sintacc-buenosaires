/**
 * Browser-safe Apple nonce helpers (no Node crypto).
 * Must match server `sha256Hex` / `appleRequestNonceFromRaw` in native-apple-auth.ts.
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** SHA-256 hex of raw nonce — pass this value to Capgo `SocialLogin.login({ provider:"apple", options:{ nonce } })`. */
export async function appleRequestNonceFromRaw(rawNonce: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error("Web Crypto unavailable for Apple nonce hashing")
  }
  const bytes =
    typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(rawNonce)
      : Uint8Array.from(
          Array.from(rawNonce).map((ch) => ch.charCodeAt(0))
        )
  const digest = await subtle.digest("SHA-256", bytes)
  return toHex(digest)
}
