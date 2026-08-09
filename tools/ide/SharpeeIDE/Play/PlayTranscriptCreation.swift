// PlayTranscriptCreation.swift
// Create Transcript from play (ADR-305 D5/D6): pipes the play log's payload
// through the toolchain's `sharpee transcript-from-play` — the one synthesis
// code path — and returns the file text for the caller's save panel. A
// refusal (exit 2) surfaces the CLI's stderr and NOTHING is written; this
// type never touches the filesystem.
// Public interface: PlayTranscriptCreation.createText(payload:storyFile:),
// .suggestedFilename(storyFile:span:), Refusal.
// Owner context: tools/ide — Play.

import Foundation

@MainActor
enum PlayTranscriptCreation {

    /// A creation refusal — the CLI's reason, ready for an alert. Nothing was
    /// written (ADR-305 D6).
    struct Refusal: Error {
        let message: String
    }

    /// The save panel's suggested name: story slug + the selection's turn span
    /// (ADR-305 D6), e.g. `fernhill-turns-3-14.transcript`.
    static func suggestedFilename(storyFile: URL, span: (first: Int, last: Int)?) -> String {
        let slug = storyFile.deletingPathExtension().lastPathComponent
        guard let span else { return "\(slug)-from-play.transcript" }
        return span.first == span.last
            ? "\(slug)-turn-\(span.first).transcript"
            : "\(slug)-turns-\(span.first)-\(span.last).transcript"
    }

    /// Runs `sharpee transcript-from-play` with `payload` on stdin and returns
    /// the transcript text from stdout.
    ///
    /// - Parameters:
    ///   - payload: the play log's JSON payload (`PlayTurnLog.payloadJSON`).
    ///   - storyFile: the project's `.story` file — anchors executable
    ///     resolution (workspace shim → PATH → bundled, the compose tiers)
    ///     and the process working directory.
    /// - Returns: the complete `.transcript` file text.
    /// - Throws: `Refusal` when the toolchain is missing or the CLI exits
    ///   non-zero (its stderr is the refusal message).
    static func createText(payload: Data, storyFile: URL) async throws -> String {
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            throw Refusal(message:
                "sharpee not found — install the Sharpee CLI (or open a story inside a Sharpee checkout) to create transcripts.")
        }

        let process = Process()
        process.executableURL = sharpee
        process.arguments = ["transcript-from-play"]
        process.currentDirectoryURL = storyFile.deletingLastPathComponent()
        process.environment = ShellEnvironment.buildEnvironment()

        let stdin = Pipe()
        let stdout = Pipe()
        let stderr = Pipe()
        process.standardInput = stdin
        process.standardOutput = stdout
        process.standardError = stderr

        return try await withCheckedThrowingContinuation { continuation in
            process.terminationHandler = { process in
                let out = stdout.fileHandleForReading.readDataToEndOfFile()
                let err = stderr.fileHandleForReading.readDataToEndOfFile()
                if process.terminationStatus == 0, let text = String(data: out, encoding: .utf8) {
                    continuation.resume(returning: text)
                } else {
                    let reason = String(data: err, encoding: .utf8)?
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    continuation.resume(throwing: Refusal(message:
                        (reason?.isEmpty == false ? reason! : "transcript-from-play failed")))
                }
            }
            do {
                try process.run()
            } catch {
                continuation.resume(throwing: Refusal(message:
                    "could not launch sharpee: \(error.localizedDescription)"))
                return
            }
            stdin.fileHandleForWriting.write(payload)
            stdin.fileHandleForWriting.closeFile()
        }
    }
}
