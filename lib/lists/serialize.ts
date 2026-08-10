import { LIST_VISIBILITY } from "@/lib/lists/constants"
import { buildPrivateListPath } from "@/lib/lists/private-token"

type LeanList = Record<string, unknown> & {
  visibility?: string
  isPublic?: boolean
  privateAccessToken?: string | null
  linkStatus?: string | null
  placeNotes?: Array<{ placeId: unknown; note?: string }>
  placeIds?: unknown[]
  createdBy?: unknown
}

/** Respuesta para owner: incluye path privado, nunca en listados públicos. */
export function serializeListForOwner(list: LeanList) {
  const visibility =
    list.visibility === LIST_VISIBILITY.PRIVATE_LINK
      ? LIST_VISIBILITY.PRIVATE_LINK
      : LIST_VISIBILITY.PUBLIC

  const token =
    typeof list.privateAccessToken === "string"
      ? list.privateAccessToken
      : null

  return {
    ...list,
    visibility,
    isPublic: visibility === LIST_VISIBILITY.PUBLIC,
    privateSharePath:
      visibility === LIST_VISIBILITY.PRIVATE_LINK && token
        ? buildPrivateListPath(token)
        : null,
    // Token crudo solo para armar link en cliente owner; no loguear.
    privateAccessToken:
      visibility === LIST_VISIBILITY.PRIVATE_LINK ? token : undefined,
  }
}

/** Respuesta pública / cliente: sin token ni campos internos. */
export function serializeListForPublicViewer(list: LeanList) {
  const {
    privateAccessToken: _token,
    linkStatus: _status,
    ...rest
  } = list
  return {
    ...rest,
    visibility: LIST_VISIBILITY.PRIVATE_LINK,
    isPublic: false,
    privateAccessToken: undefined,
    privateSharePath: undefined,
    linkStatus: undefined,
  }
}

export function serializeListForCommunity(list: LeanList) {
  const {
    privateAccessToken: _t,
    linkStatus: _s,
    privateSharePath: _p,
    placeNotes: _n,
    ...rest
  } = list as LeanList & { privateSharePath?: string }
  return {
    ...rest,
    visibility: LIST_VISIBILITY.PUBLIC,
    isPublic: true,
    privateAccessToken: undefined,
    privateSharePath: undefined,
    linkStatus: undefined,
  }
}
