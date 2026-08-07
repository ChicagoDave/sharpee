// PublishController.swift
// Runs `sharpee publish` for the Publish tab (ADR-284 D1). It drives the
// resolved toolchain and nothing else: the preconditions, the build and the zip
// all live in devkit, so an author who publishes from Chord Writer and one who
// types the command get the identical artifact. Reuses BuildRunner rather than
// growing a second process owner — spawning, streaming and cancelling are
// already solved there.
// Public interface: publish(storyFile:to:), cancel(), isPublishing, onOutput,
// onFinished.
// Owner context: tools/ide — Publish.

import AppKit

@MainActor
final class PublishController: BuildRunnerDelegate {

    /// Streamed stdout/stderr from the toolchain, verbatim.
    var onOutput: ((String) -> Void)?
    /// The run ended. `zipURL` is non-nil only on success.
    var onFinished: ((_ succeeded: Bool, _ zipURL: URL?) -> Void)?

    private let runner = BuildRunner()
    private var destination: URL?

    init() {
        runner.delegate = self
    }

    var isPublishing: Bool { runner.isRunning }

    /// Publishes `storyFile` to `destination`.
    ///
    /// The destination is passed as `--out` rather than parsed back out of the
    /// command's output: the IDE then knows the path without reading prose that
    /// is free to change.
    ///
    /// - Parameters:
    ///   - storyFile: the `.story` to publish.
    ///   - destination: where the zip is written.
    func publish(storyFile: URL, to destination: URL) {
        guard !runner.isRunning else { return }
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            onOutput?("sharpee not found — install the Sharpee CLI (or open a story inside a "
                      + "Sharpee checkout) to publish stories.\n")
            onFinished?(false, nil)
            return
        }
        publish(executable: sharpee, storyFile: storyFile, to: destination)
    }

    /// Spawns a named executable. This is the production spawn path; the
    /// resolving overload above delegates here, and tests drive it with a
    /// fixture script so the real process, pipe and exit handling is exercised
    /// without depending on a `sharpee` being installed — the same seam
    /// `BuildRunner` uses for the same reason.
    func publish(executable: URL, storyFile: URL, to destination: URL) {
        guard !runner.isRunning else { return }
        self.destination = destination
        runner.start(executable: executable,
                     arguments: ["publish", storyFile.path, "--out", destination.path],
                     workingDirectory: storyFile.deletingLastPathComponent(),
                     environment: ShellEnvironment.buildEnvironment())
    }

    func cancel() {
        runner.cancel()
    }

    // MARK: - BuildRunnerDelegate

    func runner(_ runner: BuildRunner, didEmit text: String) {
        onOutput?(text)
    }

    func runner(_ runner: BuildRunner, didChangeState state: BuildRunner.State) {
        // The tab reflects progress through the streamed output and the button's
        // enabled state; there is no separate status pill for publishing.
    }

    func runner(_ runner: BuildRunner, didExit result: BuildRunner.Result) {
        let succeeded = result.state == .success
        // Only claim an artifact that is really there: a zero exit with no file
        // would be a worse lie than a reported failure.
        let produced = destination.flatMap {
            FileManager.default.fileExists(atPath: $0.path) ? $0 : nil
        }
        onFinished?(succeeded && produced != nil, succeeded ? produced : nil)
        destination = nil
    }
}
