// SkeinPaneTests.swift
// The Skein tab's UX rework: rows that identify their node (the output preview
// line), and opening a committed `.skein` FILE into the surface rather than
// into the text editor (ADR-299 D7's artifact is threads, not JSON).
//
// The complaint these answer: a tree of `> north` four times over, with the
// text that distinguishes them behind a different tab.

import XCTest
@testable import SharpeeIDE

@MainActor
final class SkeinPaneTests: XCTestCase {

    private var tmp: URL!
    private var storeURL: URL!

    override func setUpWithError() throws {
        super.setUp()
        tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("SharpeeIDE-SkeinPaneTests-\(UUID().uuidString)",
                                    isDirectory: true)
            .resolvingSymlinksInPath()
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        storeURL = SkeinStore.url(forStoryId: "probe", projectRoot: tmp)
    }

    override func tearDownWithError() throws {
        if let tmp, FileManager.default.fileExists(atPath: tmp.path) {
            try FileManager.default.removeItem(at: tmp)
        }
        tmp = nil
        super.tearDown()
    }

    /// The shape from the screenshot that started this: sibling threads whose
    /// commands are identical and whose OUTPUTS are not.
    private func repeatedCommandDocument() -> SkeinDocument {
        let deep = SkeinNode(id: "n-deep", command: "north", output: "The Vestry.\nA door stands ajar.")
        let mid = SkeinNode(id: "n-mid", command: "north", output: "Chancel Steps.",
                            children: [deep])
        let viaNorth = SkeinNode(id: "n-north", command: "north", output: "Fernhill Lane.",
                                 children: [mid])
        let viaLook = SkeinNode(id: "n-look-north", command: "north", output: "The Green.")
        let look = SkeinNode(id: "n-look", command: "look", output: "A crossroads.",
                             children: [viaLook])
        return SkeinDocument(seed: 42,
                             root: SkeinNode(id: "n-root", command: "", output: "",
                                             children: [look, viaNorth]))
    }

    private func session(_ document: SkeinDocument) throws -> SkeinSession {
        try SkeinStore.write(document, to: storeURL)
        return try SkeinSession(storeURL: storeURL)
    }

    // MARK: - The preview line (what makes a row identify its node)

    func testThePreviewIsTheFirstNonEmptyLineOfOutput() {
        XCTAssertEqual(SkeinView.preview(of: "\n\nThe Vestry.\nA door stands ajar."),
                       "The Vestry.")
    }





    // MARK: - Undoing an all-paths blessing

    func testTheTranscriptSelectsTheNodeTheTreeChoseSoBlessActsOnIt() throws {
        // The halves carried independent selections: picking a node in the tree
        // showed its thread with NO block selected, and Bless / Unbless read
        // that selection — so they were disabled against the node just chosen.
        // That is what "you can't undo an all-paths blessing" looked like.
        let live = try session(repeatedCommandDocument())
        let view = TranscriptView()
        view.setSession(live)

        view.show(threadTo: "n-deep")

        XCTAssertEqual(view.selectedNodeId, "n-deep",
                       "the thread's terminal node is the node under discussion")
    }

    func testTheAuthorsOwnBlockSelectionSurvivesARepaint() throws {
        let live = try session(repeatedCommandDocument())
        let view = TranscriptView()
        view.setSession(live)
        view.show(threadTo: "n-deep")
        view.select(nodeId: "n-north")

        view.reload()

        XCTAssertEqual(view.selectedNodeId, "n-north",
                       "a repaint must not drag the author back to the terminal node")
    }

