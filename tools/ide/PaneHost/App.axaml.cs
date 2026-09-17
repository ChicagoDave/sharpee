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
            // The host the shell runs its toolchain commands through. Without this the
            // default host carries no toolchain root, so `ToolchainShim` is null and Build,
            // Check and Run Tests can only report that they cannot run — which is what an
            // installed app did until 2026-09-17 (GH #482). In a bundle the root is
            // Contents/Resources/toolchain; in a checkout it is SHARPEE_IDE_TOOLCHAIN.
            Hosting.HostServices.Current = new Hosting.NativeHostServices(Hosting.RepoPaths.ToolchainRoot);

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