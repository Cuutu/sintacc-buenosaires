import { animateSpring } from "@/components/map-view/motion"
import fs from "fs"
import path from "path"

describe("map motion", () => {
  it("reduceMotion aplica el valor final en 0ms", () => {
    const updates: number[] = []
    let completed = false
    const stop = animateSpring({
      from: 0,
      to: 120,
      velocity: 400,
      reduceMotion: true,
      onUpdate: (value) => updates.push(value),
      onComplete: () => {
        completed = true
      },
    })
    expect(updates).toEqual([120])
    expect(completed).toBe(true)
    stop()
  })

  it("sheet lista usa spring, no height lineal", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/BottomSheet.tsx"),
      "utf8"
    )
    expect(src).toContain("animateSpring")
    expect(src).toContain("FLICK_VELOCITY")
    expect(src).not.toContain("transition-[height]")
    expect(src).not.toContain("duration-300 ease-out")
  })

  it("lista stagger, chips 0.96, corazón pop, count crossfade", () => {
    const list = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/PlacesList.tsx"),
      "utf8"
    )
    const chips = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapTopBar.tsx"),
      "utf8"
    )
    const heart = fs.readFileSync(
      path.join(process.cwd(), "components/favorite-button.tsx"),
      "utf8"
    )
    const mobile = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapMobile.tsx"),
      "utf8"
    )
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8")
    expect(list).toContain("map-card-enter")
    expect(list).toContain("index * 30")
    expect(list).toContain("index < 8")
    expect(chips).toContain("active:scale-[0.96]")
    expect(chips).toContain("duration-[120ms]")
    expect(heart).toContain("fav-heart-pop")
    expect(mobile).toContain("VerLugaresCount")
    expect(css).toContain("map-card-in")
    expect(css).toContain("fav-heart-pop")
  })
})
