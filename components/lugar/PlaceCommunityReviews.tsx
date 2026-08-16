"use client"

import { Star } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ReviewForm } from "@/components/review-form"
import { ReviewAdminReply } from "@/components/review-admin-reply"
import { ReviewAdminReplyForm } from "@/components/review-admin-reply-form"
import { placeCardClass } from "./place-detail-ui"
import type { IReview } from "@/models/Review"

type ReviewItem = IReview & {
  userId?: { name?: string; image?: string }
  pinned?: boolean
  evidencePhotos?: string[]
  adminReply?: string
  adminReplyAt?: string | Date
  adminReplyBy?: string
}

interface PlaceCommunityReviewsProps {
  reviews: ReviewItem[]
  displayedReviews: ReviewItem[]
  totalReviews: number
  avgRating: number
  showReviewForm: boolean
  onShowReviewForm: (show: boolean) => void
  onReviewSuccess: () => void
  placeId: string
  isAdmin: boolean
  hasMoreReviews: boolean
  reviewsExpanded: boolean
  onExpandReviews: () => void
  onLoadMore: () => void
  loadingMore: boolean
}

export function PlaceCommunityReviews({
  reviews,
  displayedReviews,
  totalReviews,
  avgRating,
  showReviewForm,
  onShowReviewForm,
  onReviewSuccess,
  placeId,
  isAdmin,
  hasMoreReviews,
  reviewsExpanded,
  onExpandReviews,
  onLoadMore,
  loadingMore,
}: PlaceCommunityReviewsProps) {
  return (
    <section id="reviews-section" aria-labelledby="reviews-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="reviews-heading" className="text-lg font-semibold text-[#1F4D35]">
          Reseñas de la comunidad
        </h2>
        {!showReviewForm && reviews.length > 0 && (
          <button
            type="button"
            onClick={() => onShowReviewForm(true)}
            className="h-11 shrink-0 rounded-2xl border-2 border-[#1F4D35]/30 px-4 text-base font-semibold text-[#1F4D35] hover:bg-[#1F4D35]/5"
          >
            Escribir reseña
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="mb-6">
          <Button variant="ghost" className="mb-3 text-base" onClick={() => onShowReviewForm(false)}>
            ← Volver
          </Button>
          <ReviewForm
            placeId={placeId}
            onSuccess={() => {
              onReviewSuccess()
              onShowReviewForm(false)
            }}
          />
        </div>
      )}

      {!showReviewForm && reviews.length === 0 && (
        <div className={`${placeCardClass} px-5 py-10 text-center`}>
          <Image
            src="/CelimapLOGO.png"
            alt=""
            width={56}
            height={72}
            className="mx-auto mb-4 h-16 w-auto object-contain"
          />
          <p className="text-base text-[#5F6B63]">Todavía no hay reseñas de la comunidad.</p>
          <button
            type="button"
            onClick={() => onShowReviewForm(true)}
            className="mt-4 inline-flex h-[52px] items-center justify-center rounded-2xl bg-[#C85A2E] px-6 text-base font-bold text-[#F8F5EF]"
          >
            Sé el primero en opinar
          </button>
        </div>
      )}

      {!showReviewForm && totalReviews > 0 && (
        <p className="mb-4 text-base text-[#5F6B63]">
          <Star className="mr-1 inline h-4 w-4 fill-amber-400 text-amber-400" />
          {avgRating.toFixed(1)} · {totalReviews} {totalReviews === 1 ? "reseña" : "reseñas"}
        </p>
      )}

      {!showReviewForm &&
        displayedReviews.map((review) => (
          <article
            key={review._id.toString()}
            className={`${placeCardClass} mb-3 p-5`}
          >
            <div className="mb-3 flex items-start gap-3">
              {review.userId?.image ? (
                <img
                  src={review.userId.image}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1F4D35]/10 text-base font-bold text-[#1F4D35]">
                  {(review.userId?.name || "U")[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-base font-semibold text-[#1F4D35]">
                    {review.userId?.name || "Usuario"}
                  </p>
                  <div className="flex shrink-0 gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-[#E8E1D6]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-0.5 text-base text-[#5F6B63]">
                  {new Date(review.createdAt).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <p className="text-base leading-relaxed text-[#1F4D35]">{review.comment}</p>
            {review.evidencePhotos && review.evidencePhotos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {review.evidencePhotos.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block h-14 w-14 overflow-hidden rounded-xl border border-[#E8E1D6]"
                  >
                    <Image src={url} alt="Foto de la reseña" width={56} height={56} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            {(review.safeFeeling || review.separateKitchen === "yes") && (
              <div className="mt-3 flex flex-wrap gap-2">
                {review.safeFeeling && (
                  <span className="rounded-full bg-[#1F4D35]/8 px-3 py-1 text-base text-[#1F4D35]">
                    Me sentí seguro/a
                  </span>
                )}
                {review.separateKitchen === "yes" && (
                  <span className="rounded-full bg-[#1F4D35]/8 px-3 py-1 text-base text-[#5F6B63]">
                    Cocina separada
                  </span>
                )}
              </div>
            )}
            {review.adminReply && (
              <ReviewAdminReply
                reply={review.adminReply}
                repliedAt={review.adminReplyAt}
                repliedBy={review.adminReplyBy}
              />
            )}
            {isAdmin && (
              <ReviewAdminReplyForm
                reviewId={review._id.toString()}
                existingReply={review.adminReply}
                onSuccess={onReviewSuccess}
              />
            )}
          </article>
        ))}

      {!showReviewForm && hasMoreReviews && !reviewsExpanded && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onExpandReviews}
            className="h-11 rounded-2xl border-2 border-[#1F4D35]/30 px-4 text-base font-semibold text-[#1F4D35]"
          >
            Ver más reseñas
          </button>
        </div>
      )}
      {!showReviewForm && reviewsExpanded && hasMoreReviews && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="h-11 rounded-2xl border-2 border-[#1F4D35]/30 px-4 text-base font-semibold text-[#1F4D35] disabled:opacity-50"
          >
            {loadingMore ? "Cargando..." : "Ver más reseñas"}
          </button>
        </div>
      )}
    </section>
  )
}
