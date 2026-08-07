// ProjectArtifacts.swift
// Classifies an open project's contents into the typed artifact groups the
// sidebar presents (ADR-280 D1): Story, Walkthroughs, Transcript Tests, Assets,
// Web Template, Other. Groups are typed LENSES over the real folder, not folder
// mirrors — Web Template draws from two different on-disk locations (the
// `<storyId>.templates` file beside the story, and the `browser/` escape
// hatches) and Transcript Tests reaches through `tests/` to
// `tests/transcripts/`. The view is open, not strict: anything matching no type
// lands in Other, never hidden and never dropped.
//
// ADR-299 D7's "Play Testing" group was removed with the `.skein` artifact it
// existed to hold (ADR-300). A `play-testing/` directory an author still has on
// disk now lands in Other, which is the open-view rule doing its job rather
// than a special case needing to survive.
// Public interface: ProjectArtifacts.groups(for:), ArtifactGroup, ArtifactGroup.Kind.
// Owner context: tools/ide — Project model. UI-free; safe to unit-test.

import Foundation

/// One typed group of a project's artifacts, as presented in the sidebar.
///
/// A reference type because NSOutlineView identifies rows by object identity —
/// expansion state and selection would not survive a value type.
final class ArtifactGroup {

    /// The artifact types ADR-280 D1 names, in the order the sidebar shows them.
    enum Kind: CaseIterable {
        case story
        case walkthroughs
        case transcriptTests
        case assets
        case feelies
        case webTemplate
        case other

        var displayName: String {
            switch self {
            case .story: return "Story"
            case .walkthroughs: return "Walkthroughs"
            case .transcriptTests: return "Transcript Tests"
            case .assets: return "Assets"
            case .feelies: return "Feelies"
            case .webTemplate: return "Web Template"
            case .other: return "Other"
            }
        }

        /// SF Symbol shown on the group row. Groups have no file to take an icon from.
        var symbolName: String {
            switch self {
            case .story: return "book.closed"
            case .walkthroughs: return "figure.walk"
            case .transcriptTests: return "checkmark.circle"
            case .assets: return "photo"
            case .feelies: return "envelope"
            case .webTemplate: return "rectangle.3.group"
            case .other: return "folder"
            }
        }
    }

    let kind: Kind

    /// The group's contents, in sidebar order. `FileNode`s, so directories keep
    /// their own lazily-loaded children and the existing row rendering applies.
    let members: [FileNode]

    /// The folder backing this group, when one exists — what "Reveal in Finder"
    /// selects for the group row. Nil for groups assembled from scattered files
    /// (Story, Web Template), which reveal the project root instead.
    let directoryURL: URL?

    init(kind: Kind, members: [FileNode], directoryURL: URL? = nil) {
        self.kind = kind
        self.members = members
        self.directoryURL = directoryURL
    }

    var displayName: String { kind.displayName }
}

enum ProjectArtifacts {

    private static let walkthroughsDirectory = "walkthroughs"
    private static let testsDirectory = "tests"
    private static let transcriptsDirectory = "transcripts"
    private static let assetsDirectory = "assets"
    /// Player-facing extras shipped beside the game (ADR-284) — a map, a
    /// letter, a newspaper clipping. Distinct from `assets/`, which is media
    /// the STORY consumes.
    private static let feeliesDirectory = "feelies"
    private static let browserDirectory = "browser"
    private static let templatesExtension = "templates"
    private static let storyExtension = "story"

