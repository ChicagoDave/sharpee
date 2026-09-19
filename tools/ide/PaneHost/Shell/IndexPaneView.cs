// The Index tab's surface: the story's declarations, grouped and navigable.
//
// Drawn rather than composed, like every other custom surface in this shell — the section
// headers carry their counts, a row carries a dim qualifier, and a row that knows where it
// was written opens that spot on a double click. Single click selects, double navigates,
// which is the project tree's contract and the shipping app's (ProjectTreeViewController);
// opening on every click is how a stray click loses the document you were editing.
//
// The rows come from StoryIndex, which is also what the build banner counts, so this tab
// and that banner cannot drift apart.
//
// Public interface: IndexPaneView (Load, Clear, RowActivated, RowCount).
// Owner context: tools/ide — the Avalonia desktop head's shell.

using Avalonia;
using Avalonia.Input;
using Avalonia.Media;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>One drawn line: a section header, or one declaration.</summary>
internal sealed record IndexLine(string Label, string? Detail, bool IsHeader, bool IsCode, IndexSpan? Span);

/// <summary>The Index tab — every room, thing, person, action and phrase the story declares.</summary>
public sealed class IndexPaneView : DrawnSurface
{
    private const double RowHeight = 20;
    private const double Pad = 10;
    private const double Indent = 14;

    private readonly List<IndexLine> _lines = new();
    private int _selected = -1;

    /// <summary>Raised with a row's source location when it is double-clicked.</summary>
    internal event Action<IndexSpan>? RowActivated;

    /// <summary>How many declarations are listed, headers excluded.</summary>
    public int RowCount => _lines.Count(l => !l.IsHeader);

    /// <summary>Empties the tab — no story open, or one that has not been built.</summary>
    public void Clear()
    {
        _lines.Clear();
        _selected = -1;
        InvalidateVisual();
    }

    /// <summary>Lists an index's sections, each header carrying its count.</summary>
    /// <param name="index">The index read from the story's IR.</param>
    internal void Load(StoryIndexDocument index)
    {
        _lines.Clear();
        _selected = -1;

        foreach (var section in index.Sections)
        {
            _lines.Add(new IndexLine($"{section.Title} · {section.Rows.Count}", null, true, false, null));
            foreach (var row in section.Rows)
                _lines.Add(new IndexLine(row.Title, row.Detail, false, row.IsCode, row.Span));
        }

        InvalidateVisual();
    }

    /// <summary>
    /// The content's own size, and only as tall as the viewport when the viewport has a
    /// height at all. A ScrollViewer measures with infinite height, so clamping to
    /// availableSize unconditionally returns infinity — which Avalonia refuses, taking the
    /// whole window down with "Invalid size returned for Measure".
    /// </summary>
    protected override Size MeasureOverride(Size availableSize)
    {
        var height = _lines.Count * RowHeight + Pad;
        var width = double.IsInfinity(availableSize.Width) ? 0 : availableSize.Width;
        return new Size(
            width,
            double.IsInfinity(availableSize.Height) ? height : Math.Max(height, availableSize.Height));
    }

    protected override void Draw(DrawingContext context)
    {
        context.FillRectangle(ThemeTokens.PlayBackground, new Rect(Bounds.Size));

        if (_lines.Count == 0)
        {
            var empty = Text("Build the story to index it.", 11.5, ThemeTokens.ForegroundFaint);
            context.DrawText(empty, new Point(Pad, Pad));
            return;
        }

        var y = Pad / 2;
        for (var i = 0; i < _lines.Count; i++)
        {
            var line = _lines[i];
            if (i == _selected)
                context.FillRectangle(ThemeTokens.Border, new Rect(0, y, Bounds.Width, RowHeight));

            if (line.IsHeader)
            {
                var header = Text(line.Label, 10, ThemeTokens.ForegroundFaint, bold: true);
                context.DrawText(header, new Point(Pad, y + (RowHeight - header.Height) / 2));
            }
            else
            {
                // A row with no span cannot be navigated to, and is drawn dim to say so
                // rather than accepting a click that would do nothing.
                var ink = line.Span is null ? ThemeTokens.ForegroundDim : ThemeTokens.Foreground;
                var title = Text(line.Label, 11.5, line.IsCode ? ThemeTokens.TokenKeyword : ink);
                context.DrawText(title, new Point(Pad + Indent, y + (RowHeight - title.Height) / 2));

                if (line.Detail is { } detail)
                {
                    var note = Text(detail, 10, ThemeTokens.ForegroundFaint);
                    context.DrawText(note,
                        new Point(Pad + Indent + title.Width + 8, y + (RowHeight - note.Height) / 2));
                }
            }
            y += RowHeight;
        }
    }

    /// <summary>One click selects; two navigate to where the declaration was written.</summary>
    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        var index = (int)((e.GetPosition(this).Y - Pad / 2) / RowHeight);
        if (index < 0 || index >= _lines.Count) return;

        var line = _lines[index];
        if (line.IsHeader) return;

        _selected = index;
        InvalidateVisual();
        if (e.ClickCount >= 2 && line.Span is { } span) RowActivated?.Invoke(span);
    }
}
