// ADR-258 D5 and ADR-409 D7.2, AC-10 in the Avalonia head: the compose diagnostics
// surface's logic — reading the payload, the Problems rows, which fixes are current —
// and a refusal's fix applied, then Fix All over a story with several refusals, leaving
// a source the real compose accepts.
//
// Real path (rule 13a): the in-repo devkit CLI's `compose --json --check`
// (packages/devkit/dist/cli.js, the engine behind the toolchain shim), spawned through
// NativeHostServices, the head's own process runner, under `node`; the edits go into a
// real AvaloniaEdit TextDocument, whose undo stack is the editor's. The staged toolchain
// is not used here: it is re-vendored at release, and AC-10 is about the compose this
// repository builds. The drawn surface (rows, underlines, menu) is a thin layer over
// these functions and is exercised by `--app-exit-state`.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head's shell.

using AvaloniaEdit.Document;
using PaneHost.Hosting;
using PaneHost.Protocol;
using PaneHost.Shell;

namespace PaneHost.Tests;

public sealed class ComposeProblemsTests : IDisposable
{
    private readonly string _folder = Directory.CreateTempSubdirectory("panehost-compose-problems-").FullName;

    public void Dispose() => Directory.Delete(_folder, recursive: true);

    private const string Header = """
    story
      title: Probe
      authors:
        Tests
      id: probe
      story-version: 1.0.0
      ifid: 5A2E4B77-1C3D-4E5F-8A9B-0C1D2E3F4A5B

    create the Lab
      a room

      A small lab.

    create Alex
      a person
      playable
      starts in the Lab

      You.

    """;

    private const string Footer = """
    before the game starts
      change the player to Alex
    end before

    """;

    private static string Thing(string name, string declaration) =>
        $"create the {name}\n  a thing, {declaration}\n  in the Lab\n\n  It is there.\n\n";

    /// <summary>Four refusals (houses, shelf, mice, pot of gold) and one the rule works out (candles).</summary>
    private static readonly string RefusalStory = Header
        + Thing("houses", "plural") + Thing("shelf", "singular") + Thing("mice", "plural")
        + Thing("pot of gold", "singular") + Thing("candles", "plural") + Footer;

    private static DiagnosticSpan Span(int line, int column, int endLine, int endColumn) =>
        new() { Line = line, Column = column, EndLine = endLine, EndColumn = endColumn };

    private static ComposeDiagnosticRecord Record(string file, DiagnosticSpan? span, ComposeFix? fix = null) =>
        new() { Severity = ComposeSeverity.Error, Code = "analysis.x", Message = "m", File = file, Line = span?.Line ?? 1, Span = span, Fix = fix };

    /// <summary>Composes <paramref name="text"/> as the story file with the real in-repo CLI and reads the payload.</summary>
    private async Task<(string Path, ComposeJsonPayload Payload)> ComposeAsync(string text)
    {
        var story = Path.Combine(_folder, "probe.story");
        await File.WriteAllTextAsync(story, text);
        var cli = Path.Combine(RepoPaths.RepoRoot, "packages", "devkit", "dist", "cli.js");
        var stdout = new System.Text.StringBuilder();
        var stderr = new List<string>();
        await new NativeHostServices(null).RunAsync(RepoPaths.Node,
            new[] { cli, "compose", story, "--json", "--check" }, _folder,
            line => stdout.AppendLine(line), stderr.Add, CancellationToken.None);
        var payload = ComposeProblems.Read(stdout.ToString());
        Assert.True(payload is not null, "compose printed no readable payload: " + string.Join('\n', stderr));
        return (story, payload!);
    }

    // The pure logic.

    [Fact]
    public void read_takes_a_schema_2_payload_and_refuses_anything_else()
    {
        Assert.NotNull(ComposeProblems.Read("""{"schemaVersion":2,"diagnostics":[]}"""));
        Assert.Null(ComposeProblems.Read("""{"schemaVersion":3,"diagnostics":[]}"""));
        Assert.Null(ComposeProblems.Read("compose: no such file"));
    }

