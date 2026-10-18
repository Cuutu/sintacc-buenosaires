import type { Metadata } from "next"
import { parsePageParam } from "@/lib/seo/landing-variants"
import { NationalCategoryLanding, nationalCategoryMetadata } from "../national-category-landing"

// /{categoria}-sin-gluten?page=N llega acá desde el middleware. Dinámica a propósito.
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params
  return nationalCategoryMetadata(category, parsePageParam((await searchParams).page), true)
}

export default async function CategoryGlobalVariantePage({ params, searchParams }: Props) {
  const { category } = await params
  return <NationalCategoryLanding category={category} page={parsePageParam((await searchParams).page)} />
}
