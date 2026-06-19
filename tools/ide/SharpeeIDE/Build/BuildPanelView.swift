// BuildPanelView.swift
// The bottom-docked build output pane: a read-only monospaced text view fed chunked
// stdout/stderr. Renders line-by-line so tsc diagnostics can be coloured (red error /
// yellow warning) and made clickable — a click reports the parsed TSCDiagnostic so the
// editor can jump to it. Tracks the current package dir (from pnpm run headers) to
// resolve package-relative diagnostic paths.
// Public interface: BuildPanelView (append/clear, repoRoot, onDiagnosticClick),
// BuildPanelViewController (hosts it).
// Owner context: tools/ide — Build.

import AppKit

final class BuildPanelView: NSView {

    private static let font = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    private let scrollView = NSScrollView()
    private let textView = BuildOutputTextView()

    private var lineBuffer = ""
    /// Clickable ranges → resolved source locations (build diagnostics AND play-error frames).
    private var clickableRanges: [(range: NSRange, location: SourceLocation)] = []
    /// The directory relative diagnostic paths resolve against; advances as pnpm prints
    /// each package's run header. Starts at `repoRoot`.
    private var currentBaseDir: URL?

    /// Repo root, set before each build; seeds path resolution until a package header appears.
    var repoRoot: URL? {
        didSet { currentBaseDir = repoRoot }
    }

    /// Invoked when a clickable line (diagnostic or play-error frame) is clicked.
    var onSourceClick: ((SourceLocation) -> Void)?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = Theme.playBackground.cgColor

        textView.isEditable = false
        textView.isSelectable = true
        textView.drawsBackground = false
        textView.textColor = Theme.foreground
        textView.font = Self.font
        textView.textContainerInset = NSSize(width: 8, height: 8)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.onClickCharIndex = { [weak self] index in self?.handleClick(atCharacterIndex: index) }

        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("BuildPanelView is not Storyboard-instantiable")
    }

    /// Appends a chunk of build output, rendering each newly-completed line (diagnostic
    /// lines coloured and click-tracked) and scrolling to the tail.
    func append(_ text: String) {
        lineBuffer += text
        let batch = NSMutableAttributedString()
        let storageLength = textView.textStorage?.length ?? 0

        while let newline = lineBuffer.firstIndex(of: "\n") {
            let line = String(lineBuffer[lineBuffer.startIndex..<newline])
            lineBuffer.removeSubrange(lineBuffer.startIndex...newline) // include the \n
            renderLine(line, into: batch, baseLocation: storageLength + batch.length)
        }

        guard batch.length > 0 else { return }
        textView.textStorage?.append(batch)
        textView.scrollToEndOfDocument(nil)
    }

    /// Clears all output and clickable state (called at the start of a build).
    func clear() {
        textView.textStorage?.setAttributedString(NSAttributedString(string: ""))
        lineBuffer = ""
        clickableRanges = []
        currentBaseDir = repoRoot
    }

    // MARK: - Rendering

    private func renderLine(_ line: String, into batch: NSMutableAttributedString, baseLocation: Int) {
        // Track the package dir so package-relative diagnostics resolve correctly.
        if let pkgDir = TSCDiagnosticParser.packageDirectory(from: line) {
            currentBaseDir = pkgDir
        }

        let diagnostic = TSCDiagnosticParser.parse(line: line, relativeTo: currentBaseDir)
        let color: NSColor = diagnostic.map { $0.severity == .error ? .systemRed : .systemYellow }
            ?? Theme.foreground
        batch.append(NSAttributedString(string: line + "\n",
                                        attributes: [.foregroundColor: color, .font: Self.font]))

        if let diagnostic {
            let range = NSRange(location: baseLocation, length: (line as NSString).length)
            clickableRanges.append((range, SourceLocation(file: diagnostic.file,
                                                          line: diagnostic.line,
                                                          column: diagnostic.column)))
        }
    }

    private func handleClick(atCharacterIndex index: Int) {
        if let match = clickableRanges.first(where: { NSLocationInRange(index, $0.range) }) {
            onSourceClick?(match.location)
        }
    }
}

/// NSTextView that reports the character index of a click (after normal selection), so the
/// panel can hit-test it against diagnostic ranges.
private final class BuildOutputTextView: NSTextView {

    var onClickCharIndex: ((Int) -> Void)?

    override func mouseDown(with event: NSEvent) {
        super.mouseDown(with: event)
        guard let layoutManager, let textContainer else { return }
        let point = convert(event.locationInWindow, from: nil)
        let inContainer = NSPoint(x: point.x - textContainerInset.width,
                                  y: point.y - textContainerInset.height)
        let index = layoutManager.characterIndex(for: inContainer, in: textContainer,
                                                  fractionOfDistanceBetweenInsertionPoints: nil)
        onClickCharIndex?(index)
    }
}

