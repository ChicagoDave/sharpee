// SourceMapTests.swift
// Covers SourceMap: base64-VLQ + mappings decode and originalPosition lookup against a
// small hand-built map with known segments.

import XCTest
@testable import SharpeeIDE

final class SourceMapTests: XCTestCase {

    // sources: ["a.ts"]; mappings "AAAA,CACA;AAAA":
    //   gen line 1: seg@col0 -> (src0, oLine0, oCol0); seg@col1 -> (src0, oLine1, oCol0)
    //   gen line 2: seg@col0 -> (src0, oLine1, oCol0)
    private func makeMap() -> SourceMap {
        let json = #"{"version":3,"sources":["a.ts"],"names":[],"mappings":"AAAA,CACA;AAAA"}"#
        return SourceMap(data: Data(json.utf8))!
    }

    func testFirstSegmentMapsToOriginLineOne() {
        let p = makeMap().originalPosition(generatedLine: 1, generatedColumn: 0)
        XCTAssertEqual(p?.source, "a.ts")
        XCTAssertEqual(p?.line, 1)
        XCTAssertEqual(p?.column, 0)
    }

    func testColumnPicksLargestSegmentAtOrBeforeIt() {
        // genColumn 5 on line 1 falls in the second segment (genCol 1) -> original line 2.
        let p = makeMap().originalPosition(generatedLine: 1, generatedColumn: 5)
        XCTAssertEqual(p?.line, 2)
    }

    func testCarryAcrossGeneratedLines() {
        // Line 2's lone segment carries originalLine from the prior line -> original line 2.
        let p = makeMap().originalPosition(generatedLine: 2, generatedColumn: 0)
        XCTAssertEqual(p?.line, 2)
        XCTAssertEqual(p?.column, 0)
    }

    func testOutOfRangeLineReturnsNil() {
        XCTAssertNil(makeMap().originalPosition(generatedLine: 99, generatedColumn: 0))
    }

    func testInvalidJSONReturnsNilInit() {
        XCTAssertNil(SourceMap(data: Data("not a map".utf8)))
    }

    func testNegativeVLQDeltaDecodes() {
        // Generated column stays ascending (spec-valid); the original-line delta goes negative.
        // "AAEA,CADA": seg1 genCol0 -> oLine2; seg2 genCol1 -> oLine 2-1 = 1.
        let json = #"{"version":3,"sources":["x.ts"],"names":[],"mappings":"AAEA,CADA"}"#
        let map = SourceMap(data: Data(json.utf8))!
        XCTAssertEqual(map.originalPosition(generatedLine: 1, generatedColumn: 0)?.line, 3) // oLine2 -> line3
        XCTAssertEqual(map.originalPosition(generatedLine: 1, generatedColumn: 5)?.line, 2) // oLine1 -> line2
    }
}
