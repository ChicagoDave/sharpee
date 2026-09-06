// PlayStubsHeaderTests.swift
// The Play header's Stubs pull-down (ADR-333 D6): hidden with nothing to
// list, titled by count with one item per stub in play order (turn and the
// text, long text trimmed), and a pick reporting the stub behind the item —
// the pull-down's title item sits at index 0, so the arithmetic is what a
// regression would break. Assertions read the NSPopUpButton's own state.
// Owner context: tools/ide — Tests.

import AppKit
import XCTest
@testable import SharpeeIDE

@MainActor
final class PlayStubsHeaderTests: XCTestCase {

    private var header: PlayHeaderView!

    /// The pull-down embedded in the header — the one pop-up that pulls down.
    private var menu: NSPopUpButton {
        for subview in header.subviews {
            if let popup = subview as? NSPopUpButton, popup.pullsDown { return popup }
        }
        XCTFail("no pull-down in the header")
        return NSPopUpButton()
    }

    private static let stubs = [
        PlayStub(messageId: "apple.description", turn: 2, text: "(TODO during play-testing — what the apple looks like)"),
        PlayStub(messageId: "apple.apple-first-bite", turn: 3,
                 text: "(TODO during play-testing — the first bite, which runs on and on past sixty characters of prose)"),
    ]

    override func setUp() {
        super.setUp()
        header = PlayHeaderView()
    }

    func testHiddenUntilAPathPrintsAStub() {
        XCTAssertTrue(menu.isHidden)
        header.setStubs(Self.stubs)
        XCTAssertFalse(menu.isHidden)
        header.setStubs([])
        XCTAssertTrue(menu.isHidden)
        XCTAssertEqual(header.stubs, [])
    }

    func testListsTheCountThenOneItemPerStubInPlayOrder() {
        header.setStubs(Self.stubs)
        XCTAssertEqual(menu.itemArray.map(\.title), [
            "Stubs (2)",
            "turn 2 · (TODO during play-testing — what the apple looks like)",
            "turn 3 · (TODO during play-testing — the first bite, which runs on an…",
        ])
        XCTAssertEqual(header.stubs, Self.stubs)
    }

    func testPickingAnItemReportsTheStubBehindIt() {
        header.setStubs(Self.stubs)
        var picked: [PlayStub] = []
        header.onStubSelected = { picked.append($0) }

        menu.selectItem(at: 2)
        _ = menu.target?.perform(menu.action, with: menu)
        XCTAssertEqual(picked, [Self.stubs[1]], "item 2 is the second stub — the title sits at index 0")

        menu.selectItem(at: 0)
        _ = menu.target?.perform(menu.action, with: menu)
        XCTAssertEqual(picked.count, 1, "the title item reports nothing")
    }
}
