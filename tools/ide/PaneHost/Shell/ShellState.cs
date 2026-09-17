// The one thing the shell remembers between runs: which story was open.
//
// WHY ANYTHING IS REMEMBERED AT ALL. An installed app that opens blank every time makes a
// person re-find their work on every launch. Reopening the last story is the smallest
// answer to "what should it open" that is useful and that invents no product surface
// (GH #479 asks the larger question — a welcome state, a Documents root per ADR-280 D6 —
// and this does not answer it).
//
// IT IS A CONVENIENCE, NEVER A SOURCE OF TRUTH. A missing, unreadable or stale file is a
// normal state: the shell opens with nothing and says so. Nothing here throws outward.
//
// Public interface: ShellState — LastStoryFile (get/set).
// Owner context: tools/ide — the Avalonia desktop head's shell.

using System.Text.Json;
using System.Text.Json.Nodes;

namespace PaneHost.Shell;

/// <summary>Per-user shell state, stored beside the app's other Application Support data.</summary>
public static class ShellState
{
    private const string FileName = "shell-state.json";

    /// <summary>How many stories File ▸ Open Recent remembers.</summary>
    private const int RecentLimit = 8;

    /// <summary>
    /// The stories opened most recently, newest first, skipping any that have since been
    /// moved or deleted. What File ▸ Open Recent lists.
    /// </summary>
    public static IReadOnlyList<string> Recent
    {
        get
        {
            try
            {
                var path = StatePath();
                if (!File.Exists(path)) return Array.Empty<string>();
                var stored = JsonNode.Parse(File.ReadAllText(path))?["recent"]?.AsArray();
                if (stored is null) return Array.Empty<string>();
                return stored
                    .Select(node => node?.GetValue<string>())
                    .OfType<string>()
                    .Where(File.Exists)
                    .Take(RecentLimit)
                    .ToList();
            }
            catch
            {
                return Array.Empty<string>();
            }
        }
    }

    /// <summary>
    /// The `.story` path open when the app last closed, or null when there is none or the
    /// stored one no longer exists on disk.
    /// </summary>
    public static string? LastStoryFile
    {
        get
        {
            try
            {
                var path = StatePath();
                if (!File.Exists(path)) return null;
                var stored = JsonNode.Parse(File.ReadAllText(path))?["lastStoryFile"]?.GetValue<string>();
                return stored is not null && File.Exists(stored) ? stored : null;
            }
            catch
            {
                // Unreadable state is the same as no state; it must never keep the app shut.
                return null;
            }
        }
        set
        {
            try
            {
                var path = StatePath();
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);

                // Opening a story is also what makes it recent, so the two are written
                // together — a recent list maintained separately drifts from what was
                // actually opened.
                var recent = new List<string>();
                if (value is not null) recent.Add(value);
                recent.AddRange(Recent.Where(p => !string.Equals(p, value, StringComparison.Ordinal)));

                var json = new JsonObject
                {
                    ["lastStoryFile"] = value,
                    ["recent"] = new JsonArray(recent.Take(RecentLimit).Select(p => (JsonNode)p!).ToArray()),
                };
                File.WriteAllText(path, json.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
            }
            catch
            {
                // Losing the memory of the last story is not worth failing a save or a quit over.
            }
        }
    }

    /// <summary>
    /// Where the state file lives. Null means the per-user default; a test sets it to a
    /// temp directory so the suite cannot overwrite the author's own remembered story.
    /// </summary>
    internal static string? DirectoryOverride { get; set; }

    /// <summary>Application Support on macOS, the platform's local app-data directory elsewhere.</summary>
    private static string StatePath()
    {
        if (DirectoryOverride is { } overridden) return Path.Combine(overridden, FileName);

        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var root = OperatingSystem.IsMacOS()
            ? Path.Combine(home, "Library", "Application Support", "ChordWriterAvalonia")
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ChordWriterAvalonia");
        return Path.Combine(root, FileName);
    }
}
