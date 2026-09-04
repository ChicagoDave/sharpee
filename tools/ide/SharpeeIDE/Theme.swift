// Theme.swift
// Colour tokens for the Sharpee IDE shell — DYNAMIC: each token resolves per
// the effective appearance (dark: the original Catppuccin-ish palette from
// mock-v1.html; light: its Catppuccin Latte counterpart). The app follows the
// system appearance; layer-backed surfaces re-resolve via updateLayer
// (ThemedPane / per-view overrides), text re-resolves at draw time.
// Public interface: NSColor static accessors for named UI surfaces.
// Owner context: tools/ide — App shell.

import AppKit

enum Theme {
    static let railBackground     = dynamic(light: 0xDCE0E8, dark: 0x16171D)
    static let projectBackground  = dynamic(light: 0xE6E9EF, dark: 0x262832)
    static let editorBackground   = dynamic(light: 0xEFF1F5, dark: 0x1E1F26)
    static let playBackground     = dynamic(light: 0xE6E9EF, dark: 0x13141A)
    static let border             = dynamic(light: 0xACB0BE, dark: 0x3A3C48)
    static let foreground         = dynamic(light: 0x4C4F69, dark: 0xD8D9E0)
    static let foregroundDim      = dynamic(light: 0x6C6F85, dark: 0x8E90A0)
    static let foregroundFaint    = dynamic(light: 0x9CA0B0, dark: 0x5C5F6D)
    static let accent             = dynamic(light: 0x1E66F5, dark: 0x89B4FA)
    static let statusBarText      = dynamic(light: 0xEFF1F5, dark: 0x11131A)

    // Syntax token colors (ChordLexer highlighting, ADR-258 D7).
    // Dark: Catppuccin Mocha-ish. Light: Catppuccin Latte.
    static let tokenKeyword       = dynamic(light: 0x8839EF, dark: 0xCBA6F7) // mauve
    static let tokenString        = dynamic(light: 0x40A02B, dark: 0xA6E3A1) // green
    static let tokenComment       = dynamic(light: 0x8C8FA1, dark: 0x6C7086) // overlay/grey
    static let tokenNumber        = dynamic(light: 0xFE640B, dark: 0xFAB387) // peach
    static let tokenType          = dynamic(light: 0xDF8E1D, dark: 0xF9E2AF) // yellow
    static let tokenFunction      = dynamic(light: 0x1E66F5, dark: 0x89B4FA) // blue

    // World tab tokens (ADR-321 D7/D8). Every one is a PAIR: ADR-297's
    // consequence is that a single-appearance hex literal in a view is a defect,
    // and these carry meaning (sealed, unreached, candidate) rather than chrome,
    // so they are named for what they mean and not for the colour they are.
    // Dark: Catppuccin Mocha. Light: Catppuccin Latte.
    static let worldSealed            = dynamic(light: 0xD20F39, dark: 0xF38BA8) // red — an exit that never opens
    static let worldUnreached         = dynamic(light: 0x7C7F93, dark: 0x7F849C) // grey — play never arrives
    static let worldCandidate         = dynamic(light: 0xFE640B, dark: 0xFAB387) // peach — a phrase to look at
    static let worldAmbiguous         = dynamic(light: 0xDF8E1D, dark: 0xF9E2AF) // yellow — a phrase reaching two things
    static let worldConnection        = dynamic(light: 0x9CA0B0, dark: 0x585B70) // an open passage between rooms
    static let worldDoor              = dynamic(light: 0x179299, dark: 0x94E2D5) // teal — a passage with a door in it
    static let worldRoomFill          = dynamic(light: 0xEFF1F5, dark: 0x1E1F26) // a placed room's box
    static let worldRoomFillUnreached = dynamic(light: 0xE6E9EF, dark: 0x181920) // one play cannot arrive at
    static let worldDisplaced         = dynamic(light: 0x8839EF, dark: 0xCBA6F7) // mauve — moved off its compass cell

    /// Editor selection background — translucent accent.
    static let selectionBackground = NSColor(name: nil) { appearance in
        appearance.isDark
            ? NSColor(srgbRed: 0.30, green: 0.40, blue: 0.60, alpha: 0.50)
            : NSColor(srgbRed: 0.12, green: 0.40, blue: 0.96, alpha: 0.22)
    }

    /// Bracket-match highlight (P2 step 2.4) — translucent accent behind the matched pair.
    static let bracketMatchBackground = NSColor(name: nil) { appearance in
        appearance.isDark
            ? NSColor(srgbRed: 0.54, green: 0.70, blue: 0.98, alpha: 0.28)
            : NSColor(srgbRed: 0.12, green: 0.40, blue: 0.96, alpha: 0.18)
    }

    private static func dynamic(light: UInt32, dark: UInt32) -> NSColor {
        NSColor(name: nil) { appearance in
            NSColor(srgb: appearance.isDark ? dark : light)
        }
    }
}

private extension NSAppearance {
    var isDark: Bool {
        bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
    }
}

private extension NSColor {
    convenience init(srgb hex: UInt32) {
        let r = CGFloat((hex >> 16) & 0xFF) / 255.0
        let g = CGFloat((hex >>  8) & 0xFF) / 255.0
        let b = CGFloat( hex        & 0xFF) / 255.0
        self.init(srgbRed: r, green: g, blue: b, alpha: 1.0)
    }
}
