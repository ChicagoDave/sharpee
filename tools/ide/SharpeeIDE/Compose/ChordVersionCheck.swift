// ChordVersionCheck.swift
// The IDE's Chord language-version dependency (ADR-258 D9): the IDE reports the
// Chord version it was written against and checks it against the installed
// toolchain's `sharpee --version` output (`Sharpee X · Chord Y`, ADR-257). A
// story written for a NEWER Chord than the IDE knows gets a clear, non-blocking
// warning rather than a silent mis-highlight. Pure parse/compare logic here;
// AppDelegate spawns the process and presents the warning.
// Public interface: ChordVersionCheck.supportedLanguageVersion,
// chordVersion(fromVersionOutput:), sharpeeVersion(fromVersionOutput:),
// isNewer(_:thanSupported:), fetch(completion:), fetchVersions(completion:).
// Owner context: tools/ide — Compose.

import Foundation

@MainActor
enum ChordVersionCheck {

    /// The Chord LANGUAGE version this IDE's language surfaces (ChordLexer,
    /// highlighting, golden corpus) were written against. Bump alongside the
    /// golden regeneration when the platform's CHORD_LANGUAGE_VERSION moves.
    ///
    /// Bumping is only honest once `ChordLexerGoldenTests` is green against a
    /// corpus that actually exercises the new version's surface — a green
    /// golden over a corpus missing the new syntax proves nothing.
    ///
    /// 2.2.0 (ADR-289, 2026-07-29): typed slots (ADR-267 D11) are already in
    /// `grammar-surface.story`, the Swift port matches the golden exactly, and
    /// `testGoldenDecodesWithFullTokenKindCoverage` confirms no new TokenKind —
    /// so the language surfaces needed no change, only this constant.
    ///
    /// 3.0.0 (ADR-298, 2026-08-03): the fielded story block. The golden corpus
    /// was migrated to the new surface in the same ADR (commit 12cf92c3), so
    /// `ChordLexerGoldenTests` green against it satisfies the honesty condition
    /// above; the frozen platform constant is `CHORD_LANGUAGE_VERSION = '3.0.0'`
    /// (packages/chord/src/version.ts).
    ///
    /// 3.3.0 (ADR-320, 2026-08-18): the conversation surface, which landed as
    /// three additive minors — 3.1.0 manner/greetings/time words, 3.2.0
    /// exchanges/initiative, 3.3.0 conversation threads. Here the honesty
    /// condition above is met by a NEW corpus file rather than a migrated one:
    /// `conversation-surface.story` exercises all three slices, its constructs
    /// lifted from the shipping syntax in `branch-stories/ides-of-march` and
    /// `stories/character-acceptance` and gate-clean under `sharpee compose
    /// --check` at 3.3.0. The golden was regenerated over it with zero
    /// deletions to the three existing streams, and `ChordLexerGoldenTests` is
    /// green with `ChordLexer.swift` untouched — the token layer absorbed the
    /// entire conversation grammar, exactly as it did at 2.2.0. Only
    /// `SyntaxHighlighter`'s display-only keyword set moved, gaining the five
    /// block nouns and the two row openers.
    static let supportedLanguageVersion = "3.3.0"

    /// Extracts the Chord version from `sharpee --version` output
    /// ("Sharpee 4.1.1 · Chord 2.1.0" → "2.1.0"). Nil when the shape is foreign.
    static func chordVersion(fromVersionOutput output: String) -> String? {
        guard let range = output.range(of: #"Chord\s+([0-9][0-9A-Za-z.\-]*)"#,
                                       options: .regularExpression) else { return nil }
        let match = output[range]
        return match.split(separator: " ").last.map(String.init)
    }

    /// Extracts the platform version from `sharpee --version` output
    /// ("Sharpee 4.1.1 · Chord 2.1.0" → "4.1.1"). Nil when the shape is foreign.
    static func sharpeeVersion(fromVersionOutput output: String) -> String? {
        guard let range = output.range(of: #"Sharpee\s+([0-9][0-9A-Za-z.\-]*)"#,
                                       options: .regularExpression) else { return nil }
        let match = output[range]
        return match.split(separator: " ").last.map(String.init)
    }

    /// The pair reported by `sharpee --version`; either component is nil when
    /// the toolchain is absent or its output shape is foreign.
    struct ToolchainVersions: Equatable {
        let sharpee: String?
        let chord: String?
    }

    /// True when `found` is a strictly newer semver than `supported` (numeric
    /// dot-component compare; missing components count 0, non-numeric count 0).
    static func isNewer(_ found: String, thanSupported supported: String) -> Bool {
        let f = components(found)
        let s = components(supported)
        for i in 0..<max(f.count, s.count) {
            let a = i < f.count ? f[i] : 0
            let b = i < s.count ? s[i] : 0
            if a != b { return a > b }
        }
        return false
    }

    private static func components(_ version: String) -> [Int] {
        version.split(separator: "-").first.map(String.init).map {
            $0.split(separator: ".").map { Int($0) ?? 0 }
        } ?? []
    }

    /// Runs the resolved `sharpee --version` (PATH, else the workspace shim
    /// enclosing `near`) and reports the installed Chord version (nil when
    /// sharpee is absent or the output is foreign). Best-effort and
    /// non-blocking — a missing toolchain is surfaced by the compose/build
    /// paths, not here.
    static func fetch(near: URL? = nil, completion: @escaping (String?) -> Void) {
        fetchVersions(near: near) { completion($0.chord) }
    }

    /// Runs the resolved `sharpee --version` and reports BOTH the platform and
    /// Chord versions — the pair ADR-279 D1's status bar displays alongside the
    /// app's own version. Same best-effort, non-blocking contract as `fetch`:
    /// a missing toolchain yields `ToolchainVersions(nil, nil)` rather than an
    /// error, because the compose/build paths own that diagnosis.
    static func fetchVersions(near: URL? = nil,
                              completion: @escaping (ToolchainVersions) -> Void) {
        guard let sharpee = ComposeRunner.resolveSharpee(near: near) else {
            completion(ToolchainVersions(sharpee: nil, chord: nil))
            return
        }
        let proc = Process()
        proc.executableURL = sharpee
        proc.arguments = ["--version"]
        proc.environment = ShellEnvironment.buildEnvironment()
        let out = Pipe()
        proc.standardOutput = out
        proc.standardError = Pipe()

        // EOF read + termination coordinated by a group (the ComposeRunner
        // pattern) so the completion never races the pipe read.
        let buffer = VersionBuffer()
        let group = DispatchGroup()
        group.enter()
        DispatchQueue.global(qos: .utility).async {
            buffer.store(out.fileHandleForReading.readDataToEndOfFile())
            group.leave()
        }
        group.enter()
        proc.terminationHandler = { _ in group.leave() }
        group.notify(queue: .main) {
            let text = String(data: buffer.data, encoding: .utf8) ?? ""
            completion(ToolchainVersions(sharpee: sharpeeVersion(fromVersionOutput: text),
                                         chord: chordVersion(fromVersionOutput: text)))
        }
        do {
            try proc.run()
        } catch {
            proc.terminationHandler = nil
            group.leave() // balance the termination enter — the handler never fires
            try? out.fileHandleForWriting.close() // unblock the EOF reader
        }
    }
}

/// Tiny thread-safe byte box for the version read.
private final class VersionBuffer: @unchecked Sendable {
    private let lock = NSLock()
    private var storage = Data()
    func store(_ data: Data) { lock.lock(); storage = data; lock.unlock() }
    var data: Data { lock.lock(); defer { lock.unlock() }; return storage }
}
