// Tests for the host's reading of the surface's `openSource` post (GH #524 Phase 2): a
// well-formed request yields its file and line, the story-file case is a null file, and
// every other post on the channel — the run request, a document, view state, garbage —
// is "not this" rather than an exception.
//
// STUB JUSTIFICATION (rule 13a). The reveal itself (ShellWindow.RevealAsync) needs a
// constructed Avalonia editor and a UI thread, so what is tested here is the reader the
// shell routes through. The REAL-PATH TEST that backs it is the shell's `--app-exit-state`
// run: after the real Run button's real CLI run settles, it clicks the first `.ts-src`
// span link in the run column, whose post travels the real webview → OnPaneMessage → this
// reader → RevealAsync, and logs the editor's caret line against the line the link named
// (`span click: … (revealed)` in shell-log.txt).
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class TestingSurfacePostsTests
{
    [Fact]
    public void ReadsAFileAndLine()
    {
        var request = TestingSurfacePosts.ReadOpenSource("{\"openSource\":{\"file\":\"npcs/tobias.chord\",\"line\":709}}");

        Assert.NotNull(request);
        Assert.Equal("npcs/tobias.chord", request!.Value.File);
        Assert.Equal(709, request.Value.Line);
    }

    [Fact]
    public void ANullFileIsTheStoryFile()
    {
        var request = TestingSurfacePosts.ReadOpenSource("{\"openSource\":{\"file\":null,\"line\":636}}");

        Assert.NotNull(request);
        Assert.Null(request!.Value.File);
        Assert.Equal(636, request.Value.Line);
    }

    [Theory]
    [InlineData("{\"run\":true}")]
    [InlineData("{\"document\":{\"text\":\"{}\"}}")]
    [InlineData("{\"state\":{\"active\":0}}")]
    [InlineData("{\"openSource\":{\"file\":\"a.chord\"}}")]
    [InlineData("{\"openSource\":{\"file\":\"a.chord\",\"line\":0}}")]
    [InlineData("{\"openSource\":{\"file\":\"a.chord\",\"line\":\"7\"}}")]
    [InlineData("not json at all")]
    [InlineData("")]
    public void EveryOtherPostIsNotThis(string body)
    {
        Assert.Null(TestingSurfacePosts.ReadOpenSource(body));
    }

    // ── the tree write (ADR-355): only the files a change touched ──

    [Fact]
    public void ReadsATreeWritesFilesAndRemovals()
    {
        var write = TestingSurfacePosts.ReadTreeWrite(
            "{\"tree\":{\"written\":{\"abcd1234.json\":\"{}\\n\"},\"removed\":[\"gone0001.json\"]}}");

        Assert.NotNull(write);
        Assert.Equal("{}\n", write!.Written["abcd1234.json"]);
        Assert.Equal(new[] { "gone0001.json" }, write.Removed);
    }

    [Theory]
    [InlineData("../escape.json")]
    [InlineData("nested/segment.json")]
    [InlineData("back\\slash.json")]
    [InlineData(".hidden.json")]
    [InlineData("notes.txt")]
    [InlineData("")]
    public void ANameOutsideTheTreeIsDropped(string name)
    {
        Assert.False(TestingSurfacePosts.IsTreeFileName(name));
        var body = "{\"tree\":{\"written\":{" + System.Text.Json.JsonSerializer.Serialize(name) + ":\"x\"},\"removed\":["
                   + System.Text.Json.JsonSerializer.Serialize(name) + "]}}";
        var write = TestingSurfacePosts.ReadTreeWrite(body)!;
        Assert.Empty(write.Written);
        Assert.Empty(write.Removed);
    }

    [Theory]
    [InlineData("{\"run\":true}")]
    [InlineData("{\"state\":{\"active\":\"abcd1234\"}}")]
    [InlineData("not json {{{")]
    public void APostThatIsNotATreeWriteIsNotThis(string body)
    {
        Assert.Null(TestingSurfacePosts.ReadTreeWrite(body));
    }

    [Fact]
    public void ApplyingAWriteChangesOnlyTheNamedFiles()
    {
        var directory = Path.Combine(Path.GetTempPath(), "tree-write-" + Guid.NewGuid().ToString("N"), "mini.tests");
        try
        {
            Directory.CreateDirectory(directory);
            File.WriteAllText(Path.Combine(directory, "manifest.json"), "{\"seed\": 42}\n");
            File.WriteAllText(Path.Combine(directory, "keep0001.json"), "kept\n");
            File.WriteAllText(Path.Combine(directory, "gone0001.json"), "doomed\n");
            var outside = Path.Combine(Path.GetDirectoryName(directory)!, "escape.json");

            var write = TestingSurfacePosts.ReadTreeWrite(
                "{\"tree\":{\"written\":{\"new00001.json\":\"fresh\\n\",\"../escape.json\":\"no\"},\"removed\":[\"gone0001.json\"]}}")!;
            TestingSurfacePosts.ApplyTreeWrite(directory, write);

            Assert.Equal("fresh\n", File.ReadAllText(Path.Combine(directory, "new00001.json")));
            Assert.False(File.Exists(Path.Combine(directory, "gone0001.json")));
            Assert.Equal("kept\n", File.ReadAllText(Path.Combine(directory, "keep0001.json")));
            Assert.Equal("{\"seed\": 42}\n", File.ReadAllText(Path.Combine(directory, "manifest.json")));
            Assert.False(File.Exists(outside));
            // No BOM: the tree is JSON two readers re-parse.
            Assert.Equal((byte)'f', File.ReadAllBytes(Path.Combine(directory, "new00001.json"))[0]);
        }
        finally
        {
            Directory.Delete(Path.GetDirectoryName(directory)!, recursive: true);
        }
    }

    [Fact]
    public void ApplyingAWriteIgnoresNamesThatAreNotTreeFilesEvenWhenHandedThemDirectly()
    {
        // ReadTreeWrite already drops these; ApplyTreeWrite guards again, so a write built
        // any other way cannot land a non-tree file or reach outside the directory.
        var parent = Path.Combine(Path.GetTempPath(), "tree-write-" + Guid.NewGuid().ToString("N"));
        var directory = Path.Combine(parent, "mini.tests");
        try
        {
            Directory.CreateDirectory(directory);
            var sibling = Path.Combine(parent, "manifest.json");
            File.WriteAllText(sibling, "outside\n");

            var write = new TreeWrite(
                new Dictionary<string, string> { ["notes.txt"] = "no", ["seg00001.json"] = "yes\n" },
                new[] { "../manifest.json" });
            TestingSurfacePosts.ApplyTreeWrite(directory, write);

            Assert.False(File.Exists(Path.Combine(directory, "notes.txt")));
            Assert.Equal("yes\n", File.ReadAllText(Path.Combine(directory, "seg00001.json")));
            Assert.Equal("outside\n", File.ReadAllText(sibling));
        }
        finally
        {
            Directory.Delete(parent, recursive: true);
        }
    }

    [Fact]
    public void ApplyingAWriteCreatesAMissingTreeDirectory()
    {
        var parent = Path.Combine(Path.GetTempPath(), "tree-write-" + Guid.NewGuid().ToString("N"));
        var directory = Path.Combine(parent, "fresh.tests");
        try
        {
            var write = TestingSurfacePosts.ReadTreeWrite("{\"tree\":{\"written\":{\"manifest.json\":\"{}\\n\"},\"removed\":[]}}")!;
            TestingSurfacePosts.ApplyTreeWrite(directory, write);
            Assert.Equal("{}\n", File.ReadAllText(Path.Combine(directory, "manifest.json")));
        }
        finally
        {
            if (Directory.Exists(parent)) Directory.Delete(parent, recursive: true);
        }
    }
}
