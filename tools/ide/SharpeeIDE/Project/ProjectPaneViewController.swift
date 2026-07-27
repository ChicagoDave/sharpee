// ProjectPaneViewController.swift
// The project pane: the filesystem tree (ProjectTreeViewController). The former
// "Structure" toggle is gone — the story's entity/reference view is the right
// panel's Index tab (one IR rendering, not two; David's ruling).
// Public interface: setProject(_:expandedFolderURLs:), expandedFolderURLs,
//   onActivateFile, onExpansionChanged.
// Owner context: tools/ide — Project.

import AppKit

final class ProjectPaneViewController: NSViewController, ProjectTreeDelegate {

    /// A leaf file was activated in the Files tree.
    var onActivateFile: ((URL) -> Void)?
    /// The Files tree's expansion changed (persist session).
    var onExpansionChanged: (() -> Void)?

    private let filesController = ProjectTreeViewController()

    override func loadView() {
        let pane = ThemedPane(color: Theme.projectBackground)

        filesController.delegate = self

        addChild(filesController)
        filesController.view.translatesAutoresizingMaskIntoConstraints = false
        pane.addSubview(filesController.view)

        NSLayoutConstraint.activate([
            filesController.view.topAnchor.constraint(equalTo: pane.topAnchor, constant: 6),
            filesController.view.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            filesController.view.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            filesController.view.bottomAnchor.constraint(equalTo: pane.bottomAnchor),
        ])

        view = pane
    }

    func setProject(_ project: Project?, expandedFolderURLs: [URL] = []) {
        filesController.setProject(project, expandedFolderURLs: expandedFolderURLs)
    }

    var expandedFolderURLs: [URL] { filesController.expandedFolderURLs }

    // MARK: - Child delegate

    func projectTree(_ controller: ProjectTreeViewController, didActivate node: FileNode) {
        onActivateFile?(node.url)
    }

    func projectTreeDidChangeExpansion(_ controller: ProjectTreeViewController) {
        onExpansionChanged?()
    }
}
