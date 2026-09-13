// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
//
// The D4 premise under test: one grammar, two native editors. This drives
// AvalonEdit's colouring from tree-sitter query captures instead of from a .xshd
// syntax definition, so the Windows editor would consume ADR-182's grammar rather
// than adding a third definition of Chord's syntax.
//
// Route: DocumentColorizingTransformer (the per-line extension point Phase 2
// verified is public). Capture names map onto ADR-297's token colours.
//
// NOTE ON THE GRAMMAR: ADR-182 is accepted and unimplemented, and D4 sequences it
// into the Swift app BEFORE the Windows editor consumes it — so THERE IS NO CHORD
// GRAMMAR TO LOAD. A .story file therefore gets no highlighting here, deliberately:
// an earlier pass ran every file through the TypeScript grammar, which painted a
// Chord file's `is`/`from`/`in`/`when` as keywords and ignored `create`/`aka`/
// `phrase` entirely. Wrong colours are worse than none — they read as a broken
// editor rather than as an absent grammar, which is the actual state of ADR-182.
//
// What this spike measures is the editor's ability to apply per-token attributes at
// typing speed. That is measured on real TypeScript, where a real grammar exists.

using System.Diagnostics;
using ICSharpCode.AvalonEdit.Document;
using ICSharpCode.AvalonEdit.Rendering;
using TreeSitter;

namespace Adr341.WpfSpike;

public sealed class TreeSitterHighlighter : DocumentColorizingTransformer, IDisposable
{
    private readonly Language _language;
    private readonly Parser _parser;
    private readonly Query _query;
    private readonly TextDocument _document;

    private Tree? _tree;
    private List<(int Start, int End, string Token)> _spans = [];

    /// <summary>Wall-clock of the most recent reparse+query, for the felt-speed record.</summary>
    public double LastReparseMs { get; private set; }
    public int SpanCount => _spans.Count;

    // Capture name -> ADR-297 token. Deliberately the standard tree-sitter capture
    // vocabulary, so a Chord grammar's highlights.scm would drop in unchanged.
    private static readonly Dictionary<string, string> Map = new()
    {
        ["keyword"] = "TokenKeyword",
        ["string"] = "TokenString",
        ["comment"] = "TokenComment",
        ["number"] = "TokenNumber",
        ["type"] = "TokenType",
        ["function"] = "TokenFunction",
        ["property"] = "TokenFunction",
    };

    private const string TypeScriptHighlights = """
        [ "export" "interface" "import" "from" "const" "let" "return" "if" "else"
          "class" "extends" "implements" "readonly" "function" "new" "async" "await" ] @keyword
        (comment) @comment
        (string) @string
        (number) @number
        (type_identifier) @type
        (predefined_type) @type
        (property_identifier) @property
        (call_expression function: (identifier) @function)
        """;

    private const string JsonHighlights = """
        (pair key: (string) @property)
        (string) @string
        (number) @number
        [ (true) (false) (null) ] @keyword
        """;

    /// <summary>
    /// The grammar for a file, or null when none exists. Chord (`.story`) is the
    /// deliberate null: ADR-182 is unimplemented, and painting a Chord file with
    /// another language's grammar produces confident nonsense.
    /// </summary>
    private static (string Language, string Query)? GrammarFor(string path)
    {
        return System.IO.Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".ts" or ".tsx" or ".mts" or ".cts" => ("typescript", TypeScriptHighlights),
            ".js" or ".jsx" or ".mjs" or ".cjs" => ("javascript", TypeScriptHighlights),
            ".json" => ("json", JsonHighlights),
            _ => null,
        };
    }

    /// <summary>Null when the file's language has no grammar — the caller shows plain text.</summary>
    public static TreeSitterHighlighter? TryCreate(TextDocument document, string path)
    {
        if (GrammarFor(path) is not { } g) return null;
        try { return new TreeSitterHighlighter(document, g.Language, g.Query); }
        catch (Exception) { return null; } // a missing grammar dll is not a spike failure
    }

    private TreeSitterHighlighter(TextDocument document, string languageName, string highlights)
    {
        _document = document;
        _language = new Language(languageName);
        _parser = new Parser(_language);
        _query = _language.CreateQuery(highlights);
        _document.Changed += (_, _) => Reparse();
        Reparse();
    }

    private void Reparse()
    {
        var sw = Stopwatch.StartNew();
        var text = _document.Text;
        var next = _parser.Parse(text, _tree);
        _tree?.Dispose();
        _tree = next;

        var spans = new List<(int, int, string)>();
        var cursor = _query.Execute(_tree.RootNode);
        foreach (var cap in cursor.Captures)
        {
            // Capture names are dotted ("type.builtin"); the first segment is the
            // token class, which is how tree-sitter highlight queries are meant to
            // degrade when a theme does not know a specific variant.
            var head = cap.Name.Split('.')[0];
            if (Map.TryGetValue(head, out var token))
                spans.Add((cap.Node.StartIndex, cap.Node.EndIndex, token));
        }
        spans.Sort((a, b) => a.Item1.CompareTo(b.Item1));
        _spans = spans;
        sw.Stop();
        LastReparseMs = sw.Elapsed.TotalMilliseconds;
    }

    protected override void ColorizeLine(DocumentLine line)
    {
        var lineStart = line.Offset;
        var lineEnd = line.EndOffset;
        foreach (var (start, end, token) in _spans)
        {
            if (end <= lineStart) continue;
            if (start >= lineEnd) break; // spans are sorted; nothing further can intersect
            ChangeLinePart(
                Math.Max(start, lineStart),
                Math.Min(end, lineEnd),
                el => el.TextRunProperties.SetForegroundBrush(Theme.Brush(token)));
        }
    }

    public void Dispose()
    {
        _tree?.Dispose();
        _query.Dispose();
        _parser.Dispose();
        _language.Dispose();
    }
}
