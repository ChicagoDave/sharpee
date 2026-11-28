// One check of a story's buffer through `compose --json --check` (ADR-258 D5), for the
// Avalonia head's Problems surface.
//
// An unsaved buffer is composed from a hidden sibling, `.sharpee-compose.story`, so its
// imports resolve against the story's own folder; the sibling is deleted whatever happens,
// and the records naming it are mapped back to the story file — the Swift head's
// ComposeScheduler rule. The run keeps the text it composed, which is what decides whether
// a fix is still current (ComposeProblems.CurrentFixes).
//
// Out of the window so it can be run against a real compose: the shell supplies the
// toolchain command and a line sink for stderr, and keeps the result.
//
// Public interface: ComposeCheck.SnapshotName, ComposeCheck.Result, ComposeCheck.RunAsync.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using PaneHost.Hosting;

namespace PaneHost.Shell;

public static class ComposeCheck
{
    /// <summary>The hidden sibling an unsaved buffer is composed from.</summary>
    public const string SnapshotName = ".sharpee-compose.story";

    /// <summary>A finished check: the compose's exit code and its run, or null when it printed no readable payload.</summary>
    public sealed record Result(int Exit, ComposeRun? Run);

    /// <summary>Checks <paramref name="content"/> as the text of <paramref name="storyFile"/>.</summary>
    /// <param name="host">The process runner.</param>
    /// <param name="executable">The toolchain command: the `sharpee` shim, or `node` for an in-repo CLI.</param>
    /// <param name="prefix">Arguments before `compose` (the CLI script, when <paramref name="executable"/> is node).</param>
    /// <param name="storyFile">The story file the records are sited in.</param>
    /// <param name="content">The story's buffer, saved or not.</param>
    /// <param name="onStderr">Where compose's stderr lines go.</param>
    /// <param name="cancellation">Stops the compose.</param>
    /// <returns>The exit code and the run; the run's records name <paramref name="storyFile"/>, never the snapshot.</returns>
    public static async Task<Result> RunAsync(
        IHostServices host, string executable, IReadOnlyList<string> prefix, string storyFile, string content,
        Action<string> onStderr, CancellationToken cancellation)
    {
        var onDisk = File.Exists(storyFile) ? await File.ReadAllTextAsync(storyFile, cancellation) : null;
        var folder = Path.GetDirectoryName(storyFile)!;
        var snapshot = string.Equals(content, onDisk, StringComparison.Ordinal) ? null : Path.Combine(folder, SnapshotName);
        if (snapshot is not null) await File.WriteAllTextAsync(snapshot, content, cancellation);

        var stdout = new System.Text.StringBuilder();
        int exit;
        try
        {
            exit = await host.RunAsync(executable, prefix.Concat(new[] { "compose", snapshot ?? storyFile, "--json", "--check" }).ToList(),
                folder, line => stdout.AppendLine(line), onStderr, cancellation);
        }
        finally
        {
            if (snapshot is not null) File.Delete(snapshot);
        }

        if (ComposeProblems.Read(stdout.ToString()) is not { } payload) return new Result(exit, null);
        var records = payload.Diagnostics
            .Select(r => snapshot is not null && string.Equals(r.File, snapshot, StringComparison.Ordinal) ? r with { File = storyFile } : r)
            .ToList();
        return new Result(exit, new ComposeRun(storyFile, content, records));
    }
}
