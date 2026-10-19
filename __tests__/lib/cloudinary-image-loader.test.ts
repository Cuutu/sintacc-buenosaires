import { cloudinaryImageLoader, getPlaceImageUrl, isCloudinaryImageUrl } from "@/lib/place-image"

const RAW = "https://res.cloudinary.com/celimap/image/upload/v1712345678/places/abc123.jpg"
const FOLDER_WITH_UNDERSCORE = "https://res.cloudinary.com/celimap/image/upload/v1/mis_fotos/abc.jpg"

describe("cloudinaryImageLoader", () => {
  it("a una foto original le agrega el ancho pedido y el formato automático", () => {
    expect(cloudinaryImageLoader({ src: RAW, width: 640 })).toBe(
      "https://res.cloudinary.com/celimap/image/upload/c_limit,w_640,f_auto,q_auto/v1712345678/places/abc123.jpg"
    )
  })

  it("si ya tiene el recorte de un rol, encadena un paso que solo achica", () => {
    const popup = getPlaceImageUrl(RAW, "popup")!
    expect(cloudinaryImageLoader({ src: popup, width: 384, quality: 70 })).toBe(
      "https://res.cloudinary.com/celimap/image/upload/c_fill,g_auto,w_640,h_360,f_auto,q_auto/c_limit,w_384,f_auto,q_70/v1712345678/places/abc123.jpg"
    )
  })

  it("una carpeta con guion bajo no se confunde con una transformación", () => {
    expect(cloudinaryImageLoader({ src: FOLDER_WITH_UNDERSCORE, width: 96 })).toBe(
      "https://res.cloudinary.com/celimap/image/upload/c_limit,w_96,f_auto,q_auto/v1/mis_fotos/abc.jpg"
    )
  })

  it("solo toma URLs de imágenes de Cloudinary", () => {
    expect(isCloudinaryImageUrl(RAW)).toBe(true)
    expect(isCloudinaryImageUrl("https://lh3.googleusercontent.com/p/abc=w800")).toBe(false)
    expect(isCloudinaryImageUrl("https://res.cloudinary.com/celimap/video/upload/v1/x.mp4")).toBe(false)
    expect(isCloudinaryImageUrl("/brand/mark.webp")).toBe(false)
  })
})
