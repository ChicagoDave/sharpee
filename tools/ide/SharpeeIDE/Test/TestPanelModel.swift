// TestPanelModel.swift
// State behind the Tests panel (ADR-277 D2/D3): discovers a story's
// transcripts (the `tests/` subtree, and the single `walkthroughs/` chain in
// filename order — no manifest), applies decoded NDJSON records as they
// stream in (per-transcript status, per-command rows), and resolves a command
// row to the SourceLocation the editor opens (click-through by line —
// transcripts are line-oriented, no span). Pure state + FileManager reads; no
// AppKit, so tests drive it directly.
//
// ADR-282 D2 adds the drift lifecycle on top: a failed command result now
// carries what the story ACTUALLY printed, so the panel can show it against
// the text the author blessed and offer re-bless — which rewrites that one
// assertion's literal block in the transcript (the rules live in Rebless).
// This is where the file is read and written; the view stays presentation.
// Public interface: TestPanelModel.discover(storyDir:), entries, apply(_:),
// reset(), location(for:), blessedText(for:), canRebless(_:), rebless(_:),
// runSummary.
// Owner context: tools/ide — Test.

import Foundation

@MainActor
final class TestPanelModel {

    /// Which discovery group a transcript belongs to.
    enum Group: Equatable, Sendable {
        case tests
        /// The walkthroughs chain — runs only as an explicit chain run (D3).
        case walkthroughs
    }

    /// A transcript's live status in the panel.
    enum Status: Equatable, Sendable {
        case idle
        case running
        case passed
        case failed
        case error(message: String?)
    }

    /// One transcript row: its file, group, live status, and (after a run)
    /// its per-command rows.
    struct Entry: Equatable {
        let file: URL
        let group: Group
        var status: Status = .idle
        var commands: [TestCommandResult] = []
        var counts: (passed: Int, failed: Int) = (0, 0)

        static func == (lhs: Entry, rhs: Entry) -> Bool {
            lhs.file == rhs.file && lhs.group == rhs.group
                && lhs.status == rhs.status && lhs.commands == rhs.commands
                && lhs.counts == rhs.counts
        }
    }

    private(set) var entries: [Entry] = []
    /// The final aggregate, present once the stream's `run-end` arrived.
    private(set) var runEnd: TestRunEnd?

    // MARK: - Discovery

    /// Scans `storyDir` for the panel's tree: every `.transcript` under
    /// `tests/` (recursive, sorted) and the `walkthroughs/` chain (top level,
    /// filename order — D3). Missing directories yield empty groups.
    func discover(storyDir: URL) {
        entries = Self.transcripts(under: storyDir.appendingPathComponent("tests"), recursive: true)
            .map { Entry(file: $0, group: .tests) }
            + Self.transcripts(under: storyDir.appendingPathComponent("walkthroughs"), recursive: false)
            .map { Entry(file: $0, group: .walkthroughs) }
        runEnd = nil
    }

