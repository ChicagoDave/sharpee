// ImportCommands.swift
// The mutation half of File → New Import… and Edit → Extract Selection to
// Import… (GH #288): writes the fragment file, edits the importing buffer
// through the editor's undoable path, and opens the fragment. Takes the
// validated name as input and never prompts, so a test drives it over a real
// EditorViewController and real files; MainWindow owns the prompts.
// Public interface: ImportCommands.init(editor:storyDirectory:), newImport(named:in:),
// checkSelection(_:in:), extractSelection(_:in:named:).
// Owner context: tools/ide — Editor.

import AppKit

@MainActor
struct ImportCommands {

    let editor: EditorViewController
    /// The folder the `.story` file sits in — import names resolve against it.
    let storyDirectory: URL

    /// Creates an empty `<name>.chord`, inserts `import "<name>"` on its own
    /// line at the caret's line in `url` (story or fragment — imports nest,
    /// and an import arbitrates at its site), and opens the fragment.
    ///
    /// - Returns: the new fragment's URL, or a refusal (the file exists, or
    ///   could not be written). Nothing is edited on the refusing path.
    @discardableResult
    func newImport(named name: String, in url: URL) -> Result<URL, ImportRefactor.Refusal> {
        let fragment = ImportRefactor.fragmentURL(for: name, storyDirectory: storyDirectory)
        if case .failure(let refusal) = createFragment(at: fragment, contents: "") { return .failure(refusal) }
        let text = (editor.currentText(of: url) ?? "") as NSString
        let caret = min(editor.activeSelection?.location ?? 0, text.length)
        let lineStart = text.lineRange(for: NSRange(location: caret, length: 0)).location
        editor.insertText(ImportRefactor.importLine(for: name) + "\n", at: lineStart, in: url)
        editor.openDocument(at: fragment)
        return .success(fragment)
    }

    /// Whether `selection` in `url` can be extracted at all — run before asking
    /// for a name, so the author is refused before they type one.
    func checkSelection(_ selection: NSRange, in url: URL) -> Result<Void, ImportRefactor.Refusal> {
        let source = editor.currentText(of: url) ?? ""
        return ImportRefactor.extraction(from: source, selection: selection, name: "x").map { _ in () }
    }

    /// Moves the whole declarations `selection` touches into a new
    /// `<name>.chord`, puts `import "<name>"` in their place through the
    /// editor's typing path, and opens the fragment. The replacement is an
    /// ordinary edit in the story's tab, but the editor clears a tab's undo
    /// stack when the active tab changes, so once the fragment opens the move
    /// is not undoable with ⌘Z — the fragment on disk is the author's copy.
    ///
    /// - Returns: the new fragment's URL, or a refusal from the snap rules or
    ///   the file write. The buffer is untouched on the refusing path.
    @discardableResult
    func extractSelection(_ selection: NSRange, in url: URL, named name: String) -> Result<URL, ImportRefactor.Refusal> {
        let source = editor.currentText(of: url) ?? ""
        let extraction: ImportRefactor.Extraction
        switch ImportRefactor.extraction(from: source, selection: selection, name: name) {
        case .failure(let refusal): return .failure(refusal)
        case .success(let value): extraction = value
        }
        let fragment = ImportRefactor.fragmentURL(for: name, storyDirectory: storyDirectory)
        if case .failure(let refusal) = createFragment(at: fragment, contents: extraction.fragmentText) { return .failure(refusal) }
        guard editor.replaceText(extraction.replacement, in: extraction.range, in: url) else {
            return .failure(ImportRefactor.Refusal(message: "The selection no longer matches the text."))
        }
        editor.openDocument(at: fragment)
        return .success(fragment)
    }

    /// Writes a new fragment file, refusing to overwrite one that exists.
    private func createFragment(at url: URL, contents: String) -> Result<Void, ImportRefactor.Refusal> {
        if FileManager.default.fileExists(atPath: url.path) {
            return .failure(ImportRefactor.Refusal(message: "\(url.lastPathComponent) already exists in \(url.deletingLastPathComponent().path)."))
        }
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try contents.write(to: url, atomically: true, encoding: .utf8)
            return .success(())
        } catch {
            return .failure(ImportRefactor.Refusal(message: "Could not create \(url.lastPathComponent): \(error.localizedDescription)"))
        }
    }
}
