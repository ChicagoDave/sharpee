// WorldIndexRunner.swift
// Runs the World Index analyzer as a child process and hands back one decoded
// response (ADR-321, the IDE↔analyzer boundary): a `.ir.json` path in, one JSON
// document on stdout, the World tab's content out.
//
// IT SPAWNS `sharpee world-index`, NOT A SCRIPT PATH OF ITS OWN. Resolution is
// ComposeRunner's three tiers — the workspace shim, a global install, the
// toolchain sealed inside the app — the same ones build, compose, test, and play
// already use. Pointing at `packages/world-index/dist/cli.js` directly would
// have worked inside a checkout and nowhere else, which is a World tab that is
// permanently empty for every author who did not clone the monorepo.
//
// FAILURE IS A RESULT, NOT AN ERROR (AC-9). Every path through this runner ends
// in a `WorldIndexResponse` the tab can render — a missing IR, a malformed one,
// an absent toolchain, an analyzer that died without speaking. The completion is
// never skipped and nothing here throws to the caller, because a blank World tab
// with no explanation is the outcome the ADR names as unacceptable.
//
// THE WORK STAYS OFF THE MAIN ACTOR. The analysis is a child process, and the decode of what
// it wrote runs in the termination handler's own context — only the finished value hops to
// the main actor. That is a design constraint, not an optimisation: ADR-321 Amendment 1 puts
// a part-of-speech pass and a much larger document on this path, and the tab shows a loading
// state while it runs (David, 2026-08-19: "if we run it on a background thread with a Loading
// message on the tab, I think we're safe").
//
// Mirrors ComposeRunner's Process/pipe machinery, including its supersede rule:
// starting a run while one is in flight terminates the old process and drops its
// completion, so a rapid rebuild cannot render yesterday's analysis.
// Public interface: WorldIndexRunner.analyze(irPath:near:completion:),
// run(sharpee:irPath:workingDirectory:environment:completion:), cancel(),
// isRunning, WorldIndexRunner.arguments(irPath:), irPath(forStory:),
// interpret(stdout:stderr:exitCode:irPath:).
// Owner context: tools/ide — World.

import Foundation

@MainActor
final class WorldIndexRunner {

    private var process: Process?
    /// Held for the run's duration so the `@Sendable` termination handler invokes
    /// it through `self` on the main actor. Dropped when a newer run supersedes it.
    private var pending: ((WorldIndexResponse) -> Void)?

    /// True while an analysis is in flight.
    var isRunning: Bool { process != nil }

    // MARK: - Production entry

