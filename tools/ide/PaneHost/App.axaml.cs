using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;

namespace PaneHost;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // --editor runs Phase 3's editor harness; the default is Phase 1's pane probe.
            desktop.MainWindow = desktop.Args switch
            {
                { } args when args.Contains("--shell") => new Shell.ShellWindow(),
                { } args when args.Contains("--editor") => new Editor.EditorWindow(),
                _ => new MainWindow(),
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}