    func testAnAllPathsBlessingCanBeUndoneOnASkeinOpenedFromAFile() throws {
        // Every action guarded on `play.skein`, which is nil for a skein opened
        // from a file — so on a fully-populated tab, blessing and unblessing
        // were silent no-ops.
        try SkeinStore.write(repeatedCommandDocument(), to: storeURL)
        let panel = RightPanelViewController()
        _ = panel.view
        try panel.openSkein(at: storeURL)
        panel.skeinView.select(nodeId: "n-north")
        panel.updateTranscript()

        panel.transcriptView.onBless?("n-north", .allPaths)
        XCTAssertEqual(panel.skeinView.session?.document.node(withId: "n-north")?.blessing?.scope,
                       .allPaths, "the blessing must reach the document")

        panel.transcriptView.onUnbless?("n-north")
        XCTAssertNil(panel.skeinView.session?.document.node(withId: "n-north")?.blessing,
                     "and it must be revocable")

        // Persisted, not just in memory — the artifact is the record (D7).
        let reread = try SkeinStore.read(from: storeURL)
        XCTAssertNil(reread.node(withId: "n-north")?.blessing)
    }

    func testAnAllPathsObjectionIsWithdrawnAtTheNodeThatDeclaredIt() {
        // The claim is declared on ONE node and enforced on every node sharing
        // its command, so the red rows are not the row holding the blessing.
        // Acting on the selected node left Unbless disabled on exactly the rows
        // the author was trying to undo.
        let objected = SkeinNode(id: "n-violator", command: "north", output: "The Vestry.")
        let finding = SkeinFinding(kind: .invarianceViolated(blessedNodeId: "n-declarer"),
                                   nodeId: "n-violator", command: "north",
                                   blessed: "Gravel Drive.", actual: "The Vestry.")

        XCTAssertEqual(TranscriptView.revocableBlessingNode(for: objected, findings: [finding]),
                       "n-declarer",
                       "undo must reach the blessing, which is not on this row")
    }

    func testAChangedOutputObjectionIsWithdrawnAtTheNodeItself() {
        let node = SkeinNode(id: "n", command: "north", output: "The Vestry.",
                             blessing: SkeinBlessing(scope: .thisThread, output: "Gravel Drive."))
        let finding = SkeinFinding(kind: .changedOutput, nodeId: "n", command: "north",
                                   blessed: "Gravel Drive.", actual: "The Vestry.")

        XCTAssertEqual(TranscriptView.revocableBlessingNode(for: node, findings: [finding]), "n",
                       "this node's own blessing is the one that broke")
    }

    func testAPlainBlessedNodeIsWithdrawnAtItself() {
        let node = SkeinNode(id: "n", command: "north", output: "Gravel Drive.",
                             blessing: SkeinBlessing(scope: .allPaths, output: "Gravel Drive."))

        XCTAssertEqual(TranscriptView.revocableBlessingNode(for: node, findings: []), "n")
    }

    func testANodeWithNothingBlessedOffersNothingToWithdraw() {
        let node = SkeinNode(id: "n", command: "north", output: "Gravel Drive.")

        XCTAssertNil(TranscriptView.revocableBlessingNode(for: node, findings: []),
                     "the badge is not a control when there is no blessing behind it")
    }

    // MARK: - The verdict as the card's tint (no ✓/✗ column, no text band)

    func testABlessedNodeWhoseTextStillMatchesReadsAsHolding() {
        let node = SkeinNode(id: "n", command: "north", output: "Gravel Drive.",
                             blessing: SkeinBlessing(scope: .thisThread, output: "Gravel Drive."))

        XCTAssertEqual(TranscriptView.verdict(for: node, findings: []), .holds)
    }

    func testAnObjectedNodeReadsAsObjectedEvenThoughItIsBlessed() {
        // The verdict answers "does the vouch still hold", not "did I vouch".
        let node = SkeinNode(id: "n", command: "north", output: "The Vestry.",
                             blessing: SkeinBlessing(scope: .allPaths, output: "Gravel Drive."))
        let finding = SkeinFinding(kind: .invarianceViolated(blessedNodeId: "other"),
                                   nodeId: "n", command: "north",
                                   blessed: "Gravel Drive.", actual: "The Vestry.")

        XCTAssertEqual(TranscriptView.verdict(for: node, findings: [finding]), .objected)
    }

