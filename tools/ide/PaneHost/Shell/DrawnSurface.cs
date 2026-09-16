// The base every custom-drawn surface in this spike derives from, and the
// instrument that answers Phase 4's central question.
//
// The question is whether Avalonia's Render(DrawingContext) is genuinely
// immediate-mode in WPF's sense — a method the framework calls to RE-RECORD a
// surface when it is invalidated — or retained composition wearing WPF's method
// name. A counter on every Render call, plus the ability to force one with
// InvalidateVisual, settles it by observation rather than by reading docs.
//
// Public interface: DrawnSurface (RenderCount, ResetRenderCount, Draw).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using Avalonia.Controls;
using Avalonia.Media;

namespace PaneHost.Shell;

/// <summary>A control that paints itself with a DrawingContext and counts how often it is asked to.</summary>
public abstract class DrawnSurface : Control
{
    private int _renderCount;

    /// <summary>How many times the framework has called Render on this instance.</summary>
    public int RenderCount => _renderCount;

    public void ResetRenderCount() => _renderCount = 0;

    /// <summary>Framework entry point. Counts the call, then hands off to <see cref="Draw"/>.</summary>
    public sealed override void Render(DrawingContext context)
    {
        _renderCount++;
        Draw(context);
    }

    /// <summary>Paint the surface. Called on first layout and on every invalidation.</summary>
    protected abstract void Draw(DrawingContext context);

    /// <summary>Shared text-shaping helper — one typeface for the whole shell.</summary>
    protected static FormattedText Text(string text, double size, IBrush brush, bool bold = false) =>
        new(text, System.Globalization.CultureInfo.CurrentCulture, Avalonia.Media.FlowDirection.LeftToRight,
            new Typeface("Menlo", weight: bold ? FontWeight.Bold : FontWeight.Normal), size, brush);
}
