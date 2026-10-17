import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src/", import.meta.url)) };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  css: { modules: { localsConvention: "camelCase" } },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["json", "text-summary"],
      reportsDirectory: "coverage",
      // Server modules are exercised by `bun test`, which cannot emit Istanbul
      // JSON; leaving them out lets Fallow fall back to its graph estimate.
      exclude: [
        "**/*.test.{ts,tsx}",
        "src/test/**",
        "**/*.server.ts",
        "src/server/**",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "src/**/*.test.ts",
            "scripts/**/*.test.ts",
            "tools/oxlint/e2e-locators/*.test.ts",
          ],
          exclude: ["**/*.server.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          // jsdom renders take ~1s idle and past the 5s default when parallel
          // worktrees load the machine; 15s still catches a hang.
          testTimeout: 15_000,
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/test/setup.ts"],
        },
      },
    ],
  },
});