    [Fact]
    public void rows_print_a_compile_site_with_its_column_and_carry_a_fix_label()
    {
        var fix = new ComposeFix { Label = "Write `plural of house`", Edits = new[] { new ComposeFixEdit { Span = Span(3, 12, 3, 18), Text = "plural of house" } } };
        var rows = ComposeProblems.Rows(new[] { Record("/s/probe.story", Span(3, 12, 3, 18), fix), Record("/s/probe.config.json", null) });
        Assert.Equal(new[] { "probe.story:3:12", "probe.config.json:1" }, rows.Select(r => r.Site));
        Assert.Equal(new[] { "Write `plural of house`", null }, rows.Select(r => r.FixLabel));
    }

    [Fact]
    public void a_span_maps_to_its_range_and_a_block_span_underlines_only_its_first_line()
    {
        const string text = "ab\ncdef\ngh\n";
        Assert.Equal((4, 2), ComposeProblems.SpanRange(Span(2, 2, 2, 4), text));
        Assert.Null(ComposeProblems.SpanRange(Span(9, 1, 9, 2), text));
        Assert.Equal((4, 3), ComposeProblems.UnderlineRange(Span(2, 2, 3, 2), text));
    }

    [Fact]
    public void fix_all_skips_a_fix_that_overlaps_one_already_taken_and_records_in_other_files()
    {
        ComposeDiagnosticRecord WithFix(string file, string replacement) =>
            Record(file, Span(1, 1, 1, 7), new ComposeFix { Label = "l", Edits = new[] { new ComposeFixEdit { Span = Span(1, 1, 1, 7), Text = replacement } } });
        var document = new TextDocument("plural\n");
        var applied = ComposeProblems.ApplyAll(document,
            new[] { WithFix("/s.story", "plural of house"), WithFix("/s.story", "plural of home"), WithFix("/f.chord", "x") }, "/s.story");
        Assert.Equal(1, applied);
        Assert.Equal("plural of house\n", document.Text);
    }

    [Fact]
    public void a_fix_is_current_only_while_its_file_reads_what_the_check_read()
    {
        var fix = new ComposeFix { Label = "l", Edits = new[] { new ComposeFixEdit { Span = Span(1, 1, 1, 2), Text = "x" } } };
        var onStory = Record("/s/probe.story", Span(1, 1, 1, 2), fix);
        var onFragment = Record("/s/pier.chord", Span(1, 1, 1, 2), fix);
        var run = new ComposeRun("/s/probe.story", "composed", new[] { onStory, onFragment, Record("/s/probe.story", Span(1, 1, 1, 2)) });

        Assert.Equal(new[] { onStory, onFragment }, ComposeProblems.CurrentFixes(run, _ => "composed", _ => false));
        Assert.Equal(new[] { onFragment }, ComposeProblems.CurrentFixes(run, _ => "edited since", _ => false));
        Assert.Equal(new[] { onStory }, ComposeProblems.CurrentFixes(run, _ => "composed", p => p.EndsWith(".chord")));
        Assert.Empty(ComposeProblems.CurrentFixes(null, _ => "composed", _ => false));
    }

    [Fact]
    public void a_fix_that_no_longer_fits_changes_nothing_and_one_that_fits_undoes_in_one_step()
    {
        var fix = new ComposeFix { Label = "l", Edits = new[] { new ComposeFixEdit { Span = Span(2, 1, 2, 7), Text = "plural of house" } } };
        var shortened = new TextDocument("one line\n");
        Assert.False(ComposeProblems.ApplyFix(shortened, fix));
        Assert.Equal("one line\n", shortened.Text);

        var document = new TextDocument("x\nplural\n");
        Assert.True(ComposeProblems.ApplyFix(document, fix));
        Assert.Equal("x\nplural of house\n", document.Text);
        document.UndoStack.Undo();
        Assert.Equal("x\nplural\n", document.Text);
    }

