// SplitDividerTests.swift
// Reproduces the reported divider bounce: dragging the project|editor divider
// must move it and it must STAY moved — no constraint re-asserting the prior
// width. Drives the real MainWindowController UI via NSSplitView.setPosition
// (the same constraint machinery a drag uses) and pumps the run loop.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class SplitDividerTests: XCTestCase {

    private func pump(_ seconds: TimeInterval = 0.1) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    private func findMainSplit(in view: NSView) -> NSSplitView? {
        if let split = view as? NSSplitView, split.isVertical,
           split.arrangedSubviews.count == 4 {
            return split
        }
        for sub in view.subviews {
            if let found = findMainSplit(in: sub) { return found }
        }
        return nil
    }

    private func findIndexView(in view: NSView) -> IndexView? {
        if let index = view as? IndexView { return index }
        for sub in view.subviews {
            if let found = findIndexView(in: sub) { return found }
        }
        return nil
    }

    /// A populated IR whose stats line is LONG — the exact content that made the
    /// right panel behave as fixed-width (a wrapping label's 750 compression
    /// resistance beating the divider) before the priority fix.
    private var fatIR: ComposeStoryIR {
        func entity(_ n: Int, kinds: [String]) -> ComposeStoryIR.Entity {
            ComposeStoryIR.Entity(id: "e\(n)", name: "Entity Number \(n)", isPlayer: false,
                                  kinds: kinds.map { ComposeStoryIR.Kind(name: $0) },
                                  span: DiagnosticSpan(line: n, column: 1, endLine: n, endColumn: 5))
        }
        return ComposeStoryIR(
            format: "story language 1", languageVersion: "2.1.0",
            meta: .init(title: "A Very Long Story Title Indeed", author: "Someone", fields: [:]),
            grammarFile: nil,
            entities: (1...30).map { entity($0, kinds: [$0 % 3 == 0 ? "room" : ($0 % 3 == 1 ? "person" : "portable")]) },
            actions: (1...9).map { ComposeStoryIR.ActionDef(name: "action-\($0)",
                                                            span: DiagnosticSpan(line: $0, column: 1, endLine: $0, endColumn: 5)) },
            phrases: .init(defaultLocale: "en-US", locales: [
                "en-US": .init(names: (1...40).map {
                    .init(key: "phrase-key-number-\($0)", span: nil)
                }),
            ]),
            hatches: [.init(name: "weather", modulePath: "./weather.ts", span: nil)])
    }

    func testProjectEditorDividerMovesAndSticks() throws {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }
        pump()

        // Populate the Index with a long stats line — the reported regression
        // trigger (hidden tabs still constrain).
        let indexView = try XCTUnwrap(findIndexView(in: window.contentView!))
        indexView.setState(.populated(ir: fatIR, stale: false))
        pump()

        let split = try XCTUnwrap(findMainSplit(in: window.contentView!),
                                  "the 4-pane horizontal split must exist")
        let project = split.arrangedSubviews[1]
        let before = project.frame.width

        // Widen the project pane by 80pt (divider 1 sits at rail + project).
        split.setPosition(split.arrangedSubviews[0].frame.width + before + 80, ofDividerAt: 1)
        pump()
        XCTAssertEqual(project.frame.width, before + 80, accuracy: 2,
                       "the divider must move — and not bounce back (left pane is not fixed-width)")

        // And back down (staying above minimumThickness 200 — AppKit clamps there).
        let narrower = max(before + 40, 210)
        split.setPosition(split.arrangedSubviews[0].frame.width + narrower, ofDividerAt: 1)
        pump()
        XCTAssertEqual(project.frame.width, narrower, accuracy: 2,
                       "narrowing must stick too")
    }

    /// The right pane: divider 2 (editor|play) must move both ways and stick —
    /// the play pane is not fixed-width (reported live with the Play header +
    /// placeholder showing, so that exact content is on screen here).
    func testEditorPlayDividerMovesBothWaysAndSticks() throws {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        defer { window.orderOut(nil) }
        pump()

        let split = try XCTUnwrap(findMainSplit(in: window.contentView!))
        let indexView = try XCTUnwrap(findIndexView(in: window.contentView!))
        indexView.setState(.populated(ir: fatIR, stale: false))
        pump()

        let play = split.arrangedSubviews[3]
        let before = play.frame.width

        // Widen the play pane by 120 (divider 2 moves left).
        split.setPosition(play.frame.minX - 120, ofDividerAt: 2)
        pump()
        XCTAssertEqual(play.frame.width, before + 120, accuracy: 2,
                       "the right pane must widen and stay widened")

        // Narrow it back down toward (but above) its 240 minimum.
        let target = max(before, 250)
        split.setPosition(split.bounds.width - target, ofDividerAt: 2)
        pump()
        XCTAssertEqual(play.frame.width, target, accuracy: 2,
                       "the right pane must narrow and stay narrowed")

        // And the position survives further layout passes (the snap-back property).
        let settled = play.frame.width
        split.needsLayout = true
        window.contentView?.needsLayout = true
        pump(0.2)
        XCTAssertEqual(play.frame.width, settled, accuracy: 1)
    }
}
