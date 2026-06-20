// ProjectPaneViewController.swift
// The project pane: a "Files | Structure" segmented toggle over two child views —
// the filesystem tree (ProjectTreeViewController, for raw .ts editing) and the
// Sharpee-aware category view (ProjectStructureViewController, ADR-184). Owns both
// children and forwards their activations/expansions up via closures so the host
// split controller stays thin.
// Public interface: setProject(_:expandedFolderURLs:), setManifest(_:),
//   expandedFolderURLs, onActivateFile, onActivateEntity, onExpansionChanged.
// Owner context: tools/ide — Project.

import AppKit

final class ProjectPaneViewController: NSViewController,
                                       ProjectTreeDelegate, ProjectStructureDelegate {

    /// A leaf file was activated in the Files tree.
    var onActivateFile: ((URL) -> Void)?
    /// An entity was activated in the Structure view.
    var onActivateEntity: ((EntityNode) -> Void)?
    /// The Files tree's expansion changed (persist session).
    var onExpansionChanged: (() -> Void)?

    private enum Tab: Int { case files, structure }

    private let toggle = NSSegmentedControl(labels: ["Files", "Structure"],
                                            trackingMode: .selectOne,
                                            target: nil, action: nil)
    private let filesController = ProjectTreeViewController()
    private let structureController = ProjectStructureViewController()
    private let container = NSView()

    override func loadView() {
        let pane = NSView()
        pane.wantsLayer = true
        pane.layer?.backgroundColor = Theme.projectBackground.cgColor

        filesController.delegate = self
        structureController.delegate = self

        toggle.segmentStyle = .texturedRounded
        toggle.selectedSegment = Tab.files.rawValue
        toggle.target = self
        toggle.action = #selector(toggleChanged(_:))
        toggle.translatesAutoresizingMaskIntoConstraints = false
        container.translatesAutoresizingMaskIntoConstraints = false

        pane.addSubview(toggle)
        pane.addSubview(container)

        addChild(filesController)
        addChild(structureController)
        for child in [filesController.view, structureController.view] {
            child.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(child)
            NSLayoutConstraint.activate([
                child.topAnchor.constraint(equalTo: container.topAnchor),
                child.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                child.trailingAnchor.constraint(equalTo: container.trailingAnchor),
                child.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            ])
        }

        NSLayoutConstraint.activate([
            toggle.topAnchor.constraint(equalTo: pane.topAnchor, constant: 6),
            toggle.leadingAnchor.constraint(equalTo: pane.leadingAnchor, constant: 8),
            toggle.trailingAnchor.constraint(equalTo: pane.trailingAnchor, constant: -8),

            container.topAnchor.constraint(equalTo: toggle.bottomAnchor, constant: 6),
            container.leadingAnchor.constraint(equalTo: pane.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: pane.trailingAnchor),
            container.bottomAnchor.constraint(equalTo: pane.bottomAnchor),
        ])

        view = pane
        showTab(.files)
    }

    // MARK: - Forwarded API (mirrors the former direct ProjectTreeViewController surface)

    func setProject(_ project: Project?, expandedFolderURLs: [URL] = []) {
        filesController.setProject(project, expandedFolderURLs: expandedFolderURLs)
    }

    var expandedFolderURLs: [URL] { filesController.expandedFolderURLs }

    /// Feed the Structure view a fresh manifest (nil → build-gated placeholder).
    func setManifest(_ manifest: ProjectManifest?) {
        structureController.setManifest(manifest)
    }

    // MARK: - Toggle

    @objc private func toggleChanged(_ sender: NSSegmentedControl) {
        showTab(Tab(rawValue: sender.selectedSegment) ?? .files)
    }

    private func showTab(_ tab: Tab) {
        filesController.view.isHidden = (tab != .files)
        structureController.view.isHidden = (tab != .structure)
    }

    // MARK: - Child delegates

    func projectTree(_ controller: ProjectTreeViewController, didActivate node: FileNode) {
        onActivateFile?(node.url)
    }

    func projectTreeDidChangeExpansion(_ controller: ProjectTreeViewController) {
        onExpansionChanged?()
    }

    func projectStructure(_ controller: ProjectStructureViewController, didActivate entity: EntityNode) {
        onActivateEntity?(entity)
    }
}
