// SPIKE CODE — ADR-341 D2, Phase 4. Not product; never shipped.
//
// SPIKE ITEM 2: custom drawing, the same two controls Phase 3 drew in WPF.
//
// THE COMPARISON THIS EXISTS TO MAKE: WPF gave these an immediate-mode retained
// drawing API — override OnRender, receive a DrawingContext, issue DrawRectangle /
// DrawLine / DrawText / DrawRoundedRectangle calls, done. WinUI 3 has no OnRender and
// no DrawingContext. The two options are:
//
//   (a) compose retained visual elements (Canvas + Shapes + TextBlocks), or
//   (b) add Win2D (Microsoft.Graphics.Win2D) for an immediate-mode CanvasControl.
//
// This takes (a), because it needs no extra dependency and is what a WinUI 3 developer
// reaches for first. The cost difference is the finding, and it is recorded in
// winui3-spike.md rather than argued.

using Microsoft.UI;
using Microsoft.UI.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Windows.Foundation;
using Windows.UI;

namespace Adr341.WinUi3Spike;

public sealed record TabItemModel(string Title, int? Badge = null);

/// <summary>Tab strip with accent bar and count badges — composed, not drawn.</summary>
public sealed partial class TabStrip : UserControl
{
    private readonly Canvas _canvas = new();
    private IReadOnlyList<TabItemModel> _items = [];

    public int SelectedIndex { get; private set; }
    public event Action<int>? SelectionChanged;

    public IReadOnlyList<TabItemModel> Items
    {
        get => _items;
        set { _items = value; Rebuild(); }
    }

    public TabStrip()
    {
        Content = _canvas;
        Loaded += (_, _) => Rebuild();
    }

    private void Rebuild()
    {
        _canvas.Children.Clear();
        if (_items.Count == 0) return;

        var fg = Theme.Brush("Foreground");
        var dim = Theme.Brush("ForegroundDim");
        var accent = Theme.Brush("Accent");

        var x = 8.0;
        for (var i = 0; i < _items.Count; i++)
        {
            var index = i;
            var item = _items[i];
            var selected = i == SelectedIndex;

            // Every visual is an element with a layout pass behind it. In WPF this
            // whole block was four DrawingContext calls inside one OnRender.
            var text = new TextBlock
            {
                Text = item.Title,
                FontSize = 12,
                Foreground = selected ? fg : dim,
                FontWeight = selected ? FontWeights.SemiBold : FontWeights.Normal,
            };
            text.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
            var tw = text.DesiredSize.Width;
            var w = tw + 24 + (item.Badge is null ? 0 : 26);

            var hit = new Rectangle { Width = w, Height = 32, Fill = new SolidColorBrush(Colors.Transparent) };
            Canvas.SetLeft(hit, x);
            hit.PointerPressed += (_, _) => { SelectedIndex = index; SelectionChanged?.Invoke(index); Rebuild(); };
            _canvas.Children.Add(hit);

            Canvas.SetLeft(text, x + 12);
            Canvas.SetTop(text, 7);
            _canvas.Children.Add(text);

            if (item.Badge is { } n)
            {
                var bw = Math.Max(18, n.ToString().Length * 7 + 10);
                var badge = new Rectangle
                {
                    Width = bw, Height = 16, RadiusX = 8, RadiusY = 8, Fill = accent
                };
                Canvas.SetLeft(badge, x + 12 + tw + 6);
                Canvas.SetTop(badge, 8);
                _canvas.Children.Add(badge);

                var bt = new TextBlock
                {
                    Text = n.ToString(), FontSize = 10,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = Theme.Brush("StatusBarText")
                };
                Canvas.SetLeft(bt, x + 12 + tw + 6 + bw / 2 - 4);
                Canvas.SetTop(bt, 9);
                _canvas.Children.Add(bt);
            }

            if (selected)
            {
                var bar = new Rectangle { Width = w, Height = 2, Fill = accent };
                Canvas.SetLeft(bar, x);
                Canvas.SetTop(bar, 30);
                _canvas.Children.Add(bar);
            }

            x += w;
        }
    }
}

