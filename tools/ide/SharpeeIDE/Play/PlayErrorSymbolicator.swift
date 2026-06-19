// PlayErrorSymbolicator.swift
// Turns a captured Play console error (a minified JS stack from the browser bundle) into
// a structured, navigable error: the message plus frames symbolicated through the story's
// game.js.map to clickable story-source locations.
// Public interface: PlayConsoleError, PlayErrorSymbolicator.symbolicate(_:bundleDir:).
// Owner context: tools/ide — Play.

import Foundation

/// A Play runtime error ready to render as a navigable list in the Game Errors panel.
struct PlayConsoleError: Equatable {
    let message: String
    let frames: [Frame]
    /// Author-facing translation (title + fix), computed from the message + offending source line.
    let translation: TranslatedError

    struct Frame: Equatable {
        let function: String
        /// Symbolicated story-source location, when the frame maps into the bundle.
        let location: SourceLocation?
        /// The original raw frame text (fallback display for unresolved frames).
        let raw: String

        /// What the list shows: "function — file.ts:line" when resolved, else the raw frame.
        var display: String {
            if let location {
                let name = function.isEmpty ? "(anonymous)" : function
                return "\(name) — \(location.file.lastPathComponent):\(location.line)"
            }
            return raw
        }
    }
}

enum PlayErrorSymbolicator {

    /// Caches the parsed source map per bundle dir (decoding a multi-MB map isn't free,
    /// and runtime errors can arrive in bursts). Keyed by the map file path; guarded by `lock`.
    private static let lock = NSLock()
    nonisolated(unsafe) private static var cache: [String: SourceMap] = [:]

    /// Parses `raw` (the captured console text / stack) and symbolicates its bundle frames
    /// against `bundleDir/game.js.map`. Frames that don't resolve keep their raw text.
    static func symbolicate(_ raw: String, bundleDir: URL) -> PlayConsoleError {
        let map = sourceMap(for: bundleDir)
        var message = ""
        var frames: [PlayConsoleError.Frame] = []

        for line in raw.split(separator: "\n", omittingEmptySubsequences: false).map(String.init) {
            if let parsed = parseFrame(line) {
                let location = map.flatMap { resolve(parsed, map: $0, bundleDir: bundleDir) }
                frames.append(.init(function: parsed.function, location: location,
                                    raw: line.trimmingCharacters(in: .whitespaces)))
            } else {
                let text = line.trimmingCharacters(in: .whitespaces)
                if message.isEmpty, !text.isEmpty { message = text }
            }
        }

        let resolvedMessage = message.isEmpty ? "Play runtime error" : message
        let primary = frames.compactMap(\.location).first
        let sourceLine = primary.flatMap { readLine($0.line, ofFile: $0.file) }
        let translation = SharpeeErrorTranslator.translate(message: resolvedMessage, sourceLine: sourceLine)

        return PlayConsoleError(message: resolvedMessage, frames: frames, translation: translation)
    }

    /// Reads the 1-based `line` of `file`, trimmed. Returns nil if unavailable.
    private static func readLine(_ line: Int, ofFile file: URL) -> String? {
        guard line >= 1, let text = try? String(contentsOf: file, encoding: .utf8) else { return nil }
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false)
        guard lines.indices.contains(line - 1) else { return nil }
        return lines[line - 1].trimmingCharacters(in: .whitespaces)
    }

    /// Resets the source-map cache (call when bundles are rebuilt).
    static func clearCache() {
        lock.lock(); defer { lock.unlock() }
        cache.removeAll()
    }

    // MARK: - Frame parsing

    private struct ParsedFrame {
        let function: String
        let url: String
        let line: Int
        let column: Int
    }

    // <function>@<url>:<line>:<column>  (WebKit stack format)
    private static let frameRegex = try! NSRegularExpression(
        pattern: #"^\s*(.*?)@(\S+?):(\d+):(\d+)\s*$"#)

    private static func parseFrame(_ line: String) -> ParsedFrame? {
        let ns = line as NSString
        guard let m = frameRegex.firstMatch(in: line, range: NSRange(location: 0, length: ns.length)),
              let lineNo = Int(ns.substring(with: m.range(at: 3))),
              let column = Int(ns.substring(with: m.range(at: 4))) else { return nil }
        return ParsedFrame(function: ns.substring(with: m.range(at: 1)),
                           url: ns.substring(with: m.range(at: 2)),
                           line: lineNo, column: column)
    }

    private static func resolve(_ frame: ParsedFrame, map: SourceMap, bundleDir: URL) -> SourceLocation? {
        // Only bundle frames (game.js) are in the source map.
        guard frame.url.hasSuffix("game.js") else { return nil }
        guard let pos = map.originalPosition(generatedLine: frame.line, generatedColumn: frame.column)
        else { return nil }
        let file = bundleDir.appendingPathComponent(pos.source).standardizedFileURL
        return SourceLocation(file: file, line: pos.line, column: pos.column)
    }

    private static func sourceMap(for bundleDir: URL) -> SourceMap? {
        let mapURL = bundleDir.appendingPathComponent("game.js.map")
        lock.lock()
        let cached = cache[mapURL.path]
        lock.unlock()
        if let cached { return cached }

        guard let data = try? Data(contentsOf: mapURL), let map = SourceMap(data: data) else { return nil }
        lock.lock()
        cache[mapURL.path] = map
        lock.unlock()
        return map
    }
}
