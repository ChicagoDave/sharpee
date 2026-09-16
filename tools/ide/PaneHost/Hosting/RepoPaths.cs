// Every filesystem path PaneHost reads from or writes to, resolved rather than hard-coded.
//
// Purpose: replace the spike's absolute-path constants with one resolver, so the app runs
// on any clone and no source file names a developer's home directory. The spike pointed at
// `/Users/david/repos/spikes/...` in nine places, four of them at a *sibling* spike's
// staging directory; none of that can live in the repository.
// Public interface: RepoPaths (static) — RepoRoot, DevOut, and one member per asset.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

namespace PaneHost.Hosting;

/// <summary>
/// Resolves the repository root and the assets PaneHost reads, with an environment
/// override for each machine-local dependency that cannot live in the repository.
/// </summary>
/// <remarks>
/// Two invariants hold here rather than at the call sites. The repository root is
/// discovered by marker file and <b>throws</b> when it cannot be found, so a
/// misresolved root fails immediately instead of producing a wrong path that a
/// later `File.Exists` reports as a missing asset. And <see cref="DevOut"/> is
/// never inside the repository, carrying forward the spike's own rule that probe
/// output does not land in a working tree.
/// </remarks>
public static class RepoPaths
{
    /// <summary>Marker that identifies the repository root; present at the root and nowhere above it.</summary>
    private const string RootMarker = "pnpm-workspace.yaml";

    private static readonly Lazy<string> LazyRepoRoot = new(ResolveRepoRoot);

    /// <summary>
    /// The repository root. Honours <c>SHARPEE_REPO</c>, otherwise walks up from the
    /// running assembly looking for <see cref="RootMarker"/>.
    /// </summary>
    /// <exception cref="DirectoryNotFoundException">
    /// No ancestor carries the marker and no override is set — the app cannot locate the
    /// repository it reads its assets from.
    /// </exception>
    public static string RepoRoot => LazyRepoRoot.Value;

    /// <summary>
    /// Where PaneHost writes probe logs and other development output. Honours
    /// <c>SHARPEE_IDE_DEV_OUT</c>, otherwise a per-user cache directory.
    /// Deliberately never inside the repository.
    /// </summary>
    public static string DevOut
    {
        get
        {
            var overridden = Environment.GetEnvironmentVariable("SHARPEE_IDE_DEV_OUT");
            if (!string.IsNullOrWhiteSpace(overridden)) return overridden;

            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(home, "Library", "Caches", "net.sharpee.panehost", "dev");
        }
    }

    // --- In-repository assets, real and checked in -------------------------------

    /// <summary>fernhill's story folder — the development story this head opens. Read-only.</summary>
    public static string FernhillFolder => Path.Combine(RepoRoot, "branch-stories", "fernhill");

    /// <summary>fernhill's `.story` source.</summary>
    public static string FernhillStory => Path.Combine(FernhillFolder, "fernhill.story");

    /// <summary>fernhill's tree document (ADR-307), read by the testing pane.</summary>
    public static string FernhillTests => Path.Combine(FernhillFolder, "fernhill.tests.json");

    /// <summary>fernhill's built browser bundle, served to the play pane.</summary>
    public static string FernhillBundle => Path.Combine(FernhillFolder, "dist", "web", "fernhill");

    /// <summary>The testing-surface assets, shared with the Swift app (ADR-341 D3/AC-3: panes built once).</summary>
    public static string TestingSurface =>
        Path.Combine(RepoRoot, "tools", "ide", "SharpeeIDE", "Resources", "testing-surface");

    /// <summary>The docs-tab assets, shared with the Swift app.</summary>
    public static string DocsTab =>
        Path.Combine(RepoRoot, "tools", "ide", "SharpeeIDE", "Resources", "docs-tab");

    /// <summary>
    /// The editor's lexer bridge, built from `tools/ide/editor-bridge` by its own `build.mjs`.
    /// Absent until that build has run, which the editor reports rather than crashing on.
    /// </summary>
    public static string EditorBridge =>
        Path.Combine(RepoRoot, "tools", "ide", "editor-bridge", "dist", "lexer-server.js");

    // --- Machine-local dependencies, overridable ---------------------------------

    /// <summary>
    /// The vendored toolchain root — a `toolchain/` directory as `vendor-toolchain.sh` produces.
    /// Honours <c>SHARPEE_IDE_TOOLCHAIN</c>; null when unset, which the host layer treats as
    /// "no vendored toolchain" rather than guessing a location.
    /// </summary>
    public static string? ToolchainRoot =>
        NullIfBlank(Environment.GetEnvironmentVariable("SHARPEE_IDE_TOOLCHAIN"));

    /// <summary>
    /// The `node` the editor bridge runs under: the vendored one when a toolchain is
    /// configured, otherwise whatever `node` the PATH resolves, so a developer without a
    /// staged toolchain can still run the editor.
    /// </summary>
    public static string Node
    {
        get
        {
            var root = ToolchainRoot;
            if (root is null) return "node";

            var vendored = Path.Combine(root, "node", "bin", "node");
            return File.Exists(vendored) ? vendored : "node";
        }
    }

    /// <summary>
    /// A world-index JSON to feed the map surface. Honours <c>SHARPEE_IDE_WORLD_INDEX</c>;
    /// null when unset, and the map draws empty rather than failing.
    /// </summary>
    public static string? WorldIndex =>
        NullIfBlank(Environment.GetEnvironmentVariable("SHARPEE_IDE_WORLD_INDEX"));

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    /// <summary>Walks up from the running assembly for <see cref="RootMarker"/>.</summary>
    private static string ResolveRepoRoot()
    {
        var overridden = Environment.GetEnvironmentVariable("SHARPEE_REPO");
        if (!string.IsNullOrWhiteSpace(overridden))
        {
            if (!File.Exists(Path.Combine(overridden, RootMarker)))
            {
                throw new DirectoryNotFoundException(
                    $"SHARPEE_REPO is set to '{overridden}', which has no {RootMarker}.");
            }
            return overridden;
        }

        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, RootMarker))) return dir.FullName;
        }

        throw new DirectoryNotFoundException(
            $"No ancestor of '{AppContext.BaseDirectory}' contains {RootMarker}. " +
            "Set SHARPEE_REPO to the repository root.");
    }
}
