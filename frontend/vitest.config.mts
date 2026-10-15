import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Vite 8 transforms with oxc (not esbuild); use the automatic JSX runtime without a plugin.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "jsdom",
  },
});
