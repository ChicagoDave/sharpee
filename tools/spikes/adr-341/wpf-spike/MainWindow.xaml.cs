// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
//
// Wires the six spike items into one window so the felt judgment (D2: "how it
// felt") is made against the whole shell rather than six toy apps.
//
// The editor is a real document set, not a drawn tab strip: the parity table's
// editor row names "open in tabs, switch, close, save, save all, reload from disk,
// unsaved-change tracking" and the project-tree row names "selection, double-click,
// keyboard navigation", so those behaviours are wired rather than mocked.

using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;

namespace Adr341.WpfSpike;

public partial class MainWindow : Window
{
    public static readonly RoutedCommand SaveCmd = new();
    public static readonly RoutedCommand SaveAllCmd = new();
    public static readonly RoutedCommand CloseTabCmd = new();
    public static readonly RoutedCommand ReloadCmd = new();

    private const string Origin = "https://pane.chordwriter.invalid";
    private static readonly string RepoRoot = FindRepoRoot();

    private readonly DocumentSet _docs = new();
    private bool _switching;

    public MainWindow()
    {
        InitializeComponent();
        SetUpCommands();
        SetUpEditor();
        SetUpTree();
        SetUpTabs();
        SetUpMap();
        _ = SetUpWebAsync();
        SyncAppearanceMenu();
        Theme.Changed += SyncAppearanceMenu;
        // The DWM call needs a real HWND, which does not exist until now.
        SourceInitialized += (_, _) => ApplyDarkTitleBar();
        OpenInitialDocuments();
    }

    private void SetUpCommands()
    {
        CommandBindings.Add(new CommandBinding(SaveCmd, (_, _) => SaveActive()));
        CommandBindings.Add(new CommandBinding(SaveAllCmd, (_, _) => SaveAll()));
        CommandBindings.Add(new CommandBinding(CloseTabCmd, (_, _) => _docs.Close(_docs.ActiveIndex)));
        CommandBindings.Add(new CommandBinding(ReloadCmd, (_, _) => ReloadActive()));
    }

    // ---------- 1. the editor ----------
    private void SetUpEditor()
    {
        EditorWiring.Install(Editor);
        Editor.Options.ConvertTabsToSpaces = true;
        Editor.Options.IndentationSize = 2;
        Editor.Options.HighlightCurrentLine = true;

        _docs.Changed += SyncEditor;

        // Dirty state has to reach the tab strip, so the unsaved dot is real.
        Editor.TextChanged += (_, _) => { if (!_switching) { SyncTabs(); UpdatePerf(); } };
    }

    private void OpenInitialDocuments()
    {
        // Real repository files: scrolling and typing feel are only meaningful at
        // realistic length and token density.
        string[] candidates =
        [
            Path.Combine(RepoRoot, "packages", "engine", "src", "game-engine.ts"),
            Path.Combine(RepoRoot, "packages", "if-domain", "src", "endings.ts"),
        ];
        foreach (var c in candidates.Where(File.Exists)) _docs.Open(c);
        if (_docs.Documents.Count == 0) Status.Text = "no sample files found under " + RepoRoot;
    }

    /// <summary>Swap the visible document, preserving each tab's caret and scroll.</summary>
    private void SyncEditor()
    {
        _switching = true;
        try
        {
            var active = _docs.Active;

            // Stash the outgoing tab's position before swapping documents.
            foreach (var d in _docs.Documents)
                if (ReferenceEquals(d.Document, Editor.Document))
                {
                    d.CaretOffset = Editor.CaretOffset;
                    d.ScrollOffset = Editor.VerticalOffset;
                }

            Editor.TextArea.TextView.LineTransformers.Clear();

            if (active is null)
            {
                Editor.Document = new ICSharpCode.AvalonEdit.Document.TextDocument("");
                Editor.IsEnabled = false;
            }
            else
            {
                Editor.IsEnabled = true;
                Editor.Document = active.Document;
                // MUST be null-guarded. A file with no tree-sitter grammar (Chord, for
                // one) has no highlighter, and AvalonEdit dereferences every entry in
                // this collection during layout — so adding null crashes the app on the
                // next repaint, not at the call site. Cost a crash on 2026-09-11.
                if (active.Highlighter is { } h)
                    Editor.TextArea.TextView.LineTransformers.Add(h);
                Editor.CaretOffset = Math.Min(active.CaretOffset, active.Document.TextLength);
                Editor.ScrollToVerticalOffset(active.ScrollOffset);
            }
        }
        finally { _switching = false; }

        SyncTabs();
        UpdatePerf();
    }

