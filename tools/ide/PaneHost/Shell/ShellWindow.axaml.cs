// The shell — the window an installed Chord Writer opens — and, under --shell-probe,
// Phase 4's two evaluation probes.
//
// IT STAYS OPEN. Until 2026-09-16 this ran its scripted sequence and then closed itself
// unless --hold was passed, which is correct for an evaluation harness and wrong for an
// application. The probes are now opt-in and the window holds by default; --shell-probe
// restores the old scripted-and-exit behaviour for evidence runs.
//
// IT OPENS A STORY THE PERSON CHOOSES. Until 2026-09-17 the only story this shell could
// ever open was the development one RepoPaths named — null in a bundle — so an installed
// app had no way to open anything at all (GH #482). A story is now a parameter
// (StoryProject): File ▸ Open Story… picks one, New Story scaffolds one through the
// vendored toolchain, and Build, Check and Run Tests run against whichever is open. The
// last story is remembered across launches (ShellState); with none, the shell opens on the
// Docs pane, which is the one pane that needs no story. What a first-run app should show
// instead is GH #479, and is product design not decided here.
//
// It mirrors MainWindow.swift closely enough for a felt comparison — chrome
// band, rail, project pane, editor over its tab bar, right panel carrying the
// real web panes and the World map, bottom panel, status bar — and mounts
// Phase 1's pane hosting and Phase 3's editor inside it, so the thing being
// judged is a shell rather than a harness.
//
// IT CARRIES THE PANES, NOT JUST A VIEW OF THEM. The right panel's Play, Testing and
// Docs tabs navigate through the door, and the host relays each turn record the client
// posts back into the testing surface (PaneRelay) — without that relay the panes load
// and then sit inert, because the surface advances only on records handed to it.
// `--pane-exit-state` runs Phase 4's exit state over exactly that wiring and exits.
//
// The two probes it runs:
//   1. The drawing model. Every custom surface counts its Render calls, so the
//      question "is Render(DrawingContext) immediate-mode like WPF's OnRender,
//      or retained composition wearing the name" is answered by observation.
//   2. ADR-297's live flip, timed, with the token values read back after.
//
// Public interface: ShellWindow, constructed by App as the default window.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia;
using Avalonia.Media;
using Avalonia.Media.Imaging;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using AvaloniaEdit.Document;
using PaneHost.Editor;
using PaneHost.Hosting;
using PaneHost.Theme;

namespace PaneHost.Shell;

public partial class ShellWindow : Window
{
    /// <summary>The story this window has open, or null when none is.</summary>
    private StoryProject? _project;

    /// <summary>The file shown in the editor — the story, or another file picked in the project pane.</summary>
    private string? _openFile;

    /// <summary>True while a toolchain command is running, so a second one cannot start on top of it.</summary>
    private bool _running;

    /// <summary>True when this run is the scripted evaluation pass rather than an app session.</summary>
    private static bool IsProbeRun => Environment.GetCommandLineArgs().Contains("--shell-probe");

    /// <summary>True when this run is Phase 4's exit-state run: the real panes, both directions, then exit.</summary>
    private static bool IsPaneExitStateRun => Environment.GetCommandLineArgs().Contains("--pane-exit-state");

    /// <summary>
    /// The story path given to `--app-exit-state &lt;path&gt;`, or null when this is not that run.
    ///
    /// That run drives the same methods the File and Story menus invoke — open, build,
    /// save, check, run tests — against a story the run names, so an INSTALLED bundle can
    /// be put through the whole authoring loop without a person clicking. It is the
    /// real-path test for GH #482: nothing about the toolchain, the filesystem or the panes
    /// is stubbed, and the only thing it does not exercise is the click plumbing itself,
    /// which cannot construct an unwired item (see <c>Item</c>).
    /// </summary>
    private static string? AppExitStateStory
    {
        get
        {
            var args = Environment.GetCommandLineArgs();
            var at = Array.IndexOf(args, "--app-exit-state");
            return at >= 0 && at + 1 < args.Length ? args[at + 1] : null;
        }
    }
    private static string? WorldIndex => RepoPaths.WorldIndex;
    private static string LexerServer => RepoPaths.EditorBridge;
    private static string VendoredNode => RepoPaths.Node;

    private readonly ProbeLog _log = new(Path.Combine(RepoPaths.DevOut, "shell-log.txt"));
    private readonly ChordColorizer _colorizer = new();
    private ChordLexerService? _lexer;

    // The shell names a door, never a mechanism. Which door this is belongs to the
    // platform slice that supplies it (ADR-341 D3); everything below works the same
    // whether it is loopback, a virtual-host mapping, or a registered URI scheme.
    private readonly IPaneDoor _door = new LoopbackPaneDoor();

    /// <summary>The host→page half of the testing round trip; see <see cref="PaneRelay"/>.</summary>
    private readonly PaneRelay _relay;

    /// <summary>How many messages each shim handler has posted to the host this run.</summary>
    private readonly Dictionary<string, int> _paneMessages = new();

    /// <summary>The most recent body posted under each handler other than turnEvents.</summary>
    private readonly Dictionary<string, string> _lastPost = new();

    /// <summary>Turn records posted by the TESTING pane alone, which is what the relay carries.</summary>
    private int _testingRecords;

    public ShellWindow()
    {
        InitializeComponent();

        Editor.TextArea.TextView.LineTransformers.Add(_colorizer);

        // Before the underlying web view is created: some doors must name their
        // script-message handler at this moment and cannot do it later.
        _door.Configure(PlayWeb);
        _door.Configure(TestingWeb);
        _door.Configure(DocsWeb);
        _relay = new PaneRelay(script => _door.EvaluateAsync(TestingWeb, script), _log.Line);
        _door.MessageReceived += OnPaneMessage;

        RightTabs.Tabs = new[] { "Play", "Testing", "Docs", "World" };
        BottomTabs.Tabs = new[] { "Problems", "Game Errors", "Log" };
        EditorTabs.Documents = Array.Empty<string>();

        RightTabs.Selected += index => _ = ShowRightTabAsync(index);
        BottomTabs.Selected += _ => { };
        ProjectPane.FileSelected += path => _ = OpenAsync(path);

        LightButton.Click += (_, _) => Flip(dark: false);
        DarkButton.Click += (_, _) => Flip(dark: true);
        ProjectToggle.Click += (_, _) => ProjectPane.IsVisible = !ProjectPane.IsVisible;
        BottomToggle.Click += (_, _) => BottomPanel.IsVisible = !BottomPanel.IsVisible;
        BuildButton.Click += (_, _) => _ = BuildAsync();
        ComposeButton.Click += (_, _) => _ = ComposeAsync();

        InstallMenu();
        PaintChrome();
        ThemeTokens.Changed += PaintChrome;
    }

