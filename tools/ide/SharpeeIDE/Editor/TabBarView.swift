// TabBarView.swift
// Horizontal tab strip rendered above the editor's text view.
// Public interface: setTabs(_:activeIndex:) replaces the visible cells; onSelect/onClose closures
// fire when the user clicks a tab body or its close button.
// Owner context: tools/ide — Editor pane.

import AppKit

struct TabModel {
    let title: String
    let isDirty: Bool
}

final class TabBarView: NSView {

    static let height: CGFloat = 28

    var onSelect: ((Int) -> Void)?
    var onClose: ((Int) -> Void)?

    private let stackView = NSStackView()
    private let bottomBorder = NSView()

    private(set) var tabs: [TabModel] = []
    private(set) var activeIndex: Int?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        commonInit()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        wantsLayer = true
        layer?.backgroundColor = Theme.projectBackground.cgColor

        stackView.orientation = .horizontal
        stackView.spacing = 0
        stackView.alignment = .top
        stackView.distribution = .fill
        stackView.translatesAutoresizingMaskIntoConstraints = false

        bottomBorder.wantsLayer = true
        bottomBorder.layer?.backgroundColor = Theme.border.cgColor
        bottomBorder.translatesAutoresizingMaskIntoConstraints = false

        addSubview(stackView)
        addSubview(bottomBorder)

        // Stack has no trailing constraint, so it stays at the sum of its cells' intrinsic widths.
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: topAnchor),
            stackView.leadingAnchor.constraint(equalTo: leadingAnchor),
            stackView.bottomAnchor.constraint(equalTo: bottomBorder.topAnchor),

            bottomBorder.heightAnchor.constraint(equalToConstant: 1),
            bottomBorder.leadingAnchor.constraint(equalTo: leadingAnchor),
            bottomBorder.trailingAnchor.constraint(equalTo: trailingAnchor),
            bottomBorder.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    /// Replaces the visible cells with a fresh batch and applies the active highlight.
    func setTabs(_ newTabs: [TabModel], activeIndex: Int?) {
        tabs = newTabs
        self.activeIndex = activeIndex

        for view in stackView.arrangedSubviews {
            stackView.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        for (index, tab) in newTabs.enumerated() {
            let cell = TabCellView(title: tab.title,
                                   isActive: index == activeIndex,
                                   isDirty: tab.isDirty)
            cell.onSelect = { [weak self] in self?.onSelect?(index) }
            cell.onClose = { [weak self] in self?.onClose?(index) }
            stackView.addArrangedSubview(cell)
        }
    }
}

// MARK: - Tab cell

private final class TabCellView: NSView {

    var onSelect: (() -> Void)?
    var onClose: (() -> Void)?

    private let label = NSTextField(labelWithString: "")
    private let closeButton = NSButton()
    private let separator = NSView()

    init(title: String, isActive: Bool, isDirty: Bool) {
        super.init(frame: .zero)

        wantsLayer = true
        layer?.backgroundColor = (isActive ? Theme.editorBackground : Theme.projectBackground).cgColor

        label.stringValue = title
        label.font = NSFont.systemFont(ofSize: 12, weight: isActive ? .medium : .regular)
        label.textColor = isActive ? Theme.foreground : Theme.foregroundDim
        label.lineBreakMode = .byTruncatingMiddle
        label.maximumNumberOfLines = 1
        label.translatesAutoresizingMaskIntoConstraints = false

        closeButton.isBordered = false
        closeButton.bezelStyle = .accessoryBarAction
        closeButton.attributedTitle = NSAttributedString(
            string: "×",
            attributes: [
                .foregroundColor: Theme.foregroundDim,
                .font: NSFont.systemFont(ofSize: 14, weight: .regular),
            ]
        )
        closeButton.target = self
        closeButton.action = #selector(closeClicked)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        separator.wantsLayer = true
        separator.layer?.backgroundColor = Theme.border.cgColor
        separator.translatesAutoresizingMaskIntoConstraints = false

        addSubview(label)
        addSubview(closeButton)
        addSubview(separator)

        // Common constraints: cell height, label vertical centering and trailing edge,
        // close button on the right, separator at the right edge.
        NSLayoutConstraint.activate([
            heightAnchor.constraint(equalToConstant: TabBarView.height - 1),

            label.centerYAnchor.constraint(equalTo: centerYAnchor),
            label.trailingAnchor.constraint(equalTo: closeButton.leadingAnchor, constant: -4),

            closeButton.trailingAnchor.constraint(equalTo: separator.leadingAnchor, constant: -8),
            closeButton.centerYAnchor.constraint(equalTo: centerYAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 16),
            closeButton.heightAnchor.constraint(equalToConstant: 16),

            separator.widthAnchor.constraint(equalToConstant: 1),
            separator.topAnchor.constraint(equalTo: topAnchor),
            separator.bottomAnchor.constraint(equalTo: bottomAnchor),
            separator.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])

        // Leading edge: a dirty marker dot (when applicable) precedes the label.
        if isDirty {
            let dot = NSView()
            dot.wantsLayer = true
            dot.layer?.backgroundColor = (isActive ? Theme.foreground : Theme.foregroundDim).cgColor
            dot.layer?.cornerRadius = 3
            dot.translatesAutoresizingMaskIntoConstraints = false
            addSubview(dot)

            NSLayoutConstraint.activate([
                dot.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
                dot.centerYAnchor.constraint(equalTo: centerYAnchor),
                dot.widthAnchor.constraint(equalToConstant: 6),
                dot.heightAnchor.constraint(equalToConstant: 6),
                label.leadingAnchor.constraint(equalTo: dot.trailingAnchor, constant: 6),
            ])
        } else {
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12).isActive = true
        }
    }

    required init?(coder: NSCoder) {
        fatalError("TabCellView is not Storyboard-instantiable")
    }

    override func mouseDown(with event: NSEvent) {
        // Clicks on the close button are routed to NSButton via hit testing — they never reach here.
        onSelect?()
    }

    @objc private func closeClicked() {
        onClose?()
    }
}
