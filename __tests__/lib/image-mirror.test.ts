import { readFileSync } from "fs"
import path from "path"
import {
  IMAGE_MIRROR_HOST,
  isSafeMirrorFilePath,
  mirrorFilePathFor,
  parseMirrorUrl,
  toCloudinaryUrl,
  toMirrorUrl,
} from "@/lib/image-mirror"

const CLOUD = "celimapcloud"
const ORIGINAL = `https://res.cloudinary.com/${CLOUD}/image/upload/v1712345678/places/abc123xyz.jpg`
const MIRROR = "https://img.celimap.com.ar/v1712345678/places/abc123xyz.jpg"

describe("image-mirror", () => {
  it("convierte un original de nuestra cuenta y vuelve exactamente igual", () => {
    expect(toMirrorUrl(ORIGINAL, CLOUD)).toBe(MIRROR)
    expect(toCloudinaryUrl(MIRROR, CLOUD)).toBe(ORIGINAL)
    expect(parseMirrorUrl(MIRROR)).toEqual({ version: "v1712345678/", filePath: "places/abc123xyz.jpg" })
  })

  it("acepta originales sin versión", () => {
    const url = `https://res.cloudinary.com/${CLOUD}/image/upload/wallet/logo-v1.png`
    expect(toMirrorUrl(url, CLOUD)).toBe("https://img.celimap.com.ar/wallet/logo-v1.png")
    expect(toCloudinaryUrl("https://img.celimap.com.ar/wallet/logo-v1.png", CLOUD)).toBe(url)
  })

  it("no toca URLs con transformaciones, de otra cuenta o de otro host", () => {
    expect(
      toMirrorUrl(`https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w_100/v1/places/a.jpg`, CLOUD)
    ).toBeNull()
    expect(toMirrorUrl("https://res.cloudinary.com/otra/image/upload/v1/places/a.jpg", CLOUD)).toBeNull()
    expect(toMirrorUrl("https://lh3.googleusercontent.com/p/abc", CLOUD)).toBeNull()
    expect(toMirrorUrl(`${ORIGINAL}?x=1`, CLOUD)).toBeNull()
    expect(toMirrorUrl(ORIGINAL, "")).toBeNull()
  })

  it("rechaza rutas peligrosas para la carpeta espejo", () => {
    expect(isSafeMirrorFilePath("places/abc.jpg")).toBe(true)
    expect(isSafeMirrorFilePath("../etc/passwd.txt")).toBe(false)
    expect(isSafeMirrorFilePath("/abs/a.jpg")).toBe(false)
    expect(isSafeMirrorFilePath("places//a.jpg")).toBe(false)
    expect(isSafeMirrorFilePath("places/a b.jpg")).toBe(false)
    expect(isSafeMirrorFilePath("places/sin-extension")).toBe(false)
    expect(mirrorFilePathFor("places/abc", "jpg")).toBe("places/abc.jpg")
    expect(mirrorFilePathFor("../x", "jpg")).toBeNull()
  })

  it("el host espejo está permitido en next.config (imágenes y CSP)", () => {
    const config = readFileSync(path.join(__dirname, "../../next.config.js"), "utf8")
    expect(config).toContain(`hostname: "${IMAGE_MIRROR_HOST}"`)
    expect(config).toMatch(new RegExp(`img-src[^"]*https://${IMAGE_MIRROR_HOST.replace(/\./g, "\\.")}`))
  })
})
