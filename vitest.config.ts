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
      "@/lib/automatic-payment-link": fileURLToPath(new URL("./lib/automatic-payment-link-v2.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url))
    }
  }
});
