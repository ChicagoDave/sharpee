// TestingSurfaceManifestSeedTests.swift
// The seed the Testing tab boots its engine at (GH #540, 2026-09-27): the
// tree manifest's own `seed` — the pin `sharpee test --tree` replays at
// (ADR-355 D4) — and nil for anything that is not a manifest carrying an
// integer seed, so the host falls back to the IDE's fixed play seed for a
// fresh tree.
// Owner context: tools/ide tests — TestingSurface.

import XCTest
@testable import SharpeeIDE

@MainActor
final class TestingSurfaceManifestSeedTests: XCTestCase {

    func testAManifestsSeedIsRead() {
        let manifest = #"{"seed": 1209, "story": "secret-letter", "version": 3}"#
        XCTAssertEqual(TestingSurfaceViewController.manifestSeed(in: manifest), 1209)
    }

    func testAManifestWithoutASeedYieldsNil() {
        XCTAssertNil(TestingSurfaceViewController.manifestSeed(in: "{}"))
    }

    func testMalformedTextYieldsNil() {
        XCTAssertNil(TestingSurfaceViewController.manifestSeed(in: "not json {{{"))
    }

    func testANonIntegerSeedYieldsNil() {
        XCTAssertNil(TestingSurfaceViewController.manifestSeed(in: #"{"seed": 1209.5}"#))
        XCTAssertNil(TestingSurfaceViewController.manifestSeed(in: #"{"seed": "1209"}"#))
    }
}
