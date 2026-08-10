// DocsTabRealPathTests.swift
// Phase 3 acceptance as a rule-13a real-path suite: no stub stands in for
// anything this repository owns. The bundle under test is the one shipped in the
// app, produced by the real bundler from the real corpus; it is served by the
// real scheme handler into a real WKWebView; and every assertion reads the
// RENDERED page rather than the bytes handed to it.
//
// Acceptance covered: the tab renders the chosen corpus with no network
// dependency; tab selection behaves like the existing tabs; the bundle is
// produced by the build rather than committed by hand; and the bundle's Chord
// version agrees with the compiler the app ships beside.
// Owner context: tools/ide — Tests.

import XCTest
import WebKit
@testable import SharpeeIDE

@MainActor
final class DocsTabRealPathTests: XCTestCase {

    private var tab: DocsTabViewController!

    override func setUpWithError() throws {
        try super.setUpWithError()
        try XCTSkipUnless(DocsTabWebRoot.indexURL() != nil,
                          "the app has no docs-tab bundle — run tools/ide/build-docs-tab.sh")
        tab = DocsTabViewController()
        _ = tab.view // force loadView: installs the scheme handler and starts the page
    }

    override func tearDownWithError() throws {
        tab = nil
        try super.tearDownWithError()
    }

    // MARK: - The bundle, over a scheme handler, offline

    func testTheBundleShipsInTheAppAndBootsOverTheSchemeHandler() async throws {
        let index = try XCTUnwrap(DocsTabWebRoot.indexURL())
        XCTAssertEqual(index.deletingLastPathComponent().lastPathComponent,
                       DocsTabWebRoot.folderName)

        try await waitForPage()

        let scheme = try await tab.evaluateInTab("location.protocol") as? String
        XCTAssertEqual(scheme, "\(DocsTabSchemeHandler.scheme):",
                       "the page must be served over the custom scheme, never file://")
    }

    /// Phase 3's acceptance: the tab renders with no network dependency.
    ///
    /// Checked by scanning the shipped bundle for anything that would FETCH over
    /// the network — a script, stylesheet, image, font or CSS url() pointing at
    /// http(s). Prose links are deliberately not flagged: an `<a href>` is a
    /// destination the author may choose, not a load the page performs, and the
    /// tab hands those to the browser (see the external-link test below).
    ///
    /// Resource Timing is not used for this: WKWebView records no entries for
    /// custom-scheme loads, so an empty list would look like proof and mean
    /// nothing.
    func testNothingTheBundleLoadsComesFromTheNetwork() throws {
        let root = try XCTUnwrap(DocsTabWebRoot.directory())
        let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)?
            .compactMap { $0 as? URL }
            .filter { ["html", "css", "js", "json"].contains($0.pathExtension) } ?? []
        XCTAssertGreaterThan(files.count, 100, "the whole bundle must be present")

        // Asset positions only — the things a browser goes and gets.
        let fetching = [
            #"<script[^>]+src="https?:"#,
            #"<link[^>]+href="https?:"#,
            #"<img[^>]+src="https?:"#,
            #"url\(\s*['"]?https?:"#,
            #"fetch\(\s*['"]https?:"#,
            #"@import\s+['"]?https?:"#,
        ]

