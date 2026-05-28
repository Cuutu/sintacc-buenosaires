import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import { VentureSuggestion } from "@/models/VentureSuggestion"
import { Contact } from "@/models/Contact"

export type AdminCounts = {
  suggestionsPending: number
  ventureSuggestionsPending: number
  contactsTotal: number
  placesTotal: number
}

export async function getAdminCounts(): Promise<AdminCounts> {
  await connectDB()
  const [suggestionsPending, ventureSuggestionsPending, contactsTotal, placesTotal] =
    await Promise.all([
      Suggestion.countDocuments({ status: "pending" }),
      VentureSuggestion.countDocuments({ status: "pending" }),
      Contact.countDocuments(),
      Place.countDocuments(),
    ])
  return { suggestionsPending, ventureSuggestionsPending, contactsTotal, placesTotal }
}
