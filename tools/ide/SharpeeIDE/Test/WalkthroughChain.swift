// WalkthroughChain.swift
// Names and places the transcripts a checkpointed play session saves as
// (ADR-282 D4). `walkthroughs/` IS the chain — filename sort, no manifest
// (ADR-277 D3) — so segments are named `wt-NN-<slug>.transcript` and numbered
// after the highest `wt-NN-*` already present: a recorded chain APPENDS to the
// story's chain rather than interleaving with it.
//
// Pure naming and placement, no file writing and no AppKit, so the save flow's
// question ("append after what is here, or replace it?") is answered by
// something tests can drive directly.
//
// Public interface: directoryName, transcripts(in:), number(of:),
// highestNumber(in:), strays(in:), slug(from:), fileName(number:slug:),
// plan(segmentCount:slug:in:mode:), ChainSaveMode, ChainPlan.
// Owner context: tools/ide — Test (recording).

import Foundation

/// How a recorded chain meets the transcripts already in `walkthroughs/`.
enum ChainSaveMode: Equatable {
    /// Number the new segments after the highest `wt-NN-*` present (D4's
    /// default — a recorded chain appends).
    case append
    /// This session IS the chain: clear the transcripts already there and
    /// number from `wt-01`. Only ever reached through an explicit choice in the
    /// save flow, never implicitly (D4).
    case replace
}

/// Where a chain save will write, and what it will clear first.
struct ChainPlan: Equatable {
    /// One destination per segment, in play order.
    let files: [URL]
    /// Transcripts this save removes before writing. Empty for `.append`.
    let removing: [URL]
}

enum WalkthroughChain {

    /// ADR-280's Walkthroughs group is this literal top-level directory name;
    /// saving anywhere else leaves the chain invisible in the sidebar.
    static let directoryName = "walkthroughs"

    private static let fileExtension = "transcript"

    /// Transcripts directly in `directory`, in filename order — which is the
    /// chain's run order (ADR-277 D3). Missing directory reads as empty.
    ///
    /// - Parameter directory: the story's `walkthroughs/`.
    /// - Returns: `.transcript` files, sorted by name; subdirectories and other
    ///   file types ignored.
    static func transcripts(in directory: URL) -> [URL] {
        let contents = (try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.isRegularFileKey],
            options: [.skipsHiddenFiles])) ?? []
        return contents
            .filter { $0.pathExtension == fileExtension }
            .filter { (try? $0.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
    }

    /// The chain number a filename claims, or nil when it claims none.
    ///
    /// Deliberately strict about the two-digit zero-padded form: filename sort
    /// IS the run order, and `wt-9-…` sorts after `wt-10-…`. A file that does
    /// not sort correctly is not part of the chain's numbering — it is a stray,
    /// and the save flow says so rather than quietly renumbering around it.
    ///
    /// Chains past `wt-99` are out of scope (D4): a hypothetical `wt-100-…`
    /// reads as a stray here, which is the loud failure rather than the silent
    /// one.
    ///
    /// - Parameter url: a file in the walkthroughs directory.
    /// - Returns: the two-digit number, or nil for any other name.
    static func number(of url: URL) -> Int? {
        let name = url.lastPathComponent
        guard url.pathExtension == fileExtension else { return nil }
        let parts = name.split(separator: "-", maxSplits: 2, omittingEmptySubsequences: false)
        guard parts.count == 3, parts[0] == "wt", parts[1].count == 2,
              let number = Int(parts[1]), parts[1].allSatisfy(\.isNumber),
              !parts[2].isEmpty else { return nil }
        return number
    }

    /// The highest chain number already present, or nil when the directory
    /// holds no `wt-NN-*` transcripts at all.
    static func highestNumber(in directory: URL) -> Int? {
        transcripts(in: directory).compactMap(number(of:)).max()
    }

    /// Transcripts in the directory that carry no chain number.
    ///
    /// These matter because the directory IS the chain: a stray runs in it,
    /// in whatever position its filename sorts to, so appending numbered
    /// segments beside one interleaves the two. The save flow warns rather than
    /// deciding for the author (D4).
    static func strays(in directory: URL) -> [URL] {
        transcripts(in: directory).filter { number(of: $0) == nil }
    }

    /// What the save flow must tell the author about `strays` before writing.
    ///
    /// - Parameter strays: transcripts in the chain directory carrying no chain
    ///   number (see `strays(in:)`).
    /// - Returns: the warning text, or nil when the directory is clean — the
    ///   nil case is also the save flow's signal that replace need not be
    ///   offered at all.
    static func warning(strays: [URL]) -> String? {
        guard !strays.isEmpty else { return nil }
        let names = strays.map(\.lastPathComponent).joined(separator: ", ")
        return """
        \(directoryName)/ already holds \(strays.count == 1 ? "a transcript" : "\(strays.count) transcripts") \
        outside the wt-NN naming: \(names).

        The directory IS the chain, so these run in it wherever their filenames sort — \
        appending numbered segments beside them interleaves the two. Replace the chain to \
        write this session as wt-01 onward instead, clearing what is there.
        """
    }

    /// A filename-safe slug for `title`.
    ///
    /// - Parameter title: whatever the author named the chain.
    /// - Returns: lowercase alphanumerics and hyphens, never empty (falls back
    ///   to `recorded`, so a chain always has a name to sort under).
    static func slug(from title: String) -> String {
        let mapped = title.lowercased().map { character -> Character in
            character.isLetter || character.isNumber ? character : "-"
        }
        let collapsed = String(mapped)
            .split(separator: "-", omittingEmptySubsequences: true)
            .joined(separator: "-")
        return collapsed.isEmpty ? "recorded" : collapsed
    }

    /// One segment's filename: `wt-NN-<slug>.transcript`, zero-padded to two
    /// digits so filename sort is run order.
    static func fileName(number: Int, slug: String) -> String {
        String(format: "wt-%02d-%@.%@", number, slug, fileExtension)
    }

    /// Where each segment of a save will land, and what it clears first.
    ///
    /// - Parameters:
    ///   - segmentCount: how many transcripts the session splits into.
    ///   - slug: the chain's name, already slugged.
    ///   - directory: the story's `walkthroughs/` (need not exist yet).
    ///   - mode: append after what is present, or replace it.
    /// - Returns: destinations in play order, plus the files a `.replace` will
    ///   remove (empty for `.append`).
    static func plan(segmentCount: Int,
                     slug: String,
                     in directory: URL,
                     mode: ChainSaveMode) -> ChainPlan {
        let existing = transcripts(in: directory)
        let start: Int
        let removing: [URL]
        switch mode {
        case .append:
            start = (existing.compactMap(number(of:)).max() ?? 0) + 1
            removing = []
        case .replace:
            start = 1
            // Everything the runner would pick up, strays included — a replace
            // that left a stray behind would still interleave, which is the
            // thing the author chose replace to avoid.
            removing = existing
        }
        let files = (0..<max(0, segmentCount)).map { offset in
            directory.appendingPathComponent(fileName(number: start + offset, slug: slug))
        }
        return ChainPlan(files: files, removing: removing)
    }
}
