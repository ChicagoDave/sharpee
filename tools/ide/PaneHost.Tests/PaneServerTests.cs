// Real-path tests for the Avalonia pane host (rule 13a).
//
// Every test reads fernhill's real built bundle and the IDE's real checked-in
// pane assets, and the origin tests drive a real HttpListener over real HTTP on
// loopback. Nothing here stubs PaneServer, the filesystem, or the transport.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head. Ported from the O6
// evaluation spike 2026-09-16; the evidence for its shape is that evaluation's record.

using System.Net;
using System.Text;
using PaneHost.Hosting;

namespace PaneHost.Tests;

public class PaneServerTests
{
    private static PaneServer Build() => new(
        RepoPaths.FernhillBundle,
        RepoPaths.TestingSurface,
        RepoPaths.DocsTab,
        """{"story":"fernhill","seed":42,"document":"{}","mode":"replay"}""");

    private static string Text(PaneResponse r) => Encoding.UTF8.GetString(r.Body);

    [Fact]
    public void serves_the_players_index_with_the_shim_injected_after_head()
    {
        var r = Build().Resolve(PaneServer.PlayScheme, "sharpee-play://app/index.html");

        Assert.Equal(200, r.Status);
        Assert.Equal("text/html; charset=utf-8", r.ContentType);
        var html = Text(r);
        var shimAt = html.IndexOf("__sharpeeShim", StringComparison.Ordinal);
        var gameAt = html.IndexOf("game.js", StringComparison.Ordinal);
        Assert.True(shimAt > 0, "shim not injected");
        Assert.True(gameAt > 0, "page is not the real bundle (no game.js)");
        Assert.True(shimAt < gameAt, "shim must be injected before the client script");
    }

    [Fact]
    public void serves_the_testing_page_with_shim_boot_session_and_asset_loader()
    {
        var r = Build().Resolve(PaneServer.PlayScheme, "sharpee-play://app/index-testing.html");

        Assert.Equal(200, r.Status);
        var html = Text(r);
        Assert.Contains("__SHARPEE_TESTING_SESSION__", html);
        Assert.Contains("\"seed\":42", html);
        Assert.Contains(PaneServer.TestingSurfacePrefix + "surface.js", html);
        Assert.Contains(PaneServer.TestingSurfacePrefix + "surface.css", html);
        // The page the repository actually ships, not a fixture: its own anchor contract survives injection.
        Assert.Contains("command-input", html);
    }

    [Fact]
    public void serves_the_surfaces_own_assets_under_the_reserved_prefix()
    {
        var panes = Build();

        var js = panes.Resolve(PaneServer.PlayScheme, $"sharpee-play://app/{PaneServer.TestingSurfacePrefix}surface.js");
        var css = panes.Resolve(PaneServer.PlayScheme, $"sharpee-play://app/{PaneServer.TestingSurfacePrefix}surface.css");

        Assert.Equal(200, js.Status);
        Assert.Equal("text/javascript; charset=utf-8", js.ContentType);
        Assert.Equal(new FileInfo(Path.Combine(RepoPaths.TestingSurface, "surface.js")).Length, js.Body.Length);
        Assert.Equal(200, css.Status);
        Assert.Equal("text/css; charset=utf-8", css.ContentType);
    }

    [Fact]
    public void serves_the_docs_page_and_its_corpus_index()
    {
        var panes = Build();

        var page = panes.Resolve(PaneServer.DocsScheme, "sharpee-docs://app/index.html");
        var index = panes.Resolve(PaneServer.DocsScheme, "sharpee-docs://app/docs-index.json");

        Assert.Equal(200, page.Status);
        Assert.Contains("__sharpeeShim", Text(page));
        Assert.Equal(200, index.Status);
        Assert.Equal("application/json; charset=utf-8", index.ContentType);
        Assert.True(index.Body.Length > 100_000, $"docs corpus looks truncated: {index.Body.Length} bytes");
    }

    [Fact]
    public void refuses_traversal_unknown_files_and_unknown_schemes()
    {
        var panes = Build();

        Assert.Equal(404, panes.Resolve(PaneServer.PlayScheme, "sharpee-play://app/../../fernhill.story").Status);
        Assert.Equal(404, panes.Resolve(PaneServer.PlayScheme, "sharpee-play://app/nope.js").Status);
        Assert.Equal(404, panes.Resolve("sharpee-nonsense", "sharpee-nonsense://app/index.html").Status);
    }

    [Theory]
    [InlineData("sharpee-play://app/a/b.css?x=1#y", "a/b.css")]
    [InlineData("sharpee-play://app/", "index.html")]
    [InlineData("sharpee-play://app", "index.html")]
    public void relative_path_strips_scheme_host_and_query(string url, string expected) =>
        Assert.Equal(expected, PaneServer.RelativePath(url));
}

public class LocalOriginTests
{
    private static PaneServer Panes() => new(
        RepoPaths.FernhillBundle,
        RepoPaths.TestingSurface,
        RepoPaths.DocsTab,
        """{"story":"fernhill","seed":42,"document":"{}","mode":"replay"}""");

    [Fact]
    public async Task serves_the_real_bundle_over_real_http_and_records_each_request()
    {
        using var origin = new LocalOrigin(Panes());
        origin.Start();
        Assert.NotEqual(0, origin.Port);

        using var http = new HttpClient();
        var page = await http.GetAsync(origin.BaseUri(PaneServer.PlayScheme) + "index-testing.html");
        var body = await page.Content.ReadAsStringAsync();
        var surface = await http.GetAsync(origin.BaseUri(PaneServer.PlayScheme) + PaneServer.TestingSurfacePrefix + "surface.js");

        Assert.Equal(HttpStatusCode.OK, page.StatusCode);
        Assert.Contains("__SHARPEE_TESTING_SESSION__", body);
        Assert.Equal(HttpStatusCode.OK, surface.StatusCode);

        var log = origin.Requests;
        Assert.Equal(2, log.Count);
        Assert.All(log, r => Assert.Equal(200, r.Status));
        Assert.Contains(log, r => r.Path == "index-testing.html");
        Assert.Contains(log, r => r.Path.EndsWith("surface.js", StringComparison.Ordinal));
    }

    [Fact]
    public async Task refuses_a_request_that_does_not_carry_this_runs_token()
    {
        using var origin = new LocalOrigin(Panes());
        origin.Start();

        using var http = new HttpClient();
        var wrong = await http.GetAsync($"http://127.0.0.1:{origin.Port}/not-the-token/{PaneServer.PlayScheme}/index.html");
        var bare = await http.GetAsync($"http://127.0.0.1:{origin.Port}/");

        Assert.Equal(HttpStatusCode.Forbidden, wrong.StatusCode);
        Assert.Equal("forbidden", await wrong.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Forbidden, bare.StatusCode);
        Assert.All(origin.Requests, r => Assert.Equal(403, r.Status));
        Assert.All(origin.Requests, r => Assert.Equal("-", r.Scheme));
    }

    [Fact]
    public async Task two_origins_bind_different_ports_and_do_not_accept_each_others_tokens()
    {
        using var a = new LocalOrigin(Panes());
        using var b = new LocalOrigin(Panes());
        a.Start();
        b.Start();

        Assert.NotEqual(a.Port, b.Port);

        using var http = new HttpClient();
        var crossed = await http.GetAsync($"http://127.0.0.1:{b.Port}/{a.Token}/{PaneServer.PlayScheme}/index.html");

        Assert.Equal(HttpStatusCode.Forbidden, crossed.StatusCode);
    }
}
