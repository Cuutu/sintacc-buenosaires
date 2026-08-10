export const LIST_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE_LINK: "PRIVATE_LINK",
} as const

export type ListVisibility =
  (typeof LIST_VISIBILITY)[keyof typeof LIST_VISIBILITY]

export const LIST_LINK_STATUS = {
  ACTIVE: "active",
  REVOKED: "revoked",
  ARCHIVED: "archived",
} as const

export type ListLinkStatus =
  (typeof LIST_LINK_STATUS)[keyof typeof LIST_LINK_STATUS]

export const PRIVATE_LIST_PATH_PREFIX = "/listas/privadas"

export const PRIVATE_TOKEN_BYTES = 32
export const PLACE_NOTE_MAX_LENGTH = 500
export const DESTINATION_MAX_LENGTH = 120
