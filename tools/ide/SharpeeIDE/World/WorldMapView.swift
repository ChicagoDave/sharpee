// WorldMapView.swift
// The Map view (ADR-321 D7): the story's rooms drawn on the compass grid the
// analyzer solved, one band per vertical level, with the connections between
// them. The solver's own notes ride along — a room it had to displace to avoid a
// collision, a cycle whose geometry disagrees with itself, a room it could not
// place at all — because those are the cases where what is drawn is not quite
// what the author wrote, and saying so is cheaper than being quietly wrong.
//
// LEVELS ARE BANDS, NOT A PICKER. `up`/`down` exits give a story a z axis, and
// most stories use one or two levels for a handful of rooms; a level control
// would hide most of a small map behind a click. Bands share one x range so the
// levels line up, and a connection between levels shows as a chevron on both
// rooms rather than a line that would have to cross a band boundary.
// Public interface: WorldMapView.show(map:unreached:), WorldMapCanvas.
// Owner context: tools/ide — World.

import AppKit

final class WorldMapView: NSView {

    private let scrollView = NSScrollView()
    private let canvas = WorldMapCanvas()
    private let noteLabel = NSTextField(labelWithString: "")
    private let placeholder = NSTextField(labelWithString: "This story places no rooms yet.")

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        scrollView.documentView = canvas
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = true
        scrollView.drawsBackground = false
        scrollView.contentView.drawsBackground = false

        noteLabel.font = NSFont.systemFont(ofSize: 10)
        noteLabel.textColor = Theme.foregroundDim
        noteLabel.lineBreakMode = .byWordWrapping
        noteLabel.maximumNumberOfLines = 0
        noteLabel.isHidden = true

        placeholder.font = NSFont.systemFont(ofSize: 11)
        placeholder.textColor = Theme.foregroundFaint
        placeholder.alignment = .center
        placeholder.isHidden = true

        // Wrapping labels must never dictate the pane's width (the divider fight).
        for label in [noteLabel, placeholder] {
            label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        }

        for subview in [scrollView, noteLabel, placeholder] as [NSView] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            addSubview(subview)
        }

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: noteLabel.topAnchor, constant: -4),

            noteLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
            noteLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),
            noteLabel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -6),

            placeholder.centerXAnchor.constraint(equalTo: centerXAnchor),
            placeholder.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("WorldMapView is not Storyboard-instantiable")
    }

    /// Draws one story's map.
    /// - Parameters:
    ///   - map: the analyzer's solved layout
    ///   - unreached: rooms Reach could not arrive at, drawn faded
    func show(map: WorldMap, unreached: Set<String>) {
        canvas.show(map: map, unreached: unreached)
        let note = Self.solverNote(for: map)
        noteLabel.stringValue = note
        noteLabel.isHidden = note.isEmpty
        let empty = map.positions.isEmpty
        placeholder.isHidden = !empty
        scrollView.isHidden = empty
    }

    /// What the solver had to do to draw this map, as one line, or "" when it
    /// drew the author's geometry exactly.
    ///
    /// A displaced room is never also a skew — resolving a collision moves a room
    /// off its compass cell by construction, which is why the two are counted
    /// separately rather than summed.
    ///
    /// - Parameter map: the analyzer's solved layout
    /// - Returns: the note, or an empty string when there is nothing to say
    static func solverNote(for map: WorldMap) -> String {
        var parts: [String] = []
        if !map.collisions.isEmpty {
            let rooms = map.collisions.map(\.room).joined(separator: ", ")
            parts.append(map.collisions.count == 1
                ? "1 room was moved off its compass cell to avoid an overlap: \(rooms)"
                : "\(map.collisions.count) rooms were moved off their compass cells to avoid overlaps: \(rooms)")
        }
        if !map.skews.isEmpty {
            let rooms = map.skews.map(\.room).joined(separator: ", ")
            parts.append("the geometry disagrees with itself at \(rooms)")
        }
        if !map.unplaced.isEmpty {
            parts.append("not drawn, because no followed exit reaches them: \(map.unplaced.joined(separator: ", "))")
        }
        return parts.joined(separator: " · ")
    }
}

