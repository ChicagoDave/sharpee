// StoryTitleBarTests.swift
// The window's title strip: the story title is drawn CENTERED on the window,
// not leading-aligned beside the traffic lights (macOS 26's native placement).
// Drives the real MainWindowController and measures the label's position in
// window coordinates.
// Owner context: tools/ide — Tests.

import XCTest
import AppKit
@testable import SharpeeIDE

@MainActor
final class StoryTitleBarTests: XCTestCase {

    private func pump(_ seconds: TimeInterval = 0.1) {
        RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
    }

    private func findLabel(in view: NSView) -> NSTextField? {
        if let field = view as? NSTextField,
           field.accessibilityIdentifier() == StoryTitleBarViewController.labelIdentifier {
            return field
        }
        for sub in view.subviews {
            if let found = findLabel(in: sub) { return found }
        }
        return nil
    }

    /// The strip is the top of the CONTENT view — the window runs
    /// `.fullSizeContentView`, so the chrome band belongs to us.
    private func titleLabel(in window: NSWindow) throws -> NSTextField {
        try XCTUnwrap(findLabel(in: XCTUnwrap(window.contentView)),
                      "the title strip must live in the content view")
    }

    private func launchWindow() throws -> (MainWindowController, NSWindow) {
        let controller = MainWindowController()
        let window = try XCTUnwrap(controller.window)
        window.setFrame(NSRect(x: 0, y: 0, width: 1400, height: 900), display: true)
        window.orderFront(nil)
        pump()
        return (controller, window)
    }

    func testTheNativeTitleIsHiddenSoItCannotDrawLeadingAligned() throws {
        let (_, window) = try launchWindow()
        defer { window.orderOut(nil) }

        XCTAssertEqual(window.titleVisibility, .hidden,
                       "the native title must not draw — the strip owns the title")
        XCTAssertEqual(window.title, AppIdentity.productName,
                       "the window still CARRIES the title for the Window menu")
    }

    /// The whole point of `.fullSizeContentView`: the title sits IN the chrome
    /// band, not in a strip added below it.
    func testTheStripOccupiesTheTitlebarBandRatherThanAddingARow() throws {
        let (_, window) = try launchWindow()
        defer { window.orderOut(nil) }

        XCTAssertTrue(window.styleMask.contains(.fullSizeContentView))
        XCTAssertTrue(window.titlebarAppearsTransparent)

        let contentView = try XCTUnwrap(window.contentView)
        let band = window.frame.height - window.contentLayoutRect.height
        XCTAssertGreaterThan(band, 0, "a titled window has a chrome band to occupy")

        let strip = try XCTUnwrap(findLabel(in: contentView)?.superview,
                                  "the label must sit in the strip")
        XCTAssertEqual(strip.frame.height, band, accuracy: 1,
                       "the strip must be exactly the titlebar band — no extra row")

        // In AppKit's bottom-up geometry the band is flush with the window top.
        let stripInWindow = strip.convert(strip.bounds, to: nil)
        XCTAssertEqual(stripInWindow.maxY, window.frame.height, accuracy: 1,
                       "and flush with the top of the window")
    }

    /// The traffic lights float over the strip's leading edge; a centered title
    /// must stay clear of them.
    func testTheTitleClearsTheTrafficLights() throws {
        let (_, window) = try launchWindow()
        defer { window.orderOut(nil) }

        let closeButton = try XCTUnwrap(window.standardWindowButton(.closeButton))
        let lights = closeButton.convert(closeButton.bounds, to: nil)
        let label = try titleLabel(in: window)
        let frame = label.convert(label.bounds, to: nil)

        XCTAssertGreaterThan(frame.minX, lights.maxX,
                             "the title must not run under the traffic lights")
    }

    func testTheTitleIsCenteredOnTheWindow() throws {
        let (_, window) = try launchWindow()
        defer { window.orderOut(nil) }

        let label = try titleLabel(in: window)
        let frame = label.convert(label.bounds, to: nil)   // window coordinates
        XCTAssertEqual(frame.midX, window.frame.width / 2, accuracy: 2,
                       "the story title must sit on the window's centre line")
    }

    func testTheStripShowsTheProductNameUntilAStoryIsComposed() throws {
        let (_, window) = try launchWindow()
        defer { window.orderOut(nil) }

        XCTAssertEqual(try titleLabel(in: window).stringValue, AppIdentity.productName)
    }

    func testTheStripStaysCenteredWhenTheWindowResizes() throws {
        let (_, window) = try launchWindow()
        defer { window.orderOut(nil) }

        window.setFrame(NSRect(x: 0, y: 0, width: 1000, height: 700), display: true)
        pump()

        let label = try titleLabel(in: window)
        let frame = label.convert(label.bounds, to: nil)
        XCTAssertEqual(frame.midX, window.frame.width / 2, accuracy: 2,
                       "a resize must not knock the title off centre")
    }
}
