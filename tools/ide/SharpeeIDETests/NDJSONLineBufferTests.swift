// NDJSONLineBufferTests.swift
// Covers NDJSONLineBuffer: pipe chunks do not align with line boundaries, so
// the buffer must yield exactly one Data per complete line — none dropped,
// none double-yielded — across mid-line splits, multi-line chunks, and an
// unterminated tail flushed at stream end.

import XCTest
@testable import SharpeeIDE

final class NDJSONLineBufferTests: XCTestCase {

    private func chunk(_ s: String) -> Data { Data(s.utf8) }

    func testSplitMidLineYieldsTheLineOnlyOnceComplete() {
        var buffer = NDJSONLineBuffer()
        XCTAssertEqual(buffer.append(chunk(#"{"type":"run-"#)), [])
        let lines = buffer.append(chunk(#"start"}"# + "\n"))
        XCTAssertEqual(lines, [chunk(#"{"type":"run-start"}"#)])
        XCTAssertNil(buffer.flush(), "nothing may remain after the newline")
    }

    func testOneChunkManyLinesYieldsAllInOrder() {
        var buffer = NDJSONLineBuffer()
        let lines = buffer.append(chunk("{\"a\":1}\n{\"b\":2}\n{\"c\":3}\n"))
        XCTAssertEqual(lines, [chunk(#"{"a":1}"#), chunk(#"{"b":2}"#), chunk(#"{"c":3}"#)])
    }

    func testChunkBoundaryOnTheNewlineItself() {
        var buffer = NDJSONLineBuffer()
        XCTAssertEqual(buffer.append(chunk(#"{"a":1}"#)), [])
        XCTAssertEqual(buffer.append(chunk("\n")), [chunk(#"{"a":1}"#)])
    }

    func testTrailingPartialCarriesAcrossAndFlushes() {
        var buffer = NDJSONLineBuffer()
        let first = buffer.append(chunk("{\"a\":1}\n{\"tail\":"))
        XCTAssertEqual(first, [chunk(#"{"a":1}"#)])
        XCTAssertEqual(buffer.flush(), chunk(#"{"tail":"#))
        XCTAssertNil(buffer.flush(), "flush resets the pending tail")
    }

    func testEmptyLinesAreSkippedNotYielded() {
        var buffer = NDJSONLineBuffer()
        XCTAssertEqual(buffer.append(chunk("\n\n{\"a\":1}\n\n")), [chunk(#"{"a":1}"#)])
    }
}
