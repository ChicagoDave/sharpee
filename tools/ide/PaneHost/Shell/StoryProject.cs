// What the shell means by "a story is open": the folder, the .story inside it, and the
// built artifacts the panes and the tests need.
//
// RESOLUTION, NOT DISCOVERY. Every rule here answers one question — given a path a person
// chose in a file dialog, what are we looking at — and answers it from the filesystem
// alone. Nothing parses Chord: the id is the .story's stem, and the built bundle is
// confirmed by its directory existing, because a story the author has not built yet must
// resolve cleanly and simply report that it is not built.
//
// IT REPLACES A HARD-CODED fernhill. Until 2026-09-17 the shell could only ever open the
// development story RepoPaths named, which is null in a bundle — so an installed app had
// no way to open anything (GH #482). This is the type that made a story a parameter.
//
// Public interface: StoryProject — Resolve, Folder, StoryFile, Id, WebBundle, StoryIr,
// TestsDocument, IsBuilt.
// Owner context: tools/ide — the Avalonia desktop head's shell.

namespace PaneHost.Shell;

/// <summary>An open story: its folder, its source file, and whatever it has been built into.</summary>
/// <param name="Folder">The directory holding the .story file.</param>
/// <param name="StoryFile">The absolute path of the .story source.</param>
/// <param name="Id">The story's id — the .story file's stem, which is what `sharpee build` names its output after.</param>
public sealed record StoryProject(string Folder, string StoryFile, string Id)
{
    /// <summary>
    /// Resolves a chosen path to a project, or null when it is not one.
    /// </summary>
    /// <param name="path">A `.story` file, or a folder containing one.</param>
    /// <returns>The project, or null when the path holds no single unambiguous .story.</returns>
    public static StoryProject? Resolve(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;

        if (File.Exists(path) && path.EndsWith(".story", StringComparison.OrdinalIgnoreCase))
        {
            var folder = Path.GetDirectoryName(Path.GetFullPath(path));
            return folder is null ? null : new StoryProject(folder, Path.GetFullPath(path), Stem(path));
        }

        if (!Directory.Exists(path)) return null;

        var stories = Directory.GetFiles(path, "*.story", SearchOption.TopDirectoryOnly)
            .Where(f => !Path.GetFileName(f).StartsWith('.'))
            .OrderBy(f => f, StringComparer.Ordinal)
            .ToList();
        if (stories.Count == 0) return null;

        // A folder with several .story files is ambiguous unless one is named after the
        // folder, which is the layout `sharpee init` produces.
        var preferred = stories.Count == 1
            ? stories[0]
            : stories.FirstOrDefault(f => Stem(f) == Path.GetFileName(Path.TrimEndingDirectorySeparator(path)));

        return preferred is null
            ? null
            : new StoryProject(Path.GetFullPath(path), Path.GetFullPath(preferred), Stem(preferred));
    }

    /// <summary>The built browser bundle `sharpee build` emits, or null when the story is not built.</summary>
    /// <remarks>
    /// The id-named directory is authoritative. The single-subdirectory fallback covers a
    /// story whose header id differs from its filename, which build honours and this type
    /// deliberately does not read Chord to discover.
    /// </remarks>
    public string? WebBundle
    {
        get
        {
            var byId = Path.Combine(Folder, "dist", "web", Id);
            if (Directory.Exists(byId)) return byId;

            var webRoot = Path.Combine(Folder, "dist", "web");
            if (!Directory.Exists(webRoot)) return null;
            var only = Directory.GetDirectories(webRoot);
            return only.Length == 1 ? only[0] : null;
        }
    }

    /// <summary>The tree document (ADR-307) the testing pane replays, or null when there is none.</summary>
    public string? TestsDocument
    {
        get
        {
            var byId = Path.Combine(Folder, Id + ".tests.json");
            if (File.Exists(byId)) return byId;

            var any = Directory.GetFiles(Folder, "*.tests.json", SearchOption.TopDirectoryOnly);
            return any.Length == 1 ? any[0] : null;
        }
    }

    /// <summary>True when the story has been built and the panes have something to serve.</summary>
    /// <summary>The story IR a successful build emits, or null before one has run.</summary>
    public string? StoryIr
    {
        get
        {
            var path = Path.Combine(Folder, "dist", Id + ".ir.json");
            return File.Exists(path) ? path : null;
        }
    }

    public bool IsBuilt => WebBundle is not null;

    private static string Stem(string path) => Path.GetFileNameWithoutExtension(path);
}
