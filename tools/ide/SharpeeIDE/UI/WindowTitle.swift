// WindowTitle.swift
// Derives the main window's title from the composed story (GH #188): the
// story's own title when a story compile has revealed one, the product name
// otherwise. Centering comes from NSWindow's standard titled-window behavior —
// no custom titlebar accessory. Amends ADR-279 D1's title-is-product-name-only
// ruling: that ruling was about not repeating the project FOLDER name; a story
// TITLE is the work's name, which is what a document window should carry.
// Public interface: WindowTitle.title(for:).
// Owner context: tools/ide — UI.

import Foundation

enum WindowTitle {

    /// The window title for the current compose state. Product name when no
    /// story is composed, when the file is a grammar header (a grammar file is
    /// not a story), or when the story block carries a blank title.
    static func title(for ir: ComposeStoryIR?) -> String {
        guard let ir, ir.grammarFile == nil else { return AppIdentity.productName }
        let title = ir.meta.title.trimmingCharacters(in: .whitespacesAndNewlines)
        return title.isEmpty ? AppIdentity.productName : title
    }
}