    /// Analyzes a built story's IR.
    ///
    /// Resolution failures answer immediately with the failure the tab renders —
    /// no story IR at the path the build should have written, no `sharpee` from
    /// any tier. Neither is a crash and neither is silent.
    ///
    /// - Parameters:
    ///   - irPath: the `<story>.ir.json` a successful build wrote
    ///   - storyFile: the story whose enclosing workspace supplies tier 1
    ///   - completion: called exactly once, on the main actor, with what to render
    func analyze(irPath: URL, near storyFile: URL,
                 completion: @escaping (WorldIndexResponse) -> Void) {
        guard FileManager.default.fileExists(atPath: irPath.path) else {
            completion(.failed(WorldIndexFailure(
                cause: .unreadableIR,
                message: "The build wrote no story IR to analyze. Build the story (\u{2318}B) and open this tab again.",
                path: irPath.path)))
            return
        }
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            completion(.failed(WorldIndexFailure(
                cause: .unavailable,
                message: "sharpee not found, so the world index could not be derived — install the Sharpee CLI, or open a story inside a Sharpee checkout.",
                path: nil)))
            return
        }
        run(sharpee: sharpee,
            irPath: irPath,
            workingDirectory: storyFile.deletingLastPathComponent(),
            environment: ShellEnvironment.buildEnvironment(),
            completion: completion)
    }

    // MARK: - Resolution

    /// Where a successful `sharpee build` leaves a story's IR (`dist/<name>.ir.json`,
    /// written by `packages/devkit/src/standalone/build.ts`).
    ///
    /// - Parameter storyFile: the `.story` file that was built
    /// - Returns: the IR path the build should have written
    static func irPath(forStory storyFile: URL) -> URL {
        storyFile
            .deletingLastPathComponent()
            .appendingPathComponent("dist")
            .appendingPathComponent(storyFile.deletingPathExtension().lastPathComponent + ".ir.json")
    }

    /// The argument list an analysis runs with, named rather than inlined so a
    /// test can drive the real CLI with the REAL arguments.
    ///
    /// The alternative — a hand-written list in the test — is how a subcommand
    /// can be renamed in production while every test still passes, because the
    /// test supplies the old name itself.
    ///
    /// - Parameter irPath: the `.ir.json` to analyze
    /// - Returns: the arguments to pass `sharpee`
    static func arguments(irPath: URL) -> [String] {
        ["world-index", irPath.path]
    }

    // MARK: - Spawn

    /// Spawns `sharpee world-index`, buffers its stdout to completion, and decodes it.
    ///
    /// This is the production spawn path; `analyze` is this function bound to the
    /// resolved tiers, and tests drive it directly with the real CLI so the real
    /// Process/pipe/decode machinery is exercised (DEVARCH 13a).
    ///
    /// - Parameters:
    ///   - sharpee: the resolved `sharpee` executable
    ///   - irPath: the `.ir.json` to analyze
    ///   - workingDirectory: the directory to spawn in
    ///   - environment: the child's environment (the login-shell PATH)
    ///   - completion: called exactly once, on the main actor, with what to render
    func run(sharpee: URL, irPath: URL, workingDirectory: URL,
             environment: [String: String]? = nil,
             completion: @escaping (WorldIndexResponse) -> Void) {
        supersedeInFlightRun()

        let proc = Process()
        proc.executableURL = sharpee
        proc.arguments = Self.arguments(irPath: irPath)
        proc.currentDirectoryURL = workingDirectory
        if let environment { proc.environment = environment }

        let out = Pipe()
        let err = Pipe()
        proc.standardOutput = out
        proc.standardError = err

        proc.terminationHandler = { [weak self] finished in
            let stdout = (try? out.fileHandleForReading.readToEnd()) ?? Data()
            let stderr = (try? err.fileHandleForReading.readToEnd()) ?? Data()
            // Decoded HERE, in the handler's own context, so a large document never
            // parses on the main actor. Only the finished value crosses.
            let response = Self.interpret(stdout: stdout, stderr: stderr,
                                          exitCode: finished.terminationStatus, irPath: irPath)
            Task { @MainActor [weak self] in
                guard let self, finished === self.process else { return }
                self.process = nil
                let deliver = self.pending
                self.pending = nil
                deliver?(response)
            }
        }

        process = proc
        pending = completion

        do {
            try proc.run()
        } catch {
            process = nil
            pending = nil
            completion(.failed(WorldIndexFailure(
                cause: .unavailable,
                message: "The World Index analyzer could not be started: \(error.localizedDescription)",
                path: sharpee.path)))
        }
    }

    /// Abandons an in-flight analysis: the child is terminated and its completion
    /// dropped. No-op when idle.
    func cancel() {
        supersedeInFlightRun()
    }

    // MARK: - Internals

    /// Terminates any in-flight child and drops its completion.
    ///
    /// The stale handler's identity guard (`finished === self.process`) fails once
    /// `process` is cleared, so a superseded run can never deliver.
    private func supersedeInFlightRun() {
        guard let stale = process else { return }
        pending = nil
        process = nil
        stale.terminationHandler = nil
        if stale.isRunning { stale.terminate() }
    }

    /// Turns a finished child's output into the response the tab renders.
    ///
    /// Exit 0 and exit 1 both carry a document (an analysis and a failure
    /// respectively) — that is the analyzer's contract. Anything else means the
    /// process died before it could speak, which is the IDE's own failure to
    /// explain, and stderr is the only evidence of why.
    ///
    /// - Parameters:
    ///   - stdout: everything the child wrote to stdout
    ///   - stderr: everything it wrote to stderr, used only when there is no document
    ///   - exitCode: its exit status
    ///   - irPath: the IR it was asked to analyze, for the failure's `path`
    /// - Returns: the analysis, or the failure to render
    /// - Note: `nonisolated` deliberately. It runs in the child's termination handler, off the
    ///   main actor, so parsing a large document never competes with drawing.
    nonisolated static func interpret(stdout: Data, stderr: Data, exitCode: Int32, irPath: URL) -> WorldIndexResponse {
        if let response = try? WorldIndexResponse.decode(stdout) { return response }
        let detail = String(data: stderr, encoding: .utf8)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let why = detail.isEmpty ? "it exited \(exitCode) without saying why" : detail
        return .failed(WorldIndexFailure(
            cause: .unavailable,
            message: "The World Index analyzer did not answer — \(why).",
            path: irPath.path))
    }
}
