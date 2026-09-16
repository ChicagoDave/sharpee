// WorldMapView.swift, drawn with a DrawingContext.
//
// Layout metrics from the shipping control (as recorded by the OpenSilver
// spike's Phase 4): 108×34 boxes, 24×22 gaps, 16 margin, 20 px band header,
// 18 px band gap, levels highest-first sharing one x origin. Doors dashed,
// start room stroked 2 px accent, displaced rooms dashed mauve, rooms play
// never reaches faded.
//
// Fed by the REAL analyzer: `sharpee compose` → `sharpee world-index`, the same
// JSON the IDE's World tab reads. Nothing here is synthetic.
//
// Public interface: WorldMapView (Load, RoomCount, ConnectionCount, DisplacedCount).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Text.Json;
using Avalonia;
using Avalonia.Media;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>One placed room: its compass cell and the flags the map colours by.</summary>
internal sealed record MapRoom(string Id, int X, int Y, int Z, bool IsStart, bool Displaced, bool Reached);

/// <summary>One passage between two rooms; <paramref name="Door"/> non-null means a door sits in it.</summary>
internal sealed record MapLink(string From, string To, string? Door);

/// <summary>The World tab's map, drawn from world-index output.</summary>
public sealed class WorldMapView : DrawnSurface
{
    private const double BoxWidth = 108, BoxHeight = 34;
    private const double GapX = 24, GapY = 22;
    private const double Pad = 16;
    private const double BandHeader = 20, BandGap = 18;

    private readonly List<MapRoom> _rooms = new();
    private readonly List<MapLink> _links = new();
    private readonly Dictionary<string, Rect> _boxes = new();
    private Size _content = new(400, 200);

    public int RoomCount => _rooms.Count;
    public int ConnectionCount => _links.Count;
    public int DisplacedCount => _rooms.Count(r => r.Displaced);
    public int LevelCount => _rooms.Select(r => r.Z).Distinct().Count();
    public int DoorCount => _links.Count(l => l.Door is not null);

    /// <summary>Reads a world-index document and lays the map out. Repaints.</summary>
    /// <exception cref="JsonException">The file is not world-index JSON.</exception>
    public void Load(string worldIndexPath)
    {
        using var json = JsonDocument.Parse(File.ReadAllText(worldIndexPath));
        var map = json.RootElement.GetProperty("map");
        var start = map.GetProperty("start").GetString();

        var displaced = map.GetProperty("collisions").EnumerateArray()
            .Select(c => c.GetProperty("room").GetString()!).ToHashSet();

        // reach.rooms is {total, reachable[], unreached[]} — a summary object, not a list.
        var reached = json.RootElement.TryGetProperty("reach", out var reach)
            && reach.TryGetProperty("rooms", out var reachRooms)
            && reachRooms.TryGetProperty("reachable", out var reachable)
            ? reachable.EnumerateArray().Select(r => r.GetString()!).ToHashSet()
            : new HashSet<string>();

        _rooms.Clear();
        foreach (var position in map.GetProperty("positions").EnumerateArray())
        {
            var id = position.GetProperty("room").GetString()!;
            var cell = position.GetProperty("cell");
            _rooms.Add(new MapRoom(
                id,
                cell.GetProperty("x").GetInt32(),
                cell.GetProperty("y").GetInt32(),
                cell.GetProperty("z").GetInt32(),
                id == start,
                displaced.Contains(id),
                reached.Count == 0 || reached.Contains(id)));
        }

        _links.Clear();
        foreach (var connection in map.GetProperty("connections").EnumerateArray())
        {
            var pair = connection.GetProperty("rooms").EnumerateArray().Select(r => r.GetString()!).ToArray();
            var via = connection.GetProperty("via");
            _links.Add(new MapLink(pair[0], pair[1], via.ValueKind == JsonValueKind.String ? via.GetString() : null));
        }

        LayoutBoxes();
        InvalidateVisual();
    }

    /// <summary>
    /// The Swift view's `layoutBoxes`, transliterated: one band per level, highest
    /// first, every band sharing one x origin so a room keeps its column across levels.
    /// </summary>
    private void LayoutBoxes()
    {
        _boxes.Clear();
        if (_rooms.Count == 0) { _content = new Size(400, 200); return; }

        var minX = _rooms.Min(r => r.X);
        var levels = _rooms.Select(r => r.Z).Distinct().OrderByDescending(z => z).ToList();
        var maxWidth = 0.0;
        var y = Pad;

        foreach (var level in levels)
        {
            y += BandHeader;
            var band = _rooms.Where(r => r.Z == level).ToList();
            var minY = band.Min(r => r.Y);
            var rows = band.Max(r => r.Y) - minY + 1;

            foreach (var room in band)
            {
                var left = Pad + (room.X - minX) * (BoxWidth + GapX);
                // Compass north is up, so a higher y cell sits nearer the top of its band.
                var top = y + (band.Max(r => r.Y) - room.Y) * (BoxHeight + GapY);
                _boxes[room.Id] = new Rect(left, top, BoxWidth, BoxHeight);
                maxWidth = Math.Max(maxWidth, left + BoxWidth + Pad);
            }

            y += rows * (BoxHeight + GapY) + BandGap;
        }

        _content = new Size(maxWidth, y + Pad);
    }

    protected override Size MeasureOverride(Size availableSize) => _content;

    protected override void Draw(DrawingContext context)
    {
        context.FillRectangle(ThemeTokens.EditorBackground, new Rect(Bounds.Size));
        if (_rooms.Count == 0) return;

        // Band headers first, so boxes and links draw over them.
        var levels = _rooms.Select(r => r.Z).Distinct().OrderByDescending(z => z).ToList();
        foreach (var level in levels)
        {
            var band = _rooms.Where(r => r.Z == level).ToList();
            var top = band.Min(r => _boxes[r.Id].Y) - BandHeader;
            var label = Text(level == 0 ? "ground" : level > 0 ? $"level +{level}" : $"level {level}",
                10.5, ThemeTokens.ForegroundFaint);
            context.DrawText(label, new Point(Pad, top));
        }

        var connection = new Pen(ThemeTokens.WorldConnection, 1.5);
        var door = new Pen(ThemeTokens.WorldDoor, 1.5, new DashStyle(new double[] { 4, 3 }, 0));

        foreach (var link in _links)
        {
            if (!_boxes.TryGetValue(link.From, out var a) || !_boxes.TryGetValue(link.To, out var b)) continue;
            context.DrawLine(link.Door is null ? connection : door, a.Center, b.Center);
        }

        foreach (var room in _rooms)
        {
            var box = _boxes[room.Id];
            var fill = room.Reached ? ThemeTokens.WorldRoomFill : ThemeTokens.WorldRoomFillUnreached;
            var pen = room switch
            {
                { IsStart: true } => new Pen(ThemeTokens.Accent, 2),
                { Displaced: true } => new Pen(ThemeTokens.WorldDisplaced, 1.5, new DashStyle(new double[] { 3, 2 }, 0)),
                { Reached: false } => new Pen(ThemeTokens.WorldUnreached, 1),
                _ => new Pen(ThemeTokens.Border, 1),
            };
            context.DrawRectangle(fill, pen, new RoundedRect(box, 5));

            var name = Text(room.Id, 10.5, room.Reached ? ThemeTokens.Foreground : ThemeTokens.WorldUnreached);
            var clipped = Math.Min(name.Width, BoxWidth - 10);
            using (context.PushClip(box.Deflate(5)))
                context.DrawText(name, new Point(box.X + (BoxWidth - clipped) / 2, box.Y + (BoxHeight - name.Height) / 2));
        }
    }
}
