// EditorWrapWidthTests.swift
// GH #290: after a pre-layout wrap sync leaves the text view's FRAME wider
// than the clip while the CONTAINER already matches, the next layout pass
// must still correct the frame — otherwise the clip can scroll sideways and
// hide the first characters of every line under the line-number gutter
// until a resize. Real path: the editor's real scroll view, ruler, and
// layout pass, hosted in a real window.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class EditorWrapWidthTests: XCTestCase {

    private var tmp: URL!
    private var window: NSWindow!
    private var editor: EditorViewController!

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-WrapWidthTests-\(UUID().uuidString)",
                                    isDirectory: true)
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        editor = EditorViewController()
        editor.view.frame = NSRect(x: 0, y: 0, width: 640, height: 400) // else the window shrinks to fit a zero view
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 400),
                          styleMask: [.titled], backing: .buffered, defer: false)
        window.contentViewController = editor
        window.setContentSize(NSSize(width: 640, height: 400))
        window.makeKeyAndOrderFront(nil)
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
    }

    override func tearDownWithError() throws {
        window?.orderOut(nil)
        window = nil
        editor = nil
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDownWithError()
    }

    private func findTextView(in view: NSView) -> NSTextView? {
        if let scroll = view as? NSScrollView, let tv = scroll.documentView as? NSTextView {
            return tv
        }
        for sub in view.subviews {
            if let found = findTextView(in: sub) { return found }
        }
        return nil
    }

    /// The reopen ordering: a forced sync ran before the window and split view
    /// settled, measuring the clip BEFORE the ruler was excluded. That leaves
    /// the frame one gutter too wide while the container — computed from the
    /// same measurement with the gutter subtracted — already holds the width
    /// the settled layout will compute. The settled layout pass must still fix
    /// the frame.
    func testLayoutPassCorrectsStaleFrameWhenContainerAlreadyMatches() throws {
        let file = tmp.appendingPathComponent("wrap.story")
        try "story: wrap\n\nThe quick brown fox jumps over the lazy dog, again and again.\n"
            .write(to: file, atomically: true, encoding: .utf8)
        editor.openDocument(at: file) // .story always soft-wraps
        editor.view.layoutSubtreeIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))

        let textView = try XCTUnwrap(findTextView(in: editor.view))
        let scrollView = try XCTUnwrap(textView.enclosingScrollView)
        let container = try XCTUnwrap(textView.textContainer)
        let clipWidth = scrollView.contentSize.width
        let rulerWidth = try XCTUnwrap(scrollView.verticalRulerView?.ruleThickness)
        XCTAssertGreaterThan(clipWidth, 100, "the hosted editor must have real geometry")

        // Settled state first: frame tracks the clip.
        XCTAssertEqual(textView.frame.width, clipWidth, accuracy: 0.5)
        let settledContainerWidth = container.containerSize.width

        // Reproduce the pre-layout sync's leftovers: frame too wide by the
        // gutter, container exactly as the settled pass would compute it.
        textView.setFrameSize(NSSize(width: clipWidth + rulerWidth, height: textView.frame.height))
        container.containerSize = NSSize(width: settledContainerWidth,
                                         height: CGFloat.greatestFiniteMagnitude)

        // The next layout pass (viewDidLayout → syncWrapWidth, unforced).
        editor.view.needsLayout = true
        editor.view.layoutSubtreeIfNeeded()

        XCTAssertEqual(textView.frame.width, clipWidth, accuracy: 0.5,
                       "a layout pass must re-sync a stale frame even when the container already matches (GH #290)")
        XCTAssertEqual(container.containerSize.width, settledContainerWidth, accuracy: 0.5)
    }

    /// The state David keeps seeing: while the frame was one gutter too wide,
    /// a sideways swipe slid the clip right. Correcting the frame width does
    /// not move the clip back, so the first characters of every line stay
    /// under the gutter. A slide must not stick: the clip's bounds-change
    /// sync clamps it straight back, and a layout pass keeps it at rest.
    ///
    /// "At rest" is NOT x = 0 (the 2026-08-23 gutter-clamp-origin fix): with
    /// automaticallyAdjustsContentInsets AppKit reserves the ruler's gutter
    /// through the clip view's contentInsets, so an unscrolled clip rests at
    /// x = -clip.contentInsets.left (-46 with the gutter). Pinning it to 0 was
    /// the margin bug itself, so this test reads the resting origin from the
    /// clip rather than asserting a constant.
    func testASidewaysSlideCannotStickInWrapMode() throws {
        let file = tmp.appendingPathComponent("slid.chord")
        try "## a fragment\n\ncreate Teisha\n  a person, proper\n"
            .write(to: file, atomically: true, encoding: .utf8)
        editor.openDocument(at: file) // .chord always soft-wraps
        editor.view.layoutSubtreeIfNeeded()
        RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))

        let textView = try XCTUnwrap(findTextView(in: editor.view))
        let scrollView = try XCTUnwrap(textView.enclosingScrollView)
        let clip = scrollView.contentView
        let clipWidth = scrollView.contentSize.width
        let rulerWidth = try XCTUnwrap(scrollView.verticalRulerView?.ruleThickness)
        let restingX = -clip.contentInsets.left
        XCTAssertEqual(clip.bounds.origin.x, restingX, accuracy: 0.5,
                       "settled editor starts at the resting origin (the gutter inset, not 0)")

        // Stale wide frame, then the sideways slide it permits.
        textView.setFrameSize(NSSize(width: clipWidth + rulerWidth, height: textView.frame.height))
        clip.scroll(to: NSPoint(x: restingX + rulerWidth, y: clip.bounds.origin.y))
        scrollView.reflectScrolledClipView(clip)
        XCTAssertEqual(clip.bounds.origin.x, restingX, accuracy: 0.5,
                       "wrapped text never scrolls sideways — the slide must be clamped back as it happens")

        editor.view.needsLayout = true
        editor.view.layoutSubtreeIfNeeded()

        XCTAssertEqual(clip.bounds.origin.x, restingX, accuracy: 0.5,
                       "and a layout pass must leave the clip at its resting origin")
        XCTAssertEqual(textView.frame.width, clipWidth, accuracy: 0.5)
    }
}