    /// The typed groups for `project`, in ADR-280 D1 order.
    ///
    /// - Parameter project: the open project; its root node supplies the tree.
    /// - Returns: only the groups that actually have members. An artifact type
    ///   with nothing on disk yields no group rather than an empty one — a
    ///   listed group would imply a folder that isn't there. Once `sharpee init`
    ///   seeds the full set (ADR-280 D3), a new project shows all of them.
    static func groups(for project: Project) -> [ArtifactGroup] {
        // The story id anchors the two name-derived artifacts (`<id>.templates`,
        // `browser/<id>.css`). Resolved by StoryTarget so the sidebar and the
        // rest of the IDE agree on which `.story` a folder is organized around.
        let storyId = StoryTarget.storyFile(in: project.rootURL)?
            .deletingPathExtension().lastPathComponent

        var story: [FileNode] = []
        var walkthroughs: [FileNode] = []
        var transcriptTests: [FileNode] = []
        var assets: [FileNode] = []
        var feelies: [FileNode] = []
        var webTemplate: [FileNode] = []
        var other: [FileNode] = []

        var walkthroughsURL: URL?
        var transcriptTestsURL: URL?
        var assetsURL: URL?
        var feeliesURL: URL?

        for node in project.rootNode.children {
            switch classify(node, storyId: storyId) {
            case .story:
                story.append(node)
            case .walkthroughs:
                walkthroughs.append(contentsOf: node.children)
                walkthroughsURL = node.url
            case .assets:
                assets.append(contentsOf: node.children)
                assetsURL = node.url
            case .feelies:
                feelies.append(contentsOf: node.children)
                feeliesURL = node.url
            case .webTemplate:
                webTemplate.append(node)
            case .tests:
                // Reach through `tests/` for `tests/transcripts/` (ADR-277 D1/D3
                // fixes both names). Anything else under `tests/` is unclassified
                // rather than hidden.
                for child in node.children {
                    if child.isDirectory && child.name == transcriptsDirectory {
                        transcriptTests.append(contentsOf: child.children)
                        transcriptTestsURL = child.url
                    } else {
                        other.append(child)
                    }
                }
            case .browser:
                // The styling and raw-page escapes are Web Template; anything
                // else an author has parked in browser/ is unclassified.
                for child in node.children {
                    if isBrowserEscape(child, storyId: storyId) {
                        webTemplate.append(child)
                    } else {
                        other.append(child)
                    }
                }
            case .unclassified:
                other.append(node)
            }
        }

        let built: [(ArtifactGroup.Kind, [FileNode], URL?)] = [
            (.story, story, nil),
            (.walkthroughs, walkthroughs, walkthroughsURL),
            (.transcriptTests, transcriptTests, transcriptTestsURL),
            (.assets, assets, assetsURL),
            (.feelies, feelies, feeliesURL),
            (.webTemplate, webTemplate, nil),
            (.other, other, nil),
        ]

        return built.compactMap { kind, members, directoryURL in
            members.isEmpty ? nil : ArtifactGroup(kind: kind, members: members, directoryURL: directoryURL)
        }
    }

    /// What a top-level entry is, before its contents are considered.
    private enum TopLevelKind {
        case story
        case walkthroughs
        case assets
        case feelies
        case webTemplate
        case tests
        case browser
        case unclassified
    }

    private static func classify(_ node: FileNode, storyId: String?) -> TopLevelKind {
        if node.isDirectory {
            switch node.name {
            case walkthroughsDirectory: return .walkthroughs
            case assetsDirectory: return .assets
            case feeliesDirectory: return .feelies
            case testsDirectory: return .tests
            case browserDirectory: return .browser
            default: return .unclassified
            }
        }
        if node.url.pathExtension == storyExtension { return .story }
        // The layout file is story-named (ADR-286 Q-2: one `<storyId>.templates`
        // per story, beside the `.story` file).
        if node.url.pathExtension == templatesExtension,
           node.url.deletingPathExtension().lastPathComponent == storyId {
            return .webTemplate
        }
        return .unclassified
    }

    /// The two `browser/` escape hatches ADR-280 D1 folds into Web Template: the
    /// story's css styling override, and the raw `index.html` page used under
    /// `use html`.
    private static func isBrowserEscape(_ node: FileNode, storyId: String?) -> Bool {
        guard !node.isDirectory else { return false }
        if node.name == "index.html" { return true }
        return node.url.pathExtension == "css"
            && node.url.deletingPathExtension().lastPathComponent == storyId
    }
}
