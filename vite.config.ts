import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          icons: ["lucide-react"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-slot",
            "@radix-ui/react-popover",
          ],
          toast: ["sonner"],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    // Forward API calls to the Express server during local development
    // (see server/index.ts, which listens on PORT, default 5000).
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.PORT || 5000}`,
        changeOrigin: true,
      },
    },
  },
  // @ts-expect-error -- `test` is added by the Vitest plugin (vitest/config),
  // vite's own types don't know about it, but Vitest reads this at runtime.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(import.meta.dirname, "client/src/test/setup.ts")],
  },
});
