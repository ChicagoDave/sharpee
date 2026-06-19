// TSCDiagnostic.swift
// Parses TypeScript compiler diagnostic lines from build output into a structured,
// clickable form. tsc prints `path(line,col): error TSnnnn: message`, with the path
// relative to wherever tsc ran — in the monorepo that's each package dir, so the panel
// tracks the current package via packageDirectory(from:) and resolves against it.
// Public interface: TSCDiagnostic, TSCDiagnosticParser.parse(line:relativeTo:),
// TSCDiagnosticParser.packageDirectory(from:).
// Owner context: tools/ide — Build.

import Foundation

/// A resolved source position the editor can open. Shared by build diagnostics (tsc)
/// and symbolicated Play-runtime stack frames so both use one click-to-jump path.
struct SourceLocation: Equatable {
    let file: URL
    let line: Int
    let column: Int
}

struct TSCDiagnostic: Equatable {
    enum Severity: String { case error, warning }
    let file: URL
    let line: Int
    let column: Int
    let severity: Severity
    let code: String
    let message: String
}

enum TSCDiagnosticParser {

    // <path>(<line>,<col>): <error|warning> <TSnnnn>: <message>
    private static let diagnostic = try! NSRegularExpression(
        pattern: #"^\s*(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.*)$"#)

    /// Parses a single build-output line as a tsc diagnostic, resolving a relative path
    /// against `base` (the current package dir, or repo root). Returns nil for non-diagnostics.
    static func parse(line text: String, relativeTo base: URL?) -> TSCDiagnostic? {
        let ns = text as NSString
        guard let m = diagnostic.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)),
              m.numberOfRanges == 7 else { return nil }

        let path = ns.substring(with: m.range(at: 1))
        guard let line = Int(ns.substring(with: m.range(at: 2))),
              let column = Int(ns.substring(with: m.range(at: 3))),
              let severity = TSCDiagnostic.Severity(rawValue: ns.substring(with: m.range(at: 4)))
        else { return nil }

        return TSCDiagnostic(
            file: resolve(path: path, base: base),
            line: line,
            column: column,
            severity: severity,
            code: ns.substring(with: m.range(at: 5)),
            message: ns.substring(with: m.range(at: 6)))
    }

    /// Extracts the package directory from a pnpm run header
    /// (`> @scope/pkg@1.0.0 build /abs/path`), so subsequent relative diagnostics resolve
    /// against it. Returns nil for any line that doesn't end in an absolute path.
    static func packageDirectory(from line: String) -> URL? {
        guard line.hasPrefix(">"), let lastSpace = line.lastIndex(of: " ") else { return nil }
        let tail = String(line[line.index(after: lastSpace)...])
        return tail.hasPrefix("/") ? URL(fileURLWithPath: tail) : nil
    }

    private static func resolve(path: String, base: URL?) -> URL {
        if path.hasPrefix("/") { return URL(fileURLWithPath: path) }
        if let base { return base.appendingPathComponent(path) }
        return URL(fileURLWithPath: path)
    }
}