    [Fact]
    public async Task a_check_of_an_unsaved_buffer_keeps_the_buffer_maps_sites_to_the_story_and_removes_its_snapshot()
    {
        var story = Path.Combine(_folder, "probe.story");
        var saved = Header + Thing("candles", "plural") + Footer;
        await File.WriteAllTextAsync(story, saved);
        var cli = Path.Combine(RepoPaths.RepoRoot, "packages", "devkit", "dist", "cli.js");

        var result = await ComposeCheck.RunAsync(new NativeHostServices(null), RepoPaths.Node, new[] { cli },
            story, RefusalStory, _ => { }, CancellationToken.None);

        Assert.Equal(1, result.Exit);
        var run = Assert.IsType<ComposeRun>(result.Run);
        Assert.Equal(story, run.StoryFile);
        Assert.Equal(RefusalStory, run.ComposedContent);
        Assert.Equal(4, run.Records.Count(r => r.Fix is not null));
        Assert.All(run.Records, r => Assert.Equal(story, r.File));
        Assert.False(File.Exists(Path.Combine(_folder, ComposeCheck.SnapshotName)), "the snapshot is removed");
        Assert.Equal(saved, await File.ReadAllTextAsync(story));
        // The mapped sites are what makes the run's fixes current against the buffer.
        Assert.Equal(4, ComposeProblems.CurrentFixes(run, _ => RefusalStory, _ => false).Count);
    }

    // AC-10, through the real compose.

    [Fact]
    public async Task the_filled_fix_applies_and_the_story_recompiles_without_that_refusal()
    {
        var (story, first) = await ComposeAsync(RefusalStory);
        var run = new ComposeRun(story, RefusalStory, first.Diagnostics);
        var document = new TextDocument(RefusalStory);
        var current = ComposeProblems.CurrentFixes(run, _ => document.Text, _ => false);
        Assert.Equal(new[] { "plural of house", "singular of shelves", "plural of mouse", "singular of pots of gold" },
            current.Select(r => r.Fix!.Edits[0].Text));
        Assert.Equal("Write `plural of house`", current[0].Fix!.Label);

        Assert.True(ComposeProblems.ApplyFix(document, current[0].Fix!));
        Assert.Contains("create the houses\n  a thing, plural of house\n", document.Text);
        Assert.Empty(ComposeProblems.CurrentFixes(run, _ => document.Text, _ => false));

        var (_, second) = await ComposeAsync(document.Text);
        Assert.Equal(3, second.Diagnostics.Count(d => d.Fix is not null));
        Assert.DoesNotContain(second.Diagnostics, d => d.Line == current[0].Line && d.Code == current[0].Code);
    }

    [Fact]
    public async Task fix_all_applies_every_fix_as_one_undo_and_the_story_composes_clean()
    {
        var (story, first) = await ComposeAsync(RefusalStory);
        var run = new ComposeRun(story, RefusalStory, first.Diagnostics);
        var document = new TextDocument(RefusalStory);

        var applied = ComposeProblems.ApplyAll(document, ComposeProblems.CurrentFixes(run, _ => document.Text, _ => false), story);
        Assert.Equal(4, applied);
        var fixedText = document.Text;
        foreach (var line in new[] { "a thing, plural of house", "a thing, singular of shelves", "a thing, plural of mouse",
                                     "a thing, singular of pots of gold", "create the candles\n  a thing, plural\n" })
            Assert.Contains(line, fixedText);

        // One undo takes back the whole Fix All. Before the next await: a TextDocument
        // answers only on the thread that made it, and xunit resumes on another.
        document.UndoStack.Undo();
        Assert.Equal(RefusalStory, document.Text);

        var (_, after) = await ComposeAsync(fixedText);
        Assert.DoesNotContain(after.Diagnostics, d => d.Severity == ComposeSeverity.Error);
    }
}
