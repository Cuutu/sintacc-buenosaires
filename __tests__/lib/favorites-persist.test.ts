import { persistFavoriteToggle } from "@/lib/favorites-persist"
import { considerInAppReview } from "@/lib/native-review"
import { trackEvent } from "@/lib/analytics"

jest.mock("@/lib/native-review", () => ({
  considerInAppReview: jest.fn(),
}))

jest.mock("@/lib/analytics", () => ({
  trackEvent: jest.fn(),
}))

const consider = considerInAppReview as jest.Mock
const track = trackEvent as jest.Mock

describe("persistFavoriteToggle review trigger", () => {
  beforeEach(() => {
    consider.mockClear()
    track.mockClear()
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as typeof fetch
  })

  it("primer favorito NO dispara, segundo SÍ, unfavorite nunca", async () => {
    const ids = new Set<string>()
    const add = (id: string) => {
      ids.add(id)
    }
    const remove = (id: string) => {
      ids.delete(id)
    }

    await persistFavoriteToggle("p1", false, ids, { add, remove })
    expect(consider).not.toHaveBeenCalled()
    expect(track).toHaveBeenCalledWith("favorite_add", { placeId: "p1" })

    await persistFavoriteToggle("p2", false, ids, { add, remove })
    expect(consider).toHaveBeenCalledTimes(1)
    expect(consider).toHaveBeenCalledWith("favorite")

    consider.mockClear()
    await persistFavoriteToggle("p2", true, ids, { add, remove })
    expect(consider).not.toHaveBeenCalled()
    expect(track).toHaveBeenCalledWith("favorite_remove", { placeId: "p2" })
  })
})
