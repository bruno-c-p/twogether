import { defineConfig, type DummyRuleMap } from "oxlint";

const typeChecked: DummyRuleMap = {
  "typescript/await-thenable": "error",
  "typescript/no-array-delete": "error",
  "typescript/no-base-to-string": "error",
  "typescript/no-duplicate-type-constituents": "error",
  "typescript/no-floating-promises": "error",
  "typescript/no-for-in-array": "error",
  "typescript/no-implied-eval": "error",
  "typescript/no-misused-promises": "error",
  "typescript/no-redundant-type-constituents": "error",
  "typescript/no-unnecessary-type-assertion": "error",
  "typescript/no-unsafe-argument": "error",
  "typescript/no-unsafe-assignment": "error",
  "typescript/no-unsafe-call": "error",
  "typescript/no-unsafe-enum-comparison": "error",
  "typescript/no-unsafe-member-access": "error",
  "typescript/no-unsafe-return": "error",
  "typescript/no-unsafe-unary-minus": "error",
  "typescript/only-throw-error": [
    "error",
    { allow: [{ from: "lib", name: "Response" }] },
  ],
  "typescript/prefer-promise-reject-errors": "error",
  "typescript/require-await": "error",
  "typescript/restrict-plus-operands": "error",
  "typescript/restrict-template-expressions": "error",
  "typescript/unbound-method": "error",
};

const typescriptRecommended: DummyRuleMap = {
  "typescript/ban-ts-comment": "error",
  "typescript/no-array-constructor": "error",
  "typescript/no-duplicate-enum-values": "error",
  "typescript/no-empty-object-type": "error",
  "typescript/no-explicit-any": "error",
  "typescript/no-extra-non-null-assertion": "error",
  "typescript/no-misused-new": "error",
  "typescript/no-namespace": "error",
  "typescript/no-non-null-asserted-optional-chain": "error",
  "typescript/no-require-imports": "error",
  "typescript/no-this-alias": "error",
  "typescript/no-unnecessary-type-constraint": "error",
  "typescript/no-unsafe-declaration-merging": "error",
  "typescript/no-unsafe-function-type": "error",
  "typescript/no-wrapper-object-types": "error",
  "typescript/prefer-as-const": "error",
  "typescript/triple-slash-reference": "error",
};

const antiSlop: DummyRuleMap = {
  "oxc/no-accumulating-spread": "error",
  "anti-slop/no-array-filter-map": "error",
  "anti-slop/no-reduce-accumulator-copy": "error",
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  "anti-slop/no-runtime-typeof": "error",
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-readable-spacing": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
};

// State lives in React Query (server data and client side effects), React
// Hook Form (form state) and nuqs (URL state). The reducer and layout or
// insertion effect variants would only reopen the same escape hatches.
const STATE_HOOKS = ["useState", "useReducer"];

const EFFECT_HOOKS = ["useEffect", "useLayoutEffect", "useInsertionEffect"];

const STATE_MESSAGE =
  "Local component state is banned: use React Query for server data, React Hook Form for form fields, nuqs for URL state, or an uncontrolled component.";

const EFFECT_MESSAGE =
  "Effects are banned: derive values during render, act in the event handler, use a route lifecycle hook, or sync through React Query.";

const bannedReactHooks = [
  { name: "react", importNames: STATE_HOOKS, message: STATE_MESSAGE },
  { name: "react", importNames: EFFECT_HOOKS, message: EFFECT_MESSAGE },
];

const bannedReactMembers = [
  ...STATE_HOOKS.map((property) => ({
    object: "React",
    property,
    message: STATE_MESSAGE,
  })),
  ...EFFECT_HOOKS.map((property) => ({
    object: "React",
    property,
    message: EFFECT_MESSAGE,
  })),
];

export default defineConfig({
  plugins: ["eslint", "typescript", "react", "oxc"],
  categories: { correctness: "error" },
  env: { browser: true, node: true, es2024: true },
  options: { typeAware: true },
  ignorePatterns: [
    "dist/**",
    ".tanstack/**",
    ".vercel/**",
    ".output/**",
    "src/routeTree.gen.ts",
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".commandcode/**",
    ".continue/**",
    ".cursor/**",
    ".gemini/**",
    ".intent/**",
    ".opencode/**",
    ".pi/**",
    ".roo/**",
    ".windsurf/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
  ],
  rules: {
    "no-unused-vars": "error",
    "no-unused-expressions": "error",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    ...typescriptRecommended,
    ...antiSlop,
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      rules: {
        ...typeChecked,
        "no-restricted-properties": ["error", ...bannedReactMembers],
        "no-restricted-imports": [
          "error",
          {
            paths: bannedReactHooks,
            patterns: [
              {
                group: ["./*", "../*", "./**", "../**"],
                message: "Use the @/ alias (src/) instead of relative imports.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "typescript/await-thenable": "off",
        "typescript/require-await": "off",
      },
    },
    {
      files: ["e2e/**/*.ts", "scripts/**/*.ts"],
      rules: { "no-restricted-imports": "off" },
    },
  ],
});
