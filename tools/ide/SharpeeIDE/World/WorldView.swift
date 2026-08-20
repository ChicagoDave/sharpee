// WorldView.swift
// The World tab's content (ADR-321 D8): a section strip over the three views the
// analyzer derives — Map, Reach, Incomplete — and, when there is no analysis, the
// explanatory state that says why.
//
// A SIBLING OF INDEX, NOT PART OF IT. Index enumerates what the story declares;
// World analyses it. Both are projections of the same IR and neither is a Testing
// view — nothing here models a test suite, and every finding holds with zero
// tests written.
//
// FAILURE IS CONTENT (AC-9). A missing IR, a malformed one, an analyzer that
// could not be run: each renders as a sentence naming the cause. The tab never
// goes blank and never crashes, because "nothing rendered" is indistinguishable
// from "your story is fine", which is the worst thing this surface could say.
// The derivation runs off the main actor and the tab says so while it does: `showLoading()`
// is the state between a build finishing and its analysis arriving. It is deliberately a
// state of its own rather than a stale render — showing the previous story's map under the
// new story's name is the same lie the empty state exists to avoid.
// Public interface: WorldView.show(_:), showEmpty(reason:), showLoading(), onActivate,
// isLoading.
// Owner context: tools/ide — World.

import AppKit

final class WorldView: NSView {

    /// The section strip's three views, in display order.
    private enum Section: Int, CaseIterable {
        case map, reach, incomplete
    }

    /// Invoked when a finding is double-clicked — see `WorldFindingDestination`.
    var onActivate: ((WorldFindingDestination) -> Void)?

    /// Invoked when the author accepts a card's offer to change the story source.
    ///
    /// The tab knows what the author asked for; the WINDOW owns the editor and applies
    /// it, so an accepted offer lands as an ordinary undoable typing edit.
    var onEdit: ((WorldCandidateAction, WorldFindingRow) -> Void)?

    private let sectionStrip = TabStripView()
    private let mapView = WorldMapView()
    private let reachView = WorldReachView()
    private let incompleteView = WorldIncompleteView()
    private let explanation = NSTextField(labelWithString: "")
    private let spinner = NSProgressIndicator()
    private var selected: Section = .map

    /// True while an analysis is in flight and the tab is showing that.
    private(set) var isLoading = false

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true

        sectionStrip.onSelect = { [weak self] index in
            guard let self, let section = Section(rawValue: index) else { return }
            self.selected = section
            self.applyVisibility()
        }

        explanation.font = NSFont.systemFont(ofSize: 11)
        explanation.textColor = Theme.foregroundFaint
        explanation.alignment = .center
        explanation.lineBreakMode = .byWordWrapping
        explanation.maximumNumberOfLines = 0
        // A wrapping label must never dictate the pane's width (the divider fight).
        explanation.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        reachView.onActivate = { [weak self] span in self?.onActivate?(span) }
        incompleteView.onActivate = { [weak self] span in self?.onActivate?(span) }
        incompleteView.onEdit = { [weak self] action, row in self?.onEdit?(action, row) }

        spinner.style = .spinning
        spinner.controlSize = .small
        spinner.isDisplayedWhenStopped = false

        for subview in [sectionStrip, mapView, reachView, incompleteView, explanation, spinner] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            sectionStrip.topAnchor.constraint(equalTo: topAnchor),
            sectionStrip.leadingAnchor.constraint(equalTo: leadingAnchor),
            sectionStrip.trailingAnchor.constraint(equalTo: trailingAnchor),

