import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Stub out `server-only` in tests — the package throws by design in non-Next.js
      // environments; tests run in Node.js where the guard is unnecessary.
      "server-only": fileURLToPath(new URL("./tests/__mocks__/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
