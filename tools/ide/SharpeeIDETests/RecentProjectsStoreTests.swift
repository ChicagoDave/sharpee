// RecentProjectsStoreTests.swift
// Covers RecentProjectsStore: load default, push (dedupe + LRU order),
// cap-at-maxCount, remove (present + absent), clear.

import XCTest
@testable import SharpeeIDE

final class RecentProjectsStoreTests: XCTestCase {

    private var defaults: UserDefaults!
    private let suiteName = "net.sharpee.ide.tests.RecentProjectsStoreTests"

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

    private func url(_ path: String) -> URL {
        URL(fileURLWithPath: path)
    }

    // MARK: - load

    func testLoadReturnsEmptyWhenNothingPersisted() {
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [])
    }

    func testLoadReturnsEmptyOnCorruptData() {
        defaults.set(Data("not json".utf8), forKey: RecentProjectsStore.key)
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [])
    }

    // MARK: - push

    func testPushAppendsToEmptyList() {
        RecentProjectsStore.push(url("/a"), to: defaults)
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [url("/a")])
    }

    func testPushPlacesNewestAtFront() {
        RecentProjectsStore.push(url("/a"), to: defaults)
        RecentProjectsStore.push(url("/b"), to: defaults)
        RecentProjectsStore.push(url("/c"), to: defaults)
        XCTAssertEqual(
            RecentProjectsStore.load(from: defaults),
            [url("/c"), url("/b"), url("/a")]
        )
    }

    func testPushExistingURLDedupesAndMovesToFront() {
        RecentProjectsStore.push(url("/a"), to: defaults)
        RecentProjectsStore.push(url("/b"), to: defaults)
        RecentProjectsStore.push(url("/c"), to: defaults)

        // Push `/a` again — should move it from tail to head, not duplicate.
        RecentProjectsStore.push(url("/a"), to: defaults)

        XCTAssertEqual(
            RecentProjectsStore.load(from: defaults),
            [url("/a"), url("/c"), url("/b")]
        )
    }

    func testPushBeyondCapTrimsOldestFromTail() {
        // Push 12 distinct entries; only the most-recent 10 should remain.
        for i in 0..<12 {
            RecentProjectsStore.push(url("/p\(i)"), to: defaults)
        }

        let loaded = RecentProjectsStore.load(from: defaults)
        XCTAssertEqual(loaded.count, RecentProjectsStore.maxCount)

        // Newest first: /p11, /p10, /p9, ..., /p2
        let expected = (2...11).reversed().map { url("/p\($0)") }
        XCTAssertEqual(loaded, expected)
    }

    // MARK: - remove

    func testRemovePresentURLDropsIt() {
        RecentProjectsStore.push(url("/a"), to: defaults)
        RecentProjectsStore.push(url("/b"), to: defaults)
        RecentProjectsStore.push(url("/c"), to: defaults)

        RecentProjectsStore.remove(url("/b"), from: defaults)

        XCTAssertEqual(
            RecentProjectsStore.load(from: defaults),
            [url("/c"), url("/a")]
        )
    }

    func testRemoveAbsentURLIsNoOp() {
        RecentProjectsStore.push(url("/a"), to: defaults)
        RecentProjectsStore.push(url("/b"), to: defaults)

        RecentProjectsStore.remove(url("/never-added"), from: defaults)

        XCTAssertEqual(
            RecentProjectsStore.load(from: defaults),
            [url("/b"), url("/a")]
        )
    }

    // MARK: - clear

    func testClearRemovesAllEntries() {
        RecentProjectsStore.push(url("/a"), to: defaults)
        RecentProjectsStore.push(url("/b"), to: defaults)
        XCTAssertFalse(RecentProjectsStore.load(from: defaults).isEmpty)

        RecentProjectsStore.clear(from: defaults)

        XCTAssertNil(defaults.data(forKey: RecentProjectsStore.key))
        XCTAssertEqual(RecentProjectsStore.load(from: defaults), [])
    }
}
