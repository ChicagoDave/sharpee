// Avalonia's WebAssembly head has no process, no filesystem, and no toolchain,
// and every call says so with PlatformNotSupportedException rather than
// pretending.
//
// Public interface: BrowserHostServices.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Runtime.InteropServices;

namespace PaneHost.Hosting;

/// <summary>The refusing host: reports itself as the browser and throws on every capability.</summary>
public sealed class BrowserHostServices : IHostServices
{
    private const string Reason = "not available in the browser (WebAssembly) head";

    public bool IsNative => false;

    public string Describe() =>
        $"browser host — {RuntimeInformation.FrameworkDescription} on {RuntimeInformation.OSDescription}";

    public string? DocumentsDirectory => null;
    public string? ToolchainShim => null;
    public string? ToolchainNode => null;

    public Task<int> RunAsync(string executable, IReadOnlyList<string> arguments, string? workingDirectory,
        Action<string> onStdoutLine, Action<string> onStderrLine, CancellationToken cancellation)
        => throw new PlatformNotSupportedException($"RunAsync: {Reason}");

    public string ReadAllText(string path)
        => throw new PlatformNotSupportedException($"ReadAllText: {Reason}");

    public void WriteAllText(string path, string contents)
        => throw new PlatformNotSupportedException($"WriteAllText: {Reason}");
}
