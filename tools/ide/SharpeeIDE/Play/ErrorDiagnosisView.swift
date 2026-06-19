// ErrorDiagnosisView.swift
// The "Diagnosis" right-panel tab — a readable Sharpee explainer for the focused Play
// runtime error: the translated title, how-to-fix, where it happened (clickable frames),
// and the original error. Clicking a location opens it in the editor.
// Public interface: show(_:), clear(), onOpenLocation.
// Owner context: tools/ide — Play (right panel).

import AppKit

final class ErrorDiagnosisView: NSView {

    /// Invoked when a clickable location (the header or a frame) is clicked.
    var onOpenLocation: ((SourceLocation) -> Void)?

    private let scrollView = NSScrollView()
    private let textView = NSTextView()
    private let emptyLabel = NSTextField(labelWithString: "Select a game error to see its explanation")

    /// Clickable locations, indexed by the `sharpee-diag:<index>` link URLs.
    private var locations: [SourceLocation] = []

    private static let titleFont = NSFont.systemFont(ofSize: 15, weight: .semibold)
    private static let headerFont = NSFont.systemFont(ofSize: 10, weight: .semibold)
    private static let bodyFont = NSFont.systemFont(ofSize: 12.5)
    private static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.backgroundColor = Theme.playBackground.cgColor

        let huge = CGFloat.greatestFiniteMagnitude
        textView.isEditable = false
        textView.isSelectable = true
        textView.drawsBackground = false
        textView.textContainerInset = NSSize(width: 14, height: 14)
        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: huge, height: huge)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainer?.widthTracksTextView = true
        textView.textContainer?.containerSize = NSSize(width: huge, height: huge)
        textView.delegate = self
        textView.linkTextAttributes = [
            .foregroundColor: Theme.accent,
            .cursor: NSCursor.pointingHand,
        ]

        scrollView.documentView = textView
        scrollView.hasVerticalScroller = true
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        emptyLabel.font = NSFont.systemFont(ofSize: 11)
        emptyLabel.textColor = Theme.foregroundFaint
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
            emptyLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
        clear()
    }

    required init?(coder: NSCoder) {
        fatalError("ErrorDiagnosisView is not Storyboard-instantiable")
    }

    func clear() {
        locations = []
        textView.textStorage?.setAttributedString(NSAttributedString(string: ""))
        scrollView.isHidden = true
        emptyLabel.isHidden = false
    }

    func show(_ error: PlayConsoleError) {
        locations = []
        let body = NSMutableAttributedString()
        let location = error.frames.compactMap(\.location).first

        body.append(line(error.translation.title, font: Self.titleFont, color: Theme.foreground))
        if let location {
            body.append(linkLine("\(location.file.lastPathComponent):\(location.line)  ↗", to: location))
        }

        if let explanation = error.translation.explanation {
            body.append(header("What happened"))
            body.append(line(explanation, font: Self.bodyFont, color: Theme.foreground))
        }

        if let fix = error.translation.fix {
            body.append(header("How to fix"))
            body.append(line(fix, font: Self.bodyFont, color: Theme.foregroundDim))
        }

        body.append(header("Original error"))
        body.append(line(error.translation.raw, font: Self.monoFont, color: Theme.foregroundFaint))

        textView.textStorage?.setAttributedString(body)
        textView.scroll(.zero)
        scrollView.isHidden = false
        emptyLabel.isHidden = true
    }

    // MARK: - Composition

    private func line(_ text: String, font: NSFont, color: NSColor) -> NSAttributedString {
        NSAttributedString(string: text + "\n\n", attributes: [
            .font: font, .foregroundColor: color, .paragraphStyle: Self.paragraph,
        ])
    }

    private func header(_ text: String) -> NSAttributedString {
        NSAttributedString(string: text.uppercased() + "\n", attributes: [
            .font: Self.headerFont, .foregroundColor: Theme.foregroundFaint, .kern: 0.5,
        ])
    }

    private func linkLine(_ text: String, to location: SourceLocation, font: NSFont = bodyFont) -> NSAttributedString {
        let index = locations.count
        locations.append(location)
        return NSAttributedString(string: text + "\n\n", attributes: [
            .font: font,
            .link: URL(string: "sharpee-diag:\(index)")!,
            .paragraphStyle: Self.paragraph,
        ])
    }

    private static let paragraph: NSParagraphStyle = {
        let style = NSMutableParagraphStyle()
        style.lineSpacing = 2
        style.paragraphSpacing = 2
        return style
    }()
}

extension ErrorDiagnosisView: NSTextViewDelegate {
    func textView(_ textView: NSTextView, clickedOnLink link: Any, at charIndex: Int) -> Bool {
        guard let url = link as? URL, url.scheme == "sharpee-diag",
              let index = Int(url.absoluteString.replacingOccurrences(of: "sharpee-diag:", with: "")),
              locations.indices.contains(index) else { return false }
        onOpenLocation?(locations[index])
        return true
    }
}
