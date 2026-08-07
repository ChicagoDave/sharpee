// StoryLocationMirror.swift
// The Create Story dialog's title-to-location rule: a new story defaults to
// `~/Documents/<title>/`, and the location field follows the title as it is
// typed until the author edits the location — after which mirroring is off for
// good (standard mirror-until-touched). Pure value logic, no AppKit: the sheet
// owns the fields, this owns the rule.
// Public interface: StoryLocationMirror (isMirroring, mirroredLocation(forTitle:),
// authorEditedLocation()), StoryLocationMirror.folderName(for:).
// Owner context: tools/ide — Launch.

import Foundation

struct StoryLocationMirror {

    /// Folder name used when a title sanitises down to nothing at all.
    static let fallbackFolderName = "My Story"

    /// APFS allows 255 UTF-8 bytes per path component. A title longer than that
    /// is the author's to shorten; the default just has to be creatable.
    static let maxFolderNameBytes = 255

    /// Trimmed from both ends of a folder name — see `folderName(for:)`.
    private static let edgeSeparators = CharacterSet(charactersIn: ".-").union(.whitespaces)

    /// Where mirrored locations are rooted. `~/Documents` — there is deliberately
    /// no app-owned parent folder (no `Chord/`), because an author keeps stories
    /// wherever source control wants them.
    let root: URL

    /// False once the author has typed in the location field. Never returns to
    /// true: a location the author chose must not be overwritten by later title
    /// edits.
    private(set) var isMirroring = true

    init(root: URL = StoryHome.defaultRoot) {
        self.root = root
    }

    /// The location the field should show for `title`, or nil when the author has
    /// taken the field over.
    ///
    /// - Parameter title: the raw contents of the title field, unsanitised.
    /// - Returns: `<root>/<sanitised title>/`, or nil while `isMirroring` is false.
    func mirroredLocation(forTitle title: String) -> URL? {
        guard isMirroring else { return nil }
        return root.appendingPathComponent(Self.folderName(for: title), isDirectory: true)
    }

    /// Records that the author edited the location field. Idempotent, and
    /// deliberately one-way.
    ///
    /// The sheet must NOT call this for its own mirroring writes — only for edits
    /// that came from the author — or the first keystroke in the title field
    /// would cancel mirroring immediately.
    mutating func authorEditedLocation() {
        isMirroring = false
    }

    /// A single path component derived from a story title.
    ///
    /// The title is the author's, so this preserves it as far as a folder name
    /// can: spacing and capitalisation survive ("The Folly at Fernhill"), and only
    /// what a path cannot carry is rewritten.
    ///
    /// - Parameter title: the raw title.
    /// - Returns: a creatable, non-hidden, non-empty path component.
    static func folderName(for title: String) -> String {
        var name = ""
        for scalar in title.unicodeScalars {
            switch scalar {
            // `/` is the POSIX separator; `:` is the separator Finder still
            // presents and HFS+ reserved. Both become a dash rather than
            // vanishing, so "Fire/Ice" stays two readable words.
            case "/", ":":
                name.append("-")
            // Control characters have no business in a folder name. They become
            // a space rather than nothing, so a title pasted across two lines
            // does not come back with its words run together.
            case let c where CharacterSet.controlCharacters.contains(c):
                name.append(" ")
            default:
                name.unicodeScalars.append(scalar)
            }
        }

        // Collapse whitespace runs so a mid-typing "The  Folly" does not become a
        // folder with a double space in it.
        name = name.split(separator: " ", omittingEmptySubsequences: true).joined(separator: " ")
        name = name.trimmingCharacters(in: .whitespaces)

        // Trim the separators off both ends — the dots and dashes that either
        // the author left there or the substitution above introduced. A LEADING
        // dot would hide the story folder from Finder and from the scaffold's
        // own non-hidden-entry check; a leading dash is hostile to every
        // command-line tool the author's source control will use; and a trailing
        // one just reads as a truncation. Interior separators are left alone —
        // "Fire/Ice" is meant to come back as "Fire-Ice".
        name = name.trimmingCharacters(in: Self.edgeSeparators)

        name = truncated(name, toUTF8Bytes: maxFolderNameBytes)

        return name.isEmpty ? fallbackFolderName : name
    }

    /// Trims to a byte budget on a character boundary, so a multi-byte title is
    /// never cut mid-scalar into something the filesystem rejects.
    private static func truncated(_ name: String, toUTF8Bytes limit: Int) -> String {
        guard name.utf8.count > limit else { return name }
        var result = ""
        var bytes = 0
        for character in name {
            let width = String(character).utf8.count
            if bytes + width > limit { break }
            result.append(character)
            bytes += width
        }
        return result.trimmingCharacters(in: .whitespaces)
    }
}
