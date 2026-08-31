/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("native in-app review wiring", () => {
  it("AppDelegate records session on didBecomeActive, no SceneDelegate", () => {
    const app = read("ios/App/App/AppDelegate.swift")
    const plist = read("ios/App/App/Info.plist")
    expect(app).toContain("ReviewManager.shared.recordSession()")
    expect(app).toContain("applicationDidBecomeActive")
    expect(plist).not.toContain("UIApplicationSceneManifest")
    expect(fs.existsSync(path.join(root, "ios/App/App/SceneDelegate.swift"))).toBe(false)
  })

  it("ReviewManager usa foregroundActive, no connectedScenes.first", () => {
    const src = read("ios/App/App/ReviewManager.swift")
    expect(src).toContain("foregroundActive")
    expect(src).not.toContain("connectedScenes.first")
    expect(src).toContain("AppStore.requestReview")
    expect(src).toContain("SKStoreReviewController.requestReview")
    expect(src).toContain("[Review]")
  })

  it("debug plugin methods only under DEBUG", () => {
    const src = read("ios/App/App/ReviewPlugin.swift")
    expect(src).toMatch(/#if DEBUG[\s\S]*debugStatus[\s\S]*debugReset[\s\S]*debugForce[\s\S]*#endif/)
    expect(src).toContain("jsName = \"Review\"")
  })

  it("Swift files in pbxproj Sources; PrivacyInfo in Resources", () => {
    const pbx = read("ios/App/App.xcodeproj/project.pbxproj")
    expect(pbx).toContain("ReviewManager.swift in Sources")
    expect(pbx).toContain("ReviewPlugin.swift in Sources")
    expect(pbx).toContain("PrivacyInfo.xcprivacy in Resources")
  })

  it("favoritos usan persist compartido; ficha no dispara en cada botón", () => {
    expect(read("components/lugar/PlaceSaveButton.tsx")).toContain("persistFavoriteToggle")
    expect(read("components/favorite-button.tsx")).toContain("persistFavoriteToggle")
    expect(read("lib/favorites-persist.ts")).toContain('considerInAppReview("favorite")')
    expect(read("components/review-form.tsx")).toContain('considerInAppReview("review")')
  })

  it("NativeAppBridge expone CeliMapReview debug", () => {
    expect(read("components/native/NativeAppBridge.tsx")).toContain("attachReviewDebugToWindow")
  })
})
