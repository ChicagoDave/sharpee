// ChordVersionCheckTests.swift
// D9: parsing the `Sharpee X · Chord Y` version line, semver newer-than
// comparison, and a real-path fetch shape check against the actual devkit CLI's
// --version output (rule 13a — the same line the production check reads).

import XCTest
@testable import SharpeeIDE

@MainActor
final class ChordVersionCheckTests: XCTestCase {

    // MARK: - Parse

    func testParsesChordVersionFromVersionLine() {
        XCTAssertEqual(ChordVersionCheck.chordVersion(fromVersionOutput: "Sharpee 4.1.1 · Chord 2.1.0"),
                       "2.1.0")
        XCTAssertEqual(ChordVersionCheck.chordVersion(fromVersionOutput: "Sharpee 5.0.0 · Chord 3.0.0-beta"),
                       "3.0.0-beta")
        XCTAssertNil(ChordVersionCheck.chordVersion(fromVersionOutput: "sharpee: engine not built"))
        XCTAssertNil(ChordVersionCheck.chordVersion(fromVersionOutput: ""))
    }

    // MARK: - Compare

    func testNewerComparisonIsNumericPerComponent() {
        XCTAssertTrue(ChordVersionCheck.isNewer("2.2.0", thanSupported: "2.1.0"))
        XCTAssertTrue(ChordVersionCheck.isNewer("3.0.0", thanSupported: "2.9.9"))
        XCTAssertTrue(ChordVersionCheck.isNewer("2.1.10", thanSupported: "2.1.9"),
                      "numeric, not lexicographic")
        XCTAssertFalse(ChordVersionCheck.isNewer("2.1.0", thanSupported: "2.1.0"))
        XCTAssertFalse(ChordVersionCheck.isNewer("2.0.9", thanSupported: "2.1.0"))
        XCTAssertTrue(ChordVersionCheck.isNewer("2.1.0.1", thanSupported: "2.1.0"),
                      "extra components count")
        XCTAssertFalse(ChordVersionCheck.isNewer("2.1", thanSupported: "2.1.0"),
                       "missing components count zero")
    }

    /// The supported constant itself must parse as a plain semver — a typo here
    /// would silently disable the whole D9 warning.
    func testSupportedVersionConstantIsWellFormed() {
        let v = ChordVersionCheck.supportedLanguageVersion
        XCTAssertTrue(v.range(of: #"^\d+\.\d+\.\d+$"#, options: .regularExpression) != nil,
                      "supportedLanguageVersion is '\(v)'")
    }

    // MARK: - Real path

    /// The REAL toolchain's --version line parses to a well-formed Chord version
    /// — the exact input the production launch check consumes.
    func testRealVersionOutputParses() throws {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        proc.arguments = ["node", TestToolchain.devkitCLI.path, "--version"]
        proc.environment = ShellEnvironment.buildEnvironment()
        let out = Pipe()
        proc.standardOutput = out
        proc.standardError = Pipe()
        try proc.run()
        let data = out.fileHandleForReading.readDataToEndOfFile()
        proc.waitUntilExit()

        let text = try XCTUnwrap(String(data: data, encoding: .utf8))
        let chord = try XCTUnwrap(ChordVersionCheck.chordVersion(fromVersionOutput: text),
                                  "--version output was: \(text)")
        XCTAssertTrue(chord.range(of: #"^\d+\.\d+\.\d+"#, options: .regularExpression) != nil)
        XCTAssertFalse(ChordVersionCheck.isNewer(ChordVersionCheck.supportedLanguageVersion,
                                                 thanSupported: chord),
                       "the IDE's supported Chord (\(ChordVersionCheck.supportedLanguageVersion)) must not be AHEAD of the toolchain's (\(chord)) in this repo — bump one of them")
    }
}
