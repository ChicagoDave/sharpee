// ThemedPane.swift
// A layer-backed view whose background is a DYNAMIC theme color, re-resolved on
// every appearance change via the supported updateLayer path — assigning a
// dynamic NSColor's cgColor once at init freezes whichever appearance was
// current, which is exactly the light-mode bug this class exists to prevent.
// Layer decoration set externally (cornerRadius) is preserved: updateLayer only
// touches backgroundColor.
// Public interface: ThemedPane(color:), color.
// Owner context: tools/ide — UI.

import AppKit

final class ThemedPane: NSView {

    /// The dynamic background color; reassigning re-applies on next display.
    var color: NSColor {
        didSet { needsDisplay = true }
    }

    init(color: NSColor) {
        self.color = color
        super.init(frame: .zero)
        wantsLayer = true
    }

    required init?(coder: NSCoder) {
        fatalError("ThemedPane is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = color.cgColor
    }
}
