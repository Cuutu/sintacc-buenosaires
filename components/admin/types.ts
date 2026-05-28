export type SuggestionItem = {
  _id: string
  placeDraft: {
    name: string
    type: string
    types?: string[]
    address: string
    neighborhood: string
    openingHours?: string
    delivery?: { available?: boolean; rappi?: string; pedidosya?: string; other?: string }
    contact?: { instagram?: string; url?: string }
    safetyLevel?: string
    tags?: string[]
  }
  suggestedByUserId?: { name?: string }
}

export type ReviewItem = {
  _id: string
  placeId: { name: string; address?: string; _id: string }
  userId?: { name?: string; image?: string }
  rating: number
  comment: string
  status: "visible" | "hidden"
  pinned?: boolean
  createdAt: string
}

export type PlaceItem = {
  _id: string
  name: string
  type: string
  address: string
  neighborhood: string
  status: string
  source?: "excel" | "kml" | "suggestion" | "manual"
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  tags?: string[]
  photos?: string[]
  contact?: { instagram?: string; url?: string; whatsapp?: string; phone?: string }
  stats?: { avgRating: number; totalReviews: number }
}

export type ContactItem = {
  _id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  createdAt: string
  userId?: { name?: string; email?: string }
}

export type VentureSuggestionItem = {
  _id: string
  ventureDraft: {
    name?: string
    category?: string
    zone?: string
    modalities?: string[]
    safetyLevel?: string
    contact?: { instagram?: string; whatsapp?: string }
    purchaseChannels?: string
    certifiedProducts?: boolean
    photos?: string[]
  }
  suggesterComment?: string
  shipsNationwide?: boolean
  suggestedByUserId?: { name?: string; email?: string }
}

export type VentureItem = {
  _id: string
  name: string
  category: string
  zone: string
  modalities?: string[]
  safetyLevel?: string
  status: string
  contact?: { instagram?: string; whatsapp?: string }
  photos?: string[]
}

export type AdminCounts = {
  suggestionsPending: number
  ventureSuggestionsPending: number
  contactsTotal: number
  placesTotal: number
}

export type VentureReviewItem = {
  _id: string
  rating: number
  comment: string
  status: "visible" | "hidden"
  pinned?: boolean
  createdAt: string
  userId?: { name?: string; email?: string }
  ventureId?: { _id?: string; name?: string; zone?: string; category?: string }
}

export type AdminSection =
  | "suggestions"
  | "ventureSuggestions"
  | "ventures"
  | "reviews"
  | "ventureReviews"
  | "places"
  | "contacts"
