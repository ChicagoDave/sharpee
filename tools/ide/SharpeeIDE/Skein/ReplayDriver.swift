// ReplayDriver.swift
// Root→node re-execution at the skein's pinned seed (ADR-299 D6). A replay is
// the thread serialized as a `[SKIP]` transcript — the degenerate sentence of
// Sharpee's one execution grammar: every command executes and asserts nothing —
// with the document's `seed:` and the thread's joined forcing annotations as a
// `forces:` header (D5, ADR-293 grammar), run through the production
// `sharpee test --json --capture-output` surface (the Phase 3 mechanism
// decision), whose per-command `actualOutput` maps back to the thread's nodes.
// The transcript carries the opening `[SKIP]`'d `look` (the RecordingSession
// convention) so the headless run's RNG stream and banner placement align with
// the browser client's own boot `look` — without it every draw is offset and
// byte-identity dies even at the pinned seed.
// Public interface: ReplayDriver.replay(document:toNodeId:storyFile:completion:)
// (production resolution) and its executable/leadingArguments overload (tests
// pin the in-repo devkit CLI), cancel(), NodeOutput, ReplayError; the static
// transcriptSource/forcings/outputs stages are exposed for direct unit testing.
// Owner context: tools/ide — Skein (replay).

import Foundation

@MainActor
final class ReplayDriver {

    /// One replayed node: what the story actually printed for `command` at
    /// this position on this run. Pass/fail never appears here — a replay has
    /// no expectations, only observations (D6).
    struct NodeOutput: Equatable {
        let nodeId: String
        let command: String
        let output: String
    }

    /// Why a replay produced no outputs.
    enum ReplayError: Error, LocalizedError, Equatable {
        /// The document has no node with the requested id.
        case unknownNode(String)
        /// Two nodes on the thread force the same `point[#occurrence]` key —
        /// the runner rejects duplicate force keys as a load error (ADR-293
        /// D9), so the driver refuses before spawning anything.
        case duplicateForcing(key: String)
        /// No `sharpee` executable could be resolved (production entry only).
        case toolchainMissing
        /// A replay was requested while one is already in flight.
        case replayInFlight
        /// The CLI exited non-zero. This includes a forced replay whose
        /// forcing never fired (the ADR-293 D8/D9 hard failure) — outputs from
        /// such a run would present unforced reality as the forced branch, so
        /// the driver fails loudly instead of returning them.
        case cliFailed(exitCode: Int32, detail: String)
        /// The stream did not carry one result per command (opening turn
        /// included) in thread order — a transcript error, a truncated run, or
        /// a runner whose output order this driver misunderstands.
        case outputMismatch(expected: Int, found: Int, detail: String)
        /// A result arrived without `actualOutput` — the toolchain ignored
        /// `--capture-output` (predates it), which must surface, not read as
        /// an empty response.
        case missingOutput(command: String)

        var errorDescription: String? {
            switch self {
            case .unknownNode(let id):
                return "No skein node with id \(id)."
            case .duplicateForcing(let key):
                return "The thread forces \"\(key)\" more than once — each choice point occurrence can carry one forcing."
            case .toolchainMissing:
                return "sharpee not found — install the Sharpee CLI (or open a story inside a Sharpee checkout) to replay."
            case .replayInFlight:
                return "A replay is already running."
            case .cliFailed(let code, let detail):
                return "Replay run failed (exit \(code)).\(detail.isEmpty ? "" : "\n\(detail)")"
            case .outputMismatch(let expected, let found, let detail):
                return "Replay produced \(found) of \(expected) expected command results.\(detail.isEmpty ? "" : "\n\(detail)")"
            case .missingOutput(let command):
                return "The toolchain returned no captured output for \"\(command)\" — it predates --capture-output."
            }
        }
    }

    // MARK: - Pure stages (unit-tested directly)

