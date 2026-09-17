// Real-path tests for the pane door contract (rule 13a).
//
// The door is driven as the shell drives it — Open, PaneUri, Dispose — over a real
// HttpListener on loopback, serving fernhill's real built bundle and the IDE's real
// checked-in pane assets. Nothing is stubbed.
//
// WHAT THESE DO NOT COVER, deliberately: Configure(NativeWebView) and the messaging
// pair it wires. Both need a constructed Avalonia view and therefore a running
// application, so they belong to Phase 4's exit-state run — the real panes in a real
// view with both directions proven — not to a headless suite. A fake view here would
// assert that a stand-in works, which is the one thing rule 13a says a test may not do.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using System.Net;
using PaneHost.Hosting;

namespace PaneHost.Tests;

public class PaneDoorTests
{
    private static PaneServer Panes() => new(
        RepoPaths.RequireDevelopmentStory(RepoPaths.FernhillBundle, "fernhill's browser bundle"),
        RepoPaths.TestingSurface,
        RepoPaths.DocsTab,
        """{"story":"fernhill","seed":42,"document":"{}","mode":"replay"}""");

    [Fact]
    public async Task an_open_door_serves_the_real_panes_with_the_host_shim_injected()
    {
        using var door = new LoopbackPaneDoor();
        Assert.False(door.IsOpen);

        door.Open(Panes());

        Assert.True(door.IsOpen);
        Assert.Contains("loopback", door.Mechanism, StringComparison.OrdinalIgnoreCase);

        using var http = new HttpClient();
        var play = await http.GetAsync(door.PaneUri(PaneServer.PlayScheme, "index-testing.html"));
        var body = await play.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, play.StatusCode);
        // The shim is what makes a pane portable across backends, so a pane served
        // without it is served wrong even though it is served successfully.
        Assert.Contains("__sharpeeShim", body);
        Assert.Contains(PaneServer.HostHandlerName, body);

        var docs = await http.GetAsync(door.PaneUri(PaneServer.DocsScheme, "index.html"));
        Assert.Equal(HttpStatusCode.OK, docs.StatusCode);
    }

    [Fact]
    public void a_closed_door_has_no_pane_uri_to_give()
    {
        using var door = new LoopbackPaneDoor();
        var error = Assert.Throws<InvalidOperationException>(
            () => door.PaneUri(PaneServer.PlayScheme, "index.html"));
        Assert.Contains("not open", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void opening_an_open_door_is_refused_rather_than_orphaning_the_first_listener()
    {
        using var door = new LoopbackPaneDoor();
        door.Open(Panes());

        var error = Assert.Throws<InvalidOperationException>(() => door.Open(Panes()));
        Assert.Contains("already open", error.Message, StringComparison.OrdinalIgnoreCase);
        Assert.True(door.IsOpen);
    }

    [Fact]
    public async Task disposing_the_door_stops_serving()
    {
        var door = new LoopbackPaneDoor();
        door.Open(Panes());
        var uri = door.PaneUri(PaneServer.PlayScheme, "index.html");

        door.Dispose();

        Assert.False(door.IsOpen);
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        await Assert.ThrowsAnyAsync<Exception>(() => http.GetAsync(uri));
    }
}
