// StoryConfig.swift
// The tool-owned story config sidecar (ADR-309) — Chord Writer's half of a
// behavior devkit implements identically in `story-config.ts`. The schema is
// a WIRE CONTRACT between the two hosts: a story created on the CLI and opened
// here (or the reverse) must read as one story, so the shape here and there
// move together or not at all.
//
// `{story-name}.config.json` beside the `.story` file is CANON (D1): the
// header's `ifid:` line is the tool's rendering of the config value, never an
// input. Reconciliation happens on SAVE (D3, David's Q-1 ruling) — the one
// moment that is both prompt and expected, so live typing is never fought.
// Public interface: StoryConfig, StoryConfigStore.{path(for:),read(at:),
//   write(_:to:),mint(for:)}, StoryIdentity.reconcile(source:storyURL:).
// Owner context: tools/ide — Workspace.

import Foundation

/// The config sidecar's contents. Minimal by ruling — designed-open, but no
/// speculative fields until a real second setting arrives.
struct StoryConfig: Equatable {

    /// Schema version this tool writes; a reader refuses anything else.
    static let currentVersion = 1

    let version: Int
    /// The story's Treaty of Babel identifier (ADR-074), stored verbatim.
    /// Deliberately NOT format-validated: legacy (pre-UUID) IFIDs are valid
    /// Treaty identities, and identity preservation outranks format hygiene.
    let ifid: String

    init(ifid: String, version: Int = StoryConfig.currentVersion) {
        self.version = version
        self.ifid = ifid
    }
}

/// Reading and writing the sidecar. Absence and breakage are different states:
/// ABSENT triggers adoption or minting (D2); BROKEN stops reconciliation (D5).
enum StoryConfigStore {

    /// What a config path holds.
    enum ReadResult: Equatable {
        case absent
        case ok(StoryConfig)
        /// Exists but cannot serve as identity — reported, never guessed over.
        case broken(String)
    }

    /// `harbor.story` → `harbor.config.json` beside it (the tests.json precedent).
    static func path(for storyURL: URL) -> URL {
        storyURL.deletingPathExtension().appendingPathExtension("config.json")
    }

    /// Read without guessing. Malformed JSON, a non-object, an unknown version,
    /// or a missing/empty `ifid` are all BROKEN — distinct from ABSENT.
    static func read(at url: URL) -> ReadResult {
        guard FileManager.default.fileExists(atPath: url.path) else { return .absent }
        guard let data = try? Data(contentsOf: url) else { return .broken("unreadable") }
        guard let parsed = try? JSONSerialization.jsonObject(with: data) else {
            return .broken("not valid JSON")
        }
        guard let object = parsed as? [String: Any] else { return .broken("not a JSON object") }
        guard let version = object["version"] as? Int, version == StoryConfig.currentVersion else {
            let found = object["version"].map { "\($0)" } ?? "none"
            return .broken("unknown version \(found) (this tool reads version \(StoryConfig.currentVersion))")
        }
        guard let ifid = (object["ifid"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
              !ifid.isEmpty else {
            return .broken("carries no usable `ifid`")
        }
        return .ok(StoryConfig(ifid: ifid))
    }

    /// Write deterministically — 2-space indent, keys sorted, trailing newline
    /// — BYTE-IDENTICAL to devkit's `writeStoryConfig`.
    ///
    /// Assembled by hand rather than through `JSONSerialization.prettyPrinted`,
    /// which writes `"key" : value` (a space before the colon) where
    /// `JSON.stringify` writes `"key": value`. The two hosts write the same
    /// story's identity file; a formatting difference between them would show
    /// up as a diff in an author's repository every time the story changed
    /// hands. The value still goes through the encoder, so any IFID escapes
    /// exactly as JSON requires.
    static func write(_ config: StoryConfig, to url: URL) throws {
        let text = """
        {
          "ifid": \(try jsonQuoted(config.ifid)),
          "version": \(config.version)
        }

        """
        try text.write(to: url, atomically: true, encoding: .utf8)
    }

    /// A string as a JSON scalar, quoted and escaped by the encoder.
    private static func jsonQuoted(_ value: String) throws -> String {
        let data = try JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])
        return String(decoding: data, as: UTF8.self)
    }

