// SPIKE CODE — ADR-341 D2, Phase 2 assumption 1. Not product; never shipped.
// Answers one question: does a .NET tree-sitter binding load a grammar and parse
// on win-x64, and does it expose the query API a syntax highlighter needs?

using TreeSitter;

static void Section(string s) => Console.WriteLine($"\n===== {s} =====");

var nativeDir = Path.Combine(AppContext.BaseDirectory, "runtimes", "win-x64", "native");
Console.WriteLine($"runtime dir : {nativeDir}");
Console.WriteLine($"exists      : {Directory.Exists(nativeDir)}");
if (Directory.Exists(nativeDir))
    Console.WriteLine($"grammars    : {Directory.GetFiles(nativeDir, "tree-sitter-*.dll").Length}");

// 1. Load a bundled grammar BY NAME and parse. The baseline check.
Section("1. load by name + parse");
using var lang = new Language("typescript");
Console.WriteLine($"name        : {lang.Name}");
Console.WriteLine($"abiVersion  : {lang.AbiVersion}");
Console.WriteLine($"symbols     : {lang.Symbols.Count}");
Console.WriteLine($"states      : {lang.StateCount}");

const string source = """
    export interface StoryEnding {
      readonly kind: 'victory' | 'defeat';
      readonly turn: number;
    }
    """;

using var parser = new Parser(lang);
using var tree = parser.Parse(source);
var root = tree.RootNode;
Console.WriteLine($"rootType    : {root.Type}");
Console.WriteLine($"children    : {root.Children.Count}");
Console.WriteLine($"hasError    : {root.HasError}");
Console.WriteLine("s-expression:");
Console.WriteLine(root.Expression);

// 2. The query API — this is what a highlighter IS, not a nice-to-have.
Section("2. query api (what highlighting needs)");
using var query = lang.CreateQuery("""
    (interface_declaration name: (type_identifier) @type.name)
    (property_signature name: (property_identifier) @property)
    (string) @string
    (predefined_type) @type.builtin
    """);
Console.WriteLine($"patterns    : {query.Patterns.Count}");
var cursor = query.Execute(root);
var captures = 0;
foreach (var cap in cursor.Captures)
{
    Console.WriteLine($"  @{cap.Name,-13} [{cap.Node.StartIndex,3}..{cap.Node.EndIndex,3}] {cap.Node.Text}");
    captures++;
}
Console.WriteLine($"captures    : {captures}");

// 3. Load a grammar from an ARBITRARY PATH. This is the Chord route: ADR-182's
//    grammar will be a DLL this package has never heard of. Proving it with a
//    bundled DLL loaded explicitly by path exercises the same code route.
Section("3. load from arbitrary path (the ADR-182 / Chord route)");
var jsonDll = Path.Combine(nativeDir, "tree-sitter-json.dll");
Console.WriteLine($"dll         : {jsonDll}");
try
{
    // The 2-arg ctor takes (libraryPath, C entry point), not (path, friendly name).
    // tree-sitter's convention is tree_sitter_<name>; the bare name fails with
    // EntryPointNotFoundException, measured 2026-09-11.
    using var byPath = new Language(jsonDll, "tree_sitter_json");
    using var p2 = new Parser(byPath);
    using var t2 = p2.Parse("""{"ending":{"kind":"victory","turn":42}}""");
    Console.WriteLine($"loaded      : {byPath.Name}, abi {byPath.AbiVersion}");
    Console.WriteLine($"parsed      : {t2.RootNode.Expression}");
    Console.WriteLine("RESULT      : arbitrary-path grammar loading WORKS");
}
catch (Exception ex)
{
    Console.WriteLine($"RESULT      : FAILED — {ex.GetType().Name}: {ex.Message}");
}

// 4. Incremental reparse — an editor edits on every keystroke; a highlighter that
//    reparses the whole buffer each time is the thing that feels slow.
Section("4. incremental reparse");
var sw = System.Diagnostics.Stopwatch.StartNew();
using var full = parser.Parse(source);
sw.Stop();
Console.WriteLine($"cold parse  : {sw.Elapsed.TotalMilliseconds:F3} ms");
sw.Restart();
for (var i = 0; i < 100; i++) { using var t = parser.Parse(source, full); }
sw.Stop();
Console.WriteLine($"reparse x100: {sw.Elapsed.TotalMilliseconds:F3} ms ({sw.Elapsed.TotalMilliseconds / 100:F3} ms each)");
