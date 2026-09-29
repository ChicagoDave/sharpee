// The testing pane's boot session — the payload PaneServer bakes into the testing page.
//
// One builder, used by every window that opens the panes, so the story id, the tree's
// files and the seed always travel together. The tree is the `<story-id>.tests/` directory
// (ADR-355): a manifest and one file per segment, handed to the page as a name → text map
// its shared reader assembles. The seed is the MANIFEST'S pin when the story has a tree
// (ADR-307 D5 — a tree is reproducible only at its own seed) and the IDE's fixed play seed
// for a fresh tree (ADR-305 D1). Until 2026-09-27 both windows wrote the constant
// regardless, so the pane recorded cards at one seed that `sharpee test --tree` replayed at
// another (GH #540).
//
// Public interface: TestingSession.Build, TestingSession.ReadTree, TestingSession.ManifestSeed,
// TestingSession.FreshTreeSeed, TestingSession.ManifestFileName.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json;
using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>Builds the testing pane's boot session.</summary>
internal static class TestingSession
{
    /// <summary>The seed a fresh tree is pinned at — the IDE's fixed play seed (ADR-305 D1).</summary>
    public const int FreshTreeSeed = 42;

    /// <summary>The manifest's file name inside a tree directory (ADR-355 D4).</summary>
    public const string ManifestFileName = "manifest.json";

    /// <summary>The session payload: story id, seed, and the tree's files when it has any.</summary>
    /// <param name="storyId">The story's id — a fresh tree's `story` field.</param>
    /// <param name="tree">The tree directory's files by name (<see cref="ReadTree"/>), or null when the story has none.</param>
    /// <returns>The session object the boot script reads `seed` from and the surface reads whole.</returns>
    public static JsonObject Build(string storyId, JsonObject? tree)
    {
        var seed = tree?[ManifestFileName] is JsonValue manifest && manifest.TryGetValue<string>(out var text)
            ? ManifestSeed(text)
            : null;
        var session = new JsonObject
        {
            ["story"] = storyId,
            ["seed"] = seed ?? FreshTreeSeed,
        };
        if (tree is not null) session["tree"] = tree;
        return session;
    }

    /// <summary>
    /// Reads a tree directory's files by name — the map the page's shared reader assembles.
    /// Dotfiles (`.DS_Store`) and subdirectories are not the tree's and are skipped.
    /// </summary>
    /// <param name="directory">The `<story-id>.tests/` directory.</param>
    /// <returns>The files, or null when the directory does not exist (the story has no tree yet).</returns>
    public static JsonObject? ReadTree(string directory)
    {
        if (!Directory.Exists(directory)) return null;
        var files = new JsonObject();
        foreach (var path in Directory.GetFiles(directory).OrderBy(Path.GetFileName, StringComparer.Ordinal))
        {
            var name = Path.GetFileName(path);
            if (name.StartsWith('.')) continue;
            files[name] = File.ReadAllText(path);
        }
        return files;
    }

    /// <summary>
    /// The seed a tree's manifest pins, or null when the text is not a JSON object carrying
    /// an integer `seed`. This host reads that ONE field; the surface validates the rest.
    /// </summary>
    /// <param name="manifestText">The manifest's text as read from disk.</param>
    /// <returns>The pinned seed, or null.</returns>
    public static int? ManifestSeed(string manifestText)
    {
        try
        {
            return JsonNode.Parse(manifestText) is JsonObject manifest
                && manifest["seed"] is JsonValue value
                && value.TryGetValue<int>(out var seed)
                ? seed
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
