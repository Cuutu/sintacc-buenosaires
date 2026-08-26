/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const src = fs.readFileSync(
  path.join(__dirname, "../../components/native/NativeAppBridge.tsx"),
  "utf8"
)

describe("NativeAppBridge wiring", () => {
  it("getLaunchUrl y appUrlOpen usan el mismo handleLaunchUrl", () => {
    expect(src).toContain("createLaunchUrlHandler")
    expect(src).toContain("handleLaunchUrl")
    expect(src).toContain("getLaunchUrl")
    expect(src).toContain("appUrlOpen")
    expect(src.match(/handleLaunchUrl\(/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it("backButton usa executeAndroidBack (un evento, una acción)", () => {
    expect(src).toContain('backButton')
    expect(src).toContain("executeAndroidBack")
    expect(src).toContain("minimize")
  })

  it("no usa seenCodesRef como única guarda", () => {
    expect(src).not.toContain("seenCodesRef")
  })
})
