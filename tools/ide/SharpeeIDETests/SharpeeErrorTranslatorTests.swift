// SharpeeErrorTranslatorTests.swift
// Covers SharpeeErrorTranslator: the curated rule set (not-a-function, undefined-property,
// not-defined), prefix stripping, and graceful raw fallback.

import XCTest
@testable import SharpeeIDE

final class SharpeeErrorTranslatorTests: XCTestCase {

    func testWorldMethodNotAFunction() {
        let t = SharpeeErrorTranslator.translate(
            message: "Unhandled rejection: world.getLastCreatedEntityId is not a function")
        XCTAssertEqual(t.title, "The world has no getLastCreatedEntityId method")
        XCTAssertNotNil(t.explanation)
        XCTAssertTrue(t.explanation!.contains("world model"))
        XCTAssertNotNil(t.fix)
        XCTAssertTrue(t.fix!.contains("createSceneryItem"))
        XCTAssertEqual(t.raw, "Unhandled rejection: world.getLastCreatedEntityId is not a function")
    }

    func testGenericNotAFunctionUsesLastComponent() {
        let t = SharpeeErrorTranslator.translate(message: "TypeError: foo.bar is not a function")
        XCTAssertEqual(t.title, "bar is not a function")
        XCTAssertNotNil(t.fix)
    }

    func testReadingPropertyOfUndefined() {
        let t = SharpeeErrorTranslator.translate(message: "Cannot read properties of undefined (reading 'id')")
        XCTAssertEqual(t.title, "Something was undefined when reading ‘id’")
        XCTAssertNotNil(t.fix)
    }

    func testIsNotAnObjectEvaluating() {
        let t = SharpeeErrorTranslator.translate(message: "undefined is not an object (evaluating 'entity.id')")
        XCTAssertEqual(t.title, "Something was undefined when reading ‘id’")
    }

    func testNotDefined() {
        let t = SharpeeErrorTranslator.translate(message: "RoomIds is not defined")
        XCTAssertEqual(t.title, "RoomIds isn’t defined")
        XCTAssertNotNil(t.fix)
    }

    func testUnknownErrorFallsBackToRaw() {
        let t = SharpeeErrorTranslator.translate(message: "Something completely unexpected happened")
        XCTAssertEqual(t.title, "Something completely unexpected happened")
        XCTAssertNil(t.fix)
        XCTAssertEqual(t.raw, "Something completely unexpected happened")
    }
}
