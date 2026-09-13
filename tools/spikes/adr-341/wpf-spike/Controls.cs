// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
//
// Spike items 5 and 6 from the parity table's list: the reusable tab strip (custom
// drawing — accent bar and count badges, reused by both panels and the World section
// strip) and the World map (custom 2D drawing of rooms on a banded grid with
// connections). Both are drawn rather than composed, because that is what the AppKit
// originals do and the question is how WPF's drawing layer feels doing it.

using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;

namespace Adr341.WpfSpike;

public sealed record TabItemModel(string Title, int? Badge = null, bool Closeable = false, bool Dirty = false);

/// <summary>
/// Custom-drawn tab strip: accent bar under the selection, count badges, and — for
/// editor tabs — a close box and an unsaved-change dot. The close box replaces the dot
/// on hover, which is how every editor with both signals resolves the collision.
/// </summary>
public sealed class TabStrip : FrameworkElement
{
    private readonly List<(TabItemModel Item, Rect Rect, Rect Close)> _hit = [];
    private int _hover = -1;
    private int _hoverClose = -1;

    public IReadOnlyList<TabItemModel> Items { get; set; } = [];
    public int SelectedIndex { get; set; }
    public event Action<int>? SelectionChanged;
    public event Action<int>? CloseRequested;

    public TabStrip()
    {
        Height = 32;
        Theme.Changed += InvalidateVisual;
        MouseMove += (_, e) =>
        {
            var p = e.GetPosition(this);
            var i = _hit.FindIndex(h => h.Rect.Contains(p));
            var c = _hit.FindIndex(h => h.Close != Rect.Empty && h.Close.Contains(p));
            if (i != _hover || c != _hoverClose) { _hover = i; _hoverClose = c; InvalidateVisual(); }
        };
        MouseLeave += (_, _) => { _hover = -1; _hoverClose = -1; InvalidateVisual(); };
        MouseLeftButtonDown += (_, e) =>
        {
            var p = e.GetPosition(this);
            var c = _hit.FindIndex(h => h.Close != Rect.Empty && h.Close.Contains(p));
            if (c >= 0) { CloseRequested?.Invoke(c); return; }
            var i = _hit.FindIndex(h => h.Rect.Contains(p));
            if (i >= 0) { SelectedIndex = i; SelectionChanged?.Invoke(i); InvalidateVisual(); }
        };
        // Middle-click closes, as in every editor that has closeable tabs.
        MouseDown += (_, e) =>
        {
            if (e.ChangedButton != MouseButton.Middle) return;
            var p = e.GetPosition(this);
            var i = _hit.FindIndex(h => h.Rect.Contains(p));
            if (i >= 0 && _hit[i].Item.Closeable) CloseRequested?.Invoke(i);
        };
        Cursor = Cursors.Hand;
    }

    protected override void OnRender(DrawingContext dc)
    {
        _hit.Clear();
        var bg = Theme.Brush("ProjectBackground");
        var fg = Theme.Brush("Foreground");
        var dim = Theme.Brush("ForegroundDim");
        var accent = Theme.Brush("Accent");
        var border = Theme.Brush("Border");

        dc.DrawRectangle(bg, null, new Rect(0, 0, ActualWidth, ActualHeight));
        dc.DrawLine(new Pen(border, 1), new Point(0, ActualHeight - 0.5), new Point(ActualWidth, ActualHeight - 0.5));

        var x = 8.0;
        for (var i = 0; i < Items.Count; i++)
        {
            var item = Items[i];
            var selected = i == SelectedIndex;
            var text = Text(item.Title, selected ? fg : dim, selected ? FontWeights.SemiBold : FontWeights.Normal);
            var w = text.Width + 24 + (item.Badge is null ? 0 : 26) + (item.Closeable ? 20 : 0);
            var rect = new Rect(x, 0, w, ActualHeight);

            var closeRect = Rect.Empty;
            if (item.Closeable)
                closeRect = new Rect(x + w - 22, (ActualHeight - 16) / 2, 16, 16);
            _hit.Add((item, rect, closeRect));

            if (i == _hover && !selected)
            {
                var hb = fg.Clone(); hb.Opacity = 0.06; hb.Freeze();
                dc.DrawRectangle(hb, null, rect);
            }

            dc.DrawText(text, new Point(x + 12, (ActualHeight - text.Height) / 2 - 1));

            if (item.Closeable)
            {
                var overTab = i == _hover || selected;
                if (item.Dirty && i != _hoverClose)
                {
                    // unsaved-change dot
                    dc.DrawEllipse(selected ? fg : dim, null,
                        new Point(closeRect.X + 8, closeRect.Y + 8), 4, 4);
                }
                else if (overTab)
                {
                    if (i == _hoverClose)
                    {
                        var hb = fg.Clone(); hb.Opacity = 0.14; hb.Freeze();
                        dc.DrawRoundedRectangle(hb, null, closeRect, 3, 3);
                    }
                    var pen = new Pen(i == _hoverClose ? fg : dim, 1.2);
                    var (cx, cy) = (closeRect.X + 8, closeRect.Y + 8);
                    dc.DrawLine(pen, new Point(cx - 3.5, cy - 3.5), new Point(cx + 3.5, cy + 3.5));
                    dc.DrawLine(pen, new Point(cx + 3.5, cy - 3.5), new Point(cx - 3.5, cy + 3.5));
                }
            }

            if (item.Badge is { } n)
            {
                var badge = Text(n.ToString(CultureInfo.InvariantCulture), Theme.Brush("StatusBarText"), FontWeights.SemiBold, 10);
                var bx = x + 12 + text.Width + 6;
                var by = (ActualHeight - 16) / 2;
                dc.DrawRoundedRectangle(accent, null, new Rect(bx, by, Math.Max(18, badge.Width + 10), 16), 8, 8);
                dc.DrawText(badge, new Point(bx + (Math.Max(18, badge.Width + 10) - badge.Width) / 2, by + 2));
            }

            // the accent bar — the strip's signature
            if (selected)
                dc.DrawRectangle(accent, null, new Rect(x, ActualHeight - 2, w, 2));

            x += w;
        }
    }