    /// <summary>
    /// The macOS menu bar. The OpenSilver spike could not do this — OpenSilver has
    /// no native Menu control — so it is one of the rows where O6 differs outright.
    /// </summary>
    private void InstallMenu()
    {
        // Every item here carries a Click handler. An item that renders, takes a key
        // gesture and does nothing is worse than an absent one: it tells a person the app
        // can do something it cannot (GH #482).
        var file = new NativeMenuItem("File") { Menu = new NativeMenu() };
        file.Menu!.Add(Item("New Story…", "Cmd+N", () => _ = NewStoryAsync()));
        file.Menu.Add(Item("Open Story…", "Cmd+O", () => _ = OpenStoryDialogAsync()));
        file.Menu.Add(new NativeMenuItemSeparator());
        file.Menu.Add(Item("Save", "Cmd+S", () => _ = SaveAsync()));
        file.Menu.Add(Item("Reveal in Finder", "Cmd+Shift+R", RevealInFinder));

        var story = new NativeMenuItem("Story") { Menu = new NativeMenu() };
        story.Menu!.Add(Item("Build", "Cmd+B", () => _ = BuildAsync()));
        story.Menu.Add(Item("Check (Compose)", "Cmd+K", () => _ = ComposeAsync()));
        story.Menu.Add(Item("Run Tests", "Cmd+U", () => _ = RunTestsAsync()));

        var menu = new NativeMenu();
        menu.Add(file);
        menu.Add(story);

        // THE MENU BELONGS TO THE APPLICATION ON macOS. Setting it on the window alone
        // left the menu bar with only the system-supplied items — no File, no Story — so
        // every command in it was unreachable and Cmd+U did nothing (GH #485). Both are
        // set: the application menu is what macOS renders, the window menu is what a
        // global-menu Linux desktop exports.
        if (Application.Current is { } app) NativeMenu.SetMenu(app, menu);
        NativeMenu.SetMenu(this, menu);
    }

    /// <summary>Repaints the parts of the chrome that are plain controls rather than drawn surfaces.</summary>
    private void PaintChrome()
    {
        Background = ThemeTokens.EditorBackground;
        Chrome.Background = ThemeTokens.RailBackground;
        Rail.Background = ThemeTokens.RailBackground;
        StatusBar.Background = ThemeTokens.Accent;
        BuildPill.Foreground = ThemeTokens.StatusBarText;
        StatusText.Foreground = ThemeTokens.StatusBarText;
        StoryTitle.Foreground = ThemeTokens.Foreground;
        Editor.Background = ThemeTokens.EditorBackground;
        Editor.Foreground = ThemeTokens.Foreground;
        BottomText.Background = ThemeTokens.EditorBackground;
        BottomText.Foreground = ThemeTokens.Foreground;
    }

    protected override void OnLoaded(RoutedEventArgs e)
    {
        base.OnLoaded(e);
        _ = RunAsync();
    }

    private async Task RunAsync()
    {
        try
        {
            ThemeTokens.Apply(dark: true);

            // The world index is a machine-local artifact (SHARPEE_IDE_WORLD_INDEX), not
            // checked in. Absent, the map draws empty and says so rather than failing.
            if (WorldIndex is { } worldIndex)
            {
                WorldMap.Load(worldIndex);
                _log.Line($"world map: {WorldMap.RoomCount} rooms, {WorldMap.ConnectionCount} connections "
                          + $"({WorldMap.DoorCount} with doors), {WorldMap.LevelCount} levels, "
                          + $"{WorldMap.DisplacedCount} displaced — from the real world-index output");
            }
            else
            {
                _log.Line("world map: no world index configured (SHARPEE_IDE_WORLD_INDEX unset) — drawing empty");
            }

            BottomTabs.Badges = new Dictionary<int, int> { [0] = 0 };

            await StartEditorAsync();

            if (AppExitStateStory is not null) await RunAppExitStateAsync();
            else await OpenStartupStoryAsync();

            if (IsPaneExitStateRun) await RunPaneExitStateAsync();

            if (IsProbeRun)
            {
                await ProbeDrawingModelAsync();
                await ProbeLiveFlipAsync();
                ReportMenu();
                _log.Line("shell: done");
            }
        }
        catch (Exception ex)
        {
            // An app does not exit because one surface failed to start. The window stays
            // up with whatever did start, and the failure is named in the log.
            _log.Line($"shell: FAILED with {ex.GetType().Name}: {ex.Message}");
        }

        if (!IsProbeRun && !IsPaneExitStateRun && AppExitStateStory is null)
        {
            // --light leaves the shell in the light palette, so the flip has a
            // second screenshot rather than only a pixel value.
            if (Environment.GetCommandLineArgs().Contains("--light")) ThemeTokens.Apply(dark: false);
            _log.Line($"shell: open, IsDark={ThemeTokens.IsDark}");
            return;
        }
        _lexer?.Dispose();
        _door.Dispose();
        await Task.Delay(400);
        Dispatcher.UIThread.Post(Close);
    }

    private async Task StartEditorAsync()
    {
        if (!File.Exists(LexerServer))
        {
            _log.Line($"editor: no lexer bridge at {LexerServer} — opening without highlighting");
        }
        else
        {
            _lexer = new ChordLexerService(VendoredNode, LexerServer);
            await _lexer.StartAsync();
        }

        StatusText.Text = RepoPaths.IsBundled ? "sharpee (bundled toolchain)" : "sharpee (vendored)";
    }

