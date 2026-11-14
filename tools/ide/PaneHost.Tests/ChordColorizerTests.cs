// Tests for the Avalonia editor's curated word sets: the Chord 4.0 block openers are
// keywords, and both sets equal the ones the macOS head colors with.
//
// ChordColorizer's sets are a hand copy of tools/ide/SharpeeIDE/Editor/SyntaxHighlighter.swift.
// The parity tests read that Swift file from the checkout and compare, so a word added to one
// head and not the other fails here instead of showing up as two editors that color differently.
//
// STUB JUSTIFICATION (rule 13a): none. The Swift source is the real file, read from disk.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's editor.

using PaneHost.Editor;
using PaneHost.Hosting;

namespace PaneHost.Tests;

public sealed class ChordColorizerTests
{
    private static readonly string SwiftHighlighter = Path.Combine(
        RepoPaths.RepoRoot, "tools", "ide", "SharpeeIDE", "Editor", "SyntaxHighlighter.swift");

    /// <summary>
    /// The quoted words of one `static let name: Set&lt;String&gt; = [ … ]` literal in the Swift
    /// highlighter. Comment lines are skipped, because the set's comments quote prose.
    /// </summary>
    private static HashSet<string> SwiftSet(string name)
    {
        var lines = File.ReadAllLines(SwiftHighlighter);
        var opener = $"static let {name}: Set<String> = [";
        var start = Array.FindIndex(lines, line => line.Contains(opener, StringComparison.Ordinal));
        Assert.True(start >= 0, $"SyntaxHighlighter.swift no longer declares `{opener}`");

        var words = new HashSet<string>(StringComparer.Ordinal);
        for (var i = start + 1; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (line == "]") return words;
            if (line.StartsWith("//", StringComparison.Ordinal)) continue;
            var parts = line.Split('"');
            for (var p = 1; p < parts.Length; p += 2) words.Add(parts[p]);
        }

        Assert.Fail($"SyntaxHighlighter.swift's `{name}` set never closes with a `]` line");
        return words;
    }

    [Theory]
    [InlineData("claims")]
    [InlineData("landmarks")]
    [InlineData("passage")]
    [InlineData("position")]
    [InlineData("pushing")]
    [InlineData("sailing")]
    public void a_chord_4_block_opener_is_a_keyword(string opener)
    {
        Assert.Contains(opener, ChordColorizer.Keywords);
    }

    [Fact]
    public void the_keyword_set_equals_the_macos_heads()
    {
        var swift = SwiftSet("keywords");

        Assert.NotEmpty(swift);
        Assert.Equal(swift.Order(StringComparer.Ordinal), ChordColorizer.Keywords.Order(StringComparer.Ordinal));
    }

    [Fact]
    public void the_property_set_equals_the_macos_heads()
    {
        var swift = SwiftSet("properties");

        Assert.NotEmpty(swift);
        Assert.Equal(swift.Order(StringComparer.Ordinal), ChordColorizer.Properties.Order(StringComparer.Ordinal));
    }
}
