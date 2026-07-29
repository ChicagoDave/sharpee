// WalkthroughChainTests.swift
// ADR-282 D4's naming and placement rules at the file-system boundary: what
// counts as part of the chain, what number a recorded chain continues from,
// what reads as a stray, and what a replace clears.
//
// Real directories with real files throughout — the rules are ABOUT the
// directory's contents, so a stubbed listing would be testing the stub.

import XCTest
@testable import SharpeeIDE

final class WalkthroughChainTests: XCTestCase {

    private var directory: URL!

    override func setUpWithError() throws {
        super.setUp()
        directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-Chain-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let directory, FileManager.default.fileExists(atPath: directory.path) {
            try FileManager.default.removeItem(at: directory)
        }
        directory = nil
        super.tearDown()
    }

    @discardableResult
    private func seed(_ name: String) throws -> URL {
        let url = directory.appendingPathComponent(name)
        try "title: seed\n---\n".write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    // MARK: - What counts as a chain member

    func testOnlyTwoDigitZeroPaddedNamesCarryAChainNumber() {
        let cases: [(String, Int?)] = [
            ("wt-01-opening.transcript", 1),
            ("wt-17-bank-puzzle.transcript", 17),
            ("wt-99-endgame.transcript", 99),
            // Not zero-padded: filename sort would put this AFTER wt-10, so it
            // cannot be trusted as chain position 9.
            ("wt-9-late.transcript", nil),
            // Past the two-digit scheme (out of scope per D4) — reads as a
            // stray, which is the loud failure rather than the silent one.
            ("wt-100-overflow.transcript", nil),
            ("wt-01.transcript", nil),          // no slug
            ("smoke.transcript", nil),
            ("wt-ab-lettered.transcript", nil),
            ("wt-01-notes.md", nil),            // not a transcript at all
        ]
        for (name, expected) in cases {
            XCTAssertEqual(WalkthroughChain.number(of: directory.appendingPathComponent(name)),
                           expected, "for \(name)")
        }
    }

    func testTranscriptsAreListedInFilenameOrderWhichIsRunOrder() throws {
        try seed("wt-02-second.transcript")
        try seed("wt-10-tenth.transcript")
        try seed("wt-01-first.transcript")
        try seed("notes.md")

        XCTAssertEqual(WalkthroughChain.transcripts(in: directory).map(\.lastPathComponent),
                       ["wt-01-first.transcript", "wt-02-second.transcript", "wt-10-tenth.transcript"])
    }

    func testAMissingDirectoryReadsAsAnEmptyChain() {
        let absent = directory.appendingPathComponent("nope", isDirectory: true)
        XCTAssertEqual(WalkthroughChain.transcripts(in: absent), [])
        XCTAssertNil(WalkthroughChain.highestNumber(in: absent))
        XCTAssertEqual(WalkthroughChain.strays(in: absent), [])
    }

    // MARK: - Numbering

    func testHighestNumberIgnoresStrays() throws {
        try seed("wt-01-first.transcript")
        try seed("wt-04-fourth.transcript")
        try seed("smoke.transcript")

        XCTAssertEqual(WalkthroughChain.highestNumber(in: directory), 4)
    }

    func testAppendContinuesAfterTheHighestPresent() throws {
        try seed("wt-01-first.transcript")
        try seed("wt-02-second.transcript")

        let plan = WalkthroughChain.plan(segmentCount: 3, slug: "cellar",
                                         in: directory, mode: .append)

        XCTAssertEqual(plan.files.map(\.lastPathComponent),
                       ["wt-03-cellar.transcript",
                        "wt-04-cellar.transcript",
                        "wt-05-cellar.transcript"])
        XCTAssertEqual(plan.removing, [], "an append removes nothing")
    }

    func testAnEmptyDirectoryStartsAtOne() {
        let plan = WalkthroughChain.plan(segmentCount: 2, slug: "cellar",
                                         in: directory, mode: .append)
        XCTAssertEqual(plan.files.map(\.lastPathComponent),
                       ["wt-01-cellar.transcript", "wt-02-cellar.transcript"])
    }

    func testAppendingBesideOnlyStraysStillStartsAtOne() throws {
        // The strays carry no chain number, so there is nothing to continue
        // FROM — the warning is what tells the author they are there.
        try seed("smoke.transcript")

        let plan = WalkthroughChain.plan(segmentCount: 1, slug: "cellar",
                                         in: directory, mode: .append)
        XCTAssertEqual(plan.files.map(\.lastPathComponent), ["wt-01-cellar.transcript"])
    }

    // MARK: - Replace

    func testReplaceRenumbersFromOneAndClearsEveryTranscriptPresent() throws {
        try seed("wt-01-old.transcript")
        try seed("wt-02-old.transcript")
        try seed("smoke.transcript")
        try seed("notes.md")

        let plan = WalkthroughChain.plan(segmentCount: 2, slug: "new",
                                         in: directory, mode: .replace)

        XCTAssertEqual(plan.files.map(\.lastPathComponent),
                       ["wt-01-new.transcript", "wt-02-new.transcript"])
        // Strays included: a replace that left one behind would still
        // interleave, which is the thing replace exists to avoid. Compared by
        // filename because a listing and a built path can spell the same file
        // differently (`/var/…` vs `/private/var/…`).
        XCTAssertEqual(Set(plan.removing.map(\.lastPathComponent)),
                       ["wt-01-old.transcript", "wt-02-old.transcript", "smoke.transcript"])
        XCTAssertFalse(plan.removing.contains { $0.pathExtension == "md" },
                       "a replace clears the chain, not the folder")
    }

    // MARK: - Strays and the warning

    func testStraysAreTheTranscriptsCarryingNoChainNumber() throws {
        try seed("wt-01-first.transcript")
        try seed("smoke.transcript")
        try seed("wt-9-late.transcript")

        XCTAssertEqual(Set(WalkthroughChain.strays(in: directory).map(\.lastPathComponent)),
                       ["smoke.transcript", "wt-9-late.transcript"])
    }

    func testACleanDirectoryProducesNoWarning() throws {
        try seed("wt-01-first.transcript")
        XCTAssertNil(WalkthroughChain.warning(strays: WalkthroughChain.strays(in: directory)))
    }

    func testTheWarningNamesEveryStrayAndOffersReplace() throws {
        try seed("smoke.transcript")
        try seed("wt-9-late.transcript")

        let warning = try XCTUnwrap(
            WalkthroughChain.warning(strays: WalkthroughChain.strays(in: directory)))

        XCTAssertTrue(warning.contains("smoke.transcript"))
        XCTAssertTrue(warning.contains("wt-9-late.transcript"))
        XCTAssertTrue(warning.lowercased().contains("replace"),
                      "the warning must offer the deliberate way out (D4)")
    }

    // MARK: - Slugs

    func testSlugsAreFilenameSafeAndNeverEmpty() {
        XCTAssertEqual(WalkthroughChain.slug(from: "Dungeo"), "dungeo")
        XCTAssertEqual(WalkthroughChain.slug(from: "The Bank Puzzle"), "the-bank-puzzle")
        XCTAssertEqual(WalkthroughChain.slug(from: "  spaced  out  "), "spaced-out")
        XCTAssertEqual(WalkthroughChain.slug(from: "a/b\\c:d"), "a-b-c-d")
        XCTAssertEqual(WalkthroughChain.slug(from: "!!!"), "recorded")
        XCTAssertEqual(WalkthroughChain.slug(from: ""), "recorded")
    }

    func testFileNamesAreZeroPaddedSoFilenameSortIsRunOrder() {
        XCTAssertEqual(WalkthroughChain.fileName(number: 1, slug: "x"), "wt-01-x.transcript")
        XCTAssertEqual(WalkthroughChain.fileName(number: 12, slug: "x"), "wt-12-x.transcript")
    }
}