public sealed record MapRoom(string Name, int Col, int Row, bool Reached = true, bool Displaced = false);
public sealed record MapLink(int From, int To, bool Door = false, bool Sealed_ = false);

/// <summary>The World map — rooms on a banded grid, composed from Shapes.</summary>
public sealed partial class WorldMap : UserControl
{
    private const double Cell = 116, BoxW = 96, BoxH = 44;
    private readonly Canvas _canvas = new();

    public IReadOnlyList<MapRoom> Rooms { get; set; } = [];
    public IReadOnlyList<MapLink> Links { get; set; } = [];

    public WorldMap()
    {
        Content = _canvas;
        Loaded += (_, _) => Rebuild();
        SizeChanged += (_, _) => Rebuild();
    }

    private Point Centre(MapRoom r) => new(r.Col * Cell + Cell / 2 + 20, r.Row * Cell + Cell / 2 + 20);

    public void Rebuild()
    {
        _canvas.Children.Clear();
        if (Rooms.Count == 0) return;

        // banded grid
        for (var row = 0; row * Cell < Math.Max(ActualHeight, 400); row++)
        {
            if (row % 2 != 1) continue;
            var band = new Rectangle
            {
                Width = Math.Max(ActualWidth, 400), Height = Cell,
                Fill = Theme.Brush("Foreground"), Opacity = 0.035
            };
            Canvas.SetTop(band, row * Cell + 20);
            _canvas.Children.Add(band);
        }

        foreach (var link in Links)
        {
            if (link.From >= Rooms.Count || link.To >= Rooms.Count) continue;
            var a = Centre(Rooms[link.From]);
            var b = Centre(Rooms[link.To]);
            var brush = link.Sealed_ ? Theme.Brush("WorldSealed")
                      : link.Door ? Theme.Brush("WorldDoor")
                      : Theme.Brush("WorldConnection");
            var line = new Line
            {
                X1 = a.X, Y1 = a.Y, X2 = b.X, Y2 = b.Y,
                Stroke = brush, StrokeThickness = link.Sealed_ ? 2 : 1.5
            };
            if (link.Sealed_) line.StrokeDashArray = [3, 3];
            _canvas.Children.Add(line);

            if (!link.Door) continue;
            var dot = new Ellipse { Width = 8, Height = 8, Fill = brush };
            Canvas.SetLeft(dot, (a.X + b.X) / 2 - 4);
            Canvas.SetTop(dot, (a.Y + b.Y) / 2 - 4);
            _canvas.Children.Add(dot);
        }

        foreach (var room in Rooms)
        {
            var c = Centre(room);
            var box = new Rectangle
            {
                Width = BoxW, Height = BoxH, RadiusX = 6, RadiusY = 6,
                Fill = room.Reached ? Theme.Brush("WorldRoomFill") : Theme.Brush("WorldRoomFillUnreached"),
                Stroke = room.Displaced ? Theme.Brush("WorldDisplaced")
                       : room.Reached ? Theme.Brush("Border")
                       : Theme.Brush("WorldUnreached"),
                StrokeThickness = room.Displaced ? 2 : 1
            };
            if (room.Displaced) box.StrokeDashArray = [4, 2];
            Canvas.SetLeft(box, c.X - BoxW / 2);
            Canvas.SetTop(box, c.Y - BoxH / 2);
            _canvas.Children.Add(box);

            var label = new TextBlock
            {
                Text = room.Name, FontSize = 11.5, TextWrapping = TextWrapping.Wrap,
                Width = BoxW - 12, TextAlignment = TextAlignment.Center,
                Foreground = room.Reached ? Theme.Brush("Foreground") : Theme.Brush("WorldUnreached")
            };
            Canvas.SetLeft(label, c.X - (BoxW - 12) / 2);
            Canvas.SetTop(label, c.Y - 9);
            _canvas.Children.Add(label);
        }
    }
}