    func testAnUnblessedNodeCarriesNoVerdictRatherThanAFailingOne() {
        // D1 has no negative verdict — absence of bless, not presence of curse.
        // An unjudged turn must not read as a failing one.
        let node = SkeinNode(id: "n", command: "north", output: "Gravel Drive.")

        XCTAssertEqual(TranscriptView.verdict(for: node, findings: []), .unjudged)
    }

    func testEachVerdictTintsItsCardDistinctly() {
        // The tint IS the judgment, so two verdicts must never share a fill.
        let fills = [TranscriptView.Verdict.holds, .objected, .unjudged].map(\.cardFill)

        XCTAssertNotEqual(fills[0], fills[1])
        XCTAssertNotEqual(fills[0], fills[2])
        XCTAssertNotEqual(fills[1], fills[2])
    }

    func testTheBlockTextCarriesNoBackgroundOfItsOwn() {
        // Tinting the text read as highlighter pen and left the blocks
        // undelimited; the card carries the colour now.
        let node = SkeinNode(id: "n", command: "north", output: "Gravel Drive.",
                             blessing: SkeinBlessing(scope: .thisThread, output: "Gravel Drive."))
        let block = TranscriptView.block(node, actual: "Gravel Drive.", findings: [])

        for index in 0..<block.length {
            XCTAssertNil(block.attribute(.backgroundColor, at: index, effectiveRange: nil),
                         "no run of the block may paint its own background")
        }
    }

    // MARK: - Opening a `.skein` file into the surface

    func testOpeningASkeinFileShowsItsThreadsWithoutAnyPlaySession() throws {
        let document = repeatedCommandDocument()
        try SkeinStore.write(document, to: storeURL)

        let panel = RightPanelViewController()
        _ = panel.view // loadView

        try panel.openSkein(at: storeURL)

        // The tree has the file's threads…
        XCTAssertNotNil(panel.skeinView.selectedNodeId,
                        "a freshly-opened skein selects a thread rather than waiting for a click")
        // …and the transcript is already reading one, which is the whole point:
        // the artifact opens as its content, not as an instruction to click.
        XCTAssertEqual(panel.transcriptView.threadNodeId, "n-look-north",
                       "the first thread's terminal node, root→leaf by first children")
        XCTAssertTrue(panel.transcriptView.findings.isEmpty)
    }

    func testTheOpenedSessionSurvivesTheCallThatCreatedIt() throws {
        // Both halves hold their session WEAKLY (the Play pane is the normal
        // owner). A file-opened skein has no other owner, so without the
        // panel's own strong reference the tree reads as empty the instant
        // openSkein returns — the trap that made two tests vacuous last time.
        try SkeinStore.write(repeatedCommandDocument(), to: storeURL)

        let panel = RightPanelViewController()
        _ = panel.view
        try panel.openSkein(at: storeURL)

        XCTAssertEqual(panel.skeinView.session?.document.root.children.count, 2,
                       "the session must still be alive after openSkein returns")
    }

    func testReopeningTheSameFileReusesItsSessionRatherThanMintingASecondReader() throws {
        // Two SkeinSessions on one store would each overwrite the other's
        // blessings and tags, and a re-read discards the selection and this
        // boot's observations. One reader per file.
        try SkeinStore.write(repeatedCommandDocument(), to: storeURL)

        let panel = RightPanelViewController()
        _ = panel.view
        try panel.openSkein(at: storeURL)
        let first = panel.skeinView.session
        XCTAssertNotNil(first)
        XCTAssertTrue(panel.skeinView.select(nodeId: "n-deep"))
        XCTAssertEqual(panel.skeinView.selectedNodeId, "n-deep", "precondition")

        try panel.openSkein(at: storeURL)

        XCTAssertTrue(panel.skeinView.session === first,
                      "the open session must be reused, not replaced by a second reader")
        XCTAssertEqual(panel.skeinView.selectedNodeId, "n-deep",
                       "reuse keeps the author where they were")
    }

