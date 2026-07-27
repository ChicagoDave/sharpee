// RecentProjectsStoreTests.swift
// Covers RecentProjectsStore: load default, push (dedupe + LRU order),
// cap-at-maxCount, remove (present + absent), clear — and the ADR-258 D8
// migration rule: entries that are not story targets (an ADR-185-era
// TypeScript project, a vanished folder) are dropped on load, never offered.

import XCTest
@testable import SharpeeIDE

final class RecentProjectsStoreTests: XCTestCase {

    private var defaults: UserDefaults!
    private var tmp: URL!
    private let suiteName = "net.sharpee.ide.tests.RecentProjectsStoreTests"

    override func setUpWithError() throws {
        super.setUp()
        UserDefaults().removePersistentDomain(forName: suiteName)
        defaults = UserDefaults(suiteName: suiteName)
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-RecentProjectsStoreTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        defaults.removePersistentDomain(forName: suiteName)
        defaults = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// A real folder containing `<name>.story` — a valid story target (D2).
    private func storyProject(_ name: String) throws -> URL {
        let dir = tmp.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try "story \"\(name)\" by \"T\"\n  id: \(name)\n"
            .write(to: dir.appendingPathComponent("\(name).story"), atomically: true, encoding: .utf8)
        return dir
    }

    /// A real folder shaped like an ADR-185 TypeScript project — NOT a story target.
    private func typescriptProject(_ name: String) throws -> URL {
        let dir = tmp.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: dir.appendingPathComponent("src"),
                                                withIntermediateDirectories: true)
        try "{}".write(to: dir.appendingPathComponent("package.json"), atomically: true, encoding: .utf8)
        return dir
    }

    // MARK: - load

    func testLoadReturnsEmptyWhenNothingPersisted() {
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [])
    }

    func testLoadReturnsEmptyOnCorruptData() {
        defaults.set(Data("not json".utf8), forKey: RecentProjectsStore.key)
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [])
    }

    // MARK: - D8 migration on load

    func testLoadDropsTypeScriptProjectEntries() throws {
        let story = try storyProject("keeper")
        let ts = try typescriptProject("old-ts")
        // Persist both raw — simulating a pre-ADR-258 recents list.
        let data = try JSONEncoder().encode([ts, story])
        defaults.set(data, forKey: RecentProjectsStore.key)

        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [story],
                       "a recents entry pointing at a TypeScript project is dropped on load (D8)")
    }

    func testLoadDropsVanishedFolders() throws {
        let story = try storyProject("keeper")
        let gone = tmp.appendingPathComponent("vanished", isDirectory: true)
        let data = try JSONEncoder().encode([gone, story])
        defaults.set(data, forKey: RecentProjectsStore.key)

        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [story])
    }

    func testLoadKeepsDirectStoryFileEntries() throws {
        let dir = try storyProject("keeper")
        let file = dir.appendingPathComponent("keeper.story")
        let data = try JSONEncoder().encode([file])
        defaults.set(data, forKey: RecentProjectsStore.key)

        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [file],
                       "a .story FILE entry is a valid open target (D2)")
    }

    // MARK: - push

    func testPushAppendsToEmptyList() throws {
        let a = try storyProject("a")
        RecentProjectsStore.push(a, to: defaults)
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [a])
    }

    func testPushPlacesNewestAtFront() throws {
        let a = try storyProject("a")
        let b = try storyProject("b")
        let c = try storyProject("c")
        RecentProjectsStore.push(a, to: defaults)
        RecentProjectsStore.push(b, to: defaults)
        RecentProjectsStore.push(c, to: defaults)
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [c, b, a])
    }

    func testPushExistingURLDedupesAndMovesToFront() throws {
        let a = try storyProject("a")
        let b = try storyProject("b")
        let c = try storyProject("c")
        RecentProjectsStore.push(a, to: defaults)
        RecentProjectsStore.push(b, to: defaults)
        RecentProjectsStore.push(c, to: defaults)

        // Push `a` again — should move it from tail to head, not duplicate.
        RecentProjectsStore.push(a, to: defaults)

        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [a, c, b])
    }

    func testPushBeyondCapTrimsOldestFromTail() throws {
        var urls: [URL] = []
        for i in 0..<12 {
            let u = try storyProject("p\(i)")
            urls.append(u)
            RecentProjectsStore.push(u, to: defaults)
        }

        let loaded = RecentProjectsStore.load(from: defaults)
        XCTAssertEqual(loaded.count, RecentProjectsStore.maxCount)
        // Newest first: p11, p10, ..., p2
        XCTAssertEqual(loaded, urls[2...11].reversed().map { $0 })
    }

    // MARK: - remove

    func testRemovePresentURLDropsIt() throws {
        let a = try storyProject("a")
        let b = try storyProject("b")
        let c = try storyProject("c")
        RecentProjectsStore.push(a, to: defaults)
        RecentProjectsStore.push(b, to: defaults)
        RecentProjectsStore.push(c, to: defaults)

        RecentProjectsStore.remove(b, from: defaults)

        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [c, a])
    }

    func testRemoveAbsentURLIsNoOp() throws {
        let a = try storyProject("a")
        let b = try storyProject("b")
        RecentProjectsStore.push(a, to: defaults)
        RecentProjectsStore.push(b, to: defaults)

        RecentProjectsStore.remove(tmp.appendingPathComponent("never-added"), from: defaults)

        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [b, a])
    }

    // MARK: - clear

    func testClearRemovesAllEntries() throws {
        let a = try storyProject("a")
        RecentProjectsStore.push(a, to: defaults)
        XCTAssertFalse(RecentProjectsStore.load(from: defaults).isEmpty)

        RecentProjectsStore.clear(from: defaults)

        XCTAssertNil(defaults.data(forKey: RecentProjectsStore.key))
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [])
    }
}
