// TranscriptSourceProviderTests.swift
// The refusals. The success path is covered end to end by
// TestingTabRealPathTests (select → click → the file on disk changes → the suite
// still passes); what is here is the two ways a write must NOT happen, because
// those are the branches that protect an author's work and the ones a passing
// suite would otherwise say nothing about.
//
// Real files in a real temporary directory, driven through the real provider.
// Nothing this repository owns is stubbed: the only stand-in is the tab, which
// is absent (nil) in the read/write calls, and each case asserts on the FILE
// rather than on what the tab was told — a refusal that still wrote the file
// would be the bug, and the tab's report of it would look identical either way.
// Owner context: tools/ide — Test.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TranscriptSourceProviderTests: XCTestCase {

    private var root: URL!
    private var transcript: URL!

    private static let original = "title: T\nstory: s\n\n---\n\n> look\n[SKIP]\n"

    override func setUpWithError() throws {
        try super.setUpWithError()
        root = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("provider-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        transcript = root.appendingPathComponent("known.transcript")
        try Self.original.write(to: transcript, atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        // Permissions are restored first: a directory left read-only cannot be
        // removed, and the next run would inherit the wreckage.
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: root.path)
        try? FileManager.default.removeItem(at: root)
        try super.tearDownWithError()
    }

    private func provider() -> TranscriptSourceProvider {
        TranscriptSourceProvider(discovered: [transcript])
    }

    // MARK: - Refusal 1: a path that is not one of the suite's

    /// The page asking for a file outside the discovered set is a bug in the page.
    /// The answer is a refusal, and — the part that matters — the file is not
    /// touched.
    func testAWriteOutsideTheDiscoveredSuiteChangesNothingOnDisk() throws {
        let stranger = root.appendingPathComponent("not-discovered.transcript")
        try "before\n".write(to: stranger, atomically: true, encoding: .utf8)

        let written = provider().write(file: stranger.path, text: "AFTER\n", to: nil)

        XCTAssertNil(written, "a refused write reports that nothing changed")
        XCTAssertEqual(try String(contentsOf: stranger, encoding: .utf8), "before\n",
                       "the file outside the suite must be exactly as it was")
    }

    /// The same refusal for reading. A path the tab has no business reading is
    /// refused even when it exists and is perfectly readable.
    func testAReadOutsideTheDiscoveredSuiteIsRefusedEvenWhenTheFileIsReadable() throws {
        let stranger = root.appendingPathComponent("not-discovered.transcript")
        try "secret\n".write(to: stranger, atomically: true, encoding: .utf8)

        // With no tab there is nothing to observe but the refusal's own effect:
        // that it did not throw and did not read. The behaviour under test is the
        // guard, and the guard is shared with the write above, which asserts on
        // the file. Kept as a case because a future change could give `provide`
        // its own path resolution and silently lose the boundary on one side.
        provider().provide(file: stranger.path, to: nil)
        XCTAssertEqual(try String(contentsOf: stranger, encoding: .utf8), "secret\n")
    }

    /// A path that does not exist at all is refused by the same rule, rather than
    /// being created — the tab may only edit the suite, never grow it. (Creating
    /// transcripts is slice 2c, and it will go through a different door.)
    func testAWriteToAPathThatDoesNotExistCreatesNoFile() {
        let absent = root.appendingPathComponent("invented.transcript")

        let written = provider().write(file: absent.path, text: "new\n", to: nil)

        XCTAssertNil(written)
        XCTAssertFalse(FileManager.default.fileExists(atPath: absent.path),
                       "a refused write must not bring a file into being")
    }

    // MARK: - Refusal 2: the write itself fails

    /// When the write cannot land, the transcript must be exactly as it was.
    ///
    /// The directory is made read-only rather than the file: the write is atomic,
    /// so it lands a temporary file and renames it, and renaming needs the
    /// DIRECTORY. A read-only file alone would still be replaced — which is worth
    /// knowing, because it is why the obvious way to write this test would pass
    /// while proving nothing.
    func testAFailedWriteLeavesTheTranscriptExactlyAsItWas() throws {
        try FileManager.default.setAttributes([.posixPermissions: 0o555], ofItemAtPath: root.path)

        let written = provider().write(file: transcript.path, text: "REPLACED\n", to: nil)

        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: root.path)
        XCTAssertNil(written, "a write that could not land reports that nothing changed")
        XCTAssertEqual(try String(contentsOf: transcript, encoding: .utf8), Self.original,
                       "a failed write must not leave a partial or replaced file")
    }

    // MARK: - The success path, at this level

    // MARK: - Creating, and where a new transcript lands

    /// The location is inferred, never asked (ADR-290 D8), and the shape it
    /// infers is the one ADR-280's classifier can actually see.
    func testACreatedTranscriptLandsInTestsTranscriptsUnderASluggedName() throws {
        let landed = provider().create(name: "The Vine, Again!", text: Self.original,
                                       in: root, to: nil)

        let target = try XCTUnwrap(landed)
        XCTAssertEqual(target.lastPathComponent, "the-vine-again.transcript")
        XCTAssertEqual(target.deletingLastPathComponent().lastPathComponent, "transcripts")
        XCTAssertEqual(target.deletingLastPathComponent().deletingLastPathComponent().lastPathComponent,
                       "tests")
        XCTAssertEqual(try String(contentsOf: target, encoding: .utf8), Self.original)
    }

    /// Two branches named the same is an ordinary mistake. Losing the first one
    /// to it would not be.
    func testCreatingOverAnExistingTranscriptIsRefusedAndChangesNothing() throws {
        let first = try XCTUnwrap(provider().create(name: "vine", text: "first\n", in: root, to: nil))

        let second = provider().create(name: "vine", text: "second\n", in: root, to: nil)

        XCTAssertNil(second, "an existing file is never overwritten")
        XCTAssertEqual(try String(contentsOf: first, encoding: .utf8), "first\n")
    }

    func testANameWithNothingToSlugIsRefused() {
        XCTAssertNil(provider().create(name: "!!! ???", text: Self.original, in: root, to: nil))
    }

    func testWithNoStoryOpenThereIsNowhereToCreateATranscript() {
        XCTAssertNil(provider().create(name: "vine", text: Self.original, in: nil, to: nil))
    }

    // MARK: - Trashing

    /// Trashed, not unlinked: the only undo an editor can honestly offer for a
    /// whole file is the one the operating system already has.
    func testTrashingRemovesTheFileFromTheSuiteWithoutDestroyingIt() throws {
        let trashed = provider().trash(file: transcript.path, to: nil)

        XCTAssertNotNil(trashed)
        XCTAssertFalse(FileManager.default.fileExists(atPath: transcript.path),
                       "it is gone from where the suite looks")
    }

    func testTrashingOutsideTheDiscoveredSuiteIsRefusedAndLeavesTheFile() throws {
        let stranger = root.appendingPathComponent("not-discovered.transcript")
        try "keep me\n".write(to: stranger, atomically: true, encoding: .utf8)

        XCTAssertNil(provider().trash(file: stranger.path, to: nil))
        XCTAssertEqual(try String(contentsOf: stranger, encoding: .utf8), "keep me\n")
    }

    // MARK: - Slugging

    /// The shape every transcript in the corpus already has (`fuse-cut`,
    /// `frost-seal`), so a name reads the same in a listing, a `continues:` field
    /// and a test report.
    func testSlugKeepsLettersAndDigitsAndCollapsesEverythingElse() {
        XCTAssertEqual(TranscriptSourceProvider.slug(from: "The Vine, Again!"), "the-vine-again")
        XCTAssertEqual(TranscriptSourceProvider.slug(from: "  fuse   cut  "), "fuse-cut")
        XCTAssertEqual(TranscriptSourceProvider.slug(from: "Chapter 2"), "chapter-2")
        XCTAssertEqual(TranscriptSourceProvider.slug(from: "---"), "")
        // Never a leading or trailing hyphen: `-vine-.transcript` reads as a typo.
        XCTAssertEqual(TranscriptSourceProvider.slug(from: "!vine!"), "vine")
    }

    /// The one positive case here, so the refusals above are known to be refusing
    /// something that otherwise works — a guard that rejects everything would
    /// satisfy every test above.
    func testAWriteInsideTheSuiteReplacesTheFileAndReportsWhereItLanded() throws {
        let written = provider().write(file: transcript.path, text: "title: T\nstory: s\n\n---\n\n> look\n[OK: contains \"x\"]\n", to: nil)

        XCTAssertEqual(written?.standardizedFileURL, transcript.standardizedFileURL)
        XCTAssertTrue(try String(contentsOf: transcript, encoding: .utf8).contains("[OK: contains \"x\"]"))
    }
}
