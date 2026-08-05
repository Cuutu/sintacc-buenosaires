import { getProvincePageData } from "@/lib/seo/province-pages"
import { ProvincePageContent } from "@/components/seo/ProvincePageContent"

/**
 * @deprecated Página provincial temporal. La lógica se trasladó a
 * /sin-gluten/provincia/[provinceSlug]. Este archivo se eliminará al final.
 */
export async function ProvincialPage({ provinceSlug }: { provinceSlug: string }) {
  const data = await getProvincePageData(provinceSlug)
  return <ProvincePageContent data={data} />
}