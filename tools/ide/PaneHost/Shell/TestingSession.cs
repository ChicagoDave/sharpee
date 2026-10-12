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
    public static JsonObject Build(string storyId, JsonObject? tree, string? build = null)
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
        // The host's current build id (ADR-357 D11), compared with a run's
        // baseline to judge staleness; absent when the project has no source.
        if (build is not null) session["build"] = build;
        return session;
    }

    /// <summary>Directories a project may hold that are never story source.</summary>
    private static readonly HashSet<string> SkippedDirectories = new(StringComparer.Ordinal) { "node_modules", "dist", ".git", "bin", "obj" };

    /// <summary>
    /// The build id the staleness contract compares (ADR-357 D11): a SHA-256 hex digest over
    /// every story source file under the project — the `.story` file and every `.chord` file,
    /// by relative path and bytes, imports not followed — then the CLI the host spawns,
    /// resolved to its file: path, size and modification time. What a run executes, not the
    /// web bundle. Computed BEFORE a spawn, so a save in between marks the result stale, the
    /// safe direction.
    /// </summary>
    /// <param name="folder">The directory holding the .story file.</param>
    /// <param name="executable">The CLI shim the host spawns, or null to hash the sources alone.</param>
    /// <returns>The digest, or null when the folder holds no story source at all.</returns>
    public static string? BuildIdentity(string folder, string? executable)
    {
        var root = Path.GetFullPath(folder).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var files = SourceFiles(root);
        if (files.Count == 0) return null;
        using var hasher = System.Security.Cryptography.IncrementalHash.CreateHash(System.Security.Cryptography.HashAlgorithmName.SHA256);
        foreach (var file in files)
        {
            hasher.AppendData(System.Text.Encoding.UTF8.GetBytes(file.Substring(root.Length).Replace('\\', '/')));
            hasher.AppendData(new byte[] { 0 });
            hasher.AppendData(File.ReadAllBytes(file));
            hasher.AppendData(new byte[] { 0 });
        }
        if (executable is not null)
        {
            var info = new FileInfo(executable);
            var size = info.Exists ? info.Length : -1;
            var modified = info.Exists ? info.LastWriteTimeUtc.Ticks : -1;
            hasher.AppendData(System.Text.Encoding.UTF8.GetBytes($"{Path.GetFullPath(executable)}\0{size}\0{modified}"));
        }
        return Convert.ToHexString(hasher.GetHashAndReset()).ToLowerInvariant();
    }

    /// <summary>The story source files under a root, sorted by relative path.</summary>
    private static List<string> SourceFiles(string root)
    {
        var files = new List<string>();
        void Walk(string directory)
        {
            foreach (var child in Directory.EnumerateDirectories(directory))
            {
                var name = Path.GetFileName(child);
                if (name.StartsWith('.') || SkippedDirectories.Contains(name) || name.EndsWith(".tests", StringComparison.Ordinal)) continue;
                Walk(child);
            }
            foreach (var file in Directory.EnumerateFiles(directory))
            {
                var ext = Path.GetExtension(file);
                if (ext is ".story" or ".chord") files.Add(file);
            }
        }
        Walk(root);
        files.Sort((a, b) => string.CompareOrdinal(a.Substring(root.Length), b.Substring(root.Length)));
        return files;
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
