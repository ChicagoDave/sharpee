// SPIKE CODE — ADR-341 D2, Phase 2 assumption 2. Not product; never shipped.
//
// One question: can WebView2's resource-request hook satisfy the D3 host contract
// the way WKURLSchemeHandler does on macOS today? Specifically —
//   (a) serve a directory of pane files over a custom origin,
//   (b) resolve the pane's RELATIVE urls against that origin,
//   (c) answer a request from memory (the "subprocess results" half of D3),
//   (d) persist localStorage, including across a process restart.
//
// Run it twice: pass 1 writes localStorage, pass 2 reports whether it survived.
//
// NOTE: the entry point is explicit rather than a top-level statement. WPF requires
// an STA thread and the compiler-generated Main for top-level statements carries no
// [STAThread], which fails at the first WebView2 construction.

using System.IO;
using System.Text;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

internal static class Probe
{
    private const string Origin = "https://pane.chordwriter.invalid";

    [STAThread]
    internal static int Main(string[] args)
    {
        var pass = args.Length > 0 && args[0] == "2" ? 2 : 1;
        var paneDir = Path.Combine(AppContext.BaseDirectory, "pane");
        // A FIXED user data folder — the whole point of pass 2 is that state outlives
        // the process, and a temp folder per run would quietly guarantee the opposite.
        var userData = Path.Combine(Path.GetTempPath(), "adr341-webview2-check-udf");

        Console.WriteLine($"pass        : {pass}");
        Console.WriteLine($"pane dir    : {paneDir}  (exists: {Directory.Exists(paneDir)})");
        Console.WriteLine($"user data   : {userData}");
        Console.WriteLine($"origin      : {Origin}");

        var app = new Application { ShutdownMode = ShutdownMode.OnExplicitShutdown };
        var exitCode = 1;

        app.Startup += async (_, _) =>
        {
            var web = new WebView2();
            var window = new Window
            {
                Title = "ADR-341 WebView2 probe",
                Width = 700,
                Height = 420,
                Content = web,
                // Visible on purpose: a hidden window can suppress rendering work,
                // and this check is about what a real hosted pane gets.
                WindowStartupLocation = WindowStartupLocation.CenterScreen
            };
            window.Show();

            try
            {
                var env = await CoreWebView2Environment.CreateAsync(null, userData);
                await web.EnsureCoreWebView2Async(env);
                var core = web.CoreWebView2;

                Console.WriteLine($"runtime ver : {env.BrowserVersionString}");

                await core.AddScriptToExecuteOnDocumentCreatedAsync($"window.__pass = {pass};");

                // THE HOOK. This is the WKURLSchemeHandler counterpart.
                core.AddWebResourceRequestedFilter($"{Origin}/*", CoreWebView2WebResourceContext.All);
                core.WebResourceRequested += (_, e) =>
                {
                    var uri = new Uri(e.Request.Uri);
                    var path = uri.AbsolutePath.TrimStart('/');
                    Console.WriteLine($"  [hook] {e.Request.Method} {uri.AbsolutePath}");

                    // (c) A request answered from memory, never touching disk.
                    if (path == "api/subprocess-result.json")
                    {
                        var body = """{"verb":"build","exitCode":0,"stdout":"ok"}""";
                        e.Response = env.CreateWebResourceResponse(
                            new MemoryStream(Encoding.UTF8.GetBytes(body)),
                            200, "OK", "Content-Type: application/json");
                        return;
                    }

                    // (a) + (b) Files served from a directory, relative urls included.
                    var file = Path.Combine(paneDir, path.Length == 0 ? "index.html" : path);
                    if (File.Exists(file))
                    {
                        var mime = Path.GetExtension(file) switch
                        {
                            ".html" => "text/html",
                            ".js" => "text/javascript",
                            ".css" => "text/css",
                            _ => "application/octet-stream"
                        };
                        e.Response = env.CreateWebResourceResponse(
                            new MemoryStream(File.ReadAllBytes(file)),
                            200, "OK", $"Content-Type: {mime}");
                        return;
                    }

                    e.Response = env.CreateWebResourceResponse(null, 404, "Not Found", "");
                };

                core.WebMessageReceived += (_, e) =>
                {
                    var json = e.TryGetWebMessageAsString() ?? "";
                    Console.WriteLine("\n===== pane reported =====");
                    Console.WriteLine(json);

                    bool Has(string key, string val) => json.Contains($"\"{key}\":{val}");
                    var ok = Has("cssApplied", "true")
                          && Has("scriptLoaded", "true")
                          && Has("dynamicFetch", "true")
                          && Has("storageWorks", "true");

                    Console.WriteLine($"\ncss applied (relative)  : {Has("cssApplied", "true")}");
                    Console.WriteLine($"script loaded (relative): {Has("scriptLoaded", "true")}");
                    Console.WriteLine($"dynamic fetch (memory)  : {Has("dynamicFetch", "true")}");
                    Console.WriteLine($"localStorage works      : {Has("storageWorks", "true")}");
                    Console.WriteLine($"RESULT (pass {pass})        : {(ok ? "PASS" : "FAIL")}");

                    exitCode = ok ? 0 : 1;
                    app.Shutdown();
                };

                core.Navigate($"{Origin}/index.html");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"RESULT      : FAILED — {ex.GetType().Name}: {ex.Message}");
                app.Shutdown();
            }
        };

        // Never hang a spike on a window that failed to report.
        var timeout = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromSeconds(30) };
        timeout.Tick += (_, _) =>
        {
            Console.WriteLine("RESULT      : TIMEOUT — pane never reported");
            app.Shutdown();
        };
        timeout.Start();

        app.Run();
        Console.WriteLine($"exit        : {exitCode}");
        return exitCode;
    }
}
