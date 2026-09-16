// Decoder tests for the generated C# protocol types (ADR-341 D5).
//
// The generated file is compile-checked by every build, which proves it is valid
// C# and nothing more. These tests prove the part a compiler cannot see: that
// the `[JsonPropertyName]` mapping the emitter writes actually reads the wire's
// camelCase names, that a closed string set decodes to the right enum member,
// and that unknown wire fields pass through instead of failing the payload.
//
// The payloads below are byte-identical to the fixtures in SharpeeIDETests'
// ComposeDiagnosticsTests. That is the point of one generator with two targets:
// the same bytes must mean the same thing in both shells, and a divergence
// shows up as one of these two suites failing.
//
// Public interface: xunit test class, no production surface.
// Owner context: tools/ide — the Avalonia desktop head.

using System.Text.Json;
using PaneHost.Protocol;

namespace PaneHost.Tests;

public class ProtocolTypeTests
{
    private static T Decode<T>(string json) =>
        JsonSerializer.Deserialize<T>(json) ?? throw new InvalidOperationException("decoded null");

    /// <summary>Asserts the value is present and hands it back, so a chain can continue.</summary>
    private static T Present<T>(T? value) where T : class
    {
        Assert.NotNull(value);
        return value;
    }

    [Fact]
    public void compile_diagnostic_decodes_with_its_full_span()
    {
        var payload = Decode<ComposeJsonPayload>("""
        {"schemaVersion":2,"diagnostics":[{"severity":"error","code":"analysis.unknown-entity",
         "message":"No entity named `Attic`.","file":"/tmp/probe.story","line":11,
         "span":{"line":11,"column":13,"endLine":11,"endColumn":22}}]}
        """);

        Assert.Equal(2, payload.SchemaVersion);
        var record = Assert.Single(payload.Diagnostics);
        Assert.Equal(ComposeSeverity.Error, record.Severity);
        Assert.Equal("analysis.unknown-entity", record.Code);
        Assert.Equal(11, record.Span?.Line);
        Assert.Equal(22, record.Span?.EndColumn);
        Assert.Null(record.Span?.File);
        Assert.Null(payload.Ir);
    }

    [Fact]
    public void hatch_diagnostic_decodes_without_a_span()
    {
        var payload = Decode<ComposeJsonPayload>("""
        {"schemaVersion":2,"diagnostics":[{"severity":"error","code":"hatch.chord-namespace",
         "message":"loader-private","file":"/tmp/mod.ts","line":1}]}
        """);

        Assert.Equal("hatch.chord-namespace", payload.Diagnostics[0].Code);
        Assert.Null(payload.Diagnostics[0].Span);
    }

    [Fact]
    public void the_ir_projection_decodes_and_ignores_everything_outside_it()
    {
        var payload = Decode<ComposeJsonPayload>("""
        {"schemaVersion":2,"diagnostics":[],
         "ir":{"format":"story language 2","languageVersion":"3.0.0",
               "meta":{"title":"Probe","fields":{"id":"probe","storyVersion":"1.0.0",
                                                 "authors":["Tests"],"testers":[],"themes":[]}},
               "entities":[{"id":"lab","name":"Lab","article":"the","isPlayable":false,
                            "kinds":[{"name":"room","config":[],"condition":null,
                                      "span":{"line":6,"column":3,"endLine":6,"endColumn":9}}],
                            "traits":[],"span":{"line":5,"column":1,"endLine":8,"endColumn":15}}],
               "actions":[{"name":"xyzzy","patterns":[],
                           "span":{"line":20,"column":1,"endLine":24,"endColumn":4}}],
               "phrases":{"defaultLocale":"en-US","locales":{"en-US":{
                   "night-wind":{"strategy":null,"variants":[],
                                 "span":{"line":30,"column":3,"endLine":30,"endColumn":14}},
                   "cold-returns":{"strategy":null,"variants":[]}}}},
               "hatches":[{"name":"weather","modulePath":"./weather.ts","hatchKind":"text",
                           "span":{"line":40,"column":1,"endLine":40,"endColumn":36}}],
               "unknownFutureField":42}}
        """);

        var ir = Present(payload.Ir);
        Assert.Equal("3.0.0", ir.LanguageVersion);
        Assert.Equal("probe", ir.Meta.Fields.Id);
        Assert.Equal(new[] { "Tests" }, ir.Meta.Fields.Authors);
        Assert.Null(ir.GrammarFile);

        var entity = Assert.Single(Present(ir.Entities));
        Assert.Equal("Lab", entity.Name);
        Assert.False(entity.IsPlayable);
        Assert.Equal("room", Assert.Single(entity.Kinds).Name);
        Assert.Equal(5, entity.Span.Line);
        Assert.Equal(15, entity.Span.EndColumn);

        Assert.Equal("xyzzy", Assert.Single(Present(ir.Actions)).Name);

        var hatch = Assert.Single(Present(ir.Hatches));
        Assert.Equal("./weather.ts", hatch.ModulePath);
        Assert.Equal(40, hatch.Span?.Line);

        // Phrase KEYS decode; bodies stay opaque, and a span-less entry is fine.
        var locale = Present(ir.Phrases).Locales["en-US"];
        Assert.Equal(new[] { "cold-returns", "night-wind" }, locale.Keys.OrderBy(k => k).ToArray());
        Assert.Equal(30, locale["night-wind"].Span?.Line);
        Assert.Null(locale["cold-returns"].Span);
    }

    [Fact]
    public void the_project_manifest_decodes_its_closed_string_sets()
    {
        var manifest = Decode<ProjectManifest>("""
        {"schemaVersion":1,"story":"probe","generatedFrom":"bridge","entities":[
          {"id":"r_lab","displayName":"Lab","category":"room","traits":{"room":{"exits":["north"]}},
           "source":{"file":"probe.story","line":5,"resolution":"exact"}}]}
        """);

        Assert.Equal(ProjectManifestGeneratedFrom.Bridge, manifest.GeneratedFrom);
        Assert.Null(manifest.HatchContextVersion);
        var node = Assert.Single(manifest.Entities);
        Assert.Equal(EntityCategory.Room, node.Category);
        Assert.Equal(new[] { "north" }, Present(node.Traits.Room).Exits);
        Assert.Null(node.Traits.Container);
        Assert.Equal(SourceRefResolution.Exact, Present(node.Source).Resolution);
    }
}
