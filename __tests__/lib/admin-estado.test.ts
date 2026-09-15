/** @jest-environment node */
import { contactReplyUrl, estadoQuery, isAdminEstado } from "@/lib/admin-estado"
import { Contact } from "@/models/Contact"
import { Review } from "@/models/Review"
import { VentureReview } from "@/models/VentureReview"
import { Venture } from "@/models/Venture"

it.each([Contact, Review, VentureReview])("default pendiente y enum independiente de status", model => {
  const doc = new model()
  expect(doc.estado).toBe("pendiente")
  expect(model.schema.path("status")).toBeDefined()
  expect(model.schema.path("estado").options.enum).toEqual(["pendiente", "respondido", "archivado"])
})

it("reconoce documentos legacy como pendientes durante el despliegue", () => {
  expect(estadoQuery("pendiente")).toEqual({ $or: [{ estado: "pendiente" }, { estado: { $exists: false } }] })
  expect(estadoQuery("respondido")).toEqual({ estado: "respondido" })
  expect(isAdminEstado("read")).toBe(false)
})

it("cita el mensaje y codifica caracteres del asunto y cuerpo", () => {
  const url = contactReplyUrl("hola@example.com", "Consulta & ayuda", "Hola\n¿Dónde? #1")
  const params = new URLSearchParams(url.split("?")[1])
  expect(params.get("subject")).toBe("Re: Consulta & ayuda")
  expect(params.get("body")).toContain("> Hola\n> ¿Dónde? #1")
})

it("no incluye el email privado en consultas públicas por defecto", () => {
  expect(Venture.schema.path("responsibleEmail").options.select).toBe(false)
})
