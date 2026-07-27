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
    story "Probe" by "Tests"
      id: probe
      version: 1.0.0

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
    story "HatchProbe" by "Tests"
      id: hatch-probe
      version: 1.0.0

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
