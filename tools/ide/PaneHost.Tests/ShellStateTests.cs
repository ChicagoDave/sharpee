// Tests for the one thing the shell remembers between runs.
//
// Real files in a temp directory, through the real JSON the app writes. The state
// directory is redirected for the duration so the suite cannot overwrite the author's own
// remembered story — which is a state file on this machine, not a fixture.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class ShellStateTests : IDisposable
{
    private readonly string _root = Path.Combine(
        Path.GetTempPath(), "panehost-state-" + Guid.NewGuid().ToString("N"));

    public ShellStateTests()
    {
        Directory.CreateDirectory(_root);
        ShellState.DirectoryOverride = _root;
    }

    public void Dispose()
    {
        ShellState.DirectoryOverride = null;
        try { Directory.Delete(_root, recursive: true); } catch { /* a leftover temp dir is not a failure */ }
    }

    private string StoryFile(string name = "kept.story")
    {
        var path = Path.Combine(_root, name);
        File.WriteAllText(path, "story: Kept\n");
        return path;
    }

    [Fact]
    public void the_last_story_survives_a_write_and_a_read()
    {
        var story = StoryFile();

        ShellState.LastStoryFile = story;

        Assert.True(File.Exists(Path.Combine(_root, "shell-state.json")));
        Assert.Equal(story, ShellState.LastStoryFile);
    }

    [Fact]
    public void a_later_story_replaces_the_earlier_one()
    {
        ShellState.LastStoryFile = StoryFile("first.story");
        var second = StoryFile("second.story");

        ShellState.LastStoryFile = second;

        Assert.Equal(second, ShellState.LastStoryFile);
    }

    [Fact]
    public void no_state_file_reads_as_nothing_remembered()
    {
        Assert.Null(ShellState.LastStoryFile);
    }

    [Fact]
    public void a_remembered_story_that_has_been_deleted_reads_as_nothing()
    {
        // The author moved or deleted it between runs; the app must open empty, not point
        // at a path that is gone.
        var story = StoryFile("gone.story");
        ShellState.LastStoryFile = story;
        File.Delete(story);

        Assert.Null(ShellState.LastStoryFile);
    }

    [Fact]
    public void an_unreadable_state_file_reads_as_nothing_rather_than_throwing()
    {
        File.WriteAllText(Path.Combine(_root, "shell-state.json"), "{ this is not json");

        Assert.Null(ShellState.LastStoryFile);
    }

    [Fact]
    public void clearing_the_memory_is_written_through()
    {
        ShellState.LastStoryFile = StoryFile();

        ShellState.LastStoryFile = null;

        Assert.Null(ShellState.LastStoryFile);
    }
}
