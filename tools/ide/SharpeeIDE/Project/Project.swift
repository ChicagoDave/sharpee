// Project.swift
// Models a Sharpee story project — the open folder root and a lazy filesystem tree of its contents.
// Public interface: Project (the loaded root), FileNode (a tree node, directory or file).
// Owner context: tools/ide — Project model. UI-free; safe to unit-test.

import Foundation

/// A loaded Sharpee project. Holds the root URL and the lazily-built tree.
final class Project {

    /// Folder names skipped during tree traversal. Hidden files (dotfiles) are skipped separately.
    static let defaultIgnoredNames: Set<String> = [
        "node_modules",
        "dist",
        "build",
        ".git",
        ".turbo",
        ".next",
        "DerivedData",
        ".DS_Store",
    ]

    let rootURL: URL
    let rootNode: FileNode

    init(rootURL: URL, ignoredNames: Set<String> = Project.defaultIgnoredNames) {
        self.rootURL = rootURL
        self.rootNode = FileNode(url: rootURL, isDirectory: true, ignoredNames: ignoredNames)
    }

    var name: String {
        rootURL.lastPathComponent
    }
}

/// A node in the project's filesystem tree. Directory children are loaded on first access.
final class FileNode {

    let url: URL
    let isDirectory: Bool
    private let ignoredNames: Set<String>
    private var loadedChildren: [FileNode]?

    init(url: URL, isDirectory: Bool, ignoredNames: Set<String> = Project.defaultIgnoredNames) {
        self.url = url
        self.isDirectory = isDirectory
        self.ignoredNames = ignoredNames
    }

    var name: String {
        url.lastPathComponent
    }

    /// Lazy-loaded children. Empty for files. Cached after first access.
    var children: [FileNode] {
        if let cached = loadedChildren { return cached }
        guard isDirectory else {
            loadedChildren = []
            return []
        }
        let loaded = loadChildren()
        loadedChildren = loaded
        return loaded
    }

    /// Force a re-read of this node's children on next access.
    func invalidateChildren() {
        loadedChildren = nil
    }

    private func loadChildren() -> [FileNode] {
        let fm = FileManager.default
        let urls: [URL]
        do {
            urls = try fm.contentsOfDirectory(
                at: url,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsHiddenFiles]
            )
        } catch {
            return []
        }

        let nodes = urls.compactMap { childURL -> FileNode? in
            if ignoredNames.contains(childURL.lastPathComponent) { return nil }
            let isDir = (try? childURL.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
            return FileNode(url: childURL, isDirectory: isDir, ignoredNames: ignoredNames)
        }

        return nodes.sorted { lhs, rhs in
            if lhs.isDirectory != rhs.isDirectory {
                return lhs.isDirectory   // directories first
            }
            return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
        }
    }
}
