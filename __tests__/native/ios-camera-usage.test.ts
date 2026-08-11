/**
 * @jest-environment node
 */
import fs from "fs"
import os from "os"
import path from "path"
import { checkIosCameraUsageDescription } from "../../scripts/check-ios-camera-usage"

describe("iOS NSCameraUsageDescription guard", () => {
  it("pasa contra el target real App/Info.plist", () => {
    const result = checkIosCameraUsageDescription()
    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it("falla si falta la clave en un árbol sintético", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "celimap-ios-cam-"))
    try {
      const appDir = path.join(tmp, "ios", "App", "App")
      const projDir = path.join(tmp, "ios", "App", "App.xcodeproj")
      fs.mkdirSync(appDir, { recursive: true })
      fs.mkdirSync(projDir, { recursive: true })
      fs.mkdirSync(path.join(appDir, "en.lproj"), { recursive: true })
      fs.mkdirSync(path.join(appDir, "es.lproj"), { recursive: true })

      fs.writeFileSync(
        path.join(appDir, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>location only</string>
</dict></plist>
`
      )
      fs.writeFileSync(
        path.join(projDir, "project.pbxproj"),
        `
			knownRegions = (
				en,
				Base,
				es,
			);
				INFOPLIST_FILE = App/Info.plist;
				INFOPLIST_FILE = App/Info.plist;
		C4E11A001FED79650016851F /* InfoPlist.strings in Resources */ = {isa = PBXBuildFile; };
`
      )
      fs.writeFileSync(
        path.join(appDir, "en.lproj", "InfoPlist.strings"),
        `"NSCameraUsageDescription" = "en camera";\n`
      )
      fs.writeFileSync(
        path.join(appDir, "es.lproj", "InfoPlist.strings"),
        `"NSCameraUsageDescription" = "es camera";\n`
      )

      const result = checkIosCameraUsageDescription(tmp)
      expect(result.ok).toBe(false)
      expect(result.errors.some((e) => e.includes("NSCameraUsageDescription"))).toBe(
        true
      )
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
