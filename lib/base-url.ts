export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (!url) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not defined")
  }
  return url.replace(/\/$/, "")
}
