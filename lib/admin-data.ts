import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Suggestion } from "@/models/Suggestion"
import { Contact } from "@/models/Contact"

export type AdminCounts = {
  suggestionsPending: number
  contactsTotal: number
  placesTotal: number
}

export async function getAdminCounts(): Promise<AdminCounts> {
  await connectDB()
  const [suggestionsPending, contactsTotal, placesTotal] = await Promise.all([
    Suggestion.countDocuments({ status: "pending" }),
    Contact.countDocuments(),
    Place.countDocuments(),
  ])
  return { suggestionsPending, contactsTotal, placesTotal }
}
