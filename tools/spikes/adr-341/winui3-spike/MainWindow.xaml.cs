// SPIKE CODE — ADR-341 D2, Phase 4. Not product; never shipped.
//
// SPIKE ITEM 1, the decisive one: can WinUI 3's only native code editor be driven by
// an EXTERNAL tokenizer — ADR-182's tree-sitter grammar — rather than by its own
// built-in lexers? D4 requires one grammar and two native editors, so a control that
// can only highlight from its own language list would put a third definition of
// Chord's syntax in the tree.
//
// The route: Scintilla container lexing. SetILexer(0) hands styling to the container;
// StartStyling/SetStyling apply byte-range styles; StyleSetFore assigns the colours,
// which come from ADR-297's tokens exactly as in the WPF spike.

using System.Diagnostics;
using System.IO;
using System.Text;
using Microsoft.UI.Xaml;
using TreeSitter;

namespace Adr341.WinUi3Spike;

public sealed partial class MainWindow : Window
{
    private static readonly string RepoRoot = FindRepoRoot();

    // Scintilla style numbers. 0 is the default style; these are ours.
    private const int StyleKeyword = 1, StyleString = 2, StyleComment = 3,
                      StyleNumber = 4, StyleType = 5, StyleFunction = 6;

    private static readonly Dictionary<string, int> CaptureToStyle = new()
    {
        ["keyword"] = StyleKeyword,
        ["string"] = StyleString,
        ["comment"] = StyleComment,
        ["number"] = StyleNumber,
        ["type"] = StyleType,
        ["property"] = StyleFunction,
        ["function"] = StyleFunction,
    };

    private const string Highlights = """
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

    private Language? _language;
    private Parser? _parser;
    private Query? _query;
    private Tree? _tree;
    private string _source = "";

    public MainWindow()
    {
        InitializeComponent();
        Theme.LoadAndApply();

        // WinUI 3 themes its own chrome — including the title bar, which WPF needed an
        // explicit DwmSetWindowAttribute for — but it does so from RequestedTheme, NOT
        // from a custom token table. ADR-297's dual-palette system is a parallel
        // mechanism, so the two must be connected explicitly or the pin is ignored and
        // the app silently follows the system instead.
        Root.RequestedTheme = Theme.IsDark ? ElementTheme.Dark : ElementTheme.Light;
        Root.Background = Theme.Brush("EditorBackground");
        Map.Background = Theme.Brush("PlayBackground");

        SetUpMap();
        SetUpTabs();
        // NOT in the constructor. CodeEditorControl initialises its own styles when it
        // loads, which silently overwrites anything set before that — the style pass
        // still runs and still reports a time, so the failure looks like "styling did
        // nothing" rather than "styling was undone". (Measured 2026-09-11.)
        Editor.Loaded += (_, _) => SetUpEditor();
    }

    private void SetUpEditor()
    {
        try
        {
            var sample = Path.Combine(RepoRoot, "packages", "engine", "src", "game-engine.ts");
            _source = File.Exists(sample)
                ? File.ReadAllText(sample)
                : "export interface StoryEnding { readonly kind: string; }\n";

            var ed = Editor.Editor;
            ed.SetText(_source);

            // Hand styling to the container. This is the whole question: with no
            // built-in lexer, every colour on screen comes from tree-sitter.
            Editor.ResetLexer();
            ed.SetILexer(0);

            ed.StyleSetFont(0, "Cascadia Mono"); // style number first: StyleSetFont(int, string)
            ed.StyleSetSize(0, 12);
            ed.StyleClearAll();

            foreach (var (capture, style) in new[]
                     {
                         ("TokenKeyword", StyleKeyword), ("TokenString", StyleString),
                         ("TokenComment", StyleComment), ("TokenNumber", StyleNumber),
                         ("TokenType", StyleType), ("TokenFunction", StyleFunction),
                     })
            {
                ed.StyleSetFore(style, Theme.ScintillaColour(capture));
            }
            ed.StyleSetFore(0, Theme.ScintillaColour("Foreground"));

            _language = new Language("typescript");
            _parser = new Parser(_language);
            _query = _language.CreateQuery(Highlights);

            var ms = Restyle();
            Status.Text = $"container lexing active — every colour is from tree-sitter, not a built-in lexer";
            Perf.Text = $"{_source.Split('\n').Length} lines · first style pass {ms:F2} ms";

            // Like-for-like with the WPF spike: measure the same whole-document pass on
            // every change, on the same file.
            ed.Modified += (_, _) =>
            {
                var t = Editor.Editor.TextLength;
                if (t == _source.Length) return; // styling itself raises Modified
                _source = Editor.Editor.GetText(t + 1) ?? _source;
                var again = Restyle();
                Perf.Text = $"{_source.Split('\n').Length} lines · restyle {again:F2} ms";
            };
        }
        catch (Exception ex)
        {
            Status.Text = $"EDITOR FAILED — {ex.GetType().Name}: {ex.Message}";
            Perf.Text = "editor unavailable";
        }
    }

    /// <summary>Parse with tree-sitter and push styles into Scintilla. Returns ms.</summary>
    private double Restyle()
    {
        if (_parser is null || _query is null) return 0;
        var sw = Stopwatch.StartNew();

        var next = _parser.Parse(_source, _tree);
        _tree?.Dispose();
        _tree = next;

        var ed = Editor.Editor;
        // Scintilla styles BYTE ranges; tree-sitter gives UTF-16 indices. For this
        // file they coincide (ASCII), and the spike records the caveat rather than
        // building a full index map, which is shell work.
        ed.StartStyling(0, 0);
        ed.SetStyling(Encoding.UTF8.GetByteCount(_source), 0);

        var cursor = _query.Execute(_tree.RootNode);
        foreach (var cap in cursor.Captures)
        {
            if (!CaptureToStyle.TryGetValue(cap.Name.Split('.')[0], out var style)) continue;
            ed.StartStyling(cap.Node.StartIndex, 0);
            ed.SetStyling(cap.Node.EndIndex - cap.Node.StartIndex, style);
        }

        sw.Stop();
        return sw.Elapsed.TotalMilliseconds;
    }

    private void SetUpTabs()
    {
        Tabs.Items =
        [
            new("Build"), new("Play"), new("Testing", 12), new("Index"), new("World")
        ];
        Tabs.SelectionChanged += i => Status.Text = $"right panel → {Tabs.Items[i].Title}";
    }

    private void SetUpMap()
    {
        Map.Rooms =
        [
            new("West of House", 0, 0), new("North of House", 1, 0), new("Behind House", 2, 0),
            new("Kitchen", 2, 1), new("Living Room", 1, 1), new("Cellar", 1, 2, Reached: false),
            new("Attic", 3, 1, Displaced: true),
        ];
        Map.Links =
        [
            new(0, 1), new(1, 2), new(2, 3, Door: true), new(3, 4),
            new(4, 5, Sealed_: true), new(3, 6, Door: true),
        ];
    }

    private static string FindRepoRoot()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d is not null && !Directory.Exists(Path.Combine(d.FullName, ".git"))) d = d.Parent;
        return d?.FullName ?? AppContext.BaseDirectory;
    }
}
