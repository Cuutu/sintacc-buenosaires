import Foundation
import os
import StoreKit
import UIKit

/// StoreKit review APIs and `UIApplication.shared` are `@MainActor` (Xcode 26 SDK).
@MainActor
final class ReviewManager {
    static let shared = ReviewManager()

    private let defaults = UserDefaults.standard
    private let log = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.celimap.app", category: "Review")

    private enum Key {
        static let firstUseAt = "celimap.review.firstUseAt"
        static let sessionCount = "celimap.review.sessionCount"
        static let lastSessionAt = "celimap.review.lastSessionAt"
        static let lastRequestAt = "celimap.review.lastRequestAt"
        static let lastRequestVersion = "celimap.review.lastRequestVersion"
    }

    private let minSessions = 4
    private let minSessionGap: TimeInterval = 60 * 60
    private let minAge: TimeInterval = 3 * 24 * 60 * 60
    private let minCooldown: TimeInterval = 120 * 24 * 60 * 60

    private init() {}

    private func line(_ message: String) {
        log.info("[Review] \(message, privacy: .public)")
        print("[Review] \(message)")
    }

    var currentVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
    }

    func recordSession(now: Date = Date()) {
        if defaults.object(forKey: Key.firstUseAt) == nil {
            defaults.set(now.timeIntervalSince1970, forKey: Key.firstUseAt)
        }
        let last = defaults.double(forKey: Key.lastSessionAt)
        if last > 0, now.timeIntervalSince1970 - last < minSessionGap {
            line("session skip (gap < 1h) count=\(defaults.integer(forKey: Key.sessionCount))")
            return
        }
        let count = defaults.integer(forKey: Key.sessionCount) + 1
        defaults.set(count, forKey: Key.sessionCount)
        defaults.set(now.timeIntervalSince1970, forKey: Key.lastSessionAt)
        line("session recorded count=\(count)")
    }

    struct ConsiderResult {
        let requested: Bool
        let reason: String
    }

    func consider(trigger: String, now: Date = Date()) -> ConsiderResult {
        let evaluation = evaluate(now: now)
        if let failed = evaluation.failedGate {
            line("gate failed trigger=\(trigger) \(failed)")
            return ConsiderResult(requested: false, reason: failed)
        }
        guard Self.foregroundActiveWindowScene() != nil else {
            line("skip API: no foregroundActive UIWindowScene trigger=\(trigger)")
            return ConsiderResult(requested: false, reason: "no_foreground_scene")
        }
        line("all gates passed trigger=\(trigger) calling requestReview")
        defaults.set(now.timeIntervalSince1970, forKey: Key.lastRequestAt)
        defaults.set(currentVersion, forKey: Key.lastRequestVersion)
        presentReviewPrompt()
        return ConsiderResult(requested: true, reason: "requested")
    }

    func snapshot(now: Date = Date()) -> [String: Any] {
        let evaluation = evaluate(now: now)
        let first = defaults.object(forKey: Key.firstUseAt) as? Double
        let lastSession = defaults.object(forKey: Key.lastSessionAt) as? Double
        let lastRequest = defaults.object(forKey: Key.lastRequestAt) as? Double
        return [
            "sessionCount": defaults.integer(forKey: Key.sessionCount),
            "firstUseAt": first ?? NSNull(),
            "lastSessionAt": lastSession ?? NSNull(),
            "lastRequestAt": lastRequest ?? NSNull(),
            "lastRequestVersion": defaults.string(forKey: Key.lastRequestVersion) ?? NSNull(),
            "currentVersion": currentVersion,
            "daysSinceFirstUse": evaluation.daysSinceFirstUse,
            "daysSinceLastRequest": evaluation.daysSinceLastRequest ?? NSNull(),
            "sessionsOk": evaluation.sessionsOk,
            "firstUseOk": evaluation.firstUseOk,
            "versionOk": evaluation.versionOk,
            "cooldownOk": evaluation.cooldownOk,
            "eligible": evaluation.failedGate == nil,
            "failedGate": evaluation.failedGate ?? NSNull(),
        ]
    }

    #if DEBUG
    func debugReset() {
        [Key.firstUseAt, Key.sessionCount, Key.lastSessionAt, Key.lastRequestAt, Key.lastRequestVersion].forEach {
            defaults.removeObject(forKey: $0)
        }
        line("debugReset cleared UserDefaults")
    }

    func debugForce() {
        guard Self.foregroundActiveWindowScene() != nil else {
            line("debugForce skip: no foregroundActive UIWindowScene")
            return
        }
        line("debugForce calling requestReview (gates skipped)")
        presentReviewPrompt()
    }
    #endif

    private struct Evaluation {
        let sessionsOk: Bool
        let firstUseOk: Bool
        let versionOk: Bool
        let cooldownOk: Bool
        let daysSinceFirstUse: Double
        let daysSinceLastRequest: Double?
        var failedGate: String? {
            if !sessionsOk { return "sessions" }
            if !firstUseOk { return "first_use_days" }
            if !versionOk { return "already_asked_this_version" }
            if !cooldownOk { return "cooldown_120d" }
            return nil
        }
    }

    private func evaluate(now: Date) -> Evaluation {
        let sessions = defaults.integer(forKey: Key.sessionCount)
        let first = defaults.double(forKey: Key.firstUseAt)
        let age = first > 0 ? now.timeIntervalSince1970 - first : 0
        let lastRequest = defaults.object(forKey: Key.lastRequestAt) as? Double
        let askedVersion = defaults.string(forKey: Key.lastRequestVersion)
        let cooldownOk = lastRequest == nil || now.timeIntervalSince1970 - lastRequest! > minCooldown
        let daysSinceLast: Double? = lastRequest.map { (now.timeIntervalSince1970 - $0) / 86_400 }
        return Evaluation(
            sessionsOk: sessions >= minSessions,
            firstUseOk: first > 0 && age >= minAge,
            versionOk: askedVersion != currentVersion,
            cooldownOk: cooldownOk,
            daysSinceFirstUse: age / 86_400,
            daysSinceLastRequest: daysSinceLast
        )
    }

    static func foregroundActiveWindowScene() -> UIWindowScene? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
    }

    private func presentReviewPrompt() {
        guard let scene = Self.foregroundActiveWindowScene() else {
            line("skip API: no foregroundActive UIWindowScene at request time")
            return
        }
        if #available(iOS 18.0, *) {
            AppStore.requestReview(in: scene)
        } else {
            SKStoreReviewController.requestReview(in: scene)
        }
    }
}
