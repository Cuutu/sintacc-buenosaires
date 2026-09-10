/**
 * @jest-environment node
 */
import { toPublicPlaceListItem } from "@/lib/places-public-select"
import { toPublicVentureListItem } from "@/lib/ventures-public-select"
import { getPublicReadRateLimitConfig } from "@/lib/public-read-limit"

describe("toPublicPlaceListItem", () => {
  it("keeps cover photo and rating, drops contact and long clone fields", () => {
    const item = toPublicPlaceListItem(
      {
        _id: "1",
        name: "Panadería",
        type: "bakery",
        photos: ["https://img/a.jpg", "https://img/b.jpg"],
        openingHours: "10-18",
        googleSnapshot: {
          rating: 4.2,
          userRatingCount: 9,
        },
      },
      { avgRating: 4, totalReviews: 2, contaminationReportsCount: 0 }
    )

    expect(item.photos).toEqual(["https://img/a.jpg"])
    expect(item.openingHours).toBe("10-18")
    expect(item.googleSnapshot).toEqual({ rating: 4.2, userRatingCount: 9 })
    expect(item.stats.totalReviews).toBe(2)
    expect(item).not.toHaveProperty("contact")
    expect(item).not.toHaveProperty("description")
  })
})

describe("toPublicVentureListItem", () => {
  it("drops whatsapp/description from list payload", () => {
    const item = toPublicVentureListItem(
      {
        _id: "v1",
        name: "Viandas",
        slug: "viandas",
        photos: ["https://img/v.jpg", "https://img/v2.jpg"],
      },
      { avgRating: 0, totalReviews: 0 }
    )

    expect(item.photos).toEqual(["https://img/v.jpg"])
    expect(item).not.toHaveProperty("contact")
    expect(item).not.toHaveProperty("description")
  })
})

describe("getPublicReadRateLimitConfig", () => {
  const prevList = process.env.PUBLIC_READ_RATE_LIMIT_LIST
  const prevDetail = process.env.PUBLIC_READ_RATE_LIMIT_DETAIL
  const prevWindow = process.env.PUBLIC_READ_RATE_WINDOW_MINUTES

  afterEach(() => {
    if (prevList === undefined) delete process.env.PUBLIC_READ_RATE_LIMIT_LIST
    else process.env.PUBLIC_READ_RATE_LIMIT_LIST = prevList
    if (prevDetail === undefined) delete process.env.PUBLIC_READ_RATE_LIMIT_DETAIL
    else process.env.PUBLIC_READ_RATE_LIMIT_DETAIL = prevDetail
    if (prevWindow === undefined) delete process.env.PUBLIC_READ_RATE_WINDOW_MINUTES
    else process.env.PUBLIC_READ_RATE_WINDOW_MINUTES = prevWindow
  })

  it("defaults to ~90 list and 60 detail per 1 minute window", () => {
    delete process.env.PUBLIC_READ_RATE_LIMIT_LIST
    delete process.env.PUBLIC_READ_RATE_LIMIT_DETAIL
    delete process.env.PUBLIC_READ_RATE_WINDOW_MINUTES
    expect(getPublicReadRateLimitConfig("list")).toEqual({
      type: "public_catalog_list",
      maxCount: 90,
      windowMinutes: 1,
    })
    expect(getPublicReadRateLimitConfig("detail")).toEqual({
      type: "public_catalog_detail",
      maxCount: 60,
      windowMinutes: 1,
    })
  })

  it("reads tunables from env", () => {
    process.env.PUBLIC_READ_RATE_LIMIT_LIST = "120"
    process.env.PUBLIC_READ_RATE_LIMIT_DETAIL = "40"
    process.env.PUBLIC_READ_RATE_WINDOW_MINUTES = "2"
    expect(getPublicReadRateLimitConfig("list").maxCount).toBe(120)
    expect(getPublicReadRateLimitConfig("detail").maxCount).toBe(40)
    expect(getPublicReadRateLimitConfig("list").windowMinutes).toBe(2)
  })
})
