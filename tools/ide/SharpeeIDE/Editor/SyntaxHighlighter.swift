// SyntaxHighlighter.swift
// P2 spike (step 2.0): tree-sitter syntax highlighting for TypeScript documents.
// Public interface: `canHighlight(_:)` reports whether a URL is a supported language;
// `highlight(_:)` parses an NSTextStorage and applies foreground token colors.
// Owner context: tools/ide — Editor pane.
//
// SPIKE SCOPE: proves the parse → highlights-query → color pipeline end-to-end against
// the vendored grammar. It re-highlights the whole document on each call (no incremental
// re-parse yet — that's the Neon layer in P2 step 2.3+). Not wired for performance.

import AppKit
import SwiftTreeSitter
import TreeSitterTypeScript

/// Maps tree-sitter highlight capture names to editor colors, and applies them to a text storage.
final class SyntaxHighlighter {

    /// Capture-name → color. Keys match the *head* of a tree-sitter capture name, so a dotted
    /// capture like `keyword.control` or `punctuation.bracket` resolves via its first segment.
    private static let colorsByCapture: [String: NSColor] = [
        "keyword":  Theme.tokenKeyword,
        "string":   Theme.tokenString,
        "comment":  Theme.tokenComment,
        "number":   Theme.tokenNumber,
        "type":     Theme.tokenType,
        "constant": Theme.tokenNumber,
        "function": Theme.tokenFunction,
        "method":   Theme.tokenFunction,
    ]

    /// Curated highlight queries, split into independent groups. Each group compiles on its own,
    /// so a node/token name that the grammar doesn't recognize disables only its group rather than
    /// killing all highlighting. (Grammar-bundled query auto-discovery via LanguageConfiguration
    /// does NOT resolve from an app target — see plan-20260619-p2; we load our own instead.)
    static let querySources: [String] = [
        // Group 1 — core JS keywords (bedrock anonymous tokens).
        """
        [
          "const" "let" "var" "function" "return" "if" "else" "for" "while" "do"
          "switch" "case" "break" "continue" "new" "delete" "typeof" "instanceof"
          "class" "extends" "import" "export" "from" "throw" "try" "catch" "finally"
        ] @keyword
        """,
        // Group 2 — TypeScript-specific keywords (isolated so an unknown token can't disable group 1).
        """
        [
          "interface" "type" "enum" "namespace" "implements" "as" "keyof" "declare"
          "public" "private" "protected" "readonly" "static" "abstract"
          "async" "await" "yield"
        ] @keyword
        """,
        // Group 3 — literals and comments.
        """
        (comment) @comment
        (string) @string
        (template_string) @string
        (number) @number
        """,
        // Group 4 — types.
        """
        (type_identifier) @type
        (predefined_type) @type
        """,
    ]

    private let parser = Parser()
    private let queries: [Query]
    private let languageReady: Bool

    /// `querySources` is injectable so tests can exercise group-isolation and the load-failure
    /// path; production uses the curated default.
    init(querySources: [String] = SyntaxHighlighter.querySources) {
        // Use LanguageConfiguration only to obtain the Language; build our own queries from it.
        let config = try? LanguageConfiguration(tree_sitter_typescript(), name: "TypeScript")
        if let config {
            self.languageReady = ((try? parser.setLanguage(config.language)) != nil)
            self.queries = querySources.compactMap { source in
                guard let data = source.data(using: .utf8) else { return nil }
                return try? Query(language: config.language, data: data)
            }
        } else {
            self.languageReady = false
            self.queries = []
        }
    }

    /// True if this highlighter can color the file at `url` (TypeScript family only, for now).
    func canHighlight(_ url: URL) -> Bool {
        ["ts", "tsx", "mts", "cts"].contains(url.pathExtension.lowercased())
    }

    /// Resolves a (possibly dotted) tree-sitter capture name to a token color, or nil if unmapped.
    static func color(forCapture capture: String) -> NSColor? {
        let head = capture.split(separator: ".").first.map(String.init) ?? capture
        return colorsByCapture[head]
    }

    /// Parses `storage`'s contents and applies foreground token colors over the whole document.
    /// Resets every character to the base foreground first so stale colors from a prior pass are
    /// cleared. No-op (leaves text at base foreground) if the grammar or query failed to load.
    func highlight(_ storage: NSTextStorage) {
        let source = storage.string
        let fullRange = NSRange(location: 0, length: (source as NSString).length)

        storage.beginEditing()
        defer { storage.endEditing() }
        storage.addAttribute(.foregroundColor, value: Theme.foreground, range: fullRange)

        guard languageReady, !queries.isEmpty, let tree = parser.parse(source) else {
            return
        }

        for query in queries {
            let highlights = query.execute(in: tree).resolve(with: .init(string: source)).highlights()
            for namedRange in highlights {
                guard let color = Self.color(forCapture: namedRange.name) else { continue }
                // Guard against any range the query reports past the current text length.
                let r = namedRange.range
                guard r.location >= 0, NSMaxRange(r) <= fullRange.length else { continue }
                storage.addAttribute(.foregroundColor, value: color, range: r)
            }
        }
    }
}