        var offenders: [String] = []
        for file in files {
            guard let text = try? String(contentsOf: file, encoding: .utf8) else { continue }
            for pattern in fetching where text.range(of: pattern, options: .regularExpression) != nil {
                offenders.append("\(file.lastPathComponent): \(pattern)")
            }
        }
        XCTAssertEqual(offenders, [], "the tab must render with no network at all")
    }

    // MARK: - The corpus renders

    func testItRendersARealPageFromTheBundledCorpus() async throws {
        try await waitForPage()
        tab.showPage("/chord/guide/world/the-story-header")
        try await settle()

        let title = try await text(".page-title")
        XCTAssertFalse(title.isEmpty, "the page must carry its title")

        let body = try await text("#content")
        XCTAssertTrue(body.contains("story-version"),
                      "the story-header page must show the closed field set; got \(body.prefix(200))")
        // Markdown actually rendered, rather than being shown as source.
        let tables = try await count("#content table")
        XCTAssertGreaterThan(tables, 0, "the field table must render as a table")
        let fences = try await count("#content pre code")
        XCTAssertGreaterThan(fences, 0, "chord fences must render as code blocks")
    }

    /// The corpus the app ships is the corrected one — item 8 as an artifact
    /// test, not a promise. A regression on the website would fail here.
    func testTheShippedCorpusDoesNotTeachTheRemovedStoryHeader() async throws {
        let pages = try XCTUnwrap(DocsTabWebRoot.directory()?.appendingPathComponent("pages"))
        let files = try FileManager.default.contentsOfDirectory(at: pages, includingPropertiesForKeys: nil)
        XCTAssertGreaterThan(files.count, 100, "the whole corpus must be bundled")

        var offenders: [String] = []
        for file in files {
            let text = try String(contentsOf: file, encoding: .utf8)
            // Only inside a CHORD CODE BLOCK. Naming the removed spelling in
            // prose is exactly what `the-story-header` should do — it carries a
            // was/now table — so a flat search would fail on the page that
            // documents the change correctly.
            for block in chordBlocks(in: text)
            where block.range(of: #"story &quot;[^&]*&quot; by "#, options: .regularExpression) != nil {
                offenders.append(file.lastPathComponent)
            }
        }
        XCTAssertEqual(offenders, [],
                       "these bundled pages still teach the removed positional story header")
    }

    /// The count changed with GH #238 and the assertion changed with it, on
    /// purpose. The rail now mirrors the website's, where a nested item's
    /// children appear only while the reader is on that branch, so the resting
    /// rail lists every top-level item rather than every page. Reachability is
    /// unchanged and is what the second half of this test now proves directly:
    /// a child is one click from its parent. Asserting a raw `> 100` again
    /// would only be asserting that children are never collapsed.
    func testTheNavigationListsTheCorpusAndFiltersIt() async throws {
        try await waitForPage()
        try await settle()

        let all = try await count(".nav-link")
        XCTAssertGreaterThan(all, 50, "every top-level nav item must be reachable at rest")

        _ = try await tab.evaluateInTab("""
            (function () {
              var s = document.getElementById('search');
              s.value = 'phrasebook';
              s.dispatchEvent(new Event('input'));
              return true;
            })()
            """)
        try await settle()

        let filtered = try await count(".nav-link")
        XCTAssertGreaterThan(filtered, 0, "a real term must match something")
        XCTAssertLessThan(filtered, all, "the filter must actually narrow the list")
    }

    // MARK: - The rail mirrors the website's structure (GH #238)

    /// The rail must show the documentation's organization, not the filesystem's.
    /// Sections carry their real titles — `/learn/*` lives under "Tutorial", a
    /// name no path segment contains, so seeing it proves the tab is reading
    /// nav.ts rather than deriving labels from URLs.
    func testTheRailRendersTheWebsitesSectionsAndGroups() async throws {
        try await waitForPage()
        try await settle()

        let sections = try await textList(".nav-section")
        XCTAssertEqual(sections, ["Chord Writer", "Chord", "Tutorial"],
                       "the rail's sections and their order come from nav.ts")

        let groups = try await textList(".nav-group")
        XCTAssertTrue(groups.contains("Getting Started"), "groups render under their section")
        XCTAssertGreaterThan(groups.count, 5, "the rail is grouped, not one flat list")

        XCTAssertFalse(groups.contains("Ide"), "no label may be humanized from a URL segment")
    }

    /// Chord's command-line Getting Started group is deliberately excluded, and
    /// the tab opens on Chord Writer instead. A regression here puts `npm
    /// install -g` in front of an author who has no terminal open.
    func testItOpensOnChordWriterAndShipsNoCommandLineInstallPages() async throws {
        try await waitForPage()
        try await settle()

        let crumb = try await text(".crumb")
        XCTAssertEqual(crumb, "Chord Writer › Getting Started",
                       "the tab must land in the Chord Writer section")

        let cliPages = try await tab.evaluateInTab("""
            (function () {
              return Array.prototype.filter.call(
                document.querySelectorAll('.nav-link'),
                function (a) { return a.getAttribute('href').indexOf('/chord/getting-started') === 0; }
              ).length;
            })()
            """) as? Int
        XCTAssertEqual(cliPages, 0, "the excluded CLI group must not be reachable")
    }

    /// A nested item's children are one click from their parent. This is the
    /// reachability the resting-count assertion above no longer makes.
    func testAnItemsChildrenAppearWhenTheReaderIsOnThatBranch() async throws {
        try await waitForPage()
        try await settle()

        let closed = try await count(".nav-child")
        XCTAssertEqual(closed, 0, "no branch is open before the reader is on one")

        tab.showPage("/chord/guide/tooling")
        try await settle()

        let opened = try await count(".nav-child")
        XCTAssertGreaterThan(opened, 0, "opening a parent reveals its children in the rail")
    }

    // MARK: - The pager

    /// A page ends in where to go next, in nav order rather than path order.
    ///
    /// The previous page here is the section's "Overview" item, and the pager
    /// labels it with its GROUP's title — "Getting Started", not "Overview".
    /// That relabel is `pagerFor`'s rule in the website's own nav.ts, and it
    /// exists because a link reading "Overview" tells the reader nothing about
    /// where it goes. The rail still says "Overview"; only the pager renames it.
    func testThePagerFollowsNavOrder() async throws {
        try await waitForPage()
        tab.showPage("/chord-writer/your-first-story")
        try await settle()

        let prev = try await text(".pager-prev")
        let next = try await text(".pager-next")
        XCTAssertEqual(prev, "Getting Started", "a generic Overview is labeled with its group")
        XCTAssertEqual(next, "Building, playing, and testing", "next is the nav's following page")
    }

    /// The boundary that matters: the pager must not walk the reader out of one
    /// section and into another. Chord's last page and the Tutorial's first are
    /// adjacent in the bundle and must NOT be adjacent in the pager.
    func testThePagerNeverCrossesASectionBoundary() async throws {
        try await waitForPage()

        // Boundaries come from the SHIPPED index, read in Swift. Asking the page
        // to compute them would let one bug hide another: the page is the thing
        // under test here.
        let boundaries = try sectionEdges()
        XCTAssertEqual(boundaries.count, 6, "three sections, each with a first and last page")

        // The last page of each section must have no next; the first, no prev.
        for (offset, href) in boundaries.enumerated() {
            tab.showPage(href)
            try await settle()
            let isFirstOfSection = offset % 2 == 0
            let selector = isFirstOfSection ? ".pager-prev" : ".pager-next"
            let edgeLinks = try await count(selector)
            XCTAssertEqual(edgeLinks, 0,
                           "\(href) is at a section edge and must have no \(selector)")
        }
    }

    // MARK: - The version gate

    /// The bundle, the compiler, and the IDE must name one Chord version. Two of
    /// the three already agreed before this tab existed; the bundle is the third,
    /// and a mismatch means the app ships documentation for a language its own
    /// compiler does not speak.
    func testTheBundledCorpusIsPinnedToTheCompilersChordVersion() throws {
        let bundled = try XCTUnwrap(DocsTabWebRoot.bundledChordVersion(),
                                    "the bundle must record the version it documents")
        XCTAssertEqual(bundled, ChordVersionCheck.supportedLanguageVersion,
                       "the docs bundle and the IDE disagree about the Chord version")

        let versionFile = TestToolchain.repoRoot
            .appendingPathComponent("packages/chord/src/version.ts")
        let source = try String(contentsOf: versionFile, encoding: .utf8)
        let match = source.range(of: #"CHORD_LANGUAGE_VERSION\s*=\s*'([^']+)'"#,
                                 options: .regularExpression)
        let declared = try XCTUnwrap(match.map { String(source[$0]) })
        XCTAssertTrue(declared.contains(bundled),
                      "the compiler declares \(declared) but the docs bundle says \(bundled)")
    }

    func testTheBannerAppearsOnlyWhenTheToolchainDisagrees() async throws {
        try await waitForPage()
        let bundled = try XCTUnwrap(DocsTabWebRoot.bundledChordVersion())

        tab.setToolchainVersion(bundled)
        try await settle()
        let quiet = try await hidden("#version-banner")
        XCTAssertTrue(quiet, "agreement must say nothing at all")

        tab.setToolchainVersion("99.0.0")
        try await settle()
        let raised = try await hidden("#version-banner")
        XCTAssertFalse(raised, "a disagreement must be visible")
        let banner = try await text("#version-banner")
        XCTAssertTrue(banner.contains(bundled) && banner.contains("99.0.0"),
                      "the banner must name both versions; got \(banner)")
    }

    // MARK: - Links out

    /// A link to GitHub must reach the browser, not navigate the pane — the tab
    /// has no chrome and no back button, so a navigation would strand the author.
    func testAnExternalLinkGoesToTheBrowserAndDoesNotNavigateTheTab() async throws {
        try await waitForPage()
        try await settle()

        var opened: [URL] = []
        tab.onOpenExternal = { opened.append($0) }

        _ = try await tab.evaluateInTab("""
            (function () {
              var a = document.createElement('a');
              a.href = 'https://nodejs.org';
              a.textContent = 'node';
              document.getElementById('content').appendChild(a);
              a.click();
              return true;
            })()
            """)
        try await settle()

        XCTAssertEqual(opened.map(\.absoluteString), ["https://nodejs.org"])
        let stillHere = try await tab.evaluateInTab("location.protocol") as? String
        XCTAssertEqual(stillHere, "\(DocsTabSchemeHandler.scheme):",
                       "the tab must not have navigated away from the bundle")
    }

    // MARK: - It behaves like the other tabs

    func testTheRightPanelOffersDocsAndShowsOnlyTheSelectedTab() throws {
        let panel = RightPanelViewController()
        _ = panel.view

        panel.showDocsTab()
        XCTAssertFalse(panel.docsTab.view.isHidden, "Docs must show when selected")
        XCTAssertTrue(panel.play.view.isHidden)

        panel.showTestingTab()
        XCTAssertTrue(panel.docsTab.view.isHidden, "Docs must hide when another tab is selected")
    }

    // MARK: - Produced by the build, not by hand

    func testTheBundleIsBuiltByAScriptTheProjectRuns() throws {
        let ide = TestToolchain.repoRoot.appendingPathComponent("tools/ide")
        let script = ide.appendingPathComponent("build-docs-tab.sh")
        XCTAssertTrue(FileManager.default.isExecutableFile(atPath: script.path),
                      "build-docs-tab.sh must exist and be executable")

        let spec = try String(contentsOf: ide.appendingPathComponent("project.yml"), encoding: .utf8)
        XCTAssertTrue(spec.contains("build-docs-tab.sh"),
                      "the project must run the bundler as a pre-build step, or the app ships stale docs")
        XCTAssertTrue(spec.contains("SharpeeIDE/Resources/docs-tab"),
                      "the bundle must be a folder reference so adding a page needs no regenerate")
    }

    // MARK: - Helpers

    /// The contents of every `chord` fence in a rendered page fragment — what an
    /// author would copy, as opposed to prose about the language.
    private func chordBlocks(in html: String) -> [String] {
        let opener = "<pre><code class=\"language-chord\">"
        return html.components(separatedBy: opener).dropFirst().compactMap { rest in
            rest.range(of: "</code></pre>").map { String(rest[rest.startIndex..<$0.lowerBound]) }
        }
    }

    private func waitForPage() async throws {
        for _ in 0..<200 {
            if tab.isReady { return }
            try await Task.sleep(nanoseconds: 25_000_000)
        }
        XCTFail("the Documentation tab's page did not report ready within 5s")
    }

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

    private func hidden(_ selector: String) async throws -> Bool {
        let value = try await tab.evaluateInTab("document.querySelector('\(selector)').hidden")
        return (value as? Bool) ?? false
    }

    /// Every match's text, in document order.
    private func textList(_ selector: String) async throws -> [String] {
        let value = try await tab.evaluateInTab("""
            Array.prototype.map.call(
              document.querySelectorAll('\(selector)'),
              function (n) { return n.firstChild ? n.firstChild.textContent.trim() : ''; }
            ).join('\\u0001')
            """)
        let joined = (value as? String) ?? ""
        return joined.isEmpty ? [] : joined.components(separatedBy: "\u{01}")
    }

    /// The shipped `docs-index.json`, decoded straight off disk.
    private func shippedIndex() throws -> [String: Any] {
        let indexURL = try XCTUnwrap(DocsTabWebRoot.indexURL())
        let jsonURL = indexURL.deletingLastPathComponent().appendingPathComponent("docs-index.json")
        let data = try Data(contentsOf: jsonURL)
        return try XCTUnwrap(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    /// First and last href of each shipped nav section, in section order,
    /// flattened the way the pager flattens: items then their children.
    private func sectionEdges() throws -> [String] {
        let nav = try XCTUnwrap(shippedIndex()["nav"] as? [[String: Any]])
        var edges: [String] = []
        for section in nav {
            var steps: [String] = []
            for group in (section["groups"] as? [[String: Any]]) ?? [] {
                for item in (group["items"] as? [[String: Any]]) ?? [] {
                    if let href = item["href"] as? String { steps.append(href) }
                    for child in (item["children"] as? [[String: Any]]) ?? [] {
                        if let href = child["href"] as? String { steps.append(href) }
                    }
                }
            }
            if let first = steps.first, let last = steps.last { edges.append(contentsOf: [first, last]) }
        }
        return edges
    }
}
