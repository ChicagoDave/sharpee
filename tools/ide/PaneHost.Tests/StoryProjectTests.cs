// Tests for the resolution rules that decide what "a story is open" means.
//
// Real directories and real files throughout, in a temp tree the test creates and removes.
// The filesystem is the dependency under test here, so nothing about it is faked; what the
// tests never do is reach for the development story, because these rules must hold for an
// author's own folder in an installed app, which is the case that had no coverage at all.
//
// Public interface: xunit test classes, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class StoryProjectTests : IDisposable
{
    private readonly string _root = Path.Combine(
        Path.GetTempPath(), "panehost-story-" + Guid.NewGuid().ToString("N"));

    public StoryProjectTests() => Directory.CreateDirectory(_root);

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* a leftover temp dir is not a test failure */ }
    }

    private string Folder(string name)
    {
        var path = Path.Combine(_root, name);
        Directory.CreateDirectory(path);
        return path;
    }

    private static string Touch(string path, string contents = "")
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, contents);
        return path;
    }

    [Fact]
    public void a_story_file_resolves_to_its_own_folder_and_id()
    {
        var folder = Folder("orchard");
        var story = Touch(Path.Combine(folder, "orchard.story"), "story: Orchard\n");

        var project = StoryProject.Resolve(story);

        Assert.NotNull(project);
        Assert.Equal(folder, project!.Folder);
        Assert.Equal(story, project.StoryFile);
        Assert.Equal("orchard", project.Id);
        Assert.False(project.IsBuilt);
    }

    [Fact]
    public void a_folder_resolves_through_the_single_story_inside_it()
    {
        var folder = Folder("brook");
        var story = Touch(Path.Combine(folder, "brook.story"));

        var project = StoryProject.Resolve(folder);

        Assert.NotNull(project);
        Assert.Equal(story, project!.StoryFile);
        Assert.Equal("brook", project.Id);
    }

    [Fact]
    public void a_folder_with_two_stories_resolves_the_one_named_after_it()
    {
        var folder = Folder("mill");
        Touch(Path.Combine(folder, "scratch.story"));
        var named = Touch(Path.Combine(folder, "mill.story"));

        var project = StoryProject.Resolve(folder);

        Assert.NotNull(project);
        Assert.Equal(named, project!.StoryFile);
    }

    [Fact]
    public void a_folder_with_two_unrelated_stories_is_refused_rather_than_guessed()
    {
        var folder = Folder("ambiguous");
        Touch(Path.Combine(folder, "one.story"));
        Touch(Path.Combine(folder, "two.story"));

        Assert.Null(StoryProject.Resolve(folder));
    }

    [Fact]
    public void a_folder_with_no_story_and_a_missing_path_both_resolve_to_nothing()
    {
        Assert.Null(StoryProject.Resolve(Folder("empty")));
        Assert.Null(StoryProject.Resolve(Path.Combine(_root, "does-not-exist")));
        Assert.Null(StoryProject.Resolve(null));
        Assert.Null(StoryProject.Resolve("   "));
    }

    [Fact]
    public void built_output_and_the_tree_document_are_found_by_id()
    {
        var folder = Folder("fenwick");
        Touch(Path.Combine(folder, "fenwick.story"));
        Directory.CreateDirectory(Path.Combine(folder, "dist", "web", "fenwick"));
        var tests = Touch(Path.Combine(folder, "fenwick.tests.json"), "{}");

        var project = StoryProject.Resolve(folder)!;

        Assert.True(project.IsBuilt);
        Assert.Equal(Path.Combine(folder, "dist", "web", "fenwick"), project.WebBundle);
        Assert.Equal(tests, project.TestsDocument);
    }

    [Fact]
    public void a_bundle_named_by_the_story_header_rather_than_the_file_is_still_found()
    {
        // `sharpee build` names its output after the story's own id, which an author may
        // set to something other than the filename. One subdirectory is unambiguous.
        var folder = Folder("header-id");
        Touch(Path.Combine(folder, "draft.story"));
        Directory.CreateDirectory(Path.Combine(folder, "dist", "web", "the-real-id"));

        var project = StoryProject.Resolve(folder)!;

        Assert.Equal(Path.Combine(folder, "dist", "web", "the-real-id"), project.WebBundle);
        Assert.True(project.IsBuilt);
    }

    [Fact]
    public void two_built_bundles_and_no_id_match_leave_the_story_unbuilt_rather_than_picking_one()
    {
        var folder = Folder("two-bundles");
        Touch(Path.Combine(folder, "draft.story"));
        Directory.CreateDirectory(Path.Combine(folder, "dist", "web", "alpha"));
        Directory.CreateDirectory(Path.Combine(folder, "dist", "web", "beta"));

        var project = StoryProject.Resolve(folder)!;

        Assert.Null(project.WebBundle);
        Assert.False(project.IsBuilt);
    }
}
