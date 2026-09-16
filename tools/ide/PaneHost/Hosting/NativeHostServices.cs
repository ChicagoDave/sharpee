// The desktop implementation of IHostServices: System.Diagnostics.Process for
// subprocesses, System.IO for files, and app-relative resolution of the vendored
// toolchain that tools/ide/vendor-toolchain.sh assembles (toolchain/bin/sharpee,
// toolchain/node/bin/node).
//
// Nothing here is Avalonia-specific — that is the point of the phase. An Avalonia
// desktop head is a plain .NET process, so the capability half of "capability
// parity" is the same code WPF would run, with no bridge in between.
//
// Public interface: NativeHostServices(toolchainRoot).
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Diagnostics;
using System.Runtime.InteropServices;

namespace PaneHost.Hosting;

/// <summary>Real subprocess, filesystem, and toolchain access for a .NET desktop host.</summary>
public sealed class NativeHostServices : IHostServices
{
    private readonly string? _toolchainRoot;

    /// <param name="toolchainRoot">
    /// The directory vendor-toolchain.sh produced (contains bin/sharpee and node/bin/node),
    /// or null when the host ships no toolchain.
    /// </param>
    public NativeHostServices(string? toolchainRoot) => _toolchainRoot = toolchainRoot;

    public bool IsNative => true;

    public string Describe() =>
        $"native host — {RuntimeInformation.FrameworkDescription} on {RuntimeInformation.OSDescription} "
        + $"({RuntimeInformation.OSArchitecture}); pid {Environment.ProcessId}";

    public string? DocumentsDirectory =>
        Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

    public string? ToolchainShim => ExistingOrNull(_toolchainRoot, "bin", "sharpee");

    public string? ToolchainNode => ExistingOrNull(_toolchainRoot, "node", "bin", "node");

    /// <summary>
    /// Spawns the process, streams both pipes line by line as they arrive, and
    /// returns its exit code. Cancellation kills the whole process tree.
    /// </summary>
    /// <exception cref="InvalidOperationException">Process.Start refused to start the executable.</exception>
    /// <exception cref="OperationCanceledException">The token fired before the process exited.</exception>
    public async Task<int> RunAsync(
        string executable,
        IReadOnlyList<string> arguments,
        string? workingDirectory,
        Action<string> onStdoutLine,
        Action<string> onStderrLine,
        CancellationToken cancellation)
    {
        var start = new ProcessStartInfo
        {
            FileName = executable,
            WorkingDirectory = workingDirectory ?? string.Empty,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);

        using var process = new Process { StartInfo = start, EnableRaisingEvents = true };
        process.OutputDataReceived += (_, e) => { if (e.Data is not null) onStdoutLine(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data is not null) onStderrLine(e.Data); };

        if (!process.Start())
            throw new InvalidOperationException($"Process.Start returned false for {executable}");

        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        using var registration = cancellation.Register(() =>
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch { /* already gone */ }
        });

        await process.WaitForExitAsync(cancellation).ConfigureAwait(false);
        return process.ExitCode;
    }

    public string ReadAllText(string path) => File.ReadAllText(path);

    public void WriteAllText(string path, string contents) => File.WriteAllText(path, contents);

    private static string? ExistingOrNull(string? root, params string[] parts)
    {
        if (root is null) return null;
        var path = Path.Combine(root, Path.Combine(parts));
        return File.Exists(path) ? path : null;
    }
}
