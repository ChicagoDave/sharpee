// SPIKE CODE — ADR-341 D2, Phase 4. Not product; never shipped.
using Microsoft.UI.Xaml;

namespace Adr341.WinUi3Spike;

public partial class App : Application
{
    private Window? _window;

    public App() => InitializeComponent();

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        _window = new MainWindow();
        _window.Activate();
    }
}
