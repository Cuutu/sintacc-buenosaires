import Capacitor
import Foundation

@objc(ReviewPlugin)
public class ReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewPlugin"
    public let jsName = "Review"

    /// Xcode 26 imports `init(name:returnType:)` as failable (`CAPPluginMethod?`).
    /// Build the list with `compactMap` so `pluginMethods` is `[CAPPluginMethod]`.
    public let pluginMethods: [CAPPluginMethod] = ReviewPlugin.buildPluginMethods()

    private static func buildPluginMethods() -> [CAPPluginMethod] {
        var names = ["consider"]
        #if DEBUG
        names.append(contentsOf: ["debugStatus", "debugReset", "debugForce"])
        #endif
        return names.compactMap { name in
            CAPPluginMethod(name: name, returnType: CAPPluginReturnPromise)
        }
    }

    @objc func consider(_ call: CAPPluginCall) {
        let trigger = call.getString("trigger") ?? "unknown"
        Task { @MainActor in
            let result = ReviewManager.shared.consider(trigger: trigger)
            call.resolve([
                "requested": result.requested,
                "reason": result.reason,
            ])
        }
    }

    #if DEBUG
    @objc func debugStatus(_ call: CAPPluginCall) {
        Task { @MainActor in
            call.resolve(ReviewManager.shared.snapshot())
        }
    }

    @objc func debugReset(_ call: CAPPluginCall) {
        Task { @MainActor in
            ReviewManager.shared.debugReset()
            call.resolve()
        }
    }

    @objc func debugForce(_ call: CAPPluginCall) {
        Task { @MainActor in
            ReviewManager.shared.debugForce()
            call.resolve()
        }
    }
    #endif
}
