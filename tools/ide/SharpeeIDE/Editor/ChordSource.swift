// ChordSource.swift
// The one answer to "is this file Chord source?" — a `.story` file or an
// imported `.chord` fragment (ADR-251 D2). Every extension gate that means
// "Chord source" (highlighting, wrap, compose triggers) asks here, so a
// fragment is never half-recognised (GH #287). The gates that mean "the
// story file itself" — identity reconcile (ADR-309), the story header — keep
// testing `.story` directly, because a fragment carries no header (ADR-251 D3).
// Public interface: ChordSource.isChordSource(_:), ChordSource.isStoryFile(_:),
// ChordSource.isFragment(_:).
// Owner context: tools/ide — Editor.

import Foundation

enum ChordSource {
    /// `.story` or `.chord`, case-insensitive on the extension.
    static func isChordSource(_ url: URL) -> Bool {
        isStoryFile(url) || isFragment(url)
    }

    /// The main story file — the only file that carries a `story` header.
    static func isStoryFile(_ url: URL) -> Bool {
        url.pathExtension.lowercased() == "story"
    }

    /// An imported fragment: Chord declarations with no header, compiled only
    /// through the `.story` that imports it.
    static func isFragment(_ url: URL) -> Bool {
        url.pathExtension.lowercased() == "chord"
    }
}
