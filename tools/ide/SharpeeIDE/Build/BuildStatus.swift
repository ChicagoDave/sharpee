// BuildStatus.swift
// The build state shown in the status-bar pill, plus pure formatting of its duration
// and label. Kept separate from the view so the text logic is unit-testable.
// Public interface: BuildStatusDisplay, BuildStateFormatter.
// Owner context: tools/ide — Build.

import Foundation

/// What the status-bar build pill is currently showing.
enum BuildStatusDisplay: Equatable {
    case idle
    case building
    case succeeded(duration: TimeInterval)
    case failed(duration: TimeInterval)
    case cancelled(duration: TimeInterval)
}

enum BuildStateFormatter {

    /// Human-readable duration: "2.0s" under a minute, "1m 23s" beyond.
    static func durationText(_ seconds: TimeInterval) -> String {
        let s = max(0, seconds)
        if s < 60 { return String(format: "%.1fs", s) }
        let total = Int(s.rounded())
        return String(format: "%dm %02ds", total / 60, total % 60)
    }

    /// The pill's text for a given status ("" when idle, so the pill hides).
    static func label(for status: BuildStatusDisplay) -> String {
        switch status {
        case .idle:                 return ""
        case .building:             return "Building…"
        case .succeeded(let d):     return "Built in \(durationText(d))"
        case .failed:               return "Build failed"
        case .cancelled:            return "Cancelled"
        }
    }
}
