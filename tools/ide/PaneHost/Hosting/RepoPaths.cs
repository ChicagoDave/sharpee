// Every filesystem path PaneHost reads from or writes to, resolved rather than hard-coded.
//
// TWO HOMES, NOT ONE. PaneHost runs from a developer's checkout and from an installed
// .app, and the assets live in different places in each. Product assets (the web panes,
// the editor bridge, the vendored toolchain) ship inside Contents/Resources and are
// resolved there when bundled. The development story is checkout-only and is therefore
// NULLABLE rather than assumed — a shipped app must not carry someone else's test story,
// so absence is a supported state, not an error. Resolving GH #474: before this, every
// path went through RepoRoot, which walks up for pnpm-workspace.yaml and THROWS when it
// finds none, so an installed app died at launch with
// "No ancestor of '/Applications/....app/Contents/Resources/' contains pnpm-workspace.yaml".
//
// Purpose: replace the spike's absolute-path constants with one resolver, so the app runs
// on any clone and no source file names a developer's home directory. The spike pointed at
// `/Users/david/repos/spikes/...` in nine places, four of them at a *sibling* spike's
// staging directory; none of that can live in the repository.
// Public interface: RepoPaths (static) — IsBundled, RepoRoot, DevOut, one member per asset.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

namespace PaneHost.Hosting;

/// <summary>
/// Resolves the repository root and the assets PaneHost reads, with an environment
/// override for each machine-local dependency that cannot live in the repository.
/// </summary>
/// <remarks>
/// Three invariants hold here rather than at the call sites. <see cref="RepoRoot"/> is
/// discovered by marker file and <b>throws</b> when it cannot be found, so a misresolved
/// root fails immediately instead of producing a wrong path that a later `File.Exists`
/// reports as a missing asset — but nothing an installed app needs goes through it, which
/// is why a bundle never trips that throw. <see cref="DevOut"/> is never inside the
/// repository, carrying forward the spike's own rule that probe output does not land in a
/// working tree. And the development story is nullable, so a bundle without it is a state
/// the callers handle rather than an error they hit.
/// </remarks>
public static class RepoPaths
{
    /// <summary>Marker that identifies the repository root; present at the root and nowhere above it.</summary>
    private const string RootMarker = "pnpm-workspace.yaml";

    private static readonly Lazy<string> LazyRepoRoot = new(ResolveRepoRoot);
    private static readonly Lazy<string?> LazyCheckoutRoot = new(TryResolveRepoRoot);
    private static readonly Lazy<string?> LazyBundleResources = new(ResolveBundleResources);

    /// <summary>
    /// The bundle's <c>Contents/Resources</c> when running from an installed .app, else null.
    /// The relocated layout (build-relocated-app.sh) puts the whole payload there, so the
    /// running assembly's own directory IS Resources and the app's Info.plist is one level up.
    /// </summary>
    public static string? BundleResources => LazyBundleResources.Value;

    /// <summary>True when running from an installed .app rather than a checkout.</summary>
    public static bool IsBundled => BundleResources is not null;

    /// <summary>The repository root, or null when running outside a checkout.</summary>
    public static string? CheckoutRoot => LazyCheckoutRoot.Value;

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

    // --- The development story: checkout-only, therefore nullable ----------------
    //
    // fernhill is a DEVELOPMENT story. It is not product content and must never ship
    // inside an installed bundle, so every member below is null when bundled and each
    // caller opens empty instead. What an installed app opens instead — a welcome state,
    // the last document, a Documents folder per ADR-280 D6 — is product design and is
    // deliberately not decided here.

    /// <summary>fernhill's story folder — the development story this head opens, or null when bundled.</summary>
    /// <remarks>
    /// Bundled is checked FIRST, not just "is there a checkout". An installed .app that
    /// happens to sit inside a working tree — a build staged under `tools/ide/release-avalonia/`,
    /// say — would otherwise find fernhill above itself and load it, which is exactly the
    /// behaviour a shipped app must not have. Being bundled settles it regardless of what
    /// is above.
    /// </remarks>
    public static string? FernhillFolder =>
        IsBundled || CheckoutRoot is not { } root ? null : Path.Combine(root, "branch-stories", "fernhill");

    /// <summary>fernhill's `.story` source, or null when bundled.</summary>
    public static string? FernhillStory =>
        FernhillFolder is { } folder ? Path.Combine(folder, "fernhill.story") : null;

    /// <summary>fernhill's tree document (ADR-307), read by the testing pane, or null when bundled.</summary>
    public static string? FernhillTests =>
        FernhillFolder is { } folder ? Path.Combine(folder, "fernhill.tests.json") : null;

