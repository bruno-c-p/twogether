import ts from "typescript";
import type { Repo } from "./fitness-checks";

const REGISTRY = /^src\/features\/([^/]+)\/actions\/mutations\.ts$/;

type Statement = {
  post: boolean;
  name?: string;
  exported: boolean;
  calls: Map<string, string>;
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
  let node: ts.Expression = call;

  while (
    ts.isPropertyAccessExpression(node.parent) &&
    ts.isCallExpression(node.parent.parent) &&
    node.parent.parent.expression === node.parent
  ) {
    const [argument] = node.parent.parent.arguments;

    calls.set(node.parent.name.text, argument ? compact(argument) : "");
    node = node.parent.parent;
  }

  const declaration = node.parent;

  const topLevelConst =
    ts.isVariableDeclaration(declaration) &&
    ts.isIdentifier(declaration.name) &&
    (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
    ts.isSourceFile(declaration.parent.parent.parent);

  if (!topLevelConst) return { post: isPost(call), exported: false, calls };

  return {
    post: isPost(call),
    name: declaration.name.text,
    exported: hasExportModifier(declaration.parent.parent),
    calls,
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
  const entries = new Map<string, number>();

  visitAll(source, (node) => {
    if (!ts.isIdentifier(node) || !names.has(node.text) || isNameOnly(node))
      return;

    if (isOwnEntry(node))
      entries.set(node.text, (entries.get(node.text) ?? 0) + 1);
    else
      failures.push(
        `${file}: ${node.text} may only appear as its own entry in the actions object`,
      );
  });

  // A second entry means an intermediate object that can be re-keyed.
  for (const [name, count] of entries)
    if (count > 1)
      failures.push(
        `${file}: ${name} must appear in exactly one actions object`,
      );

  return failures;
}

function statementFailures(
  file: string,
  { post, name, exported, calls }: Statement,
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

  return failures;
}

// Types catch a missing or extra mutation, but not a statement or an
// actions entry wired to another definition whose input is compatible.
function barrelFailures(file: string, text: string) {
  const source = parse(file, text);
  const statements = serverFns(source);

  const names = new Set(
    statements.flatMap((statement) => statement.name ?? []),
  );

  return [
    ...statements.flatMap((statement) => statementFailures(file, statement)),
    ...strayReferences(file, source, names),
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
    failures.push(`${file}: ${key} must be define("${key}", ...)`);

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

// A copied entry that keeps another entry's name or store call still
// compiles when the two inputs fit each other.
function registryFailures(file: string, text: string) {
  const failures: string[] = [];

  visitAll(parse(file, text), (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "define"
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
      ...barrelFailures(barrel, repo.read(barrel)),
      ...strays,
    ];
  });
}
