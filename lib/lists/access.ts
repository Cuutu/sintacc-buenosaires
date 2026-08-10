import {
  LIST_LINK_STATUS,
  LIST_VISIBILITY,
  type ListLinkStatus,
  type ListVisibility,
} from "@/lib/lists/constants"

export function isPrivateListsFeatureEnabled(): boolean {
  return process.env.PRIVATE_LISTS_ENABLED === "true"
}

/** Allowlist por email (coma-separada). Vacía = solo admins cuando flag on. */
export function getPrivateListsAllowlist(): string[] {
  return (process.env.PRIVATE_LISTS_ALLOWLIST || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function canUsePrivateLists(opts: {
  email?: string | null
  role?: string | null
}): boolean {
  if (!isPrivateListsFeatureEnabled()) return false
  if (opts.role === "admin") return true
  const email = (opts.email || "").trim().toLowerCase()
  if (!email) return false
  const allowlist = getPrivateListsAllowlist()
  if (allowlist.length === 0) return false
  return allowlist.includes(email)
}

export function isPublicListVisibility(
  visibility?: ListVisibility | string | null,
  isPublic?: boolean | null
): boolean {
  if (visibility === LIST_VISIBILITY.PRIVATE_LINK) return false
  if (visibility === LIST_VISIBILITY.PUBLIC) return true
  // Pre-migración / legacy
  return isPublic !== false
}

export function publicListsQuery() {
  return {
    isPublic: true,
    $or: [
      { visibility: LIST_VISIBILITY.PUBLIC },
      { visibility: { $exists: false } },
      { visibility: null },
    ],
  }
}

export function isPrivateLinkActive(list: {
  visibility?: string | null
  linkStatus?: ListLinkStatus | string | null
  privateAccessToken?: string | null
}): boolean {
  return (
    list.visibility === LIST_VISIBILITY.PRIVATE_LINK &&
    list.linkStatus === LIST_LINK_STATUS.ACTIVE &&
    Boolean(list.privateAccessToken)
  )
}

export function ownerIdEquals(
  createdBy: unknown,
  userId: string | undefined | null
): boolean {
  if (!createdBy || !userId) return false
  if (typeof createdBy === "string") return createdBy === userId
  if (typeof createdBy === "object") {
    const obj = createdBy as { _id?: { toString(): string }; toString?: () => string }
    if (obj._id) return obj._id.toString() === userId
    if (typeof obj.toString === "function") {
      const asString = obj.toString()
      if (asString && asString !== "[object Object]") return asString === userId
    }
  }
  return false
}
