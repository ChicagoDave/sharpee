// The editor's diagnostic underlines in the Avalonia head (ADR-258 D5): errors red,
// warnings yellow, under the exact range a compose record names — what the Swift head
// draws with NSTextView underline attributes.
//
// It draws, and decides nothing: the shell hands it the marks for one document, already
// clamped to their first line (ComposeProblems.UnderlineRange), and clears them on the
// next edit to that document, when they go stale.
//
// Public interface: DiagnosticUnderlines.Show, Clear, Document, MarkCount; the
// IBackgroundRenderer members AvaloniaEdit calls.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using Avalonia;
using Avalonia.Media;
using AvaloniaEdit.Document;
using AvaloniaEdit.Rendering;

namespace PaneHost.Shell;

public sealed class DiagnosticUnderlines : IBackgroundRenderer
{
    private static readonly IPen ErrorPen = new Pen(new SolidColorBrush(Color.FromRgb(0xE5, 0x48, 0x4D)), 2);
    private static readonly IPen WarningPen = new Pen(new SolidColorBrush(Color.FromRgb(0xE5, 0xB5, 0x2E)), 2);

    private IReadOnlyList<(TextSegment Segment, bool IsError)> _marks = Array.Empty<(TextSegment, bool)>();

    /// <summary>The document the marks belong to; null when there are none.</summary>
    public TextDocument? Document { get; private set; }

    /// <summary>How many ranges are underlined.</summary>
    public int MarkCount => _marks.Count;

    /// <inheritdoc />
    public KnownLayer Layer => KnownLayer.Selection;

    /// <summary>Underlines <paramref name="marks"/> in <paramref name="document"/>, replacing any earlier marks.</summary>
    /// <param name="document">The document the offsets index.</param>
    /// <param name="marks">Each range and whether it is an error (otherwise a warning).</param>
    public void Show(TextDocument document, IEnumerable<(int Offset, int Length, bool IsError)> marks)
    {
        Document = document;
        _marks = marks.Where(m => m.Length > 0 && m.Offset + m.Length <= document.TextLength)
            .Select(m => (new TextSegment { StartOffset = m.Offset, Length = m.Length }, m.IsError))
            .ToList();
    }

    /// <summary>Removes every mark.</summary>
    public void Clear()
    {
        Document = null;
        _marks = Array.Empty<(TextSegment, bool)>();
    }

    /// <inheritdoc />
    public void Draw(TextView textView, DrawingContext drawingContext)
    {
        if (Document is null || !ReferenceEquals(textView.Document, Document)) return;
        textView.EnsureVisualLines();
        foreach (var (segment, isError) in _marks)
        {
            if (segment.EndOffset > Document.TextLength) continue;
            foreach (var rect in BackgroundGeometryBuilder.GetRectsForSegment(textView, segment))
            {
                var y = rect.Bottom - 1;
                drawingContext.DrawLine(isError ? ErrorPen : WarningPen, new Point(rect.Left, y), new Point(rect.Right, y));
            }
        }
    }
}
