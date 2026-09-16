// The shell, and Phase 4's two probes.
//
// It mirrors MainWindow.swift closely enough for a felt comparison — chrome
// band, rail, project pane, editor over its tab bar, right panel carrying the
// real web panes and the World map, bottom panel, status bar — and mounts
// Phase 1's pane hosting and Phase 3's editor inside it, so the thing being
// judged is a shell rather than a harness.
//
// The two probes it runs:
//   1. The drawing model. Every custom surface counts its Render calls, so the
//      question "is Render(DrawingContext) immediate-mode like WPF's OnRender,
//      or retained composition wearing the name" is answered by observation.
//   2. ADR-297's live flip, timed, with the token values read back after.
//
// Public interface: ShellWindow, constructed by App when --shell is passed.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Diagnostics;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia;
using Avalonia.Media;
using Avalonia.Media.Imaging;
using Avalonia.Threading;
using AvaloniaEdit.Document;
using PaneHost.Editor;
using PaneHost.Hosting;
using PaneHost.Theme;

namespace PaneHost.Shell;

public partial class ShellWindow : Window
{
    private static string StoryFolder => RepoPaths.FernhillFolder;
    private static string StoryFile => RepoPaths.FernhillStory;
    private static string? WorldIndex => RepoPaths.WorldIndex;
    private static string LexerServer => RepoPaths.EditorBridge;
    private static string VendoredNode => RepoPaths.Node;

    private readonly ProbeLog _log = new(Path.Combine(RepoPaths.DevOut, "shell-log.txt"));
    private readonly ChordColorizer _colorizer = new();
    private ChordLexerService? _lexer;
    private LocalOrigin? _origin;

    public ShellWindow()
    {
        InitializeComponent();

        Editor.TextArea.TextView.LineTransformers.Add(_colorizer);

        RightTabs.Tabs = new[] { "Play", "Testing", "Docs", "World" };
        BottomTabs.Tabs = new[] { "Problems", "Game Errors", "Log" };
        EditorTabs.Documents = new[] { "fernhill.story" };

        RightTabs.Selected += index => _ = ShowRightTabAsync(index);
        BottomTabs.Selected += _ => { };
        ProjectPane.FileSelected += path => _ = OpenAsync(path);

        LightButton.Click += (_, _) => Flip(dark: false);
        DarkButton.Click += (_, _) => Flip(dark: true);
        ProjectToggle.Click += (_, _) => ProjectPane.IsVisible = !ProjectPane.IsVisible;
        BottomToggle.Click += (_, _) => BottomPanel.IsVisible = !BottomPanel.IsVisible;

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
        var file = new NativeMenuItem("File") { Menu = new NativeMenu() };
        file.Menu!.Add(new NativeMenuItem("New Story") { Gesture = Avalonia.Input.KeyGesture.Parse("Cmd+N") });
        file.Menu.Add(new NativeMenuItem("Open…") { Gesture = Avalonia.Input.KeyGesture.Parse("Cmd+O") });
        file.Menu.Add(new NativeMenuItemSeparator());
        file.Menu.Add(new NativeMenuItem("Save") { Gesture = Avalonia.Input.KeyGesture.Parse("Cmd+S") });

        var story = new NativeMenuItem("Story") { Menu = new NativeMenu() };
        story.Menu!.Add(new NativeMenuItem("Build") { Gesture = Avalonia.Input.KeyGesture.Parse("Cmd+B") });
        story.Menu.Add(new NativeMenuItem("Run Tests") { Gesture = Avalonia.Input.KeyGesture.Parse("Cmd+U") });

        var menu = new NativeMenu();
        menu.Add(file);
        menu.Add(story);
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

            ProjectPane.Load(StoryFolder);
            _log.Line($"project pane: {ProjectPane.FileCount} file(s) from the real story folder");

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

            RightTabs.Badges = new Dictionary<int, int> { [1] = 31 };
            BottomTabs.Badges = new Dictionary<int, int> { [0] = 0 };

            await StartEditorAsync();
            await StartPanesAsync();

            await ProbeDrawingModelAsync();
            await ProbeLiveFlipAsync();
            ReportMenu();

            _log.Line("shell: done");
        }
        catch (Exception ex)
        {
            _log.Line($"shell: FAILED with {ex.GetType().Name}: {ex.Message}");
        }

        if (Environment.GetCommandLineArgs().Contains("--hold"))
        {
            // --light leaves the shell in the light palette, so the flip has a
            // second screenshot rather than only a pixel value.
            if (Environment.GetCommandLineArgs().Contains("--light")) ThemeTokens.Apply(dark: false);
            _log.Line($"shell: holding the window open (--hold), IsDark={ThemeTokens.IsDark}");
            return;
        }
        _lexer?.Dispose();
        _origin?.Stop();
        await Task.Delay(400);
        Dispatcher.UIThread.Post(Close);
    }

    private async Task StartEditorAsync()
    {
        _lexer = new ChordLexerService(VendoredNode, LexerServer);
        await _lexer.StartAsync();
        await OpenAsync(StoryFile);
        StoryTitle.Text = "The Folly at Fernhill";
        StatusText.Text = "sharpee 3.6.0 (vendored)";
        BuildPill.Text = "gate-clean";
    }

    private async Task OpenAsync(string path)
    {
        Editor.Document = new TextDocument(await File.ReadAllTextAsync(path));
        var lex = await _lexer!.LexAsync(Editor.Document.Text);
        _colorizer.Apply(lex, _lexer.Kinds, Editor.Document);
        Editor.TextArea.TextView.Redraw();
        EditorTabs.Documents = new[] { Path.GetFileName(path) };
        EditorTabs.InvalidateVisual();
        _log.Line($"editor: {Path.GetFileName(path)} — {Editor.Document.LineCount} lines, {lex.TokenCount} tokens");
    }

    private async Task StartPanesAsync()
    {
        var document = await File.ReadAllTextAsync(RepoPaths.FernhillTests);
        var session = System.Text.Json.Nodes.JsonNode.Parse("{}")!.AsObject();
        session["story"] = "fernhill";
        session["seed"] = 42;
        session["document"] = document;

        _origin = new LocalOrigin(new PaneServer(
            RepoPaths.FernhillBundle,
            RepoPaths.TestingSurface,
            RepoPaths.DocsTab,
            session.ToJsonString()));
        _origin.Start();
        await ShowRightTabAsync(0);
    }

    private async Task ShowRightTabAsync(int index)
    {
        WorldScroll.IsVisible = index == 3;
        Web.IsVisible = index != 3;
        if (index == 3 || _origin is null) return;

        var uri = index switch
        {
            1 => _origin.BaseUri(PaneServer.PlayScheme) + "index-testing.html",
            2 => _origin.BaseUri(PaneServer.DocsScheme) + "index.html",
            _ => _origin.BaseUri(PaneServer.PlayScheme) + "index.html",
        };
        Web.Navigate(new Uri(uri));
        await Task.Delay(1200);
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
        Web.IsVisible = false;
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