    /// Mint a fresh identity into a new config beside `storyURL` (D2's birth moment).
    @discardableResult
    static func mint(for storyURL: URL, ifid: String = StoryHeaderIFID.mint()) throws -> StoryConfig {
        let config = StoryConfig(ifid: ifid)
        try write(config, to: path(for: storyURL))
        return config
    }
}

/// The reconciliation policy: what a story's source must say, given its config.
enum StoryIdentity {

    /// What reconciliation did to a story's source and its config.
    struct Outcome: Equatable {
        /// The source after reconciliation — unchanged when nothing was needed.
        let source: String
        /// The story's identity, or nil when the config is broken (D5) or the
        /// source carries no `story` block to hold the line.
        let ifid: String?
        /// True when `source` differs from the input (line inserted or overwritten).
        let sourceChanged: Bool
        /// Set when this call created the config: adopted from the header, or minted.
        let configCreated: Created?
        /// Non-nil when the config exists but cannot serve as identity — the
        /// save proceeds untouched and the Problems panel names it (see below).
        let brokenConfig: String?

        enum Created: Equatable { case adopted, minted }
    }

    /// Reconcile a story's source to its config sidecar — Chord Writer's save
    /// moment (D3), the twin of devkit's `reconcileHeader`.
    ///
    /// - BROKEN config → the source is returned UNTOUCHED with `brokenConfig`
    ///   set: no mint, no reconcile, and — critically — the caller still saves
    ///   the author's text. Refusing to write someone's work over a sidecar
    ///   problem would be a worse failure than the one being reported; the
    ///   Problems panel carries the diagnostic (compose emits
    ///   `story-config.broken` on every on-disk compose of the real file).
    /// - ABSENT config → adoption (D2): the header's existing value is recorded
    ///   verbatim into a new config; a header with none mints once.
    /// - PRESENT config → the header line is rendered from it: inserted after
    ///   `id:` when missing, overwritten in place when diverged, untouched when
    ///   already consistent. The config's bytes are never rewritten here.
    ///
    /// - Parameters:
    ///   - source: the story text about to be written.
    ///   - storyURL: where it is being written (locates the sidecar).
    /// - Returns: the source to write and what happened.
    static func reconcile(source: String, storyURL: URL) -> Outcome {
        let configURL = StoryConfigStore.path(for: storyURL)

        var ifid: String
        var created: Outcome.Created?
        switch StoryConfigStore.read(at: configURL) {
        case .broken(let message):
            return Outcome(source: source, ifid: nil, sourceChanged: false,
                           configCreated: nil, brokenConfig: message)
        case .ok(let config):
            ifid = config.ifid
        case .absent:
            if let existing = StoryHeaderIFID.read(from: source) {
                // Adoption: recording existing identity, not author choice (D2).
                ifid = existing
                created = .adopted
            } else {
                guard StoryHeaderIFID.hasStoryBlock(source) else {
                    // A grammar file or a fragment: nothing to carry a header
                    // line, so nothing to mint an identity for.
                    return Outcome(source: source, ifid: nil, sourceChanged: false,
                                   configCreated: nil, brokenConfig: nil)
                }
                ifid = StoryHeaderIFID.mint()
                created = .minted
            }
            // A failed config write must not silently proceed to rewrite the
            // header: that would put an identity in the source with no canonical
            // home, exactly the loss this ADR prevents.
            guard (try? StoryConfigStore.write(StoryConfig(ifid: ifid), to: configURL)) != nil else {
                return Outcome(source: source, ifid: nil, sourceChanged: false,
                               configCreated: nil,
                               brokenConfig: "could not write \(configURL.lastPathComponent)")
            }
        }

        guard let edit = StoryHeaderIFID.edit(setting: ifid, in: source) else {
            return Outcome(source: source, ifid: ifid, sourceChanged: false,
                           configCreated: created, brokenConfig: nil)
        }
        let rewritten = StoryHeaderIFID.apply(edit, to: source)
        return Outcome(source: rewritten, ifid: ifid, sourceChanged: rewritten != source,
                       configCreated: created, brokenConfig: nil)
    }
}
