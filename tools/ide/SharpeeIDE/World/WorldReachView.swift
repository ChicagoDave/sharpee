// WorldReachView.swift
// The Reach view (ADR-321 D4): can the player get to what the author wrote? A
// headline over a sectioned list of everything the analyzer's fixed point found
// — rooms play never arrives at, exits that never open, things it can never
// hold, and things it can hold but find nothing written on.
//
// It also carries D13's unnamed-tool finding, which is Reach-ADJACENT rather than
// a Reach finding: the analyzer derives it from prose and roles, not from the
// walk, and it is deliberately absent from `reach.findingCount`. It renders here
// because it answers the same question the rest of this view answers — can the
// player actually get on? — one step further along than reachability.
//
// The view renders; it derives nothing. `rows(for:)` is a pure function of the
// analyzer's answer, which is what lets a test pin the surface's wording against
// a real story's analysis without an app running.
// Public interface: WorldReachView.show(_:), onActivate, WorldReachView.rows(for:),
// headline(for:).
// Owner context: tools/ide — World.

import AppKit

final class WorldReachView: NSView {

    /// Invoked when a finding naming a source line is double-clicked.
    var onActivate: ((WorldFindingDestination) -> Void)? {
        get { table.onActivate }
        set { table.onActivate = newValue }
    }

    private let headlineLabel = NSTextField(labelWithString: "")
    private let table = WorldFindingTable()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        headlineLabel.font = NSFont.systemFont(ofSize: 11)
        headlineLabel.textColor = Theme.foregroundDim
        headlineLabel.lineBreakMode = .byTruncatingTail
        headlineLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        for subview in [headlineLabel, table] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            headlineLabel.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            headlineLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            headlineLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),

            table.topAnchor.constraint(equalTo: headlineLabel.bottomAnchor, constant: 6),
            table.leadingAnchor.constraint(equalTo: leadingAnchor),
            table.trailingAnchor.constraint(equalTo: trailingAnchor),
            table.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("WorldReachView is not Storyboard-instantiable")
    }

    /// Renders one story's reachability.
    /// - Parameters:
    ///   - reach: the analyzer's Reach result
    ///   - unnamedTools: things the mechanics need that nothing announces (D13)
    func show(_ reach: WorldReach, unnamedTools: [WorldUnnamedTool] = []) {
        headlineLabel.stringValue = Self.headline(for: reach, unnamedTools: unnamedTools)
        table.setRows(Self.rows(for: reach, unnamedTools: unnamedTools),
                      emptyMessage: "Every room, every exit, and everything in them is reachable from the start, and the prose introduces all of it.")
    }

    /// The one-line summary above the list.
    ///
    /// Rooms first, because room count is the number an author checks against
    /// what they think they wrote; findings second, and named as findings rather
    /// than errors — an unreached room can be deliberate.
    ///
    /// The unnamed-tool count is a separate clause rather than folded into the
    /// finding count, because it is a separate claim: a story can be entirely
    /// reachable and still never tell the player a thing exists.
    ///
    /// - Parameters:
    ///   - reach: the analyzer's Reach result
    ///   - unnamedTools: things the mechanics need that nothing announces (D13)
    /// - Returns: the headline text
    static func headline(for reach: WorldReach, unnamedTools: [WorldUnnamedTool] = []) -> String {
        let rooms = reach.rooms.total == 1 ? "1 room" : "\(reach.rooms.total) rooms"
        let start = reach.start.map { "from \($0)" } ?? "no start room declared"
        let reachability = reach.findingCount == 0
            ? "nothing unreachable"
            : (reach.findingCount == 1 ? "1 finding" : "\(reach.findingCount) findings")

        guard !unnamedTools.isEmpty else { return "\(rooms) · \(start) · \(reachability)" }
        let unannounced = unnamedTools.count == 1
            ? "1 thing nothing mentions"
            : "\(unnamedTools.count) things nothing mentions"
        return "\(rooms) · \(start) · \(reachability) · \(unannounced)"
    }

    /// The sectioned list, derived from the analyzer's answer.
    ///
    /// Sections appear only when they hold something: a story with no broken
    /// exits should not be told it has a broken-exit section with nothing in it.
    ///
    /// - Parameters:
    ///   - reach: the analyzer's Reach result
    ///   - unnamedTools: things the mechanics need that nothing announces (D13)
    /// - Returns: header and finding rows in display order
    static func rows(for reach: WorldReach, unnamedTools: [WorldUnnamedTool] = []) -> [WorldFindingRow] {
        var rows: [WorldFindingRow] = []

        if !reach.rooms.unreached.isEmpty {
            rows.append(.header("Rooms play never arrives at", count: reach.rooms.unreached.count))
            rows += reach.rooms.unreached.map {
                WorldFindingRow(title: $0, symbol: "square.dashed", tint: Theme.worldUnreached)
            }
        }

        if !reach.blocked.isEmpty {
            rows.append(.header("Exits that never open", count: reach.blocked.count))
            rows += reach.blocked.map { edge in
                WorldFindingRow(title: "\(edge.from) \(edge.direction) → \(edge.to)",
                                detail: edge.reason,
                                symbol: edge.obstacle == .lock ? "lock" : "hand.raised",
                                tint: Theme.worldSealed,
                                line: edge.line)
            }
        }

        if !reach.brokenExits.isEmpty {
            rows.append(.header("Exits to nowhere", count: reach.brokenExits.count))
            rows += reach.brokenExits.map { exit in
                WorldFindingRow(title: "\(exit.from) \(exit.direction) → \(exit.to)",
                                detail: "names no room in this story",
                                symbol: "arrow.uturn.left",
                                tint: Theme.worldSealed,
                                line: exit.line)
            }
        }

        if !reach.stranded.isEmpty {
            rows.append(.header("Things play can never hold", count: reach.stranded.count))
            rows += reach.stranded.map { thing in
                WorldFindingRow(title: thing.name,
                                detail: thing.reason,
                                symbol: "shippingbox",
                                tint: Theme.worldUnreached)
            }
        }

        if !reach.nothingToRead.isEmpty {
            rows.append(.header("Reachable, with nothing written", count: reach.nothingToRead.count))
            rows += reach.nothingToRead.map { thing in
                let place = thing.room.map { "in \($0)" } ?? "carried or contained"
                return WorldFindingRow(title: thing.name,
                                       detail: place,
                                       symbol: "text.badge.xmark",
                                       tint: Theme.worldCandidate)
            }
        }

        if !unnamedTools.isEmpty {
            // Last, and named for what it costs the player rather than for what the
            // analyzer measured: every other section here is about a thing play
            // cannot get to, and this one is about a thing play is never told about.
            rows.append(.header("Nothing tells the player these exist", count: unnamedTools.count))
            rows += unnamedTools.map { thing in
                let place = thing.room.map { "in \($0)" } ?? "placed nowhere"
                let stake = thing.role == .progressionInfo
                    ? "\(place) · the story cannot be finished without it"
                    : place
                return WorldFindingRow(title: thing.name,
                                       detail: stake,
                                       symbol: "eye.slash",
                                       tint: thing.role == .progressionInfo ? Theme.worldSealed : Theme.worldCandidate)
            }
        }

        return rows
    }
}
