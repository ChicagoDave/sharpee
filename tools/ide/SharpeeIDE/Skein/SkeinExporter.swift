// SkeinExporter.swift
// "Save thread as test" (ADR-299 D7): a thread the author has blessed becomes
// an ADR-294 golden transcript in the project's existing test folders. This is
// the ONE door out of the skein into the test suite, and it is always an
// explicit author act — the skein never silently mints tests, and the test-side
// contract is unchanged (runners consume transcripts and never learn what a
// skein is).
//
// No new serialization: the source is emitted through
// `RecordingSession.serialize(_:title:openingTurn:headerFields:)`, the one home
// of the ADR-282 grammar that `ReplayDriver` also synthesizes through. The
// mapping is the whole of this file's own logic — a blessed node becomes a
// verbatim `[OK]` assertion of the text the author vouched for, an unblessed
// one keeps the `[SKIP]` draft, and the thread's pinned seed and joined forcing
// annotations ride the ADR-294 header block.
// Public interface: SkeinExporter.transcriptSource(document:toNodeId:title:),
// write(document:toNodeId:title:to:), defaultFilename(document:toNodeId:),
// canExport(document:toNodeId:), ExportError.
// Owner context: tools/ide — Skein (export). UI-free; safe to unit-test.

import Foundation

/// Main-actor isolated because the two collaborators it must not duplicate —
/// `RecordingSession`'s serializer and `ReplayDriver`'s forcing join — are.
/// Re-implementing either to stay nonisolated would be a second copy of a
/// grammar, which is the one thing this file exists to avoid.
@MainActor
enum SkeinExporter {

    /// Why a thread could not be minted as a test.
    enum ExportError: Error, LocalizedError, Equatable {

        /// The document has no node with the requested id.
        case unknownNode(String)

        /// Nothing on the thread was blessed. Every turn would carry `[SKIP]`,
        /// which deliberately asserts nothing — the ADR-282 refusal, carried
        /// forward: a file that looks like a test and tests nothing is worse
        /// than no file.
        case noBlessings

        /// Two nodes on the thread force the same `point[#occurrence]` key.
        /// The runner rejects duplicate force keys as a load error (ADR-293
        /// D9), so the export refuses rather than writing a transcript that
        /// cannot be run.
        case duplicateForcing(key: String)

        var errorDescription: String? {
            switch self {
            case .unknownNode(let id):
                return "That thread is no longer in the skein (\(id))."
            case .noBlessings:
                return "A test with no assertions of the author's is not a test."
            case .duplicateForcing(let key):
                return "This thread forces \"\(key)\" more than once — "
                    + "each choice point occurrence can carry one forcing."
            }
        }

        var recoverySuggestion: String? {
            switch self {
            case .noBlessings:
                return "Bless at least one turn in the Transcript view to say what "
                    + "this test is checking, then save again."
            case .unknownNode, .duplicateForcing:
                return nil
            }
        }
    }

    /// Whether the thread ending at `nodeId` can be minted right now — what the
    /// Save action's enablement reads, so the refusal is visible as a disabled
    /// button rather than only as an error after the save panel.
    static func canExport(document: SkeinDocument, toNodeId nodeId: String) -> Bool {
        guard let thread = document.thread(to: nodeId) else { return false }
        return thread.nodes.contains { $0.blessing != nil }
    }

    /// The thread as ADR-294 golden transcript source.
    ///
    /// The root is not a turn — it is the story-start position, and the
    /// serializer's own opening `[SKIP]`'d `look` is what absorbs the banner
    /// (the same alignment `ReplayDriver` depends on for byte-identity).
    ///
    /// - Parameters:
    ///   - document: the skein; its pinned seed becomes the `seed:` header (D5),
    ///     so the exported test runs at the randomness the thread was blessed at.
    ///   - nodeId: the thread's terminal node.
    ///   - title: the transcript's `title:` header.
    /// - Returns: the transcript source.
    /// - Throws: `ExportError`.
    static func transcriptSource(document: SkeinDocument,
                                 toNodeId nodeId: String,
                                 title: String) throws -> String {
        guard let thread = document.thread(to: nodeId) else {
            throw ExportError.unknownNode(nodeId)
        }
        guard thread.nodes.contains(where: { $0.blessing != nil }) else {
            throw ExportError.noBlessings
        }

        var headerFields = ["seed: \(document.seed)"]
        let joined: [String]
        do {
            joined = try ReplayDriver.forcings(along: thread)
        } catch ReplayDriver.ReplayError.duplicateForcing(let key) {
            // Re-stated as an export refusal: a caller minting a test should
            // not have to catch a replay's error to learn why.
            throw ExportError.duplicateForcing(key: key)
        }
        if !joined.isEmpty {
            headerFields.append("forces: \(joined.joined(separator: ", "))")
        }

        let turns = thread.nodes
            .filter { !$0.command.isEmpty }
            .map(turn(for:))
        return RecordingSession.serialize(turns,
                                          title: title,
                                          openingTurn: true,
                                          headerFields: headerFields)
    }

    /// One node as a recorded turn.
    ///
    /// A blessing asserts VERBATIM — the skein stores the whole output the
    /// author approved, never a selected fragment, so there is no
    /// `[OK: contains]` case to reach here. The response carried is the blessed
    /// text rather than the node's stored capture: if the two have diverged,
    /// the blessing is what the author vouched for and the test must assert
    /// that, not whatever the story last happened to print.
    private static func turn(for node: SkeinNode) -> RecordedTurn {
        guard let blessing = node.blessing else {
            return RecordedTurn(command: node.command, response: node.output)
        }
        return RecordedTurn(command: node.command,
                            response: blessing.output,
                            verdict: .blessed)
    }

    /// Writes the thread's transcript to `url`, creating its folder.
    ///
    /// - Returns: the file written.
    /// - Throws: `ExportError`, or any write error.
    @discardableResult
    static func write(document: SkeinDocument,
                      toNodeId nodeId: String,
                      title: String,
                      to url: URL) throws -> URL {
        let source = try transcriptSource(document: document, toNodeId: nodeId, title: title)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(),
                                                withIntermediateDirectories: true)
        try source.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// The filename the save panel offers: the author's own tag for the thread
    /// when they gave it one (D2), else the terminal command — both are what
    /// they call this thread, and neither is a node id.
    static func defaultFilename(document: SkeinDocument, toNodeId nodeId: String) -> String {
        let node = document.node(withId: nodeId)
        let name = node?.tags.first ?? node?.command ?? "thread"
        let slug = slug(from: name)
        return "\(slug.isEmpty ? "thread" : slug).transcript"
    }

    /// A filename-safe form of author-typed text: lowercase, words joined by
    /// hyphens, anything else dropped.
    private static func slug(from text: String) -> String {
        let allowed = CharacterSet.alphanumerics
        return text.lowercased()
            .components(separatedBy: allowed.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "-")
    }
}
