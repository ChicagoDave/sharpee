// The testing pane's boot session (GH #540, ADR-355): the session carries the tree
// directory's files, and the seed the pane boots the engine at is the manifest's own pin —
// the IDE's fixed play seed only for a fresh tree.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head.

using System.Text.Json.Nodes;
using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class TestingSessionTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "testing-session-" + Guid.NewGuid().ToString("N"));

    public TestingSessionTests() => Directory.CreateDirectory(_root);

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private static JsonObject TreeWithManifest(string manifest) => new()
    {
        [TestingSession.ManifestFileName] = manifest,
        ["root0000.json"] = """{"cards": [], "id": "root0000"}""",
    };

    [Fact]
    public void the_session_carries_the_tree_and_the_manifests_own_seed()
    {
        var tree = TreeWithManifest("""{"seed": 1209, "story": "secret-letter", "version": 3}""");

        var session = TestingSession.Build("secret-letter", tree);

        Assert.Equal(1209, (int)session["seed"]!);
        Assert.Equal("secret-letter", (string)session["story"]!);
        var carried = Assert.IsType<JsonObject>(session["tree"]);
        Assert.Equal(new[] { "manifest.json", "root0000.json" }, carried.Select(entry => entry.Key).OrderBy(k => k, StringComparer.Ordinal));
    }

    [Fact]
    public void a_story_without_a_tree_boots_at_the_fresh_tree_seed_and_carries_none()
    {
        var session = TestingSession.Build("fresh", null);

        Assert.Equal(TestingSession.FreshTreeSeed, (int)session["seed"]!);
        Assert.Equal(42, TestingSession.FreshTreeSeed);
        Assert.False(session.ContainsKey("tree"));
    }

    [Fact]
    public void a_malformed_manifest_boots_at_the_fresh_tree_seed()
    {
        Assert.Null(TestingSession.ManifestSeed("not json {{{"));
        Assert.Equal(TestingSession.FreshTreeSeed, (int)TestingSession.Build("broken", TreeWithManifest("not json {{{"))["seed"]!);
    }

    [Fact]
    public void a_non_integer_or_non_object_seed_is_not_a_pin()
    {
        Assert.Null(TestingSession.ManifestSeed("""{"seed": 1209.5}"""));
        Assert.Null(TestingSession.ManifestSeed("""{"seed": "1209"}"""));
        Assert.Null(TestingSession.ManifestSeed("""[1209]"""));
    }

    [Fact]
    public void read_tree_maps_each_file_by_name_and_skips_dotfiles_and_subdirectories()
    {
        var directory = Path.Combine(_root, "mini.tests");
        Directory.CreateDirectory(Path.Combine(directory, "nested"));
        File.WriteAllText(Path.Combine(directory, "manifest.json"), "{\"seed\": 7}");
        File.WriteAllText(Path.Combine(directory, "root0000.json"), "{}");
        File.WriteAllText(Path.Combine(directory, ".DS_Store"), "junk");

        var tree = TestingSession.ReadTree(directory)!;

        Assert.Equal(new[] { "manifest.json", "root0000.json" }, tree.Select(entry => entry.Key));
        Assert.Equal("{\"seed\": 7}", (string)tree["manifest.json"]!);
    }

    [Fact]
    public void read_tree_answers_null_for_a_story_with_no_tree_directory()
    {
        Assert.Null(TestingSession.ReadTree(Path.Combine(_root, "absent.tests")));
    }

    // ADR-357 D11: the build id hashes what a run executes — the story's source files and the
    // CLI — and nothing else, so an edit to either moves it and nothing else does.

    private string SeedProject()
    {
        var folder = Path.Combine(_root, "upps");
        Directory.CreateDirectory(Path.Combine(folder, "parts"));
        Directory.CreateDirectory(Path.Combine(folder, "upps.tests"));
        Directory.CreateDirectory(Path.Combine(folder, "dist", "web"));
        File.WriteAllText(Path.Combine(folder, "upps.story"), "story \"UPPS\"\n");
        File.WriteAllText(Path.Combine(folder, "parts", "satchel.chord"), "create the satchel\n");
        File.WriteAllText(Path.Combine(folder, "upps.tests", "manifest.json"), "{}");
        File.WriteAllText(Path.Combine(folder, "dist", "web", "game.js"), "built");
        File.WriteAllText(Path.Combine(_root, "sharpee"), "#!/bin/sh\n");
        return folder;
    }

    [Fact]
    public void the_build_id_is_stable_and_rides_the_session()
    {
        var folder = SeedProject();
        var shim = Path.Combine(_root, "sharpee");

        var first = TestingSession.BuildIdentity(folder, shim);
        var second = TestingSession.BuildIdentity(folder, shim);

        Assert.NotNull(first);
        Assert.Equal(64, first!.Length);
        Assert.Equal(first, second);
        Assert.Equal(first, (string)TestingSession.Build("upps", null, first)["build"]!);
        Assert.Null(TestingSession.Build("upps", null)["build"]);
    }

    [Fact]
    public void the_build_id_moves_on_a_source_or_cli_change_and_on_nothing_else()
    {
        var folder = SeedProject();
        var shim = Path.Combine(_root, "sharpee");
        var before = TestingSession.BuildIdentity(folder, shim);

        File.WriteAllText(Path.Combine(folder, "upps.tests", "manifest.json"), "{\"seed\": 7}");
        File.WriteAllText(Path.Combine(folder, "dist", "web", "game.js"), "rebuilt");
        File.WriteAllText(Path.Combine(folder, "README.md"), "notes");
        Assert.Equal(before, TestingSession.BuildIdentity(folder, shim));

        File.WriteAllText(Path.Combine(folder, "parts", "satchel.chord"), "create the satchel\n  wearable\n");
        var afterChord = TestingSession.BuildIdentity(folder, shim);
        Assert.NotEqual(before, afterChord);

        File.WriteAllText(Path.Combine(_root, "sharpee"), "#!/bin/sh\necho rebuilt\n");
        Assert.NotEqual(afterChord, TestingSession.BuildIdentity(folder, shim));
    }

    [Fact]
    public void a_folder_with_no_story_source_has_no_build_id()
    {
        var empty = Path.Combine(_root, "empty");
        Directory.CreateDirectory(empty);
        Assert.Null(TestingSession.BuildIdentity(empty, null));
    }
}
