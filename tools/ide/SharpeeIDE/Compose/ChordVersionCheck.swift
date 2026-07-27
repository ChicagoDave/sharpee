// ChordVersionCheck.swift
// The IDE's Chord language-version dependency (ADR-258 D9): the IDE reports the
// Chord version it was written against and checks it against the installed
// toolchain's `sharpee --version` output (`Sharpee X · Chord Y`, ADR-257). A
// story written for a NEWER Chord than the IDE knows gets a clear, non-blocking
// warning rather than a silent mis-highlight. Pure parse/compare logic here;
// AppDelegate spawns the process and presents the warning.
// Public interface: ChordVersionCheck.supportedLanguageVersion,
// chordVersion(fromVersionOutput:), isNewer(_:thanSupported:), fetch(completion:).
// Owner context: tools/ide — Compose.

import Foundation

@MainActor
enum ChordVersionCheck {

    /// The Chord LANGUAGE version this IDE's language surfaces (ChordLexer,
    /// highlighting, golden corpus) were written against. Bump alongside the
    /// golden regeneration when the platform's CHORD_LANGUAGE_VERSION moves.
    static let supportedLanguageVersion = "2.1.0"

    /// Extracts the Chord version from `sharpee --version` output
    /// ("Sharpee 4.1.1 · Chord 2.1.0" → "2.1.0"). Nil when the shape is foreign.
    static func chordVersion(fromVersionOutput output: String) -> String? {
        guard let range = output.range(of: #"Chord\s+([0-9][0-9A-Za-z.\-]*)"#,
                                       options: .regularExpression) else { return nil }
        let match = output[range]
        return match.split(separator: " ").last.map(String.init)
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

    /// Runs the PATH-resolved `sharpee --version` and reports the installed
    /// Chord version (nil when sharpee is absent or the output is foreign).
    /// Best-effort and non-blocking — a missing toolchain is surfaced by the
    /// compose/build paths, not here.
    static func fetch(completion: @escaping (String?) -> Void) {
        guard let sharpee = ComposeRunner.resolveSharpee() else {
            completion(nil)
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
            completion(chordVersion(fromVersionOutput: text))
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
