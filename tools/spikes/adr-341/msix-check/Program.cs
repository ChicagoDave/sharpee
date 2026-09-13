// SPIKE CODE — ADR-341 D2, Phase 5 (the D7 packaging check). Not product.
//
// Two questions, both about whether MSIX's packaged filesystem is compatible with how
// Chord Writer actually works:
//
//   (a) Does a VENDORED NODE run from inside the packaged app's install location?
//       ADR-341 D6 accepts vendoring a Node toolchain as the price of a native mirror;
//       the macOS app ships 171M of the installed 187M that way. MSIX installs into
//       C:\Program Files\WindowsApps, which is ACL-locked and has historically been
//       hostile to executing bundled binaries.
//
//   (b) Can the app read and write Documents\<Story Title>\ — ADR-280's real folders,
//       as amended A1 — from inside MSIX's virtualized filesystem? The macOS app is
//       sandboxless and treats the project folder as an ordinary directory. If MSIX
//       redirects or refuses those writes, ADR-280's project model does not survive
//       packaging as-is, and D7's installer choice is decided by that.
//
// Writes a report rather than printing: a packaged app has no console attached.

using System.Diagnostics;
using System.Text;

var report = new StringBuilder();
void Say(string s) { report.AppendLine(s); Console.WriteLine(s); }

Say($"ADR-341 Phase 5 — MSIX packaging check");
Say($"utc          : {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}Z");
Say($"baseDir      : {AppContext.BaseDirectory}");

// Is this actually running packaged? A check that silently ran unpackaged would
// answer nothing, so establish it before anything else.
var packaged = false;
string identity = "(none — running UNPACKAGED)";
try
{
    var pkg = Windows.ApplicationModel.Package.Current;
    identity = $"{pkg.Id.FamilyName} {pkg.Id.Version.Major}.{pkg.Id.Version.Minor}";
    packaged = true;
}
catch (Exception ex)
{
    identity = $"(none — {ex.GetType().Name})";
}
Say($"packaged     : {packaged}");
Say($"identity     : {identity}");
Say($"installedLoc : {(packaged ? Windows.ApplicationModel.Package.Current.InstalledLocation.Path : "n/a")}");

// ---- (a) the vendored Node -------------------------------------------------
Say("");
Say("=== (a) vendored Node from inside the package ===");
var node = Path.Combine(AppContext.BaseDirectory, "vendor", "node.exe");
Say($"node path    : {node}");
Say($"exists       : {File.Exists(node)}");
if (File.Exists(node))
{
    try
    {
        var fi = new FileInfo(node);
        Say($"size         : {fi.Length / 1024.0 / 1024.0:F1} MB");

        var psi = new ProcessStartInfo(node, "-e \"console.log(JSON.stringify({v:process.version,arch:process.arch,cwd:process.cwd()}))\"")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        using var p = Process.Start(psi)!;
        var stdout = p.StandardOutput.ReadToEnd().Trim();
        var stderr = p.StandardError.ReadToEnd().Trim();
        p.WaitForExit(30000);
        Say($"exitCode     : {p.ExitCode}");
        Say($"stdout       : {stdout}");
        if (stderr.Length > 0) Say($"stderr       : {stderr}");
        Say($"RESULT (a)   : {(p.ExitCode == 0 && stdout.Contains("v22.") ? "PASS — vendored Node executes from the packaged install location" : "FAIL")}");
    }
    catch (Exception ex)
    {
        Say($"RESULT (a)   : FAIL — {ex.GetType().Name}: {ex.Message}");
    }
}
else
{
    Say("RESULT (a)   : FAIL — node.exe not present in the package payload");
}

// ---- (b) ADR-280's real project folders -------------------------------------
Say("");
Say("=== (b) Documents\\<Story Title>\\ under the packaged filesystem ===");
try
{
    var docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
    Say($"Documents    : {docs}");

    var project = Path.Combine(docs, "ADR-341 Spike Story");
    Directory.CreateDirectory(project);
    Say($"projectDir   : {project}");

    var file = Path.Combine(project, "story.chord");
    var payload = $"# written by the packaged spike at {DateTime.UtcNow:O}";
    File.WriteAllText(file, payload);
    var readBack = File.ReadAllText(file);
    Say($"wrote+read   : {(readBack == payload ? "OK" : "MISMATCH")}");

    // The question that actually matters: is the file where it claims to be, or did
    // MSIX silently redirect it into the package's private write-location? A redirect
    // reads as success from inside the app and as "my story folder is empty" to the
    // author looking at Documents in Explorer.
    var real = new FileInfo(file).FullName;
    Say($"resolvedPath : {real}");
    var redirected = real.Contains("Packages", StringComparison.OrdinalIgnoreCase)
                  || real.Contains("VirtualStore", StringComparison.OrdinalIgnoreCase);
    Say($"redirected   : {redirected}");

    // And can a NON-packaged process see it? That is the real test of "a real folder":
    // the author's editor, git, and sync client are all outside the package.
    var sentinel = Path.Combine(project, "visible-to-outside.txt");
    File.WriteAllText(sentinel, "if you can read this from outside the package, the folder is real");
    Say($"sentinel     : {sentinel}");

    Say($"RESULT (b)   : {(readBack == payload && !redirected ? "PASS — real folder, no redirection" : redirected ? "FAIL — MSIX redirected the write" : "FAIL")}");
}
catch (Exception ex)
{
    Say($"RESULT (b)   : FAIL — {ex.GetType().Name}: {ex.Message}");
}

// The report goes somewhere a non-packaged process can read it.
var outPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
    "ADR-341 Spike Story", "msix-check-report.txt");
try
{
    Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
    File.WriteAllText(outPath, report.ToString());
}
catch { /* the report path is itself part of what is under test */ }
