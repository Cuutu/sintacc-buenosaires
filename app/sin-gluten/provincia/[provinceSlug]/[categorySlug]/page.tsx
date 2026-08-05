import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { getProvinceCategoryPageData } from "@/lib/seo/province-pages"
import { getProvinceCategoryTitle, getProvinceCategoryDescription } from "@/lib/seo/templates"
import { decideProvinceCategoryIndexing } from "@/lib/seo/indexing-rules"
import { isValidCategorySlug, CATEGORIES } from "@/lib/seo/cities"
import { ProvinceCategoryPageContent } from "@/components/seo/ProvinceCategoryPageContent"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const { PROVINCES } = await import("@/lib/seo/provinces")
  const params: { provinceSlug: string; categorySlug: string }[] = []
  for (const p of PROVINCES) {
    for (const cat of CATEGORIES) {
      params.push({ provinceSlug: p.slug, categorySlug: cat.slug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provinceSlug: string; categorySlug: string }>
}): Promise<Metadata> {
  const { provinceSlug, categorySlug } = await params
  const province = getProvinceBySlug(provinceSlug)
  if (!province || !isValidCategorySlug(categorySlug)) return { title: "No encontrado" }

  const data = await getProvinceCategoryPageData(provinceSlug, categorySlug)
  const decision = decideProvinceCategoryIndexing(data.total)
  const canonical = `${BASE_URL}/sin-gluten/provincia/${provinceSlug}/${categorySlug}`

  if (decision === "not_found") {
    return { title: "No encontrado", robots: { index: false, follow: true } }
  }

  return {
    title: getProvinceCategoryTitle(province, categorySlug),
    description: getProvinceCategoryDescription(province, categorySlug, data.total),
    ...(decision === "noindex" ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical },
    openGraph: {
      title: getProvinceCategoryTitle(province, categorySlug),
      description: getProvinceCategoryDescription(province, categorySlug, data.total),
      url: canonical,
      type: "website",
    },
  }
}

export default async function ProvinceCategoryPage({
  params,
}: {
  params: Promise<{ provinceSlug: string; categorySlug: string }>
}) {
  const { provinceSlug, categorySlug } = await params
  const province = getProvinceBySlug(provinceSlug)
  if (!province || !isValidCategorySlug(categorySlug)) notFound()

  const data = await getProvinceCategoryPageData(provinceSlug, categorySlug)
  const decision = decideProvinceCategoryIndexing(data.total)
  if (decision === "not_found") notFound()

  return <ProvinceCategoryPageContent data={data} />
}