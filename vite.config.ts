import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node22",
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/cli.ts",
      formats: ["es"],
      fileName: () => "cli.js",
    },
    rollupOptions: {
      external: [
        /^node:/,
        /^dotenv(\/.*)?$/,
        "ai",
        "@ai-sdk/xai",
        "@ai-sdk/openai-compatible",
        "conf",
      ],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