    /// The thread's forcing annotations joined root→terminal, in node order,
    /// for the transcript's one `forces:` header.
    ///
    /// - Throws: `ReplayError.duplicateForcing` when two annotations share a
    ///   `point[#occurrence]` key — caught here, before any process spawns,
    ///   because the runner treats it as a load error (ADR-293 D9).
    static func forcings(along thread: SkeinThread) throws -> [String] {
        var seen = Set<String>()
        var joined: [String] = []
        for node in thread.nodes {
            for forcing in node.forcings {
                let key = String(forcing.split(separator: "=", maxSplits: 1)[0])
                guard seen.insert(key).inserted else {
                    throw ReplayError.duplicateForcing(key: key)
                }
                joined.append(forcing)
            }
        }
        return joined
    }

    /// The thread as replay transcript source: `title:`/`seed:`(/`forces:`)
    /// headers, the opening `[SKIP]`'d `look`, then every typed command as an
    /// untagged `[SKIP]` turn — emitted through the ADR-282 serializer
    /// (`RecordingSession.serialize`), never a second grammar.
    ///
    /// - Throws: `ReplayError.duplicateForcing` (see `forcings(along:)`).
    static func transcriptSource(for thread: SkeinThread,
                                 seed: Int,
                                 title: String) throws -> String {
        var headerFields = ["seed: \(seed)"]
        let joined = try forcings(along: thread)
        if !joined.isEmpty {
            headerFields.append("forces: \(joined.joined(separator: ", "))")
        }
        // Responses are deliberately blank: an untagged turn's response only
        // ever becomes reference comments, and this transcript exists to be
        // executed once and discarded, not read.
        let turns = thread.nodes
            .filter { !$0.command.isEmpty }
            .map { RecordedTurn(command: $0.command, response: "") }
        return RecordingSession.serialize(turns,
                                          title: title,
                                          openingTurn: true,
                                          headerFields: headerFields)
    }

    /// Maps the run's `command-result` records back onto the thread's nodes:
    /// one result per command in thread order, offset by the opening `look`
    /// (which belongs to no node — it re-plays the client's own boot turn).
    ///
    /// - Throws: `ReplayError.outputMismatch` when the counts or commands
    ///   disagree (carrying any transcript-error message from the stream),
    ///   `ReplayError.missingOutput` when a result lacks `actualOutput`.
    static func outputs(from records: [TestResultRecord],
                        thread: SkeinThread) throws -> [NodeOutput] {
        let results = records.compactMap { record -> TestCommandResult? in
            if case .commandResult(let result) = record { return result }
            return nil
        }
        let nodes = thread.nodes.filter { !$0.command.isEmpty }
        let expected = nodes.count + 1
        guard results.count == expected,
              zip(nodes, results.dropFirst()).allSatisfy({ $0.command == $1.input }) else {
            throw ReplayError.outputMismatch(expected: expected,
                                             found: results.count,
                                             detail: transcriptErrorMessage(in: records) ?? "")
        }
        return try zip(nodes, results.dropFirst()).map { node, result in
            guard let output = result.actualOutput else {
                throw ReplayError.missingOutput(command: node.command)
            }
            return NodeOutput(nodeId: node.id, command: node.command, output: output)
        }
    }

    /// The first transcript-error message in the stream, if any — the "why"
    /// behind a short or failed run.
    private static func transcriptErrorMessage(in records: [TestResultRecord]) -> String? {
        for record in records {
            if case .transcriptEnd(let end) = record, let message = end.errorMessage {
                return message
            }
        }
        return nil
    }

    // MARK: - Execution

    private var runner: TestRunner?
    private var records: [TestResultRecord] = []
    private var stderrText = ""
    private var decodeFailure: Error?
    private var thread: SkeinThread?
    private var temporaryDirectory: URL?
    private var completion: ((Result<[NodeOutput], Error>) -> Void)?

    /// True while a replay run is in flight.
    var isReplaying: Bool { runner != nil }

