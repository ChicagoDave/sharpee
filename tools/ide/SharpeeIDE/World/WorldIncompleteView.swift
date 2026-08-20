// WorldIncompleteView.swift
// The Incomplete view (ADR-321 D5/D6): phrases the author's own prose names that
// the parser cannot resolve. Three classes, kept apart because they are three
// different problems — a real thing named by a word it does not answer to, a
// phrase two things both answer to, and a phrase nothing answers to at all.
//
// IT IS A CANDIDATE LIST, NEVER AN ERROR LIST (D6). The phrases are read out of
// prose by heuristic and some of them are scenery the author meant to skip, so
// the wording here says "places a player will reach for something" and never
// "error". Nothing in this view blocks a build or claims a defect.
// Public interface: WorldIncompleteView.show(_:), onActivate,
// WorldIncompleteView.rows(for:class:), tabTitles(for:), title(_:_:).
// Owner context: tools/ide — World.

import AppKit

final class WorldIncompleteView: NSView {

    /// The three classes, in the order the strip shows them.
    enum FindingClass: Int, CaseIterable {
        /// A real thing, named by a word it does not answer to.
        case missingWord
        /// A phrase two or more things answer to.
        case ambiguous
        /// A phrase nothing answers to.
        case noObject
    }

    /// Invoked when a finding naming a source line is double-clicked.
    var onActivate: ((DiagnosticSpan) -> Void)? {
        get { table.onActivate }
        set { table.onActivate = newValue }
    }

    private let classStrip = TabStripView()
    private let table = WorldFindingTable()
    private var incomplete: WorldIncomplete?
    private var selected: FindingClass = .missingWord

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        classStrip.onSelect = { [weak self] index in
            guard let self, let selection = FindingClass(rawValue: index) else { return }
            self.selected = selection
            self.renderSelectedClass()
        }

        for subview in [classStrip, table] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            classStrip.topAnchor.constraint(equalTo: topAnchor),
            classStrip.leadingAnchor.constraint(equalTo: leadingAnchor),
            classStrip.trailingAnchor.constraint(equalTo: trailingAnchor),

            table.topAnchor.constraint(equalTo: classStrip.bottomAnchor),
            table.leadingAnchor.constraint(equalTo: leadingAnchor),
            table.trailingAnchor.constraint(equalTo: trailingAnchor),
            table.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("WorldIncompleteView is not Storyboard-instantiable")
    }

    /// Renders one story's candidate list, keeping the selected class.
    /// - Parameter incomplete: the analyzer's Incomplete result
    func show(_ incomplete: WorldIncomplete) {
        self.incomplete = incomplete
        classStrip.setTabs(Self.tabTitles(for: incomplete), select: selected.rawValue)
        renderSelectedClass()
    }

    /// The class tabs, each carrying its own count.
    ///
    /// Counts ride IN the titles, the ruling the Index tab's section strip
    /// already follows — a separate stats row would say the same numbers twice.
    ///
    /// - Parameter incomplete: the analyzer's Incomplete result
    /// - Returns: one title per class, in `FindingClass` order
    static func tabTitles(for incomplete: WorldIncomplete) -> [String] {
        ["Missing word · \(incomplete.counts.missingWord)",
         "Ambiguous · \(incomplete.counts.ambiguous)",
         "No object · \(incomplete.counts.noObject)"]
    }

    /// The rows for one class, derived from the analyzer's answer.
    ///
    /// Each row leads with the phrase as the author wrote it, because that is the
    /// string they will search their own prose for.
    ///
    /// - Parameters:
    ///   - incomplete: the analyzer's Incomplete result
    ///   - findingClass: which class to list
    /// - Returns: the finding rows, in the analyzer's order
    static func rows(for incomplete: WorldIncomplete, class findingClass: FindingClass) -> [WorldFindingRow] {
        switch findingClass {
        case .missingWord:
            return incomplete.missingWord.map { finding in
                let missing = finding.missing.map { "“\($0)”" }.joined(separator: ", ")
                let known = finding.knownAs.joined(separator: ", ")
                return WorldFindingRow(
                    title: Self.title(finding.phrase, finding.site),
                    detail: "\(finding.entity) does not answer to \(missing) — it answers to \(known)",
                    symbol: "character.magnify",
                    tint: Theme.worldCandidate,
                    line: finding.site.line)
            }
        case .ambiguous:
            return incomplete.ambiguous.map { finding in
                WorldFindingRow(
                    title: Self.title(finding.phrase, finding.site),
                    detail: "reaches \(finding.candidates.joined(separator: ", "))",
                    symbol: "questionmark.diamond",
                    tint: Theme.worldAmbiguous,
                    line: finding.site.line)
            }
        case .noObject:
            return incomplete.noObject.map { finding in
                WorldFindingRow(
                    title: Self.title(finding.phrase, finding.site),
                    detail: "nothing in the story answers to it",
                    symbol: "circle.dashed",
                    tint: Theme.worldUnreached,
                    line: finding.site.line)
            }
        }
    }

    /// A finding's headline: the phrase, then where the author will find it.
    ///
    /// Response prose says what fires it as well as where it hangs, because "in Mrs
    /// Kettle" and "in Mrs Kettle · on talking" send the author to different lines of the
    /// same entity (ADR-321 Amendment 1, D10).
    ///
    /// - Parameters:
    ///   - phrase: the phrase as the author wrote it
    ///   - site: where the passage sits
    /// - Returns: the row's title
    static func title(_ phrase: String, _ site: WorldProseSite) -> String {
        var where_ = site.label
        if site.kind == .response, let firedBy = site.firedBy, firedBy != site.label {
            where_ += " · \(firedBy)"
        }
        return "“\(phrase)” in \(where_)"
    }

    /// Draws the selected class, or says why there is nothing to draw.
    private func renderSelectedClass() {
        guard let incomplete else {
            table.setRows([], emptyMessage: "Build the story to derive its candidate list.")
            return
        }
        table.setRows(Self.rows(for: incomplete, class: selected),
                      emptyMessage: Self.emptyMessage(for: selected))
    }

    /// What to say when a class holds nothing.
    /// - Parameter findingClass: the class being shown
    /// - Returns: a sentence naming what its absence means
    static func emptyMessage(for findingClass: FindingClass) -> String {
        switch findingClass {
        case .missingWord:
            return "Every phrase the prose uses for a real thing is a phrase that thing answers to."
        case .ambiguous:
            return "No phrase in the prose reaches two things at once."
        case .noObject:
            return "Every noun phrase the prose names has something behind it."
        }
    }
}
