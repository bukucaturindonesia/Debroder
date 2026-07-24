import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/support/server-only.ts", import.meta.url)),
      "@/lib/automatic-payment-link": fileURLToPath(new URL("./lib/automatic-payment-link-v2.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url))
    }
  }
});
