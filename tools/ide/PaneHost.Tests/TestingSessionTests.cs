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
}
