// Theme.swift
// Colour tokens for the Sharpee IDE shell, mirroring docs/work/sharpee-ide/mock-v1.html.
// Public interface: NSColor static accessors for named UI surfaces.
// Owner context: tools/ide — App shell.

import AppKit

enum Theme {
    static let railBackground     = NSColor(srgb: 0x16171D)
    static let projectBackground  = NSColor(srgb: 0x262832)
    static let editorBackground   = NSColor(srgb: 0x1E1F26)
    static let playBackground     = NSColor(srgb: 0x13141A)
    static let border             = NSColor(srgb: 0x3A3C48)
    static let foreground         = NSColor(srgb: 0xD8D9E0)
    static let foregroundDim      = NSColor(srgb: 0x8E90A0)
    static let foregroundFaint    = NSColor(srgb: 0x5C5F6D)
    static let accent             = NSColor(srgb: 0x89B4FA)
    static let statusBarText      = NSColor(srgb: 0x11131A)
}

private extension NSColor {
    convenience init(srgb hex: UInt32) {
        let r = CGFloat((hex >> 16) & 0xFF) / 255.0
        let g = CGFloat((hex >>  8) & 0xFF) / 255.0
        let b = CGFloat( hex        & 0xFF) / 255.0
        self.init(srgbRed: r, green: g, blue: b, alpha: 1.0)
    }
}
