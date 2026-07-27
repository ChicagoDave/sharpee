// ComposeScheduler.swift
// The live-editing compose loop (ADR-258 D5/D6): debounces `.story` edit
// notifications, snapshots an unsaved buffer to a hidden sibling file in the
// story's own folder (so `use` imports and hatch-lint module paths still resolve
// against the real directory), runs `compose --json` over it, deletes the
// snapshot, and remaps compile-record `file` sites from the snapshot path back
// to the real story file before publishing the outcome. A buffer that matches
// disk composes the real file directly — no snapshot.
// Public interface: ComposeScheduler.noteEdit(storyURL:content:),
// composeNow(storyURL:content:), onOutcome, debounceInterval.
// Owner context: tools/ide — Compose.

import Foundation

@MainActor
final class ComposeScheduler {

    /// One finished compose attempt, addressed to the story file it described.
    struct Outcome {
        let storyURL: URL
        let result: Result<ComposeJsonPayload, ComposeRunner.Failure>
    }

    /// Published on the main actor after every compose attempt (success or failure).
    var onOutcome: ((Outcome) -> Void)?

    /// Quiet period after the last edit before a compose runs (Q3 ruling: ~400ms).
    var debounceInterval: TimeInterval = 0.4

    /// The compose invocation. Defaults to the production PATH-resolved `sharpee`;
    /// tests inject a closure that drives ComposeRunner.run with the repo CLI bundle
    /// (same runner, same decode path — only executable resolution differs).
    var composeInvoker: (URL, @escaping ComposeRunner.Completion) -> Void

    private let runner = ComposeRunner()
    private var pendingTask: Task<Void, Never>?

    init() {
        composeInvoker = { _, _ in }
        composeInvoker = { [runner] url, completion in
            runner.compose(storyFile: url, completion: completion)
        }
    }

    /// Notes an edit to `storyURL`'s buffer; composes `content` after the quiet
    /// period. Rapid successive calls coalesce into one run (newest content wins).
    func noteEdit(storyURL: URL, content: String) {
        pendingTask?.cancel()
        let interval = debounceInterval
        pendingTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
            guard !Task.isCancelled else { return }
            self?.performCompose(storyURL: storyURL, content: content)
        }
    }

    /// Composes immediately (document opened / tab switched), cancelling any
    /// debounced edit still waiting.
    func composeNow(storyURL: URL, content: String) {
        pendingTask?.cancel()
        pendingTask = nil
        performCompose(storyURL: storyURL, content: content)
    }

    // MARK: - Compose execution

    private func performCompose(storyURL: URL, content: String) {
        pendingTask = nil

        // A buffer that matches disk composes the real file — the common case on
        // open/switch, and the one that keeps record `file` sites exact for free.
        let onDisk = try? String(contentsOf: storyURL, encoding: .utf8)
        if onDisk == content {
            composeInvoker(storyURL) { [weak self] result in
                self?.onOutcome?(Outcome(storyURL: storyURL, result: result))
            }
            return
        }

        // Unsaved buffer: snapshot to a hidden sibling so directory-relative
        // resolution (imports, hatch modules) matches the real file's.
        let snapshot = storyURL.deletingLastPathComponent()
            .appendingPathComponent(".sharpee-compose.story")
        do {
            try content.write(to: snapshot, atomically: true, encoding: .utf8)
        } catch {
            onOutcome?(Outcome(storyURL: storyURL,
                               result: .failure(.launch("could not snapshot buffer: \(error.localizedDescription)"))))
            return
        }

        composeInvoker(snapshot) { [weak self] result in
            try? FileManager.default.removeItem(at: snapshot)
            guard let self else { return }
            let mapped = result.map { Self.remap($0, from: snapshot, to: storyURL) }
            self.onOutcome?(Outcome(storyURL: storyURL, result: mapped))
        }
    }

    /// Rewrites diagnostic `file` sites that name the snapshot back to the real
    /// story file. Hatch records already carry their own (absolute) module paths
    /// and pass through untouched.
    private static func remap(_ payload: ComposeJsonPayload,
                              from snapshot: URL, to storyURL: URL) -> ComposeJsonPayload {
        let snapshotPath = snapshot.path
        let diagnostics = payload.diagnostics.map { record -> ComposeDiagnosticRecord in
            guard record.file == snapshotPath else { return record }
            return ComposeDiagnosticRecord(severity: record.severity,
                                           code: record.code,
                                           message: record.message,
                                           file: storyURL.path,
                                           line: record.line,
                                           span: record.span)
        }
        return ComposeJsonPayload(schemaVersion: payload.schemaVersion,
                                  diagnostics: diagnostics,
                                  ir: payload.ir)
    }
}