    private void SyncTabs()
    {
        EditorTabs.Items = _docs.Documents
            .Select(d => new TabItemModel(d.Name, Closeable: true, Dirty: d.IsDirty))
            .ToList();
        EditorTabs.SelectedIndex = _docs.ActiveIndex;
        EditorTabs.InvalidateVisual();
        Title = _docs.Active is { } a
            ? $"ADR-341 — WPF spike — {a.Name}{(a.IsDirty ? " •" : "")}"
            : "ADR-341 — WPF spike";
    }

    private void UpdatePerf()
    {
        var a = _docs.Active;
        Perf.Text = a is null ? "no document" : $"{a.Document.LineCount} lines · {a.GrammarNote}";
    }

    private void SaveActive()
    {
        if (_docs.Active is not { } a) return;
        a.Save();
        SyncTabs();
        Status.Text = $"saved {a.Path}";
    }

    private void SaveAll()
    {
        var n = _docs.SaveAll();
        Status.Text = n == 0 ? "nothing to save" : $"saved {n} file(s)";
    }

    private void ReloadActive()
    {
        if (_docs.Active is not { } a) return;
        var wasDirty = a.IsDirty;
        a.Reload();
        SyncTabs();
        UpdatePerf();
        Status.Text = wasDirty
            ? $"reloaded {a.Name} from disk — in-memory edits discarded"
            : $"reloaded {a.Name} from disk";
    }

    private void Save_Click(object s, RoutedEventArgs e) => SaveActive();
    private void SaveAll_Click(object s, RoutedEventArgs e) => SaveAll();
    private void Reload_Click(object s, RoutedEventArgs e) => ReloadActive();
    private void CloseTab_Click(object s, RoutedEventArgs e) => _docs.Close(_docs.ActiveIndex);

    // ---------- 3. the project tree ----------
    private void SetUpTree()
    {
        var storiesRoot = Path.Combine(RepoRoot, "stories");
        var root = new TreeViewItem { Header = "stories", IsExpanded = true, Tag = storiesRoot };
        if (Directory.Exists(storiesRoot))
            foreach (var dir in Directory.GetDirectories(storiesRoot).Take(8))
                root.Items.Add(BuildNode(dir, 2));
        Tree.Items.Add(root);
    }

    private TreeViewItem BuildNode(string path, int depth)
    {
        // The foreground MUST be set explicitly. WPF's stock TreeViewItem template
        // hardcodes a near-black foreground rather than inheriting, so under the dark
        // palette an unstyled tree renders invisible-on-invisible — which looks like
        // an empty pane, not like a styling bug. (Found the hard way, 2026-09-11.)
        var node = new TreeViewItem
        {
            Header = Path.GetFileName(path),
            Tag = path,
            Foreground = Theme.Brush("Foreground")
        };
        if (depth <= 0) return node;
        try
        {
            foreach (var d in Directory.GetDirectories(path).Take(12)) node.Items.Add(BuildNode(d, depth - 1));
            foreach (var f in Directory.GetFiles(path).Take(24))
                node.Items.Add(new TreeViewItem
                {
                    Header = Path.GetFileName(f),
                    Tag = f,
                    Foreground = Theme.Brush("Foreground")
                });
        }
        catch (UnauthorizedAccessException) { /* spike: a locked folder is not a finding */ }
        return node;
    }

    /// <summary>Re-push the foreground onto every node when the palette flips.</summary>
    private static void RepaintTree(ItemCollection items)
    {
        foreach (TreeViewItem n in items)
        {
            n.Foreground = Theme.Brush("Foreground");
            RepaintTree(n.Items);
        }
    }

