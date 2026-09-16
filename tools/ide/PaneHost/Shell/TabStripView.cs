// TabStripView.swift, drawn with a DrawingContext.
//
// Metrics from the shipping control (as recorded by the OpenSilver spike's
// Phase 4): 30 px on the rail background, 12 px-inset text tabs, the active tab
// on the play background with a 2 px accent bar across its top, red count
// badges 14 px tall with radius 7, a 1 px bottom border.
//
// Public interface: TabStripView (Tabs, ActiveIndex, Badges, Selected).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using Avalonia;
using Avalonia.Input;
using Avalonia.Media;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>A row of text tabs with optional count badges.</summary>
public sealed class TabStripView : DrawnSurface
{
    private const double BarHeight = 30;
    private const double Inset = 12;
    private const double AccentBar = 2;
    private const double BadgeHeight = 14;
    private const double FontSize = 11.5;

    public static readonly StyledProperty<int> ActiveIndexProperty =
        AvaloniaProperty.Register<TabStripView, int>(nameof(ActiveIndex));

    static TabStripView()
    {
        // The property that changes what is painted must invalidate the paint —
        // Avalonia's equivalent of WPF's FrameworkPropertyMetadata AffectsRender.
        AffectsRender<TabStripView>(ActiveIndexProperty);
    }

    private readonly List<double> _tabRights = new();

    public IReadOnlyList<string> Tabs { get; set; } = Array.Empty<string>();

    /// <summary>Tab index → count; absent or zero draws no badge.</summary>
    public IReadOnlyDictionary<int, int> Badges { get; set; } = new Dictionary<int, int>();

    public int ActiveIndex
    {
        get => GetValue(ActiveIndexProperty);
        set => SetValue(ActiveIndexProperty, value);
    }

    /// <summary>Raised with the tab index when one is clicked.</summary>
    public event Action<int>? Selected;

    public TabStripView() => MinHeight = BarHeight;

    protected override Size MeasureOverride(Size availableSize) => new(availableSize.Width, BarHeight);

    protected override void Draw(DrawingContext context)
    {
        var width = Bounds.Width;
        context.FillRectangle(ThemeTokens.RailBackground, new Rect(0, 0, width, BarHeight));

        _tabRights.Clear();
        var x = 0.0;
        for (var i = 0; i < Tabs.Count; i++)
        {
            var label = Text(Tabs[i], FontSize, i == ActiveIndex ? ThemeTokens.Foreground : ThemeTokens.ForegroundDim);
            var badge = Badges.TryGetValue(i, out var count) && count > 0 ? count : 0;
            var badgeWidth = badge > 0 ? BadgeWidth(badge) + 6 : 0;
            var tabWidth = Inset + label.Width + badgeWidth + Inset;

            if (i == ActiveIndex)
            {
                context.FillRectangle(ThemeTokens.PlayBackground, new Rect(x, 0, tabWidth, BarHeight));
                context.FillRectangle(ThemeTokens.Accent, new Rect(x, 0, tabWidth, AccentBar));
            }

            context.DrawText(label, new Point(x + Inset, (BarHeight - label.Height) / 2));

            if (badge > 0)
            {
                var badgeText = Text(badge.ToString(), 9.5, ThemeTokens.StatusBarText, bold: true);
                var bw = BadgeWidth(badge);
                var bx = x + Inset + label.Width + 6;
                var by = (BarHeight - BadgeHeight) / 2;
                context.DrawRectangle(ThemeTokens.BadgeBackground, null,
                    new RoundedRect(new Rect(bx, by, bw, BadgeHeight), BadgeHeight / 2));
                context.DrawText(badgeText, new Point(bx + (bw - badgeText.Width) / 2, by + (BadgeHeight - badgeText.Height) / 2));
            }

            x += tabWidth;
            _tabRights.Add(x);
        }

        context.FillRectangle(ThemeTokens.Border, new Rect(0, BarHeight - 1, width, 1));
    }

    private static double BadgeWidth(int count) => Math.Max(BadgeHeight, 8 + count.ToString().Length * 6);

    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        var x = e.GetPosition(this).X;
        for (var i = 0; i < _tabRights.Count; i++)
        {
            if (x > _tabRights[i]) continue;
            ActiveIndex = i;
            Selected?.Invoke(i);
            return;
        }
    }
}
