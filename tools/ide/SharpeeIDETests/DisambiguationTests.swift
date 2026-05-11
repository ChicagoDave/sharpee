// DisambiguationTests.swift
// Exercises EditorViewController.makeDisplayTitles(for:) — the tab-title
// disambiguation algorithm used when multiple open files share a filename
// (e.g. several `index.ts` barrels).

import XCTest
@testable import SharpeeIDE

final class DisambiguationTests: XCTestCase {

    // Helper: build a list of file URLs from absolute path strings.
    private func urls(_ paths: [String]) -> [URL] {
        paths.map { URL(fileURLWithPath: $0) }
    }

    func testEmptyInputReturnsEmpty() {
        XCTAssertEqual(EditorViewController.makeDisplayTitles(for: []), [])
    }

    func testSingleFileReturnsFilename() {
        let result = EditorViewController.makeDisplayTitles(
            for: urls(["/Users/x/repo/README.md"])
        )
        XCTAssertEqual(result, ["README.md"])
    }

    func testUniqueFilenamesAreNotDisambiguated() {
        let result = EditorViewController.makeDisplayTitles(
            for: urls([
                "/Users/x/repo/README.md",
                "/Users/x/repo/src/main.swift",
                "/Users/x/repo/package.json",
            ])
        )
        XCTAssertEqual(result, ["README.md", "main.swift", "package.json"])
    }

    func testCollisionPairDisambiguatesAtDepthTwo() {
        let result = EditorViewController.makeDisplayTitles(
            for: urls([
                "/repo/src/traits/index.ts",
                "/repo/src/actions/index.ts",
            ])
        )
        XCTAssertEqual(result, ["traits/index.ts", "actions/index.ts"])
    }

    func testThreeWayCollisionDisambiguatesAtDepthTwo() {
        let result = EditorViewController.makeDisplayTitles(
            for: urls([
                "/repo/src/traits/index.ts",
                "/repo/src/actions/index.ts",
                "/repo/src/behaviors/index.ts",
            ])
        )
        XCTAssertEqual(result, [
            "traits/index.ts",
            "actions/index.ts",
            "behaviors/index.ts",
        ])
    }

    func testCollisionForcesDepthThreeWhenParentsAlsoCollide() {
        // Both files live in `world/` directories; depth-2 suffix `world/index.ts`
        // still collides. Depth-3 suffix discriminates via the grandparent.
        let result = EditorViewController.makeDisplayTitles(
            for: urls([
                "/repo/pkg-a/world/index.ts",
                "/repo/pkg-b/world/index.ts",
            ])
        )
        XCTAssertEqual(result, [
            "pkg-a/world/index.ts",
            "pkg-b/world/index.ts",
        ])
    }

    func testMixedUniqueAndCollidingFiles() {
        // README is unique → kept as filename.
        // The two index.ts files collide → disambiguated at depth 2.
        let result = EditorViewController.makeDisplayTitles(
            for: urls([
                "/repo/README.md",
                "/repo/src/traits/index.ts",
                "/repo/src/actions/index.ts",
            ])
        )
        XCTAssertEqual(result, [
            "README.md",
            "traits/index.ts",
            "actions/index.ts",
        ])
    }

    func testCollisionPreservesInputOrder() {
        // Disambiguation should not reorder URLs — caller relies on
        // the result being parallel to the input array.
        let result = EditorViewController.makeDisplayTitles(
            for: urls([
                "/repo/z/actions/index.ts",
                "/repo/a/traits/index.ts",
            ])
        )
        XCTAssertEqual(result, ["actions/index.ts", "traits/index.ts"])
    }
}
