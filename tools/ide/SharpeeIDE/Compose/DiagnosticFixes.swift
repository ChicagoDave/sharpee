// DiagnosticFixes.swift
// A compose diagnostic's fix (ADR-409 D7.2), turned into changes to a buffer.
//
// Compose fills every fix before it ships, so a fix's text is final: this file
// works nothing out. It maps each edit's wire span onto the buffer's UTF-16
// ranges and orders the changes last-first, so applying one never moves the
// range of the next. Fix all merges every fixed record in one file into a single
// change set; a fix whose span no longer fits the buffer, or that overlaps one
// already taken, is left for the next compose rather than guessed at.
// Public interface: DiagnosticFixes.Change, changes(for:in:),
// changesForAll(_:inFile:text:), applying(_:to:).
// Owner context: tools/ide — Compose.

import Foundation

enum DiagnosticFixes {

    /// One buffer change: `text` replaces `range`.
    struct Change: Equatable {
        let range: NSRange
        let text: String
    }

    /// The changes one fix makes to `text`, last first.
    ///
    /// - Parameters:
    ///   - fix: the record's fix, as compose filled it
    ///   - text: the buffer the fix applies to
    /// - Returns: the changes in descending order; nil when the fix has no edits,
    ///   an edit's span does not fit the buffer, or two edits overlap
    static func changes(for fix: ComposeFix, in text: String) -> [Change]? {
        guard !fix.edits.isEmpty else { return nil }
        var changes: [Change] = []
        for edit in fix.edits {
            guard let range = SpanText.characterRange(of: edit.span, in: text) else { return nil }
            changes.append(Change(range: range, text: edit.text))
        }
        let ordered = changes.sorted { $0.range.location > $1.range.location }
        for (later, earlier) in zip(ordered, ordered.dropFirst())
        where NSMaxRange(earlier.range) > later.range.location {
            return nil
        }
        return ordered
    }

    /// Every fix among `records` sited in `path`, merged into one change set, last first.
    ///
    /// Records are taken in the order given; one whose changes do not fit, or that
    /// would overlap a change already taken, is skipped, and its diagnostic stays
    /// for the next compose.
    ///
    /// - Parameters:
    ///   - records: one compose run's records
    ///   - path: the file whose fixes to gather (`ComposeDiagnosticRecord.file`)
    ///   - text: that file's buffer
    /// - Returns: the merged changes in descending order; empty when none apply
    static func changesForAll(_ records: [ComposeDiagnosticRecord], inFile path: String,
                              text: String) -> [Change] {
        var taken: [Change] = []
        for record in records where record.file == path {
            guard let fix = record.fix, let changes = changes(for: fix, in: text) else { continue }
            let overlaps = changes.contains { change in
                taken.contains { NSIntersectionRange($0.range, change.range).length > 0
                    || $0.range.location == change.range.location }
            }
            if !overlaps { taken.append(contentsOf: changes) }
        }
        return taken.sorted { $0.range.location > $1.range.location }
    }

    /// `text` with `changes` applied, which must be in descending order.
    ///
    /// - Parameters:
    ///   - changes: changes from `changes(for:in:)` or `changesForAll`
    ///   - text: the buffer they were computed against
    /// - Returns: the changed text
    static func applying(_ changes: [Change], to text: String) -> String {
        let buffer = NSMutableString(string: text)
        for change in changes {
            buffer.replaceCharacters(in: change.range, with: change.text)
        }
        return buffer as String
    }
}
