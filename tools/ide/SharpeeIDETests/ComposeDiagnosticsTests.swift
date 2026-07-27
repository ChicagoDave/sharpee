// ComposeDiagnosticsTests.swift
// Decoder tests for the compose --json Swift mirror: the schema-version gate
// (loud rejection BEFORE shape decoding), record shapes (compile spans present,
// hatch spans absent), and IR presence semantics (`ir` iff the compile succeeded).

import XCTest
@testable import SharpeeIDE

final class ComposeDiagnosticsTests: XCTestCase {

    private func data(_ json: String) -> Data { Data(json.utf8) }

    func testDecodesCompileRecordWithFullSpan() throws {
        let payload = try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":1,"diagnostics":[{"severity":"error","code":"analysis.unknown-entity",
         "message":"No entity named `Attic`.","file":"/tmp/probe.story","line":11,
         "span":{"line":11,"column":13,"endLine":11,"endColumn":22}}]}
        """))
        XCTAssertEqual(payload.diagnostics.count, 1)
        let record = payload.diagnostics[0]
        XCTAssertEqual(record.severity, .error)
        XCTAssertEqual(record.code, "analysis.unknown-entity")
        XCTAssertEqual(record.span, DiagnosticSpan(line: 11, column: 13, endLine: 11, endColumn: 22))
        XCTAssertNil(payload.ir)
    }

    func testDecodesHatchRecordWithoutSpan() throws {
        let payload = try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":1,"diagnostics":[{"severity":"error","code":"hatch.chord-namespace",
         "message":"loader-private","file":"/tmp/mod.ts","line":1}]}
        """))
        XCTAssertEqual(payload.diagnostics[0].code, "hatch.chord-namespace")
        XCTAssertNil(payload.diagnostics[0].span)
    }

    func testDecodesIRSubsetWhenPresent() throws {
        let payload = try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":1,"diagnostics":[],
         "ir":{"format":"story language 1","languageVersion":"2.1.0",
               "meta":{"title":"Probe","author":"Tests","fields":{"id":"probe","version":"1.0.0"}},
               "entities":[],"unknownFutureField":42}}
        """))
        let ir = try XCTUnwrap(payload.ir)
        XCTAssertEqual(ir.languageVersion, "2.1.0")
        XCTAssertEqual(ir.meta.fields["id"], "probe")
        XCTAssertNil(ir.grammarFile)
    }

    func testDecodesGrammarFileMarker() throws {
        let payload = try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":1,"diagnostics":[],
         "ir":{"format":"story language 1","languageVersion":"2.1.0",
               "meta":{"title":"Std","author":"Platform","fields":{}},
               "grammarFile":{"name":"standard-en-us"}}}
        """))
        XCTAssertEqual(payload.ir?.grammarFile?.name, "standard-en-us")
    }

    func testRejectsUnknownSchemaVersionLoudly() {
        XCTAssertThrowsError(try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":999,"diagnostics":[]}
        """))) { error in
            XCTAssertEqual(error as? ComposeJsonPayload.DecodeError,
                           .schemaVersionMismatch(found: 999, expected: 1))
        }
    }

    /// A future-version payload whose SHAPE has also changed still reports the
    /// version mismatch — the gate runs before shape decoding (no partial decode).
    func testVersionGateWinsOverShapeMismatch() {
        XCTAssertThrowsError(try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":2,"problems":{"totally":"different"}}
        """))) { error in
            XCTAssertEqual(error as? ComposeJsonPayload.DecodeError,
                           .schemaVersionMismatch(found: 2, expected: 1))
        }
    }

    func testMalformedJSONThrowsDecodingError() {
        XCTAssertThrowsError(try ComposeJsonPayload.decode(from: data("not json"))) { error in
            XCTAssertTrue(error is DecodingError, "expected DecodingError, got \(error)")
        }
    }
}
