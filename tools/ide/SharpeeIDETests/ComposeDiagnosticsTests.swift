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
        {"schemaVersion":2,"diagnostics":[{"severity":"error","code":"analysis.unknown-entity",
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
        {"schemaVersion":2,"diagnostics":[{"severity":"error","code":"hatch.chord-namespace",
         "message":"loader-private","file":"/tmp/mod.ts","line":1}]}
        """))
        XCTAssertEqual(payload.diagnostics[0].code, "hatch.chord-namespace")
        XCTAssertNil(payload.diagnostics[0].span)
    }

    func testDecodesIRSubsetWhenPresent() throws {
        let payload = try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":2,"diagnostics":[],
         "ir":{"format":"story language 2","languageVersion":"3.0.0",
               "meta":{"title":"Probe","fields":{"id":"probe","storyVersion":"1.0.0",
                                                 "authors":["Tests"],"testers":[],"themes":[]}},
               "entities":[{"id":"lab","name":"Lab","article":"the","isPlayable":false,
                            "kinds":[{"name":"room","config":[],"condition":null,
                                      "span":{"line":6,"column":3,"endLine":6,"endColumn":9}}],
                            "traits":[],"span":{"line":5,"column":1,"endLine":8,"endColumn":15}}],
               "actions":[{"name":"xyzzy","patterns":[],
                           "span":{"line":20,"column":1,"endLine":24,"endColumn":4}}],
               "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
                   "night-wind":{"strategy":null,"variants":[],
                                 "span":{"line":30,"column":3,"endLine":30,"endColumn":14}},
                   "cold-returns":{"strategy":null,"variants":[]}}}},
               "hatches":[{"name":"weather","modulePath":"./weather.ts","hatchKind":"text",
                           "span":{"line":40,"column":1,"endLine":40,"endColumn":36}}],
               "unknownFutureField":42}}
        """))
        let ir = try XCTUnwrap(payload.ir)
        XCTAssertEqual(ir.languageVersion, "3.0.0")
        XCTAssertEqual(ir.meta.fields.id, "probe")
        XCTAssertEqual(ir.meta.fields.storyVersion, "1.0.0")
        XCTAssertEqual(ir.meta.fields.authors, ["Tests"])
        XCTAssertNil(ir.grammarFile)

        let names = try XCTUnwrap(ir.phrases?.defaultLocaleNames)
        XCTAssertEqual(names.map { $0.key }, ["cold-returns", "night-wind"],
                       "phrase KEYS decode sorted; bodies stay opaque")
        XCTAssertEqual(names[1].span?.line, 30)
        XCTAssertNil(names[0].span, "a span-less phrase entry decodes without one")

        let hatch = try XCTUnwrap(ir.allHatches.first)
        XCTAssertEqual(hatch.name, "weather")
        XCTAssertEqual(hatch.modulePath, "./weather.ts")
        XCTAssertEqual(hatch.span?.line, 40)

        let entity = try XCTUnwrap(ir.allEntities.first)
        XCTAssertEqual(entity.name, "Lab")
        XCTAssertTrue(entity.hasKind("room"))
        XCTAssertFalse(entity.isPlayable)
        XCTAssertEqual(entity.span, DiagnosticSpan(line: 5, column: 1, endLine: 8, endColumn: 15))

        let action = try XCTUnwrap(ir.allActions.first)
        XCTAssertEqual(action.name, "xyzzy")
        XCTAssertEqual(action.span.line, 20)
    }

    func testDecodesGrammarFileMarker() throws {
        let payload = try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":2,"diagnostics":[],
         "ir":{"format":"story language 2","languageVersion":"3.0.0",
               "meta":{"title":"Std","fields":{"authors":[],"testers":[],"themes":[]}},
               "grammarFile":{"name":"standard-en-us"}}}
        """))
        XCTAssertEqual(payload.ir?.grammarFile?.name, "standard-en-us")
    }

    func testRejectsUnknownSchemaVersionLoudly() {
        XCTAssertThrowsError(try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":999,"diagnostics":[]}
        """))) { error in
            XCTAssertEqual(error as? ComposeJsonPayload.DecodeError,
                           .schemaVersionMismatch(found: 999, expected: 2))
        }
    }

    /// A future-version payload whose SHAPE has also changed still reports the
    /// version mismatch — the gate runs before shape decoding (no partial decode).
    func testVersionGateWinsOverShapeMismatch() {
        XCTAssertThrowsError(try ComposeJsonPayload.decode(from: data("""
        {"schemaVersion":3,"problems":{"totally":"different"}}
        """))) { error in
            XCTAssertEqual(error as? ComposeJsonPayload.DecodeError,
                           .schemaVersionMismatch(found: 3, expected: 2))
        }
    }

    func testMalformedJSONThrowsDecodingError() {
        XCTAssertThrowsError(try ComposeJsonPayload.decode(from: data("not json"))) { error in
            XCTAssertTrue(error is DecodingError, "expected DecodingError, got \(error)")
        }
    }
}
