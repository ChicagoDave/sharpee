// IRTreeState.swift
// The last-ok-IR retention state machine behind the project tree (ADR-258 D6):
// Chord's load is atomic (a failed compile yields no IR), and source under active
// editing is un-ok most of the time — so the tree keeps rendering the most recent
// ok IR, marked stale, while Problems tracks the current source. A story that has
// never compiled cleanly shows an empty tree with a stated reason. Pure and
// unit-testable; MainWindow feeds it compose outcomes and renders `display`.
// Public interface: IRTreeState.apply(_:), display, storyURL.
// Owner context: tools/ide — Compose.

import Foundation

struct IRTreeState {

    /// What the tree view should render.
    enum Display: Equatable {
        /// No IR to show — with the reason stated in the pane.
        case empty(reason: String)
        /// Render `ir`'s structure; `stale` marks a retained IR whose source has
        /// since failed to compile.
        case populated(ir: ComposeStoryIR, stale: Bool)
    }

    /// The story the retained IR (or empty state) belongs to.
    private(set) var storyURL: URL?
    private var ir: ComposeStoryIR?
    private var isStale = false

    static let neverCompiledReason =
        "Story hasn't compiled cleanly yet — fix the problems to populate the tree"

    var display: Display {
        guard let ir else { return .empty(reason: Self.neverCompiledReason) }
        return .populated(ir: ir, stale: isStale)
    }

    /// Folds one compose outcome into the retained state:
    /// - success with IR → adopt it (un-stales),
    /// - failed compile / pipeline failure for the SAME story → retain, mark stale,
    /// - anything for a DIFFERENT story → that story's state starts fresh
    ///   (a retained IR never masquerades as another file's structure).
    mutating func apply(_ outcome: ComposeScheduler.Outcome) {
        if case .success(let payload) = outcome.result, let newIR = payload.ir {
            storyURL = outcome.storyURL
            ir = newIR
            isStale = false
            return
        }
        if outcome.storyURL == storyURL {
            if ir != nil { isStale = true }
        } else {
            storyURL = outcome.storyURL
            ir = nil
            isStale = false
        }
    }
}
