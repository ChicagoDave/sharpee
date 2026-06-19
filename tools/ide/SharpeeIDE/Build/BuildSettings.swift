// BuildSettings.swift
// The per-project build options the IDE passes to `./sharpee build` (ADR-180):
// which story, which clients, and an optional package to resume the platform build from.
// Public interface: BuildSettings (value type) + toArguments().
// Owner context: tools/ide — Build.

import Foundation

/// Build options for a single project. Persisted per-project by `BuildSettingsStore`.
/// Maps directly onto the `./sharpee build` argument surface — there is no theme here
/// (themes are a runtime/browser-client concern, not a build flag, per ADR-180).
struct BuildSettings: Codable, Equatable {

    /// Client identifiers — each maps to a `./sharpee build` flag.
    static let browserClient = "browser"
    static let zifmiaClient = "zifmia"

    /// Selected story name (the positional `<story>` arg). Nil = none chosen yet;
    /// the build action requires a story before it can run.
    var story: String?

    /// Selected clients. `browserClient` → `--browser`, `zifmiaClient` → `--zifmia`.
    /// Empty = build the platform + bundle only.
    var clients: Set<String>

    /// Package short-name to resume the platform build from (`--skip <pkg>`). Nil = none.
    var skipFrom: String?

    /// Defaults: no story selected, browser client only, no skip.
    static let `default` = BuildSettings(story: nil, clients: [browserClient], skipFrom: nil)

    /// The argument vector passed to `./sharpee build` **after** the `build` subcommand
    /// (the runner prepends `"build"`). Stable order — positional story first, then
    /// `--browser`, `--zifmia`, `--skip <pkg>` — so the command is deterministic.
    /// Empty/whitespace story and skip values are omitted.
    func toArguments() -> [String] {
        var args: [String] = []
        if let story, !story.isEmpty { args.append(story) }
        if clients.contains(Self.browserClient) { args.append("--browser") }
        if clients.contains(Self.zifmiaClient) { args.append("--zifmia") }
        if let skipFrom, !skipFrom.isEmpty { args.append(contentsOf: ["--skip", skipFrom]) }
        return args
    }
}
