// ToolchainFenceNoteTests.swift
// Pins the ADR-279 D4 fence-grammar mitigation: the note fires only when a
// fenced transcript failed on a toolchain the app did not ship, and stays
// silent otherwise — a note on a bundled-toolchain failure would point the
// author at the wrong cause.

import XCTest
@testable import SharpeeIDE

@MainActor
final class ToolchainFenceNoteTests: XCTestCase {

    private var tempDir: URL!

    override func setUpWithError() throws {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-FenceNoteTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tempDir, FileManager.default.fileExists(atPath: tempDir.path) {
            try FileManager.default.removeItem(at: tempDir)
        }
        tempDir = nil
        super.tearDown()
    }

    private func writeTranscript(_ body: String, name: String = "t.transcript") throws -> URL {
        let url = tempDir.appendingPathComponent(name)
        try body.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private var fencedTranscript: String {
        """
        > look
        [OK]
        text
        You are in a small lab.
        Exits lead north.
        end text

        """
    }

    private var plainTranscript: String {
        """
        > look
        [OK: contains] small lab

        """
    }

    // MARK: - Block detection (mirrors transcript-tester's BLOCK_OPEN)

    func testATextLineOnItsOwnOpensABlock() {
        XCTAssertTrue(ToolchainFenceNote.containsFence("> look\ntext\nout\nend text\n"))
    }

    func testTrailingWhitespaceOnTheOpenerIsForgiven() {
        XCTAssertTrue(ToolchainFenceNote.containsFence("text  \nout\nend text\n"))
    }

    /// Column 0 is the rule — an INDENTED `text` line is payload content, which
    /// is exactly how a transcript can quote the grammar without claiming it.
    func testAnIndentedTextLineDoesNotOpenABlock() {
        XCTAssertFalse(ToolchainFenceNote.containsFence("  text\nout\n  end text\n"))
    }

    /// A whole line, not a word inside one.
    func testTheWordTextInProseIsNotABlock() {
        XCTAssertFalse(ToolchainFenceNote.containsFence("[OK: contains] the text is faded\n"))
    }

    func testTextWithTrailingContentIsNotABlock() {
        XCTAssertFalse(ToolchainFenceNote.containsFence("text of the sign\nout\n"))
    }

    func testPlainTranscriptCarriesNoFence() {
        XCTAssertFalse(ToolchainFenceNote.containsFence(plainTranscript))
    }

    // MARK: - When the note applies

    /// The case the mitigation exists for: a fenced transcript failed on a
    /// PATH-resolved toolchain that may predate ADR-287.
    func testNoteFiresForFencedTranscriptOnNonBundledToolchain() throws {
        let transcript = try writeTranscript(fencedTranscript)
        let note = ToolchainFenceNote.note(transcripts: [transcript],
                                           resolved: URL(fileURLWithPath: "/usr/local/bin/sharpee"),
                                           bundled: URL(fileURLWithPath: "/Apps/CW.app/toolchain/bin/sharpee"))
        XCTAssertEqual(note, ToolchainFenceNote.text)
    }

    /// One fenced transcript in a mixed run is enough to explain the failure.
    func testNoteFiresWhenOnlyOneOfSeveralTranscriptsIsFenced() throws {
        let plain = try writeTranscript(plainTranscript, name: "plain.transcript")
        let fenced = try writeTranscript(fencedTranscript, name: "fenced.transcript")
        let note = ToolchainFenceNote.note(transcripts: [plain, fenced],
                                           resolved: URL(fileURLWithPath: "/usr/local/bin/sharpee"),
                                           bundled: nil)
        XCTAssertEqual(note, ToolchainFenceNote.text)
    }

    // MARK: - When it must stay silent

    /// The bundled toolchain always understands fences, so a failure there has
    /// some OTHER cause — naming the grammar would misdirect the author.
    func testNoNoteWhenTheBundledToolchainRanIt() throws {
        let transcript = try writeTranscript(fencedTranscript)
        let bundled = URL(fileURLWithPath: "/Apps/CW.app/toolchain/bin/sharpee")
        XCTAssertNil(ToolchainFenceNote.note(transcripts: [transcript],
                                             resolved: bundled,
                                             bundled: bundled))
    }

    /// Path spelling must not defeat the bundled check.
    func testNoNoteWhenBundledPathIsSpelledDifferently() throws {
        let transcript = try writeTranscript(fencedTranscript)
        XCTAssertNil(ToolchainFenceNote.note(
            transcripts: [transcript],
            resolved: URL(fileURLWithPath: "/Apps/CW.app/toolchain/bin/./sharpee"),
            bundled: URL(fileURLWithPath: "/Apps/CW.app/toolchain/bin/sharpee")))
    }

    /// No fences in play — the failure is ordinary and gets no extra line.
    func testNoNoteWhenNoTranscriptIsFenced() throws {
        let transcript = try writeTranscript(plainTranscript)
        XCTAssertNil(ToolchainFenceNote.note(transcripts: [transcript],
                                             resolved: URL(fileURLWithPath: "/usr/local/bin/sharpee"),
                                             bundled: nil))
    }

    /// Nothing resolved at all — that is `.sharpeeNotFound`'s story to tell.
    func testNoNoteWhenNothingResolved() throws {
        let transcript = try writeTranscript(fencedTranscript)
        XCTAssertNil(ToolchainFenceNote.note(transcripts: [transcript],
                                             resolved: nil,
                                             bundled: nil))
    }

    /// A transcript that vanished between discovery and the failure must not
    /// throw its way out of a status-line helper.
    func testMissingTranscriptContributesNoFenceAndDoesNotThrow() {
        let ghost = tempDir.appendingPathComponent("gone.transcript")
        XCTAssertNil(ToolchainFenceNote.note(transcripts: [ghost],
                                             resolved: URL(fileURLWithPath: "/usr/local/bin/sharpee"),
                                             bundled: nil))
    }
}
