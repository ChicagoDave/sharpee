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
}
