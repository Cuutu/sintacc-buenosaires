/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("índice /listas SSR", () => {
  it("página servidor carga listas públicas y las pasa al cliente", () => {
    const page = read("app/listas/page.tsx")
    const content = read("app/listas/ListasPageContent.tsx")
    const loader = read("lib/lists/get-public-community-lists.ts")
    expect(page).not.toMatch(/^["']use client["']/)
    expect(page).toContain("getPublicCommunityLists")
    expect(page).toContain("initialLists")
    expect(content).toContain("initialLists")
    expect(content).toContain("<ListCard")
    expect(loader).toContain("publicListsQuery")
    expect(loader).not.toContain("PRIVATE_LINK")
  })
})
