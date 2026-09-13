// SPIKE CODE — ADR-341 D2, Phase 3. Not product; never shipped.
using System.Windows;

namespace Adr341.WpfSpike;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        // ADR-297 D2: the pin is read and the palette applied BEFORE the window is
        // built, so startup renders in the chosen appearance instead of flashing the
        // system one. The Swift app does this in the same place.
        Theme.LoadAndApply();
        new MainWindow().Show();
    }
}
