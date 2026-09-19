// The build panel's closing report: the story's name in lights and its numbers, derived
// from the index of the IR a successful build just emitted.
//
// It counts the rows StoryIndex produced rather than walking the IR again with a second
// copy of the bucketing rules. The Index tab lists those same rows, so the tab and the
// banner cannot disagree about how many rooms a story has — which they would eventually,
// kept as two readers of one file.
//
// The shape is the shipping app's (SharpeeIDE/Compose/StoryIndex.swift, buildReport), and
// one rule of its own is worth stating: a zero count is omitted rather than printed, since
// the report celebrates what IS there. An empty section never reaches here at all.
//
// Public interface: StoryBuildReport.From.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text;

namespace PaneHost.Shell;

/// <summary>The build report the Build tab prints after a successful build.</summary>
internal static class StoryBuildReport
{
    private const int RuleWidth = 46;

    /// <summary>
    /// Builds the report for a story IR, or returns null when the IR cannot be read —
    /// a missing report is a quiet omission, never a failed build.
    /// </summary>
    /// <param name="irJson">The contents of the build's `dist/&lt;id&gt;.ir.json`.</param>
    internal static string? From(string irJson) =>
        StoryIndex.Read(irJson) is { } index ? From(index) : null;

    /// <summary>Builds the report from an already-read index.</summary>
    /// <param name="index">The story's index — its sections are what the counts count.</param>
    internal static string From(StoryIndexDocument index)
    {
        var counts = index.Sections
            .Select(section => section.Rows.Count == 1
                ? $"1 {section.Singular}"
                : $"{section.Rows.Count} {section.Plural}")
            .ToList();

        var rule = new string('\u2500', RuleWidth);
        var version = index.Version.Length > 0 ? " " + index.Version : "";
        var byline = index.Authors.Count == 0
            ? $"  {index.Id}{version}"
            : $"  by {string.Join(", ", index.Authors)} \u00b7 {index.Id}{version}";

        var report = new StringBuilder();
        report.AppendLine(rule);
        report.AppendLine($"  {index.Title}");
        report.AppendLine(byline);
        if (counts.Count > 0)
        {
            report.AppendLine();
            // Two rows of numbers read better than one long one.
            var mid = (counts.Count + 1) / 2;
            report.AppendLine("  " + string.Join(" \u00b7 ", counts.Take(mid)));
            if (counts.Count > mid)
                report.AppendLine("  " + string.Join(" \u00b7 ", counts.Skip(mid)));
        }
        report.AppendLine(rule);
        return report.ToString();
    }
}