    private FormattedText Text(string s, Brush b, FontWeight weight, double size = 12) =>
        new(s, CultureInfo.CurrentUICulture, FlowDirection.LeftToRight,
            new Typeface(new FontFamily("Segoe UI"), FontStyles.Normal, weight, FontStretches.Normal),
            size, b, VisualTreeHelper.GetDpi(this).PixelsPerDip);
}

public sealed record MapRoom(string Name, int Col, int Row, bool Reached = true, bool Displaced = false);
public sealed record MapLink(int From, int To, bool Door = false, bool Sealed_ = false);

/// <summary>Custom 2D drawing: rooms on a banded grid, connections between them.</summary>
public sealed class WorldMap : FrameworkElement
{
    private const double Cell = 116, BoxW = 96, BoxH = 44;

    public IReadOnlyList<MapRoom> Rooms { get; set; } = [];
    public IReadOnlyList<MapLink> Links { get; set; } = [];

    public WorldMap() => Theme.Changed += InvalidateVisual;

    private Point Centre(MapRoom r) => new(r.Col * Cell + Cell / 2 + 20, r.Row * Cell + Cell / 2 + 20);

    protected override void OnRender(DrawingContext dc)
    {
        dc.DrawRectangle(Theme.Brush("PlayBackground"), null, new Rect(0, 0, ActualWidth, ActualHeight));

        // banded grid — alternating rows, the backdrop the AppKit map draws
        var band = Theme.Brush("Foreground").Clone(); band.Opacity = 0.035; band.Freeze();
        for (var row = 0; row * Cell < ActualHeight; row++)
            if (row % 2 == 1)
                dc.DrawRectangle(band, null, new Rect(0, row * Cell + 20, ActualWidth, Cell));

        foreach (var link in Links)
        {
            if (link.From >= Rooms.Count || link.To >= Rooms.Count) continue;
            var a = Centre(Rooms[link.From]);
            var b = Centre(Rooms[link.To]);
            var brush = link.Sealed_ ? Theme.Brush("WorldSealed")
                      : link.Door ? Theme.Brush("WorldDoor")
                      : Theme.Brush("WorldConnection");
            var pen = new Pen(brush, link.Sealed_ ? 2 : 1.5);
            if (link.Sealed_) pen.DashStyle = new DashStyle([3, 3], 0);
            dc.DrawLine(pen, a, b);
            if (link.Door)
                dc.DrawEllipse(brush, null, new Point((a.X + b.X) / 2, (a.Y + b.Y) / 2), 4, 4);
        }

        foreach (var room in Rooms)
        {
            var c = Centre(room);
            var rect = new Rect(c.X - BoxW / 2, c.Y - BoxH / 2, BoxW, BoxH);
            var fill = room.Reached ? Theme.Brush("WorldRoomFill") : Theme.Brush("WorldRoomFillUnreached");
            var stroke = room.Displaced ? Theme.Brush("WorldDisplaced")
                       : room.Reached ? Theme.Brush("Border")
                       : Theme.Brush("WorldUnreached");
            var pen = new Pen(stroke, room.Displaced ? 2 : 1);
            if (room.Displaced) pen.DashStyle = new DashStyle([4, 2], 0);
            dc.DrawRoundedRectangle(fill, pen, rect, 6, 6);

            var fg = room.Reached ? Theme.Brush("Foreground") : Theme.Brush("WorldUnreached");
            var t = new FormattedText(room.Name, CultureInfo.CurrentUICulture, FlowDirection.LeftToRight,
                new Typeface(new FontFamily("Segoe UI"), FontStyles.Normal, FontWeights.Normal, FontStretches.Normal),
                11.5, fg, VisualTreeHelper.GetDpi(this).PixelsPerDip) { MaxTextWidth = BoxW - 12, MaxLineCount = 2 };
            dc.DrawText(t, new Point(c.X - t.Width / 2, c.Y - t.Height / 2));
        }
    }
}
