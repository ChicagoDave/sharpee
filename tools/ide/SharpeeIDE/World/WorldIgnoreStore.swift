// WorldIgnoreStore.swift
// The phrases an author has told the World tab to stop reporting.
//
// A candidate list read out of prose by heuristic will always name things the author
// meant to leave as words (ADR-321 D6). Saying so once must be permanent, or the list
// re-accuses on every build and the author learns to ignore the whole surface instead
// of one row of it.
//
// IT LIVES WITH THE STORY, NOT WITH THE WINDOW. Ignoring *the word* is a decision
// about this story, not about this Mac: it belongs beside the `.story` file, diffable
// and committed, so it survives a new machine and travels to whoever else opens the
// project. `SessionState` is for window geometry; this is authored content.
//
// IGNORING IS BY PHRASE, STORY-WIDE. *the word* occurs five times in Ides of March,
// and an author dismissing it means the phrase, not the fifth row of it.
// Public interface: WorldIgnoreStore(storyURL:), ignored, contains(_:), toggle(_:).
// Owner context: tools/ide — World.

import Foundation

struct WorldIgnoreStore {

    /// The file's shape, versioned so a later reader can tell what it is holding.
    private struct Document: Codable {
        var version: Int
        var ignored: [String]
    }

    /// The phrases to leave out, lowercased.
    private(set) var ignored: Set<String>

    /// Where the list is kept — nil when there is no story to keep it beside.
    private let url: URL?

    /// Opens the list for one story, reading it if it is there.
    ///
    /// A missing or unreadable file is an EMPTY list, never an error: an author who
    /// has ignored nothing has no file, and a corrupt one must not take the World tab
    /// down with it.
    ///
    /// - Parameter storyURL: the `.story` file, or nil when no story is open
    init(storyURL: URL?) {
        url = storyURL.map(Self.listURL(for:))
        guard let url, let data = try? Data(contentsOf: url),
              let document = try? JSONDecoder().decode(Document.self, from: data) else {
            ignored = []
            return
        }
        ignored = Set(document.ignored.map { $0.lowercased() })
    }

    /// Where one story's list sits: beside the story, named after it.
    /// - Parameter storyURL: the `.story` file
    /// - Returns: the list's path
    static func listURL(for storyURL: URL) -> URL {
        storyURL.deletingPathExtension().appendingPathExtension("world-ignore.json")
    }

    /// Whether a phrase has been ignored.
    /// - Parameter phrase: the phrase as the finding names it
    /// - Returns: true when the author has dismissed it
    func contains(_ phrase: String) -> Bool {
        ignored.contains(phrase.lowercased())
    }

    /// Ignores a phrase, or stops ignoring one, and writes the list.
    ///
    /// Writes on every change rather than on close: the author's next act may be to
    /// quit, and a dismissal that did not survive it would have to be made twice.
    ///
    /// - Parameter phrase: the phrase to toggle
    /// - Returns: true when the phrase is ignored after the toggle
    @discardableResult
    mutating func toggle(_ phrase: String) -> Bool {
        let key = phrase.lowercased()
        let nowIgnored: Bool
        if ignored.contains(key) {
            ignored.remove(key)
            nowIgnored = false
        } else {
            ignored.insert(key)
            nowIgnored = true
        }
        write()
        return nowIgnored
    }

    /// Persists the list, or removes the file when nothing is ignored.
    ///
    /// An empty list is no file at all: a project that ignores nothing should carry
    /// nothing, and an empty artifact in a repository is a question someone has to ask.
    private func write() {
        guard let url else { return }
        if ignored.isEmpty {
            try? FileManager.default.removeItem(at: url)
            return
        }
        let document = Document(version: 1, ignored: ignored.sorted())
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(document) else { return }
        try? data.write(to: url, options: .atomic)
    }
}
