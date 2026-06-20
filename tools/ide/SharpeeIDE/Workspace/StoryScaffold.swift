// StoryScaffold.swift
// Creates a new author story project by copying the bundled story template (the same
// `templates/story` that @sharpee/devkit ships) into a chosen folder, substituting the
// author's title/author/description and the platform version ranges. The IDE's "New
// Story…" command uses this so authors can scaffold a project entirely within the IDE,
// with no global CLI required (ADR-185).
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

    /// The dependency range scaffolded projects pin (the current platform major line). Matches
    /// what `sharpee init` injects; `^1.x` resolves to the latest published 1.x on install.
    private static let platformRange = "^1.0.0"

    /// Template file → destination within the project.
    private static let files: [(template: String, dest: String)] = [
        ("index.ts.template", "src/index.ts"),
        ("package.json.template", "package.json"),
        ("tsconfig.json.template", "tsconfig.json"),
    ]

    private static let gitignore = """
    node_modules/
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

    /// Scaffold a story project into `dir` from `templateDirectory` (defaults to the app
    /// bundle's resources). Creates `dir` if needed; throws if it exists and is non-empty.
    static func create(in dir: URL, info: Info, templateDirectory: URL? = nil) throws {
        let fm = FileManager.default
        let templates = templateDirectory ?? Bundle.main.resourceURL ?? Bundle.main.bundleURL

        if fm.fileExists(atPath: dir.path) {
            let entries = (try? fm.contentsOfDirectory(atPath: dir.path)) ?? []
            if entries.contains(where: { !$0.hasPrefix(".") }) {
                throw ScaffoldError.directoryNotEmpty(dir)
            }
        }
        try fm.createDirectory(at: dir.appendingPathComponent("src"), withIntermediateDirectories: true)

        let id = storyId(from: info.title)
        for file in files {
            let src = templates.appendingPathComponent(file.template)
            guard let raw = try? String(contentsOf: src, encoding: .utf8) else {
                throw ScaffoldError.templateMissing(file.template)
            }
            let rendered = substitute(raw, info: info, id: id)
            try rendered.write(to: dir.appendingPathComponent(file.dest), atomically: true, encoding: .utf8)
        }
        try gitignore.write(to: dir.appendingPathComponent(".gitignore"), atomically: true, encoding: .utf8)
    }

    private static func substitute(_ content: String, info: Info, id: String) -> String {
        content
            .replacingOccurrences(of: "{{STORY_ID}}", with: id)
            .replacingOccurrences(of: "{{STORY_TITLE}}", with: info.title)
            .replacingOccurrences(of: "{{AUTHOR}}", with: info.author)
            .replacingOccurrences(of: "{{DESCRIPTION}}", with: info.description)
            .replacingOccurrences(of: "{{SHARPEE_VERSION}}", with: platformRange)
            .replacingOccurrences(of: "{{DEVKIT_VERSION}}", with: platformRange)
    }
}
