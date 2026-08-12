import {
  UPLOAD_MAX_BYTES,
  UPLOAD_MAX_LABEL,
  isUploadAllowedMime,
} from "@/lib/upload-limits"

describe("upload limits contract", () => {
  it("uses 5 MiB binary (not decimal MB)", () => {
    expect(UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024)
    expect(UPLOAD_MAX_LABEL).toBe("5MB")
  })

  it("allows listed mimes only", () => {
    expect(isUploadAllowedMime("image/jpeg")).toBe(true)
    expect(isUploadAllowedMime("image/gif")).toBe(false)
  })
})
