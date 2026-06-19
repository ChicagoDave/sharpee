// TSCDiagnosticParserTests.swift
// Covers TSCDiagnosticParser: diagnostic extraction (error/warning, path resolution,
// leading whitespace, colons in messages), non-diagnostic rejection, and pnpm run-header
// package-directory extraction.

import XCTest
@testable import SharpeeIDE

final class TSCDiagnosticParserTests: XCTestCase {

    private let repoRoot = URL(fileURLWithPath: "/repo")

    // MARK: - parse

    func testParsesErrorWithRelativePathResolvedAgainstBase() throws {
        let line = "src/world/light.ts(12,5): error TS2304: Cannot find name 'foo'."
        let d = try XCTUnwrap(TSCDiagnosticParser.parse(line: line, relativeTo: repoRoot))
        XCTAssertEqual(d.file.path, "/repo/src/world/light.ts")
        XCTAssertEqual(d.line, 12)
        XCTAssertEqual(d.column, 5)
        XCTAssertEqual(d.severity, .error)
        XCTAssertEqual(d.code, "TS2304")
        XCTAssertEqual(d.message, "Cannot find name 'foo'.")
    }

    func testParsesWarning() throws {
        let line = "src/a.ts(3,1): warning TS6133: 'x' is declared but never used."
        let d = try XCTUnwrap(TSCDiagnosticParser.parse(line: line, relativeTo: repoRoot))
        XCTAssertEqual(d.severity, .warning)
        XCTAssertEqual(d.code, "TS6133")
    }

    func testAbsolutePathIsUsedAsIs() throws {
        let line = "/Users/me/pkg/src/a.ts(1,1): error TS1005: ';' expected."
        let d = try XCTUnwrap(TSCDiagnosticParser.parse(line: line, relativeTo: repoRoot))
        XCTAssertEqual(d.file.path, "/Users/me/pkg/src/a.ts")
    }

    func testToleratesLeadingWhitespace() throws {
        let line = "   src/a.ts(2,2): error TS1109: Expression expected."
        let d = try XCTUnwrap(TSCDiagnosticParser.parse(line: line, relativeTo: repoRoot))
        XCTAssertEqual(d.line, 2)
        XCTAssertEqual(d.column, 2)
    }

    func testMessageWithColonsIsPreserved() throws {
        let line = "src/a.ts(1,1): error TS2345: Argument of type 'A: B' is not assignable."
        let d = try XCTUnwrap(TSCDiagnosticParser.parse(line: line, relativeTo: repoRoot))
        XCTAssertEqual(d.message, "Argument of type 'A: B' is not assignable.")
    }

    func testNilBaseStillResolvesAFileURL() throws {
        // Degenerate case (base is always set in practice). A relative path with no base
        // is absolutized by URL(fileURLWithPath:), so assert on the file name, not the path.
        let d = try XCTUnwrap(TSCDiagnosticParser.parse(line: "a.ts(1,1): error TS1: x", relativeTo: nil))
        XCTAssertEqual(d.file.lastPathComponent, "a.ts")
    }

    // MARK: - non-diagnostics

    func testPlainOutputLineReturnsNil() {
        XCTAssertNil(TSCDiagnosticParser.parse(line: "> @sharpee/core@1.0.0 build", relativeTo: repoRoot))
        XCTAssertNil(TSCDiagnosticParser.parse(line: "✓ Build complete", relativeTo: repoRoot))
        XCTAssertNil(TSCDiagnosticParser.parse(line: "", relativeTo: repoRoot))
    }

    // MARK: - packageDirectory

    func testPackageDirectoryFromRunHeader() {
        let line = "> @sharpee/world-model@1.0.0 build /Users/david/repos/sharpee/packages/world-model"
        XCTAssertEqual(TSCDiagnosticParser.packageDirectory(from: line)?.path,
                       "/Users/david/repos/sharpee/packages/world-model")
    }

    func testPackageDirectoryNilForScriptLine() {
        XCTAssertNil(TSCDiagnosticParser.packageDirectory(from: "> tsc && tsc -p tsconfig.esm.json"))
        XCTAssertNil(TSCDiagnosticParser.packageDirectory(from: "some plain line"))
    }
}
