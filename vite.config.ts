import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src/", import.meta.url)) } },
  css: { modules: { localsConvention: "camelCase" } },
  plugins: [UnoCSS(), tanstackStart(), nitro(), react()],
});
