// StoryScaffold.swift
// Creates a new Chord story by rendering the bundled `story.story.template` (the
// same `templates/story-chord` that @sharpee/devkit ships) into a chosen folder
// as `<id>.story`. Deliberately writes NO package.json, no src/, no tsconfig —
// a `.story` needs none of them (ADR-258 D2), diverging from `sharpee init`'s
// current Chord scaffold, which still writes a package.json.
// Public interface: StoryScaffold.create(in:info:templateDirectory:), storyId(from:).
// Owner context: tools/ide — Workspace.

import Foundation

enum StoryScaffold {

    /// The author-provided metadata for a new story.
    struct Info {
        let title: String
        let author: String
        let description: String
    }

    enum ScaffoldError: LocalizedError {
        case templateMissing(String)
        case directoryNotEmpty(URL)

        var errorDescription: String? {
            switch self {
            case .templateMissing(let name): return "Story template is missing: \(name)"
            case .directoryNotEmpty(let url): return "“\(url.lastPathComponent)” is not empty."
            }
        }
    }

    private static let storyTemplate = "story.story.template"

    private static let gitignore = """
    dist/
    *.log
    .DS_Store
    """

    /// Convert a title to a kebab-case package id (e.g. "The Lost Key" → "the-lost-key").
    static func storyId(from title: String) -> String {
        let id = title.lowercased()
            .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
            .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return id.isEmpty ? "my-story" : id
    }

    /// Scaffold a story into `dir` from `templateDirectory` (defaults to the app
    /// bundle's resources): renders `story.story.template` to `<id>.story` plus a
    /// minimal .gitignore. Creates `dir` if needed; throws if it exists and is
    /// non-empty.
    static func create(in dir: URL, info: Info, templateDirectory: URL? = nil) throws {
        let fm = FileManager.default
        let templates = templateDirectory ?? Bundle.main.resourceURL ?? Bundle.main.bundleURL

        if fm.fileExists(atPath: dir.path) {
            let entries = (try? fm.contentsOfDirectory(atPath: dir.path)) ?? []
            if entries.contains(where: { !$0.hasPrefix(".") }) {
                throw ScaffoldError.directoryNotEmpty(dir)
            }
        }
        try fm.createDirectory(at: dir, withIntermediateDirectories: true)

        let id = storyId(from: info.title)
        let src = templates.appendingPathComponent(storyTemplate)
        guard let raw = try? String(contentsOf: src, encoding: .utf8) else {
            throw ScaffoldError.templateMissing(storyTemplate)
        }
        // ADR-309 D2: the story is BORN with identity. The config sidecar is
        // written first and the header rendered from the same value — the
        // config is canon, the line is its rendering, and they agree from the
        // first byte on disk. (`sharpee init` does exactly this, in the same
        // order: two hosts, one behavior.)
        let storyURL = dir.appendingPathComponent("\(id).story")
        let ifid = StoryHeaderIFID.mint()
        try StoryConfigStore.mint(for: storyURL, ifid: ifid)

        let rendered = substitute(raw, info: info, id: id, ifid: ifid)
        try rendered.write(to: storyURL, atomically: true, encoding: .utf8)
        try gitignore.write(to: dir.appendingPathComponent(".gitignore"), atomically: true, encoding: .utf8)
    }

    private static func substitute(_ content: String, info: Info, id: String, ifid: String) -> String {
        content
            .replacingOccurrences(of: "{{STORY_ID}}", with: id)
            .replacingOccurrences(of: "{{STORY_TITLE}}", with: info.title)
            .replacingOccurrences(of: "{{AUTHOR}}", with: info.author)
            .replacingOccurrences(of: "{{IFID}}", with: ifid)
            .replacingOccurrences(of: "{{DESCRIPTION}}", with: info.description)
    }
}
