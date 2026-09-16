// Colors an AvaloniaEdit document from the real Chord lexer's token stream.
//
// The palette and the curated keyword/property sets mirror
// tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift and Theme.swift's dark
// values, so the two editors can be compared by eye rather than by description.
// Keyword-ness is a display choice, not language surface — the lexer has no
// keyword kind, which is exactly why the set is curated here and not invented.
//
// Public interface: ChordColorizer (Apply, TokenCount, RunCount, CommentLineCount).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using Avalonia.Media;
using AvaloniaEdit.Document;
using AvaloniaEdit.Rendering;
using PaneHost.Hosting;

namespace PaneHost.Editor;

/// <summary>One styled run on one source line: columns are 1-based, end exclusive.</summary>
internal readonly record struct StyledRun(int Column, int EndColumn, IBrush Brush);

/// <summary>A line transformer driven by a token index the host rebuilds after every change.</summary>
public sealed class ChordColorizer : DocumentColorizingTransformer
{
    /// <summary>Structural keywords colored as keywords when they appear as word tokens.</summary>
    private static readonly HashSet<string> Keywords = new(StringComparer.OrdinalIgnoreCase)
    {
        "story", "grammar", "create", "define", "extend", "remove",
        "action", "actions", "use", "means", "directions",
        "phrase", "phrases", "starts", "announce",
        "state", "states", "counter", "counters", "channel", "channels",
        "score", "scores", "rank", "ranks", "sequence", "machine",
        "topics", "pronouns", "trait", "traits",
        "manner", "greetings", "exchange", "initiative", "conversation",
        "beat", "conclusion",
        "timer", "chapters",
    };

    /// <summary>Header property keys — a `name:` field rather than a structural keyword.</summary>
    private static readonly HashSet<string> Properties = new(StringComparer.OrdinalIgnoreCase)
    {
        "title", "authors", "testers", "ifid", "id", "story-version",
        "prologue", "description", "client", "theme", "template",
        "themes", "default-theme", "storage-prefix", "publish-source",
    };

    // Theme.swift dark values; property teal is the spike's own choice, as the
    // OpenSilver spike's was.
    private static readonly IBrush KeywordBrush = new SolidColorBrush(Color.Parse("#CBA6F7"));
    private static readonly IBrush StringBrush = new SolidColorBrush(Color.Parse("#A6E3A1"));
    private static readonly IBrush NumberBrush = new SolidColorBrush(Color.Parse("#FAB387"));
    private static readonly IBrush PropertyBrush = new SolidColorBrush(Color.Parse("#94E2D5"));
    private static readonly IBrush CommentBrush = new SolidColorBrush(Color.Parse("#6C7086"));

    private Dictionary<int, List<StyledRun>> _runsByLine = new();
    private HashSet<int> _commentLines = new();

    public int TokenCount { get; private set; }
    public int CommentLineCount => _commentLines.Count;

    /// <summary>Runs actually built — the styling work, as opposed to the tokens read.</summary>
    public int RunCount { get; private set; }

    /// <summary>
    /// Rebuilds the whole styling index from a lex result. The document is read
    /// for token text because the service sends spans only, not text.
    /// </summary>
    public void Apply(LexResult lex, IReadOnlyList<string> kinds, TextDocument document)
    {
        var runs = new Dictionary<int, List<StyledRun>>();
        var comments = new HashSet<int>(lex.CommentLines);
        var flat = lex.Tokens;
        var runCount = 0;

        for (var i = 0; i + 4 < flat.Length; i += 5)
        {
            var kind = kinds[flat[i]];
            int line = flat[i + 1], column = flat[i + 2], endLine = flat[i + 3], endColumn = flat[i + 4];
            if (line != endLine) continue;              // no multi-line token kind today
            if (endColumn <= column) continue;

            var brush = kind switch
            {
                "string" => StringBrush,
                "number" => NumberBrush,
                "compare" => NumberBrush,
                "word" => WordBrush(flat, i, kinds, document, line, column, endColumn),
                _ => null,
            };
            if (brush is null) continue;

            if (!runs.TryGetValue(line, out var list)) runs[line] = list = new List<StyledRun>();
            list.Add(new StyledRun(column, endColumn, brush));
            runCount++;
        }

        _runsByLine = runs;
        _commentLines = comments;
        TokenCount = lex.TokenCount;
        RunCount = runCount;
    }

    /// <summary>A word is a keyword outright, or a property when the next token is a colon.</summary>
    private static IBrush? WordBrush(
        int[] flat, int i, IReadOnlyList<string> kinds, TextDocument document,
        int line, int column, int endColumn)
    {
        var text = TextOf(document, line, column, endColumn);
        if (text is null) return null;
        if (Keywords.Contains(text)) return KeywordBrush;
        if (!Properties.Contains(text)) return null;
        var nextKind = i + 5 < flat.Length ? kinds[flat[i + 5]] : null;
        return nextKind == "colon" ? PropertyBrush : null;
    }

    private static string? TextOf(TextDocument document, int line, int column, int endColumn)
    {
        if (line < 1 || line > document.LineCount) return null;
        var documentLine = document.GetLineByNumber(line);
        var start = documentLine.Offset + column - 1;
        var length = endColumn - column;
        if (start < documentLine.Offset || start + length > documentLine.EndOffset) return null;
        return document.GetText(start, length);
    }

    /// <summary>Colors one visual line: a comment line whole, otherwise run by run.</summary>
    protected override void ColorizeLine(DocumentLine line)
    {
        if (_commentLines.Contains(line.LineNumber))
        {
            if (line.Length > 0)
                ChangeLinePart(line.Offset, line.EndOffset, e => e.TextRunProperties.SetForegroundBrush(CommentBrush));
            return;
        }
        if (!_runsByLine.TryGetValue(line.LineNumber, out var runs)) return;

        foreach (var run in runs)
        {
            var start = line.Offset + run.Column - 1;
            var end = line.Offset + run.EndColumn - 1;
            if (start < line.Offset || end > line.EndOffset || end <= start) continue;
            ChangeLinePart(start, end, e => e.TextRunProperties.SetForegroundBrush(run.Brush));
        }
    }
}
