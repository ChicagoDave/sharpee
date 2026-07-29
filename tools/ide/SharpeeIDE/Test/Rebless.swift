// Rebless.swift
// ADR-282 D2's drift lifecycle: when a verbatim bless later fails because the
// story's prose was reworded, the author re-blesses — the assertion keeps
// saying "this response, verbatim" and only the text it names is updated. This
// is the pure half: locating the blessed literal block a failed command owns,
// and rewriting its content. No file I/O and no AppKit, so the rules are driven
// by tests directly rather than through a save.
//
// Re-bless deliberately covers the VERBATIM bless only. `[OK: contains]` is a
// narrower claim the author made on purpose, and overwriting its fragment with
// the whole new response would silently widen it — the weakening D2 forbids.
//
// The block grammar mirrored here (`text` / `end text`, column 0, trailing
// whitespace forgiven) is ADR-287's, owned by `packages/transcript-tester`'s
// parser. The TS↔Swift boundary precludes importing it, so this is a mirror in
// the same sense TestResultRecord.swift mirrors the wire contract, pinned by
// tests that run the real parser over what this writes.
//
// Public interface: Rebless.locate(in:commandLine:), Rebless.rewrite(source:
// commandLine:actual:), Rebless.BlessedBlock, Rebless.Failure.
// Owner context: tools/ide — Test.

import Foundation

enum Rebless {

    /// A verbatim bless's literal block, located in a transcript's source.
    struct BlessedBlock: Equatable {
        /// The block's content, exactly as stored — the "old" side of the
        /// failure view's old-vs-new.
        let content: String
        /// 0-based index of the `text` opener.
        let openIndex: Int
        /// 0-based index of the `end text` close.
        let closeIndex: Int
    }

    /// Why a re-bless could not be applied.
    ///
    /// Each case is a refusal the author can act on, not an internal error:
    /// the failure view shows the reason instead of offering a button that
    /// would do the wrong thing.
    enum Failure: LocalizedError, Equatable {

        /// The named line is out of range or is not a `> command` line — the
        /// transcript changed since the run that reported this failure.
        case noCommandAtLine(Int)

        /// The command asserts something other than a verbatim bless.
        case notAVerbatimBless

        /// A `text` opener with no `end text` before end of file.
        case unclosedBlock

        /// The story's new output contains `end text` at column 0.
        case reservedInActualOutput

        /// The result carries no captured text to bless.
        ///
        /// Either the command passed — `actualOutput` rides failures only — or
        /// the toolchain that produced the record predates the field. Both are
        /// states the panel can be in, so neither is an error to log.
        case noCapturedOutput

        /// The story now prints nothing for this command.
        ///
        /// The same rule that gives a blank turn no bless affordance in the
        /// Play pane (D2): blank output is a runner-level failure regardless of
        /// assertion, so re-blessing one would write a test that cannot pass.
        /// The command is broken, not the assertion.
        case blankActualOutput

        var errorDescription: String? {
            switch self {
            case .noCommandAtLine(let line):
                return "No command on line \(line) — the transcript changed since this run."
            case .notAVerbatimBless:
                return "Only a verbatim bless can be re-blessed."
            case .unclosedBlock:
                return "The blessed text block is never closed by an \"end text\" line."
            case .reservedInActualOutput:
                return "The story's new text contains a line reading \"end text\", which is reserved."
            case .noCapturedOutput:
                return "This result carries no captured text to bless."
            case .blankActualOutput:
                return "This command now prints nothing, so there is nothing to bless."
            }
        }

        var recoverySuggestion: String? {
            switch self {
            case .noCommandAtLine:
                return "Re-run the tests so the failure points at the current file."
            case .notAVerbatimBless:
                return "A [OK: contains] assertion names a fragment you chose. "
                    + "Edit it by hand, or record and bless the turn again."
            case .unclosedBlock:
                return "Add the closing \"end text\" line, then re-run."
            case .reservedInActualOutput:
                return "Reword that line in the story — \"end text\" at the start of a line "
                    + "closes a text block and has no escape."
            case .noCapturedOutput:
                return "Re-run the tests with a toolchain that reports actual output."
            case .blankActualOutput:
                return "Fix the command in the story so it responds, then re-run."
            }
        }
    }

