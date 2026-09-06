// PlayToWriteCoordinatorTests.swift
// The play-to-write round's glue (ADR-333 D4/D4a) against the REAL editor: a
// phrase click opens the story at the phrase's line and arms the round; a
// platform-line click lands the `override message` block IN THE EDITOR'S
// BUFFER (undoable, unsaved) and arms; a click before the catalog arrived
// fetches it through the injected source and resolves again; a save inside
// the story while armed requests the build, a save elsewhere or while
// disarmed does not; the reload takes the session once.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class PlayToWriteCoordinatorTests: XCTestCase {

    private var tmp: URL!
    private var storyURL: URL!
    private var editor: EditorViewController!

    private static let story = """
    story
      title: Probe
      id: probe

    create the Market
      a room

      Stalls crowd the square.
    """

    private static let ir = """
    {"format":"story language 4","languageVersion":"5.3.0",
     "meta":{"title":"Probe","fields":{"id":"probe","authors":[]}},
     "entities":[],
     "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
        "market.description":{"strategy":null,"variants":[],
                              "span":{"line":8,"column":3,"endLine":8,"endColumn":27}}}}}}
    """

    private static let catalog = MessageCatalog(
        schemaVersion: 1, locale: "en-US",
        messages: [.init(id: "if.action.taking.taken", alias: "taking-taken", template: "Taken.")])

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PlayToWriteCoordinatorTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storyURL = tmp.appendingPathComponent("probe.story")
        try Self.story.write(to: storyURL, atomically: true, encoding: .utf8)
        editor = EditorViewController()
        _ = editor.view
    }

    override func tearDownWithError() throws {
        editor = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private func decodedIR() throws -> ComposeStoryIR {
        let payload = try ComposeJsonPayload.decode(from: Data("""
        {"schemaVersion":2,"diagnostics":[],"ir":\(Self.ir)}
        """.utf8))
        return try XCTUnwrap(payload.ir)
    }

    private func request(_ id: String, history: [String]) -> PlayEditRequest {
        PlayEditRequest(messageId: id, turn: 1, text: "", history: history)
    }

    /// UTF-16 offset of the first character of a 1-based line in `text`.
    private func offset(ofLine line: Int, in text: String) -> Int {
        let lines = text.components(separatedBy: "\n")
        return (lines.prefix(line - 1).joined(separator: "\n") as NSString).length + (line > 1 ? 1 : 0)
    }

    // MARK: A story phrase

    func testAPhraseClickOpensTheStoryAtThePhrasesLineAndArmsTheRound() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.handle(request("market.description", history: ["look"]), storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(editor.openDocumentURLs, [storyURL])
        let text = try XCTUnwrap(editor.currentText(of: storyURL))
        XCTAssertEqual(editor.activeSelection?.location, offset(ofLine: 8, in: text), "the caret sits on the prose's line")
        XCTAssertEqual(coordinator.session, PlayToWriteSession(messageId: "market.description", history: ["look"]))
    }

    // MARK: A platform line (D4a)

    func testAPlatformLineClickLandsTheOverrideBlockInTheBufferUnsaved() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        coordinator.handle(request("if.action.taking.taken", history: ["take apple"]), storyURL: storyURL, ir: try decodedIR())

        let buffer = try XCTUnwrap(editor.currentText(of: storyURL))
        XCTAssertTrue(buffer.hasSuffix("\n\noverride message taking-taken\n  Taken.\nend override\n"), "buffer was:\n\(buffer)")
        XCTAssertTrue(editor.hasUnsavedChanges(at: storyURL), "an ordinary typing edit — the author saves it")
        XCTAssertEqual(try String(contentsOf: storyURL, encoding: .utf8), Self.story, "nothing wrote the file behind the author")
        let proseLine = buffer.components(separatedBy: "\n").firstIndex(of: "  Taken.")! + 1
        XCTAssertEqual(editor.activeSelection?.location, offset(ofLine: proseLine, in: buffer))
        XCTAssertEqual(coordinator.session?.history, ["take apple"])
    }

    func testAPlatformLineBeforeTheCatalogFetchesItThenResolves() throws {
        var asked: [URL] = []
        let coordinator = PlayToWriteCoordinator(editor: editor) { storyFile, completion in
            asked.append(storyFile)
            completion(.success(Self.catalog))
        }
        coordinator.handle(request("if.action.taking.taken", history: []), storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(asked, [storyURL])
        XCTAssertEqual(coordinator.catalog, Self.catalog)
        XCTAssertTrue(try XCTUnwrap(editor.currentText(of: storyURL)).contains("override message taking-taken"))
        XCTAssertNotNil(coordinator.session)
    }

    func testAnUnresolvableParagraphReportsAndArmsNothing() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor) { _, completion in completion(.success(Self.catalog)) }
        var reported: [String] = []
        coordinator.onUnresolved = { request, _ in reported.append(request.messageId) }
        coordinator.handle(request("if.action.nothing.here", history: []), storyURL: storyURL, ir: try decodedIR())

        XCTAssertEqual(reported, ["if.action.nothing.here"])
        XCTAssertNil(coordinator.session)
        XCTAssertTrue(editor.openDocumentURLs.isEmpty)
    }

    // MARK: The save that finishes the edit

    func testASaveInsideTheStoryWhileArmedRequestsTheBuild() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        var builds = 0
        coordinator.onBuildRequested = { builds += 1 }

        coordinator.documentSaved(storyURL, storyURL: storyURL)
        XCTAssertEqual(builds, 0, "not armed: a save is just a save")

        coordinator.handle(request("market.description", history: ["look"]), storyURL: storyURL, ir: try decodedIR())
        coordinator.documentSaved(tmp.appendingPathComponent("../elsewhere.story"), storyURL: storyURL)
        XCTAssertEqual(builds, 0, "a save outside the story never builds")
        coordinator.documentSaved(storyURL, storyURL: nil)
        XCTAssertEqual(builds, 0, "no story, no build")

        coordinator.documentSaved(storyURL, storyURL: storyURL)
        XCTAssertEqual(builds, 1)

        XCTAssertEqual(coordinator.takeSession(), PlayToWriteSession(messageId: "market.description", history: ["look"]))
        XCTAssertNil(coordinator.takeSession(), "the reload takes the session once")
        coordinator.documentSaved(storyURL, storyURL: storyURL)
        XCTAssertEqual(builds, 1, "disarmed after the reload took it")
    }

    func testResetDisarmsAndForgetsTheCatalog() throws {
        let coordinator = PlayToWriteCoordinator(editor: editor)
        coordinator.catalog = Self.catalog
        coordinator.handle(request("market.description", history: []), storyURL: storyURL, ir: try decodedIR())
        coordinator.reset()
        XCTAssertNil(coordinator.session)
        XCTAssertNil(coordinator.catalog)
    }
}
