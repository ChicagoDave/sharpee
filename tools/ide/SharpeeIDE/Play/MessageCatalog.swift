// MessageCatalog.swift
// The platform's overridable standard-action messages — each with the ADR-255
// alias a story writes in an `override message` block and the language pack's
// current template — as `sharpee messages` emits them (ADR-333 D4a; the wire
// contract is @sharpee/ide-protocol's MessageCatalog). Play-to-write reads it
// so a ⌘-click on a platform-rendered paragraph can open a new override
// pre-filled with the pack's own text. Fetched once per project through the
// toolchain and cached; the Swift side of the contract is version-gated.
// Public interface: MessageCatalog, MessageCatalog.decode(from:), entry(forId:),
// MessageCatalogFetcher.fetch(near:completion:), fetch(executable:arguments:…).
// Owner context: tools/ide — Play.

import Foundation

/// The catalog as decoded from `sharpee messages`.
struct MessageCatalog: Codable, Equatable, Sendable {
    /// Mirrors `MESSAGE_CATALOG_SCHEMA_VERSION` in @sharpee/ide-protocol.
    static let currentSchemaVersion = 1

    let schemaVersion: Int
    /// The pack's locale (`en-US`).
    let locale: String
    let messages: [Entry]

    /// One overridable platform message.
    struct Entry: Codable, Equatable, Sendable {
        /// The dotted id the engine renders (`if.action.taking.taken`).
        let id: String
        /// The ADR-255 alias a story writes (`taking-taken`).
        let alias: String
        /// The pack's raw template for the id.
        let template: String
    }

    /// A payload rejected at decode time.
    enum DecodeError: Error, Equatable {
        /// The payload's `schemaVersion` is not the one this IDE was written
        /// against — the "IDE is out of date for this toolchain" state.
        case schemaVersionMismatch(found: Int, expected: Int)
    }

    /// Decode `sharpee messages` stdout, enforcing the version gate BEFORE
    /// shape decoding so a future-version payload reports the mismatch, never
    /// a partial decode.
    /// - Throws: `DecodeError.schemaVersionMismatch`, or a `DecodingError`.
    static func decode(from data: Data) throws -> MessageCatalog {
        struct VersionProbe: Codable { let schemaVersion: Int }
        let probe = try JSONDecoder().decode(VersionProbe.self, from: data)
        guard probe.schemaVersion == currentSchemaVersion else {
            throw DecodeError.schemaVersionMismatch(found: probe.schemaVersion,
                                                    expected: currentSchemaVersion)
        }
        return try JSONDecoder().decode(MessageCatalog.self, from: data)
    }

    /// The entry for a platform message id, or nil when the id is not overridable.
    func entry(forId id: String) -> Entry? {
        messages.first { $0.id == id }
    }
}

/// Runs `sharpee messages` and decodes the catalog.
@MainActor
final class MessageCatalogFetcher {

    typealias Completion = (Result<MessageCatalog, ComposeRunner.Failure>) -> Void

    private let runner = ComposeRunner()

    /// Production entry point: the resolved `sharpee` (the same tiers compose
    /// uses — workspace shim, PATH, bundled toolchain), run beside the story.
    func fetch(near storyFile: URL, completion: @escaping Completion) {
        guard let sharpee = ComposeRunner.resolveSharpee(near: storyFile) else {
            completion(.failure(.sharpeeNotFound))
            return
        }
        fetch(executable: sharpee, arguments: ["messages"],
              workingDirectory: storyFile.deletingLastPathComponent(), completion: completion)
    }

    /// The general form — tests drive it with the real devkit CLI.
    func fetch(executable: URL, arguments: [String], workingDirectory: URL,
               completion: @escaping Completion) {
        runner.runProcess(executable: executable, arguments: arguments,
                          workingDirectory: workingDirectory,
                          environment: ShellEnvironment.buildEnvironment()) { result in
            completion(result.flatMap { output in
                guard output.exited, output.code == 0 else {
                    return .failure(.nonZeroExit(code: output.code, stderr: output.stderr))
                }
                do {
                    return .success(try MessageCatalog.decode(from: output.stdout))
                } catch {
                    return .failure(.decode(error))
                }
            })
        }
    }
}
