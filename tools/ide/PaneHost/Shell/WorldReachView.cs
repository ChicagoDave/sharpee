// The Reach view (ADR-321 D4): can the player get to what the author wrote?
//
// A headline over a sectioned list of what the analyzer's walk found — rooms play never
// arrives at, exits that never open, exits to nowhere, things it can never hold, and things
// it can hold with nothing written on them. Plus the unnamed-tool finding, which is
// Reach-ADJACENT rather than a Reach finding: it comes from prose and roles, not the walk,
// and is deliberately absent from `findingCount`. It renders here because it answers the
// same question one step further along — can the player actually get on?
//
// The view renders; it derives nothing. Rows is a pure function of the analyzer's answer,
// which is what lets a test pin the wording against a real story's analysis with no app
// running. Ported from SharpeeIDE/World/WorldReachView.swift, wording included: an author
// reading the two heads should not be told the same finding in two different ways.
//
// A section appears only when it holds something — a story with no broken exits should not
// be shown a broken-exit heading with nothing under it.
//
// Public interface: WorldReachView (Load, Headline, RowCount, FindingActivated), WorldFindingRow.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json.Nodes;
using Avalonia;
using Avalonia.Input;
using Avalonia.Media;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>One row of a findings list: a section header, or one finding.</summary>
/// <param name="Title">The finding, or the section's heading.</param>
/// <param name="Detail">Why it is a finding, or null.</param>
/// <param name="IsHeader">True for a section heading.</param>
/// <param name="Severe">True to tint it as a blocker rather than a note.</param>
/// <param name="Line">The source line it names, or null when it names none.</param>
internal sealed record WorldFindingRow(
    string Title, string? Detail, bool IsHeader, bool Severe, int? Line);

/// <summary>The World pane's Reach sub-pane.</summary>
public sealed class WorldReachView : DrawnSurface
{
    private const double RowHeight = 20;
    private const double Pad = 10;
    private const double Indent = 14;
    private const double HeadlineHeight = 26;

    private readonly List<WorldFindingRow> _rows = new();
    private string _headline = "";

    /// <summary>Raised with a source line when a finding naming one is double-clicked.</summary>
    internal event Action<int>? FindingActivated;

    /// <summary>The one-line summary above the list.</summary>
    public string Headline => _headline;

    /// <summary>How many findings are listed, headers excluded.</summary>
    public int RowCount => _rows.Count(r => !r.IsHeader);

    /// <summary>Reads a world-index file and renders its reach section.</summary>
    /// <param name="worldIndexPath">The JSON `sharpee world-index` wrote.</param>
    public void Load(string worldIndexPath)
    {
        try
        {
            var index = JsonNode.Parse(File.ReadAllText(worldIndexPath));
            Load(index?["reach"], index?["unnamedTools"] as JsonArray);
        }
        catch
        {
            Load(null, null);
        }
    }

    /// <summary>Renders one story's reachability.</summary>
    /// <param name="reach">The analyzer's reach result, or null when there is none.</param>
    /// <param name="unnamedTools">Things the mechanics need that nothing announces (D13).</param>
    internal void Load(JsonNode? reach, JsonArray? unnamedTools)
    {
        _headline = Headline0(reach, unnamedTools);
        _rows.Clear();
        _rows.AddRange(Rows(reach, unnamedTools));
        InvalidateVisual();
    }

    /// <summary>
    /// The headline: rooms first, because the room count is the number an author checks
    /// against what they think they wrote; findings second, and called findings rather than
    /// errors, since an unreached room can be deliberate. The unannounced count is its own
    /// clause because it is its own claim — a story can be entirely reachable and still
    /// never tell the player a thing exists.
    /// </summary>
    internal static string Headline0(JsonNode? reach, JsonArray? unnamedTools)
    {
        if (reach is null) return "no world analysis yet — build the story";

        var total = reach["rooms"]?["total"]?.GetValue<int>() ?? 0;
        var rooms = total == 1 ? "1 room" : $"{total} rooms";
        var start = reach["start"]?.GetValue<string>() is { } s ? $"from {s}" : "no start room declared";
        var findings = reach["findingCount"]?.GetValue<int>() ?? 0;
        var reachability = findings switch
        {
            0 => "nothing unreachable",
            1 => "1 finding",
            _ => $"{findings} findings",
        };

        var unnamed = unnamedTools?.Count ?? 0;
        if (unnamed == 0) return $"{rooms} · {start} · {reachability}";
        var unannounced = unnamed == 1 ? "1 thing nothing mentions" : $"{unnamed} things nothing mentions";
        return $"{rooms} · {start} · {reachability} · {unannounced}";
    }

