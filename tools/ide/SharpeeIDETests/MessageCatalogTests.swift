// MessageCatalogTests.swift
// The `sharpee messages` catalog (ADR-333 D4a) on the Swift side: the
// version gate rejects a payload the IDE was not written against, the shape
// decodes, and — the real path — the REAL devkit CLI's catalog is fetched
// through the production fetcher and carries the taking message with the
// pack's own text.
// Owner context: tools/ide — Tests.

import XCTest
@testable import SharpeeIDE

@MainActor
final class MessageCatalogTests: XCTestCase {

    func testDecodesTheWireShape() throws {
        let catalog = try MessageCatalog.decode(from: Data("""
        {"schemaVersion":1,"locale":"en-US","messages":[
          {"id":"if.action.taking.taken","alias":"taking-taken","template":"Taken."}]}
        """.utf8))
        XCTAssertEqual(catalog.locale, "en-US")
        XCTAssertEqual(catalog.entry(forId: "if.action.taking.taken"),
                       .init(id: "if.action.taking.taken", alias: "taking-taken", template: "Taken."))
        XCTAssertNil(catalog.entry(forId: "if.action.taking.nope"))
    }

    func testRejectsAnotherSchemaVersionByName() {
        XCTAssertThrowsError(try MessageCatalog.decode(from: Data("""
        {"schemaVersion":2,"locale":"en-US","messages":[]}
        """.utf8))) { error in
            XCTAssertEqual(error as? MessageCatalog.DecodeError,
                           .schemaVersionMismatch(found: 2, expected: MessageCatalog.currentSchemaVersion))
        }
    }

    /// Real path: `node packages/devkit/dist/cli.js messages` through the fetcher.
    func testTheRealCLIsCatalogCarriesTheTakingMessageWithThePacksText() throws {
        try XCTSkipUnless(FileManager.default.fileExists(atPath: TestToolchain.devkitCLI.path),
                          "packages/devkit/dist/cli.js is not built")
        let fetched = expectation(description: "catalog fetched")
        var outcome: Result<MessageCatalog, ComposeRunner.Failure>?
        let fetcher = MessageCatalogFetcher()
        fetcher.fetch(executable: URL(fileURLWithPath: "/usr/bin/env"),
                      arguments: ["node", TestToolchain.devkitCLI.path, "messages"],
                      workingDirectory: TestToolchain.repoRoot) { result in
            outcome = result
            fetched.fulfill()
        }
        wait(for: [fetched], timeout: 30)

        guard case .success(let catalog) = try XCTUnwrap(outcome) else {
            return XCTFail("fetch failed: \(String(describing: outcome))")
        }
        XCTAssertGreaterThan(catalog.messages.count, 500)
        let taken = try XCTUnwrap(catalog.entry(forId: "if.action.taking.taken"))
        XCTAssertEqual(taken.alias, "taking-taken")
        XCTAssertEqual(taken.template, "Taken.")
    }
}
