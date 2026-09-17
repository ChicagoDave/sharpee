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
                var json = new JsonObject { ["lastStoryFile"] = value };
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
