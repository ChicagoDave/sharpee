// TestToolchain.swift
// Locates the real Sharpee toolchain for real-path tests (rule 13a): the
// monorepo's devkit CLI (`packages/devkit/dist/cli.js`), driven through
// `/usr/bin/env node` with the login-shell PATH, against real `.story` fixtures.
// Tests use this instead of the production PATH-resolved `sharpee` so they pin
// the in-repo toolchain, per CLAUDE.md's bundle-testing guidance.

import Foundation
@testable import SharpeeIDE

@MainActor
enum TestToolchain {

    /// The monorepo root, derived from this source file's compile-time path
    /// (`tools/ide/SharpeeIDETests/…` → three levels up).
    static var repoRoot: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // SharpeeIDETests
            .deletingLastPathComponent()  // ide
            .deletingLastPathComponent()  // tools
            .deletingLastPathComponent()  // repo root
    }

    /// The devkit author CLI (the engine behind `./sharpee`).
    static var devkitCLI: URL {
        repoRoot.appendingPathComponent("packages/devkit/dist/cli.js")
    }

    /// The platform CLI bundle. Only `captureResponses` needs it — the devkit
    /// CLI above stays the toolchain for everything that RUNS tests (ADR-187).
    static var cliBundle: URL {
        repoRoot.appendingPathComponent("dist/cli/sharpee.js")
    }

    /// The story's real responses to `commands`, in order.
    ///
    /// ADR-282's loop is capture-then-replay, so a test that blesses text the
    /// story never printed proves nothing about the serializer. This plays the
    /// commands through the real engine and hands back what it actually said,
    /// which the caller then blesses.
    ///
    /// Standing in for the Play pane's capture here is sound because
    /// `packages/platform-browser/tests/capture-parity.test.ts` pins the two as
    /// byte-identical (ADR-282 Acceptance 5, capture half) — without that proof
    /// this substitution would be an assumption.
    ///
    /// A priming `look` runs first and is dropped: the browser client opens
    /// with its own `look` outside the recording, so the first captured turn is
    /// the second turn of the game. Its output also carries the story banner.
    ///
    /// - Parameters:
    ///   - storyFile: the `.story` to run.
    ///   - commands: commands to play, none containing `/` (the `--exec`
    ///     separator).
    /// - Returns: one response per command.
    /// - Throws: if the CLI cannot be launched, exits non-zero, or prints fewer
    ///   command markers than were asked for.
    static func captureResponses(storyFile: URL, commands: [String]) throws -> [String] {
        let played = ["look"] + commands

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", cliBundle.path,
                             "--exec", played.joined(separator: "/"),
                             "--story", storyFile.path]
        process.environment = ShellEnvironment.buildEnvironment()
        let output = Pipe()
        let errors = Pipe()
        process.standardOutput = output
        process.standardError = errors
        try process.run()
        let data = output.fileHandleForReading.readDataToEndOfFile()
        let errorData = errors.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()

        guard process.terminationStatus == 0 else {
            throw CaptureError.cliFailed(
                status: process.terminationStatus,
                stderr: String(data: errorData, encoding: .utf8) ?? "")
        }

        let stdout = String(data: data, encoding: .utf8) ?? ""
        return try blocks(in: stdout, for: played).dropFirst().map { $0 }
    }

    /// Split `--exec` output into one block per command.
    ///
    /// The CLI prints `> <command>`, the response, then one blank line. That
    /// trailing blank is the CLI's own separator, not part of the response — a
    /// channel-flattened response never ends blank.
    private static func blocks(in stdout: String, for commands: [String]) throws -> [String] {
        let lines = stdout.replacingOccurrences(of: "\r\n", with: "\n")
            .components(separatedBy: "\n")
        var markers: [Int] = []
        for (index, line) in lines.enumerated()
        where markers.count < commands.count && line == "> \(commands[markers.count])" {
            markers.append(index)
        }
        guard markers.count == commands.count else {
            throw CaptureError.unparsableOutput(expected: commands.count,
                                                found: markers.count,
                                                stdout: stdout)
        }

        return markers.enumerated().map { position, start in
            let end = position + 1 < markers.count ? markers[position + 1] : lines.count
            var body = Array(lines[(start + 1)..<end])
            while body.last?.isEmpty == true { body.removeLast() }
            return body.joined(separator: "\n")
        }
    }

    /// Why a response capture could not be completed.
    enum CaptureError: LocalizedError {
        case cliFailed(status: Int32, stderr: String)
        case unparsableOutput(expected: Int, found: Int, stdout: String)

        var errorDescription: String? {
            switch self {
            case .cliFailed(let status, let stderr):
                return "sharpee --exec exited \(status):\n\(stderr)"
            case .unparsableOutput(let expected, let found, let stdout):
                return "expected \(expected) command markers, found \(found):\n\(stdout)"
            }
        }
    }

    /// Drives `runner.run` with `node devkitCLI compose <story> --json` — the real
    /// CLI, the real Process/pipe/decode path; only executable resolution differs
    /// from production.
    static func composeInvoker(runner: ComposeRunner)
        -> (URL, @escaping ComposeRunner.Completion) -> Void {
        { storyFile, completion in
            runner.run(executable: URL(fileURLWithPath: "/usr/bin/env"),
                       arguments: ["node", devkitCLI.path,
                                   "compose", storyFile.path, "--json"],
                       workingDirectory: storyFile.deletingLastPathComponent(),
                       environment: ShellEnvironment.buildEnvironment(),
                       completion: completion)
        }
    }

    /// A minimal story that composes clean (verified against the live CLI).
    static let cleanStory = """
    story
      title: Probe
      authors: Tests
      id: probe
      story-version: 1.0.0
      ifid: 5A2E4B77-1C3D-4E5F-8A9B-0C1D2E3F4A5B

    create the Lab
      a room

      A small lab.

    create the player
      starts in the Lab

      You.

    """

    /// `cleanStory` with the player placed in an undeclared room —
    /// one `analysis.unknown-entity` error with a full span.
    static let analyzerErrorStory = cleanStory
        .replacingOccurrences(of: "starts in the Lab", with: "starts in the Attic")

    /// A story declaring a hatch module; pair with a module file whose source
    /// carries a quoted `chord.*` literal for a `hatch.chord-namespace` finding.
    static let hatchStory = """
    story
      title: HatchProbe
      authors: Tests
      id: hatch-probe
      story-version: 1.0.0
      ifid: 7B3F5C88-2D4E-4F60-9BAC-1D2E3F405B6C

    create the Lab
      a room

      A lab.

    create the player
      starts in the Lab

      You.

    define text warning from "./mod.ts"

    """

    /// Hatch module source that trips the loader-private-namespace lint.
    static let hatchViolationModule = """
    export function warning(ctx) { return ctx.get("chord.thing") }

    """
}
