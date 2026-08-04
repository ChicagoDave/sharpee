// Forcing.swift
// One parsed ADR-293 `forces:` annotation — `point[#occurrence]=CLASS` — and
// the single Swift home for that grammar. Skein nodes store forcings as the
// raw segment strings (the transcript header's own form, so export is a join
// with no re-encoding, ADR-299 D5); this type is what reads them when
// something needs the parts: the Skein view's Force sheet validating what the
// author typed, and the Play surface handing structured specs to the live
// client's random service.
// Public interface: Forcing.parse(_:), point, occurrence, cls, playSpec.
// Owner context: tools/ide — Skein. UI-free; safe to unit-test.

import Foundation

struct Forcing: Equatable {

    /// The point's dotted name (ADR-293 D2).
    let point: String

    /// 1-based firing index this force targets; nil applies per mode (D9).
    let occurrence: Int?

    /// The declared outcome class to substitute.
    let cls: String

    /// Parses one `forces:` segment.
    ///
    /// Mirrors `packages/transcript-tester`'s header grammar deliberately
    /// narrowly: it rejects what cannot parse, and says nothing about whether
    /// the point exists or declares the class. Those are the engine's calls
    /// (an unknown point and an undeclared class are its typed load errors,
    /// and an unfired `once` force is the runner's hard failure) — the IDE
    /// refusing them here would need a point catalog it does not have.
    ///
    /// - Parameter entry: one segment, e.g. `stdlib.throwing.breaks#1=no`.
    /// - Returns: the parsed forcing, or nil when the shape is wrong.
    static func parse(_ entry: String) -> Forcing? {
        let halves = entry.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
        guard halves.count == 2 else { return nil }

        let key = String(halves[0]).trimmingCharacters(in: .whitespaces)
        let cls = String(halves[1]).trimmingCharacters(in: .whitespaces)
        guard !cls.isEmpty else { return nil }

        let parts = key.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)
        let point = String(parts[0])
        guard !point.isEmpty,
              !point.contains(" "),
              !point.contains("\t") else { return nil }

        guard parts.count == 2 else {
            return Forcing(point: point, occurrence: nil, cls: cls)
        }
        guard let occurrence = Int(parts[1]), occurrence >= 1 else { return nil }
        return Forcing(point: point, occurrence: occurrence, cls: cls)
    }

    /// This forcing as the wire object the browser client's random service
    /// loads (`RandomForceSpec`).
    ///
    /// Mode is `sticky`, the play default (ADR-293 D9): live play may reach a
    /// forced point any number of times, and `once` — the transcript default —
    /// treats zero firings as a hard error, which is right for a fixed script
    /// and wrong for a surface the author keeps typing into.
    var playSpec: [String: Any] {
        var spec: [String: Any] = ["point": point, "cls": cls, "mode": "sticky"]
        if let occurrence { spec["occurrence"] = occurrence }
        return spec
    }
}
