/**
 * protocol-model.ts — TypeScript wire declarations to a language-neutral model.
 *
 * The first half of ADR-341 D5's generator: it loads the protocol's TypeScript
 * source with the compiler API, walks the declarations named by the spec, and
 * produces a small neutral model (structs, enums, field types) that each
 * language emitter renders. Reading the SOURCE rather than a built `.d.ts` is
 * deliberate — a stale `dist/` would make the gate report freshness against
 * yesterday's protocol.
 *
 * Everything this reader does not understand is an error naming the type and
 * field, never a dropped field: a generator that silently omits what it cannot
 * translate produces a decoder that is wrong in exactly the way hand-mirroring
 * was.
 *
 * Public interface: buildProtocolModel, ProtocolModel, DeclModel, StructModel,
 * EnumModel, FieldModel, TypeRef.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 *
 * References:
 * - ADR-341 D5 — protocol types are generated from the TypeScript source.
 * - DEVARCH 8b — one definition of a wire type, imported rather than copied;
 *   across a language boundary, generated rather than hand-written.
 */
import { join } from 'node:path';
import * as ts from 'typescript';
import { ProtocolSpec, RootSpec } from './protocol-spec';

/** A primitive the wire can carry. */
export type PrimitiveKind = 'string' | 'int' | 'double' | 'bool';

/** A field's type, in language-neutral form. */
export type TypeRef =
  | { kind: 'primitive'; name: PrimitiveKind }
  | { kind: 'named'; name: string }
  | { kind: 'array'; element: TypeRef }
  | { kind: 'map'; value: TypeRef }
  | { kind: 'optional'; inner: TypeRef };

/** One property of a struct. */
export interface FieldModel {
  name: string;
  type: TypeRef;
  /** Doc comment text, already stripped of the JSDoc frame. */
  doc?: string;
}

/** An emitted record type. */
export interface StructModel {
  kind: 'struct';
  /** Sort key: the spec's root order, or a later slot for an anonymous shape. */
  order: number;
  /** Native name, unqualified. */
  name: string;
  /** Native name of the enclosing type, when nested. */
  nestUnder?: string;
  doc?: string;
  fields: FieldModel[];
}

/** An emitted closed set of string values. */
export interface EnumModel {
  kind: 'enum';
  /** Sort key: the spec's root order, or a later slot for an anonymous shape. */
  order: number;
  name: string;
  nestUnder?: string;
  doc?: string;
  /** The wire's string values, in declaration order. */
  cases: string[];
}

export type DeclModel = StructModel | EnumModel;

/** The whole emission, in spec order. */
export interface ProtocolModel {
  decls: DeclModel[];
}

/**
 * Sort slot where shapes the spec does not name begin. Above any plausible
 * spec-root count, so a named type always precedes an anonymous sibling.
 */
const ANONYMOUS_ORDER_BASE = 10_000;

/** A translation the reader refuses to guess at. */
class ProtocolModelError extends Error {
  constructor(message: string) {
    super(`protocol: ${message}`);
    this.name = 'ProtocolModelError';
  }
}

/**
 * Compiler options for the read. `paths` points `@sharpee/chord` at its SOURCE
 * so the IR projection resolves against the same text the compiler builds, not
 * against whatever `dist/` happens to hold.
 */
function programOptions(root: string): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    baseUrl: root,
    paths: {
      '@sharpee/chord': [join(root, 'packages/chord/src/index.ts')],
      '@sharpee/chord/*': [join(root, 'packages/chord/src/*')],
    },
  };
}

/** The doc comment on a declaration or property, as plain text. */
function docOf(node: ts.Node): string | undefined {
  const jsDocs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  if (jsDocs.length === 0) return undefined;
  const text = ts.getTextOfJSDocComment(jsDocs[jsDocs.length - 1].comment);
  if (!text) return undefined;
  return (
    text
      // `{@link X}` is TSDoc markup no native doc renderer understands; the
      // name it points at is the part worth keeping.
      .replace(/\{@link\s+([^}|]+?)(?:\s*\|[^}]*)?\}/g, '`$1`')
      .replace(/\s*\n\s*/g, ' ')
      .trim() || undefined
  );
}

