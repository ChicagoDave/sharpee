// What the Avalonia app needs from whatever hosts it: subprocesses, the real
// filesystem, and the vendored toolchain. One interface, two implementations —
// NativeHostServices for a desktop head, BrowserHostServices for Avalonia's
// WebAssembly head, where none of this exists and every call says so.
//
// The seam is deliberately the same shape the OpenSilver spike used, so the
// four-way comparison in Phase 6 compares like with like rather than comparing
// two different designs that happen to run on two different hosts.
//
// Public interface: IHostServices, HostServices.Current.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

namespace PaneHost.Hosting;

/// <summary>Host capabilities the app consumes without knowing which host it is in.</summary>
public interface IHostServices
{
    /// <summary>True when subprocess, filesystem, and toolchain calls are real.</summary>
    bool IsNative { get; }

    /// <summary>One line naming the host, runtime, and OS — for the log header.</summary>
    string Describe();

    /// <summary>The author's Documents directory (ADR-280 D6 root), or null in the browser.</summary>
    string? DocumentsDirectory { get; }

    /// <summary>
    /// The vendored `toolchain/bin/sharpee` shim (`sharpee.cmd` on Windows), or null when
    /// this host carries none.
    /// </summary>
    string? ToolchainShim { get; }

    /// <summary>
    /// The vendored `toolchain/node/bin/node` runtime (`node.exe` on Windows), or null when
    /// this host carries none.
    /// </summary>
    string? ToolchainNode { get; }

    /// <summary>
    /// Runs a process and delivers each stdout/stderr line as it arrives.
    /// Returns the exit code. Throws PlatformNotSupportedException in the browser.
    /// </summary>
    Task<int> RunAsync(
        string executable,
        IReadOnlyList<string> arguments,
        string? workingDirectory,
        Action<string> onStdoutLine,
        Action<string> onStderrLine,
        CancellationToken cancellation);

    /// <summary>Reads a UTF-8 text file. Throws PlatformNotSupportedException in the browser.</summary>
    string ReadAllText(string path);

    /// <summary>Writes a UTF-8 text file, creating or replacing it. Throws PlatformNotSupportedException in the browser.</summary>
    void WriteAllText(string path, string contents);
}

/// <summary>The host the app is running in. A desktop head replaces the default before the app starts.</summary>
public static class HostServices
{
    /// <summary>Defaults by runtime: the browser head gets the refusing host, everything else the native one with no toolchain.</summary>
    public static IHostServices Current { get; set; } =
        OperatingSystem.IsBrowser() ? new BrowserHostServices() : new NativeHostServices(toolchainRoot: null);
}