    private static func transcripts(under dir: URL, recursive: Bool) -> [URL] {
        let fm = FileManager.default
        guard fm.fileExists(atPath: dir.path) else { return [] }
        let found: [URL]
        if recursive {
            let enumerator = fm.enumerator(at: dir, includingPropertiesForKeys: nil)
            found = (enumerator?.compactMap { $0 as? URL } ?? [])
        } else {
            found = (try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        }
        return found
            .filter { $0.pathExtension == "transcript" }
            .map { $0.standardizedFileURL }
            .sorted { $0.path < $1.path }
    }

    // MARK: - Record application

    /// Marks every entry idle and clears results (a new run is starting).
    func reset() {
        for index in entries.indices {
            entries[index].status = .idle
            entries[index].commands = []
            entries[index].counts = (0, 0)
        }
        runEnd = nil
    }

    /// Folds one decoded stream record into the panel state. Records for files
    /// outside the discovered tree (an explicit single-file run of an unlisted
    /// transcript) are appended to the matching group so no result is dropped.
    func apply(_ record: TestResultRecord) {
        switch record {
        case .runStart:
            reset()
        case .transcriptStart(let start):
            let index = entryIndex(for: start.file)
            entries[index].status = .running
        case .commandResult(let command):
            let index = entryIndex(for: command.file)
            entries[index].commands.append(command)
        case .transcriptEnd(let end):
            let index = entryIndex(for: end.file)
            entries[index].counts = (end.passed, end.failed)
            switch end.status {
            case .passed: entries[index].status = .passed
            case .failed: entries[index].status = .failed
            case .error: entries[index].status = .error(message: end.errorMessage)
            }
        case .runEnd(let end):
            runEnd = end
        }
    }

    /// The entry for a wire file path, appending a row when the file was not
    /// in the discovered tree.
    private func entryIndex(for wireFile: String) -> Int {
        let url = URL(fileURLWithPath: wireFile).standardizedFileURL
        if let index = entries.firstIndex(where: { $0.file == url }) { return index }
        let group: Group = url.deletingLastPathComponent().lastPathComponent == "walkthroughs"
            ? .walkthroughs : .tests
        entries.append(Entry(file: url, group: group))
        return entries.count - 1
    }

    // MARK: - Click-through

    /// The editor location for a command row: the command's 1-based source
    /// line in its `.transcript` (D2 — line, not span).
    func location(for command: TestCommandResult) -> SourceLocation {
        SourceLocation(file: URL(fileURLWithPath: command.file).standardizedFileURL,
                       line: command.line,
                       column: 1)
    }

    // MARK: - Re-bless (ADR-282 D2)

    /// The text the author blessed, read back from the transcript on disk.
    ///
    /// The "old" side of the failure view's old-vs-new. It comes from the FILE
    /// rather than the wire because the wire carries only what the story now
    /// prints — the blessed text is the assertion itself, and the assertion is
    /// the file.
    ///
    /// - Parameter command: a command result row.
    /// - Returns: the blessed block's content.
    /// - Throws: `Rebless.Failure` when the command carries no verbatim bless,
    ///   or a read error when the transcript cannot be opened.
    func blessedText(for command: TestCommandResult) throws -> String {
        let source = try String(contentsOf: URL(fileURLWithPath: command.file), encoding: .utf8)
        return try Rebless.locate(in: source.components(separatedBy: "\n"),
                                  commandLine: command.line).content
    }

    /// Why re-bless is not on offer for this row, or nil when it is.
    ///
    /// Answered by computing the whole rewrite and DISCARDING it — nothing is
    /// written — so the button is offered exactly when pressing it would
    /// succeed, and the reason it is not is the reason the press would have
    /// failed. Asking the question must never be the thing that changes the
    /// file.
    func reblessObstacle(for command: TestCommandResult) -> Error? {
        do {
            _ = try reblessedSource(for: command)
            return nil
        } catch {
            return error
        }
    }

    /// Whether the failure view should offer re-bless for this row.
    func canRebless(_ command: TestCommandResult) -> Bool {
        reblessObstacle(for: command) == nil
    }

    /// Rewrite `command`'s blessed text to what the story now prints, in place.
    ///
    /// The rewrite is computed in full before anything is written, so every
    /// refusal leaves the transcript exactly as it was.
    ///
    /// - Parameter command: the failed command result whose assertion drifted.
    /// - Throws: `Rebless.Failure` when re-bless does not apply, or a file
    ///   error when the transcript cannot be read or written.
    func rebless(_ command: TestCommandResult) throws {
        let rewritten = try reblessedSource(for: command)
        try rewritten.write(to: URL(fileURLWithPath: command.file),
                            atomically: true, encoding: .utf8)
    }

    /// What `rebless` would write. Split out so the enablement check runs the
    /// same code path the button does, rather than a second opinion of it.
    private func reblessedSource(for command: TestCommandResult) throws -> String {
        guard let actual = command.actualOutput else { throw Rebless.Failure.noCapturedOutput }
        let source = try String(contentsOf: URL(fileURLWithPath: command.file), encoding: .utf8)
        return try Rebless.rewrite(source: source, commandLine: command.line, actual: actual)
    }

    /// One-line run summary for the status label, or nil before `run-end`.
    var runSummary: String? {
        guard let end = runEnd else { return nil }
        var parts = ["\(end.totalPassed) passed"]
        if end.totalFailed > 0 { parts.append("\(end.totalFailed) failed") }
        if end.totalErrors > 0 { parts.append("\(end.totalErrors) error(s)") }
        if end.totalSkipped > 0 { parts.append("\(end.totalSkipped) skipped") }
        return parts.joined(separator: ", ")
    }
}
