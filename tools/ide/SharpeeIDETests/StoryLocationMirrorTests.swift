// StoryLocationMirrorTests.swift
// Covers the Create Story location rule: `~/Documents/<Story Title>/` by
// default, the title mirrored into the location field until the author edits it,
// and a folder name that a filesystem will actually accept. Pure value logic —
// no UserDefaults, no disk, no window.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

final class StoryLocationMirrorTests: XCTestCase {

    private let root = URL(fileURLWithPath: "/tmp/story-root", isDirectory: true)

    // MARK: - The folder name

    func testTheTitleIsKeptAsTheAuthorWroteIt() {
        // The whole point of dropping the `Chord/` folder and the kebab-case id:
        // the author's own words name the folder they will see in Finder.
        XCTAssertEqual(StoryLocationMirror.folderName(for: "The Folly at Fernhill"),
                       "The Folly at Fernhill")
        XCTAssertEqual(StoryLocationMirror.folderName(for: "Émile & Co."), "Émile & Co")
    }

    func testPathSeparatorsBecomeDashesRatherThanNestedFolders() {
        // "/" would silently make a nested path; ":" is the separator Finder
        // still presents. Both must survive as readable text.
        XCTAssertEqual(StoryLocationMirror.folderName(for: "Fire/Ice"), "Fire-Ice")
        XCTAssertEqual(StoryLocationMirror.folderName(for: "Act 1: Arrival"), "Act 1- Arrival")
    }

    func testControlCharactersAndWhitespaceRunsAreCleanedUp() {
        // A pasted two-line title must not come back with its words run together.
        XCTAssertEqual(StoryLocationMirror.folderName(for: "A\tPasted\nTitle"), "A Pasted Title")
        XCTAssertEqual(StoryLocationMirror.folderName(for: "The   Long    Night"), "The Long Night")
        XCTAssertEqual(StoryLocationMirror.folderName(for: "  Padded  "), "Padded")
    }

    func testLeadingAndTrailingSeparatorsAreTrimmed() {
        // A hidden folder would be invisible in Finder AND invisible to the
        // scaffold's own "is this directory empty" check.
        XCTAssertEqual(StoryLocationMirror.folderName(for: ".secret"), "secret")
        XCTAssertEqual(StoryLocationMirror.folderName(for: "..hidden"), "hidden")
        XCTAssertEqual(StoryLocationMirror.folderName(for: "Chapter 1."), "Chapter 1")
        // A leading dash is hostile to every command-line tool the author's
        // source control will point at the folder.
        XCTAssertEqual(StoryLocationMirror.folderName(for: "-Draft-"), "Draft")
        // Interior separators are the point of the substitution — leave them.
        XCTAssertEqual(StoryLocationMirror.folderName(for: "Fire/Ice"), "Fire-Ice")
    }

    func testAnOverlongTitleIsTruncatedOnACharacterBoundary() {
        let title = String(repeating: "é", count: 400)   // 800 UTF-8 bytes
        let name = StoryLocationMirror.folderName(for: title)

        XCTAssertLessThanOrEqual(name.utf8.count, StoryLocationMirror.maxFolderNameBytes,
                                 "a path component over the byte budget cannot be created")
        XCTAssertEqual(name, String(repeating: "é", count: 127),
                       "truncation must land on a character boundary, not mid-scalar")
        XCTAssertTrue(name.allSatisfy { $0 == "é" }, "no replacement characters may appear")
    }

    // MARK: - REJECTS WHEN: nothing usable is left

    func testATitleThatSanitisesToNothingFallsBackRatherThanNamingTheRoot() {
        // Without the fallback the target would be the root itself, and the
        // scaffold would write a story into ~/Documents.
        for title in ["", "   ", "...", "/", ":"] {
            XCTAssertEqual(StoryLocationMirror.folderName(for: title),
                           StoryLocationMirror.fallbackFolderName,
                           "“\(title)” must not resolve to an empty component")
        }
    }

    // MARK: - Mirroring

    func testTheLocationFollowsTheTitleUntilTheAuthorEditsIt() {
        var mirror = StoryLocationMirror(root: root)

        XCTAssertTrue(mirror.isMirroring, "a fresh sheet mirrors")
        XCTAssertEqual(mirror.mirroredLocation(forTitle: "The Folly")?.path,
                       "/tmp/story-root/The Folly")
        XCTAssertEqual(mirror.mirroredLocation(forTitle: "The Folly at Fernhill")?.path,
                       "/tmp/story-root/The Folly at Fernhill",
                       "each keystroke re-mirrors")

        mirror.authorEditedLocation()

        XCTAssertFalse(mirror.isMirroring)
        XCTAssertNil(mirror.mirroredLocation(forTitle: "A Different Title"),
                     "a location the author typed must not be overwritten by later title edits")
    }

    func testMirroringNeverComesBack() {
        var mirror = StoryLocationMirror(root: root)
        mirror.authorEditedLocation()
        mirror.authorEditedLocation()

        XCTAssertFalse(mirror.isMirroring, "the rule is one-way — cancelled for good")
        XCTAssertNil(mirror.mirroredLocation(forTitle: "Anything"))
    }

    func testTheDefaultRootIsDocumentsItselfWithNoAppOwnedFolder() {
        let documents = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask).first!
        XCTAssertEqual(StoryLocationMirror().root.standardizedFileURL,
                       documents.standardizedFileURL,
                       "there is no ~/Documents/Chord — an author keeps stories where they like")
    }
}
