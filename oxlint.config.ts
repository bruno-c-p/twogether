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
  ],
  rules: {
    "no-unused-vars": "error",
    "no-unused-expressions": "error",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "warn",
    ...typescriptRecommended,
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      rules: {
        ...typeChecked,
        "no-restricted-imports": [
          "error",
          {
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
      files: ["**/*.test.ts"],
      rules: {
        "typescript/await-thenable": "off",
        "typescript/require-await": "off",
      },
    },
    {
      files: ["e2e/**/*.ts"],
      rules: { "no-restricted-imports": "off" },
    },
  ],
});