    /// <summary>
    /// Opens whatever this launch should start with: the story open when the app last
    /// closed, else the development story when running from a checkout, else nothing.
    ///
    /// A bundle never reaches the second case — `RepoPaths` returns null for the
    /// development story once bundled — so a shipped app either restores the author's own
    /// last story or opens empty on the Docs pane, which is the one pane that needs no
    /// story. What a first-run app should show instead is GH #479, still open.
    /// </summary>
    private async Task OpenStartupStoryAsync()
    {
        var remembered = StoryProject.Resolve(ShellState.LastStoryFile);
        if (remembered is not null)
        {
            _log.Line($"startup: reopening the last story — {remembered.Id}");
            await OpenProjectAsync(remembered);
            return;
        }

        var development = StoryProject.Resolve(RepoPaths.FernhillStory);
        if (development is not null)
        {
            _log.Line($"startup: development story from the checkout — {development.Id}");
            await OpenProjectAsync(development);
            return;
        }

        _log.Line("startup: no story to open — the docs pane, and an empty shell");
        ShowEmptyState();
        await StartPanesAsync();
    }

    /// <summary>Puts the chrome in its nothing-is-open state without pretending a story is there.</summary>
    private void ShowEmptyState()
    {
        _project = null;
        _openFile = null;
        StoryTitle.Text = "No story open — File ▸ Open Story…";
        BuildPill.Text = "—";
        EditorTabs.Documents = Array.Empty<string>();
        EditorTabs.InvalidateVisual();
        Editor.Document = new TextDocument(string.Empty);
        ProjectPane.Load(string.Empty);
        RightTabs.Badges = new Dictionary<int, int>();
    }

    /// <summary>
    /// Makes <paramref name="project"/> the open story: project pane, editor, panes, title,
    /// and the memory of it for the next launch.
    /// </summary>
    /// <param name="project">The story to open; already resolved from a path.</param>
    private async Task OpenProjectAsync(StoryProject project)
    {
        _project = project;
        ProjectPane.Load(project.Folder);
        _log.Line($"project pane: {ProjectPane.FileCount} file(s) from {project.Folder}");

        StoryTitle.Text = project.Id;
        BuildPill.Text = project.IsBuilt ? "built" : "not built";
        ShellState.LastStoryFile = project.StoryFile;

        await OpenAsync(project.StoryFile);
        await StartPanesAsync();
        if (project.IsBuilt) await LoadWorldMapAsync(project);
    }

    /// <summary>
    /// Scaffolds a new story with the vendored toolchain and opens it: a folder to put it
    /// in, a name for it, `sharpee init`, then the same open path every other story takes.
    /// </summary>
    private async Task NewStoryAsync()
    {
        var folders = await StorageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions
        {
            Title = "Where should the new story live?",
            AllowMultiple = false,
        });

        var parent = folders.Count > 0 ? folders[0].TryGetLocalPath() : null;
        if (parent is null) return;

        var name = await NameDialog.AskAsync(this, "New Story", "Name for the new story:", "my-story");
        if (name is null) return;

        var exit = await RunToolchainAsync("new story", new[] { "init", name }, parent);
        if (exit != 0) return;

