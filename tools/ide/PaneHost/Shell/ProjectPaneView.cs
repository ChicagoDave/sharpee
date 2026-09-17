// ProjectArtifacts.swift's typed groups, drawn with a DrawingContext.
//
// The shipping pane groups a story folder into Story, Walkthroughs, Assets, Web
// Template and Other rather than showing a raw directory listing, and indents
// 14 px per level. Fed by fernhill's real folder, read-only.
//
// Public interface: ProjectPaneView (Load, FileSelected, FileCount).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using Avalonia;
using Avalonia.Input;
using Avalonia.Media;
using PaneHost.Theme;

namespace PaneHost.Shell;

/// <summary>One drawn row: a group header or a file.</summary>
internal sealed record PaneRow(string Label, int Level, bool IsHeader, string? Path);

/// <summary>The project pane: typed groups over a real story folder.</summary>
public sealed class ProjectPaneView : DrawnSurface
{
    private const double RowHeight = 20;
    private const double Indent = 14;
    private const double Pad = 10;

    private readonly List<PaneRow> _rows = new();

    /// <summary>The row a single click selected, drawn highlighted; -1 when none.</summary>
    private int _selected = -1;

    public int FileCount => _rows.Count(r => !r.IsHeader);

    /// <summary>
    /// Raised with the absolute path when a file row is DOUBLE-clicked, which is how the
    /// shipping app's project tree opens a file (`outlineView.doubleAction`). A single click
    /// selects the row and nothing more: opening on every click meant a stray click in the
    /// tree replaced what you were editing (GH #489).
    /// </summary>
    public event Action<string>? FileSelected;

    /// <summary>Groups a story folder the way ProjectArtifacts.swift groups it. Read-only.</summary>
    public void Load(string storyFolder)
    {
        _rows.Clear();
        _selected = -1;

        void Group(string title, IEnumerable<string> paths)
        {
            var list = paths.OrderBy(Path.GetFileName, StringComparer.Ordinal).ToList();
            if (list.Count == 0) return;
            _rows.Add(new PaneRow(title, 0, true, null));
            foreach (var path in list) _rows.Add(new PaneRow(Path.GetFileName(path), 1, false, path));
        }

        var top = Directory.Exists(storyFolder)
            ? Directory.GetFiles(storyFolder).Where(f => !Path.GetFileName(f).StartsWith('.')).ToList()
            : new List<string>();

        Group("Story", top.Where(f => f.EndsWith(".story") || f.EndsWith(".config.json")));
        Group("Walkthroughs", top.Where(f => Path.GetFileName(f).StartsWith("WALKTHROUGH") || f.EndsWith(".tests.json")));
        Group("Assets", SafeFiles(Path.Combine(storyFolder, "assets")));
        Group("Web Template", SafeFiles(Path.Combine(storyFolder, "browser")));
        Group("Other", top.Where(f => !f.EndsWith(".story") && !f.EndsWith(".config.json")
                                      && !f.EndsWith(".tests.json") && !Path.GetFileName(f).StartsWith("WALKTHROUGH")));

        InvalidateVisual();
    }

    private static IEnumerable<string> SafeFiles(string directory) =>
        Directory.Exists(directory) ? Directory.GetFiles(directory) : Array.Empty<string>();

    protected override Size MeasureOverride(Size availableSize) =>
        new(availableSize.Width, Math.Max(_rows.Count * RowHeight + Pad, availableSize.Height));

    protected override void Draw(DrawingContext context)
    {
        context.FillRectangle(ThemeTokens.ProjectBackground, new Rect(Bounds.Size));

        var y = Pad / 2;
        for (var i = 0; i < _rows.Count; i++)
        {
            var row = _rows[i];
            if (i == _selected)
                context.FillRectangle(ThemeTokens.Border, new Rect(0, y, Bounds.Width, RowHeight));

            var brush = row.IsHeader ? ThemeTokens.ForegroundFaint : ThemeTokens.Foreground;
            var text = Text(row.Label, row.IsHeader ? 10 : 11.5, brush, bold: row.IsHeader);
            context.DrawText(text, new Point(Pad + row.Level * Indent, y + (RowHeight - text.Height) / 2));
            y += RowHeight;
        }
    }

    /// <summary>
    /// One click selects the row; two open the file. The shipping app's tree behaves this
    /// way, and it is the difference between glancing at the project and losing the
    /// document you were editing to a stray click.
    /// </summary>
    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        var index = (int)((e.GetPosition(this).Y - Pad / 2) / RowHeight);
        if (index < 0 || index >= _rows.Count) return;
        if (_rows[index].Path is not { } path) return;

        _selected = index;
        InvalidateVisual();
        if (e.ClickCount >= 2) FileSelected?.Invoke(path);
    }
}
