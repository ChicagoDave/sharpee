// FontPreference.swift
// The reader-facing type choice for the story pane and the right-panel text
// surfaces (David's ruling): family Courier / Arial / Georgia, size S/M/L/XL,
// persisted in UserDefaults, broadcast via a notification so live surfaces
// re-render. Chord is prose — the editor is allowed a proportional serif.
// Code-like identifiers (phrase keys, module paths) stay monospaced and only
// scale with the size choice.
// Public interface: FontPreference (family/scale accessors, fonts,
// didChangeNotification), FontFamily, FontScale.
// Owner context: tools/ide — UI.

import AppKit

enum FontFamily: String, CaseIterable {
    case courier, arial, georgia

    var displayName: String {
        switch self {
        case .courier: return "Courier"
        case .arial: return "Arial"
        case .georgia: return "Georgia"
        }
    }

    private var fontName: String {
        switch self {
        case .courier: return "Courier New"
        case .arial: return "Arial"
        case .georgia: return "Georgia"
        }
    }

    private var boldFontName: String {
        switch self {
        case .courier: return "CourierNewPS-BoldMT"
        case .arial: return "Arial-BoldMT"
        case .georgia: return "Georgia-Bold"
        }
    }

    /// The family at `size`, falling back to the system font when the face is
    /// unavailable (Courier falls back monospaced — it is the monospace choice).
    func font(size: CGFloat) -> NSFont {
        if let font = NSFont(name: fontName, size: size) { return font }
        return self == .courier
            ? .monospacedSystemFont(ofSize: size, weight: .regular)
            : .systemFont(ofSize: size)
    }

    /// The family's bold face at `size` — looked up by explicit PostScript name:
    /// both NSFontManager.convert(toHaveTrait:) and descriptor symbolic-trait
    /// resolution silently fall back to the SYSTEM font for these faces
    /// (ProjectTreeFontTests caught folders rendering in .SFNS).
    func boldFont(size: CGFloat) -> NSFont {
        NSFont(name: boldFontName, size: size) ?? font(size: size)
    }
}

enum FontScale: String, CaseIterable {
    case sm, md, lg, xl

    var displayName: String {
        switch self {
        case .sm: return "Small"
        case .md: return "Medium"
        case .lg: return "Large"
        case .xl: return "Extra Large"
        }
    }

    /// ONE point size per scale, everywhere the IDE speaks (David's ruling:
    /// the story pane must align with the other panes — no per-surface scales).
    var pointSize: CGFloat {
        switch self {
        case .sm: return 11
        case .md: return 13
        case .lg: return 15
        case .xl: return 17
        }
    }

    /// The story-pane (editor) point size — same as everywhere.
    var editorSize: CGFloat { pointSize }

    /// The panel text size (directory, Build output, Index rows, Diagnosis) —
    /// same as everywhere.
    var panelSize: CGFloat { pointSize }
}

@MainActor
enum FontPreference {

    static let didChangeNotification = Notification.Name("SharpeeFontPreferenceChanged")

    private static let familyKey = "SharpeeFontFamily"
    private static let scaleKey = "SharpeeFontScale"

    /// Chosen family — Georgia by default (the story pane reads like a book).
    static var family: FontFamily {
        get {
            UserDefaults.standard.string(forKey: familyKey)
                .flatMap(FontFamily.init(rawValue:)) ?? .georgia
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: familyKey)
            NotificationCenter.default.post(name: didChangeNotification, object: nil)
        }
    }

    /// Chosen size — Medium by default.
    static var scale: FontScale {
        get {
            UserDefaults.standard.string(forKey: scaleKey)
                .flatMap(FontScale.init(rawValue:)) ?? .md
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: scaleKey)
            NotificationCenter.default.post(name: didChangeNotification, object: nil)
        }
    }

    /// The story-pane font.
    static var editorFont: NSFont { family.font(size: scale.editorSize) }

    /// The right-panel text font (Build output, Index rows, Diagnosis body).
    static var panelFont: NSFont { family.font(size: scale.panelSize) }

    /// The bold panel face (directory folders, emphasis).
    static var panelBoldFont: NSFont { family.boldFont(size: scale.panelSize) }

    /// Monospace at panel size — code identifiers (phrase keys, module paths,
    /// diagnostic codes) keep a fixed pitch regardless of the family choice.
    static var panelMonoFont: NSFont {
        .monospacedSystemFont(ofSize: scale.panelSize - 0.5, weight: .regular)
    }
}
