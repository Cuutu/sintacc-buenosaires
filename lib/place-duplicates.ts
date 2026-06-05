export type DuplicateCandidateKind = "place" | "suggestion"

export interface DuplicateDraft {
  _id?: unknown
  name?: string
  address?: string
  addressText?: string
  neighborhood?: string
  location?: {
    lat?: number
    lng?: number
  }
  contact?: {
    instagram?: string
    url?: string
  }
  status?: string
}

export interface DuplicateCandidate {
  id: string
  kind: DuplicateCandidateKind
  name: string
  address?: string
  neighborhood?: string
  score: number
  reasons: string[]
  distanceMeters?: number
  status?: string
}

interface MatchOptions {
  threshold?: number
  limit?: number
}

const DEFAULT_THRESHOLD = 50
const DEFAULT_LIMIT = 3
const PLACEHOLDER_VALUES = new Set([
  "",
  "a completar",
  "a completar ver link",
  "otro",
  "sin direccion",
  "ubicacion seleccionada",
])

export function findDuplicateCandidates(
  source: DuplicateDraft,
  candidates: Array<DuplicateDraft & { kind: DuplicateCandidateKind }>,
  options: MatchOptions = {}
): DuplicateCandidate[] {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const limit = options.limit ?? DEFAULT_LIMIT

  return candidates
    .map((candidate) => scoreDuplicateCandidate(source, candidate))
    .filter((candidate): candidate is DuplicateCandidate => Boolean(candidate))
    .filter((candidate) => candidate.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function scoreDuplicateCandidate(
  source: DuplicateDraft,
  candidate: DuplicateDraft & { kind: DuplicateCandidateKind }
): DuplicateCandidate | null {
  const candidateId = stringifyId(candidate._id)
  if (!candidateId) return null

  const reasons: string[] = []
  let score = 0

  const sourceName = normalizeSearchText(source.name)
  const candidateName = normalizeSearchText(candidate.name)
  const sourceNameCompact = compactText(sourceName)
  const candidateNameCompact = compactText(candidateName)

  if (isUsefulText(sourceName) && isUsefulText(candidateName)) {
    if (sourceNameCompact === candidateNameCompact) {
      score += 45
      reasons.push("nombre igual")
    } else if (
      sourceNameCompact.length >= 5 &&
      candidateNameCompact.length >= 5 &&
      (sourceNameCompact.includes(candidateNameCompact) ||
        candidateNameCompact.includes(sourceNameCompact))
    ) {
      score += 35
      reasons.push("nombre muy parecido")
    } else {
      const similarity = stringSimilarity(sourceNameCompact, candidateNameCompact)
      if (similarity >= 0.88) {
        score += 32
        reasons.push("nombre casi igual")
      } else if (similarity >= 0.78) {
        score += 20
        reasons.push("nombre parecido")
      }
    }
  }

  const sourceAddress = normalizeSearchText(source.addressText || source.address)
  const candidateAddress = normalizeSearchText(candidate.addressText || candidate.address)
  const sourceAddressCompact = compactText(sourceAddress)
  const candidateAddressCompact = compactText(candidateAddress)

  if (isUsefulText(sourceAddress) && isUsefulText(candidateAddress)) {
    if (sourceAddressCompact === candidateAddressCompact) {
      score += 25
      reasons.push("misma direccion")
    } else if (
      sourceAddressCompact.length >= 8 &&
      candidateAddressCompact.length >= 8 &&
      (sourceAddressCompact.includes(candidateAddressCompact) ||
        candidateAddressCompact.includes(sourceAddressCompact))
    ) {
      score += 15
      reasons.push("direccion parecida")
    }
  }

  const sourceNeighborhood = normalizeSearchText(source.neighborhood)
  const candidateNeighborhood = normalizeSearchText(candidate.neighborhood)
  if (isUsefulText(sourceNeighborhood) && sourceNeighborhood === candidateNeighborhood) {
    score += 8
    reasons.push("mismo barrio/localidad")
  }

  const sharedContactReason = getSharedContactReason(source, candidate)
  if (sharedContactReason) {
    score += 80
    reasons.push(sharedContactReason)
  }

  const distanceMeters = distanceBetweenDrafts(source, candidate)
  if (distanceMeters != null) {
    if (distanceMeters <= 60) {
      score += 35
      reasons.push("misma ubicacion")
    } else if (distanceMeters <= 150) {
      score += 25
      reasons.push("muy cerca")
    } else if (distanceMeters <= 300) {
      score += 12
      reasons.push("cerca")
    }
  }

  if (score <= 0) return null

  return {
    id: candidateId,
    kind: candidate.kind,
    name: candidate.name || "Lugar sin nombre",
    address: candidate.address || candidate.addressText,
    neighborhood: candidate.neighborhood,
    score: Math.min(100, score),
    reasons: [...new Set(reasons)],
    distanceMeters,
    status: candidate.status,
  }
}

function normalizeSearchText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function compactText(value: string): string {
  return value.replace(/\s+/g, "")
}

function isUsefulText(value: string): boolean {
  return value.length >= 3 && !PLACEHOLDER_VALUES.has(value)
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const maxLength = Math.max(a.length, b.length)
  if (maxLength === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLength
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      )
    }
    for (let j = 0; j <= b.length; j++) {
      previous[j] = current[j]
    }
  }

  return previous[b.length]
}

function getSharedContactReason(source: DuplicateDraft, candidate: DuplicateDraft): string | null {
  const sourceInstagram = normalizeInstagram(source.contact?.instagram)
  const candidateInstagram = normalizeInstagram(candidate.contact?.instagram)
  if (sourceInstagram && sourceInstagram === candidateInstagram) return "mismo instagram"

  const sourceUrl = normalizeUrl(source.contact?.url)
  const candidateUrl = normalizeUrl(candidate.contact?.url)
  if (sourceUrl && sourceUrl === candidateUrl) return "mismo link"

  return null
}

function normalizeInstagram(value: unknown): string {
  if (typeof value !== "string") return ""
  const lower = value.trim().toLowerCase()
  const match = lower.match(/instagram\.com\/([^/?#]+)/)
  const username = match?.[1] || lower.replace(/^@/, "")
  return username.replace(/[^a-z0-9._]/g, "")
}

function normalizeUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
    url.hash = ""
    url.search = ""
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`
  } catch {
    return trimmed.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "")
  }
}

function distanceBetweenDrafts(source: DuplicateDraft, candidate: DuplicateDraft): number | undefined {
  const sourceLat = source.location?.lat
  const sourceLng = source.location?.lng
  const candidateLat = candidate.location?.lat
  const candidateLng = candidate.location?.lng
  if (
    !Number.isFinite(sourceLat) ||
    !Number.isFinite(sourceLng) ||
    !Number.isFinite(candidateLat) ||
    !Number.isFinite(candidateLng)
  ) {
    return undefined
  }

  return Math.round(distanceMeters(sourceLat!, sourceLng!, candidateLat!, candidateLng!))
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusMeters * c
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

function stringifyId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && "toString" in value) return value.toString()
  return String(value)
}