    /// Replays root→node with production toolchain resolution (workspace
    /// shim, else login-shell PATH — the TestRunner convention).
    ///
    /// - Parameters:
    ///   - document: the skein; its pinned seed drives the run (D5).
    ///   - nodeId: the node to replay to (inclusive).
    ///   - storyFile: the `.story` to run against.
    ///   - completion: one call, on the main actor: per-node outputs in
    ///     thread order, or the error that stopped the replay.
    func replay(document: SkeinDocument,
                toNodeId nodeId: String,
                storyFile: URL,
                completion: @escaping (Result<[NodeOutput], Error>) -> Void) {
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            completion(.failure(ReplayError.toolchainMissing))
            return
        }
        replay(document: document, toNodeId: nodeId, storyFile: storyFile,
               executable: sharpee, leadingArguments: [], completion: completion)
    }

    /// Replays root→node through an explicit executable — the production
    /// entry above delegates here; real-path tests drive it with the in-repo
    /// devkit CLI (`/usr/bin/env node …/cli.js`) so the whole
    /// spawn/stream/decode/map path runs against the real toolchain.
    func replay(document: SkeinDocument,
                toNodeId nodeId: String,
                storyFile: URL,
                executable: URL,
                leadingArguments: [String],
                completion: @escaping (Result<[NodeOutput], Error>) -> Void) {
        guard !isReplaying else {
            completion(.failure(ReplayError.replayInFlight))
            return
        }
        guard let thread = document.thread(to: nodeId) else {
            completion(.failure(ReplayError.unknownNode(nodeId)))
            return
        }

        let transcript: URL
        do {
            let source = try Self.transcriptSource(for: thread,
                                                   seed: document.seed,
                                                   title: "Skein replay")
            let directory = FileManager.default.temporaryDirectory
                .appendingPathComponent("SharpeeIDE-Replay-\(UUID().uuidString)",
                                        isDirectory: true)
            try FileManager.default.createDirectory(at: directory,
                                                    withIntermediateDirectories: true)
            transcript = directory.appendingPathComponent("replay.transcript")
            try source.write(to: transcript, atomically: true, encoding: .utf8)
            temporaryDirectory = directory
        } catch {
            completion(.failure(error))
            return
        }

        self.thread = thread
        self.completion = completion
        records = []
        stderrText = ""
        decodeFailure = nil

        let runner = TestRunner()
        runner.delegate = self
        self.runner = runner
        runner.start(executable: executable,
                     arguments: leadingArguments
                         + ["test", storyFile.path, transcript.path,
                            "--json", "--capture-output"],
                     workingDirectory: storyFile.deletingLastPathComponent(),
                     environment: ShellEnvironment.buildEnvironment())
    }

    /// Cancels an in-flight replay; its completion reports the failed run.
    /// No-op when idle.
    func cancel() {
        runner?.cancel()
    }

    private func finish(_ result: Result<[NodeOutput], Error>) {
        let completion = self.completion
        if let temporaryDirectory {
            try? FileManager.default.removeItem(at: temporaryDirectory)
        }
        runner = nil
        records = []
        stderrText = ""
        decodeFailure = nil
        thread = nil
        temporaryDirectory = nil
        self.completion = nil
        completion?(result)
    }
}

// MARK: - TestRunnerDelegate

extension ReplayDriver: TestRunnerDelegate {

    func runner(_ runner: TestRunner, didDecode record: TestResultRecord) {
        records.append(record)
    }

    func runner(_ runner: TestRunner, didFailDecode error: Error) {
        decodeFailure = error
    }

    func runner(_ runner: TestRunner, didEmitStderr text: String) {
        stderrText += text
    }

    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {}

    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        guard let thread else { return }
        if let decodeFailure {
            finish(.failure(decodeFailure))
            return
        }
        // A `[SKIP]` replay asserts nothing, so a healthy run exits 0; any
        // other exit is a real objection (transcript error, unfired forcing —
        // the D8/D9 hard failure) and the outputs must not be handed over.
        guard result.exitCode == 0 else {
            let detail = [Self.transcriptErrorMessage(in: records), stderrText]
                .compactMap { $0 }
                .filter { !$0.isEmpty }
                .joined(separator: "\n")
            finish(.failure(ReplayError.cliFailed(exitCode: result.exitCode,
                                                  detail: detail)))
            return
        }
        finish(Result { try Self.outputs(from: records, thread: thread) })
    }
}
