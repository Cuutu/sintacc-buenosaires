"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { fetchApi } from "@/lib/fetchApi"
import { toast } from "sonner"
import { PlaceCommunityReviews } from "./PlaceCommunityReviews"
import type { IReview } from "@/models/Review"

type ReviewItem = IReview & {
  userId?: { name?: string; image?: string }
  pinned?: boolean
  evidencePhotos?: string[]
  adminReply?: string
  adminReplyAt?: string | Date
  adminReplyBy?: string
}

const INITIAL_REVIEWS = 4

export function PlaceCommunityReviewsClient({
  placeId,
  totalReviews,
  avgRating,
}: {
  placeId: string
  totalReviews: number
  avgRating: number
}) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewsPagination, setReviewsPagination] = useState<{
    page: number
    pages: number
    total: number
  } | null>(null)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  const fetchReviews = async (page = 1, append = false) => {
    try {
      if (append) setLoadingMoreReviews(true)
      const data = await fetchApi<{
        reviews: ReviewItem[]
        pagination: { page: number; pages: number; total: number }
      }>(`/api/reviews?placeId=${placeId}&page=${page}&limit=20`)
      const newReviews = data.reviews || []
      setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews))
      setReviewsPagination(
        data.pagination
          ? { page: data.pagination.page, pages: data.pagination.pages, total: data.pagination.total }
          : null
      )
    } catch (error: unknown) {
      if (!append) {
        const message = error instanceof Error ? error.message : "Error al cargar reseñas"
        toast.error(message)
      }
    } finally {
      if (append) setLoadingMoreReviews(false)
    }
  }

  useEffect(() => {
    void fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial por placeId
  }, [placeId])

  const sortedReviews = [...reviews].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const hasMoreReviews = reviewsExpanded
    ? !!(reviewsPagination && reviewsPagination.page < reviewsPagination.pages)
    : sortedReviews.length > INITIAL_REVIEWS

  const displayedReviews = reviewsExpanded
    ? sortedReviews
    : sortedReviews.slice(0, INITIAL_REVIEWS)

  return (
    <PlaceCommunityReviews
      reviews={reviews}
      displayedReviews={displayedReviews}
      totalReviews={totalReviews}
      avgRating={avgRating}
      showReviewForm={showReviewForm}
      onShowReviewForm={setShowReviewForm}
      onReviewSuccess={() => fetchReviews()}
      placeId={placeId}
      isAdmin={session?.user?.role === "admin"}
      hasMoreReviews={hasMoreReviews}
      reviewsExpanded={reviewsExpanded}
      onExpandReviews={() => setReviewsExpanded(true)}
      onLoadMore={() => fetchReviews((reviewsPagination?.page ?? 1) + 1, true)}
      loadingMore={loadingMoreReviews}
    />
  )
}
