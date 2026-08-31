import Capacitor
import Foundation

@objc(ReviewPlugin)
public class ReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewPlugin"
    public let jsName = "Review"

    public let pluginMethods: [CAPPluginMethod] = {
        var methods = [
            CAPPluginMethod(name: "consider", returnType: CAPPluginReturnPromise),
        ]
        #if DEBUG
        methods.append(contentsOf: [
            CAPPluginMethod(name: "debugStatus", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "debugReset", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "debugForce", returnType: CAPPluginReturnPromise),
        ])
        #endif
        return methods
    }()

    @objc func consider(_ call: CAPPluginCall) {
        let trigger = call.getString("trigger") ?? "unknown"
        let result = ReviewManager.shared.consider(trigger: trigger)
        call.resolve([
            "requested": result.requested,
            "reason": result.reason,
        ])
    }

    #if DEBUG
    @objc func debugStatus(_ call: CAPPluginCall) {
        call.resolve(ReviewManager.shared.snapshot())
    }

    @objc func debugReset(_ call: CAPPluginCall) {
        ReviewManager.shared.debugReset()
        call.resolve()
    }

    @objc func debugForce(_ call: CAPPluginCall) {
        ReviewManager.shared.debugForce()
        call.resolve()
    }
    #endif
}
