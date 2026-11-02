import ts from "typescript";
import type { Repo } from "./fitness-checks";

// Vendored from the Glaze registry: Glaze's own lint checks it, and its glass
// recipe is drawn with gradients.
export const GLAZE_VENDORED = ["src/components/glaze/", "src/lib/glaze/"];

// A shorthand and any side of the same box property fight over one value;
// the winner is the stylesheet order, not the class order.
const BOX_SIDES = new Map([
  ["p", ["pt", "pr", "pb", "pl"]],
  ["px", ["pl", "pr"]],
  ["py", ["pt", "pb"]],
  ["m", ["mt", "mr", "mb", "ml"]],
  ["mx", ["ml", "mr"]],
  ["my", ["mt", "mb"]],
]);

const BOX_UTILITY = /^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-./;

const NAV_TOKEN_USES: [string, string][] = [
  [
    "src/features/budget/components/workspace-navigation.tsx",
    "h-(--mobile-nav-height)",
  ],
  [
    "src/features/budget/components/workspace-shell.tsx",
    "pb-(--mobile-nav-height)",
  ],
  ["src/components/app/toaster.tsx", "--mobile-nav-height"],
];

// One className attribute or cx() call is one element's class list. Every
// other string literal is its own group. A ternary's two branches never
// apply together, so pieces under opposite branches never conflict.
type ClassToken = {
  token: string;
  line: number;
  group: number;
  inClass: boolean;
  branches: string[];
};

function styledSources(repo: Repo) {
  return repo
    .tracked(["src"])
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .filter((file) => !GLAZE_VENDORED.some((dir) => file.startsWith(dir)));
}

function isClassExpression(node: ts.Node) {
  if (ts.isJsxAttribute(node)) return node.name.getText() === "className";

  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "cx"
  );
}

function isStaticPiece(node: ts.Node): node is ts.LiteralLikeNode {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  );
}

function classTokens(file: string, text: string) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const tokens: ClassToken[] = [];
  let groups = 0;

  const visit = (node: ts.Node, group: number, branches: string[]) => {
    const inClass = group >= 0;
    const own = !inClass && isClassExpression(node) ? groups++ : group;

    if (isStaticPiece(node)) {
      const line =
        source.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      const piece = own >= 0 ? own : groups++;

      for (const token of node.text.split(/\s+/).filter(Boolean))
        tokens.push({ token, line, group: piece, inClass, branches });

      return;
    }

    if (ts.isConditionalExpression(node)) {
      const id = node.getStart();

      visit(node.condition, own, branches);
      visit(node.whenTrue, own, [...branches, `${id}:true`]);
      visit(node.whenFalse, own, [...branches, `${id}:false`]);

      return;
    }

    ts.forEachChild(node, (child) => visit(child, own, branches));
  };

  visit(source, -1, []);

  return tokens;
}

function exclusive(a: string[], b: string[]) {
  return a.some((branch) => {
    const [id, side] = branch.split(":");

    return b.includes(`${id}:${side === "true" ? "false" : "true"}`);
  });
}

function splitVariant(token: string) {
  let depth = 0;
  let cut = -1;

  for (let index = 0; index < token.length; index++) {
    const char = token[index];

    if (char === "[") depth++;
    else if (char === "]") depth--;
    else if (char === ":" && depth === 0) cut = index;
  }

  return {
    variant: token.slice(0, cut + 1),
    utility: token.slice(cut + 1).replace(/^!|!$/g, ""),
  };
}

function overlaps(a: string, b: string) {
  if (a === b) return true;

  return (BOX_SIDES.get(a) ?? [a]).some((side) =>
    (BOX_SIDES.get(b) ?? [b]).includes(side),
  );
}

export function conflictingBoxUtilities(file: string, text: string) {
  const failures: string[] = [];
  const seen = new Map<string, (ClassToken & { property: string })[]>();

  for (const piece of classTokens(file, text)) {
    const { variant, utility } = splitVariant(piece.token);
    const property = BOX_UTILITY.exec(utility)?.[1];

    if (!property) continue;

    const key = `${piece.group}|${variant}`;
    const earlier = seen.get(key) ?? [];

    const clash = earlier.find(
      (other) =>
        overlaps(other.property, property) &&
        !exclusive(other.branches, piece.branches),
    );

    if (clash)
      failures.push(
        `${file}:${piece.line} sets ${clash.token} and ${piece.token} on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)`,
      );

    seen.set(key, [...earlier, { ...piece, property }]);
  }

  return failures;
}

function noConflictingBoxUtilities(repo: Repo) {
  return styledSources(repo).flatMap((file) =>
    conflictingBoxUtilities(file, repo.read(file)),
  );
}

function usesClass(repo: Repo, file: string, use: string) {
  return (
    repo.exists(file) &&
    classTokens(file, repo.read(file)).some(
      ({ token, inClass }) => inClass && token.includes(use),
    )
  );
}

export function mobileNavToken(repo: Repo) {
  return NAV_TOKEN_USES.flatMap(([file, use]) =>
    usesClass(repo, file, use)
      ? []
      : [
          `${file} must use ${use} in its className: the mobile nav height lives in --mobile-nav-height (src/styles.css) so the nav and what clears it cannot drift`,
        ],
  );
}

export function styleChecks(repo: Repo) {
  return [...noConflictingBoxUtilities(repo), ...mobileNavToken(repo)];
}
