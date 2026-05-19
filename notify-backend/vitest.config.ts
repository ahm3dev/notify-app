import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Lets Vitest resolve Encore's generated ~encore/* modules (service clients).
      "~encore": fileURLToPath(new URL("./encore.gen", import.meta.url)),
    },
  },
  test: {
    include: ["**/*.test.ts"],
  },
});
