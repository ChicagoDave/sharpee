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

    // Syntax token colors (P2 — tree-sitter highlighting). Catppuccin-ish on the dark editor bg.
    static let tokenKeyword       = NSColor(srgb: 0xCBA6F7) // mauve
    static let tokenString        = NSColor(srgb: 0xA6E3A1) // green
    static let tokenComment       = NSColor(srgb: 0x6C7086) // overlay/grey
    static let tokenNumber        = NSColor(srgb: 0xFAB387) // peach
    static let tokenType          = NSColor(srgb: 0xF9E2AF) // yellow
    static let tokenFunction      = NSColor(srgb: 0x89B4FA) // blue

    // Bracket-match highlight (P2 step 2.4) — translucent accent behind the matched pair.
    static let bracketMatchBackground = NSColor(srgbRed: 0.54, green: 0.70, blue: 0.98, alpha: 0.28)
}

private extension NSColor {
    convenience init(srgb hex: UInt32) {
        let r = CGFloat((hex >> 16) & 0xFF) / 255.0
        let g = CGFloat((hex >>  8) & 0xFF) / 255.0
        let b = CGFloat( hex        & 0xFF) / 255.0
        self.init(srgbRed: r, green: g, blue: b, alpha: 1.0)
    }
}
