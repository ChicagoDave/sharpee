// TabStripView.swift
// A reusable subtle tab strip (mirrors docs/work/sharpee-ide/mock-bottom-panel.html):
// left-aligned text tabs, the active one with an accent top-bar; optional count badges.
// Used by the bottom panel (Build / Game Errors) and the right panel (Play / Diagnosis / …).
// Public interface: TabStripView (addTab, select, setCount, onSelect, selectedIndex).
// Owner context: tools/ide — UI.

import AppKit

final class TabStripView: NSView {

    static let height: CGFloat = 30

    /// Invoked when a tab is chosen (by click or `select`).
    var onSelect: ((Int) -> Void)?
    private(set) var selectedIndex = 0

    private let stack = NSStackView()
    private var items: [TabItemView] = []

    init() {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = Theme.railBackground.cgColor

        stack.orientation = .horizontal
        stack.spacing = 0
        stack.alignment = .height
        stack.distribution = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)

        let border = NSView()
        border.wantsLayer = true
        border.layer?.backgroundColor = Theme.border.cgColor
        border.translatesAutoresizingMaskIntoConstraints = false
        addSubview(border)

        NSLayoutConstraint.activate([
            heightAnchor.constraint(equalToConstant: Self.height),
            stack.topAnchor.constraint(equalTo: topAnchor),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            border.leadingAnchor.constraint(equalTo: leadingAnchor),
            border.trailingAnchor.constraint(equalTo: trailingAnchor),
            border.bottomAnchor.constraint(equalTo: bottomAnchor),
            border.heightAnchor.constraint(equalToConstant: 1),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("TabStripView is not Storyboard-instantiable")
    }

    /// Appends a tab. The first added tab is selected.
    func addTab(title: String) {
        let index = items.count
        let item = TabItemView()
        item.setTitle(title)
        item.onClick = { [weak self] in self?.select(index) }
        items.append(item)
        stack.addArrangedSubview(item)
        item.setActive(index == selectedIndex)
    }

    func setCount(_ count: Int, forTab index: Int) {
        guard items.indices.contains(index) else { return }
        items[index].setCount(count)
    }

    func select(_ index: Int) {
        guard items.indices.contains(index) else { return }
        selectedIndex = index
        for (i, item) in items.enumerated() { item.setActive(i == index) }
        onSelect?(index)
    }
}

/// A single subtle tab: a text label (+ optional count badge), with an accent bar on top when
/// active. No segmented-control pills.
private final class TabItemView: NSView {

    var onClick: (() -> Void)?

    private let titleLabel = NSTextField(labelWithString: "")
    private let badge = NSTextField(labelWithString: "")
    private let accentBar = NSView()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        accentBar.wantsLayer = true
        accentBar.layer?.backgroundColor = Theme.accent.cgColor
        accentBar.isHidden = true
        accentBar.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.font = NSFont.systemFont(ofSize: 11)
        titleLabel.textColor = Theme.foregroundDim

        badge.font = NSFont.systemFont(ofSize: 10, weight: .semibold)
        badge.textColor = Theme.railBackground
        badge.alignment = .center
        badge.wantsLayer = true
        badge.layer?.backgroundColor = NSColor.systemRed.cgColor
        badge.layer?.cornerRadius = 7
        badge.isHidden = true

        let row = NSStackView(views: [titleLabel, badge])
        row.orientation = .horizontal
        row.spacing = 6
        row.translatesAutoresizingMaskIntoConstraints = false

        addSubview(row)
        addSubview(accentBar)

        NSLayoutConstraint.activate([
            row.centerYAnchor.constraint(equalTo: centerYAnchor),
            row.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            row.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
            accentBar.topAnchor.constraint(equalTo: topAnchor),
            accentBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            accentBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            accentBar.heightAnchor.constraint(equalToConstant: 2),
            badge.heightAnchor.constraint(equalToConstant: 14),
            badge.widthAnchor.constraint(greaterThanOrEqualToConstant: 16),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("TabItemView is not Storyboard-instantiable")
    }

    func setTitle(_ title: String) { titleLabel.stringValue = title }

    func setCount(_ count: Int) {
        badge.stringValue = "\(count)"
        badge.isHidden = count <= 0
    }

    func setActive(_ active: Bool) {
        accentBar.isHidden = !active
        titleLabel.textColor = active ? Theme.foreground : Theme.foregroundDim
        layer?.backgroundColor = (active ? Theme.playBackground : .clear).cgColor
    }

    override func mouseDown(with event: NSEvent) {
        onClick?()
    }
}
