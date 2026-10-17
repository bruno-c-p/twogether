import ts from "typescript";
import type { Repo } from "./fitness-checks";

export const PX_BASELINE = "scripts/fitness-px-baseline.tsv";

const SPACING_PREFIX =
  /^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|w|h|size|min-w|min-h|max-w|max-h|inset|inset-x|inset-y|top|right|bottom|left|translate-x|translate-y|scroll-mt)$/;

const TEXT_SIZES = new Map([
  ["12", "text-xs"],
  ["13", "text-sm"],
  ["14", "text-md"],
  ["16", "text-lg"],
  ["20", "text-xl"],
  ["24", "text-2xl"],
  ["32", "text-3xl"],
  ["44", "text-4xl"],
]);

const RADII = new Map([
  ["6", "rounded-sm"],
  ["10", "rounded-md"],
  ["14", "rounded-lg"],
]);

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
  ["src/features/budget/components/workspace-navigation.tsx", "h-mobile-nav"],
  ["src/features/budget/components/workspace-shell.tsx", "pb-mobile-nav"],
  ["src/components/ui/toaster.tsx", "var(--mobile-nav-height)"],
];

type ClassToken = { token: string; line: number; literal: number };

function styledSources(repo: Repo) {
  return repo
    .tracked(["src"])
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
}

function literalTexts(file: string, text: string) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const literals: { text: string; line: number }[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      literals.push({
        text: node.text,
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      });

    ts.forEachChild(node, visit);
  };

  visit(source);

  return literals;
}

function classTokens(file: string, text: string): ClassToken[] {
  return literalTexts(file, text).flatMap(({ text: literal, line }, index) =>
    literal
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => ({ token, line, literal: index })),
  );
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

  return { variant: token.slice(0, cut + 1), utility: token.slice(cut + 1) };
}

function arbitraryPx(token: string) {
  const { utility } = splitVariant(token);

  const match =
    /^(?:(-?[a-z][a-z0-9-]*?)-)?\[([^\]]*\d+(?:\.\d+)?px[^\]]*)\]$/.exec(
      utility,
    );

  return match ? { prefix: match[1] ?? "", value: match[2] ?? "" } : undefined;
}

const GENERIC_SUGGESTION =
  "use a theme utility (spacing p-4 = 16px, text-sm, rounded-md, bp* breakpoints) or add a named token to uno.config.ts";

function namedUtility(prefix: string, px: string) {
  if (SPACING_PREFIX.test(prefix) && Number(px) % 4 === 0)
    return `${prefix}-${Number(px) / 4} (spacing is 4px per step)`;

  if (prefix === "text") return TEXT_SIZES.get(px);

  return prefix.startsWith("rounded") ? RADII.get(px) : undefined;
}

function pxSuggestion(prefix: string, value: string) {
  const px = /^(\d+(?:\.\d+)?)px$/.exec(value)?.[1];
  const named = px && namedUtility(prefix, px);

  return named ? `use ${named}` : GENERIC_SUGGESTION;
}

function baselineCounts(repo: Repo) {
  const counts = new Map<string, number>();

  for (const line of repo.read(PX_BASELINE).split("\n").filter(Boolean))
    counts.set(line, (counts.get(line) ?? 0) + 1);

  return counts;
}

export function noNewArbitraryPx(repo: Repo) {
  const allowed = baselineCounts(repo);

  return styledSources(repo).flatMap((file) =>
    classTokens(file, repo.read(file)).flatMap(({ token, line }) => {
      const px = arbitraryPx(token);

      if (!px) return [];

      const key = `${file}\t${token}`;
      const left = allowed.get(key) ?? 0;

      if (left > 0) {
        allowed.set(key, left - 1);

        return [];
      }

      return [
        `${file}:${line} adds arbitrary px value ${token}; ${pxSuggestion(px.prefix, px.value)}. Existing values are grandfathered in ${PX_BASELINE}; do not add to it.`,
      ];
    }),
  );
}

function overlaps(a: string, b: string) {
  if (a === b) return true;

  return (BOX_SIDES.get(a) ?? [a]).some((side) =>
    (BOX_SIDES.get(b) ?? [b]).includes(side),
  );
}

export function conflictingBoxUtilities(file: string, text: string) {
  const failures: string[] = [];
  const seen = new Map<string, { property: string; token: string }[]>();

  for (const { token, line, literal } of classTokens(file, text)) {
    const { variant, utility } = splitVariant(token);
    const property = BOX_UTILITY.exec(utility)?.[1];

    if (!property) continue;

    const key = `${literal}|${variant}`;
    const earlier = seen.get(key) ?? [];
    const clash = earlier.find((other) => overlaps(other.property, property));

    if (clash)
      failures.push(
        `${file}:${line} sets ${clash.token} and ${token} on one element; stylesheet order picks the winner, so keep only the sides you mean (e.g. mt-2 instead of m-0 mt-2)`,
      );

    seen.set(key, [...earlier, { property, token }]);
  }

  return failures;
}

function noConflictingBoxUtilities(repo: Repo) {
  return styledSources(repo).flatMap((file) =>
    conflictingBoxUtilities(file, repo.read(file)),
  );
}

export function mobileNavToken(repo: Repo) {
  return NAV_TOKEN_USES.flatMap(([file, use]) =>
    repo.exists(file) && repo.read(file).includes(use)
      ? []
      : [
          `${file} must use ${use}: the mobile nav height lives in --mobile-nav-height (src/styles.css) so the nav and what clears it cannot drift`,
        ],
  );
}

export function styleChecks(repo: Repo) {
  return [
    ...noNewArbitraryPx(repo),
    ...noConflictingBoxUtilities(repo),
    ...mobileNavToken(repo),
  ];
}
