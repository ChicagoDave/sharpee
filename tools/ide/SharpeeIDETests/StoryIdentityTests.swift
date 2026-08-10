// StoryIdentityTests.swift
// ADR-309 in Chord Writer, REAL-PATH: every case runs against real files in a
// temp directory through the production save path (`Document.save()`) and the
// production reconciliation (`StoryIdentity.reconcile`) — no stubbed file
// system, no injected store.
//
// Derived from the Behavior Statement: save reconciles a `.story`'s header to
// its config sidecar (insert / overwrite / no-op), adopts or mints an absent
// config, never touches config bytes on the reconcile path, and — the case
// that matters most — a BROKEN config never blocks the author's save.

import XCTest
@testable import SharpeeIDE

final class StoryIdentityTests: XCTestCase {

    private var dir: URL!

    override func setUpWithError() throws {
        super.setUp()
        dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-StoryIdentity-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let dir, FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.removeItem(at: dir)
        }
        dir = nil
        super.tearDown()
    }

    // MARK: - Fixtures

    private func header(with ifid: String?) -> String {
        let line = ifid.map { "  ifid: \($0)\n" } ?? ""
        return "story\n  title: Harbor\n  authors: T\n  id: harbor\n\(line)  story-version: 0.1.0\n\ncreate the Quay\n  a room\n\n  Salt air.\n"
    }

    @discardableResult
    private func writeStory(_ source: String, name: String = "harbor.story") throws -> URL {
        let url = dir.appendingPathComponent(name)
        try source.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private func writeConfig(_ text: String, name: String = "harbor.config.json") throws -> URL {
        let url = dir.appendingPathComponent(name)
        try text.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private func configJSON(at url: URL) throws -> [String: Any] {
        let data = try Data(contentsOf: url)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    // MARK: - Adoption and minting (D2, absent config)

    func testSaveAdoptsAnExistingHeaderValueVerbatim() throws {
        // AC-3: value EQUALITY, not presence — and a legacy non-UUID IFID
        // adopts as-is (identity preservation outranks format hygiene).
        let storyURL = try writeStory(header(with: "LEGACY-NOT-A-UUID-1234"))
        let doc = try Document.load(from: storyURL)

        let outcome = try doc.save()

        XCTAssertFalse(outcome.contentChanged, "an already-correct header needs no rewrite")
        let config = try configJSON(at: StoryConfigStore.path(for: storyURL))
        XCTAssertEqual(config["ifid"] as? String, "LEGACY-NOT-A-UUID-1234")
        XCTAssertEqual(config["version"] as? Int, 1)
    }

    func testSaveMintsForABareStoryAndRendersTheLineAfterId() throws {
        let storyURL = try writeStory(header(with: nil))
        let doc = try Document.load(from: storyURL)

        let outcome = try doc.save()

        XCTAssertTrue(outcome.contentChanged)
        let onDisk = try String(contentsOf: storyURL, encoding: .utf8)
        let minted = try XCTUnwrap(StoryHeaderIFID.read(from: onDisk))
        XCTAssertEqual(try configJSON(at: StoryConfigStore.path(for: storyURL))["ifid"] as? String, minted)
        // Directly after id: — the identity fields belong together.
        let lines = onDisk.components(separatedBy: "\n")
        let idIndex = try XCTUnwrap(lines.firstIndex(of: "  id: harbor"))
        XCTAssertEqual(lines[idIndex + 1], "  ifid: \(minted)")
    }

    func testASecondSaveIsATotalNoOp() throws {
        let storyURL = try writeStory(header(with: nil))
        let first = try Document.load(from: storyURL)
        try first.save()
        let afterFirst = try String(contentsOf: storyURL, encoding: .utf8)
        let configBytes = try String(contentsOf: StoryConfigStore.path(for: storyURL), encoding: .utf8)

        let second = try Document.load(from: storyURL)
        let outcome = try second.save()

        XCTAssertFalse(outcome.contentChanged)
        XCTAssertEqual(try String(contentsOf: storyURL, encoding: .utf8), afterFirst)
        XCTAssertEqual(try String(contentsOf: StoryConfigStore.path(for: storyURL), encoding: .utf8), configBytes)
    }

    // MARK: - Reconciliation (D3 / AC-2)

    func testSaveReInsertsADeletedHeaderLineWithTheIdenticalValue() throws {
        let storyURL = try writeStory(header(with: nil))
        try writeConfig("{\n  \"ifid\" : \"AAAA-1111\",\n  \"version\" : 1\n}\n")
        let configBytes = try String(contentsOf: StoryConfigStore.path(for: storyURL), encoding: .utf8)
        let doc = try Document.load(from: storyURL)

        let outcome = try doc.save()

        XCTAssertTrue(outcome.contentChanged)
        XCTAssertTrue(try String(contentsOf: storyURL, encoding: .utf8).contains("  ifid: AAAA-1111"))
        // The config's bytes are untouched by reconciliation (AC-2).
        XCTAssertEqual(try String(contentsOf: StoryConfigStore.path(for: storyURL), encoding: .utf8), configBytes)
    }

    func testSaveOverwritesAHandEditedValue() throws {
        // The whole point of the ruling: an author's edit does not stick.
        let storyURL = try writeStory(header(with: "HAND-EDITED"))
        try writeConfig("{\n  \"ifid\" : \"BBBB-2222\",\n  \"version\" : 1\n}\n")
        let doc = try Document.load(from: storyURL)

        let outcome = try doc.save()

        XCTAssertTrue(outcome.contentChanged)
        let onDisk = try String(contentsOf: storyURL, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("  ifid: BBBB-2222"))
        XCTAssertFalse(onDisk.contains("HAND-EDITED"))
        // The in-memory document followed the file — the buffer is not stale.
        XCTAssertEqual(doc.content, onDisk)
    }

    func testTheAuthorsOtherEditsSurviveReconciliation() throws {
        // Reconciliation is a one-line splice, not a rewrite: whatever else the
        // author typed in the same save must land untouched.
        let storyURL = try writeStory(header(with: "CCCC-3333"))
        try writeConfig("{\n  \"ifid\" : \"CCCC-3333\",\n  \"version\" : 1\n}\n")
        let doc = try Document.load(from: storyURL)
        doc.content = doc.content.replacingOccurrences(of: "Salt air.", with: "Salt air, and gulls.")
        doc.isDirty = true

        try doc.save()

        let onDisk = try String(contentsOf: storyURL, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("Salt air, and gulls."))
        XCTAssertTrue(onDisk.contains("  ifid: CCCC-3333"))
    }

    // MARK: - Broken config (D5)

    func testABrokenConfigNeverBlocksTheSaveAndIsReported() throws {
        // The judgment this ADR's D5 does NOT cover for the IDE: refusing to
        // write an author's text over a sidecar problem would be a worse
        // failure than the one being reported. Save proceeds; nothing mints.
        let storyURL = try writeStory(header(with: "DDDD-4444"))
        try writeConfig("{ not json")
        let doc = try Document.load(from: storyURL)
        doc.content += "\ncreate the Pier\n  a room\n\n  Weathered boards.\n"
        doc.isDirty = true

        let outcome = try doc.save()

        XCTAssertNotNil(outcome.brokenConfig, "the broken config must be reported")
        XCTAssertFalse(outcome.contentChanged, "no reconciliation happened")
        XCTAssertFalse(doc.isDirty, "the author's work was saved")
        let onDisk = try String(contentsOf: storyURL, encoding: .utf8)
        XCTAssertTrue(onDisk.contains("Weathered boards."), "the author's text reached disk")
        // Never re-mint over a broken config: its bytes stand as the author left them.
        XCTAssertEqual(try String(contentsOf: StoryConfigStore.path(for: storyURL), encoding: .utf8), "{ not json")
    }

    func testUnknownVersionAndMissingIfidAreBrokenDistinctFromAbsent() throws {
        let storyURL = try writeStory(header(with: "EEEE-5555"))
        let configURL = StoryConfigStore.path(for: storyURL)

        try writeConfig("{\"version\": 99, \"ifid\": \"X\"}")
        guard case .broken = StoryConfigStore.read(at: configURL) else {
            return XCTFail("an unknown version is broken")
        }

        try writeConfig("{\"version\": 1}")
        guard case .broken = StoryConfigStore.read(at: configURL) else {
            return XCTFail("a missing ifid is broken")
        }

        try FileManager.default.removeItem(at: configURL)
        XCTAssertEqual(StoryConfigStore.read(at: configURL), .absent)
    }

    // MARK: - Scope

    func testANonStoryDocumentIsNeverReconciled() throws {
        let notes = dir.appendingPathComponent("notes.md")
        try "# Notes\n".write(to: notes, atomically: true, encoding: .utf8)
        let doc = try Document.load(from: notes)

        let outcome = try doc.save()

        XCTAssertEqual(outcome, Document.SaveOutcome.unchanged)
        XCTAssertFalse(FileManager.default.fileExists(atPath: dir.appendingPathComponent("notes.config.json").path))
    }

    func testAGrammarFileWithNoStoryBlockMintsNothing() throws {
        let grammarURL = try writeStory("grammar\n  verb take\n", name: "verbs.story")
        let doc = try Document.load(from: grammarURL)

        let outcome = try doc.save()

        XCTAssertFalse(outcome.contentChanged)
        XCTAssertFalse(
            FileManager.default.fileExists(atPath: StoryConfigStore.path(for: grammarURL).path),
            "a file with no story block has no identity to mint"
        )
    }

    // MARK: - Cross-host schema (the wire contract with devkit)

    func testWritesExactlyTheBytesDevkitWritesForTheSameConfig() throws {
        // Pinned as a LITERAL on both sides (devkit's story-config.test.ts pins
        // the same string): the two hosts write the same story's identity file,
        // so a format change on either must fail a test rather than surface as
        // a spurious diff in an author's repository.
        let storyURL = dir.appendingPathComponent("harbor.story")
        try StoryConfigStore.write(StoryConfig(ifid: "PINNED-1234"),
                                   to: StoryConfigStore.path(for: storyURL))

        XCTAssertEqual(
            try String(contentsOf: StoryConfigStore.path(for: storyURL), encoding: .utf8),
            "{\n  \"ifid\": \"PINNED-1234\",\n  \"version\": 1\n}\n"
        )
    }
}
