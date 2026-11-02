import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL("../../", import.meta.url));

// Separate dev server: these aliases cannot enter the production app build.
export default defineConfig({
  root: `${root}tools/break-ui`,
  resolve: {
    alias: [
      {
        find: "@clerk/tanstack-react-start",
        replacement: `${root}src/features/break-ui/clerk.ts`,
      },
      {
        find: /^@\/features\/(budget|auth|household)\/actions$/,
        replacement: `${root}src/features/break-ui/actions.ts`,
      },
      { find: "@", replacement: `${root}src` },
    ],
  },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3210,
    strictPort: true,
    fs: { allow: [root] },
  },
});
