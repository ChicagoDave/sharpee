// TabBarView.swift, drawn with a DrawingContext.
//
// 28 px, bold-when-active title, a `×` close glyph, 1 px separators, the active
// cell on the editor background; a 6 px dirty dot replaces the 12 px inset when
// the document has unsaved changes.
//
// IT TAKES CLICKS. It drew a `×` from the first day and did nothing with it, so a document
// could be opened and never closed (GH #489). Cell geometry is recorded while drawing and
// hit-tested on press: the close glyph closes, the rest of the cell selects.
//
// Public interface: EditorTabBarView (Documents, ActiveIndex, SetDirty, Selected, Closed).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using Avalonia;
using Avalonia.Input;
using Avalonia.Media;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>One open document per cell, with a dirty indicator.</summary>
public sealed class EditorTabBarView : DrawnSurface
{
    private const double BarHeight = 28;
    private const double Inset = 12;
    private const double DotSize = 6;
    private const double FontSize = 11.5;

    public static readonly StyledProperty<int> ActiveIndexProperty =
        AvaloniaProperty.Register<EditorTabBarView, int>(nameof(ActiveIndex));

    static EditorTabBarView() => AffectsRender<EditorTabBarView>(ActiveIndexProperty);

    private readonly HashSet<int> _dirty = new();

    /// <summary>Where each cell and its close glyph were last drawn, for hit testing.</summary>
    private readonly List<(Rect Cell, Rect Close)> _cells = new();

    /// <summary>Raised with the index of the tab clicked.</summary>
    public event Action<int>? Selected;

    /// <summary>Raised with the index of the tab whose close glyph was clicked.</summary>
    public event Action<int>? Closed;

    public IReadOnlyList<string> Documents { get; set; } = Array.Empty<string>();

    public int ActiveIndex
    {
        get => GetValue(ActiveIndexProperty);
        set => SetValue(ActiveIndexProperty, value);
    }

    /// <summary>Marks a document dirty or clean and repaints — the editor's `change` signal.</summary>
    public void SetDirty(int index, bool dirty)
    {
        if (dirty ? !_dirty.Add(index) : !_dirty.Remove(index)) return;
        InvalidateVisual();
    }

    public EditorTabBarView() => MinHeight = BarHeight;

    /// <summary>
    /// Routes a press to close or select, by where it landed in the cell drawn last frame.
    /// </summary>
    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        var point = e.GetPosition(this);

        for (var i = 0; i < _cells.Count; i++)
        {
            if (!_cells[i].Cell.Contains(point)) continue;
            // The close glyph is small, so its hit area is padded — a person aiming at an
            // × should not select the tab instead.
            if (_cells[i].Close.Inflate(4).Contains(point)) Closed?.Invoke(i);
            else Selected?.Invoke(i);
            e.Handled = true;
            return;
        }
    }

    protected override Size MeasureOverride(Size availableSize) => new(availableSize.Width, BarHeight);

    protected override void Draw(DrawingContext context)
    {
        context.FillRectangle(ThemeTokens.RailBackground, new Rect(0, 0, Bounds.Width, BarHeight));

        _cells.Clear();
        var x = 0.0;
        for (var i = 0; i < Documents.Count; i++)
        {
            var active = i == ActiveIndex;
            var title = Text(Documents[i], FontSize, active ? ThemeTokens.Foreground : ThemeTokens.ForegroundDim, bold: active);
            var close = Text("×", FontSize + 1, ThemeTokens.ForegroundFaint);
            var lead = _dirty.Contains(i) ? DotSize + 8 : Inset;
            var cellWidth = lead + title.Width + 10 + close.Width + Inset;

            if (active) context.FillRectangle(ThemeTokens.EditorBackground, new Rect(x, 0, cellWidth, BarHeight));

            if (_dirty.Contains(i))
            {
                var cy = BarHeight / 2;
                context.DrawEllipse(ThemeTokens.Accent, null, new Point(x + 8 + DotSize / 2, cy), DotSize / 2, DotSize / 2);
            }

            var closeAt = new Point(x + lead + title.Width + 10, (BarHeight - close.Height) / 2);
            context.DrawText(title, new Point(x + lead, (BarHeight - title.Height) / 2));
            context.DrawText(close, closeAt);

            _cells.Add((new Rect(x, 0, cellWidth, BarHeight),
                        new Rect(closeAt.X, closeAt.Y, close.Width, close.Height)));

            x += cellWidth;
            context.FillRectangle(ThemeTokens.Border, new Rect(x - 1, 4, 1, BarHeight - 8));
        }

        context.FillRectangle(ThemeTokens.Border, new Rect(0, BarHeight - 1, Bounds.Width, 1));
    }
}
