import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { getProvincePageData } from "@/lib/seo/province-pages"
import { getProvinceTitle, getProvinceDescription } from "@/lib/seo/templates"
import { decideProvincePageIndexing } from "@/lib/seo/indexing-rules"
import { ProvincePageContent } from "@/components/seo/ProvincePageContent"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const { PROVINCES } = await import("@/lib/seo/provinces")
  return PROVINCES.map((p) => ({ provinceSlug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ provinceSlug: string }>
}): Promise<Metadata> {
  const { provinceSlug } = await params
  const province = getProvinceBySlug(provinceSlug)
  if (!province) return { title: "No encontrado" }

  const data = await getProvincePageData(provinceSlug)
  const decision = decideProvincePageIndexing(data.total, data.localities.length)
  const canonical = `${BASE_URL}/sin-gluten/provincia/${provinceSlug}`

  if (decision === "not_found") {
    return { title: "No encontrado", robots: { index: false, follow: true } }
  }

  return {
    title: getProvinceTitle(province),
    description: getProvinceDescription(province, { total: data.total, dedicatedGf: data.dedicatedGfCount, localities: data.localities.length }),
    ...(decision === "noindex" ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical },
    openGraph: {
      title: getProvinceTitle(province),
      description: getProvinceDescription(province, { total: data.total, dedicatedGf: data.dedicatedGfCount, localities: data.localities.length }),
      url: canonical,
      type: "website",
    },
    keywords: [
      `sin gluten ${province.name}`,
      `restaurantes sin TACC ${province.name}`,
      `lugares sin gluten ${province.name}`,
      `dónde comer sin gluten ${province.name}`,
      `celíacos ${province.name}`,
    ],
  }
}

export default async function ProvincePage({
  params,
}: {
  params: Promise<{ provinceSlug: string }>
}) {
  const { provinceSlug } = await params
  const province = getProvinceBySlug(provinceSlug)
  if (!province) notFound()

  const data = await getProvincePageData(provinceSlug)
  const decision = decideProvincePageIndexing(data.total, data.localities.length)
  if (decision === "not_found") notFound()

  return <ProvincePageContent data={data} />
}