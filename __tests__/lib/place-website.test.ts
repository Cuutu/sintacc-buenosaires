/**
 * @jest-environment node
 */
import {
  getMapsLink,
  getPublicWebsite,
  isMapsLink,
  shouldUseGoogleWebsite,
} from "@/lib/place-website"
import { MAPS_LINK_URL_PATTERN } from "@/lib/place-missing-query"

describe("sitio web vs. link de Google Maps", () => {
  it.each([
    "https://maps.app.goo.gl/vJxnEB3Ecd7jnU",
    "maps.app.goo.gl/vJxnEB3Ecd7jnU",
    "https://goo.gl/maps/abc123",
    "https://www.google.com/maps/place/Granero+66/@-37.3,-59.1,17z",
    "https://maps.google.com/?cid=123456",
    "https://www.google.com.ar/maps/search/?api=1&query=x",
    "https://g.page/granero66",
    "https://share.google/AbCdEf",
  ])("%s es un link de Maps", (url) => {
    expect(isMapsLink(url)).toBe(true)
    expect(getPublicWebsite(url)).toBeNull()
    expect(getMapsLink(url)).toMatch(/^https:\/\//)
  })

  it.each([
    "https://granero66.com.ar",
    "www.sintacc.com.ar",
    "https://www.instagram.com/granero66",
    "https://www.google.com/search?q=granero",
  ])("%s es un sitio web", (url) => {
    expect(isMapsLink(url)).toBe(false)
    expect(getPublicWebsite(url)).toBe(url)
    expect(getMapsLink(url)).toBeNull()
  })

  it("vacío", () => {
    expect(getPublicWebsite("")).toBeNull()
    expect(getPublicWebsite(undefined)).toBeNull()
    expect(getMapsLink(null)).toBeNull()
  })

  it("la web de Google reemplaza un link de Maps o un campo vacío, nunca una web cargada", () => {
    expect(shouldUseGoogleWebsite("https://maps.app.goo.gl/x", "https://granero66.com.ar")).toBe(true)
    expect(shouldUseGoogleWebsite("", "https://granero66.com.ar")).toBe(true)
    expect(shouldUseGoogleWebsite("https://otra.com", "https://granero66.com.ar")).toBe(false)
    expect(shouldUseGoogleWebsite("https://maps.app.goo.gl/x", "https://maps.google.com/?cid=1")).toBe(false)
    expect(shouldUseGoogleWebsite("https://maps.app.goo.gl/x", undefined)).toBe(false)
  })
})

describe("filtro 'sin web' del admin", () => {
  // Misma regla que isMapsLink, en el regex que usa Mongo.
  const re = new RegExp(MAPS_LINK_URL_PATTERN, "i")

  it.each([
    "https://maps.app.goo.gl/vJxnEB3Ecd7jnU",
    "maps.app.goo.gl/vJxnEB3Ecd7jnU",
    "https://goo.gl/maps/abc123",
    "https://www.google.com/maps/place/Granero+66",
    "https://www.google.com.ar/maps/search/?api=1&query=x",
    "https://maps.google.com/?cid=123456",
    "https://g.page/granero66",
    "https://share.google/AbCdEf",
  ])("%s cuenta como sin web", (url) => {
    expect(re.test(url)).toBe(true)
    expect(isMapsLink(url)).toBe(true)
  })

  it.each([
    "https://granero66.com.ar",
    "https://www.instagram.com/granero66",
    "https://www.google.com/search?q=granero",
    "https://mapsdelicias.com.ar",
  ])("%s es una web", (url) => {
    expect(re.test(url)).toBe(false)
    expect(isMapsLink(url)).toBe(false)
  })
})
