// SourceMap.swift
// A minimal, self-contained Source Map (v3) consumer — enough to map a generated
// (line, column) in the browser bundle back to its original story source, so Play
// runtime stack frames become clickable. Decodes base64-VLQ mappings; no Node/WASM.
// Public interface: SourceMap(data:), originalPosition(generatedLine:generatedColumn:).
// Owner context: tools/ide — Play.

import Foundation

struct SourceMap {

    /// Source paths as listed in the map (relative to the map file's directory).
    let sources: [String]

    /// One entry per generated line (0-based), each a list of segments sorted by genColumn.
    private let lines: [[Segment]]

    private struct Segment {
        let genColumn: Int
        let sourceIndex: Int
        let originalLine: Int   // 0-based
        let originalColumn: Int // 0-based
    }

    init?(data: Data) {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sources = json["sources"] as? [String],
              let mappings = json["mappings"] as? String else { return nil }
        self.sources = sources
        self.lines = Self.decodeMappings(mappings)
    }

    /// Maps a 1-based generated line / 0-based generated column to the original source.
    /// Returns the source path (as listed in `sources`) plus 1-based line and 0-based column.
    func originalPosition(generatedLine: Int, generatedColumn: Int) -> (source: String, line: Int, column: Int)? {
        let mapLine = generatedLine - 1
        guard lines.indices.contains(mapLine) else { return nil }

        // Largest segment whose genColumn <= the target (segments are sorted ascending).
        let segments = lines[mapLine]
        var match: Segment?
        for segment in segments {
            if segment.genColumn <= generatedColumn { match = segment } else { break }
        }
        guard let segment = match, sources.indices.contains(segment.sourceIndex) else { return nil }
        return (sources[segment.sourceIndex], segment.originalLine + 1, segment.originalColumn)
    }

    // MARK: - Mappings decode

    private static func decodeMappings(_ mappings: String) -> [[Segment]] {
        var result: [[Segment]] = []
        // These carry across segments AND across generated lines (per the v3 spec) —
        // except generated column, which resets to 0 at the start of each line.
        var sourceIndex = 0, originalLine = 0, originalColumn = 0

        for lineField in mappings.split(separator: ";", omittingEmptySubsequences: false) {
            var genColumn = 0
            var segments: [Segment] = []
            for segmentField in lineField.split(separator: ",", omittingEmptySubsequences: false)
            where !segmentField.isEmpty {
                let values = decodeVLQ(segmentField)
                guard !values.isEmpty else { continue }
                genColumn += values[0]
                if values.count >= 4 {
                    sourceIndex += values[1]
                    originalLine += values[2]
                    originalColumn += values[3]
                    segments.append(Segment(genColumn: genColumn,
                                            sourceIndex: sourceIndex,
                                            originalLine: originalLine,
                                            originalColumn: originalColumn))
                }
                // A 1-value segment (genColumn only, no source) carries no mapping — skip.
            }
            result.append(segments)
        }
        return result
    }

    /// base64 char → 6-bit value, indexed by ASCII code (-1 = not a base64 digit).
    private static let base64Table: [Int] = {
        var table = [Int](repeating: -1, count: 128)
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".utf8)
        for (index, byte) in alphabet.enumerated() { table[Int(byte)] = index }
        return table
    }()

    private static func decodeVLQ(_ field: Substring) -> [Int] {
        var values: [Int] = []
        var shift = 0
        var accumulator = 0
        for byte in field.utf8 {
            guard byte < 128 else { continue }
            let digit = base64Table[Int(byte)]
            guard digit >= 0 else { continue }
            let continuation = (digit & 0x20) != 0
            accumulator += (digit & 0x1F) << shift
            if continuation {
                shift += 5
            } else {
                let negative = (accumulator & 1) != 0
                let magnitude = accumulator >> 1
                values.append(negative ? -magnitude : magnitude)
                accumulator = 0
                shift = 0
            }
        }
        return values
    }
}