        var project = StoryProject.Resolve(Path.Combine(parent, name));
        if (project is null)
        {
            Report($"new story: `sharpee init` succeeded but no story was found in {Path.Combine(parent, name)}.");
            return;
        }
        await OpenProjectAsync(project);
    }

    /// <summary>Asks the person for a `.story` file and opens the project around it.</summary>
    private async Task OpenStoryDialogAsync()
    {
        var picked = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Open a Chord story",
            AllowMultiple = false,
            FileTypeFilter = new[]
            {
                new FilePickerFileType("Chord story") { Patterns = new[] { "*.story" } },
            },
        });

        var path = picked.Count > 0 ? picked[0].TryGetLocalPath() : null;
        if (path is null) return;

        var project = StoryProject.Resolve(path);
        if (project is null)
        {
            Report($"open: {Path.GetFileName(path)} is not a story this shell can open.");
            return;
        }
        await OpenProjectAsync(project);
    }

    private async Task OpenAsync(string path)
    {
        Editor.Document = new TextDocument(await File.ReadAllTextAsync(path));
        _openFile = path;
        var tokens = "no highlighting";
        if (_lexer is { } lexer)
        {
            var lex = await lexer.LexAsync(Editor.Document.Text);
            _colorizer.Apply(lex, lexer.Kinds, Editor.Document);
            tokens = $"{lex.TokenCount} tokens";
        }
        Editor.TextArea.TextView.Redraw();
        EditorTabs.Documents = new[] { Path.GetFileName(path) };
        EditorTabs.InvalidateVisual();
        _log.Line($"editor: {Path.GetFileName(path)} — {Editor.Document.LineCount} lines, {tokens}");
    }

    /// <summary>Writes the editor's buffer back to the file it came from.</summary>
    private async Task SaveAsync()
    {
        if (_openFile is not { } path)
        {
            Report("save: nothing is open.");
            return;
        }

        await File.WriteAllTextAsync(path, Editor.Document.Text);
        Report($"saved {Path.GetFileName(path)} — {Editor.Document.LineCount} lines");
        // A saved story is a story whose built output is now behind its source.
        if (_project is not null && string.Equals(path, _project.StoryFile, StringComparison.Ordinal))
            BuildPill.Text = "unbuilt changes";
    }

    /// <summary>Shows the open story's folder in Finder, so the author can reach their own files.</summary>
    private void RevealInFinder()
    {
        if (_project is not { } project)
        {
            Report("reveal: nothing is open.");
            return;
        }
        try
        {
            using var _ = System.Diagnostics.Process.Start("open", new[] { project.Folder });
        }
        catch (Exception ex)
        {
            Report($"reveal failed: {ex.GetType().Name}: {ex.Message}");
        }
    }

    /// <summary>
    /// Serves the open story's built bundle through the door, replacing whatever the door
    /// was serving before. A story that has not been built yet is reported rather than
    /// served: the Play and Testing panes have nothing to show until `sharpee build` runs.
    /// </summary>
    private async Task StartPanesAsync()
    {
        _door.Close();

        // With no story — and with one that is not built yet — the door still opens, on the
        // docs alone. Docs is the one pane that needs no story, and a person with nothing
        // open should have something to read rather than a blank panel.
        var built = _project?.WebBundle;
        if (_project is null || built is null)
        {
            _door.Open(new PaneServer(null, RepoPaths.TestingSurface, RepoPaths.DocsTab, "{}"));
            _log.Line(_project is null
                ? "panes: no story open — serving the docs pane only"
                : $"panes: {_project.Id} is not built — serving the docs pane only until it is");
            if (_project is not null)
                Report($"{_project.Id} is not built yet. Story ▸ Build (Cmd+B) builds it.");

            await NavigateAsync(DocsWeb, _door.PaneUri(PaneServer.DocsScheme, "index.html"), TimeSpan.FromSeconds(15));
            RightTabs.ActiveIndex = 2;
            await ShowRightTabAsync(2);
            return;
        }

        var project = _project;

        // The testing pane replays a tree document; a story without one still plays, so the
        // session carries an empty document rather than refusing to open the panes.
        var document = project.TestsDocument is { } testsPath && File.Exists(testsPath)
            ? await File.ReadAllTextAsync(testsPath)
            : "{}";

        var session = new System.Text.Json.Nodes.JsonObject
        {
            ["story"] = project.Id,
            ["seed"] = 42,
            ["document"] = document,
        };

        _door.Open(new PaneServer(built, RepoPaths.TestingSurface, RepoPaths.DocsTab, session.ToJsonString()));
        _log.Line($"panes: door open for {project.Id} — {_door.Mechanism}");

        // Each pane is loaded ONCE, here. Switching tabs afterwards only changes which view
        // is visible, so the testing pane keeps its replay instead of redoing it.
        var play = await NavigateAsync(PlayWeb, _door.PaneUri(PaneServer.PlayScheme, "index.html"), TimeSpan.FromSeconds(15));
        var docs = await NavigateAsync(DocsWeb, _door.PaneUri(PaneServer.DocsScheme, "index.html"), TimeSpan.FromSeconds(15));
        var testing = await NavigateAsync(TestingWeb, _door.PaneUri(PaneServer.PlayScheme, "index-testing.html"), TimeSpan.FromSeconds(20));
        _log.Line($"panes: loaded — play={play}, docs={docs}, testing={testing}");

        RightTabs.ActiveIndex = 0;
        await ShowRightTabAsync(0);
    }

    // ── The toolchain commands ───────────────────────────────────────────────
    //
    // All three run the vendored `sharpee` shim the bundle ships, stream both pipes into
    // the bottom panel as they arrive, and leave the exit code in the status bar. They are
    // the reason an installed app can do anything to a story at all.

    /// <summary>Builds the open story to a browser app, then serves the fresh bundle.</summary>
    private async Task BuildAsync()
    {
        if (_project is not { } project) { Report("build: nothing is open."); return; }

        var exit = await RunToolchainAsync("build", new[] { "build", project.StoryFile }, project.Folder);
        if (exit != 0) { BuildPill.Text = "build failed"; return; }

        BuildPill.Text = "built";
        // Re-resolve rather than trust the pre-build answer: the bundle exists now.
        await StartPanesAsync();
        await LoadWorldMapAsync(project);
    }

    /// <summary>
    /// Derives the story's map from the IR the build just emitted and draws it.
    ///
    /// The World tab was empty in every build until now because the map only ever loaded
    /// from SHARPEE_IDE_WORLD_INDEX — a machine-local variable an author has no reason to
    /// set — and nothing generated an index for the open story (GH #486). `sharpee
    /// world-index` writes its JSON to stdout, so it is captured here and kept beside the
    /// other per-run output rather than written into the author's story folder.
    /// </summary>
    /// <param name="project">The story whose IR to analyse; it must have been built.</param>
    private async Task LoadWorldMapAsync(StoryProject project)
    {
        var ir = Path.Combine(project.Folder, "dist", project.Id + ".ir.json");
        if (!File.Exists(ir))
        {
            _log.Line($"world map: no IR at {ir} — nothing to draw");
            return;
        }

        var json = new System.Text.StringBuilder();
        var shim = HostServices.Current.ToolchainShim;
        if (shim is null) { _log.Line("world map: no toolchain in this build"); return; }

        try
        {
            var exit = await HostServices.Current.RunAsync(
                shim, new[] { "world-index", ir }, project.Folder,
                line => json.AppendLine(line),
                line => _log.Line($"world map: {line}"),
                CancellationToken.None);
            if (exit != 0) { _log.Line($"world map: world-index exited {exit}"); return; }

            Directory.CreateDirectory(RepoPaths.DevOut);
            var path = Path.Combine(RepoPaths.DevOut, project.Id + ".world-index.json");
            await File.WriteAllTextAsync(path, json.ToString());

            WorldMap.Load(path);
            _log.Line($"world map: {WorldMap.RoomCount} rooms, {WorldMap.ConnectionCount} connections "
                      + $"({WorldMap.DoorCount} with doors), {WorldMap.LevelCount} level(s), "
                      + $"{WorldMap.DisplacedCount} displaced — from {project.Id}'s own IR");
        }
        catch (Exception ex)
        {
            _log.Line($"world map: could not derive the index — {ex.GetType().Name}: {ex.Message}");
        }
    }

    /// <summary>Runs the load-time gates over the open story without emitting IR.</summary>
    private async Task ComposeAsync()
    {
        if (_project is not { } project) { Report("check: nothing is open."); return; }

        var exit = await RunToolchainAsync("check", new[] { "compose", project.StoryFile, "--check" }, project.Folder);
        BuildPill.Text = exit == 0 ? "gate-clean" : "gate errors";
    }

    /// <summary>Runs the story's own test suite through the vendored toolchain.</summary>
    private async Task RunTestsAsync()
    {
        if (_project is not { } project) { Report("tests: nothing is open."); return; }

        var exit = await RunToolchainAsync("test", new[] { "test", project.Folder }, project.Folder);
        StatusText.Text = exit == 0 ? "tests passed" : "tests failed";
    }

    /// <summary>
    /// Runs one vendored-toolchain command, streaming its output into the bottom panel.
    /// </summary>
    /// <param name="label">What to call this command in the log and status bar.</param>
    /// <param name="arguments">Arguments for the `sharpee` shim.</param>
    /// <param name="workingDirectory">Where to run it — the story's folder.</param>
    /// <returns>The process exit code, or -1 when no toolchain is available or it could not start.</returns>
    private async Task<int> RunToolchainAsync(string label, IReadOnlyList<string> arguments, string workingDirectory)
    {
        if (_running)
        {
            Report($"{label}: another command is already running.");
            return -1;
        }

        var shim = HostServices.Current.ToolchainShim;
        if (shim is null)
        {
            Report($"{label}: this build carries no toolchain, so it cannot run `sharpee`.");
            return -1;
        }

        _running = true;
        BottomPanel.IsVisible = true;
        Report($"$ sharpee {string.Join(' ', arguments)}");
        StatusText.Text = $"{label}…";
        BuildPill.Text = label + "…";

        try
        {
            var exit = await HostServices.Current.RunAsync(
                shim, arguments, workingDirectory,
                line => Dispatcher.UIThread.Post(() => Report(line)),
                line => Dispatcher.UIThread.Post(() => Report(line)),
                CancellationToken.None);

            Report($"— {label} exited {exit}");
            StatusText.Text = exit == 0 ? $"{label} ok" : $"{label} failed ({exit})";
            return exit;
        }
        catch (Exception ex)
        {
            Report($"{label} could not run: {ex.GetType().Name}: {ex.Message}");
            StatusText.Text = $"{label} failed";
            return -1;
        }
        finally
        {
            _running = false;
        }
    }

    /// <summary>Appends one line to the bottom panel and the run log, and scrolls to it.</summary>
    private void Report(string line)
    {
        BottomText.Text = BottomText.Text is { Length: > 0 } existing ? existing + "\n" + line : line;
        BottomText.CaretIndex = BottomText.Text.Length;
        _log.Line(line);
    }

    /// <summary>A native menu item that actually does something when chosen.</summary>
    private static NativeMenuItem Item(string header, string gesture, Action onClick)
    {
        var item = new NativeMenuItem(header) { Gesture = Avalonia.Input.KeyGesture.Parse(gesture) };
        item.Click += (_, _) => onClick();
        return item;
    }

    /// <summary>
    /// Routes one page→host message. A turn record goes straight back into the testing
    /// surface through the relay — the surface advances only when the host hands it the
    /// record the client just posted — and every handler's arrivals are counted so the
    /// exit-state run can report traffic it observed rather than traffic it assumed.
    /// </summary>
    private void OnPaneMessage(object? sender, PaneMessage message)
    {
        var count = _paneMessages[message.Handler] = _paneMessages.GetValueOrDefault(message.Handler) + 1;

        // Only the TESTING pane's records go to the relay. The Play pane runs the same
        // client and posts under the same handler, and feeding its records to the testing
        // surface makes the surface fork a boot it was never asked for.
        if (message.Handler == "turnEvents")
        {
            if (ReferenceEquals(message.View, TestingWeb))
            {
                _testingRecords++;
                _relay.Enqueue(message.Body);
            }
        }
        else
        {
            _lastPost[message.Handler] = message.Body;
        }

        // A replayed tree posts hundreds of records; the log wants the shape, not each one.
        if (count <= 2 || count % 25 == 0)
            _log.Line($"pane → host: {message.Handler} #{count}: {Trim(message.Body, 120)}");
    }

    /// <summary>Total page→host messages received this run, across all handlers.</summary>
    private int PaneMessageCount => _paneMessages.Values.Sum();

    private static string Trim(string s, int n) => s.Length <= n ? s : s.Substring(0, n) + " …";

    /// <summary>
    /// Shows one pane. Each pane keeps its own view and its own state, so this only
    /// changes which view is visible — it does not reload anything. Reloading on every
    /// tab switch cost the testing pane its entire replay each time it was reopened.
    /// </summary>
    /// <param name="index">0 Play, 1 Testing, 2 Docs, 3 World.</param>
    private Task ShowRightTabAsync(int index)
    {
        PlayWeb.IsVisible = index == 0;
        TestingWeb.IsVisible = index == 1;
        DocsWeb.IsVisible = index == 2;
        WorldScroll.IsVisible = index == 3;
        return Task.CompletedTask;
    }

    /// <summary>The view a pane index is shown in, or null for the World tab, which is drawn.</summary>
    private NativeWebView? ViewFor(int index) => index switch
    {
        0 => PlayWeb,
        1 => TestingWeb,
        2 => DocsWeb,
        _ => null,
    };

    /// <summary>
    /// Navigates the pane view and waits for the view's own navigation-completed signal
    /// rather than a fixed sleep, so "the pane loaded" is the platform's answer and a
    /// failure to load is visible instead of being slept through.
    /// </summary>
    /// <param name="uri">Where to navigate — a Uri the door supplied.</param>
    /// <param name="timeout">How long to wait for the signal before giving up.</param>
    /// <returns>True when navigation completed successfully within the timeout.</returns>
    private async Task<bool> NavigateAsync(NativeWebView view, Uri uri, TimeSpan timeout)
    {
        var completed = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        void OnCompleted(object? sender, WebViewNavigationCompletedEventArgs e) => completed.TrySetResult(e.IsSuccess);

        view.NavigationCompleted += OnCompleted;
        try
        {
            view.Navigate(uri);
            var first = await Task.WhenAny(completed.Task, Task.Delay(timeout));
            return first == completed.Task && completed.Task.Result;
        }
        finally
        {
            view.NavigationCompleted -= OnCompleted;
        }
    }

    /// <summary>Runs script in one pane's view, answering with its result or the failure text.</summary>
    private async Task<string> EvaluateAsync(NativeWebView view, string script)
    {
        try { return await _door.EvaluateAsync(view, script) ?? "null"; }
        catch (Exception ex) { return $"<{ex.GetType().Name}: {ex.Message}>"; }
    }

    /// <summary>
    /// The authoring loop, driven end to end against the story `--app-exit-state` names:
    /// open it, build it with the vendored toolchain, serve the built bundle to the panes,
    /// edit and save the source, check it, and run its tests — every step through the same
    /// method the corresponding menu item calls.
    ///
    /// Run inside an installed bundle this answers the question "is this an app a person
    /// can use", which "it opens and holds" never did (GH #482).
    /// </summary>
    private async Task RunAppExitStateAsync()
    {
        var path = AppExitStateStory!;
        _log.Line("── app exit state: the authoring loop, on a real story ──");
        _log.Line($"  host: {HostServices.Current.Describe()}");
        _log.Line($"  toolchain: {HostServices.Current.ToolchainShim ?? "<none>"}");
        _log.Line($"  bundled: {RepoPaths.IsBundled}");

        var project = StoryProject.Resolve(path);
        if (project is null)
        {
            _log.Line($"  FAILED: {path} does not resolve to a story.");
            return;
        }

        // 1. Open — the step an installed app had no way to perform at all.
        await OpenProjectAsync(project);
        _log.Line($"  opened: id={project.Id}, {ProjectPane.FileCount} file(s) in the pane, "
                  + $"editor {Editor.Document.LineCount} lines, built={project.IsBuilt}");

        // 2. Build, through the vendored toolchain, and serve what it produced.
        if (!project.IsBuilt)
        {
            _log.Line("  building (the story arrived unbuilt, which is the interesting case)…");
            await BuildAsync();
            _log.Line($"  after build: built={_project?.IsBuilt}, bundle={_project?.WebBundle ?? "<none>"}, "
                      + $"door open={_door.IsOpen}");
        }

        // 3. The panes, on this story's own bundle.
        if (_door.IsOpen)
        {
            await RunPaneExitStateAsync();
        }
        else
        {
            _log.Line("  panes: door not open after build — the loop stops here.");
        }

        // 3a. The World tab, which was empty in every build before this one.
        _log.Line($"  world map: {WorldMap.RoomCount} room(s), {WorldMap.ConnectionCount} connection(s), "
                  + $"{WorldMap.LevelCount} level(s)");

        // 3b. Switching tabs must SHOW a pane, not reload it. The testing pane's replay is
        // the expensive thing a reload throws away, so it is what gets checked.
        var cardsBefore = await EvaluateAsync(TestingWeb, "document.querySelectorAll('[class*=card]').length");
        var recordsBefore = _paneMessages.GetValueOrDefault("turnEvents");
        RightTabs.ActiveIndex = 0;
        await ShowRightTabAsync(0);
        await Task.Delay(300);
        RightTabs.ActiveIndex = 2;
        await ShowRightTabAsync(2);
        await Task.Delay(300);
        RightTabs.ActiveIndex = 1;
        await ShowRightTabAsync(1);
        await Task.Delay(1500);
        var cardsAfter = await EvaluateAsync(TestingWeb, "document.querySelectorAll('[class*=card]').length");
        var recordsAfter = _paneMessages.GetValueOrDefault("turnEvents");
        _log.Line($"  tab switch Testing→Play→Docs→Testing: cards {cardsBefore} → {cardsAfter}, "
                  + $"turn records {recordsBefore} → {recordsAfter} "
                  + $"({(recordsAfter == recordsBefore ? "no replay — the pane was shown, not reloaded" : "REPLAYED")})");

        // 4. Edit and save: the buffer must reach the disk.
        var storyFile = project.StoryFile;
        var before = await File.ReadAllTextAsync(storyFile);
        var marker = "// app exit state " + DateTime.UtcNow.ToString("O");
        Editor.Document = new AvaloniaEdit.Document.TextDocument(before.TrimEnd() + "\n" + marker + "\n");
        _openFile = storyFile;
        await SaveAsync();
        var after = await File.ReadAllTextAsync(storyFile);
        _log.Line($"  save: file changed on disk={!string.Equals(before, after, StringComparison.Ordinal)}, "
                  + $"marker present={after.Contains(marker, StringComparison.Ordinal)}");
        await File.WriteAllTextAsync(storyFile, before);
        _log.Line("  save: source restored to its original bytes");

        // 5. Check and test, through the toolchain again.
        await ComposeAsync();
        _log.Line($"  check: pill={BuildPill.Text}");
        await RunTestsAsync();
        _log.Line($"  tests: status={StatusText.Text}");

        _log.Line("app exit state: done");
    }

    /// <summary>
    /// Phase 4's exit-state run: the three real panes loaded in this real shell window,
    /// through the real door, with both message directions exercised on each one.
    ///
    /// Everything it reports is read back from the live page — the shim's own record of
    /// which native post door it found, the pane's readyState, and messages the host
    /// actually received — so no line here is satisfied by the run merely not throwing.
    /// </summary>
    private async Task RunPaneExitStateAsync()
    {
        _log.Line("── Phase 4 exit state: the real panes in the real shell ──");

        if (!_door.IsOpen)
        {
            _log.Line("  FAILED: the door is not open — this build carries no development story to serve.");
            return;
        }
        _log.Line($"  door: {_door.Mechanism}");

        // Testing goes last and stays loaded: the round trip below continues on this
        // load rather than navigating again, so no record from an earlier load can be
        // delivered into a page that booted after it was posted.
        foreach (var (name, index) in new[] { ("Play", 0), ("Docs", 2), ("Testing", 1) })
        {
            RightTabs.ActiveIndex = index;
            await ShowRightTabAsync(index);
            var view = ViewFor(index)!;

            // Host → page, on the real view. The shim records which native post door it
            // found at boot, so reading that back proves Configure wired one — where a
            // bare "EvaluateAsync returned" would prove only that script ran.
            var ready = await EvaluateAsync(view, "document.readyState");
            var title = await EvaluateAsync(view, "document.title");
            var shim = await EvaluateAsync(view, "JSON.stringify(window.__sharpeeShim||null)");
            _log.Line($"  {name}: readyState={ready}, title={Trim(title, 60)}");
            _log.Line($"  {name}: host → page, shim={shim}");

            // Page → host, on the real view: the page posts through the shim's own
            // handler and the host counts the arrival at the other end of the door.
            var before = _paneMessages.GetValueOrDefault("testingConsole");
            await EvaluateAsync(view, "window.webkit.messageHandlers.testingConsole.postMessage('exit-state:" + name + "')");
            var arrived = await WaitForAsync(
                () => _paneMessages.GetValueOrDefault("testingConsole") > before,
                TimeSpan.FromSeconds(5));
            var lastConsole = Trim(_lastPost.GetValueOrDefault("testingConsole", ""), 60);
            _log.Line($"  {name}: page → host, ping {(arrived ? "arrived — " + lastConsole : "DID NOT arrive")}");

            // What the pane actually rendered, not merely that it loaded. A pane can report
            // readyState=complete with an empty index, which is exactly what was shipped.
            if (name == "Docs")
            {
                // The index arrives by fetch, so give it real time before concluding it is
                // empty — an empty-because-too-early reading would be a false finding.
                for (var wait = 0; wait < 30; wait++)
                {
                    var links = await EvaluateAsync(view, "document.querySelectorAll('#nav a').length");
                    if (links != "0" && links != "null") break;
                    await Task.Delay(100);
                }
                var docs = await EvaluateAsync(DocsWeb,
                    "JSON.stringify({navLinks:document.querySelectorAll('#nav a').length,"
                    + "navGroups:document.querySelectorAll('#nav .group,#nav details,#nav section').length,"
                    + "article:(document.querySelector('#page,#content,article')||{}).childElementCount||0,"
                    + "firstLinks:Array.from(document.querySelectorAll('#nav a')).slice(0,3).map(function(a){return a.getAttribute('href')}).join('|'),"
                    + "bodyChars:document.body.innerText.length})");
                _log.Line($"  Docs: rendered {docs}");

                // Clicking is the thing a person does and a scripted run never did.
                var clicked = await EvaluateAsync(DocsWeb,
                    "(function(){var a=document.querySelectorAll('#nav a');"
                    + "if(a.length<3) return 'no-links';"
                    + "var before=(document.querySelector('#page,#content,article')||{}).innerText||'';"
                    + "a[2].click();"
                    + "return JSON.stringify({clickedHref:a[2].getAttribute('href'),beforeChars:before.length});})()");
                await Task.Delay(1200);
                var after = await EvaluateAsync(DocsWeb,
                    "JSON.stringify({href:location.href,navLinks:document.querySelectorAll('#nav a').length,"
                    + "article:((document.querySelector('#page,#content,article')||{}).innerText||'').slice(0,60),"
                    + "bodyChars:document.body.innerText.length})");
                var geometry = await EvaluateAsync(DocsWeb,
                    "(function(){function r(s){var e=document.querySelector(s);if(!e)return 'missing';"
                    + "var b=e.getBoundingClientRect();return Math.round(b.x)+','+Math.round(b.y)+' '+Math.round(b.width)+'x'+Math.round(b.height);}"
                    + "return JSON.stringify({view:window.innerWidth+'x'+window.innerHeight,nav:r('#nav'),"
                    + "article:r('#page')||r('article'),toolbar:r('.toolbar'),"
                    + "navVisible:(function(){var n=document.querySelector('#nav');if(!n)return false;"
                    + "var s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&n.getBoundingClientRect().width>0;})()});})()");
                _log.Line($"  Docs: geometry {geometry}");
                _log.Line($"  Docs: click → {clicked}");
                _log.Line($"  Docs: after click → {after}");
            }
        }

        // The testing pane needs both directions at once: the client posts each turn
        // record out, the relay hands it back in, and the surface advances only on
        // records it was handed. One typed command exercises the whole loop, after the
        // boot replay has gone quiet, so the counts bracket the command and not the boot.
        var recordsBefore = _testingRecords;
        var relayedBefore = _relay.Delivered;

        var afterBoot = await SettledCountAsync("turnEvents", TimeSpan.FromSeconds(20));
        var relayedAtBoot = _relay.Delivered - relayedBefore;

        var typed = await EvaluateAsync(TestingWeb, "window.__sharpeeHost({type:'type',command:'inventory'})");
        var afterCommand = await SettledCountAsync("turnEvents", TimeSpan.FromSeconds(15));
        var relayNote = _relay.LastError is { } error ? "last error " + error : "no delivery errors";

        _log.Line($"  round trip (testing pane only): boot replay posted {_testingRecords - recordsBefore} turn "
                  + $"record(s), relay delivered {relayedAtBoot} of them; type 'inventory' → {typed}; "
                  + $"{_relay.Delivered - relayedBefore} delivered here in total, {relayNote}");

        var surface = await EvaluateAsync(TestingWeb,
            "JSON.stringify({cards:document.querySelectorAll('[class*=card]').length,"
            + "anchors:document.querySelectorAll('[data-turn]').length})");
        var totals = string.Join(", ", _paneMessages.OrderBy(p => p.Key).Select(p => p.Key + " " + p.Value));
        _log.Line($"  testing surface after the round trip: {surface}");
        _log.Line($"  page → host totals: {totals} ({PaneMessageCount} message(s))");
        _log.Line("exit state: done");
    }

    /// <summary>
    /// Waits until a handler stops receiving messages, and answers with its count then.
    /// A replay posts records in a burst, so "how many did this load produce" is only
    /// answerable once the burst has gone quiet — a fixed sleep either cuts it short or
    /// pads every run by the worst case.
    /// </summary>
    /// <param name="handler">The shim handler whose arrivals to watch.</param>
    /// <param name="timeout">The longest to wait for quiet before answering anyway.</param>
    /// <returns>The handler's message count once it has been still for a beat.</returns>
    private async Task<int> SettledCountAsync(string handler, TimeSpan timeout)
    {
        var quietFor = TimeSpan.FromMilliseconds(750);
        var deadline = DateTime.UtcNow + timeout;
        var count = _paneMessages.GetValueOrDefault(handler);
        var lastChange = DateTime.UtcNow;

        while (DateTime.UtcNow < deadline)
        {
            await Task.Delay(100);
            var now = _paneMessages.GetValueOrDefault(handler);
            if (now != count)
            {
                count = now;
                lastChange = DateTime.UtcNow;
            }
            else if (DateTime.UtcNow - lastChange > quietFor)
            {
                break;
            }
        }
        return _paneMessages.GetValueOrDefault(handler);
    }

    /// <summary>Waits for a condition to hold, polling while the UI thread pumps; false on timeout.</summary>
    /// <param name="condition">Re-evaluated until true or the timeout elapses.</param>
    /// <param name="timeout">How long to keep waiting.</param>
    private static async Task<bool> WaitForAsync(Func<bool> condition, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (condition()) return true;
            await Task.Delay(100);
        }
        return condition();
    }

    /// <summary>
    /// Counts Render calls across a resize, a property change, and an explicit
    /// invalidation. A retained-composition control would not re-enter Render on
    /// invalidation at all; an every-frame painter would climb without one.
    /// </summary>
    private async Task ProbeDrawingModelAsync()
    {
        _log.Line("── drawing model ──");
        // Every surface must be on screen and a frame must have been presented
        // before any count means anything: Avalonia renders on the render thread,
        // so a counter read synchronously after an invalidation reads the frame
        // that has not happened yet. Each step below waits for real frames.
        WorldScroll.IsVisible = true;
        PlayWeb.IsVisible = false;
        TestingWeb.IsVisible = false;
        DocsWeb.IsVisible = false;
        BottomPanel.IsVisible = true;
        await Frames();
        foreach (var (name, surface) in Surfaces())
            _log.Line($"  {name}: {surface.RenderCount} Render(DrawingContext) call(s) after first layout");

        foreach (var (_, surface) in Surfaces()) surface.ResetRenderCount();

        // A styled property registered with AffectsRender must trigger a repaint.
        RightTabs.ActiveIndex = 1;
        EditorTabs.ActiveIndex = 1;
        await Frames();
        _log.Line($"  after AffectsRender property change: RightTabs {RightTabs.RenderCount}, EditorTabs {EditorTabs.RenderCount}");

        foreach (var (_, surface) in Surfaces()) surface.ResetRenderCount();
        var clock = Stopwatch.StartNew();
        foreach (var (_, surface) in Surfaces()) surface.InvalidateVisual();
        await Frames();
        _log.Line($"  after explicit InvalidateVisual: "
                  + string.Join(", ", Surfaces().Select(s => $"{s.Name} {s.Surface.RenderCount}"))
                  + $" in {clock.Elapsed.TotalMilliseconds:F2} ms");

        // Idle: no invalidation, no input. An immediate-mode-per-frame model would climb.
        foreach (var (_, surface) in Surfaces()) surface.ResetRenderCount();
        await Frames(8);
        _log.Line($"  idle over 8 frame waits, no invalidation: "
                  + string.Join(", ", Surfaces().Select(s => $"{s.Name} {s.Surface.RenderCount}")));
    }

    private IEnumerable<(string Name, DrawnSurface Surface)> Surfaces()
    {
        yield return ("RightTabs", RightTabs);
        yield return ("BottomTabs", BottomTabs);
        yield return ("EditorTabs", EditorTabs);
        yield return ("WorldMap", WorldMap);
        yield return ("ProjectPane", ProjectPane);
    }

    /// <summary>ADR-297: one property write per token, and every drawn surface repaints.</summary>
    /// <summary>Lets the render thread present; one call is a couple of frames at 60 Hz.</summary>
    private static Task Frames(int count = 3) => Task.Delay(count * 32);

    private async Task ProbeLiveFlipAsync()
    {
        _log.Line("── ADR-297 live flip ──");
        ThemeTokens.Apply(dark: false);
        await Frames();
        _log.Line($"  before: IsDark={ThemeTokens.IsDark}, railBackground={ThemeTokens.HexOf("railBackground")}, "
                  + $"editorBackground={ThemeTokens.HexOf("editorBackground")}, accent={ThemeTokens.HexOf("accent")}");
        var pixelBefore = SamplePixel(RightTabs, 200, 20);
        _log.Line($"  before: RightTabs pixel(200,20) = {pixelBefore}");

        foreach (var (_, surface) in Surfaces()) surface.ResetRenderCount();
        var clock = Stopwatch.StartNew();
        ThemeTokens.Apply(dark: true);
        var applyMs = clock.Elapsed.TotalMilliseconds;
        await Frames();

        _log.Line($"  after:  IsDark={ThemeTokens.IsDark}, railBackground={ThemeTokens.HexOf("railBackground")}, "
                  + $"editorBackground={ThemeTokens.HexOf("editorBackground")}, accent={ThemeTokens.HexOf("accent")}");
        _log.Line($"  Apply({ThemeTokens.TokenCount} tokens) took {applyMs:F2} ms; "
                  + $"drawn surfaces repainted: {string.Join(", ", Surfaces().Select(s => $"{s.Name} {s.Surface.RenderCount}"))}");
        var pixelAfter = SamplePixel(RightTabs, 200, 20);
        _log.Line($"  after:  RightTabs pixel(200,20) = {pixelAfter} — "
                  + $"{(pixelBefore == pixelAfter ? "UNCHANGED" : "CHANGED")}");
        _log.Line("  note: the brushes are shared instances. Zero Render calls with changed pixels means the "
                  + "recorded draw operations hold the brush by reference and the compositor re-reads its colour "
                  + "— the flip costs no re-record at all.");
    }

    /// <summary>
    /// Renders a surface to an offscreen bitmap and reads one pixel, so the flip
    /// is proven on pixels rather than on the token values that fed them.
    /// </summary>
    private static string SamplePixel(Control surface, int x, int y)
    {
        var size = new PixelSize(Math.Max(1, (int)surface.Bounds.Width), Math.Max(1, (int)surface.Bounds.Height));
        using var bitmap = new RenderTargetBitmap(size, new Vector(96, 96));
        bitmap.Render(surface);

        var buffer = new byte[size.Width * size.Height * 4];
        var handle = System.Runtime.InteropServices.GCHandle.Alloc(buffer, System.Runtime.InteropServices.GCHandleType.Pinned);
        try
        {
            bitmap.CopyPixels(new PixelRect(size), handle.AddrOfPinnedObject(), buffer.Length, size.Width * 4);
        }
        finally
        {
            handle.Free();
        }

        if (x >= size.Width || y >= size.Height) return "out-of-bounds";
        // RGBA8888 on this backend, not BGRA — read straight through.
        var offset = (y * size.Width + x) * 4;
        return $"#{buffer[offset]:X2}{buffer[offset + 1]:X2}{buffer[offset + 2]:X2}";
    }

    private void ReportMenu()
    {
        var menu = NativeMenu.GetMenu(this);
        var items = menu?.Items.OfType<NativeMenuItem>().ToList() ?? new List<NativeMenuItem>();
        _log.Line($"native menu: {items.Count} top-level item(s) — "
                  + string.Join(", ", items.Select(i => $"{i.Header} ({i.Menu?.Items.Count ?? 0})")));
    }

    private void Flip(bool dark)
    {
        ThemeTokens.Apply(dark);
        _log.Line($"flip: IsDark={ThemeTokens.IsDark} (button)");
    }
}
