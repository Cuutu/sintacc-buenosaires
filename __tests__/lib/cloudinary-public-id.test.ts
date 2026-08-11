/**
 * @jest-environment node
 */
import { parseCloudinaryPublicIdFromUrl } from "@/lib/cloudinary/public-id-from-url"

const CLOUD = "demo-cloud"

describe("parseCloudinaryPublicIdFromUrl", () => {
  it("formato upload con versión (anonimizado CeliMap)", () => {
    const r = parseCloudinaryPublicIdFromUrl(
      `https://res.cloudinary.com/${CLOUD}/image/upload/v1712345678/celimap/abcDEF123.jpg`,
      CLOUD
    )
    expect(r).toEqual({
      ok: true,
      publicId: "celimap/abcDEF123",
      cloudName: CLOUD,
      folder: "celimap",
    })
  })

  it("con transformación c_fill", () => {
    const r = parseCloudinaryPublicIdFromUrl(
      `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w_800,h_600/v10/lists/cover_xyz.webp`,
      CLOUD
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.publicId).toBe("lists/cover_xyz")
  })

  it("sin versión", () => {
    const r = parseCloudinaryPublicIdFromUrl(
      `https://res.cloudinary.com/${CLOUD}/image/upload/ventures/photo_1.png`,
      CLOUD
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.publicId).toBe("ventures/photo_1")
  })

  it("rechaza cloud/host/folder/traversal incorrectos", () => {
    expect(
      parseCloudinaryPublicIdFromUrl(
        `https://res.cloudinary.com/other/image/upload/celimap/x.jpg`,
        CLOUD
      ).ok
    ).toBe(false)
    expect(
      parseCloudinaryPublicIdFromUrl(
        `https://evil.com/${CLOUD}/image/upload/celimap/x.jpg`,
        CLOUD
      ).ok
    ).toBe(false)
    expect(
      parseCloudinaryPublicIdFromUrl(
        `https://res.cloudinary.com/${CLOUD}/image/upload/unknown/x.jpg`,
        CLOUD
      ).ok
    ).toBe(false)
    expect(
      parseCloudinaryPublicIdFromUrl(
        `https://res.cloudinary.com/${CLOUD}/image/upload/celimap/../secret.jpg`,
        CLOUD
      ).ok
    ).toBe(false)
  })

  it("URL encoding en path", () => {
    const r = parseCloudinaryPublicIdFromUrl(
      `https://res.cloudinary.com/${CLOUD}/image/upload/v1/celimap/my%20file.jpg`,
      CLOUD
    )
    // %20 not in allowlist chars → reject rather than guess
    expect(r.ok).toBe(false)
  })
})
