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

    /// <summary>
    /// One open document: its file, its text, where the caret was, and whether it has
    /// unsaved changes. The editor used to hold exactly one file and replace it on every
    /// open, so a second file cost you the first (GH #489).
    /// </summary>
    private sealed class OpenDocument
    {
        public required string Path { get; init; }
        public required TextDocument Document { get; init; }
        public int CaretOffset { get; set; }
        public bool Dirty { get; set; }
    }

    /// <summary>Every open document, in tab order.</summary>
    private readonly List<OpenDocument> _documents = new();

    /// <summary>Index into <see cref="_documents"/>, or -1 when nothing is open.</summary>
    private int _activeDocument = -1;

    /// <summary>The file shown in the editor, or null when nothing is open.</summary>
    private string? _openFile =>
        _activeDocument >= 0 && _activeDocument < _documents.Count ? _documents[_activeDocument].Path : null;

    /// <summary>True while a toolchain command is running, so a second one cannot start on top of it.</summary>
    private bool _running;

    /// <summary>Cancels the running toolchain command; null when none is running.</summary>
    private CancellationTokenSource? _commandCts;

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

    /// <summary>The run column's own delivery queue — same ordering problem, different entry point.</summary>
    private readonly PaneRelay _runRelay;

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
        _runRelay = new PaneRelay(
            script => _door.EvaluateAsync(TestingWeb, script), _log.Line, RunLineBatch);
        _door.MessageReceived += OnPaneMessage;

        RightTabs.Tabs = new[] { "Build", "Play", "Testing", "Index", "Documentation", "World" };
        BottomTabs.Tabs = new[] { "Problems", "Game Errors", "Log" };
        EditorTabs.Documents = Array.Empty<string>();

        RightTabs.Selected += index => _ = ShowRightTabAsync((RightTab)index);

        WorldTabs.Tabs = new[] { "Map", "Reach", "Incomplete" };
        WorldTabs.Selected += ShowWorldSubPane;
        WorldReach.FindingActivated += line => _ = RevealAsync(new IndexSpan(null, line, 1));
        IndexPane.RowActivated += span => _ = RevealAsync(span);
        BottomTabs.Selected += _ => { };
        ProjectPane.FileSelected += path => _ = OpenAsync(path);
        EditorTabs.Selected += SwitchToDocument;
        EditorTabs.Closed += index => _ = CloseDocumentAsync(index);

        LightButton.Click += (_, _) => Flip(dark: false);
        DarkButton.Click += (_, _) => Flip(dark: true);
        ProjectToggle.Click += (_, _) => SetProjectPaneVisible(!ProjectPane.IsVisible);
        BottomToggle.Click += (_, _) => SetBottomPanelVisible(!BottomPanel.IsVisible);
        BuildButton.Click += (_, _) => _ = BuildAsync();
        ComposeButton.Click += (_, _) => _ = ComposeAsync();

        InstallMenu();
        PaintChrome();
        ThemeTokens.Changed += PaintChrome;
    }

    /// <summary>
    /// The macOS menu bar, mirroring the shipping Chord Writer's own
    /// (tools/ide/SharpeeIDE/Menus/MenuBuilder.swift): App, File, Edit, View, Build, Test,
    /// Window, with the same items, order and key equivalents.
    ///
    /// WHERE THIS HEAD CANNOT YET DO SOMETHING, THE ITEM IS DISABLED RATHER THAN ABSENT OR
    /// LYING. An item that renders and does nothing is the defect that started this
    /// (GH #482); an item quietly dropped hides how far the port actually is. A greyed item
    /// says both things honestly: the shipping app has this, and this head does not yet.
    /// The gaps are listed in GH #488.
    /// </summary>
    private void InstallMenu()
    {
        var file = Menu("File",
            Item("New Story…", "Cmd+N", () => _ = NewStoryAsync()),
            NotYet("New Import…", "Cmd+Shift+N"),
            Item("Open Project…", "Cmd+O", () => _ = OpenProjectDialogAsync()),
            Recent(),
            Separator(),
            Item("Save", "Cmd+S", () => _ = SaveAsync()),
            Separator(),
            Item("Close", "Cmd+W", Close));

        var edit = Menu("Edit",
            Item("Undo", "Cmd+Z", () => Editor.Undo()),
            Item("Redo", "Cmd+Shift+Z", () => Editor.Redo()),
            Separator(),
            Item("Cut", "Cmd+X", () => Editor.Cut()),
            Item("Copy", "Cmd+C", () => Editor.Copy()),
            Item("Paste", "Cmd+V", () => Editor.Paste()),
            Item("Select All", "Cmd+A", () => Editor.SelectAll()),
            Separator(),
            NotYet("Extract Selection to Import…", null));

        var view = Menu("View",
            Item("Project Pane", "Cmd+1", () => SetProjectPaneVisible(!ProjectPane.IsVisible)),
            Separator(),
            Item("Word Wrap", null, () => Editor.WordWrap = !Editor.WordWrap),
            Separator(),
            Submenu("Font",
                Item("Courier", null, () => SetEditorFont("Courier New")),
                Item("SF Mono", null, () => SetEditorFont("SF Mono")),
                Item("Menlo", null, () => SetEditorFont("Menlo")),
                Item("Georgia", null, () => SetEditorFont("Georgia")),
                Separator(),
                Item("Small", null, () => SetEditorFontSize(11)),
                Item("Medium", null, () => SetEditorFontSize(13)),
                Item("Large", null, () => SetEditorFontSize(15)),
                Item("Extra Large", null, () => SetEditorFontSize(18))),
            Submenu("Appearance",
                Item("System", null, () => ThemeTokens.Apply(dark: IsSystemDark())),
                Item("Light", null, () => Flip(dark: false)),
                Item("Dark", null, () => Flip(dark: true))));

        var build = Menu("Build",
            Item("Build", "Cmd+B", () => _ = BuildAsync()),
            Separator(),
            Item("Cancel Build", "Cmd+.", CancelCommand),
            Separator(),
            NotYet("Shipped Themes", null),
            Separator(),
            Item("Publish…", null, () => _ = PublishAsync()));

        var test = Menu("Test",
            Item("Run Tests", "Cmd+U", () => _ = RunTestsAsync()),
            Item("Testing Play Surface", "Cmd+Alt+U", () => { RightTabs.ActiveIndex = (int)RightTab.Testing; _ = ShowRightTabAsync(RightTab.Testing); }),
            Separator(),
            NotYet("Auto-Assertion", null),
            Separator(),
            Item("Cancel Test Run", null, CancelCommand));

        var window = Menu("Window",
            Item("Minimize", "Cmd+M", () => WindowState = WindowState.Minimized),
            Item("Zoom", null, () => WindowState = WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized));

        var menu = new NativeMenu();
        foreach (var top in new[] { file, edit, view, build, test, window }) menu.Add(top);

        // THE MENU BELONGS TO THE APPLICATION ON macOS. Setting it on the window alone
        // left the menu bar with only the system-supplied items — no File, no Story — so
        // every command in it was unreachable and Cmd+U did nothing (GH #485). Both are
        // set: the application menu is what macOS renders, the window menu is what a
        // global-menu Linux desktop exports.
        if (Application.Current is { } app) NativeMenu.SetMenu(app, menu);
        NativeMenu.SetMenu(this, menu);
    }

    /// <summary>The File ▸ Open Recent submenu, rebuilt from what the shell remembers.</summary>
    private NativeMenuItem Recent()
    {
        var recent = new NativeMenuItem("Open Recent") { Menu = new NativeMenu() };
        foreach (var path in ShellState.Recent)
        {
            var item = new NativeMenuItem(Path.GetFileNameWithoutExtension(path));
            item.Click += (_, _) =>
            {
                if (StoryProject.Resolve(path) is { } project) _ = OpenProjectAsync(project);
                else Report($"open recent: {path} is no longer a story this shell can open.");
            };
            recent.Menu!.Add(item);
        }
        if (ShellState.Recent.Count == 0)
            recent.Menu!.Add(new NativeMenuItem("No Recent Stories") { IsEnabled = false });
        return recent;
    }

    // ── menu construction ────────────────────────────────────────────────────

    /// <summary>A top-level menu holding the given items.</summary>
    private static NativeMenuItem Menu(string header, params NativeMenuItemBase[] items)
    {
        var top = new NativeMenuItem(header) { Menu = new NativeMenu() };
        foreach (var item in items) top.Menu!.Add(item);
        return top;
    }

    /// <summary>A submenu holding the given items.</summary>
    private static NativeMenuItem Submenu(string header, params NativeMenuItemBase[] items) =>
        Menu(header, items);

    private static NativeMenuItemBase Separator() => new NativeMenuItemSeparator();

    /// <summary>A menu item that actually does something when chosen.</summary>
    private static NativeMenuItem Item(string header, string? gesture, Action onClick)
    {
        var item = new NativeMenuItem(header);
        if (gesture is not null) item.Gesture = Avalonia.Input.KeyGesture.Parse(gesture);
        item.Click += (_, _) => onClick();
        return item;
    }

    /// <summary>
    /// An item the shipping app has and this head does not yet: shown, greyed, inert.
    /// It is a visible admission of a gap rather than a promise the app cannot keep.
    /// </summary>
    private static NativeMenuItem NotYet(string header, string? gesture)
    {
        var item = new NativeMenuItem(header) { IsEnabled = false };
        if (gesture is not null) item.Gesture = Avalonia.Input.KeyGesture.Parse(gesture);
        return item;
    }

    /// <summary>True when macOS is currently in its dark appearance.</summary>
    private bool IsSystemDark() =>
        ActualThemeVariant == Avalonia.Styling.ThemeVariant.Dark;

    private void SetEditorFont(string family)
    {
        Editor.FontFamily = new Avalonia.Media.FontFamily(family);
        _log.Line($"editor font: {family}");
    }

    private void SetEditorFontSize(double size)
    {
        Editor.FontSize = size;
        _log.Line($"editor font size: {size}");
    }

    /// <summary>Repaints the parts of the chrome that are plain controls rather than drawn surfaces.</summary>
    private void PaintChrome()
    {
        Background = ThemeTokens.EditorBackground;
        Chrome.Background = ThemeTokens.RailBackground;
        Rail.Background = ThemeTokens.RailBackground;
        // The rail's two glyphs are plain Buttons, so without this they keep
        // FluentTheme's own foreground — near-black ink on the 0x16171D dark rail.
        ProjectToggle.Foreground = ThemeTokens.Foreground;
        BottomToggle.Foreground = ThemeTokens.Foreground;
        StatusBar.Background = ThemeTokens.Accent;
        BuildPill.Foreground = ThemeTokens.StatusBarText;
        StatusText.Foreground = ThemeTokens.StatusBarText;
        StoryTitle.Foreground = ThemeTokens.Foreground;
        Editor.Background = ThemeTokens.EditorBackground;
        Editor.Foreground = ThemeTokens.Foreground;
        BottomText.Background = ThemeTokens.EditorBackground;
        BottomText.Foreground = ThemeTokens.Foreground;
    }

    /// <summary>The project column's width before a collapse, restored when the pane reopens.</summary>
    private double _projectWidth = 220;

    /// <summary>
    /// Shows or hides the project pane by moving the grid's project column to zero,
    /// not merely by hiding its child. The column is a fixed track, so a hidden child
    /// leaves its 220 px standing and the pane reads as blank rather than closed.
    /// The shipping app hides the same way, by driving the divider to the rail
    /// (tools/ide/SharpeeIDE/MainWindow.swift, applyProjectPaneVisible).
    /// </summary>
    /// <param name="visible">true to show the pane at its last width, false to collapse it.</param>
    private void SetProjectPaneVisible(bool visible)
    {
        if (visible == ProjectPane.IsVisible) return;

        // The decision — which widths, and what to reopen at — is ProjectPaneLayoutRules';
        // this method only binds the answer to the grid.
        var layout = ProjectPaneLayoutRules.For(visible, _projectWidth, Body.ColumnDefinitions[1].ActualWidth);
        _projectWidth = layout.RememberedWidth;

        ProjectPane.IsVisible = visible;
        ProjectSplitter.IsVisible = visible;
        Body.ColumnDefinitions[1].Width = new GridLength(layout.PaneWidth, GridUnitType.Pixel);
        Body.ColumnDefinitions[2].Width = new GridLength(layout.SplitterWidth, GridUnitType.Pixel);
        _log.Line($"project pane: {(visible ? $"shown at {_projectWidth:0}px" : "collapsed")}");
    }

    /// <summary>
    /// Shows or hides the bottom panel and the splitter that resizes it together, so the
    /// grip never overhangs the editor while there is nothing below it to drag.
    /// </summary>
    /// <param name="visible">true to show the panel and its splitter, false to hide both.</param>
    private void SetBottomPanelVisible(bool visible)
    {
        BottomPanel.IsVisible = visible;
        BottomSplitter.IsVisible = visible;
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
                LoadWorldViews(worldIndex);
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
                await ProbeReportedDefectsAsync();
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
        _documents.Clear();
        _activeDocument = -1;
        StoryTitle.Text = "No story open — File ▸ Open Project…";
        BuildPill.Text = "—";
        RefreshEditorTabs();
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
        _documents.Clear();
        _activeDocument = -1;
        ProjectPane.Load(project.Folder);
        LoadIndex(project);
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

    /// <summary>
    /// Asks for a project folder and opens the story inside it, as File ▸ Open Project…
    /// does in the shipping app. A folder with no single unambiguous `.story` is reported
    /// rather than half-opened.
    /// </summary>
    private async Task OpenProjectDialogAsync()
    {
        var picked = await StorageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions
        {
            Title = "Open a Chord project",
            AllowMultiple = false,
        });

        var path = picked.Count > 0 ? picked[0].TryGetLocalPath() : null;
        if (path is null) return;

        var project = StoryProject.Resolve(path);
        if (project is null)
        {
            Report($"open: {Path.GetFileName(path)} holds no single .story this shell can open.");
            return;
        }
        await OpenProjectAsync(project);
    }

    /// <summary>
    /// Opens a file in the editor, or switches to it when it is already open. Each document
    /// keeps its own text, caret and dirty state; opening a second file no longer discards
    /// the first.
    /// </summary>
    /// <param name="path">The absolute path of the file to open.</param>
    /// <summary>
    /// Loads the Index tab from the story's IR, or empties it when there is no built IR
    /// to read. Called after a build and when a story is opened, so the tab reflects the
    /// story in front of the author rather than whichever one was open first.
    /// </summary>
    /// <param name="project">The open story, or null when none is.</param>
    private void LoadIndex(StoryProject? project)
    {
        if (project?.StoryIr is not { } irPath)
        {
            IndexPane.Clear();
            return;
        }

        try
        {
            if (StoryIndex.Read(File.ReadAllText(irPath)) is { } index)
            {
                IndexPane.Load(index);
                _log.Line($"index: {IndexPane.RowCount} declaration(s) in {index.Sections.Count} section(s)");
                return;
            }
            _log.Line("index: the IR could not be read");
        }
        catch (Exception ex)
        {
            _log.Line($"index unavailable: {ex.GetType().Name}: {ex.Message}");
        }
        IndexPane.Clear();
    }

    /// <summary>
    /// Opens the file a declaration was written in and puts the caret on it — what makes
    /// the Index an index rather than a list. The IR names a span's file relative to the
    /// story folder, so it is resolved against that rather than the process's directory.
    /// </summary>
    /// <param name="span">Where the selected declaration was written.</param>
    private async Task RevealAsync(IndexSpan span)
    {
        if (_project is not { } project) return;

        // No file on the span means the story's own file — a single-file story's spans
        // carry no `file` at all.
        var path = span.File switch
        {
            null => project.StoryFile,
            var f when Path.IsPathRooted(f) => f,
            var f => Path.Combine(project.Folder, f),
        };
        if (!File.Exists(path))
        {
            _log.Line($"index: {span.File} is not beside the story — nothing to reveal");
            return;
        }

        await OpenAsync(path);

        // A span from an older build can name a line the file no longer has; the document
        // is still the right one to have opened, so the caret simply stays put.
        var line = Math.Clamp(span.Line, 1, Editor.Document.LineCount);
        var offset = Editor.Document.GetLineByNumber(line).Offset
                     + Math.Max(0, Math.Min(span.Column - 1, Editor.Document.GetLineByNumber(line).Length));
        Editor.CaretOffset = offset;
        Editor.ScrollToLine(line);
        Editor.Focus();
        _log.Line($"index: revealed {Path.GetFileName(path)}:{line}:{span.Column}");
    }

    private async Task OpenAsync(string path)
    {
        var already = _documents.FindIndex(d => string.Equals(d.Path, path, StringComparison.Ordinal));
        if (already >= 0)
        {
            SwitchToDocument(already);
            return;
        }

        var document = new TextDocument(await File.ReadAllTextAsync(path));
        var opened = new OpenDocument { Path = path, Document = document };
        document.TextChanged += (_, _) => MarkDirty(opened);

        _documents.Add(opened);
        SwitchToDocument(_documents.Count - 1);

        var tokens = await HighlightAsync();
        _log.Line($"editor: {Path.GetFileName(path)} — {document.LineCount} lines, {tokens}; "
                  + $"{_documents.Count} document(s) open");
    }

    /// <summary>Shows one open document, keeping the caret of the one being left.</summary>
    /// <param name="index">Index into the open documents.</param>
    private void SwitchToDocument(int index)
    {
        if (index < 0 || index >= _documents.Count) return;

        if (_activeDocument >= 0 && _activeDocument < _documents.Count)
            _documents[_activeDocument].CaretOffset = Editor.CaretOffset;

        _activeDocument = index;
        var document = _documents[index];
        Editor.Document = document.Document;
        Editor.CaretOffset = Math.Min(document.CaretOffset, document.Document.TextLength);

        RefreshEditorTabs();
        _ = HighlightAsync();
    }

    /// <summary>
    /// Closes one open document. A dirty document is saved first rather than dropped —
    /// this shell has no "do you want to save" dialog yet, and losing an author's edits to
    /// a stray click on a close glyph is the worse of the two answers.
    /// </summary>
    /// <param name="index">Index into the open documents.</param>
    private async Task CloseDocumentAsync(int index)
    {
        if (index < 0 || index >= _documents.Count) return;

        var document = _documents[index];
        if (document.Dirty)
        {
            await File.WriteAllTextAsync(document.Path, document.Document.Text);
            Report($"closed {Path.GetFileName(document.Path)} — saved first");
        }

        _documents.RemoveAt(index);

        if (_documents.Count == 0)
        {
            _activeDocument = -1;
            Editor.Document = new TextDocument(string.Empty);
            RefreshEditorTabs();
            _log.Line("editor: no documents open");
            return;
        }

        _activeDocument = -1;
        SwitchToDocument(Math.Min(index, _documents.Count - 1));
    }

    /// <summary>Marks a document dirty and shows it on its tab.</summary>
    private void MarkDirty(OpenDocument document)
    {
        if (document.Dirty) return;
        document.Dirty = true;
        RefreshEditorTabs();
    }

    /// <summary>Repaints the tab bar from the open documents.</summary>
    private void RefreshEditorTabs()
    {
        EditorTabs.Documents = _documents.Select(d => Path.GetFileName(d.Path)).ToArray();
        EditorTabs.ActiveIndex = _activeDocument;
        for (var i = 0; i < _documents.Count; i++) EditorTabs.SetDirty(i, _documents[i].Dirty);
        EditorTabs.InvalidateVisual();
    }

    /// <summary>
    /// Re-colours the active document, answering how many tokens the lexer found.
    /// Only Chord sources are lexed: running the Chord lexer over a project's JSON coloured
    /// it as if it were a story, which is confidently wrong rather than merely plain.
    /// </summary>
    private async Task<string> HighlightAsync()
    {
        if (_lexer is not { } lexer || Editor.Document is not { } document) return "no highlighting";

        var extension = Path.GetExtension(_openFile ?? string.Empty).ToLowerInvariant();
        if (extension is not (".story" or ".chord"))
        {
            _colorizer.Clear();
            Editor.TextArea.TextView.Redraw();
            return "not a Chord source — no highlighting";
        }

        var lex = await lexer.LexAsync(document.Text);
        _colorizer.Apply(lex, lexer.Kinds, document);
        Editor.TextArea.TextView.Redraw();
        return $"{lex.TokenCount} tokens";
    }

    /// <summary>Writes the editor's buffer back to the file it came from.</summary>
    private async Task SaveAsync()
    {
        if (_activeDocument < 0 || _activeDocument >= _documents.Count)
        {
            Report("save: nothing is open.");
            return;
        }

        var document = _documents[_activeDocument];
        var path = document.Path;
        await File.WriteAllTextAsync(path, document.Document.Text);
        document.Dirty = false;
        RefreshEditorTabs();
        Report($"saved {Path.GetFileName(path)} — {document.Document.LineCount} lines");
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
            RightTabs.ActiveIndex = (int)RightTab.Documentation;
            await ShowRightTabAsync(RightTab.Documentation);
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

        RightTabs.ActiveIndex = (int)RightTab.Play;
        await ShowRightTabAsync(RightTab.Play);
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

        // The CLI's last lines are still in flight when the process exits — output reaches
        // the panel through Dispatcher.Post — so drain the queue before appending, or the
        // report lands in the middle of the build's own tail.
        await Dispatcher.UIThread.InvokeAsync(() => { }, DispatcherPriority.Background);

        // The build panel's closing report — the story's name in lights and its numbers,
        // as the shipping app prints them. The CLI stops at "npx serve"; this is the part
        // the app adds, and without it the Build tab ends on a shell hint.
        Report("");
        Report("✓ Build succeeded.");
        if (project.StoryIr is { } irPath)
        {
            try
            {
                if (StoryBuildReport.From(await File.ReadAllTextAsync(irPath)) is { } report)
                    foreach (var line in report.TrimEnd('\n').Split('\n')) Report(line);
            }
            catch (Exception ex)
            {
                // A report is a courtesy; a build that succeeded did succeed.
                _log.Line($"build report unavailable: {ex.GetType().Name}: {ex.Message}");
            }
        }

        LoadIndex(project);

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

            LoadWorldViews(path);
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

    /// <summary>Builds and zips a distributable browser app (ADR-284), as Build ▸ Publish… does.</summary>
    private async Task PublishAsync()
    {
        if (_project is not { } project) { Report("publish: nothing is open."); return; }

        var exit = await RunToolchainAsync("publish", new[] { "publish", project.StoryFile }, project.Folder);
        if (exit == 0) Report("publish: the distributable is in the story's dist/ folder.");
    }

    /// <summary>Cancels the toolchain command now running, if any — Build ▸ Cancel Build, Test ▸ Cancel Test Run.</summary>
    private void CancelCommand()
    {
        if (!_running || _commandCts is null) { Report("cancel: nothing is running."); return; }
        _commandCts.Cancel();
        Report("cancel: requested.");
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
        _commandCts = new CancellationTokenSource();
        SetBottomPanelVisible(true);
        Report($"$ sharpee {string.Join(' ', arguments)}");
        StatusText.Text = $"{label}…";
        BuildPill.Text = label + "…";

        try
        {
            var exit = await HostServices.Current.RunAsync(
                shim, arguments, workingDirectory,
                line => Dispatcher.UIThread.Post(() => Report(line)),
                line => Dispatcher.UIThread.Post(() => Report(line)),
                _commandCts.Token);

            Report($"— {label} exited {exit}");
            StatusText.Text = exit == 0 ? $"{label} ok" : $"{label} failed ({exit})";
            return exit;
        }
        catch (OperationCanceledException)
        {
            Report($"— {label} cancelled");
            StatusText.Text = $"{label} cancelled";
            return -1;
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
            _commandCts?.Dispose();
            _commandCts = null;
        }
    }

    /// <summary>
    /// Appends one line to the bottom panel, the Build tab and the run log, and scrolls both
    /// to it. The Build tab is the shipping app's home for this output; the bottom panel is
    /// this shell's, and both show the same stream rather than two partial ones.
    /// </summary>
    private void Report(string line)
    {
        BottomText.Text = BottomText.Text is { Length: > 0 } existing ? existing + "\n" + line : line;
        BottomText.CaretIndex = BottomText.Text.Length;
        BuildLog.Text = BuildLog.Text is { Length: > 0 } log ? log + "\n" + line : line;
        BuildLog.CaretIndex = BuildLog.Text.Length;
        _log.Line(line);
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

            // The surface's Run button. Its post had no handler here at all, so the button
            // could only sit at "Running…" — the shipping app answers it in
            // TestingSurfaceViewController.startRun.
            if (message.Handler == "testingSurface"
                && ReferenceEquals(message.View, TestingWeb)
                && LooksLikeRunRequest(message.Body))
            {
                _ = RunTreeTestsForSurfaceAsync();
            }
        }

        // A replayed tree posts hundreds of records; the log wants the shape, not each one.
        // SHARPEE_IDE_LOG_EVERY_RECORD turns the sampling off, for the case the sampling
        // itself is the problem: "no records arrived" and "fewer than 25 arrived" look
        // identical at 1-in-25, and they are different diagnoses.
        var logEvery = Environment.GetEnvironmentVariable("SHARPEE_IDE_LOG_EVERY_RECORD") is { Length: > 0 };
        if (logEvery || count <= 2 || count % 25 == 0)
            _log.Line($"pane → host: {message.Handler} #{count}: {Trim(message.Body, 120)}");
    }

    /// <summary>
    /// True when a `testingSurface` post is the run column's request. The surface posts
    /// `{run:true}`; every other post on this handler is view state.
    /// </summary>
    /// <param name="body">The raw JSON the page posted.</param>
    private static bool LooksLikeRunRequest(string body)
    {
        try
        {
            return System.Text.Json.Nodes.JsonNode.Parse(body)?["run"]?.GetValue<bool>() == true;
        }
        catch
        {
            // A post this host cannot parse is not a run request; view state is not our business.
            return false;
        }
    }

    /// <summary>One batch of NDJSON run lines, folded into the run column in arrival order.</summary>
    /// <param name="batch">Raw NDJSON lines, each already a JSON string literal.</param>
    private static string RunLineBatch(IReadOnlyList<string> batch) =>
        "for (var l of [" + string.Join(",", batch) + "])"
        + " window.__sharpeeTestingSurface && window.__sharpeeTestingSurface.runLine"
        + " && window.__sharpeeTestingSurface.runLine(l)";

    /// <summary>Ends the run column, so the Run button leaves "Running…" whatever happened.</summary>
    /// <param name="ok">True when the run finished and passed.</param>
    /// <param name="note">Why it did not start or did not pass, or null.</param>
    private Task FinishSurfaceRunAsync(bool ok, string? note = null)
    {
        var arguments = ok ? "true" : "false";
        if (note is not null) arguments += ", " + System.Text.Json.JsonSerializer.Serialize(note);
        return _door.EvaluateAsync(TestingWeb,
            "window.__sharpeeTestingSurface && window.__sharpeeTestingSurface.runExit"
            + $" && window.__sharpeeTestingSurface.runExit({arguments})");
    }

    /// <summary>
    /// Runs the story's tree document for the testing surface's own Run button, streaming
    /// the CLI's NDJSON into the run column line by line.
    ///
    /// The arguments are the shipping app's (Test/TestRunner.swift, treeRunArguments):
    /// `--capture-output` is what puts the story's words on a passing turn, and
    /// `--capture-world` is what fills the inherited-state header. Dropping either leaves
    /// a column that still renders and quietly says less.
    /// </summary>
    private async Task RunTreeTestsForSurfaceAsync()
    {
        if (_project is not { } project)
        {
            await FinishSurfaceRunAsync(false, "No story is open, so the run did not start.");
            return;
        }
        var shim = HostServices.Current.ToolchainShim;
        if (shim is null)
        {
            await FinishSurfaceRunAsync(false, "This build carries no toolchain, so it cannot run tests.");
            return;
        }
        if (_running)
        {
            await FinishSurfaceRunAsync(false, "Another command is already running.");
            return;
        }

        // The run reads disk, so unsaved edits would test stale source.
        await SaveAsync();

        _running = true;
        _commandCts = new CancellationTokenSource();
        StatusText.Text = "running tests…";
        BuildPill.Text = "test…";
        try
        {
            var exit = await HostServices.Current.RunAsync(
                shim,
                new[] { "test", project.StoryFile, "--tree", "--capture-output", "--capture-world", "--json" },
                project.Folder,
                line => _runRelay.Enqueue(System.Text.Json.JsonSerializer.Serialize(line)),
                line => Dispatcher.UIThread.Post(() => Report(line)),
                _commandCts.Token);

            StatusText.Text = exit == 0 ? "tests passed" : "tests failed";
            BuildPill.Text = exit == 0 ? "tests passed" : "tests failed";
            await FinishSurfaceRunAsync(exit == 0);
        }
        catch (OperationCanceledException)
        {
            StatusText.Text = "test run cancelled";
            await FinishSurfaceRunAsync(false, "The run was cancelled.");
        }
        catch (Exception ex)
        {
            StatusText.Text = "tests failed";
            await FinishSurfaceRunAsync(false, $"{ex.GetType().Name}: {ex.Message}");
        }
        finally
        {
            _running = false;
            _commandCts?.Dispose();
            _commandCts = null;
        }
    }

    /// <summary>
    /// Points every World sub-pane at one world index and relabels the strip. One call
    /// site, because a map showing one story's rooms beside another story's findings is
    /// the failure two load calls eventually produce.
    /// </summary>
    /// <param name="worldIndexPath">The JSON `sharpee world-index` wrote.</param>
    private void LoadWorldViews(string worldIndexPath)
    {
        WorldMap.Load(worldIndexPath);
        WorldReach.Load(worldIndexPath);
        LabelWorldSubPanes(worldIndexPath);
        _log.Line($"world reach: {WorldReach.Headline}; {WorldReach.RowCount} finding row(s)");
    }

    /// <summary>The World pane's sub-panes, in the order they are shown.</summary>
    private enum WorldSubPane { Map, Reach, Incomplete }

    /// <summary>
    /// Shows one World sub-pane. Each keeps its own view and its own scroll position, so
    /// switching between them costs nothing and loses nothing.
    /// </summary>
    /// <param name="index">The sub-pane's index in the strip.</param>
    private void ShowWorldSubPane(int index)
    {
        var pane = (WorldSubPane)index;
        WorldScroll.IsVisible = pane == WorldSubPane.Map;
        WorldReachScroll.IsVisible = pane == WorldSubPane.Reach;
        WorldIncomplete.IsVisible = pane == WorldSubPane.Incomplete;
    }

    /// <summary>
    /// Relabels the sub-pane strip with what each view holds — the map's room count, the
    /// analyzer's finding count, and the candidates the Incomplete view would carry. The
    /// counts are the author's reason to open one of them, so they belong on the tab
    /// rather than inside it.
    /// </summary>
    /// <param name="worldIndexPath">The JSON `sharpee world-index` wrote, or null.</param>
    private void LabelWorldSubPanes(string? worldIndexPath)
    {
        var findings = 0;
        var candidates = 0;
        if (worldIndexPath is not null)
        {
            try
            {
                var index = System.Text.Json.Nodes.JsonNode.Parse(File.ReadAllText(worldIndexPath));
                findings = index?["reach"]?["findingCount"]?.GetValue<int>() ?? 0;
                if (index?["incomplete"]?["counts"] is System.Text.Json.Nodes.JsonObject counts)
                    candidates = counts.Sum(c => c.Value?.GetValue<int>() ?? 0);
            }
            catch (Exception ex)
            {
                _log.Line($"world sub-pane counts unavailable: {ex.GetType().Name}: {ex.Message}");
            }
        }

        WorldTabs.Tabs = new[]
        {
            $"Map · {WorldMap.RoomCount}",
            $"Reach · {findings}",
            $"Incomplete · {candidates}",
        };
        WorldTabs.InvalidateVisual();
    }

    /// <summary>
    /// The right panel's tabs, in the order they are shown. Named because they used to be
    /// bare integers in a dozen call sites, which is a renumbering hunt every time a tab is
    /// inserted — and the shipping app has three more to come (GH #488).
    /// </summary>
    private enum RightTab { Build, Play, Testing, Index, Documentation, World }

    /// <summary>Total page→host messages received this run, across all handlers.</summary>
    private int PaneMessageCount => _paneMessages.Values.Sum();

    private static string Trim(string s, int n) => s.Length <= n ? s : s.Substring(0, n) + " …";

    /// <summary>
    /// Shows one pane. Each pane keeps its own view and its own state, so this only
    /// changes which view is visible — it does not reload anything. Reloading on every
    /// tab switch cost the testing pane its entire replay each time it was reopened.
    /// </summary>
    /// <param name="index">0 Build, 1 Play, 2 Testing, 3 Documentation, 4 World.</param>
    /// <remarks>
    /// The shipping app's right panel carries eight tabs — Build, Play, Testing, Index,
    /// Diagnosis, Documentation, Publish, World. This head has five of them; Index,
    /// Diagnosis and Publish are tracked in GH #488 rather than shown as tabs that do
    /// nothing.
    /// </remarks>
    private Task ShowRightTabAsync(RightTab tab)
    {
        BuildLog.IsVisible = tab == RightTab.Build;
        PlayWeb.IsVisible = tab == RightTab.Play;
        TestingWeb.IsVisible = tab == RightTab.Testing;
        IndexScroll.IsVisible = tab == RightTab.Index;
        DocsWeb.IsVisible = tab == RightTab.Documentation;
        WorldPane.IsVisible = tab == RightTab.World;
        return Task.CompletedTask;
    }

    /// <summary>The view a tab is shown in, or null for the tabs that are not web panes.</summary>
    private NativeWebView? ViewFor(RightTab tab) => tab switch
    {
        RightTab.Play => PlayWeb,
        RightTab.Testing => TestingWeb,
        RightTab.Documentation => DocsWeb,
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
        ReportMenu();

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

        // 2a. Several documents at once: open a second file, switch, close. The editor held
        // exactly one file until 2026-09-17, and its close glyph did nothing.
        var second = Directory.GetFiles(project.Folder)
            .FirstOrDefault(f => !string.Equals(f, project.StoryFile, StringComparison.Ordinal)
                                 && !Path.GetFileName(f).StartsWith('.'));
        if (second is not null)
        {
            await OpenAsync(second);
            var opened = _documents.Count;
            var activeAfterOpen = Path.GetFileName(_openFile ?? "<none>");

            SwitchToDocument(0);
            var activeAfterSwitch = Path.GetFileName(_openFile ?? "<none>");

            await CloseDocumentAsync(1);
            var afterClose = _documents.Count;

            _log.Line($"  documents: opened a second file → {opened} open, active {activeAfterOpen}; "
                      + $"switched to tab 0 → active {activeAfterSwitch}; closed tab 1 → {afterClose} open, "
                      + $"active {Path.GetFileName(_openFile ?? "<none>")}");
        }

        // 3a. The World tab, which was empty in every build before this one.
        _log.Line($"  world map: {WorldMap.RoomCount} room(s), {WorldMap.ConnectionCount} connection(s), "
                  + $"{WorldMap.LevelCount} level(s)");

        // 3b. Switching tabs must SHOW a pane, not reload it. The testing pane's replay is
        // the expensive thing a reload throws away, so it is what gets checked.
        var cardsBefore = await EvaluateAsync(TestingWeb, "document.querySelectorAll('[class*=card]').length");
        var recordsBefore = _paneMessages.GetValueOrDefault("turnEvents");
        RightTabs.ActiveIndex = (int)RightTab.Play;
        await ShowRightTabAsync(RightTab.Play);
        await Task.Delay(300);
        RightTabs.ActiveIndex = (int)RightTab.Documentation;
        await ShowRightTabAsync(RightTab.Documentation);
        await Task.Delay(300);
        RightTabs.ActiveIndex = (int)RightTab.Testing;
        await ShowRightTabAsync(RightTab.Testing);
        await Task.Delay(1500);
        var cardsAfter = await EvaluateAsync(TestingWeb, "document.querySelectorAll('[class*=card]').length");
        var recordsAfter = _paneMessages.GetValueOrDefault("turnEvents");
        _log.Line($"  tab switch Testing→Play→Docs→Testing: cards {cardsBefore} → {cardsAfter}, "
                  + $"turn records {recordsBefore} → {recordsAfter} "
                  + $"({(recordsAfter == recordsBefore ? "no replay — the pane was shown, not reloaded" : "REPLAYED")})");

        // 4. Edit and save: the buffer must reach the disk.
        var storyFile = project.StoryFile;
        var before = await File.ReadAllTextAsync(storyFile);
        // `##` is Chord's comment (ADR-249), not `//`. The old marker parsed as an unknown
        // declaration, so every step after the save ran against a story that no longer built.
        var marker = "## app exit state " + DateTime.UtcNow.ToString("O");
        // A `##` comment needs a blank line either side of it (lex.comment-blank-lines).
        Editor.Document.Text = before.TrimEnd() + "\n\n" + marker + "\n\n";
        await SaveAsync();
        var after = await File.ReadAllTextAsync(storyFile);
        _log.Line($"  save: file changed on disk={!string.Equals(before, after, StringComparison.Ordinal)}, "
                  + $"marker present={after.Contains(marker, StringComparison.Ordinal)}");
        await File.WriteAllTextAsync(storyFile, before);
        // The BUFFER has to be restored too, not just the file: anything that saves after
        // this — the run button's own save, say — would otherwise write the marker back.
        Editor.Document.Text = before;
        _log.Line("  save: source restored to its original bytes, buffer included");

        // 5. Check and test, through the toolchain again.
        await ComposeAsync();
        _log.Line($"  check: pill={BuildPill.Text}");
        await RunTestsAsync();
        _log.Line($"  tests: status={StatusText.Text}");

        // The INDEX TAB, shown and navigated — the tab is only an index if a row takes you
        // to the declaration, so a row is actually activated and the editor read back.
        RightTabs.ActiveIndex = (int)RightTab.Index;
        await ShowRightTabAsync(RightTab.Index);
        await Frames();
        _log.Line($"  index: {IndexPane.RowCount} declaration(s) listed, visible={IndexScroll.IsVisible}");

        if (StoryIndex.Read(await File.ReadAllTextAsync(project.StoryIr!)) is { } indexDoc)
        {
            _log.Line("  index sections: "
                      + string.Join(", ", indexDoc.Sections.Select(x => $"{x.Title} {x.Rows.Count}")));

            var target = indexDoc.Sections
                .SelectMany(x => x.Rows)
                .FirstOrDefault(r => r.Span is not null);
            if (target?.Span is { } span)
            {
                await RevealAsync(span);
                await Frames();
                var caretLine = Editor.Document.GetLineByOffset(Editor.CaretOffset).LineNumber;
                _log.Line($"  index reveal: \"{target.Title}\" → {Path.GetFileName(_documents[_activeDocument].Path)}"
                          + $":{caretLine} (span said {span.File ?? "the story file"}:{span.Line})");
            }
        }

        // The WORLD PANE's three sub-panes, switched in the real window.
        RightTabs.ActiveIndex = (int)RightTab.World;
        await ShowRightTabAsync(RightTab.World);
        await Frames();
        _log.Line($"  world tabs: {string.Join(" | ", WorldTabs.Tabs)}");
        foreach (var pane in new[] { WorldSubPane.Map, WorldSubPane.Reach, WorldSubPane.Incomplete })
        {
            WorldTabs.ActiveIndex = (int)pane;
            ShowWorldSubPane((int)pane);
            await Frames();
            _log.Line($"  world sub-pane {pane}: map={WorldScroll.IsVisible}, "
                      + $"reach={WorldReachScroll.IsVisible}, incomplete={WorldIncomplete.IsVisible}");
        }
        _log.Line($"  world reach: {WorldReach.Headline}");
        _log.Line($"  world reach rows: {WorldReach.RowCount} finding(s) listed");

        // Switching away and back must not cost either view its state.
        ShowWorldSubPane((int)WorldSubPane.Map);
        await Frames();
        ShowWorldSubPane((int)WorldSubPane.Reach);
        await Frames();
        _log.Line($"  world reach after a round trip: {WorldReach.RowCount} finding(s), "
                  + $"map still holds {WorldMap.RoomCount} room(s)");

        // The RUN BUTTON, clicked in the page — the path the menu item never exercises.
        // Its post had no handler at all until 2026-09-18, so the button could only sit at
        // "Running…"; this clicks the real element and reads the real button back.
        await ShowRightTabAsync(RightTab.Testing);
        var beforeLabel = await EvaluateAsync(TestingWeb,
            "(document.getElementById('ts-run-btn')||{}).textContent");
        // The surface declines a run while its own driver is replaying (onRun bails on
        // driverBusy/replayActive), so the click is retried until it takes rather than
        // reported as a refusal the host caused.
        var clicked = "not-attempted";
        for (var attempt = 0; attempt < 60; attempt++)
        {
            clicked = await EvaluateAsync(TestingWeb,
                "(function(){var b=document.getElementById('ts-run-btn');"
                + "if(!b) return 'no-button'; b.click(); return b.textContent;})()") ?? "null";
            if (clicked.Contains("Running", StringComparison.Ordinal)) break;
            await Task.Delay(500);
        }
        _log.Line($"  run button: before={beforeLabel}, on click={clicked}");

        var settled = false;
        for (var wait = 0; wait < 600 && !settled; wait++)
        {
            var label = await EvaluateAsync(TestingWeb,
                "(document.getElementById('ts-run-btn')||{}).textContent");
            settled = label is not null && !label.Contains("Running", StringComparison.Ordinal);
            if (!settled) await Task.Delay(200);
        }
        var afterLabel = await EvaluateAsync(TestingWeb,
            "(document.getElementById('ts-run-btn')||{}).textContent");
        var column = await EvaluateAsync(TestingWeb,
            "JSON.stringify({rows:document.querySelectorAll('#ts-run-results *').length,"
            + "text:(document.getElementById('ts-run-results')||{}).innerText||''})");
        _log.Line($"  run button: settled={settled}, after={afterLabel}, relayed={_runRelay.Delivered} line(s)");
        _log.Line($"  run column: {Trim(column, 200)}");

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
        foreach (var (name, tab) in new[]
                 {
                     ("Play", RightTab.Play),
                     ("Docs", RightTab.Documentation),
                     ("Testing", RightTab.Testing),
                 })
        {
            RightTabs.ActiveIndex = (int)tab;
            await ShowRightTabAsync(tab);
            var view = ViewFor(tab)!;

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
        WorldPane.IsVisible = true;
        PlayWeb.IsVisible = false;
        TestingWeb.IsVisible = false;
        DocsWeb.IsVisible = false;
        SetBottomPanelVisible(true);
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
    /// The two shell defects reported 2026-09-18, each read back off the live window:
    /// the rail glyphs' ink in both palettes, and the project column's measured width
    /// across a collapse. Both are answers the window gives, not values we just set.
    /// </summary>
    private async Task ProbeReportedDefectsAsync()
    {
        _log.Line("── reported defects (2026-09-18) ──");

        // 1. The rail glyphs. A glyph invisible in dark is ink that matches the rail it
        // sits on, so both are sampled and compared rather than asserted from the token.
        foreach (var dark in new[] { false, true })
        {
            ThemeTokens.Apply(dark);
            await Frames();
            var ink = (ProjectToggle.Foreground as ISolidColorBrush)?.Color;
            var rail = (Rail.Background as ISolidColorBrush)?.Color;
            var readable = ink is { } i && rail is { } r
                && (Math.Abs(i.R - r.R) + Math.Abs(i.G - r.G) + Math.Abs(i.B - r.B)) > 90;
            _log.Line($"  rail glyphs, {(dark ? "dark" : "light")}: ink=#{ink?.R:X2}{ink?.G:X2}{ink?.B:X2}, "
                      + $"rail=#{rail?.R:X2}{rail?.G:X2}{rail?.B:X2} — {(readable ? "READABLE" : "INVISIBLE")}");
        }

        // 2. The project pane's collapse, measured on the grid rather than on IsVisible:
        // hiding the child alone left the column's 220 px standing, which is the defect.
        await Frames();
        var shownWidth = Body.ColumnDefinitions[1].ActualWidth;
        var editorShown = Body.ColumnDefinitions[3].ActualWidth;
        SetProjectPaneVisible(false);
        await Frames();
        var collapsedWidth = Body.ColumnDefinitions[1].ActualWidth;
        var editorCollapsed = Body.ColumnDefinitions[3].ActualWidth;
        SetProjectPaneVisible(true);
        await Frames();
        var reopenedWidth = Body.ColumnDefinitions[1].ActualWidth;

        _log.Line($"  project column: shown={shownWidth:0}px, collapsed={collapsedWidth:0}px, "
                  + $"reopened={reopenedWidth:0}px — {(collapsedWidth == 0 ? "COLLAPSES" : "LEAVES A HOLE")}");
        _log.Line($"  editor column took the space: {editorShown:0}px → {editorCollapsed:0}px "
                  + $"(+{editorCollapsed - editorShown:0}px)");

        // 3. The splitter grips. What matters is the bounds the splitter is hit-tested
        // across, not the gap it sits in, so both are read and reported together.
        await Frames();
        foreach (var (name, splitter, gap) in new (string, GridSplitter, double)[]
                 {
                     ("project", ProjectSplitter, Body.ColumnDefinitions[2].ActualWidth),
                     ("right panel", RightSplitter, Body.ColumnDefinitions[4].ActualWidth),
                     ("bottom panel", BottomSplitter, EditorColumn.RowDefinitions[2].ActualHeight),
                 })
        {
            var grip = name == "bottom panel" ? splitter.Bounds.Height : splitter.Bounds.Width;
            _log.Line($"  {name} splitter: gap {gap:0}px, grip {grip:0}px, cursor {splitter.Cursor}");
        }

        // 4. Can each resizable column actually move BOTH ways? A drag is a width write, so
        // writing the widths a drag would write answers whether the grid refuses one
        // direction — which is what "it moves right but not left" would mean.
        foreach (var (name, index) in new[] { ("project", 1), ("right panel", 5) })
        {
            var original = Body.ColumnDefinitions[index].Width;
            var start = Body.ColumnDefinitions[index].ActualWidth;

            Body.ColumnDefinitions[index].Width = new GridLength(start - 60, GridUnitType.Pixel);
            await Frames();
            var narrower = Body.ColumnDefinitions[index].ActualWidth;

            Body.ColumnDefinitions[index].Width = new GridLength(start + 60, GridUnitType.Pixel);
            await Frames();
            var wider = Body.ColumnDefinitions[index].ActualWidth;

            Body.ColumnDefinitions[index].Width = original;
            await Frames();

            var shrinks = Math.Abs(narrower - (start - 60)) < 1;
            var grows = Math.Abs(wider - (start + 60)) < 1;
            _log.Line($"  {name} column from {start:0}px: −60 → {narrower:0}px {(shrinks ? "OK" : "REFUSED")}, "
                      + $"+60 → {wider:0}px {(grows ? "OK" : "REFUSED")}");
        }
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

    /// <summary>
    /// Walks the menu macOS actually renders — the application's — and logs every item with
    /// whether it is enabled. It reports the menu the platform was handed, not the object
    /// this window built: an earlier version read back the window menu it had just set and
    /// pronounced the menu bar fine while the bar showed nothing (GH #485).
    /// </summary>
    private void ReportMenu()
    {
        var menu = Application.Current is { } app ? NativeMenu.GetMenu(app) : null;
        if (menu is null) { _log.Line("native menu: the application carries none"); return; }

        var enabled = 0;
        var disabled = 0;
        var lines = new List<string>();
        foreach (var top in menu.Items.OfType<NativeMenuItem>())
        {
            var items = top.Menu?.Items.OfType<NativeMenuItem>().ToList() ?? new List<NativeMenuItem>();
            foreach (var item in items)
            {
                if (item.IsEnabled) enabled++; else disabled++;
            }
            lines.Add($"{top.Header} ({items.Count}: "
                      + string.Join(", ", items.Select(i => i.Header + (i.IsEnabled ? "" : " [disabled]"))) + ")");
        }
        _log.Line($"native menu: {menu.Items.Count} top-level, {enabled} enabled, {disabled} disabled");
        foreach (var line in lines) _log.Line("  " + line);
    }

    private void Flip(bool dark)
    {
        ThemeTokens.Apply(dark);
        _log.Line($"flip: IsDark={ThemeTokens.IsDark} (button)");
    }
}
