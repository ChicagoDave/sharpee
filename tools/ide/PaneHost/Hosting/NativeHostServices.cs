// The desktop implementation of IHostServices: System.Diagnostics.Process for
// subprocesses, System.IO for files, and app-relative resolution of the vendored
// toolchain that tools/ide/vendor-toolchain.sh assembles.
//
// ONE LAYOUT, PLATFORM-SPECIFIC LEAF. The assembler writes the same directory
// shape for every target and varies only the filename: bin/sharpee and
// node/bin/node on macOS and Linux, bin/sharpee.cmd and node/bin/node.exe on
// Windows (vendor-toolchain.sh:24-31). Resolution here differs by leaf for the
// same reason -- a second path shape would be a second thing to keep in step.
//
// Windows spells its shim as a batch file, and CreateProcess cannot start one:
// with UseShellExecute=false a .cmd FileName fails as "not a valid Win32
// application". RunAsync therefore routes a batch shim through the command
// processor. That is a spawn concern, not a resolution one, so it lives in the
// spawn path and ToolchainShim keeps naming the file that actually exists.
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
using System.Text;

namespace PaneHost.Hosting;

/// <summary>Real subprocess, filesystem, and toolchain access for a .NET desktop host.</summary>
public sealed class NativeHostServices : IHostServices
{
    private readonly string? _toolchainRoot;

    /// <param name="toolchainRoot">
    /// The directory vendor-toolchain.sh produced (contains the bin/ shim and node/bin/
    /// runtime for this platform), or null when the host ships no toolchain.
    /// </param>
    public NativeHostServices(string? toolchainRoot) => _toolchainRoot = toolchainRoot;

    public bool IsNative => true;

    public string Describe() =>
        $"native host — {RuntimeInformation.FrameworkDescription} on {RuntimeInformation.OSDescription} "
        + $"({RuntimeInformation.OSArchitecture}); pid {Environment.ProcessId}";

    public string? DocumentsDirectory =>
        Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

    public string? ToolchainShim => ExistingOrNull(_toolchainRoot, "bin", ShimLeaf);

    public string? ToolchainNode => ExistingOrNull(_toolchainRoot, "node", "bin", NodeLeaf);

    /// <summary>The shim's filename for this platform: `sharpee.cmd` on Windows, `sharpee` elsewhere.</summary>
    private static string ShimLeaf => OperatingSystem.IsWindows() ? "sharpee.cmd" : "sharpee";

    /// <summary>The runtime's filename for this platform: `node.exe` on Windows, `node` elsewhere.</summary>
    private static string NodeLeaf => OperatingSystem.IsWindows() ? "node.exe" : "node";

    /// <summary>
    /// Spawns the process, streams both pipes line by line as they arrive, and
    /// returns its exit code. Cancellation kills the whole process tree. A Windows
    /// batch shim is run through the command processor, since CreateProcess cannot
    /// start one directly.
    /// </summary>
    /// <exception cref="InvalidOperationException">Process.Start refused to start the executable.</exception>
    /// <exception cref="ArgumentException">A Windows batch invocation carried an argument the command processor cannot receive intact.</exception>
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
            WorkingDirectory = workingDirectory ?? string.Empty,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        if (NeedsCommandProcessor(executable))
        {
            start.FileName = Environment.GetEnvironmentVariable("ComSpec") ?? "cmd.exe";
            start.Arguments = CommandProcessorLine(executable, arguments);
        }
        else
        {
            start.FileName = executable;
            foreach (var argument in arguments) start.ArgumentList.Add(argument);
        }

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

    /// <summary>
    /// True when the executable is a Windows batch file, which CreateProcess refuses and
    /// the command processor must run instead.
    /// </summary>
    private static bool NeedsCommandProcessor(string executable) =>
        OperatingSystem.IsWindows()
        && (executable.EndsWith(".cmd", StringComparison.OrdinalIgnoreCase)
            || executable.EndsWith(".bat", StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Builds a `cmd.exe` command line that runs the batch file with these arguments.
    /// `/d` skips AutoRun, `/v:off` disables delayed expansion, and `/s` selects the
    /// strip-outer-quotes rule, so each token is passed through as one quoted argument.
    /// </summary>
    /// <param name="executable">The batch file to run.</param>
    /// <param name="arguments">Its arguments, one per element.</param>
    /// <returns>The argument string for `cmd.exe`.</returns>
    /// <exception cref="ArgumentException">
    /// A token contains a double quote or a percent sign. Neither can be passed through
    /// `cmd /c` intact -- a quote re-splits the line and a percent expands against the
    /// environment -- so this refuses rather than silently running a different command.
    /// </exception>
    private static string CommandProcessorLine(string executable, IReadOnlyList<string> arguments)
    {
        var inner = new StringBuilder();
        AppendQuoted(inner, executable);
        foreach (var argument in arguments)
        {
            inner.Append(' ');
            AppendQuoted(inner, argument);
        }
        return $"/d /s /v:off /c \"{inner}\"";

        static void AppendQuoted(StringBuilder line, string token)
        {
            if (token.Contains('"') || token.Contains('%'))
            {
                throw new ArgumentException(
                    $"cannot pass \"{token}\" to a Windows batch shim: a double quote or percent " +
                    "sign is not representable on a cmd.exe command line.", nameof(arguments));
            }
            line.Append('"').Append(token).Append('"');
        }
    }

    private static string? ExistingOrNull(string? root, params string[] parts)
    {
        if (root is null) return null;
        var path = Path.Combine(root, Path.Combine(parts));
        return File.Exists(path) ? path : null;
    }
}
