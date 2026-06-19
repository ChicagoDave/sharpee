// SessionStateTests.swift
// Covers SessionState Codable behavior (including forward-compat for iteration-1
// payloads that predate `expandedFolderURLs`) and SessionStateStore's read/write/clear
// cycle against an isolated UserDefaults suite.

import XCTest
@testable import SharpeeIDE

final class SessionStateTests: XCTestCase {

    private var defaults: UserDefaults!
    private let suiteName = "net.sharpee.ide.tests.SessionStateTests"

    override func setUp() {
        super.setUp()
        UserDefaults().removePersistentDomain(forName: suiteName)
        defaults = UserDefaults(suiteName: suiteName)
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        super.tearDown()
    }

    // MARK: - Codable roundtrip

    func testFullStateRoundtripsThroughJSON() throws {
        let original = SessionState(
            projectURL: URL(fileURLWithPath: "/repo"),
            openDocumentURLs: [
                URL(fileURLWithPath: "/repo/a.swift"),
                URL(fileURLWithPath: "/repo/b.swift"),
            ],
            activeIndex: 1,
            expandedFolderURLs: [URL(fileURLWithPath: "/repo/src")]
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(SessionState.self, from: data)

        XCTAssertEqual(decoded.projectURL, original.projectURL)
        XCTAssertEqual(decoded.openDocumentURLs, original.openDocumentURLs)
        XCTAssertEqual(decoded.activeIndex, original.activeIndex)
        XCTAssertEqual(decoded.expandedFolderURLs, original.expandedFolderURLs)
    }

    func testNilProjectAndActiveIndexRoundtrip() throws {
        let original = SessionState(
            projectURL: nil,
            openDocumentURLs: [],
            activeIndex: nil
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(SessionState.self, from: data)

        XCTAssertNil(decoded.projectURL)
        XCTAssertEqual(decoded.openDocumentURLs, [])
        XCTAssertNil(decoded.activeIndex)
        XCTAssertEqual(decoded.expandedFolderURLs, [])
    }

    // MARK: - Forward compatibility

    func testIterationOnePayloadDecodesWithEmptyExpansion() throws {
        // Iteration-1 payloads (committed before expandedFolderURLs existed) have
        // no `expandedFolderURLs` key. The custom decoder must default it to [].
        let json = """
        {
            "projectURL": "file:///repo/",
            "openDocumentURLs": ["file:///repo/main.swift"],
            "activeIndex": 0
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(SessionState.self, from: json)

        XCTAssertEqual(decoded.projectURL?.path, "/repo")
        XCTAssertEqual(decoded.openDocumentURLs.map(\.path), ["/repo/main.swift"])
        XCTAssertEqual(decoded.activeIndex, 0)
        XCTAssertEqual(decoded.expandedFolderURLs, [])
    }

    func testEmptyObjectDecodesToDefaults() throws {
        let json = "{}".data(using: .utf8)!
        let decoded = try JSONDecoder().decode(SessionState.self, from: json)

        XCTAssertNil(decoded.projectURL)
        XCTAssertEqual(decoded.openDocumentURLs, [])
        XCTAssertNil(decoded.activeIndex)
        XCTAssertEqual(decoded.expandedFolderURLs, [])
        XCTAssertFalse(decoded.buildPanelVisible)
    }

    func testPayloadWithoutBuildPanelVisibleDefaultsFalse() throws {
        // Payloads predating buildPanelVisible must decode with it defaulting to false.
        let json = """
        {
            "projectURL": "file:///repo/",
            "openDocumentURLs": [],
            "expandedFolderURLs": []
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(SessionState.self, from: json)
        XCTAssertFalse(decoded.buildPanelVisible)
    }

    func testBuildPanelVisibleRoundtrips() throws {
        let original = SessionState(projectURL: URL(fileURLWithPath: "/repo"),
                                    openDocumentURLs: [],
                                    activeIndex: nil,
                                    buildPanelVisible: true)
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(SessionState.self, from: data)
        XCTAssertTrue(decoded.buildPanelVisible)
    }

    // MARK: - Store load/save/clear

    func testLoadReturnsNilWhenNoDataPersisted() {
        XCTAssertNil(SessionStateStore.load(from: defaults))
    }

    func testLoadReturnsNilOnCorruptData() {
        defaults.set(Data("not json".utf8), forKey: SessionStateStore.key)
        XCTAssertNil(SessionStateStore.load(from: defaults))
    }

    func testSaveThenLoadReturnsEquivalentState() {
        let state = SessionState(
            projectURL: URL(fileURLWithPath: "/repo"),
            openDocumentURLs: [URL(fileURLWithPath: "/repo/x.swift")],
            activeIndex: 0,
            expandedFolderURLs: [URL(fileURLWithPath: "/repo/src")]
        )

        SessionStateStore.save(state, to: defaults)

        // Verify the data actually landed in the defaults store.
        XCTAssertNotNil(defaults.data(forKey: SessionStateStore.key))

        let loaded = SessionStateStore.load(from: defaults)
        XCTAssertNotNil(loaded)
        XCTAssertEqual(loaded?.projectURL, state.projectURL)
        XCTAssertEqual(loaded?.openDocumentURLs, state.openDocumentURLs)
        XCTAssertEqual(loaded?.activeIndex, state.activeIndex)
        XCTAssertEqual(loaded?.expandedFolderURLs, state.expandedFolderURLs)
    }

    func testClearRemovesThePersistedEntry() {
        let state = SessionState(
            projectURL: URL(fileURLWithPath: "/repo"),
            openDocumentURLs: [],
            activeIndex: nil
        )
        SessionStateStore.save(state, to: defaults)
        XCTAssertNotNil(defaults.data(forKey: SessionStateStore.key))

        SessionStateStore.clear(from: defaults)

        XCTAssertNil(defaults.data(forKey: SessionStateStore.key))
        XCTAssertNil(SessionStateStore.load(from: defaults))
    }
}
