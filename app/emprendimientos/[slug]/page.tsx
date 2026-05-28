import { notFound, permanentRedirect } from "next/navigation"
import mongoose from "mongoose"
import type { Metadata } from "next"
import { VentureProfileContent } from "@/components/ventures/VentureProfileContent"
import { VentureLandingPage } from "@/components/ventures/VentureLandingPage"
import { VentureReviewsSection } from "@/components/ventures/VentureReviewsSection"
import { VentureJsonLd } from "@/components/seo/VentureJsonLd"
import { VentureBreadcrumbJsonLd } from "@/components/seo/VentureBreadcrumbJsonLd"
import {
  getCategoryLandingBySlug,
  getZoneLandingBySlug,
  buildVentureMetadata,
  buildCategoryLandingMetadata,
  buildZoneLandingMetadata,
} from "@/lib/venture-seo"
import {
  getVentureBySlug,
  getVentureById,
  getApprovedVentures,
  countApprovedVentures,
  getRelatedVentures,
} from "@/lib/ventures-server"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const categoryLanding = getCategoryLandingBySlug(slug)
  if (categoryLanding) {
    const count = await countApprovedVentures({ category: categoryLanding.categoryId })
    return buildCategoryLandingMetadata(categoryLanding, count > 0)
  }

  const zoneLanding = getZoneLandingBySlug(slug)
  if (zoneLanding) {
    const count = await countApprovedVentures({ zoneConfig: zoneLanding })
    return buildZoneLandingMetadata(zoneLanding, count > 0)
  }

  if (mongoose.Types.ObjectId.isValid(slug)) {
    const venture = await getVentureById(slug)
    if (!venture) return { title: "Emprendimiento no encontrado | Celimap", robots: { index: false } }
    return buildVentureMetadata({
      name: venture.name,
      category: venture.category,
      zone: venture.zone,
      modalities: venture.modalities ?? [],
      slug: venture.slug,
      description: venture.description,
      photo: venture.photos?.[0],
    })
  }

  const venture = await getVentureBySlug(slug)
  if (!venture) return { title: "Emprendimiento no encontrado | Celimap", robots: { index: false } }

  return buildVentureMetadata({
    name: venture.name,
    category: venture.category,
    zone: venture.zone,
    modalities: venture.modalities ?? [],
    slug: venture.slug,
    description: venture.description,
    photo: venture.photos?.[0],
  })
}

export default async function VentureSlugPage({ params }: Props) {
  const { slug } = await params

  const categoryLanding = getCategoryLandingBySlug(slug)
  if (categoryLanding) {
    const ventures = await getApprovedVentures({
      category: categoryLanding.categoryId,
      limit: 50,
    })
    return (
      <VentureLandingPage
        h1={categoryLanding.h1}
        intro={categoryLanding.intro}
        ventures={ventures}
        breadcrumbLabel={categoryLanding.h1}
      />
    )
  }

  const zoneLanding = getZoneLandingBySlug(slug)
  if (zoneLanding) {
    const ventures = await getApprovedVentures({ zoneConfig: zoneLanding, limit: 50 })
    return (
      <VentureLandingPage
        h1={zoneLanding.h1}
        intro={zoneLanding.intro}
        ventures={ventures}
        breadcrumbLabel={zoneLanding.label}
      />
    )
  }

  if (mongoose.Types.ObjectId.isValid(slug)) {
    const venture = await getVentureById(slug)
    if (!venture) notFound()
    permanentRedirect(`/emprendimientos/${venture.slug}`)
  }

  const venture = await getVentureBySlug(slug)
  if (!venture) notFound()

  const related = await getRelatedVentures(venture)

  return (
    <>
      <VentureJsonLd venture={venture} />
      <VentureBreadcrumbJsonLd ventureName={venture.name} ventureSlug={venture.slug} />
      <VentureProfileContent venture={venture} related={related} />
      <div className="container mx-auto px-4 max-w-2xl pb-12 -mt-4">
        <VentureReviewsSection ventureId={venture._id} initialStats={venture.stats} />
      </div>
    </>
  )
}