    // MARK: - Grammar (mirrors packages/transcript-tester/src/parser.ts)

    private static let blockOpen = "text"
    private static let blockClose = "end text"

    /// Is this line a block delimiter? Column 0, trailing whitespace forgiven —
    /// the parser's exact rule, so a line this side accepts is one that side
    /// accepts.
    private static func isBlockLine(_ line: String, _ keyword: String) -> Bool {
        var trimmed = Substring(line)
        while let last = trimmed.last, last.isWhitespace { trimmed.removeLast() }
        return trimmed == keyword
    }

    // MARK: - Locating

    /// The verbatim bless owned by the command at `commandLine`.
    ///
    /// The command's stanza runs from its `> ` line to the next one (or end of
    /// file); within it, the bless is an `[OK]` assertion whose IMMEDIATELY
    /// following line opens a block — ADR-287 D1's attachment rule, where a
    /// blank line detaches. Scoping to the stanza is what keeps a re-bless from
    /// reaching into a neighbouring command's block when this one has none.
    ///
    /// - Parameters:
    ///   - lines: the transcript's source, split on newlines.
    ///   - commandLine: the failed command's 1-based source line, as the
    ///     `command-result` record reports it.
    /// - Returns: the located block.
    /// - Throws: `Failure` when the line names no command, the command carries
    ///   no verbatim bless, or its block is unclosed.
    static func locate(in lines: [String], commandLine: Int) throws -> BlessedBlock {
        let start = commandLine - 1
        guard lines.indices.contains(start),
              lines[start].trimmingCharacters(in: .whitespaces).hasPrefix(">") else {
            throw Failure.noCommandAtLine(commandLine)
        }

        var index = start + 1
        while index < lines.count {
            let trimmed = lines[index].trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix(">") { break }        // the next command's stanza
            if trimmed == "[OK]", index + 1 < lines.count,
               isBlockLine(lines[index + 1], blockOpen) {
                return try read(lines, openIndex: index + 1)
            }
            index += 1
        }
        throw Failure.notAVerbatimBless
    }

    /// Read the block opened at `openIndex` through its `end text`.
    private static func read(_ lines: [String], openIndex: Int) throws -> BlessedBlock {
        var content: [String] = []
        var index = openIndex + 1
        while index < lines.count {
            if isBlockLine(lines[index], blockClose) {
                return BlessedBlock(content: content.joined(separator: "\n"),
                                    openIndex: openIndex,
                                    closeIndex: index)
            }
            content.append(lines[index])
            index += 1
        }
        throw Failure.unclosedBlock
    }

    // MARK: - Rewriting

    /// Replace a verbatim bless's block content with what the story now prints.
    ///
    /// Only the content lines move. The `[OK]`, the delimiters (including their
    /// own trailing whitespace), every other command, and the file's trailing
    /// newline are preserved byte for byte — a re-bless is an edit to one
    /// assertion's text, and an author who diffs the file should see exactly
    /// that.
    ///
    /// - Parameters:
    ///   - source: the transcript file's full contents.
    ///   - commandLine: the failed command's 1-based source line.
    ///   - actual: what the story printed, as the wire reported it.
    /// - Returns: the rewritten source.
    /// - Throws: `Failure` — the `actual`-side refusals are checked BEFORE any
    ///   rewriting, so a refusal never leaves a half-written assertion behind.
    static func rewrite(source: String, commandLine: Int, actual: String) throws -> String {
        var lines = source.components(separatedBy: "\n")
        let replacement = actual.components(separatedBy: "\n")
        guard !actual.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw Failure.blankActualOutput
        }
        guard !replacement.contains(where: { isBlockLine($0, blockClose) }) else {
            throw Failure.reservedInActualOutput
        }
        let block = try locate(in: lines, commandLine: commandLine)
        lines.replaceSubrange((block.openIndex + 1)..<block.closeIndex, with: replacement)
        return lines.joined(separator: "\n")
    }
}
