// TestingTabRealPathTests.swift
// ADR-301 acceptance, as a rule-13a real-path suite: no stub stands in for
// anything this repository owns. The bundle under test is the one shipped in
// the app; it is served by the real scheme handler into a real WKWebView; the
// events it renders come from a real `sharpee test --tree --json` run of a real
// story through the real TestRunner; and every assertion reads the RENDERED
// page, not the bytes handed to it.
//
// The story is tools/ide/test-fixtures/fernhill-frozen — a FROZEN SNAPSHOT of
// branch-stories/fernhill taken 2026-08-07, owned by this suite. It is not the
// author's story and must never be re-synced with it: every number below is
// pinned to this snapshot's tree, and go-live Phase 4 rewrites Fernhill's real
// transcripts from scratch. See the fixture's README.
//
// Acceptance covered here: 1 (bundle over a scheme handler, no Swift mirror in
// the tab's path), 2 (a real tree run renders live, replays marked, totals
// matching the reporter), 3 (a broken interior node renders one failure plus a
// blocked count with its descendants present and marked unreached), 4 (the
// subtree-failure count on the parent row), 5 (all three modes render the same
// selection), 6 (double-click opens a document with click-through to file:line).

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class TestingTabRealPathTests: XCTestCase {

    private var tab: TestingTabViewController!
    private var runner: TestRunner!
    private var relay: LineRelay!

    /// The frozen snapshot this suite owns, deliberately outside `branch-stories/`
    /// and outside the XcodeGen `sources:` tree so nothing builds or ships it.
    private var fixtureStory: URL {
        TestToolchain.repoRoot
            .appendingPathComponent("tools/ide/test-fixtures/fernhill-frozen/fernhill.story")
    }

    override func setUpWithError() throws {
        try super.setUpWithError()
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "devkit CLI not built — run `./repokit build`")
        try XCTSkipUnless(FileManager.default.fileExists(atPath: fixtureStory.path),
                          "tools/ide/test-fixtures/fernhill-frozen is not present")
        tab = TestingTabViewController()
        _ = tab.view // force loadView: installs the scheme handler and starts the page
        runner = TestRunner()
        relay = LineRelay(tab: tab)
        runner.delegate = relay
        // The SAME reader the app wires in TestController — not a closure written
        // here. A test that reads the file itself proves the page can render text,
        // never that the IDE supplies any.
        let discovered = TranscriptDiscovery.transcripts(
            inStoryDirectory: fixtureStory.deletingLastPathComponent())
        tab.onRequestSource = { [weak self] file in
            TranscriptSourceProvider(discovered: discovered).provide(file: file, to: self?.tab)
        }
        tab.onWriteTranscript = { [weak self] file, text in
            TranscriptSourceProvider(discovered: discovered).write(file: file, text: text, to: self?.tab)
        }
    }

    override func tearDownWithError() throws {
        runner = nil
        relay = nil
        tab = nil
        try super.tearDownWithError()
    }

    // MARK: - Acceptance 1 — the bundle, over a scheme handler, with no Swift mirror

    func testTheWebBundleShipsInTheAppAndBootsOverTheSchemeHandler() async throws {
        let index = try XCTUnwrap(TestingTabWebRoot.indexURL(),
                                  "the app has no testing-tab bundle — the web build did not run")
        XCTAssertEqual(index.deletingLastPathComponent().lastPathComponent,
                       TestingTabWebRoot.folderName)

        try await waitForPage()
        let scheme = try await tab.evaluateInTab("location.protocol") as? String
        XCTAssertEqual(scheme, "\(TestingTabSchemeHandler.scheme):",
                       "the page must be served over the custom scheme, never file://")

        // The wire's own guard is IN the page. That is what makes a Swift mirror
        // unnecessary here, so it is asserted rather than assumed.
        let decodes = try await tab.evaluateInTab(
            "typeof window.__sharpeeTesting === 'object' && typeof window.__sharpeeTesting.line === 'function'")
        XCTAssertEqual(decodes as? Bool, true)
    }

    /// A line from a version the page does not understand is REPORTED, not
    /// folded and not dropped — the wire's loud-rejection rule, enforced on the
    /// consumer that now owns the decision.
    func testAFutureSchemaLineSurfacesAsAStatusRatherThanBeingFolded() async throws {
        try await waitForPage()
        tab.deliver(line: #"{"schemaVersion":999,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tests"}"#)
        try await settle()

        let status = try await tab.evaluateInTab("document.getElementById('status').textContent") as? String
        XCTAssertTrue(status?.contains("Unreadable line") == true,
                      "the tab must say the toolchain and it disagree; got \(status ?? "nil")")
        let rows = try await tab.evaluateInTab("document.querySelectorAll('#cols .crow').length") as? Int
        XCTAssertEqual(rows, 0, "nothing from an unreadable line may reach the tree")
    }

    // MARK: - One run model

    /// The toolbar offers exactly ONE run, and clicking it reaches the host.
    ///
    /// This is a regression test for a shipped bug, not a style preference. The
    /// tab shipped with Run All / Run Tree / Run Chain; the first ran the suite
    /// flat, which is wrong for a `continues:` tree (229 passed / 287 failed on
    /// this suite's story against 516 / 0 as a tree), and the second scanned
    /// `walkthroughs/`, which an IDE project does not have. Both "worked" — they
    /// wired through correctly and produced wrong answers, which is why a wiring
    /// test would not have caught it and this asserts the BUTTON SET.
    func testTheToolbarOffersExactlyOneRunAndItReachesTheHost() async throws {
        try await waitForPage()

        let runButtons = try await tab.evaluateInTab(
            "Array.from(document.querySelectorAll('.runs button')).map(function (b) { return b.id; }).join(',')") as? String
        XCTAssertEqual(runButtons, "run,cancel",
                       "one run verb plus cancel — no flat or chain variant")
        let label = try await text("#run")
        XCTAssertEqual(label, "Run Tests")

        // And no Follow toggle: it re-armed itself every run, so it only ever
        // governed the run already being watched.
        let follow = try await count("#follow")
        XCTAssertEqual(follow, 0)

        var ran = 0
        tab.onRun = { ran += 1 }
        _ = try await tab.evaluateInTab("document.getElementById('run').click()")
        try await settle()
        XCTAssertEqual(ran, 1, "the run button must reach the host")
    }

    // MARK: - Acceptance 2 — a real tree run renders

    func testARealTreeRunRendersItsTreeReplaysAndTotals() async throws {
        try await waitForPage()
        try await runTree()

        // The reporter's own numbers for this suite: 552 commands, 518 authored
        // + 34 replayed. The tab recomputes them from the stream, so agreeing
        // with the reporter is a claim about the wire, not a copied constant.
        let commands = try await text("#tally-commands")
        let split = try await text("#tally-commands-sub")
        XCTAssertEqual(commands, "552")
        XCTAssertEqual(split, "518 authored · 34 replayed")

        let passed = try await text("#tally-pass")
        XCTAssertEqual(passed, "22", "every node in the suite passes")
        let failed = try await text("#tally-fail")
        let unreachedAtRest = try await text("#tally-unreached")
        XCTAssertEqual(failed, "0")
        XCTAssertEqual(unreachedAtRest, "0")

        // Five roots, and the tree is nested rather than flat.
        let roots = try await count("#cols .col:first-child .crow")
        XCTAssertEqual(roots, 5, "the fixture has five roots")

        // Replayed executions are MARKED, which is what stops them reading as
        // duplicate turns (ADR-302 D17).
        let replayTags = try await count("#cols .tag")
        XCTAssertGreaterThan(replayTags, 0, "a replayed ancestor must be tagged in the tree")

        // A node re-executed for its siblings still shows its own turns once.
        try await select(path: ["arrival"])
        let arrivalTurns = try await count(".preview .turn")
        XCTAssertEqual(arrivalTurns, 2, "arrival is 2 commands however many times it was replayed")
    }

    /// Acceptance 6: the document view lists every turn with its source line,
    /// and clicking one asks the host to open that exact `file:line`.
    func testOpeningADocumentListsEveryTurnAndClicksThroughToItsSourceLine() async throws {
        var opened: SourceLocation?
        tab.onOpenLocation = { opened = $0 }
        try await waitForPage()
        try await runTree()

        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        let turnCount = try await count("#docview .turn")
        XCTAssertEqual(turnCount, 16, "concealment is 16 turns, all present in its document")
        let firstLine = try await text("#docview .turn:first-child .ln")
        XCTAssertEqual(firstLine, "12", "the first turn's own source line, from the wire")

        _ = try await tab.evaluateInTab("document.querySelector('#docview .turn .ln').click();")
        try await settle()

        let location = try XCTUnwrap(opened, "clicking a line number must reach the host")
        XCTAssertEqual(location.file.lastPathComponent, "concealment.transcript")
        XCTAssertEqual(location.line, 12)
    }

    // MARK: - Phase 5 slice 1 — the probe

    /// The editor's foundation (go-live Phase 5, R1): a document shows what the
    /// story actually said on turns that PASSED, not only on failures.
    ///
    /// The assertion is deliberately not "some text appeared." It is that the
    /// rendered bytes are the bytes an assertion matches — so it reads a turn
    /// whose `.transcript` asserts `contains "worn bald in the middle"` and
    /// requires that exact fragment on the page. Anything weaker would pass
    /// against a rendering of the output rather than the output.
    func testADocumentShowsTheStorysWordsOnPassingTurnsAndThePreviewStillDoesNot() async throws {
        try await waitForPage()
        try await runTree()

        try await select(path: ["arrival", "concealment"])

        // The preview is a glance: a passing turn shows no output there, or the
        // pane becomes a wall of prose you cannot scan.
        let previewOutputs = try await count(".preview .turn:not(.bad) .actual")
        XCTAssertEqual(previewOutputs, 0, "the preview stays a glance; output belongs to the document")

        try await openDocument(stem: "concealment")

        let documentOutputs = try await count("#docview .turn .actual, #docview .turn .silent")
        XCTAssertEqual(documentOutputs, 16,
                       "every one of concealment's 16 turns carries what the story printed")

        let shown = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) {
            return r.querySelector('.cmd').textContent === '> examine the doormat';
          });
          if (!row) return null;
          if (row.classList.contains('bad')) return 'FAILED — this turn must be a passing one';
          var out = row.querySelector('.actual');
          return out ? out.textContent : null;
        })();
        """) as? String

        let output = try XCTUnwrap(shown, "a passing turn must carry the story's words in its document")
        XCTAssertTrue(output.contains("worn bald in the middle"),
                      "the shown bytes are the assertable bytes — concealment.transcript asserts "
                      + "contains \"worn bald in the middle\" on this turn; got: \(output)")
    }

    /// Slice 2a: the source face shows the file the host read, and states what a
    /// save would do to it — computed in the page by the SAME parser and
    /// serializer the test run uses (`@sharpee/branch-tester`, bundled from
    /// source), never by a second grammar that could disagree.
    ///
    /// `concealment` also pins WHICH grammar the page carries, in one assertion.
    /// Measured on this exact fixture 2026-08-08: branch-tester round-trips it
    /// byte-identically, while transcript-tester reformats it by two lines. The
    /// two parsers give opposite answers here, so the notice below cannot read
    /// "byte-for-byte" unless the page holds the parser the run uses.
    func testTheSourceFaceShowsTheFileAndWhatSavingWouldDoToIt() async throws {
        try await waitForPage()
        try await runTree()

        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        _ = try await tab.evaluateInTab("document.querySelector('[data-face=\"source\"]').click();")
        try await settle(times: 3)

        // The text is the file's, not a rendering of the run: it carries the
        // header and the comments, neither of which appears in any turn.
        let source = try await text(".sourceface .source")
        XCTAssertTrue(source.contains("continues: arrival"),
                      "the source face shows the file itself, header and all")
        XCTAssertTrue(source.contains("# Before searching: the concealed key cannot be taken"),
                      "including comments, which no run event carries")

        let onDisk = try String(
            contentsOf: fixtureStory.deletingLastPathComponent()
                .appendingPathComponent("tests/transcripts/concealment.transcript"),
            encoding: .utf8)
        XCTAssertEqual(source, onDisk, "byte-for-byte what the host read, not a reformat of it")

        // The notice is the point of the face: saving re-emits the whole file, so
        // the author is told what that costs BEFORE they pay it. It is also the
        // grammar discriminator — the other parser answers "would reformat" here.
        let notice = try await text(".sourceface .normnote")
        XCTAssertTrue(notice.contains("byte-for-byte"),
                      "this fixture round-trips clean under the run's own parser; got: \(notice)")
    }

    // MARK: - Phase 5 slice 2b — promote a selection into the file

    /// The gesture the editor exists for: select what the story said, and the
    /// assertion lands in the `.transcript` on disk — then the suite still passes,
    /// which is the only thing that proves the assertion was true.
    ///
    /// Nothing here is stubbed. Real page, real selection, real click, real write
    /// through `TranscriptSourceProvider`, real second run of the real CLI.
    func testPromotingASelectionWritesTheAssertionAndTheSuiteStillPasses() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        // Restored however this test exits, so a crash between write and assert
        // cannot leave the fixture carrying an edit.
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // A real selection over part of one turn's output. `bald` is inside the
        // phrase this turn already asserts, so the word is guaranteed to be in the
        // output — but `[OK: contains "bald"]` is not itself in the file, so a pass
        // afterwards cannot come from an assertion that was there all along.
        XCTAssertFalse(original.contains("[OK: contains \"bald\"]"),
                       "this test's assertion must not already be in the fixture")
        let offered = try await tab.evaluateInTab("""
        (function () {
          var blocks = Array.from(document.querySelectorAll('#docview .turn .actual[data-command-line]'));
          var pre = blocks.find(function (b) { return b.textContent.indexOf('bald') !== -1; });
          if (!pre) return 'no turn printed the word';
          var text = pre.textContent;
          var at = text.indexOf('bald');
          var range = document.createRange();
          range.setStart(pre.firstChild, at);
          range.setEnd(pre.firstChild, at + 'bald'.length);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          // Read back from the range: an off-screen web view has no focus, and
          // WebKit returns an empty string from selection.toString() there while
          // still holding the range. The page reads the range for the same reason.
          return selection.getRangeAt(0).toString();
        })();
        """) as? String
        XCTAssertEqual(offered, "bald", "the page must hold a real selection over the output")
        try await settle(times: 3)

        // The offer names the tag that will be written, not a description of it.
        let tag = try await text(".promote .tag")
        XCTAssertEqual(tag, "[OK: contains \"bald\"]",
                       "a one-line span with no double quote earns the inline form")

        _ = try await tab.evaluateInTab("document.querySelector('.promote .go').click();")
        try await settle(times: 6)

        let afterEdit = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertNotEqual(afterEdit, original, "the file on disk must have changed")
        // F2: the just-written assertion is visible immediately, marked new-
        // and-untested — not hidden with the stale claims until the re-run.
        let freshChips = try await count("#docview .claim.fresh")
        XCTAssertEqual(freshChips, 1,
                       "the promoted assertion shows in the untested color before the re-run")
        XCTAssertTrue(afterEdit.contains("[OK: contains \"bald\"]"),
                      "the assertion the offer named is the one in the file")

        // The claim only means something if it is true. Re-run the real suite.
        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0",
                       "the promoted assertion must pass — it asserts what the story printed")
    }

    /// When the write does not land, the page must say so AND keep showing the
    /// file that is actually on disk.
    ///
    /// This is the branch that exists so the source face can never disagree with
    /// disk, and it is the one a green suite would otherwise say nothing about —
    /// the success path leaves the two agreeing by accident.
    func testARefusedWriteSaysSoAndLeavesTheSourceFaceShowingDisk() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        // The provider is pointed at an EMPTY suite, so every write is refused by
        // the real guard — not by a stub, and not by a flag this test invented.
        tab.onWriteTranscript = { [weak self] file, text in
            TranscriptSourceProvider(discovered: []).write(file: file, text: text, to: self?.tab)
        }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        _ = try await tab.evaluateInTab("""
        (function () {
          var blocks = Array.from(document.querySelectorAll('#docview .turn .actual[data-command-line]'));
          var pre = blocks.find(function (b) { return b.textContent.indexOf('bald') !== -1; });
          var at = pre.textContent.indexOf('bald');
          var range = document.createRange();
          range.setStart(pre.firstChild, at);
          range.setEnd(pre.firstChild, at + 'bald'.length);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        })();
        """)
        try await settle(times: 3)
        _ = try await tab.evaluateInTab("document.querySelector('.promote .go').click();")
        try await settle(times: 6)

        let note = try await text(".editnote")
        XCTAssertTrue(note.contains("was not written"),
                      "a refused write must be said out loud; got: \(note)")

        XCTAssertEqual(try String(contentsOf: transcript, encoding: .utf8), original,
                       "and nothing may reach the file")

        // The source face must still be the file, not the draft the page built.
        _ = try await tab.evaluateInTab("document.querySelector('[data-face=\"source\"]').click();")
        try await settle(times: 3)
        let shown = try await text(".sourceface .source")
        XCTAssertEqual(shown, original,
                       "the source face shows disk, never an edit that did not land")
        XCTAssertFalse(shown.contains("[OK: contains \"bald\"]"))
    }

    // MARK: - Phase 5 slice 2c — growing and pruning a transcript

    /// The whole loop R1 describes, driven end to end through the page: type a
    /// command, run, read what the story said, promote it, run again green.
    ///
    /// This is the acceptance that matters, because it is what Phase 6 asks an
    /// author to do. Every step is the real thing — real file, real CLI, real
    /// selection — and the final run is what makes the promoted claim TRUE rather
    /// than merely written.
    func testACommandCanBeAddedRunPromotedAndPassWithoutLeavingTheTab() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // 1. Add a command. `inventory` is chosen because its response is stable
        // and does not depend on where in the story the turn lands.
        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('addcommand');
          field.value = 'inventory';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.addcmd .addgo').click();
        })();
        """)
        try await settle(times: 6)

        let afterAdd = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(afterAdd.contains("> inventory\n[SKIP]"),
                      "a new command is a draft: it runs and asserts nothing")

        // 2. Run again. The new command executes and its output arrives on the wire.
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        let printed = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> inventory'; });
          if (!row) return null;
          var out = row.querySelector('.actual');
          return out ? out.textContent : null;
        })();
        """) as? String
        let output = try XCTUnwrap(printed, "the added command must run and show what the story said")
        XCTAssertFalse(output.isEmpty)

        // 3. Promote a word of that output — chosen from what the story actually
        // printed, which is the only way an author can know it is assertable.
        // `.map(String.init)` is load-bearing: the split yields character slices,
        // and interpolating one into the script below writes `["c","a",…]`.
        let word = try XCTUnwrap(
            output.split(whereSeparator: { !$0.isLetter })
                .map(String.init)
                .first(where: { $0.count > 3 }),
            "the response must contain a word worth asserting; got: \(output)")
        let selected = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> inventory'; });
          var pre = row.querySelector('.actual');
          var at = pre.textContent.indexOf('\(word)');
          var range = document.createRange();
          range.setStart(pre.firstChild, at);
          range.setEnd(pre.firstChild, at + \(word.count));
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          return selection.getRangeAt(0).toString();
        })();
        """) as? String
        XCTAssertEqual(selected, word)
        try await settle(times: 3)
        _ = try await tab.evaluateInTab("document.querySelector('.promote .go').click();")
        try await settle(times: 6)

        let afterPromote = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(afterPromote.contains("> inventory\n[OK: contains \"\(word)\"]"),
                      "the draft [SKIP] gives way to the assertion — both would leave it unevaluated")
        XCTAssertFalse(afterPromote.contains("> inventory\n[SKIP]"))

        // 4. And it is true.
        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0", "the command added and asserted in the tab must pass")
    }

    /// Removing a command takes everything asserted about it, and the file that
    /// results is one the runner still accepts.
    func testDeletingATurnRemovesItsAssertionsAndLeavesAPassingSuite() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }
        XCTAssertTrue(original.contains("[OK: contains \"worn bald in the middle\"]"),
                      "this test removes the turn that carries that assertion")

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> examine the doormat'; });
          row.querySelector('.drop').click();
        })();
        """)
        try await settle(times: 6)

        let afterDelete = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertFalse(afterDelete.contains("> examine the doormat"), "the command is gone")
        XCTAssertFalse(afterDelete.contains("worn bald in the middle"),
                       "and so is what was asserted about it — half a deletion is the confusing one")

        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0", "the file left behind is still one the runner accepts")
    }

    /// Retyping a command in place keeps what the file asserts about it — the
    /// edit delete-and-re-add cannot express, because re-adding loses the
    /// command's assertions. The rewording drops an article the parser never
    /// needed, so the story's answer is unchanged and the surviving claim still
    /// holds on the next run.
    func testEditingACommandInPlaceKeepsItsAssertionsAndTheSuiteStillPasses() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }
        XCTAssertTrue(original.contains("> examine the doormat"),
                      "this test rewords that command")
        XCTAssertTrue(original.contains("[OK: contains \"worn bald in the middle\"]"),
                      "and expects its assertion to survive the rewording")

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // The pencil opens a field prefilled with the command's current text —
        // a rewording starts from what is there, not from a blank.
        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> examine the doormat'; });
          row.querySelector('.editcmd').click();
        })();
        """)
        try await settle()
        let prefilled = try await tab.evaluateInTab(
            "document.getElementById('editcommand').value") as? String
        XCTAssertEqual(prefilled, "examine the doormat")

        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('editcommand');
          field.value = 'examine doormat';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('#docview .turn .editgo').click();
        })();
        """)
        try await settle(times: 6)

        let afterEdit = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(afterEdit.contains("> examine doormat\n[OK: contains \"worn bald in the middle\"]"),
                      "the command changed and its claim stayed attached to it")
        XCTAssertFalse(afterEdit.contains("> examine the doormat"),
                       "the old wording is gone — this was an edit, not an addition")

        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0",
                       "the reworded command prints the same prose, so the surviving claim holds")
    }

    /// The retype gesture's two refusals, end to end: confirming a command
    /// unchanged writes nothing at all — a non-edit must not normalize the file
    /// or offer an undo step back to a state never departed — and a blank
    /// retype is refused with the reason. The file on disk never moves in
    /// either case.
    func testARetypeToTheSameTextOrToBlankWritesNothing() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // Confirm the prefilled field untouched: the same-text no-op.
        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> examine the doormat'; });
          row.querySelector('.editcmd').click();
        })();
        """)
        try await settle()
        _ = try await tab.evaluateInTab("document.querySelector('#docview .turn .editgo').click();")
        try await settle(times: 6)

        XCTAssertEqual(try String(contentsOf: transcript, encoding: .utf8), original,
                       "confirming an unchanged command must not rewrite the file")
        let noteAfterNoop = try await count(".editnote")
        XCTAssertEqual(noteAfterNoop, 0, "no edit happened, so nothing claims one did")
        let undoAfterNoop = try await count(".editnote .undo")
        XCTAssertEqual(undoAfterNoop, 0, "and there is no step back to a state never departed")

        // Retype to blank: refused with the reason, and the file still never moves.
        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> examine the doormat'; });
          row.querySelector('.editcmd').click();
        })();
        """)
        try await settle()
        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('editcommand');
          field.value = '   ';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('#docview .turn .editgo').click();
        })();
        """)
        try await settle(times: 6)

        XCTAssertEqual(try String(contentsOf: transcript, encoding: .utf8), original,
                       "a refused retype reaches disk exactly as much as a refused promote: not at all")
        let reason = try await text(".editnote .said")
        XCTAssertTrue(reason.contains("A command needs some text."),
                      "the refusal names its reason; got \(reason)")
    }

    /// R9 end to end. A command that runs past the story's ending errors as
    /// `Engine is not running` — before this, "a file is terminal" was
    /// discoverable only by going red and diagnosing each error by hand. The
    /// run now marks the ender, mutes the dead tail, replaces the append bar
    /// with the branch-from-parent affordance, refuses to branch from the file
    /// itself — and the ✕ the marking invites trims the dead command, leaving
    /// a suite that passes again.
    func testAStoryEndingMarksTheFileTerminalAndTheDeadTailCanBeTrimmed() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/fuse-lose.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        // The discovery moment R9 describes: an author appends past the ending.
        try (original + "\n> smell the roses\n[SKIP]\n")
            .write(to: transcript, atomically: true, encoding: .utf8)

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "fuse-lose"])
        try await openDocument(stem: "fuse-lose")

        // The dead command reads as dead, not as a failure to diagnose.
        let deadNote = try await text(".turn.dead .deadnote")
        XCTAssertTrue(deadNote.contains("The story had already ended"),
                      "got \(deadNote)")

        // The ender is badged, on the turn that actually ended the story.
        let endBadge = try await text(".turn.ends .endshere")
        XCTAssertTrue(endBadge.contains("The story ends here."))
        let enderCommand = try await tab.evaluateInTab(
            "document.querySelector('#docview .turn.ends .cmd').textContent") as? String
        XCTAssertEqual(enderCommand, "> wait",
                       "the third wait is the last live turn — the white roar")

        // The append bar gives way to the explanation and the affordance R9
        // names: a new transcript branched from before the ending.
        let addField = try await count("#addcommand")
        XCTAssertEqual(addField, 0, "a terminal file must not offer to append")
        let terminalNote = try await text(".terminalbar .said")
        XCTAssertTrue(terminalNote.contains("The story ends at \"> wait\""), "got \(terminalNote)")
        XCTAssertTrue(terminalNote.contains("branch a new transcript from arrival"),
                      "the way onward is the parent's document; got \(terminalNote)")

        // Branching from the file itself is refused at the gesture — a child
        // would replay through the ending and die on its first command.
        let branchDisabled = try await tab.evaluateInTab(
            "document.getElementById('newbranch').disabled") as? Bool
        XCTAssertEqual(branchDisabled, true)

        // Trim the dead command — the edit the marking exists to invite.
        _ = try await tab.evaluateInTab(
            "document.querySelector('#docview .turn.dead .drop').click();")
        try await settle(times: 6)

        let trimmed = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertFalse(trimmed.contains("smell the roses"),
                       "the dead command is gone from the file")

        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0", "the trimmed file passes again")
    }

    /// R9's clean half. A file whose LAST command ends the story leaves no
    /// dead tail to observe, so until the wire grew `ending` this file
    /// rendered as an ordinary passing leaf and nothing said it was terminal
    /// — the honest limit the scope doc named. The runner now maps the
    /// engine's `game.ended` onto the blast turn itself, so the UNMODIFIED
    /// frozen file is marked: ender badged, append bar gone, branching
    /// refused — and with nothing dead to trim.
    func testACleanEndingMarksTheFileTerminalWithNothingDeadToTrim() async throws {
        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "fuse-lose"])
        try await openDocument(stem: "fuse-lose")

        // Nothing is dead — the file is the frozen shipping shape, untouched.
        let dead = try await count("#docview .turn.dead")
        XCTAssertEqual(dead, 0, "a clean ending has no dead tail")

        // The ender is badged on the command that actually ended the story.
        let endBadge = try await text(".turn.ends .endshere")
        XCTAssertTrue(endBadge.contains("The story ends here."))
        let enderCommand = try await tab.evaluateInTab(
            "document.querySelector('#docview .turn.ends .cmd').textContent") as? String
        XCTAssertEqual(enderCommand, "> wait", "the blast turn is the ender")

        // The terminal surface: no append, the note names the ender, and
        // branching from the file is refused at the gesture.
        let addField = try await count("#addcommand")
        XCTAssertEqual(addField, 0, "a terminal file must not offer to append")
        let terminalNote = try await text(".terminalbar .said")
        XCTAssertTrue(terminalNote.contains("The story ends at \"> wait\""), "got \(terminalNote)")
        let branchDisabled = try await tab.evaluateInTab(
            "document.getElementById('newbranch').disabled") as? Bool
        XCTAssertEqual(branchDisabled, true)
    }

    /// Reparenting rewrites `continues:` — R5's field, which the author picks
    /// and never types. The picker's exclusions are read off the rendered page
    /// (never the file itself, never its own descendants), the write lands on
    /// disk, and the run that follows FAILS — deliberately pinned: concealment
    /// under key searches a doormat whose key that branch already took, which
    /// is the "different history" the confirmation warns about, demonstrated
    /// rather than described.
    func testReparentingRewritesContinuesAndTheNextRunShowsTheNewHistory() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }
        XCTAssertTrue(original.contains("continues: arrival"))

        try await waitForPage()
        try await runTree()

        // The picker on key's own document: never key, never its descendants.
        try await select(path: ["arrival", "key"])
        try await openDocument(stem: "key")
        let offered = try await tab.evaluateInTab(
            "Array.from(document.querySelectorAll('.repick option')).map(function (o) { return o.value; }).join(',')") as? String
        let options = (offered ?? "").split(separator: ",").map(String.init)
        XCTAssertTrue(options.contains("concealment"), "a sibling is an ordinary candidate")
        for forbidden in ["key", "cellar-dark", "doors", "smoke", "the-long-night", "arrival"] {
            XCTAssertFalse(options.contains(forbidden),
                           "\(forbidden) must not be offered — self, descendant, or the current parent")
        }

        // Reparent concealment under key, through the rendered control.
        _ = try await tab.evaluateInTab("document.querySelector('#docview .back').click();")
        try await settle()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")
        _ = try await tab.evaluateInTab("""
        (function () {
          var pick = document.querySelector('.repick');
          pick.value = 'key';
          pick.dispatchEvent(new Event('change', { bubbles: true }));
          document.querySelector('.reparentgo').click();
        })();
        """)
        try await settle(times: 6)

        let reparented = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(reparented.contains("continues: key"), "the field the author never typed")
        XCTAssertFalse(reparented.contains("continues: arrival"))
        let note = try await text(".editnote .said")
        XCTAssertTrue(note.contains("different history"),
                      "the confirmation carries the consequence; got \(note)")

        // The run proves the warning: the file executes from key's state now,
        // and the doormat's key is already gone.
        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "1",
                       "exactly the reparented file fails — its assertions were written against another history")
    }

    /// Undo puts the file back, one edit at a time, byte for byte.
    ///
    /// Byte-for-byte matters more than it sounds: every edit re-emits the whole
    /// file from the parsed model, so an undo that restored "the same transcript"
    /// without restoring the same TEXT would quietly normalize the author's file
    /// as the price of changing their mind.
    func testUndoRestoresTheFileOneEditAtATime() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // Nothing has been edited, so there is nothing to take back.
        let undoBeforeAnyEdit = try await count(".editnote .undo")
        XCTAssertEqual(undoBeforeAnyEdit, 0)

        for command in ["inventory", "score"] {
            _ = try await tab.evaluateInTab("""
            (function () {
              var field = document.getElementById('addcommand');
              field.value = '\(command)';
              field.dispatchEvent(new Event('input', { bubbles: true }));
              document.querySelector('.addcmd .addgo').click();
            })();
            """)
            try await settle(times: 6)
        }

        let afterTwo = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(afterTwo.contains("> inventory") && afterTwo.contains("> score"))
        let offer = try await text(".editnote .undo")
        XCTAssertEqual(offer, "Undo (2)", "two edits, two steps back")

        _ = try await tab.evaluateInTab("document.querySelector('.editnote .undo').click();")
        try await settle(times: 6)
        let afterFirstUndo = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(afterFirstUndo.contains("> inventory"), "one step back, not all of them")
        XCTAssertFalse(afterFirstUndo.contains("> score"))

        _ = try await tab.evaluateInTab("document.querySelector('.editnote .undo').click();")
        try await settle(times: 6)
        XCTAssertEqual(try String(contentsOf: transcript, encoding: .utf8), original,
                       "back to exactly the bytes the author started with")
        let undoAfterFullRewind = try await count(".editnote .undo")
        XCTAssertEqual(undoAfterFullRewind, 0, "and nothing left to take back")
    }

    /// A write that never lands must not leave a way back to a state the file was
    /// never in — the stack records departures, not attempts.
    func testARefusedEditLeavesNothingToUndo() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        tab.onWriteTranscript = { [weak self] file, text in
            TranscriptSourceProvider(discovered: []).write(file: file, text: text, to: self?.tab)
        }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('addcommand');
          field.value = 'inventory';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.addcmd .addgo').click();
        })();
        """)
        try await settle(times: 6)

        XCTAssertEqual(try String(contentsOf: transcript, encoding: .utf8), original)
        let undoAfterRefusal = try await count(".editnote .undo")
        XCTAssertEqual(undoAfterRefusal, 0,
                       "a refused edit offers no way back, because nothing moved")
    }

    /// A turn shows what the FILE claims about it, in the file's own words, and
    /// one claim can be taken back without taking the turn with it.
    func testATurnShowsItsAssertionsAndOneCanBeRemovedOnItsOwn() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // The tag is the serializer's, so it reads exactly as the file reads.
        let claim = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> examine the doormat'; });
          var tag = row && row.querySelector('.claim .ctag');
          return tag ? tag.textContent : null;
        })();
        """) as? String
        XCTAssertEqual(claim, "[OK: contains \"worn bald in the middle\"]",
                       "the turn shows the assertion the file makes about it")

        // A [SKIP] is shown as what it is — the run stops at it, so calling it a
        // claim alongside real ones would misreport what the suite checks.
        let halting = try await count("#docview .claim.halts")
        XCTAssertEqual(halting, 0, "concealment asserts on every turn; none of them halt")

        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#docview .turn'));
          var row = rows.find(function (r) { return r.querySelector('.cmd').textContent === '> examine the doormat'; });
          row.querySelector('.claim .cdrop').click();
        })();
        """)
        try await settle(times: 6)

        let after = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertFalse(after.contains("worn bald in the middle"), "the claim is gone")
        XCTAssertTrue(after.contains("> examine the doormat\n[SKIP]"),
                      "and the command stays, back in its draft state — a bare command would "
                      + "fail the run with a named error the author did not ask for")

        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0", "the file left behind still passes")
    }

    /// After an edit, a turn's claims are HIDDEN rather than shown against the
    /// wrong turn: the join is by source line, and an edit moves lines.
    func testClaimsAreHiddenBetweenAnEditAndTheNextRun() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        let before = try await count("#docview .claim")
        XCTAssertGreaterThan(before, 0, "claims are shown while the run and the file agree")

        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('addcommand');
          field.value = 'inventory';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.addcmd .addgo').click();
        })();
        """)
        try await settle(times: 6)

        let after = try await count("#docview .claim")
        XCTAssertEqual(after, 0,
                       "once the file has moved and the run has not, no claim can be trusted "
                       + "against a turn — showing them would put one command's under another's")
    }

    // MARK: - Phase 5 slice 3 — whole files

    /// Branching writes a real transcript, with `continues:` the editor supplied,
    /// in the folder the host chose — and the author typed only a name.
    func testBranchingCreatesATranscriptTheEditorParentedItself() async throws {
        let created = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/the-vine-again.transcript")
        defer { try? FileManager.default.removeItem(at: created) }
        try XCTSkipIf(FileManager.default.fileExists(atPath: created.path),
                      "a previous run left this file behind")

        // The host needs the story to infer a location — that is the whole of
        // ADR-290 D8, so it is wired the way the app wires it.
        let storyDirectory = fixtureStory.deletingLastPathComponent()
        tab.onCreateTranscript = { [weak self] name, text in
            TranscriptSourceProvider(discovered: []).create(
                name: name, text: text, in: storyDirectory, to: self?.tab)
        }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('newbranch');
          field.value = 'The vine again';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.filebar .branchgo').click();
        })();
        """)
        try await settle(times: 6)

        XCTAssertTrue(FileManager.default.fileExists(atPath: created.path),
                      "the name became a file, slugged, in tests/transcripts/")
        let text = try String(contentsOf: created, encoding: .utf8)
        XCTAssertTrue(text.contains("continues: concealment"),
                      "the editor wrote the parentage; the author never typed a stem")
        XCTAssertTrue(text.contains("title: The vine again"))
        XCTAssertTrue(text.contains("story: fernhill"))
        XCTAssertFalse(text.contains("> "),
                       "a new transcript carries no placeholder command — the first is the author's")
    }

    /// D1 (phase-6 log): the suite's FIRST transcript is creatable from the
    /// browse surface — no document open, nothing to branch from. Over an
    /// EMPTY suite the page says how to begin instead of rendering blank
    /// panes, and a name typed into the New-transcript bar becomes a ROOT
    /// file on disk: no `continues:`, path decided by the host (ADR-290 D8).
    func testAnEmptySuiteOffersRootCreationAndTheFirstTranscriptLandsOnDisk() async throws {
        let scratch = FileManager.default.temporaryDirectory
            .appendingPathComponent("sharpee-empty-suite-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: scratch, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: scratch) }
        tab.onCreateTranscript = { [weak self] name, text in
            TranscriptSourceProvider(discovered: []).create(
                name: name, text: text, in: scratch, to: self?.tab)
        }

        try await waitForPage()
        // Before any story attaches there is nowhere for a create to land
        // (ADR-290 D8 infers the path from the story), so the bar must not
        // offer one — and "no transcripts yet" would be a claim about a suite
        // the page has not seen.
        let shownBeforeAttach = try await tab.evaluateInTab(
            "document.getElementById('newbar').classList.contains('on')") as? Bool
        XCTAssertEqual(shownBeforeAttach, false, "no story, no create bar")

        // What attach does for a story whose tests/transcripts/ is empty:
        // announce the story, discover nothing.
        tab.beginRun(story: "fernhill")
        tab.setDiscovered([])
        try await settle(times: 3)

        let note = try await text(".emptysuite")
        XCTAssertTrue(note.contains("no transcripts"),
                      "an empty suite explains itself; got: \(note)")

        _ = try await tab.evaluateInTab("""
        (function () {
          document.getElementById('newroot').value = 'Arrival';
          document.getElementById('newroot-create').click();
        })();
        """)
        try await settle(times: 6)

        let created = scratch.appendingPathComponent("tests/transcripts/arrival.transcript")
        XCTAssertTrue(FileManager.default.fileExists(atPath: created.path),
                      "the name became a root file, slugged, in tests/transcripts/")
        let written = try String(contentsOf: created, encoding: .utf8)
        XCTAssertTrue(written.contains("title: Arrival"))
        XCTAssertTrue(written.contains("story: fernhill"))
        XCTAssertFalse(written.contains("continues:"), "a root carries no parentage")
        XCTAssertFalse(written.contains("> "),
                       "a new transcript carries no placeholder command — the first is the author's")

        // The confirmation lands on the surface the author is looking at —
        // the browse status line, since no document is open.
        let status = try await text("#status")
        XCTAssertTrue(status.contains("Created arrival"),
                      "the browse surface confirms the create; got: \(status)")

        // The form is spent: a name left in the box after a successful create
        // is an accidental duplicate waiting for a second Enter.
        let fieldAfter = try await tab.evaluateInTab(
            "document.getElementById('newroot').value") as? String
        XCTAssertEqual(fieldAfter, "", "the field clears once the create lands")

        // A REFUSED create reaches the same surface: the same name again is
        // "already exists", and in browse mode that must land on the status
        // line — the edit note it used to go to renders only inside a document.
        _ = try await tab.evaluateInTab("""
        (function () {
          document.getElementById('newroot').value = 'Arrival';
          document.getElementById('newroot-create').click();
        })();
        """)
        try await settle(times: 6)
        let refusal = try await text("#status")
        XCTAssertTrue(refusal.contains("already exists"),
                      "the browse surface carries the refusal; got: \(refusal)")

        // D2: the designed loop continues — open the new document and give it
        // its first command, all through the page. The file is EMPTY, and the
        // add bar must be the fix, not another refusal (the outlook's `empty`
        // kind, arriving through the real source seam).
        let discovered = TranscriptDiscovery.transcripts(inStoryDirectory: scratch)
        tab.setDiscovered(discovered.map(\.path))
        tab.onRequestSource = { [weak self] file in
            TranscriptSourceProvider(discovered: discovered).provide(file: file, to: self?.tab)
        }
        tab.onWriteTranscript = { [weak self] file, text in
            TranscriptSourceProvider(discovered: discovered).write(file: file, text: text, to: self?.tab)
        }
        try await settle(times: 3)
        try await openDocument(stem: "arrival")
        try await settle(times: 3)

        let placeholder = try await tab.evaluateInTab(
            "document.getElementById('addcommand').placeholder") as? String
        XCTAssertEqual(placeholder, "Add the first command…",
                       "an empty file's add bar is the beginning, not a refusal")
        let addDisabled = try await tab.evaluateInTab(
            "document.getElementById('addcommand').disabled") as? Bool
        XCTAssertEqual(addDisabled, false, "the one edit that fixes an empty file stays open")

        _ = try await tab.evaluateInTab("""
        (function () {
          var f = document.getElementById('addcommand');
          f.value = 'take the lantern';
          document.querySelector('.addcmd .addgo').click();
        })();
        """)
        try await settle(times: 6)
        let grown = try String(contentsOf: created, encoding: .utf8)
        XCTAssertTrue(grown.contains("> take the lantern"),
                      "the first command landed in the file on disk")

        // F2: the add is visible NOW — a [NEW] card with the next step said
        // out loud, not a blank pane until the next run.
        let newCards = try await count("#docview .turn.new")
        XCTAssertEqual(newCards, 1, "the authored command renders immediately")
        let badge = try await text("#docview .turn.new .newbadge")
        XCTAssertEqual(badge, "NEW")
        let newNote = try await text("#docview .turn.new .newnote")
        XCTAssertTrue(newNote.contains("Run Tests"),
                      "the guidance names the next step; got: \(newNote)")

        // Detach announces its sentinel as if it were a story; the page maps
        // it back to "no story" and withdraws the bar.
        tab.beginRun(story: "No story open")
        try await settle(times: 3)
        let shownAfterDetach = try await tab.evaluateInTab(
            "document.getElementById('newbar').classList.contains('on')") as? Bool
        XCTAssertEqual(shownAfterDetach, false, "detached again, the bar withdraws")
    }

    /// Removing a transcript that others continue FROM would orphan them, so it
    /// is refused with the count rather than performed.
    func testTrashingAParentIsRefusedBecauseItWouldOrphanItsChildren() async throws {
        var asked = false
        tab.onTrashTranscript = { _ in asked = true }

        try await waitForPage()
        try await runTree()
        // `key` is an interior node in this fixture: four transcripts continue it.
        try await select(path: ["arrival", "key"])
        try await openDocument(stem: "key")

        _ = try await tab.evaluateInTab("document.querySelector('.filebar .trash').click();")
        try await settle(times: 3)
        _ = try await tab.evaluateInTab("document.querySelector('.filebar .trash.armed').click();")
        try await settle(times: 3)

        XCTAssertFalse(asked, "the host is never asked to remove a parent")
        let note = try await text(".editnote")
        XCTAssertTrue(note.contains("continue from key"),
                      "and the author is told what is in the way; got: \(note)")
    }

    /// Trash is two deliberate acts, and the second one reaches the host.
    func testTrashingALeafTakesTwoClicksAndReachesTheHost() async throws {
        var requested: String?
        tab.onTrashTranscript = { requested = $0 }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        _ = try await tab.evaluateInTab("document.querySelector('.filebar .trash').click();")
        try await settle(times: 3)
        XCTAssertNil(requested, "the first click only arms it — nothing is removed yet")

        _ = try await tab.evaluateInTab("document.querySelector('.filebar .trash.armed').click();")
        try await settle(times: 3)
        XCTAssertEqual(URL(fileURLWithPath: requested ?? "").lastPathComponent,
                       "concealment.transcript",
                       "the second click asks the host for this file and no other")
    }

    // MARK: - Phase 5 slice 4 — the turn budget

    /// Every turn card in a document carries the ENGINE's turn number (R4) —
    /// not a count of the file's own commands, which would be wrong twice over:
    /// meta commands share a turn, and a child transcript starts wherever its
    /// ancestors' commands left the counter.
    func testADocumentShowsTheEngineTurnBesideEachCommand() async throws {
        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        let numbers = try await tab.evaluateInTab("""
        (function () {
          return Array.from(document.querySelectorAll('#docview .turn .turnno'))
            .map(function (t) { return t.textContent; });
        })();
        """) as? [String]
        let turnLabels = try XCTUnwrap(numbers, "the document rows carry a turn column")
        XCTAssertEqual(turnLabels.count, 16, "one per turn card")
        for label in turnLabels {
            XCTAssertTrue(label.range(of: #"^turn \d+$"#, options: .regularExpression) != nil,
                          "every executed command names its engine turn; got: \(label)")
        }

        // The R4 fact itself: concealment `continues: arrival`, so its first
        // command executes wherever arrival's commands left the engine counter —
        // never at turn 1. A per-file count would say 1 here and be wrong.
        let first = try XCTUnwrap(turnLabels.first.flatMap { Int($0.dropFirst("turn ".count)) })
        XCTAssertGreaterThan(first, 1,
                             "a child's turn numbers inherit its ancestors' command count")
    }

    /// An edit that changes a file's turn count, in a file other transcripts
    /// continue from, warns with the blast radius (R4). The same edit in a leaf
    /// carries no warning — there is nothing beneath it to shift.
    func testATurnCountEditOnAParentWarnsAboutItsDescendants() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/key.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()

        // `key` is an interior node: four transcripts continue from it.
        try await select(path: ["arrival", "key"])
        try await openDocument(stem: "key")
        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('addcommand');
          field.value = 'inventory';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.addcmd .addgo').click();
        })();
        """)
        try await settle(times: 6)

        XCTAssertTrue(try String(contentsOf: transcript, encoding: .utf8).contains("> inventory"),
                      "the edit itself must have landed for the warning to mean anything")
        let note = try await text(".editnote")
        XCTAssertTrue(note.contains("changed the file's turn count"),
                      "the confirmation names what moved; got: \(note)")
        XCTAssertTrue(note.contains("4 transcripts continue from it"),
                      "and the blast radius is the fixture's real one; got: \(note)")

        // The same edit in a leaf: no descendants, no warning.
        _ = try await tab.evaluateInTab("document.querySelector('.back').click();")
        try await settle()
        let leaf = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let leafOriginal = try String(contentsOf: leaf, encoding: .utf8)
        defer { try? leafOriginal.write(to: leaf, atomically: true, encoding: .utf8) }

        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")
        _ = try await tab.evaluateInTab("""
        (function () {
          var field = document.getElementById('addcommand');
          field.value = 'inventory';
          field.dispatchEvent(new Event('input', { bubbles: true }));
          document.querySelector('.addcmd .addgo').click();
        })();
        """)
        try await settle(times: 6)

        let leafNote = try await text(".editnote")
        XCTAssertTrue(leafNote.contains("Wrote"), "the edit landed; got: \(leafNote)")
        XCTAssertFalse(leafNote.contains("turn count"),
                       "a leaf shifts nothing beneath it; got: \(leafNote)")
    }


    /// R3/R5 end to end: the run carries the world, and the world is an
    /// assertion source. The document header says where the file STARTS from
    /// (its ancestry's world — R5's inherited-state header), the take-key turn
    /// offers "+ tarnished key" as a chip, and clicking the chip writes a
    /// `[STATE:]` assertion spelled with the runner-picked token — proved
    /// sound by re-running the real suite and staying green, which exercises
    /// parse AND evaluation of exactly what the editor wrote.
    func testTheDocumentShowsInheritedStateAndAWorldChipWritesAStateAssertion() async throws {
        let transcript = fixtureStory.deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/concealment.transcript")
        let original = try String(contentsOf: transcript, encoding: .utf8)
        defer { try? original.write(to: transcript, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        // R5: where this file starts from, without opening its ancestors.
        let entry = try await text(".docmeta .v.entry")
        XCTAssertTrue(entry.contains("in "), "the header names a location; got \(entry)")
        XCTAssertTrue(entry.contains("carrying"), "the header names the inventory; got \(entry)")

        // R3: the successful take offers the key as a change worth asserting.
        let chipLabel = try await tab.evaluateInTab("""
        (function () {
          var chips = Array.from(document.querySelectorAll('#docview .worldchip'));
          var chip = chips.find(function (c) { return c.textContent.indexOf('+ tarnished key') === 0; });
          return chip ? chip.textContent : chips.map(function (c) { return c.textContent; }).join('|');
        })();
        """) as? String
        XCTAssertEqual(chipLabel, "+ tarnished key",
                       "the take turn offers the key it took; chips seen: \(chipLabel ?? "none")")

        _ = try await tab.evaluateInTab("""
        Array.from(document.querySelectorAll('#docview .worldchip'))
          .find(function (c) { return c.textContent.indexOf('+ tarnished key') === 0; })
          .click();
        """)
        try await settle(times: 6)

        // The assertion is in the file, spelled by the serializer with the
        // runner's token — never the display name with its space.
        let written = try String(contentsOf: transcript, encoding: .utf8)
        XCTAssertTrue(written.contains("[STATE: true, player.inventory contains "),
                      "the chip wrote a state assertion")
        XCTAssertFalse(written.contains("contains tarnished key]"),
                       "the expression carries the token, not the two-word display name")

        // The proof the token round-trips: the suite still passes with the
        // editor's assertion evaluated by the real runner.
        try await runTree()
        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "0", "the written [STATE:] parses and evaluates true")
    }

    /// A selection dragged across two turns is not a claim about either command,
    /// so the editor makes no offer rather than silently asserting half of it.
    func testASelectionSpanningTwoTurnsOffersNothing() async throws {
        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "concealment"])
        try await openDocument(stem: "concealment")

        let spanned = try await tab.evaluateInTab("""
        (function () {
          var blocks = Array.from(document.querySelectorAll('#docview .turn .actual[data-command-line]'));
          if (blocks.length < 2) return false;
          var range = document.createRange();
          range.setStart(blocks[0].firstChild, 0);
          range.setEnd(blocks[1].firstChild, 5);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          return selection.getRangeAt(0).toString().length > 0;
        })();
        """) as? Bool
        XCTAssertEqual(spanned, true, "the test must actually make a cross-turn selection")
        try await settle(times: 3)

        let offers = try await count(".promote")
        XCTAssertEqual(offers, 0, "a selection across two commands earns no assertion")
    }

    /// Acceptance 5: the modes are three shapes over ONE selection.
    func testAllThreeModesRenderAndSwitchingThemPreservesTheSelection() async throws {
        try await waitForPage()
        try await runTree()
        try await select(path: ["arrival", "key"])

        for mode in ["list", "documents", "column"] {
            _ = try await tab.evaluateInTab(
                "document.querySelector('[data-mode=\"\(mode)\"]').click();")
            try await settle()
            let pane = try await tab.evaluateInTab(
                "document.getElementById('pane-\(mode)').classList.contains('on')") as? Bool
            XCTAssertEqual(pane, true, "\(mode) mode must be the visible pane")
            let selected = try await text("#pathbar b")
            XCTAssertEqual(selected, "key", "the selection survives the switch to \(mode)")
        }
    }

    // MARK: - Acceptance 3 & 4 — one failure, and a count of what it blocked

    /// A deliberately broken INTERIOR node. Its descendants must be present and
    /// marked `unreached` — never absent (which would hide work) and never red
    /// (which would multiply one bug into a wall of failures, ADR-302 D13).
    func testABrokenInteriorNodeRendersOneFailurePlusABlockedCount() async throws {
        // Mutates the frozen fixture, never the author's story — if this test
        // dies between the write and the defer, nothing real is left corrupted.
        let key = fixtureStory
            .deletingLastPathComponent()
            .appendingPathComponent("tests/transcripts/key.transcript")
        let original = try String(contentsOf: key, encoding: .utf8)
        // `key` is an interior node: 2 commands, four children hang off it.
        let broken = original.replacingOccurrences(of: "> search the doormat",
                                                   with: "> search the doormat\n> xyzzy the doormat\n[OK]")
        try XCTSkipIf(broken == original, "key.transcript no longer has the command this test breaks")
        try broken.write(to: key, atomically: true, encoding: .utf8)
        defer { try? original.write(to: key, atomically: true, encoding: .utf8) }

        try await waitForPage()
        try await runTree()

        let failures = try await text("#tally-fail")
        XCTAssertEqual(failures, "1", "one broken node is one failure")
        let unreached = try await text("#tally-unreached")
        XCTAssertGreaterThan(Int(unreached) ?? 0, 0,
                             "key's descendants must be reported, not silently absent")

        // Acceptance 4: the count rides the PARENT row, because Miller columns
        // show only the selected path and a failure off it is otherwise invisible.
        let badge = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#cols .crow'));
          var row = rows.find(function (r) { return r.querySelector('.stem').textContent === 'arrival'; });
          var badge = row && row.querySelector('.badge');
          return badge ? badge.textContent : null;
        })();
        """) as? String
        XCTAssertEqual(badge, "1", "arrival carries the count of failures beneath it")

        // The blocked descendants are present, marked, and not red.
        try await select(path: ["arrival", "key"])
        let blocked = try await tab.evaluateInTab("""
        (function () {
          var cols = document.querySelectorAll('#cols .col');
          var last = cols[cols.length - 2];
          return Array.from(last.querySelectorAll('.crow')).map(function (r) {
            return r.className;
          }).join('|');
        })();
        """) as? String
        XCTAssertTrue(blocked?.contains("unreached") == true,
                      "key's children must render as unreached; got \(blocked ?? "nil")")
        XCTAssertFalse(blocked?.contains("failed") == true,
                       "a blocked descendant is never a failure")
    }

    // MARK: - Driving the real run

    /// Runs the real tree suite through the real TestRunner and waits for the
    /// process to exit AND the page to have folded the whole stream.
    private func runTree() async throws {
        let exited = expectation(description: "tree run exits")
        relay.onExit = { exited.fulfill() }
        tab.beginRun(story: "fernhill-frozen")
        // The arguments come from production, not from this file. `node <cli>` is
        // prepended only because the fixture runs the checkout's devkit rather
        // than a resolved `sharpee` on PATH; everything after it is what the app
        // itself asks for, so a flag lost in production is lost here too.
        runner.start(executable: URL(fileURLWithPath: "/usr/bin/env"),
                     arguments: ["node", TestToolchain.devkitCLI.path]
                                 + TestRunner.treeRunArguments(storyPath: fixtureStory.path),
                     workingDirectory: fixtureStory.deletingLastPathComponent(),
                     environment: ShellEnvironment.buildEnvironment())
        await fulfillment(of: [exited], timeout: 120)
        try await settle(times: 6)
    }

    /// Opens the selected node's document the way the author does — a double
    /// click on its row, not by setting the surface's state directly.
    private func openDocument(stem: String) async throws {
        _ = try await tab.evaluateInTab("""
        (function () {
          var rows = Array.from(document.querySelectorAll('#cols .crow'));
          var row = rows.find(function (r) { return r.querySelector('.stem').textContent === '\(stem)'; });
          if (!row) return false;
          row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
          return true;
        })();
        """)
        try await settle()
    }

    /// Selects a node by clicking down its ancestry, one column at a time —
    /// which is the only way to reach it, and the point of Miller columns: a
    /// descendant has no row on screen until its parent is the selected path.
    /// Driving it any other way would test a shortcut the author does not have.
    private func select(path: [String]) async throws {
        for stem in path {
            let clicked = try await tab.evaluateInTab("""
            (function () {
              var rows = Array.from(document.querySelectorAll('#cols .crow'));
              var row = rows.find(function (r) { return r.querySelector('.stem').textContent === '\(stem)'; });
              if (!row) return false;
              row.click();
              return true;
            })();
            """) as? Bool
            XCTAssertEqual(clicked, true, "no row for '\(stem)' — its parent is not the selected path")
            try await settle()
        }
    }

    private func waitForPage() async throws {
        for _ in 0..<200 {
            if tab.isPageReady { return }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
        XCTFail("the Testing tab's page did not report ready within 5s")
    }

    /// Lets queued line deliveries and the page's coalesced repaint land.
    private func settle(times: Int = 2) async throws {
        for _ in 0..<times {
            try await Task.sleep(nanoseconds: 80_000_000)
        }
    }

    private func text(_ selector: String) async throws -> String {
        let value = try await tab.evaluateInTab(
            "(document.querySelector('\(selector)') || {textContent: ''}).textContent")
        return (value as? String) ?? ""
    }

    private func count(_ selector: String) async throws -> Int {
        let value = try await tab.evaluateInTab("document.querySelectorAll('\(selector)').length")
        return (value as? Int) ?? -1
    }
}

/// Forwards the runner's raw lines into the tab, which is exactly what
/// TestController does in production — the seam under test is the tab's, not
/// the controller's window plumbing.
@MainActor
private final class LineRelay: TestRunnerDelegate {
    private let tab: TestingTabViewController
    var onExit: (() -> Void)?

    init(tab: TestingTabViewController) { self.tab = tab }

    func runner(_ runner: TestRunner, didReceiveLine line: String) {
        tab.deliver(line: line)
    }
    func runner(_ runner: TestRunner, didEmitStderr text: String) {}
    func runner(_ runner: TestRunner, didChangeState state: TestRunner.State) {}
    func runner(_ runner: TestRunner, didExit result: TestRunner.Result) {
        tab.runFinished(ok: result.state == .passed)
        onExit?()
    }
}
