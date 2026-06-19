// LineNumberRulerView.swift
// A line-number gutter for the editor's NSTextView, drawn as the scroll view's vertical
// ruler. Also draws a red error flag in the margin for lines in `errorLines` (set when the
// user jumps to a build/play error).
// Public interface: init(textView:), errorLines, refresh().
// Owner context: tools/ide — Editor.

import AppKit

final class LineNumberRulerView: NSRulerView {

    /// 1-based line numbers to flag with an error badge.
    var errorLines: Set<Int> = [] { didSet { needsDisplay = true } }

    private weak var textView: NSTextView?

    private static let font = NSFont.monospacedDigitSystemFont(ofSize: 10, weight: .regular)
    private static let flagDiameter: CGFloat = 9

    init(textView: NSTextView, scrollView: NSScrollView) {
        self.textView = textView
        super.init(scrollView: scrollView, orientation: .verticalRuler)
        clientView = textView
        ruleThickness = 46
    }

    required init(coder: NSCoder) {
        fatalError("LineNumberRulerView is not Storyboard-instantiable")
    }

    /// Re-draw (call on scroll, edit, or layout change).
    func refresh() { needsDisplay = true }

    override func drawHashMarksAndLabels(in rect: NSRect) {
        guard let textView,
              let layoutManager = textView.layoutManager,
              let textContainer = textView.textContainer else { return }

        let content = textView.string as NSString
        let inset = textView.textContainerInset.height
        // Maps textView (document) coordinates into this ruler's coordinates (accounts for scroll).
        let yOffset = convert(NSPoint.zero, from: textView).y

        let numberAttributes: [NSAttributedString.Key: Any] = [
            .font: Self.font,
            .foregroundColor: Theme.foregroundFaint,
        ]

        let visibleGlyphs = layoutManager.glyphRange(forBoundingRect: textView.visibleRect, in: textContainer)
        let visibleChars = layoutManager.characterRange(forGlyphRange: visibleGlyphs, actualGlyphRange: nil)

        var charIndex = visibleChars.location
        var lineNumber = lineNumber(forCharacterAt: charIndex, in: content)
        let end = NSMaxRange(visibleChars)

        while charIndex <= end {
            let lineRange = content.lineRange(for: NSRange(location: min(charIndex, content.length), length: 0))
            let glyphIndex = layoutManager.glyphIndexForCharacter(at: lineRange.location)
            let fragment = layoutManager.lineFragmentRect(forGlyphAt: glyphIndex, effectiveRange: nil)
            let y = fragment.minY + yOffset + inset

            let label = "\(lineNumber)" as NSString
            let size = label.size(withAttributes: numberAttributes)
            label.draw(at: NSPoint(x: ruleThickness - size.width - 16,
                                   y: y + (fragment.height - size.height) / 2),
                       withAttributes: numberAttributes)

            if errorLines.contains(lineNumber) {
                let d = Self.flagDiameter
                let flag = NSRect(x: 4, y: y + (fragment.height - d) / 2, width: d, height: d)
                NSColor.systemRed.setFill()
                NSBezierPath(ovalIn: flag).fill()
            }

            if lineRange.length == 0 { break } // last (empty) line
            lineNumber += 1
            charIndex = NSMaxRange(lineRange)
        }
    }

    /// 1-based line number of the line containing `charIndex`.
    private func lineNumber(forCharacterAt charIndex: Int, in content: NSString) -> Int {
        guard charIndex > 0 else { return 1 }
        var count = 1
        content.enumerateSubstrings(in: NSRange(location: 0, length: min(charIndex, content.length)),
                                    options: [.byLines, .substringNotRequired]) { _, _, enclosing, _ in
            if NSMaxRange(enclosing) <= charIndex { count += 1 }
        }
        return count
    }
}
