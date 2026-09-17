// Real-path tests for the loopback origin's own HTTP layer (rule 13a).
//
// Every test drives a real socket against a real listener serving fernhill's real built
// bundle. The HTTP here is hand-written — it replaced HttpListener, which cost 35 seconds
// per open inside a packaged .app (GH #483) — so its behaviour is pinned rather than
// assumed: the token gate, HEAD, byte ranges, and the 404 a missing file must produce.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's host layer.

using System.Net;
using System.Net.Http.Headers;
using PaneHost.Hosting;

namespace PaneHost.Tests;

public sealed class LocalOriginHttpTests : IDisposable
{
    private readonly LocalOrigin _origin;

    public LocalOriginHttpTests()
    {
        _origin = new LocalOrigin(new PaneServer(
            RepoPaths.RequireDevelopmentStory(RepoPaths.FernhillBundle, "fernhill's browser bundle"),
            RepoPaths.TestingSurface,
            RepoPaths.DocsTab,
            """{"story":"fernhill","seed":42,"document":"{}","mode":"replay"}"""));
        _origin.Start();
    }

    public void Dispose() => _origin.Dispose();

    private static HttpClient Client() => new() { Timeout = TimeSpan.FromSeconds(10) };

    [Fact]
    public void start_binds_a_real_loopback_port_without_resolving_any_name()
    {
        // The port is the OS's choice rather than a scan, and the origin is reachable at it.
        Assert.InRange(_origin.Port, 1, 65535);
        Assert.StartsWith($"http://127.0.0.1:{_origin.Port}/", _origin.BaseUri(PaneServer.PlayScheme));
    }

    [Fact]
    public async Task a_tokened_request_is_served_with_its_content_type()
    {
        using var http = Client();
        var response = await http.GetAsync(_origin.BaseUri(PaneServer.PlayScheme) + "index.html");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("__sharpeeShim", body);
    }

    [Fact]
    public async Task a_missing_file_is_404_rather_than_a_dropped_connection()
    {
        using var http = Client();
        var response = await http.GetAsync(_origin.BaseUri(PaneServer.PlayScheme) + "no-such-file.js");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task head_answers_with_the_length_and_no_body()
    {
        using var http = Client();
        var get = await http.GetAsync(_origin.BaseUri(PaneServer.PlayScheme) + "index.html");
        var full = await get.Content.ReadAsByteArrayAsync();

        var head = await http.SendAsync(new HttpRequestMessage(
            HttpMethod.Head, _origin.BaseUri(PaneServer.PlayScheme) + "index.html"));

        Assert.Equal(HttpStatusCode.OK, head.StatusCode);
        Assert.Equal(full.Length, head.Content.Headers.ContentLength);
        Assert.Empty(await head.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task a_byte_range_is_answered_with_that_slice_and_206()
    {
        // Media elements ask for ranges and seek by them; answering 200 with the whole file
        // is what breaks seeking, so the slice is checked against the full bytes.
        using var http = Client();
        var full = await http.GetByteArrayAsync(_origin.BaseUri(PaneServer.PlayScheme) + "index.html");

        var request = new HttpRequestMessage(HttpMethod.Get, _origin.BaseUri(PaneServer.PlayScheme) + "index.html");
        request.Headers.Range = new RangeHeaderValue(10, 19);
        var response = await http.SendAsync(request);
        var slice = await response.Content.ReadAsByteArrayAsync();

        Assert.Equal(HttpStatusCode.PartialContent, response.StatusCode);
        Assert.Equal(10, slice.Length);
        Assert.Equal(full.Skip(10).Take(10), slice);
        Assert.Equal(full.Length, response.Content.Headers.ContentRange?.Length);
    }

    [Fact]
    public async Task an_open_ended_range_runs_to_the_end_of_the_file()
    {
        using var http = Client();
        var full = await http.GetByteArrayAsync(_origin.BaseUri(PaneServer.PlayScheme) + "index.html");

        var request = new HttpRequestMessage(HttpMethod.Get, _origin.BaseUri(PaneServer.PlayScheme) + "index.html");
        request.Headers.Range = new RangeHeaderValue(full.Length - 5, null);
        var response = await http.SendAsync(request);

        Assert.Equal(HttpStatusCode.PartialContent, response.StatusCode);
        Assert.Equal(full.Skip(full.Length - 5), await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task several_files_can_be_fetched_at_once()
    {
        // A pane loads dozens of assets; one connection at a time would serialize a page load.
        using var http = Client();
        var pages = Enumerable.Range(0, 12)
            .Select(_ => http.GetAsync(_origin.BaseUri(PaneServer.PlayScheme) + "index.html"))
            .ToArray();

        var responses = await Task.WhenAll(pages);

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
    }

    [Fact]
    public async Task every_served_request_is_recorded()
    {
        using var http = Client();
        await http.GetAsync(_origin.BaseUri(PaneServer.DocsScheme) + "index.html");

        Assert.Contains(_origin.Requests, r => r.Scheme == PaneServer.DocsScheme && r.Status == 200 && r.Bytes > 0);
    }

    [Fact]
    public async Task stopping_releases_the_port()
    {
        var uri = _origin.BaseUri(PaneServer.PlayScheme) + "index.html";
        _origin.Stop();

        using var http = Client();
        await Assert.ThrowsAnyAsync<Exception>(() => http.GetAsync(uri));
    }
}
