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

  it("lista stagger, chips press, corazón pop, count-up", () => {
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
    expect(list).toContain("map-list-crossfade")
    expect(chips).toContain("active:scale-[0.97]")
    expect(chips).toContain("duration-[180ms]")
    expect(chips).toContain("map-query-chip")
    expect(heart).toContain("fav-heart-pop")
    expect(mobile).toContain("VerLugaresCount")
    expect(mobile).toContain("CountUp")
    expect(css).toContain("map-card-in")
    expect(css).toContain("fav-heart-pop")
    expect(css).toContain("--motion-fast: 180ms")
    expect(css).toContain("scale(1.15)")
  })

  it("reduceMotion en animateEase salta al valor final", () => {
    const { animateEase } = require("@/components/map-view/motion") as typeof import("@/components/map-view/motion")
    const updates: number[] = []
    animateEase({
      from: 0,
      to: 10,
      duration: 240,
      reduceMotion: true,
      onUpdate: (value: number) => updates.push(value),
    })
    expect(updates).toEqual([10])
  })
})
