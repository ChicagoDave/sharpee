// Real-path tests for the Avalonia desktop head's host capabilities (rule 13a).
//
// Platform-shaped, not macOS-shaped: the toolchain named by SHARPEE_IDE_TOOLCHAIN is
// whichever target vendor-toolchain.sh assembled for THIS machine, so the shim and
// runtime are asserted by their platform leaf. Running these on Windows is what
// exercises the batch-shim spawn path in NativeHostServices; no other test does.
//
// Nothing is stubbed: the real vendored `sharpee` shim, the real vendored `node`,
// a real Documents story folder, real processes. Two of those dependencies cannot
// live in the repository — a 175 MB staged toolchain and a Documents fixture — so
// each is named by an environment variable and its absence FAILS the run with the
// variable's name. It does not skip: a skipped real-path test reports green
// without exercising anything, which is the GH #435 pattern these tests exist to
// avoid.
//
// Public interface: xunit test classes, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using System.Diagnostics;
using System.Text.Json;
using PaneHost.Hosting;

namespace PaneHost.Tests;

/// <summary>
/// The machine-local real dependencies these tests drive, each required by name.
/// </summary>
internal static class CapabilityPaths
{
    /// <summary>
    /// A `toolchain/` directory as `vendor-toolchain.sh` produces it (~175 MB), named by
    /// <c>SHARPEE_IDE_TOOLCHAIN</c>. Not vendored into the repository and not re-staged per run.
    /// </summary>
    public static string ToolchainRoot => Required("SHARPEE_IDE_TOOLCHAIN");

    /// <summary>The shim's filename on the platform running the tests (vendor-toolchain.sh:24-31).</summary>
    public static string ShimLeaf => OperatingSystem.IsWindows() ? "sharpee.cmd" : "sharpee";

    /// <summary>The vendored runtime's filename on the platform running the tests.</summary>
    public static string NodeLeaf => OperatingSystem.IsWindows() ? "node.exe" : "node";

    /// <summary>
    /// A dedicated Documents story folder, named by <c>SHARPEE_IDE_CAPABILITY_FIXTURE</c>.
    /// Never a real story: these tests write into it.
    /// </summary>
    public static string StoryFolder => Required("SHARPEE_IDE_CAPABILITY_FIXTURE");

    /// <summary>The fixture's `.story` file, named by <c>SHARPEE_IDE_CAPABILITY_STORY</c>.</summary>
    public static string StoryFile => Required("SHARPEE_IDE_CAPABILITY_STORY");

    public const string VendoredNodeVersion = "v22.23.1";

    /// <summary>Reads a required environment variable, failing with its name when unset.</summary>
    /// <exception cref="InvalidOperationException">The variable is unset or blank.</exception>
    private static string Required(string name)
    {
        var value = Environment.GetEnvironmentVariable(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"{name} is not set. These are real-path tests (rule 13a) and will not " +
                "substitute a stub for the dependency it names. See tools/ide/PaneHost/README.md.");
        }
        return value;
    }
}

public class ToolchainResolutionTests
{
    [Fact]
    public void toolchain_paths_resolve_only_when_the_files_exist()
    {
        var real = new NativeHostServices(CapabilityPaths.ToolchainRoot);
        var missing = new NativeHostServices("/no/such/toolchain");
        var none = new NativeHostServices(null);

        Assert.Equal(
            Path.Combine(CapabilityPaths.ToolchainRoot, "bin", CapabilityPaths.ShimLeaf),
            real.ToolchainShim);
        Assert.Equal(
            Path.Combine(CapabilityPaths.ToolchainRoot, "node", "bin", CapabilityPaths.NodeLeaf),
            real.ToolchainNode);
        Assert.True(File.Exists(real.ToolchainShim));
        Assert.True(File.Exists(real.ToolchainNode));

        Assert.Null(missing.ToolchainShim);
        Assert.Null(missing.ToolchainNode);
        Assert.Null(none.ToolchainShim);
        Assert.Null(none.ToolchainNode);

        Assert.True(real.IsNative);
        Assert.Contains("native host", real.Describe());
    }
}

public class SubprocessTests
{
    private static NativeHostServices Host() => new(CapabilityPaths.ToolchainRoot);

    [Fact]
    public async Task vendored_node_runs_and_reports_the_vendored_version()
    {
        var host = Host();
        var stdout = new List<string>();
        var stderr = new List<string>();

        var exit = await host.RunAsync(host.ToolchainNode!, new[] { "--version" }, null,
            stdout.Add, stderr.Add, CancellationToken.None);

        Assert.Equal(0, exit);
        Assert.Equal(new[] { CapabilityPaths.VendoredNodeVersion }, stdout);
        Assert.Empty(stderr);
    }

    [Fact]
    public async Task compose_json_through_the_sealed_shim_returns_gate_clean_ir_for_the_real_story()
    {
        var host = Host();
        var stdout = new List<string>();
        var stderr = new List<string>();

        var exit = await host.RunAsync(host.ToolchainShim!,
            new[] { "compose", CapabilityPaths.StoryFile, "--json" },
            CapabilityPaths.StoryFolder, stdout.Add, stderr.Add, CancellationToken.None);

        Assert.Equal(0, exit);
        var single = Assert.Single(stdout);
        using var json = JsonDocument.Parse(single);
        Assert.Equal(2, json.RootElement.GetProperty("schemaVersion").GetInt32());
        Assert.Empty(json.RootElement.GetProperty("diagnostics").EnumerateArray());
        Assert.False(string.IsNullOrWhiteSpace(
            json.RootElement.GetProperty("ir").GetProperty("meta").GetProperty("title").GetString()));
    }