/** PascalCase name for an anonymous type generated from a field. */
function pascal(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Reads the spec's declarations into the neutral model.
 *
 * Kept as a class only to carry the program, checker and accumulating
 * declaration list through the walk; `buildProtocolModel` is the entry point.
 */
class ModelReader {
  private readonly checker: ts.TypeChecker;
  private readonly decls: DeclModel[] = [];
  /** TS type name -> the root spec that names it, and its spec order. */
  private readonly rootsByTsName = new Map<string, { spec: RootSpec; order: number }>();
  /** TS type names already emitted, so a shared reference emits once. */
  private readonly emitted = new Set<string>();
  /** Sort slot for shapes the spec does not name (inline objects and unions). */
  private anonymousOrder = ANONYMOUS_ORDER_BASE;

  constructor(
    private readonly program: ts.Program,
    private readonly spec: ProtocolSpec,
    private readonly root: string,
  ) {
    this.checker = program.getTypeChecker();
    this.spec.roots.forEach((root, order) => {
      if (this.rootsByTsName.has(root.ts)) {
        throw new ProtocolModelError(`spec lists '${root.ts}' twice`);
      }
      this.rootsByTsName.set(root.ts, { spec: root, order });
    });
  }

  /**
   * Emit every spec root and return the model.
   *
   * Roots exported by a spec source are emitted directly; roots reached only
   * through a reference (`Span`, `DiagnosticSeverity`) are emitted when the
   * walk meets them. A root neither exported nor reached is an error — it means
   * the spec names a type nothing decodes.
   */
  read(): ProtocolModel {
    for (const { ts: tsName } of this.spec.roots) {
      const declaration = this.findDeclaration(tsName);
      if (declaration) this.emitDeclaration(tsName, declaration);
    }
    const unreached = this.spec.roots.filter((r) => !this.emitted.has(r.ts));
    if (unreached.length > 0) {
      throw new ProtocolModelError(
        `PROTOCOL_SPEC names ${unreached.map((r) => `'${r.ts}'`).join(', ')}, which no emitted ` +
          'type exports or references — remove them or add the module that does',
      );
    }
    return { decls: this.decls };
  }

  /** The declaration a spec root names, if a spec source exports it. */
  private findDeclaration(name: string): ts.Declaration | undefined {
    for (const relative of this.spec.sources) {
      const file = this.program.getSourceFile(join(this.root, relative));
      if (!file) throw new ProtocolModelError(`spec source not loaded: ${relative}`);
      const moduleSymbol = this.checker.getSymbolAtLocation(file);
      if (!moduleSymbol) continue;
      for (const exported of this.checker.getExportsOfModule(moduleSymbol)) {
        if (exported.getName() !== name) continue;
        const declaration = this.resolve(exported)?.declarations?.[0];
        if (declaration) return declaration;
      }
    }
    return undefined;
  }

  /** Follow an import alias to the symbol that actually declares the type. */
  private resolve(symbol: ts.Symbol | undefined): ts.Symbol | undefined {
    if (!symbol) return undefined;
    return symbol.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(symbol) : symbol;
  }

  /** Emit one declaration under its spec name, if it has not been emitted already. */
  private emitDeclaration(tsName: string, declaration: ts.Declaration): void {
    if (this.emitted.has(tsName)) return;
    this.emitted.add(tsName);
    const root = this.rootsByTsName.get(tsName);
    if (!root) {
      throw new ProtocolModelError(
        `'${tsName}' is reachable from an emitted type but is not in PROTOCOL_SPEC.roots — ` +
          'add it, with the native name the shells should call it',
      );
    }
    const name = root.spec.as ?? root.spec.ts;
    if (ts.isInterfaceDeclaration(declaration)) {
      this.decls.push(this.readInterface(declaration, name, root.spec.nestUnder, root.order));
      return;
    }
    if (ts.isTypeAliasDeclaration(declaration)) {
      this.decls.push(this.readStringUnionAlias(declaration, name, root.spec.nestUnder, root.order));
      return;
    }
    throw new ProtocolModelError(
      `'${tsName}' is neither an interface nor a string-union type alias — the wire carries ` +
        'records and closed string sets, and nothing else translates',
    );
  }

  /** An interface becomes a struct; its members become fields. */
  private readInterface(
    declaration: ts.InterfaceDeclaration,
    name: string,
    nestUnder: string | undefined,
    order: number,
  ): StructModel {
    const tsName = declaration.name.text;
    const owner = nestUnder ? `${nestUnder}.${name}` : name;
    const fields: FieldModel[] = [];
    for (const member of declaration.members) {
      if (ts.isIndexSignatureDeclaration(member)) {
        if (!this.spec.indexSignatureIgnoredOn.includes(tsName)) {
          throw new ProtocolModelError(
            `${tsName} carries an index signature the spec does not account for — list it in ` +
              'PROTOCOL_SPEC.indexSignatureIgnoredOn if the native struct should ignore it',
          );
        }
        continue;
      }
      if (!ts.isPropertySignature(member) || !member.type) {
        throw new ProtocolModelError(`${tsName} has a member that is not a typed property`);
      }
      if (!ts.isIdentifier(member.name)) {
        throw new ProtocolModelError(`${tsName} has a property whose name is not an identifier`);
      }
      const fieldName = member.name.text;
      let type = this.readType(member.type, `${tsName}.${fieldName}`, owner);
      if (member.questionToken && type.kind !== 'optional') {
        type = { kind: 'optional', inner: type };
      }
      fields.push({ name: fieldName, type, doc: docOf(member) });
    }
    return { kind: 'struct', order, name, nestUnder, doc: docOf(declaration), fields };
  }

  /** A type alias to a union of string literals becomes an enum. */
  private readStringUnionAlias(
    declaration: ts.TypeAliasDeclaration,
    name: string,
    nestUnder: string | undefined,
    order: number,
  ): EnumModel {
    const cases = this.readStringLiteralUnion(declaration.type);
    if (!cases) {
      throw new ProtocolModelError(
        `'${declaration.name.text}' is a type alias to something other than a union of string ` +
          'literals; only closed string sets translate',
      );
    }
    return { kind: 'enum', order, name, nestUnder, doc: docOf(declaration), cases };
  }

  /** The string values of a union of string literals, or undefined if it is not one. */
  private readStringLiteralUnion(node: ts.TypeNode): string[] | undefined {
    const members = ts.isUnionTypeNode(node) ? node.types : [node];
    const cases: string[] = [];
    for (const member of members) {
      if (!ts.isLiteralTypeNode(member) || !ts.isStringLiteral(member.literal)) return undefined;
      cases.push(member.literal.text);
    }
    return cases.length > 0 ? cases : undefined;
  }

  /**
   * Translate one type node.
   *
   * @param node the type node to translate
   * @param path `Type.field`, used in errors and to look up float overrides
   * @param owner the qualified native type an anonymous shape nests under
   */
  private readType(node: ts.TypeNode, path: string, owner: string): TypeRef {
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { kind: 'primitive', name: 'string' };
      case ts.SyntaxKind.BooleanKeyword:
        return { kind: 'primitive', name: 'bool' };
      case ts.SyntaxKind.NumberKeyword:
        return { kind: 'primitive', name: this.numberKind(path) };
      default:
        break;
    }
    if (ts.isArrayTypeNode(node)) {
      return { kind: 'array', element: this.readType(node.elementType, path, owner) };
    }
    if (ts.isParenthesizedTypeNode(node)) return this.readType(node.type, path, owner);
    if (ts.isUnionTypeNode(node)) return this.readUnion(node, path, owner);
    if (ts.isTypeLiteralNode(node)) return this.readAnonymousShape(node, path, owner);
    if (ts.isTypeQueryNode(node)) return this.readTypeQuery(node, path);
    if (ts.isTypeReferenceNode(node)) return this.readTypeReference(node, path, owner);
    throw new ProtocolModelError(
      `${path}: unsupported type '${node.getText()}' — the wire model covers primitives, ` +
        'records, arrays, string maps, closed string sets and optionality',
    );
  }

  /** Integer unless the spec pins this field as a float. */
  private numberKind(path: string): PrimitiveKind {
    return this.spec.doubleFields.includes(path) ? 'double' : 'int';
  }

  /** `T | null`, `T | undefined`, and closed string sets written inline. */
  private readUnion(node: ts.UnionTypeNode, path: string, owner: string): TypeRef {
    const literals = this.readStringLiteralUnion(node);
    if (literals) {
      const name = pascal(path.split('.').pop()!);
      this.decls.push({ kind: 'enum', order: this.anonymousOrder++, name, nestUnder: owner, cases: literals });
      return { kind: 'named', name: `${owner}.${name}` };
    }
    const nullable = node.types.filter(
      (t) =>
        (ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword) ||
        t.kind === ts.SyntaxKind.UndefinedKeyword,
    );
    const rest = node.types.filter((t) => !nullable.includes(t));
    if (nullable.length === 0 || rest.length !== 1) {
      throw new ProtocolModelError(
        `${path}: unions translate only as an optional (\`T | null\`) or a closed string set`,
      );
    }
    return { kind: 'optional', inner: this.readType(rest[0], path, owner) };
  }

  /** An inline `{ … }` becomes a struct nested under the field's owner. */
  private readAnonymousShape(node: ts.TypeLiteralNode, path: string, owner: string): TypeRef {
    const name = pascal(path.split('.').pop()!);
    const qualified = `${owner}.${name}`;
    const order = this.anonymousOrder++;
    const fields: FieldModel[] = [];
    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || !member.type || !ts.isIdentifier(member.name)) {
        throw new ProtocolModelError(`${path}: inline shape has a member that is not a typed property`);
      }
      const fieldName = member.name.text;
      let type = this.readType(member.type, `${path}.${fieldName}`, qualified);
      if (member.questionToken && type.kind !== 'optional') {
        type = { kind: 'optional', inner: type };
      }
      fields.push({ name: fieldName, type, doc: docOf(member) });
    }
    this.decls.push({ kind: 'struct', order, name, nestUnder: owner, fields });
    return { kind: 'named', name: qualified };
  }

  /** `typeof CONST` where CONST is a literal — the schema-version fields. */
  private readTypeQuery(node: ts.TypeQueryNode, path: string): TypeRef {
    const type = this.checker.getTypeAtLocation(node);
    if (type.isNumberLiteral()) return { kind: 'primitive', name: this.numberKind(path) };
    if (type.isStringLiteral()) return { kind: 'primitive', name: 'string' };
    throw new ProtocolModelError(
      `${path}: \`typeof\` translates only for a literal constant, and '${node.getText()}' is not one`,
    );
  }

  /** A named reference: the built-in containers, or another emitted type. */
  private readTypeReference(node: ts.TypeReferenceNode, path: string, owner: string): TypeRef {
    const written = ts.isIdentifier(node.typeName) ? node.typeName.text : node.typeName.right.text;
    const args = node.typeArguments ?? [];

    if ((written === 'Array' || written === 'ReadonlyArray') && args.length === 1) {
      return { kind: 'array', element: this.readType(args[0], path, owner) };
    }
    if (written === 'Record' && args.length === 2) {
      if (args[0].kind !== ts.SyntaxKind.StringKeyword) {
        throw new ProtocolModelError(`${path}: only \`Record<string, …>\` translates to a map`);
      }
      return { kind: 'map', value: this.readType(args[1], path, owner) };
    }

    // The spec may redirect a wire type to the projection the shells actually
    // decode — `ComposeJsonPayload.ir` is typed `StoryIR`, and no shell decodes
    // all 1,700 lines of it.
    const name = this.spec.substitutions[written] ?? written;
    const declaration = name === written
      ? this.resolve(this.checker.getSymbolAtLocation(node.typeName))?.declarations?.[0]
      : this.findDeclaration(name);
    if (!declaration) {
      throw new ProtocolModelError(`${path}: cannot resolve the declaration of '${name}'`);
    }
    this.emitDeclaration(name, declaration);
    const root = this.rootsByTsName.get(name)!;
    const nativeName = root.spec.as ?? root.spec.ts;
    return {
      kind: 'named',
      name: root.spec.nestUnder ? `${root.spec.nestUnder}.${nativeName}` : nativeName,
    };
  }
}

/**
 * Read the protocol's TypeScript declarations into the language-neutral model
 * every native emitter renders.
 *
 * @param root absolute path of the repository root
 * @param spec the emission list
 * @returns the model — declarations carry an `order` the emitters sort by, so
 *   the output is byte-stable across runs regardless of walk order
 * @throws if a spec source is missing, a spec root is never reached, or a
 *   reachable type uses a construct the wire model does not cover
 */
export function buildProtocolModel(root: string, spec: ProtocolSpec): ProtocolModel {
  const files = spec.sources.map((relative) => join(root, relative));
  const program = ts.createProgram(files, programOptions(root));
  const diagnostics = program
    .getSemanticDiagnostics()
    .filter((d) => d.file && files.includes(d.file.fileName));
  if (diagnostics.length > 0) {
    const first = diagnostics[0];
    throw new ProtocolModelError(
      `the protocol sources do not type-check, so the model would be a guess: ` +
        ts.flattenDiagnosticMessageText(first.messageText, ' '),
    );
  }
  return new ModelReader(program, spec, root).read();
}
