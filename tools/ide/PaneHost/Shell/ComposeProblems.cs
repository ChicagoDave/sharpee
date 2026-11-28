// The compose diagnostics surface's logic for the Avalonia head (ADR-258 D5, ADR-409 D7.2).
//
// The shipping Swift head has had a Problems list and editor underlines since ADR-258;
// this head ran `compose --check` as text into its log and showed neither. This file is
// everything that surface decides, kept out of the window so it can be pinned against a
// real compose: reading the `compose --json` payload, the rows the Problems list shows,
// which records' fixes still apply, and turning a fix into edits on a document.
//
// A fix arrives final: compose fills every form from the story's language before it
// writes the payload, so nothing here works a word out. A fix is offered only while its
// file still reads what the compose read — the story's buffer equals the composed
// content, and any other file (an imported fragment, which compose reads from disk) has
// no unsaved edits — because its spans describe that text and no other.
//
// Public interface: ComposeRun, ProblemRow, FixChange, ComposeProblems.Read, Rows,
// SpanRange, UnderlineRange, IsUnchangedSince, CurrentFixes, Changes, ChangesForAll,
// ApplyFix, ApplyAll.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json;
using AvaloniaEdit.Document;
using PaneHost.Protocol;

namespace PaneHost.Shell;

/// <summary>One finished compose: the story it composed, the buffer it read, and its records.</summary>
/// <param name="StoryFile">The story file the records' compile sites name.</param>
/// <param name="ComposedContent">The story text the compose read.</param>
/// <param name="Records">The payload's diagnostics, in its order.</param>
public sealed record ComposeRun(string StoryFile, string ComposedContent, IReadOnlyList<ComposeDiagnosticRecord> Records);

/// <summary>One Problems row: the record, its site as the list prints it, and its fix's label if it has one.</summary>
public sealed record ProblemRow(ComposeDiagnosticRecord Record, string Site, string? FixLabel);

/// <summary>One document change: <paramref name="Text"/> replaces <paramref name="Length"/> characters at <paramref name="Offset"/>.</summary>
public readonly record struct FixChange(int Offset, int Length, string Text);

public static class ComposeProblems
{
    /// <summary>The `compose --json` schema version this head reads (ADR-258 D5).</summary>
    public const long SchemaVersion = 2;

