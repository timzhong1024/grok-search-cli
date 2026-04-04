import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.json",
      outDir: "dist",
    }),
  ],
  build: {
    target: "node22",
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: {
        cli: "src/cli.ts",
        index: "src/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
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
        banner: (chunk) =>
          chunk.facadeModuleId?.endsWith("/src/cli.ts")
            ? "#!/usr/bin/env node"
            : "",
      },
    },
  },
});