    /// <summary>fernhill's built browser bundle, served to the play pane, or null when bundled.</summary>
    public static string? FernhillBundle =>
        FernhillFolder is { } folder ? Path.Combine(folder, "dist", "web", "fernhill") : null;

    /// <summary>
    /// Asserts a development-story path is present, for the probe harnesses that only ever
    /// run from a checkout.
    /// </summary>
    /// <param name="path">One of the nullable development-story members above.</param>
    /// <param name="what">What was being resolved, named in the message.</param>
    /// <returns>The path.</returns>
    /// <exception cref="InvalidOperationException">This build carries no development story.</exception>
    public static string RequireDevelopmentStory(string? path, string what) =>
        path ?? throw new InvalidOperationException(
            $"{what} is only available from a repository checkout; this build has no "
            + "development story. Run the probe from the repository, not an installed bundle.");

    // --- Product assets: shipped in the bundle, read from the checkout in dev -----

    /// <summary>The testing-surface assets, shared with the Swift app (ADR-341 D3/AC-3: panes built once).</summary>
    public static string TestingSurface => ProductAsset(
        bundled: new[] { "testing-surface" },
        checkout: new[] { "tools", "ide", "SharpeeIDE", "Resources", "testing-surface" });

    /// <summary>The docs-tab assets, shared with the Swift app.</summary>
    public static string DocsTab => ProductAsset(
        bundled: new[] { "docs-tab" },
        checkout: new[] { "tools", "ide", "SharpeeIDE", "Resources", "docs-tab" });

    /// <summary>
    /// The editor's lexer bridge, built from `tools/ide/editor-bridge` by its own `build.mjs`.
    /// Absent until that build has run, which the editor reports rather than crashing on.
    /// </summary>
    public static string EditorBridge => ProductAsset(
        bundled: new[] { "editor-bridge", "lexer-server.js" },
        checkout: new[] { "tools", "ide", "editor-bridge", "dist", "lexer-server.js" });

    /// <summary>
    /// Resolves an asset that ships in the bundle and also exists in a checkout.
    /// </summary>
    /// <param name="bundled">Path segments below <c>Contents/Resources</c>.</param>
    /// <param name="checkout">Path segments below the repository root.</param>
    /// <returns>The resolved absolute path.</returns>
    /// <exception cref="DirectoryNotFoundException">Neither home could be located.</exception>
    private static string ProductAsset(string[] bundled, string[] checkout) =>
        BundleResources is { } resources
            ? Path.Combine(resources, Path.Combine(bundled))
            : Path.Combine(RepoRoot, Path.Combine(checkout));

    // --- Machine-local dependencies, overridable ---------------------------------

    /// <summary>
    /// The vendored toolchain root — a `toolchain/` directory as `vendor-toolchain.sh` produces.
    /// Honours <c>SHARPEE_IDE_TOOLCHAIN</c>; null when unset, which the host layer treats as
    /// "no vendored toolchain" rather than guessing a location.
    /// </summary>
    /// <remarks>
    /// In an installed bundle the toolchain is not machine-local at all — it ships at
    /// <c>Contents/Resources/toolchain</c>, so the environment variable is a developer
    /// override there rather than the only source.
    /// </remarks>
    public static string? ToolchainRoot =>
        NullIfBlank(Environment.GetEnvironmentVariable("SHARPEE_IDE_TOOLCHAIN"))
        ?? (BundleResources is { } resources ? Path.Combine(resources, "toolchain") : null);

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

    /// <summary>
    /// Locates <c>Contents/Resources</c> when the running assembly sits inside an installed
    /// .app, by requiring both the directory shape and the app's own Info.plist beside it.
    /// </summary>
    /// <returns>The bundle's Resources directory, or null when not bundled.</returns>
    private static string? ResolveBundleResources()
    {
        var resources = Path.TrimEndingDirectorySeparator(AppContext.BaseDirectory);
        if (!string.Equals(Path.GetFileName(resources), "Resources", StringComparison.Ordinal)) return null;

        var contents = Path.GetDirectoryName(resources);
        if (contents is null || !string.Equals(Path.GetFileName(contents), "Contents", StringComparison.Ordinal)) return null;

        return File.Exists(Path.Combine(contents, "Info.plist")) ? resources : null;
    }

    /// <summary>The repository root, or null when there is no checkout above the assembly.</summary>
    /// <returns>The root, or null — never throws, unlike <see cref="RepoRoot"/>.</returns>
    private static string? TryResolveRepoRoot()
    {
        try { return ResolveRepoRoot(); }
        catch (DirectoryNotFoundException) { return null; }
    }

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