/// The drawing surface itself: rooms, connections, and level bands.
final class WorldMapCanvas: NSView {

    /// One room box's size.
    private static let boxSize = NSSize(width: 108, height: 34)
    /// Gap between adjacent boxes, horizontally and vertically.
    private static let gap = NSSize(width: 24, height: 22)
    /// Margin around the whole drawing.
    private static let margin: CGFloat = 16
    /// Height reserved above each band for its label.
    private static let bandHeader: CGFloat = 20
    /// Gap between two level bands.
    private static let bandGap: CGFloat = 18

    private var map = WorldMap(start: nil, positions: [], unplaced: [],
                               collisions: [], skews: [], connections: [])
    private var unreached: Set<String> = []
    private var displaced: Set<String> = []
    private var frames: [String: NSRect] = [:]
    private var levels: [Int] = []
    private var contentSize = NSSize(width: 1, height: 1)

    /// Rooms are laid out top-down within a band, so the view draws flipped.
    override var isFlipped: Bool { true }

    override var intrinsicContentSize: NSSize { contentSize }

    /// Lays out and redraws one story's map.
    /// - Parameters:
    ///   - map: the analyzer's solved layout
    ///   - unreached: rooms Reach could not arrive at, drawn faded
    func show(map: WorldMap, unreached: Set<String>) {
        self.map = map
        self.unreached = unreached
        self.displaced = Set(map.collisions.map(\.room))
        layoutBoxes()
        invalidateIntrinsicContentSize()
        setFrameSize(contentSize)
        needsDisplay = true
    }

    /// Computes every room's frame and the canvas size.
    ///
    /// Levels stack highest-first; all bands share one x origin so a room above
    /// another sits above it on screen too.
    private func layoutBoxes() {
        frames = [:]
        levels = Array(Set(map.positions.map(\.cell.z))).sorted(by: >)
        guard !map.positions.isEmpty else {
            contentSize = NSSize(width: 1, height: 1)
            return
        }

        let minX = map.positions.map(\.cell.x).min() ?? 0
        let maxX = map.positions.map(\.cell.x).max() ?? 0
        let pitchX = Self.boxSize.width + Self.gap.width
        let pitchY = Self.boxSize.height + Self.gap.height

        var cursorY = Self.margin
        for level in levels {
            let inLevel = map.positions.filter { $0.cell.z == level }
            let maxY = inLevel.map(\.cell.y).max() ?? 0
            let minY = inLevel.map(\.cell.y).min() ?? 0
            cursorY += Self.bandHeader
            for placed in inLevel {
                // North is +y in the analyzer and up on screen: rows count down
                // from the band's northernmost.
                let row = CGFloat(maxY - placed.cell.y)
                let column = CGFloat(placed.cell.x - minX)
                frames[placed.room] = NSRect(
                    x: Self.margin + column * pitchX,
                    y: cursorY + row * pitchY,
                    width: Self.boxSize.width,
                    height: Self.boxSize.height)
            }
            cursorY += CGFloat(maxY - minY + 1) * pitchY + Self.bandGap
        }

        contentSize = NSSize(
            width: Self.margin * 2 + CGFloat(maxX - minX + 1) * pitchX - Self.gap.width,
            height: cursorY - Self.bandGap + Self.margin)
    }

    override func draw(_ dirtyRect: NSRect) {
        Theme.playBackground.setFill()
        dirtyRect.fill()
        drawBandLabels()
        drawConnections()
        drawRooms()
    }

