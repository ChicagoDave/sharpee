/**
 * protocol-csharp.ts — the C# emitter for ADR-341 D5's protocol generator.
 *
 * The second target, added from the same model the Swift emitter renders.
 * ADR-341 D5's whole point is that there is one definition of these shapes and
 * neither shell hand-writes them: a field renamed in the TypeScript reaches the
 * Avalonia host and the Swift app by the same regeneration, in the same commit.
 *
 * Wire names are camelCase and C# properties are PascalCase, so every property
 * carries an explicit `[JsonPropertyName]` rather than relying on a serializer
 * policy configured somewhere else — the mapping belongs next to the property
 * it maps, where a reader can check it.
 *
 * Unlike the Swift target, nested types are FLATTENED: a shape the model nests
 * as `ComposeStoryIR.Meta` emits as `ComposeStoryIRMeta` at namespace scope.
 * C# forbids a nested type and a property sharing a name, and most of these
 * shapes are named after the very property that carries them (`meta`,
 * `grammarFile`, `identity`), so nesting would collide by construction. The
 * Swift shell keeps its nesting because its call sites already spell it that
 * way; nothing in C# spells these yet, so the flat form costs nothing.
 *
 * Public interface: emitCSharp.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 *
 * References:
 * - ADR-341 D5 — C# is the generator's second target.
 */
import { DeclModel, EnumModel, ProtocolModel, StructModel, TypeRef } from './protocol-model';

/** Flat namespace-scope name for a possibly-nested model name. */
type NameResolver = (modelName: string) => string;

/** C# spelling of a neutral type, outside any nullable wrapper. */
function csharpType(type: TypeRef, flat: NameResolver): string {
  switch (type.kind) {
    case 'primitive':
      switch (type.name) {
        case 'string':
          return 'string';
        case 'int':
          return 'int';
        case 'double':
          return 'double';
        case 'bool':
          return 'bool';
      }
      break;
    case 'named':
      return flat(type.name);
    case 'array':
      return `IReadOnlyList<${csharpType(type.element, flat)}>`;
    case 'map':
      return `IReadOnlyDictionary<string, ${csharpType(type.value, flat)}>`;
    case 'optional':
      return `${csharpType(type.inner, flat)}?`;
  }
  /* istanbul ignore next — exhaustive above */
  throw new Error(`protocol: no C# spelling for ${JSON.stringify(type)}`);
}

/** PascalCase C# member name for a camelCase wire name. */
function pascal(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** PascalCase C# enum member for a wire string value. */
function memberName(value: string): string {
  return value
    .split(/[-_ ]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** An XML `<summary>` block at the given indent, or nothing. */
function docLines(doc: string | undefined, indent: string): string[] {
  if (!doc) return [];
  const escaped = doc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const words = escaped.split(/\s+/);
  const wrapped: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && `${current} ${word}`.length > 92 - indent.length) {
      wrapped.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) wrapped.push(current);
  if (wrapped.length === 1) return [`${indent}/// <summary>${wrapped[0]}</summary>`];
  return [
    `${indent}/// <summary>`,
    ...wrapped.map((line) => `${indent}/// ${line}`),
    `${indent}/// </summary>`,
  ];
}

/** One enum, at namespace scope. */
function emitEnum(decl: EnumModel, name: string): string[] {
  const out = docLines(decl.doc, '');
  out.push('[JsonConverter(typeof(JsonStringEnumConverter))]');
  out.push(`public enum ${name}`);
  out.push('{');
  decl.cases.forEach((value, index) => {
    if (index > 0) out.push('');
    out.push(`    [JsonStringEnumMemberName("${value}")]`);
    out.push(`    ${memberName(value)},`);
  });
  out.push('}');
  return out;
}

/** One record, at namespace scope. */
function emitRecord(decl: StructModel, name: string, flat: NameResolver): string[] {
  const out = docLines(decl.doc, '');
  out.push(`public sealed record ${name}`);
  out.push('{');
  decl.fields.forEach((field, index) => {
    if (index > 0) out.push('');
    out.push(...docLines(field.doc, '    '));
    out.push(`    [JsonPropertyName("${field.name}")]`);
    // A nullable wire field is absent-tolerant, so it is never `required`;
    // everything else must be present for the record to mean anything.
    const required = field.type.kind === 'optional' ? '' : 'required ';
    out.push(`    public ${required}${csharpType(field.type, flat)} ${pascal(field.name)} { get; init; }`);
  });
  out.push('}');
  return out;
}

/** One declaration of either shape, at namespace scope. */
function emitDecl(decl: DeclModel, name: string, flat: NameResolver): string[] {
  return decl.kind === 'enum' ? emitEnum(decl, name) : emitRecord(decl, name, flat);
}

/**
 * Render the model as one C# source file.
 *
 * @param model the neutral model, as `buildProtocolModel` produced it
 * @param generatorCommand the command a reader should run to regenerate
 * @param namespaceName the file-scoped namespace the types live in
 * @returns the complete file text, newline-terminated
 */
export function emitCSharp(
  model: ProtocolModel,
  generatorCommand: string,
  namespaceName: string,
): string {
  const out: string[] = [];
  out.push('// SharpeeProtocol.cs');
  out.push(`// GENERATED by \`${generatorCommand}\` from the TypeScript wire contract in`);
  out.push("// @sharpee/ide-protocol (ADR-184, ADR-258 D5/D6) and the IDE's declared Story IR");
  out.push('// projection. DO NOT EDIT — change the TypeScript and regenerate; the freshness');
  out.push('// gate (`repokit protocol --check`, run by `repokit verify`) fails the build on drift.');
  out.push('//');
  out.push('// These are the wire shapes ONLY. Schema-version gates and reading conveniences');
  out.push('// belong in hand-written partials beside this file, so the wire half regenerates');
  out.push('// without touching a call site.');
  out.push('//');
  out.push('// Owner context: tools/ide — generated protocol types (ADR-341 D5).');
  out.push('');
  out.push('using System.Text.Json.Serialization;');
  out.push('');
  out.push(`namespace ${namespaceName};`);
  out.push('');

  // One flat name per declaration, and the map every type reference resolves
  // through. `ComposeStoryIR.Meta` -> `ComposeStoryIRMeta`.
  const flatNames = new Map<string, string>();
  for (const decl of model.decls) {
    const qualified = decl.nestUnder ? `${decl.nestUnder}.${decl.name}` : decl.name;
    flatNames.set(qualified, qualified.split('.').join(''));
  }
  const flat: NameResolver = (modelName) => {
    const name = flatNames.get(modelName);
    if (!name) throw new Error(`protocol: no C# name for '${modelName}'`);
    return name;
  };

  // Namespace scope has no nesting to preserve, so a stable order is the
  // owner's order first, then the order within it.
  const ordered = [...model.decls].sort((a, b) => {
    const depth = (d: DeclModel) => (d.nestUnder ? d.nestUnder.split('.').length : 0);
    const ownerOrder = (d: DeclModel) => {
      if (!d.nestUnder) return d.order;
      const owner = model.decls.find(
        (o) => (o.nestUnder ? `${o.nestUnder}.${o.name}` : o.name) === d.nestUnder,
      );
      return owner ? owner.order : d.order;
    };
    return ownerOrder(a) - ownerOrder(b) || depth(a) - depth(b) || a.order - b.order;
  });

  ordered.forEach((decl, index) => {
    if (index > 0) out.push('');
    const qualified = decl.nestUnder ? `${decl.nestUnder}.${decl.name}` : decl.name;
    out.push(...emitDecl(decl, flat(qualified), flat));
  });
  out.push('');
  return out.join('\n');
}
