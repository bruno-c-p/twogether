import ts from "typescript";
import type { Repo } from "./fitness-checks";

const REGISTRY = /^src\/features\/([^/]+)\/actions\/mutations\.ts$/;

const DEFINERS = new Set(["define", "defineCommand"]);

type Entry = { gate?: string; command: boolean };

type Statement = {
  post: boolean;
  name?: string;
  exported: boolean;
  calls: Map<string, string>;
  repeated: Set<string>;
};

const compact = (node: ts.Node) => node.getText().replace(/\s+/g, "");

const parse = (file: string, text: string) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

function isServerFn(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "createServerFn"
  );
}

function isPost(call: ts.CallExpression) {
  const [options] = call.arguments;

  return (
    options !== undefined &&
    ts.isObjectLiteralExpression(options) &&
    options.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        property.name.getText() === "method" &&
        ts.isStringLiteral(property.initializer) &&
        property.initializer.text === "POST",
    )
  );
}

function hasExportModifier(node: ts.Node) {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

// Follows `createServerFn(...).middleware(...).validator(...).handler(...)`
// up to the declaration that holds it.
function statementOf(call: ts.CallExpression): Statement {
  const calls = new Map<string, string>();
  const repeated = new Set<string>();
  let node: ts.Expression = call;

  while (
    ts.isPropertyAccessExpression(node.parent) &&
    ts.isCallExpression(node.parent.parent) &&
    node.parent.parent.expression === node.parent
  ) {
    const [argument] = node.parent.parent.arguments;

    if (calls.has(node.parent.name.text)) repeated.add(node.parent.name.text);
    calls.set(node.parent.name.text, argument ? compact(argument) : "");
    node = node.parent.parent;
  }

  const declaration = node.parent;

  const topLevelConst =
    ts.isVariableDeclaration(declaration) &&
    ts.isIdentifier(declaration.name) &&
    (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
    ts.isSourceFile(declaration.parent.parent.parent);

  if (!topLevelConst)
    return { post: isPost(call), exported: false, calls, repeated };

  return {
    post: isPost(call),
    name: declaration.name.text,
    exported: hasExportModifier(declaration.parent.parent),
    calls,
    repeated,
  };
}

function serverFns(source: ts.SourceFile) {
  const found: Statement[] = [];

  visitAll(source, (node) => {
    if (isServerFn(node)) found.push(statementOf(node));
  });

  return found;
}

function visitAll(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => visitAll(child, visit));
}

// The one allowed use of a statement: `name` or `name: name` in the actions
// object. Anything else (an entry under another key, an export list, an
// alias) could hand a caller the wrong mutation.
function isOwnEntry(node: ts.Identifier) {
  const { parent } = node;

  if (ts.isShorthandPropertyAssignment(parent)) return true;

  return (
    ts.isPropertyAssignment(parent) &&
    parent.initializer === node &&
    parent.name.getText() === node.text
  );
}

function isNameOnly(node: ts.Identifier) {
  const { parent } = node;

  return (
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isPropertyAccessExpression(parent) && parent.name === node)
  );
}

function strayReferences(
  file: string,
  source: ts.SourceFile,
  names: Set<string>,
) {
  const failures: string[] = [];

  visitAll(source, (node) => {
    if (
      ts.isIdentifier(node) &&
      names.has(node.text) &&
      !isNameOnly(node) &&
      !isOwnEntry(node)
    )
      failures.push(
        `${file}: ${node.text} may only appear as its own entry in the actions object`,
      );
  });

  return failures;
}

function exportedNames(source: ts.SourceFile) {
  return new Set(
    source.statements.flatMap((statement) => {
      if (ts.isVariableStatement(statement) && hasExportModifier(statement))
        return statement.declarationList.declarations.map((declaration) =>
          declaration.name.getText(),
        );

      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      )
        return statement.exportClause.elements.map(
          (element) => (element.propertyName ?? element.name).text,
        );

      return [];
    }),
  );
}

function declaredName(object: ts.ObjectLiteralExpression) {
  let node: ts.Node = object.parent;

  while (ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))
    node = node.parent;

  return ts.isVariableDeclaration(node) ? node.name.getText() : undefined;
}

// Every statement's one entry must sit in a single exported object, and that
// object may hold nothing else: a second object, or an entry reached through
// one (`internal.x`), could hand a caller the wrong mutation.
function actionsObjectFailures(
  file: string,
  source: ts.SourceFile,
  names: Set<string>,
) {
  const owners = new Set<ts.ObjectLiteralExpression>();

  visitAll(source, (node) => {
    if (
      ts.isIdentifier(node) &&
      names.has(node.text) &&
      isOwnEntry(node) &&
      ts.isObjectLiteralExpression(node.parent.parent)
    )
      owners.add(node.parent.parent);
  });

  if (owners.size > 1)
    return [`${file}: every statement must be an entry of one actions object`];

  const [object] = owners;

  if (!object) return [];

  const name = declaredName(object);

  const failures =
    name && exportedNames(source).has(name)
      ? []
      : [`${file}: the actions object must be an exported const`];

  for (const property of object.properties) {
    const key = property.name?.getText() ?? "...";

    const own =
      (ts.isShorthandPropertyAssignment(property) ||
        (ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.initializer) &&
          property.initializer.text === key)) &&
      names.has(key);

    if (!own)
      failures.push(
        `${file}: actions entry ${key} must be the statement of the same name`,
      );
  }

  return failures;
}