    private void Tree_SelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e)
    {
        if (e.NewValue is TreeViewItem { Tag: string path }) Status.Text = path;
    }

    private void Tree_DoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (Tree.SelectedItem is TreeViewItem { Tag: string path } && File.Exists(path))
        {
            _docs.Open(path);
            Editor.Focus();
            e.Handled = true;
        }
    }

    /// <summary>Enter opens the selection; arrows are TreeView's own navigation.</summary>
    private void Tree_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter) return;
        if (Tree.SelectedItem is TreeViewItem { Tag: string path } && File.Exists(path))
        {
            _docs.Open(path);
            Editor.Focus();
            e.Handled = true;
        }
    }

    // ---------- 5. the tab strip ----------
    private void SetUpTabs()
    {
        EditorTabs.SelectionChanged += i => _docs.Activate(i);
        EditorTabs.CloseRequested += i => _docs.Close(i);

        DockTabs.Items = [new("Problems", 3), new("Game Errors", 0)];
        RightTabs.Items =
        [
            new("Build"), new("Play"), new("Testing", 12), new("Index"),
            new("Diagnosis"), new("Documentation"), new("Publish"), new("World")
        ];
        RightTabs.SelectionChanged += i =>
        {
            var world = RightTabs.Items[i].Title == "World";
            Map.Visibility = world ? Visibility.Visible : Visibility.Collapsed;
            Web.Visibility = world ? Visibility.Collapsed : Visibility.Visible;
            Status.Text = $"right panel → {RightTabs.Items[i].Title}";
        };
    }

    // ---------- the rail ----------
    private void Rail_Project(object s, RoutedEventArgs e) => ToggleProjectPane();

    private double _projectPaneWidth = 230;

    private void ToggleProjectPane()
    {
        var grid = (Grid)ProjectPane.Parent;
        var paneCol = grid.ColumnDefinitions[1];
        var splitterCol = grid.ColumnDefinitions[2];
        var hidden = ProjectPane.Visibility != Visibility.Visible;

        if (hidden)
        {
            paneCol.MinWidth = 140;
            paneCol.Width = new GridLength(_projectPaneWidth);
            splitterCol.Width = new GridLength(4);
            ProjectPane.Visibility = Visibility.Visible;
            ProjectSplitter.Visibility = Visibility.Visible;
        }
        else
        {
            // Remember the author's width so re-showing restores it rather than
            // snapping back to the default.
            _projectPaneWidth = paneCol.ActualWidth > 0 ? paneCol.ActualWidth : _projectPaneWidth;
            // MinWidth has to go to zero first — it wins over Width, which is why a
            // naive Width=0 leaves a sliver. The splitter is its own column and must
            // collapse with the pane, or 4px of border survives the collapse.
            paneCol.MinWidth = 0;
            paneCol.Width = new GridLength(0);
            splitterCol.Width = new GridLength(0);
            ProjectPane.Visibility = Visibility.Collapsed;
            ProjectSplitter.Visibility = Visibility.Collapsed;
        }
        Status.Text = hidden ? "project pane shown" : "project pane hidden";
    }

    private void Rail_Play(object s, RoutedEventArgs e)
    {
        var i = RightTabs.Items.ToList().FindIndex(t => t.Title == "Play");
        if (i < 0) return;
        RightTabs.SelectedIndex = i;
        RightTabs.InvalidateVisual();
        Map.Visibility = Visibility.Collapsed;
        Web.Visibility = Visibility.Visible;
        Status.Text = "right panel → Play";
    }

    private void Rail_Problems(object s, RoutedEventArgs e) => ToggleDock();

    // ---------- 6. the World map ----------
    private void SetUpMap()
    {
        Map.Rooms =
        [
            new("West of House", 0, 0), new("North of House", 1, 0), new("Behind House", 2, 0),
            new("Kitchen", 2, 1), new("Living Room", 1, 1), new("Cellar", 1, 2, Reached: false),
            new("Attic", 3, 1, Displaced: true),
        ];
        Map.Links =
        [
            new(0, 1), new(1, 2), new(2, 3, Door: true), new(3, 4),
            new(4, 5, Sealed_: true), new(3, 6, Door: true),
        ];
    }

    // ---------- 2. WebView2 pane hosting ----------
    private async Task SetUpWebAsync()
    {
        try
        {
            var udf = Path.Combine(Path.GetTempPath(), "adr341-wpf-spike-udf");
            var env = await CoreWebView2Environment.CreateAsync(null, udf);
            await Web.EnsureCoreWebView2Async(env);
            var core = Web.CoreWebView2;

            var paneDir = Path.Combine(AppContext.BaseDirectory, "pane");
            core.AddWebResourceRequestedFilter($"{Origin}/*", CoreWebView2WebResourceContext.All);
            core.WebResourceRequested += (_, e) =>
            {
                var path = new Uri(e.Request.Uri).AbsolutePath.TrimStart('/');
                var file = Path.Combine(paneDir, path.Length == 0 ? "index.html" : path);
                if (File.Exists(file))
                {
                    var mime = Path.GetExtension(file) switch
                    {
                        ".html" => "text/html",
                        ".js" => "text/javascript",
                        ".css" => "text/css",
                        ".json" => "application/json",
                        _ => "application/octet-stream"
                    };
                    e.Response = env.CreateWebResourceResponse(
                        new MemoryStream(File.ReadAllBytes(file)), 200, "OK", $"Content-Type: {mime}");
                }
                else
                {
                    e.Response = env.CreateWebResourceResponse(null, 404, "Not Found", "");
                }
            };

            // External-link interception — the Documentation pane's rule (ADR-281 D3):
            // links to the real web open in the real browser, never inside the pane.
            core.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                Status.Text = $"external link intercepted: {e.Uri}";
            };

            // The pane talks back; the Testing pane's two-way channel in miniature.
            core.WebMessageReceived += (_, e) => Status.Text = $"pane → host: {e.TryGetWebMessageAsString()}";

            // ADR-297 D3 across the WebView boundary: stamp the appearance BEFORE first
            // paint so the pane never flashes the wrong palette, then push on every flip.
            await core.AddScriptToExecuteOnDocumentCreatedAsync(
                $"window.__appearance = '{(Theme.IsDark ? "dark" : "light")}';");

            core.Navigate($"{Origin}/index.html");
            PushAppearanceToPane();
        }
        catch (Exception ex)
        {
            Status.Text = $"WebView2 failed: {ex.Message}";
        }
    }

    // ---------- ADR-297 appearance pin ----------
    private void Appearance_Click(object sender, RoutedEventArgs e)
    {
        if (sender is MenuItem { Tag: string tag } && Enum.TryParse(tag, out Appearance a))
            Theme.Preference = a;
    }

    private void SyncAppearanceMenu()
    {
        ApSystem.IsChecked = Theme.Preference == Appearance.System;
        ApLight.IsChecked = Theme.Preference == Appearance.Light;
        ApDark.IsChecked = Theme.Preference == Appearance.Dark;

        Editor.Foreground = Theme.Brush("Foreground");
        Editor.TextArea.Caret.CaretBrush = Theme.Brush("Foreground");
        Editor.TextArea.TextView.Redraw();

        // Stock WPF templates hardcode their foreground instead of inheriting, so the
        // tree has to be re-pushed on every flip.
        if (Tree is not null) RepaintTree(Tree.Items);

        // ADR-297 D3: appearance is app-wide, and that has to cross the WebView
        // boundary — a pane painting its own fixed colours is the D3 host contract
        // failing, not a pane preference. The host pushes; the pane reacts.
        PushAppearanceToPane();

        // Windows does not theme the non-client area with the client area; macOS gets
        // this free from NSApp.appearance.
        ApplyDarkTitleBar();
    }

    private void PushAppearanceToPane()
    {
        try
        {
            Web?.CoreWebView2?.PostWebMessageAsString(Theme.IsDark ? "appearance:dark" : "appearance:light");
        }
        catch (InvalidOperationException) { /* WebView2 not initialised yet */ }
    }

    [System.Runtime.InteropServices.DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

    private void ApplyDarkTitleBar()
    {
        var hwnd = new System.Windows.Interop.WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;
        var on = Theme.IsDark ? 1 : 0;
        const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
        DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ref on, sizeof(int));
    }

    private void Wrap_Click(object sender, RoutedEventArgs e) => Editor.WordWrap = WrapItem.IsChecked;

    private void ToggleDock_Click(object sender, RoutedEventArgs e) => ToggleDock();

    private void ToggleDock() =>
        Dock.Visibility = Dock.Visibility == Visibility.Visible ? Visibility.Collapsed : Visibility.Visible;

    /// <summary>Diagnostic navigation: select a span arriving from outside and scroll to it.</summary>
    private void GoToSpan_Click(object sender, RoutedEventArgs e)
    {
        if (_docs.Active is null) return;
        var line = Math.Min(220, Editor.Document.LineCount);
        var l = Editor.Document.GetLineByNumber(line);
        Editor.Select(l.Offset, l.Length);
        Editor.ScrollToLine(line);
        Editor.Focus();
        Status.Text = $"navigated to line {line} (a compose diagnostic's span)";
    }

    /// <summary>The World tab's fixes go through the editor's undo stack, not the file.</summary>
    private void Replace_Click(object sender, RoutedEventArgs e)
    {
        if (_docs.Active is null) return;
        var doc = Editor.Document;
        using (doc.RunUpdate())
        {
            var l = doc.GetLineByNumber(1);
            doc.Replace(l.Offset, l.Length, "// replaced programmatically - one Ctrl+Z undoes this");
        }
        Status.Text = "programmatic replace applied - Ctrl+Z should undo it as one unit";
    }

    private static string FindRepoRoot()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d is not null && !Directory.Exists(Path.Combine(d.FullName, ".git"))) d = d.Parent;
        return d?.FullName ?? AppContext.BaseDirectory;
    }
}