            explanation.centerXAnchor.constraint(equalTo: centerXAnchor),
            explanation.centerYAnchor.constraint(equalTo: centerYAnchor),
            explanation.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 16),
            explanation.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -16),

            spinner.centerXAnchor.constraint(equalTo: centerXAnchor),
            spinner.bottomAnchor.constraint(equalTo: explanation.topAnchor, constant: -10),
        ])
        for content in [mapView, reachView, incompleteView] as [NSView] {
            NSLayoutConstraint.activate([
                content.topAnchor.constraint(equalTo: sectionStrip.bottomAnchor),
                content.leadingAnchor.constraint(equalTo: leadingAnchor),
                content.trailingAnchor.constraint(equalTo: trailingAnchor),
                content.bottomAnchor.constraint(equalTo: bottomAnchor),
            ])
        }

        showEmpty(reason: "Build the story (\u{2318}B) to derive its world index.")
    }

    required init?(coder: NSCoder) {
        fatalError("WorldView is not Storyboard-instantiable")
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = Theme.playBackground.cgColor
    }

    /// Says the analysis is running.
    ///
    /// The derivation is a subprocess and its decode runs off the main actor, so this state
    /// can last as long as the work needs without the window stuttering — which is what makes
    /// a deeper scan affordable (ADR-321 Amendment 1).
    func showLoading() {
        isLoading = true
        explanation.stringValue = "Deriving the world index\u{2026}"
        explanation.isHidden = false
        sectionStrip.isHidden = true
        for content in [mapView, reachView, incompleteView] as [NSView] { content.isHidden = true }
        spinner.startAnimation(nil)
    }

    /// Renders one analyzer response — the analysis, or why there isn't one.
    /// - Parameters:
    ///   - response: what the analyzer answered
    ///   - storyURL: the story it analysed, for the ignore list kept beside it
    func show(_ response: WorldIndexResponse, storyURL: URL? = nil) {
        isLoading = false
        spinner.stopAnimation(nil)
        switch response {
        case .failed(let failure):
            showEmpty(reason: Self.explanation(for: failure))
        case .ok(let document):
            mapView.show(map: document.map, unreached: Set(document.reach.rooms.unreached))
            reachView.show(document.reach)
            // Incomplete renders BEFORE the counts are read: its merged reading is
            // what the strip and the badge must both name, or the tab says one
            // number and the list under it shows another.
            incompleteView.show(document, storyURL: storyURL)
            sectionStrip.setTabs(Self.sectionTitles(for: document, candidates: incompleteView.candidateCount),
                                 select: selected.rawValue)
            explanation.isHidden = true
            sectionStrip.isHidden = false
            applyVisibility()
        }
    }

    /// Records where the last accepted offer wrote, for the card that follows it.
    /// - Parameter line: the line the edit landed on
    func reportEdited(line: Int) {
        incompleteView.editedLine = line
    }

    /// Shows the explanatory state and nothing else.
    ///
    /// The section strip goes with it: three empty sections invite the author to
    /// click through three empty views looking for the content, when the sentence
    /// in front of them already said there is none.
    ///
    /// - Parameter reason: the sentence to show
    func showEmpty(reason: String) {
        isLoading = false
        spinner.stopAnimation(nil)
        explanation.stringValue = reason
        explanation.isHidden = false
        sectionStrip.isHidden = true
        for content in [mapView, reachView, incompleteView] as [NSView] { content.isHidden = true }
    }

    /// The section tabs, each carrying the number that section reports.
    ///
    /// Map carries its room count, which is a size and not a complaint; Reach and
    /// Incomplete carry their finding counts.
    ///
    /// - Parameters:
    ///   - document: the analysis being shown
    ///   - candidates: how many candidates the Incomplete view holds — its own
    ///     merged reading (D11), which is a superset of the analyzer's findings
    /// - Returns: one title per section, in `Section` order
    static func sectionTitles(for document: WorldIndexDocument, candidates: Int) -> [String] {
        return ["Map · \(document.map.positions.count)",
                "Reach · \(document.reach.findingCount)",
                "Incomplete · \(candidates)"]
    }

    /// The sentence the tab shows in place of an analysis.
    ///
    /// Each cause gets its own wording, because each has a different next action:
    /// build the story, fix the compiler's output, install a toolchain, or report
    /// a defect. A single "analysis failed" would leave the author guessing which.
    ///
    /// - Parameter failure: what the analyzer, or the IDE, reported
    /// - Returns: the sentence to render
    static func explanation(for failure: WorldIndexFailure) -> String {
        switch failure.cause {
        case .usage:
            return "The World Index analyzer was asked for no story. \(failure.message)"
        case .unreadableIR:
            return "There is no built story to analyze yet. \(failure.message)"
        case .malformedIR:
            return "The built story IR could not be read. \(failure.message) Rebuilding (\u{2318}B) usually rewrites it."
        case .internal:
            return "The World Index analyzer failed on this story. \(failure.message)"
        case .unavailable:
            return failure.message
        }
    }

    /// Shows the selected section and hides the other two.
    private func applyVisibility() {
        guard explanation.isHidden else { return }
        mapView.isHidden = selected != .map
        reachView.isHidden = selected != .reach
        incompleteView.isHidden = selected != .incomplete
    }
}