    /// Labels each level band, when the story has more than one.
    private func drawBandLabels() {
        guard levels.count > 1 else { return }
        for level in levels {
            let roomsHere = map.positions.filter { $0.cell.z == level }
            guard let top = roomsHere.compactMap({ frames[$0.room]?.minY }).min() else { continue }
            let title = level == 0 ? "Ground level" : (level > 0 ? "Level +\(level)" : "Level \(level)")
            let text = NSAttributedString(string: title.uppercased(), attributes: [
                .foregroundColor: Theme.foregroundFaint,
                .font: NSFont.systemFont(ofSize: 9, weight: .semibold),
                .kern: 0.8,
            ])
            text.draw(at: NSPoint(x: Self.margin, y: top - Self.bandHeader + 4))
        }
    }

    /// Draws every connection: a line within a level, a chevron pair across levels.
    private func drawConnections() {
        for connection in map.connections {
            guard connection.rooms.count == 2,
                  let a = frames[connection.rooms[0]],
                  let b = frames[connection.rooms[1]] else { continue }
            let levelA = level(of: connection.rooms[0])
            let levelB = level(of: connection.rooms[1])
            if levelA != levelB {
                drawLevelChange(from: a, to: b, rising: (levelB ?? 0) > (levelA ?? 0))
                continue
            }
            let path = NSBezierPath()
            path.move(to: NSPoint(x: a.midX, y: a.midY))
            path.line(to: NSPoint(x: b.midX, y: b.midY))
            path.lineWidth = 1.5
            (connection.via == nil ? Theme.worldConnection : Theme.worldDoor).setStroke()
            if connection.via != nil { path.setLineDash([4, 3], count: 2, phase: 0) }
            path.stroke()
        }
    }

    /// Marks a connection that leaves the band, on both of its rooms.
    /// - Parameters:
    ///   - a: the first room's frame
    ///   - b: the second room's frame
    ///   - rising: whether the second room sits on a higher level than the first
    private func drawLevelChange(from a: NSRect, to b: NSRect, rising: Bool) {
        let attributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: Theme.worldConnection,
            .font: NSFont.systemFont(ofSize: 10, weight: .bold),
        ]
        NSAttributedString(string: rising ? "\u{25B2}" : "\u{25BC}", attributes: attributes)
            .draw(at: NSPoint(x: a.maxX - 12, y: a.minY + 2))
        NSAttributedString(string: rising ? "\u{25BC}" : "\u{25B2}", attributes: attributes)
            .draw(at: NSPoint(x: b.maxX - 12, y: b.minY + 2))
    }

    /// Draws every placed room.
    private func drawRooms() {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineBreakMode = .byTruncatingTail

        for placed in map.positions {
            guard let box = frames[placed.room] else { continue }
            let isStart = placed.room == map.start
            let isUnreached = unreached.contains(placed.room)
            let isDisplaced = displaced.contains(placed.room)

            let shape = NSBezierPath(roundedRect: box.insetBy(dx: 0.5, dy: 0.5), xRadius: 5, yRadius: 5)
            (isUnreached ? Theme.worldRoomFillUnreached : Theme.worldRoomFill).setFill()
            shape.fill()
            if isDisplaced { shape.setLineDash([4, 3], count: 2, phase: 0) }
            shape.lineWidth = isStart ? 2 : 1
            (isStart ? Theme.accent : (isDisplaced ? Theme.worldDisplaced : Theme.border)).setStroke()
            shape.stroke()

            let color = isUnreached ? Theme.foregroundFaint : Theme.foreground
            let label = NSAttributedString(string: placed.room, attributes: [
                .foregroundColor: color,
                .font: NSFont.systemFont(ofSize: 11),
                .paragraphStyle: paragraph,
            ])
            label.draw(in: NSRect(x: box.minX + 4, y: box.midY - 8,
                                  width: box.width - 8, height: 16))
        }
    }

    /// The level a room sits on, or nil when it was never placed.
    /// - Parameter room: the room id
    /// - Returns: its z level
    private func level(of room: String) -> Int? {
        map.positions.first { $0.room == room }?.cell.z
    }
}
