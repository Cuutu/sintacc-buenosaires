import ListasPageContent from "./ListasPageContent"
import { getPublicCommunityLists } from "@/lib/lists/get-public-community-lists"

export const revalidate = 3600

export default async function ListasPage() {
  const initialLists = await getPublicCommunityLists()

  return <ListasPageContent initialLists={initialLists} />
}
