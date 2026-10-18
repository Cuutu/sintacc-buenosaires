import type { Metadata } from "next"
import { CATEGORIES } from "@/lib/seo/cities"
import { NationalCategoryLanding, nationalCategoryMetadata } from "./national-category-landing"

// Se llega por /{categoria}-sin-gluten (rewrite del middleware). Estática con
// ISR: página 1. ?page= va a ./filtrado (también desde el middleware).
export const dynamicParams = true
export const revalidate = 3600

// Sin generateStaticParams, Next la renderiza en cada request aunque tenga revalidate.
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }))
}

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  return nationalCategoryMetadata(category, 1)
}

export default async function CategoryGlobalPage({ params }: Props) {
  const { category } = await params
  return <NationalCategoryLanding category={category} page={1} />
}
