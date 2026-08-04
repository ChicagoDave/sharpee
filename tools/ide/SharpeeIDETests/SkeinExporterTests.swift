// SkeinExporterTests.swift
// ADR-299 Phase 9 (D7): "Save thread as test" — the mapping from a blessed
// thread to an ADR-294 golden transcript, and the refusals that keep the skein
// from minting a file that looks like a test and tests nothing. The end-to-end
// half (an exported transcript PASSING under the real runner) is
// SkeinExportRealPathTests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class SkeinExporterTests: XCTestCase {

    private var tmp: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinExporterTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// root → "take lamp"(take, blessed) → "go north"(north, untagged)
    private func document(blessTake: Bool = true) -> SkeinDocument {
        let north = SkeinNode(id: "north", command: "go north", output: "The cellar.")
        var take = SkeinNode(id: "take", command: "take lamp", output: "Taken.",
                             children: [north])
        if blessTake {
            take.blessing = SkeinBlessing(scope: .thisThread, output: "Taken.")
        }
        return SkeinDocument(seed: 4242,
                             root: SkeinNode(id: "root", command: "", output: "Hall.",
                                             children: [take]))
    }

    private func source(_ document: SkeinDocument, _ nodeId: String) throws -> String {
        try SkeinExporter.transcriptSource(document: document,
                                           toNodeId: nodeId,
                                           title: "probe")
    }

    // MARK: - The transcript's shape

    func testTheHeaderCarriesTheTitleAndTheSkeinsPinnedSeed() throws {
        let text = try source(document(), "north")

        XCTAssertTrue(text.hasPrefix("title: probe\nseed: 4242\n---\n"),
                      "the exported test must run at the seed the thread was blessed at (D5)\n\(text)")
    }

    func testTheOpeningLookIsReplayedSoTheBannerLandsWhereItDidInPlay() throws {
        let text = try source(document(), "north")

        XCTAssertTrue(text.contains("> look\n[SKIP]"),
                      "without it a verbatim bless on the first turn compares banner+response "
                      + "against response\n\(text)")
    }

    func testTheStoryStartIsNotATurn() throws {
        let text = try source(document(), "north")

        XCTAssertFalse(text.contains("> \n"), "the root's empty command must not be emitted")
        XCTAssertFalse(text.contains("Hall."), "the boot banner rides the opening look, not a turn")
    }

    func testABlessedNodeAssertsItsTextVerbatim() throws {
        let text = try source(document(), "north")

        XCTAssertTrue(text.contains("> take lamp\n[OK]\ntext\nTaken.\nend text"),
                      "a skein blessing approves the WHOLE output — there is no fragment "
                      + "form to reach here\n\(text)")
    }

    func testAnUnblessedNodeKeepsTheSkipDraft() throws {
        let text = try source(document(), "north")

        XCTAssertTrue(text.contains("> go north\n[SKIP]\n# The cellar."),
                      "an unblessed turn advances state and asserts nothing\n\(text)")
    }

    func testTheBLESSEDTextIsAssertedNotWhateverTheStoryLastPrinted() throws {
        var document = self.document()
        // The capture drifted after the author vouched for it.
        document.updateNode(withId: "take") { $0.output = "Taken, and it is warm." }

        let text = try source(document, "take")

        XCTAssertTrue(text.contains("text\nTaken.\nend text"),
                      "the test must assert what the author approved\n\(text)")
        XCTAssertFalse(text.contains("Taken, and it is warm."))
    }

    // MARK: - Forced branches (AC-4's export half)

    func testAThreadsForcingsJoinIntoOneForcesHeaderInNodeOrder() throws {
        var document = self.document()
        document.updateNode(withId: "take") { $0.forcings = ["stdlib.throwing.breaks#1=no"] }
        document.updateNode(withId: "north") { $0.forcings = ["dungeo.melee.blow#1=MISS"] }

        let text = try source(document, "north")

        XCTAssertTrue(
            text.contains("forces: stdlib.throwing.breaks#1=no, dungeo.melee.blow#1=MISS"),
            text)
    }

    func testAThreadWithNoForcingsEmitsNoForcesHeader() throws {
        XCTAssertFalse(try source(document(), "north").contains("forces:"))
    }

    func testAThreadForcingTheSamePointTwiceIsRefusedRatherThanWrittenUnrunnable() throws {
        var document = self.document()
        document.updateNode(withId: "take") { $0.forcings = ["stdlib.throwing.breaks#1=no"] }
        document.updateNode(withId: "north") { $0.forcings = ["stdlib.throwing.breaks#1=yes"] }

        XCTAssertThrowsError(try source(document, "north")) { error in
            XCTAssertEqual(error as? SkeinExporter.ExportError,
                           .duplicateForcing(key: "stdlib.throwing.breaks#1"),
                           "the runner rejects duplicate force keys as a load error (ADR-293 D9)")
        }
    }

    // MARK: - Refusals

    func testAThreadNobodyBlessedIsRefused() {
        XCTAssertThrowsError(try source(document(blessTake: false), "north")) { error in
            XCTAssertEqual(error as? SkeinExporter.ExportError, .noBlessings)
        }
    }

    func testAnUnknownThreadIsRefused() {
        XCTAssertThrowsError(try source(document(), "no-such-node")) { error in
            XCTAssertEqual(error as? SkeinExporter.ExportError, .unknownNode("no-such-node"))
        }
    }

    func testARefusedExportWritesNoFile() {
        let url = tmp.appendingPathComponent("tests/transcripts/thread.transcript")

        XCTAssertThrowsError(try SkeinExporter.write(document: document(blessTake: false),
                                                     toNodeId: "north",
                                                     title: "probe",
                                                     to: url))

        XCTAssertFalse(FileManager.default.fileExists(atPath: url.path),
                       "no transcript is ever written without a blessing to assert (AC-5)")
    }

    func testTheRefusalIsKnowableBeforeTheSavePanelOpens() {
        XCTAssertFalse(SkeinExporter.canExport(document: document(blessTake: false),
                                               toNodeId: "north"))
        XCTAssertTrue(SkeinExporter.canExport(document: document(), toNodeId: "north"))
        XCTAssertFalse(SkeinExporter.canExport(document: document(), toNodeId: "no-such-node"))
    }

    // MARK: - Writing

    func testWritingCreatesTheTestFolderAndTheFile() throws {
        let url = tmp.appendingPathComponent("tests/transcripts/thread.transcript")

        try SkeinExporter.write(document: document(), toNodeId: "north",
                                title: "probe", to: url)

        let written = try String(contentsOf: url, encoding: .utf8)
        XCTAssertEqual(written, try source(document(), "north"))
    }

    // MARK: - The offered filename

    func testTheOfferedNameIsTheAuthorsOwnTagForTheThread() {
        var document = self.document()
        document.updateNode(withId: "north") { $0.tags = ["Golden Path"] }

        XCTAssertEqual(SkeinExporter.defaultFilename(document: document, toNodeId: "north"),
                       "golden-path.transcript")
    }

    func testAnUntaggedThreadIsOfferedItsTerminalCommand() {
        XCTAssertEqual(SkeinExporter.defaultFilename(document: document(), toNodeId: "north"),
                       "go-north.transcript")
    }

    func testAnUnnameableThreadStillGetsAFilename() {
        var document = self.document()
        document.updateNode(withId: "north") { $0.tags = ["…"] }

        XCTAssertEqual(SkeinExporter.defaultFilename(document: document, toNodeId: "north"),
                       "thread.transcript",
                       "a save panel with an empty name field is a dead end")
    }
}
