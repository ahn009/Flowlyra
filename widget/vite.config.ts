import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/Widget.ts",
      name: "FlowLyraWidget",
      formats: ["iife"],
      fileName: () => "widget.js"
    },
    minify: "esbuild",
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
