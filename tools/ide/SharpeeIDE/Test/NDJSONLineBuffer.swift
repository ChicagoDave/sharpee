// NDJSONLineBuffer.swift
// Reassembles complete NDJSON lines from arbitrary pipe chunks: `availableData`
// does not align with line boundaries, so a record can arrive split across
// chunks (or several records in one chunk). Appending a chunk yields every
// COMPLETE line it closes; a trailing partial line is carried forward until
// its newline (or `flush()` at stream end). Exactly one yield per line —
// none dropped, none double-decoded.
// Public interface: NDJSONLineBuffer.append(_:), flush().
// Owner context: tools/ide — Test.

import Foundation

struct NDJSONLineBuffer {

    private static let newline = UInt8(ascii: "\n")

    private var partial = Data()

    /// Appends a chunk and returns the complete lines it closes (without their
    /// newline terminators; empty lines are skipped).
    mutating func append(_ chunk: Data) -> [Data] {
        guard !chunk.isEmpty else { return [] }
        partial.append(chunk)

        var lines: [Data] = []
        while let newlineIndex = partial.firstIndex(of: Self.newline) {
            let line = partial.subdata(in: partial.startIndex..<newlineIndex)
            partial.removeSubrange(partial.startIndex...newlineIndex)
            if !line.isEmpty { lines.append(line) }
        }
        return lines
    }

    /// Returns the unterminated tail at stream end (a final line the writer
    /// never newline-terminated), or nil when nothing is pending. Resets.
    mutating func flush() -> Data? {
        defer { partial = Data() }
        return partial.isEmpty ? nil : partial
    }
}
