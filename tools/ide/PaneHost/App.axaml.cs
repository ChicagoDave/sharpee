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
            // THE DEFAULT IS THE APP. Every window below except the shell is an
            // evaluation harness: it runs a scripted sequence and exits. That used to be
            // the default, so an installed bundle opened a probe, ran four seconds and
            // quit — which is what a person double-clicking it actually saw. The harnesses
            // are still reachable, by name, for the evidence they produce.
            desktop.MainWindow = desktop.Args switch
            {
                { } args when args.Contains("--pane-probe") => new MainWindow(),
                { } args when args.Contains("--editor") => new Editor.EditorWindow(),
                _ => new Shell.ShellWindow(),
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}