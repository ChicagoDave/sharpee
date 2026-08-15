// StoryScaffold.swift
// Creates a new Chord story by rendering the bundled `story.story.template` (the
// same `templates/story-chord` that @sharpee/devkit ships, mirrored into
// Contents/Resources/story-templates by vendor-story-templates.sh) into a chosen
// folder as `<id>.story`. Deliberately writes NO package.json, no src/, no tsconfig —
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

    /// Path of the template relative to the template directory. In the app that
    /// directory is `Contents/Resources`, where vendor-story-templates.sh's
    /// mirror lands as a folder resource — NOT the opt-in vendored toolchain's
    /// `toolchain/devkit/templates/story-chord/` copy (ADR-279 D4), which is
    /// absent from any build that did not set SHARPEE_VENDOR_TOOLCHAIN=1.
    /// Tests pass the devkit source directory directly, so they see the file at
    /// the root and use `templateName`.
    private static let storyTemplate = "story-templates/story.story.template"

    /// The bare filename, which is what the template directory holds when the
    /// caller supplies one (tests, and the devkit source tree).
    private static let templateName = "story.story.template"

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
        // The app bundle carries the mirror as a folder resource; a caller-supplied
        // directory (tests, devkit's own tree) holds the file at its root. Try the
        // folder layout first so the app never picks up a stray root-level copy.
        let candidates: [URL] = [templates.appendingPathComponent(storyTemplate),
                                 templates.appendingPathComponent(templateName)]
        var template: String?
        for candidate in candidates where template == nil {
            template = try? String(contentsOf: candidate, encoding: String.Encoding.utf8)
        }
        guard let raw = template else {
            throw ScaffoldError.templateMissing(templateName)
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