const GATE_MIDDLEWARE = new Map([
  ["household", "[householdMiddleware]"],
  ["auth", "[authMiddleware]"],
]);

function statementFailures(
  file: string,
  { post, name, exported, calls, repeated }: Statement,
  entries: Map<string, Entry>,
) {
  if (!name) return [`${file}: a server fn must be a top-level const`];

  const failures: string[] = [];
  const validator = calls.get("validator");

  if (!post)
    failures.push(
      `${file}: ${name} must be createServerFn({ method: "POST" })`,
    );

  if (exported)
    failures.push(
      `${file}: ${name} is exported; call it through the feature's actions object`,
    );

  if (calls.get("handler") !== `serve(defs.${name})`)
    failures.push(`${file}: ${name} must end in .handler(serve(defs.${name}))`);

  if (validator !== undefined && validator !== `defs.${name}.parse`)
    failures.push(`${file}: ${name} must validate with defs.${name}.parse`);

  // TanStack concatenates repeated calls, so a second .middleware() adds to
  // the chain the check below reads.
  for (const method of repeated)
    failures.push(`${file}: ${name} must call .${method}() once`);

  // A dropped or swapped middleware still type-checks when serve() needs no
  // more context than the remaining middleware gives.
  const entry = entries.get(name);
  const gate = entry?.gate;

  if (entry?.command && calls.has("validator"))
    failures.push(`${file}: ${name} takes no input; drop its .validator()`);

  const middleware = gate ? GATE_MIDDLEWARE.get(gate) : undefined;

  if (!middleware || calls.get("middleware") !== middleware)
    failures.push(
      `${file}: ${name} must run .middleware(${middleware ?? "<its gate>"}) for its "${gate ?? "?"}" gate`,
    );

  return failures;
}

// Types catch a missing or extra mutation, but not a statement or an
// actions entry wired to another definition whose input is compatible.
function barrelFailures(
  file: string,
  text: string,
  entries: Map<string, Entry>,
) {
  const source = parse(file, text);
  const statements = serverFns(source);

  const names = new Set(
    statements.flatMap((statement) => statement.name ?? []),
  );

  return [
    ...statements.flatMap((statement) =>
      statementFailures(file, statement, entries),
    ),
    ...strayReferences(file, source, names),
    ...actionsObjectFailures(file, source, names),
  ];
}

function entryFailures(file: string, entry: ts.CallExpression) {
  const { parent } = entry;

  if (!ts.isPropertyAssignment(parent) || parent.initializer !== entry)
    return [`${file}: define(...) must be a registry entry`];

  const key = parent.name.getText();
  const [name, spec] = entry.arguments;
  const failures: string[] = [];

  if (!name || !ts.isStringLiteral(name) || name.text !== key)
    failures.push(
      `${file}: ${key} must be ${entry.expression.getText()}("${key}", ...)`,
    );

  const run =
    spec && ts.isObjectLiteralExpression(spec)
      ? spec.properties.find(
          (field) =>
            ts.isPropertyAssignment(field) && field.name.getText() === "run",
        )
      : undefined;

  if (!run || !compact(run).includes(`store.${key}(`))
    failures.push(`${file}: ${key} must run store.${key}`);

  return failures;
}

function entryGate(entry: ts.CallExpression) {
  const [, spec] = entry.arguments;

  if (!spec || !ts.isObjectLiteralExpression(spec)) return undefined;

  const gate = spec.properties.find(
    (field) =>
      ts.isPropertyAssignment(field) && field.name.getText() === "gate",
  );

  return gate &&
    ts.isPropertyAssignment(gate) &&
    ts.isStringLiteral(gate.initializer)
    ? gate.initializer.text
    : undefined;
}

function registryEntries(file: string, text: string) {
  const entries = new Map<string, Entry>();

  visitAll(parse(file, text), (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      DEFINERS.has(node.expression.text) &&
      ts.isPropertyAssignment(node.parent)
    ) {
      entries.set(node.parent.name.getText(), {
        gate: entryGate(node),
        command: node.expression.text === "defineCommand",
      });
    }
  });

  return entries;
}

// A copied entry that keeps another entry's name or store call still
// compiles when the two inputs fit each other.
function registryFailures(file: string, text: string) {
  const failures: string[] = [];

  visitAll(parse(file, text), (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      DEFINERS.has(node.expression.text)
    )
      failures.push(...entryFailures(file, node));
  });

  return failures;
}

export function mutationRules(repo: Repo) {
  const features = repo
    .tracked(["src/features"])
    .flatMap((file) => REGISTRY.exec(file)?.[1] ?? []);

  return features.flatMap((feature) => {
    const barrel = `src/features/${feature}/actions/index.ts`;
    const registry = `src/features/${feature}/actions/mutations.ts`;

    const strays = repo
      .tracked([`src/features/${feature}`])
      .filter(
        (file) =>
          file !== barrel &&
          /\.tsx?$/.test(file) &&
          !/\.test\.tsx?$/.test(file) &&
          serverFns(parse(file, repo.read(file))).some(
            (fn) => fn.post || fn.calls.get("handler")?.startsWith("serve("),
          ),
      )
      .map((file) => `${file}: mutation server fns belong in ${barrel}`);

    return [
      ...registryFailures(registry, repo.read(registry)),
      ...barrelFailures(
        barrel,
        repo.read(barrel),
        registryEntries(registry, repo.read(registry)),
      ),
      ...strays,
    ];
  });
}