    [Fact]
    public async Task compose_of_a_missing_story_exits_nonzero_and_reports_on_stderr()
    {
        var host = Host();
        var stdout = new List<string>();
        var stderr = new List<string>();

        var exit = await host.RunAsync(host.ToolchainShim!,
            new[] { "compose", Path.Combine(CapabilityPaths.StoryFolder, "no-such.story"), "--json" },
            CapabilityPaths.StoryFolder, stdout.Add, stderr.Add, CancellationToken.None);

        Assert.NotEqual(0, exit);
        Assert.NotEmpty(stderr);
    }

    [Fact]
    public async Task stdout_lines_arrive_while_the_process_is_still_running()
    {
        var host = Host();
        var arrivals = new List<TimeSpan>();
        var clock = Stopwatch.StartNew();

        // Three ticks 400 ms apart: if the lines were batched at exit their
        // arrival times would cluster instead of spreading across the run.
        const string script =
            "let n=0;const t=setInterval(()=>{console.log('tick '+(++n));if(n===3){clearInterval(t);}},400);";

        var exit = await host.RunAsync(host.ToolchainNode!, new[] { "-e", script }, null,
            _ => { lock (arrivals) arrivals.Add(clock.Elapsed); }, _ => { }, CancellationToken.None);
        var exitAt = clock.Elapsed;

        Assert.Equal(0, exit);
        Assert.Equal(3, arrivals.Count);
        Assert.True((arrivals[2] - arrivals[0]).TotalMilliseconds >= 600,
            $"first-to-third spread was {(arrivals[2] - arrivals[0]).TotalMilliseconds:F0} ms — lines look batched");
        Assert.True((exitAt - arrivals[0]).TotalMilliseconds >= 600,
            $"first-to-exit spread was {(exitAt - arrivals[0]).TotalMilliseconds:F0} ms — lines look batched");
    }

    [Fact]
    public async Task cancellation_kills_the_process_and_throws()
    {
        var host = Host();
        var sentinel = "avalonia-spike-sentinel-" + Guid.NewGuid().ToString("N")[..8];
        using var cts = new CancellationTokenSource();

        var run = host.RunAsync(host.ToolchainNode!,
            new[] { "-e", $"/*{sentinel}*/setInterval(()=>{{}},1000);" }, null,
            _ => { }, _ => { }, cts.Token);

        await Task.Delay(500);
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => run);

        // The process itself is gone, not merely detached from the awaiting task.
        await Task.Delay(300);
        Assert.DoesNotContain(sentinel, RunningCommandLines());
    }

    private static string RunningCommandLines()
    {
        using var ps = Process.Start(new ProcessStartInfo("/bin/ps", "-axo command")
        {
            RedirectStandardOutput = true,
            UseShellExecute = false,
        })!;
        var text = ps.StandardOutput.ReadToEnd();
        ps.WaitForExit();
        return text;
    }
}

public class DocumentsFolderTests
{
    [Fact]
    public void write_then_read_in_the_real_documents_story_folder()
    {
        var host = new NativeHostServices(CapabilityPaths.ToolchainRoot);
        var target = Path.Combine(CapabilityPaths.StoryFolder, "avalonia-capability-check.txt");
        var content = $"written by the Avalonia spike at {DateTimeOffset.Now:O}";

        host.WriteAllText(target, content);

        // Read back independently of the host, so the assertion is on disk state.
        Assert.True(File.Exists(target));
        Assert.Equal(content, File.ReadAllText(target));
        Assert.Equal(content, host.ReadAllText(target));

        // The Documents root the app would resolve, and the fixture's real .story.
        Assert.Equal(
            Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            host.DocumentsDirectory);
        Assert.StartsWith("story", host.ReadAllText(CapabilityPaths.StoryFile));
    }

    [Fact]
    public void write_into_a_missing_directory_is_refused()
    {
        var host = new NativeHostServices(null);
        var target = Path.Combine(CapabilityPaths.StoryFolder, "no-such-subfolder", "x.txt");

        Assert.Throws<DirectoryNotFoundException>(() => host.WriteAllText(target, "nope"));
        Assert.False(File.Exists(target));
    }
}

public class BrowserHostServicesTests
{
    [Fact]
    public async Task every_capability_is_refused_with_platform_not_supported()
    {
        var host = new BrowserHostServices();

        Assert.False(host.IsNative);
        Assert.Null(host.DocumentsDirectory);
        Assert.Null(host.ToolchainShim);
        Assert.Null(host.ToolchainNode);
        Assert.Contains("browser host", host.Describe());

        await Assert.ThrowsAsync<PlatformNotSupportedException>(() =>
            host.RunAsync("node", new[] { "--version" }, null, _ => { }, _ => { }, CancellationToken.None));
        Assert.Throws<PlatformNotSupportedException>(() => host.ReadAllText("/tmp/x"));
        Assert.Throws<PlatformNotSupportedException>(() => host.WriteAllText("/tmp/x", "y"));
    }
}