    /// <summary>The sectioned list, derived from the analyzer's answer.</summary>
    internal static IReadOnlyList<WorldFindingRow> Rows(JsonNode? reach, JsonArray? unnamedTools)
    {
        var rows = new List<WorldFindingRow>();
        if (reach is null) return rows;

        void Header(string title, int count) =>
            rows.Add(new WorldFindingRow($"{title} · {count}", null, true, false, null));

        static JsonArray Items(JsonNode? node) => node as JsonArray ?? new JsonArray();
        static string? Str(JsonNode? node, string key) => node?[key]?.GetValue<string>();
        static int? Line(JsonNode? node) => node?["line"]?.GetValue<int>();

        var unreached = Items(reach["rooms"]?["unreached"]);
        if (unreached.Count > 0)
        {
            Header("Rooms play never arrives at", unreached.Count);
            foreach (var room in unreached)
                rows.Add(new WorldFindingRow(room?.GetValue<string>() ?? "?", null, false, false, null));
        }

        var blocked = Items(reach["blocked"]);
        if (blocked.Count > 0)
        {
            Header("Exits that never open", blocked.Count);
            foreach (var edge in blocked)
                rows.Add(new WorldFindingRow(
                    $"{Str(edge, "from")} {Str(edge, "direction")} → {Str(edge, "to")}",
                    Str(edge, "reason"), false, true, Line(edge)));
        }

        var broken = Items(reach["brokenExits"]);
        if (broken.Count > 0)
        {
            Header("Exits to nowhere", broken.Count);
            foreach (var exit in broken)
                rows.Add(new WorldFindingRow(
                    $"{Str(exit, "from")} {Str(exit, "direction")} → {Str(exit, "to")}",
                    "names no room in this story", false, true, Line(exit)));
        }

        var stranded = Items(reach["stranded"]);
        if (stranded.Count > 0)
        {
            Header("Things play can never hold", stranded.Count);
            foreach (var thing in stranded)
                rows.Add(new WorldFindingRow(
                    Str(thing, "name") ?? "?", Str(thing, "reason"), false, false, Line(thing)));
        }

        var unread = Items(reach["nothingToRead"]);
        if (unread.Count > 0)
        {
            Header("Reachable, with nothing written", unread.Count);
            foreach (var thing in unread)
                rows.Add(new WorldFindingRow(
                    Str(thing, "name") ?? "?",
                    Str(thing, "room") is { } room ? $"in {room}" : "carried or contained",
                    false, false, Line(thing)));
        }

        var unnamed = unnamedTools ?? new JsonArray();
        if (unnamed.Count > 0)
        {
            // Last, and named for what it costs the player rather than for what the analyzer
            // measured: every other section here is a thing play cannot get to, and this one
            // is a thing play is never told about.
            Header("Nothing tells the player these exist", unnamed.Count);
            foreach (var thing in unnamed)
            {
                var place = Str(thing, "room") is { } room ? $"in {room}" : "placed nowhere";
                var progression = Str(thing, "role") == "progressionInfo";
                rows.Add(new WorldFindingRow(
                    Str(thing, "name") ?? "?",
                    progression ? $"{place} · the story cannot be finished without it" : place,
                    false, progression, Line(thing)));
            }
        }

        return rows;
    }

    /// <summary>
    /// The content's own size, and only as tall as the viewport when the viewport has a
    /// height at all. A ScrollViewer measures with infinite height, so clamping to
    /// availableSize unconditionally returns infinity — which Avalonia refuses, taking the
    /// whole window down with "Invalid size returned for Measure".
    /// </summary>
    protected override Size MeasureOverride(Size availableSize)
    {
        var height = HeadlineHeight + _rows.Count * RowHeight + Pad;
        var width = double.IsInfinity(availableSize.Width) ? 0 : availableSize.Width;
        return new Size(
            width,
            double.IsInfinity(availableSize.Height) ? height : Math.Max(height, availableSize.Height));
    }

    protected override void Draw(DrawingContext context)
    {
        context.FillRectangle(ThemeTokens.PlayBackground, new Rect(Bounds.Size));

        var headline = Text(_headline, 11, ThemeTokens.ForegroundDim);
        context.DrawText(headline, new Point(Pad, 6));

        if (_rows.Count == 0)
        {
            var clean = Text(
                "Every room, every exit, and everything in them is reachable from the start, "
                + "and the prose introduces all of it.",
                11, ThemeTokens.ForegroundFaint);
            context.DrawText(clean, new Point(Pad, HeadlineHeight + 4));
            return;
        }

        var y = HeadlineHeight;
        foreach (var row in _rows)
        {
            if (row.IsHeader)
            {
                var header = Text(row.Title, 10, ThemeTokens.ForegroundFaint, bold: true);
                context.DrawText(header, new Point(Pad, y + (RowHeight - header.Height) / 2));
            }
            else
            {
                var ink = row.Severe ? ThemeTokens.WorldSealed : ThemeTokens.WorldUnreached;
                var title = Text(row.Title, 11.5, ink);
                context.DrawText(title, new Point(Pad + Indent, y + (RowHeight - title.Height) / 2));

                if (row.Detail is { } detail)
                {
                    var note = Text(detail, 10, ThemeTokens.ForegroundFaint);
                    context.DrawText(note,
                        new Point(Pad + Indent + title.Width + 8, y + (RowHeight - note.Height) / 2));
                }
            }
            y += RowHeight;
        }
    }

    /// <summary>A double click on a finding that names a source line opens that line.</summary>
    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        if (e.ClickCount < 2) return;

        var index = (int)((e.GetPosition(this).Y - HeadlineHeight) / RowHeight);
        if (index < 0 || index >= _rows.Count) return;
        if (_rows[index] is { IsHeader: false, Line: { } line }) FindingActivated?.Invoke(line);
    }
}