    func testTheTreeHighlightsTheThreadTheTranscriptFellBackTo() throws {
        // The halves are one surface: a transcript reading a thread over a tree
        // highlighting nothing gives two answers to "which thread am I in", and
        // leaves the row actions disabled against the thread on screen.
        try SkeinStore.write(repeatedCommandDocument(), to: storeURL)
        let panel = RightPanelViewController()
        _ = panel.view
        try panel.openSkein(at: storeURL)

        // Where play sits, with the tree repointed so it carries no selection —
        // the screenshot's state: a transcript reading a thread, a tree
        // highlighting nothing, and Replay disabled against the thread shown.
        let session = panel.skeinView.session!
        XCTAssertTrue(session.moveTo(nodeId: "n-deep"))
        panel.skeinView.deselect()

        panel.updateTranscript()

        XCTAssertEqual(panel.transcriptView.threadNodeId, "n-deep")
        XCTAssertEqual(panel.skeinView.selectedNodeId, "n-deep",
                       "the tree must name the same thread the transcript is reading")
    }

    func testOpeningADifferentSkeinRepointsBothHalves() throws {
        try SkeinStore.write(repeatedCommandDocument(), to: storeURL)
        let other = SkeinStore.url(forStoryId: "other", projectRoot: tmp)
        try SkeinStore.write(
            SkeinDocument(seed: 7,
                          root: SkeinNode(id: "o-root", command: "", output: "",
                                          children: [SkeinNode(id: "o-a", command: "wait",
                                                               output: "Time passes.")])),
            to: other)

        let panel = RightPanelViewController()
        _ = panel.view
        try panel.openSkein(at: storeURL)
        let first = panel.skeinView.session

        try panel.openSkein(at: other)

        XCTAssertFalse(panel.skeinView.session === first, "a different file is a different skein")
        XCTAssertEqual(panel.transcriptView.threadNodeId, "o-a")
    }

    func testAnUnreadableSkeinIsRefusedWithoutDisturbingWhatTheTabWasShowing() throws {
        let good = try session(repeatedCommandDocument())
        let panel = RightPanelViewController()
        _ = panel.view
        panel.skeinView.setSession(good)

        let bad = tmp.appendingPathComponent("wrong-version.skein")
        try Data(#"{"schemaVersion": 99, "seed": 1, "root": {}}"#.utf8).write(to: bad)

        XCTAssertThrowsError(try panel.openSkein(at: bad)) { error in
            XCTAssertEqual(error as? SkeinStore.DecodeError,
                           .schemaVersionMismatch(found: 99, expected: SkeinDocument.currentSchemaVersion))
        }
        XCTAssertTrue(panel.skeinView.session === good,
                      "a refused open must leave the tab on the skein it was showing")
    }

    func testSelectingANodeExpandsItsAncestorsSoTheRowExistsToBeSelected() throws {
        let live = try session(repeatedCommandDocument())
        let view = SkeinView()
        view.setSession(live)

        // n-deep is two levels below a root child — its row does not exist
        // until the collapsed ancestors are expanded.
        XCTAssertTrue(view.select(nodeId: "n-deep"))
        XCTAssertEqual(view.selectedNodeId, "n-deep")
    }

    func testAReloadKeepsADeepBranchExpandedAndTheSelectionUnderIt() throws {
        // reload() restored expansion from an unordered Set, and expanding an
        // item whose parent is still collapsed is a no-op — so every expansion
        // below the first level was dropped on each repaint, and play growing
        // the skein collapsed the tree the author was reading.
        let live = try session(repeatedCommandDocument())
        let view = SkeinView()
        view.setSession(live)
        XCTAssertTrue(view.select(nodeId: "n-deep"), "two levels down")

        view.reload()

        XCTAssertEqual(view.selectedNodeId, "n-deep",
                       "a repaint must not collapse the branch the author is in")
    }

    func testSelectingANodeThatIsNotInTheTreeSelectsNothing() throws {
        let live = try session(repeatedCommandDocument())
        let view = SkeinView()
        view.setSession(live)
        view.select(nodeId: "n-deep")

        XCTAssertFalse(view.select(nodeId: "n-vanished"))
        XCTAssertEqual(view.selectedNodeId, "n-deep",
                       "a stale id must not clear the author's selection")
    }
}
