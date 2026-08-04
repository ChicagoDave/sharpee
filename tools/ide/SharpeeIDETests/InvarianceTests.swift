// InvarianceTests.swift
// ADR-299 Phase 7 (D3/D4): the verifier behind "scope is declared, then
// verified". These pin the semantics of an all-paths blessing — what counts as
// the same position, who is checked against whom, and which disagreements are
// findings rather than noise. The end-to-end half (a real state leak the real
// engine produces, caught on a real replay) is SkeinInvarianceRealPathTests.

import XCTest
@testable import SharpeeIDE

final class InvarianceTests: XCTestCase {

    // MARK: - Fixtures

    /// Two threads that both reach a `look`:
    ///   root → "look"(a)                       — the cellar, seen clean
    ///   root → "take egg" → "look"(b)          — the cellar, with the egg
    /// The shape of D4's motivating example, minus the story.
    private func twoLooks(aOutput: String, bOutput: String) -> SkeinDocument {
        let a = SkeinNode(id: "a", command: "look", output: aOutput)
        let b = SkeinNode(id: "b", command: "look", output: bOutput)
        let take = SkeinNode(id: "take", command: "take egg", output: "Taken.",
                             children: [b])
        return SkeinDocument(seed: 42,
                             root: SkeinNode(id: "root", command: "", output: "Forge.",
                                             children: [a, take]))
    }

    private func blessing(_ document: SkeinDocument,
                          _ nodeId: String,
                          _ scope: SkeinBlessing.Scope) -> SkeinDocument {
        var document = document
        let output = document.node(withId: nodeId)!.output
        document.updateNode(withId: nodeId) {
            $0.blessing = SkeinBlessing(scope: scope, output: output)
        }
        return document
    }

    private func thread(_ document: SkeinDocument, _ nodeId: String) -> SkeinThread {
        document.thread(to: nodeId)!
    }

    // MARK: - Position

    func testAPositionIsTheCommandAsAParserReadsIt() {
        XCTAssertEqual(SkeinVerifier.position(of: "  Look  "), "look")
        XCTAssertEqual(SkeinVerifier.position(of: "TAKE Egg"), "take egg")
        XCTAssertNotEqual(SkeinVerifier.position(of: "look"),
                          SkeinVerifier.position(of: "look at egg"),
                          "different commands are different positions")
    }

    func testAllPathsBlessingsAreGroupedByPositionAndPlainOnesAreNot() {
        var document = twoLooks(aOutput: "Clean.", bOutput: "Egg.")
        document = blessing(document, "a", .allPaths)
        document = blessing(document, "take", .thisThread)

        let reference = SkeinVerifier.allPathsBlessings(in: document)
        XCTAssertEqual(reference["look"]?.map(\.id), ["a"])
        XCTAssertNil(reference["take egg"],
                     "a plain blessing constrains nothing beyond its own node")
    }

    // MARK: - The invariance claim (D4)

    func testAnAllPathsBlessingIsViolatedByAnotherThreadsOutputAtThatPosition() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Egg."), "a", .allPaths)

        let findings = SkeinVerifier.findings(in: document, thread: thread(document, "b"))

        XCTAssertEqual(findings.count, 1)
        XCTAssertEqual(findings.first?.kind, .invarianceViolated(blessedNodeId: "a"))
        XCTAssertEqual(findings.first?.nodeId, "b")
        XCTAssertEqual(findings.first?.blessed, "Clean.")
        XCTAssertEqual(findings.first?.actual, "Egg.")
    }

    func testTheBlessingsOwnThreadIsNotNoisedByItsOwnClaim() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Egg."), "a", .allPaths)

        XCTAssertEqual(SkeinVerifier.findings(in: document, thread: thread(document, "a")), [],
                       "the thread that made the claim must not be reported against it")
    }

    func testAgreementAtTheSamePositionIsNotAFinding() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Clean."), "a", .allPaths)

        XCTAssertEqual(SkeinVerifier.findings(in: document, thread: thread(document, "b")), [],
                       "the whole point of the claim is that agreeing threads pass silently")
    }

    func testAPlainBlessingConstrainsNoOtherThread() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Egg."), "a", .thisThread)

        XCTAssertEqual(SkeinVerifier.findings(in: document, thread: thread(document, "b")), [],
                       "plain bless is per-thread — it says nothing about anyone else")
    }

    func testTwoDisagreeingAllPathsBlessingsAreReportedFromBothSides() {
        var document = twoLooks(aOutput: "Clean.", bOutput: "Egg.")
        document = blessing(document, "a", .allPaths)
        document = blessing(document, "b", .allPaths)

        XCTAssertEqual(SkeinVerifier.findings(in: document, thread: thread(document, "b"))
            .filter { $0.kind == .invarianceViolated(blessedNodeId: "a") }.count, 1)
        XCTAssertEqual(SkeinVerifier.findings(in: document, thread: thread(document, "a"))
            .filter { $0.kind == .invarianceViolated(blessedNodeId: "b") }.count, 1,
                       "a contradiction between two claims must not silently pick a winner")
    }

    // MARK: - The plain claim (D1 changed output, D9's badge data)

    func testANodeThatNoLongerPrintsWhatWasBlessedIsAChangedOutputFinding() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Egg."), "b", .thisThread)

        let findings = SkeinVerifier.findings(in: document,
                                              thread: thread(document, "b"),
                                              observed: ["b": "Egg, and a rat."])

        XCTAssertEqual(findings.map(\.kind), [.changedOutput])
        XCTAssertEqual(findings.first?.blessed, "Egg.")
        XCTAssertEqual(findings.first?.actual, "Egg, and a rat.")
    }

    func testAnUnblessedNodeIsNeverAFindingHoweverMuchItChanged() {
        let document = twoLooks(aOutput: "Clean.", bOutput: "Egg.")

        XCTAssertEqual(SkeinVerifier.findings(in: document,
                                              thread: thread(document, "b"),
                                              observed: ["b": "Something else entirely."]),
                       [],
                       "absence of bless is absence of a claim, not a curse (D1)")
    }

    // MARK: - Observed vs stored

    func testThisRunsObservedOutputIsWhatIsChecked() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Clean."), "a", .allPaths)

        // Stored output agrees; what the story printed on this run does not.
        let findings = SkeinVerifier.findings(in: document,
                                              thread: thread(document, "b"),
                                              observed: ["b": "Egg."])

        XCTAssertEqual(findings.map(\.kind), [.invarianceViolated(blessedNodeId: "a")])
        XCTAssertEqual(findings.first?.actual, "Egg.")
    }

    // MARK: - Whole-skein sweep

    func testTheDocumentSweepChecksEveryNodeNotJustOneThread() {
        let document = blessing(twoLooks(aOutput: "Clean.", bOutput: "Egg."), "a", .allPaths)

        let findings = SkeinVerifier.findings(in: document)

        XCTAssertEqual(findings.map(\.nodeId), ["b"],
                       "the sweep must find the violating node without being pointed at its thread")
    }
}
