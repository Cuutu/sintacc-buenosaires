import mongoose from "mongoose"
import { generateUniqueVentureSlug } from "@/lib/venture-slug"

export async function withGeneratedVentureSlug<T extends { name: string; zone: string }>(
  data: T,
  excludeId?: mongoose.Types.ObjectId
): Promise<T & { slug: string }> {
  const slug = await generateUniqueVentureSlug(data.name, data.zone, excludeId)
  return { ...data, slug }
}
