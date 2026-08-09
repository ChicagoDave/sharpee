// PublishTabTests.swift
// The Publish tab (ADR-284, go-live item 1). Drives the real PublishView and
// the real PublishController — the controller's REAL-PATH test runs an actual
// child process through the real BuildRunner spawn, with a fixture script
// standing in for the toolchain binary only (the same seam BuildRunnerTests
// uses, and the reason nothing here stubs Process, pipes or signals).
//
// What is deliberately NOT re-implemented, and so not tested here: the publish
// preconditions. `sharpee publish` owns them (devkit's publish.test.ts covers
// the refusals); a second IFID check in Swift is exactly the drift ADR-284 D1
// exists to prevent.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class PublishTabTests: XCTestCase {

    private var tmp: URL!

    override func setUpWithError() throws {
        try super.setUpWithError()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-PublishTests-\(UUID().uuidString)", isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        try super.tearDown()
    }

    private func button(_ identifier: String, in view: NSView) -> NSButton? {
        if let button = view as? NSButton, button.accessibilityIdentifier() == identifier {
            return button
        }
        for sub in view.subviews {
            if let found = button(identifier, in: sub) { return found }
        }
        return nil
    }

    /// Forces layout so the view's subtree exists before it is searched.
    private func loadedView() -> PublishView {
        let view = PublishView()
        view.frame = NSRect(x: 0, y: 0, width: 600, height: 400)
        view.layoutSubtreeIfNeeded()
        return view
    }

    // MARK: - The view

    func testPublishIsRefusedUntilAStoryIsOpen() throws {
        let view = loadedView()
        let publish = try XCTUnwrap(button(PublishView.publishIdentifier, in: view))

        XCTAssertFalse(publish.isEnabled, "there is nothing to publish without a story")

        view.setStory(tmp.appendingPathComponent("fernhill.story"))
        XCTAssertTrue(publish.isEnabled)

        view.setStory(nil)
        XCTAssertFalse(publish.isEnabled, "closing the project must disable it again")
    }

    func testASuccessfulRunOffersTheArtifact() throws {
        let view = loadedView()
        view.setStory(tmp.appendingPathComponent("fernhill.story"))
        let zip = tmp.appendingPathComponent("fernhill.zip")
        try Data(repeating: 0, count: 2_097_152).write(to: zip) // 2 MB

        view.begin()
        view.append("building…\n")
        view.finish(succeeded: true, zipURL: zip)

        let reveal = try XCTUnwrap(button(PublishView.revealIdentifier, in: view))
        XCTAssertFalse(reveal.isHidden, "a produced artifact must be reachable from the tab")

        var revealed: [URL] = []
        view.onReveal = { revealed.append($0) }
        reveal.performClick(nil)
        XCTAssertEqual(revealed, [zip])
    }

    func testAFailedRunOffersNothingAndPointsAtTheOutput() throws {
        let view = loadedView()
        view.setStory(tmp.appendingPathComponent("fernhill.story"))

        view.begin()
        view.append("publish: fernhill.story has no `ifid:`\n")
        view.finish(succeeded: false, zipURL: nil)

        let reveal = try XCTUnwrap(button(PublishView.revealIdentifier, in: view))
        XCTAssertTrue(reveal.isHidden, "there is no artifact to reveal after a failure")

        var revealed = 0
        view.onReveal = { _ in revealed += 1 }
        reveal.performClick(nil)
        XCTAssertEqual(revealed, 0, "a hidden button must not still fire")

        // And the tab is ready to try again.
        let publish = try XCTUnwrap(button(PublishView.publishIdentifier, in: view))
        XCTAssertFalse(publish.isHidden)
        XCTAssertTrue(publish.isEnabled)
    }

    func testAnEarlierResultIsClearedWhenTheNextRunStarts() throws {
        let view = loadedView()
        view.setStory(tmp.appendingPathComponent("fernhill.story"))
        let zip = tmp.appendingPathComponent("fernhill.zip")
        try Data([0]).write(to: zip)

        view.begin()
        view.finish(succeeded: true, zipURL: zip)
        XCTAssertFalse(try XCTUnwrap(button(PublishView.revealIdentifier, in: view)).isHidden)

        view.begin()

        XCTAssertTrue(try XCTUnwrap(button(PublishView.revealIdentifier, in: view)).isHidden,
                      "the previous artifact must not be offered while a new run is going")
    }

    // MARK: - REAL-PATH TEST (rule 13a): a real child process

    /// The controller spawns a REAL process, streams its REAL output, and
    /// reports the artifact only when the file is actually there. Only the
    /// toolchain binary is a fixture — the spawn, the pipes and the exit
    /// handling are the production path.
    func testTheControllerStreamsARealProcessAndReportsTheArtifact() async throws {
        let zip = tmp.appendingPathComponent("out.zip")
        let script = tmp.appendingPathComponent("fake-sharpee.sh")
        try """
        #!/bin/bash
        echo "📦 Publishing fernhill"
        printf '%s' "zip bytes" > "$4"
        exit 0
        """.write(to: script, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: script.path)

        let controller = PublishController()
        var output = ""
        var finished: (Bool, URL?)?
        controller.onOutput = { output += $0 }
        controller.onFinished = { finished = ($0, $1) }

        try await run(controller, script: script, zip: zip, finished: { finished != nil })

        XCTAssertTrue(output.contains("Publishing fernhill"),
                      "the toolchain's own words must reach the tab; got \(output)")
        XCTAssertEqual(finished?.0, true)
        XCTAssertEqual(finished?.1, zip)
        XCTAssertEqual(try String(contentsOf: zip, encoding: .utf8), "zip bytes")
    }

    /// A non-zero exit is a failure, and NO artifact is claimed.
    func testAFailingToolchainRunReportsNoArtifact() async throws {
        let zip = tmp.appendingPathComponent("out.zip")
        let script = tmp.appendingPathComponent("fake-sharpee.sh")
        try """
        #!/bin/bash
        echo "publish: fernhill.story has no \\`ifid:\\`" >&2
        exit 2
        """.write(to: script, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: script.path)

        let controller = PublishController()
        var output = ""
        var finished: (Bool, URL?)?
        controller.onOutput = { output += $0 }
        controller.onFinished = { finished = ($0, $1) }

        try await run(controller, script: script, zip: zip, finished: { finished != nil })

        XCTAssertTrue(output.contains("has no"), "the refusal must reach the tab; got \(output)")
        XCTAssertEqual(finished?.0, false)
        XCTAssertNil(finished?.1, "a failed publish must not claim an artifact")
        XCTAssertFalse(FileManager.default.fileExists(atPath: zip.path))
    }

    /// A zero exit that wrote nothing is still a failure — claiming an artifact
    /// that is not on disk would be a worse lie than reporting the failure.
    func testAZeroExitThatWroteNothingIsNotASuccess() async throws {
        let zip = tmp.appendingPathComponent("out.zip")
        let script = tmp.appendingPathComponent("fake-sharpee.sh")
        try "#!/bin/bash\nexit 0\n".write(to: script, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: script.path)

        let controller = PublishController()
        var finished: (Bool, URL?)?
        controller.onFinished = { finished = ($0, $1) }

        try await run(controller, script: script, zip: zip, finished: { finished != nil })

        XCTAssertEqual(finished?.0, false)
        XCTAssertNil(finished?.1)
    }

    /// Drives the controller through its own spawn path with a fixture
    /// executable — the resolving overload looks for a real `sharpee`, which a
    /// test must not depend on being installed.
    private func run(_ controller: PublishController, script: URL, zip: URL,
                     finished: @escaping () -> Bool) async throws {
        controller.publish(executable: script,
                           storyFile: tmp.appendingPathComponent("story.story"),
                           to: zip)
        for _ in 0..<200 {
            if finished() { return }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
        XCTFail("the publish run did not finish within 5s")
    }
}
