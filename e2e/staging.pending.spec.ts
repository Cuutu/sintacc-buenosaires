/**
 * @staging — pendiente URL autorizada. Nunca contra prod mutable.
 */
import { test } from "@playwright/test"

test.describe("staging integration @staging", () => {
  test("favoritos autenticado (pendiente staging)", async () => {
    test.skip(true, "Requiere PLAYWRIGHT_BASE_URL staging + sesión — no disponible")
  })

  test("ficha lugar completa (pendiente staging)", async () => {
    test.skip(true, "Requiere API/DB staging — no disponible")
  })
})
