// TestingSurfaceDocumentSeedTests.swift
// The seed the Testing tab boots its engine at (GH #540, 2026-09-27): the
// loaded tree document's own `seed` — the pin `sharpee test --tree` replays
// at (ADR-307 D5) — and nil for anything that is not a document carrying an
// integer seed, so the host falls back to the IDE's fixed play seed for a
// fresh tree.
// Owner context: tools/ide tests — TestingSurface.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TestingSurfaceDocumentSeedTests: XCTestCase {

    func testADocumentsSeedIsRead() {
        let document = #"{"version": 2, "story": "secret-letter", "seed": 1209, "cards": []}"#
        XCTAssertEqual(TestingSurfaceViewController.documentSeed(in: document), 1209)
    }

    func testADocumentWithoutASeedYieldsNil() {
        XCTAssertNil(TestingSurfaceViewController.documentSeed(in: "{}"))
    }

    func testMalformedTextYieldsNil() {
        XCTAssertNil(TestingSurfaceViewController.documentSeed(in: "not json {{{"))
    }

    func testANonIntegerSeedYieldsNil() {
        XCTAssertNil(TestingSurfaceViewController.documentSeed(in: #"{"seed": 1209.5}"#))
        XCTAssertNil(TestingSurfaceViewController.documentSeed(in: #"{"seed": "1209"}"#))
    }
}