    /// <summary>Reads compose's stdout payload.</summary>
    /// <param name="json">The whole of compose's stdout.</param>
    /// <returns>The payload; null when it is not JSON, not a payload, or of another schema version.</returns>
    public static ComposeJsonPayload? Read(string json)
    {
        try
        {
            var payload = JsonSerializer.Deserialize<ComposeJsonPayload>(json);
            return payload is not null && payload.SchemaVersion == SchemaVersion ? payload : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>The Problems list's rows for one compose, in payload order.</summary>
    /// <param name="records">The payload's diagnostics.</param>
    /// <returns>One row per record: `file:line:column` for a compile site, `file:line` for the story config.</returns>
    public static IReadOnlyList<ProblemRow> Rows(IReadOnlyList<ComposeDiagnosticRecord> records) =>
        records.Select(r => new ProblemRow(
            r,
            r.Span is { } span ? $"{Path.GetFileName(r.File)}:{r.Line}:{span.Column}" : $"{Path.GetFileName(r.File)}:{r.Line}",
            r.Fix?.Label)).ToList();

    /// <summary>The character range a wire span covers in <paramref name="text"/> (1-based, end column exclusive).</summary>
    /// <returns>(offset, length); null when the span falls outside the text.</returns>
    public static (int Offset, int Length)? SpanRange(DiagnosticSpan span, string text)
    {
        var start = OffsetOf(span.Line, span.Column, text);
        var end = OffsetOf(span.EndLine, span.EndColumn, text);
        if (start is null || end is null || end < start) return null;
        return (start.Value, end.Value - start.Value);
    }

    /// <summary>
    /// The range to underline for a span: the whole span on one line, otherwise only its first
    /// line, so a block-sized diagnostic points rather than paints the block (the Swift head's
    /// SpanText.underlineRange rule).
    /// </summary>
    /// <returns>(offset, length); null when the span falls outside the text.</returns>
    public static (int Offset, int Length)? UnderlineRange(DiagnosticSpan span, string text)
    {
        if (span.EndLine <= span.Line) return SpanRange(span, text);
        if (OffsetOf(span.Line, span.Column, text) is not { } start) return null;
        var lineEnd = text.IndexOf('\n', start);
        var contentsEnd = lineEnd < 0 ? text.Length : (lineEnd > start && text[lineEnd - 1] == '\r' ? lineEnd - 1 : lineEnd);
        return contentsEnd > start ? (start, contentsEnd - start) : null;
    }

    /// <summary>
    /// Whether a file still reads what the run's compose read: the story's buffer equals the
    /// composed content; any other file has no unsaved edits.
    /// </summary>
    public static bool IsUnchangedSince(ComposeRun run, string path, Func<string, string?> bufferOf, Func<string, bool> isDirty) =>
        string.Equals(path, run.StoryFile, StringComparison.Ordinal)
            ? string.Equals(bufferOf(path) ?? ReadOrNull(path), run.ComposedContent, StringComparison.Ordinal)
            : !isDirty(path);

    /// <summary>The run's records whose fix still applies.</summary>
    /// <param name="run">The last compose.</param>
    /// <param name="bufferOf">A file's open buffer, or null when it is not open.</param>
    /// <param name="isDirty">Whether a file's open buffer has unsaved edits.</param>
    /// <returns>Fixed records whose file reads what the compose read, in payload order.</returns>
    public static IReadOnlyList<ComposeDiagnosticRecord> CurrentFixes(
        ComposeRun? run, Func<string, string?> bufferOf, Func<string, bool> isDirty)
    {
        if (run is null) return Array.Empty<ComposeDiagnosticRecord>();
        return run.Records.Where(r => r.Fix is not null && IsUnchangedSince(run, r.File, bufferOf, isDirty)).ToList();
    }

    /// <summary>The changes one fix makes to <paramref name="text"/>, last first.</summary>
    /// <returns>Changes in descending offset order; null when the fix has no edits, an edit's span does not fit, or two edits overlap.</returns>
    public static IReadOnlyList<FixChange>? Changes(ComposeFix fix, string text)
    {
        if (fix.Edits.Count == 0) return null;
        var changes = new List<FixChange>();
        foreach (var edit in fix.Edits)
        {
            if (SpanRange(edit.Span, text) is not { } range) return null;
            changes.Add(new FixChange(range.Offset, range.Length, edit.Text));
        }
        changes.Sort((a, b) => b.Offset.CompareTo(a.Offset));
        for (var i = 1; i < changes.Count; i++)
            if (changes[i].Offset + changes[i].Length > changes[i - 1].Offset) return null;
        return changes;
    }

    /// <summary>
    /// Every fix among <paramref name="records"/> sited in <paramref name="path"/>, merged into
    /// one change set, last first. A fix that does not fit, or that overlaps one already taken,
    /// is skipped and its diagnostic stays for the next compose.
    /// </summary>
    public static IReadOnlyList<FixChange> ChangesForAll(IEnumerable<ComposeDiagnosticRecord> records, string path, string text)
    {
        var taken = new List<FixChange>();
        foreach (var record in records.Where(r => string.Equals(r.File, path, StringComparison.Ordinal)))
        {
            if (record.Fix is not { } fix || Changes(fix, text) is not { } changes) continue;
            var overlaps = changes.Any(c => taken.Any(t =>
                t.Offset == c.Offset || (c.Offset < t.Offset + t.Length && t.Offset < c.Offset + c.Length)));
            if (!overlaps) taken.AddRange(changes);
        }
        taken.Sort((a, b) => b.Offset.CompareTo(a.Offset));
        return taken;
    }

    /// <summary>Applies one fix to the document it is sited in, as one undo step.</summary>
    /// <returns>False, changing nothing, when the fix's edits no longer fit the document.</returns>
    public static bool ApplyFix(TextDocument document, ComposeFix fix) =>
        Changes(fix, document.Text) is { } changes && Apply(document, changes);

    /// <summary>Applies every fix sited in <paramref name="path"/> to its document, as one undo step.</summary>
    /// <returns>How many changes were applied; 0 when none fit.</returns>
    public static int ApplyAll(TextDocument document, IEnumerable<ComposeDiagnosticRecord> records, string path)
    {
        var changes = ChangesForAll(records, path, document.Text);
        return changes.Count > 0 && Apply(document, changes) ? changes.Count : 0;
    }

    /// <summary>Replaces each range, last first, inside one update so one undo takes them all back.</summary>
    private static bool Apply(TextDocument document, IReadOnlyList<FixChange> changes)
    {
        if (changes.Any(c => c.Offset + c.Length > document.TextLength)) return false;
        document.BeginUpdate();
        try
        {
            foreach (var change in changes) document.Replace(change.Offset, change.Length, change.Text);
        }
        finally
        {
            document.EndUpdate();
        }
        return true;
    }

    /// <summary>The offset of a 1-based line and column; a column one past the line's content is valid.</summary>
    private static int? OffsetOf(long line, long column, string text)
    {
        if (line < 1 || column < 1) return null;
        var lineStart = 0;
        for (var current = 1L; current < line; current++)
        {
            var newline = text.IndexOf('\n', lineStart);
            if (newline < 0) return null;
            lineStart = newline + 1;
        }
        var lineEnd = text.IndexOf('\n', lineStart);
        var contentsEnd = lineEnd < 0 ? text.Length : (lineEnd > lineStart && text[lineEnd - 1] == '\r' ? lineEnd - 1 : lineEnd);
        var target = lineStart + (int)(column - 1);
        return target <= contentsEnd ? target : null;
    }

    private static string? ReadOrNull(string path)
    {
        try { return File.ReadAllText(path); }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }
}
