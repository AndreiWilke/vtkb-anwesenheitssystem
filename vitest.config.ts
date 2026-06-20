import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["packages/shared/src/**/*.ts"],
      reporter: ["text", "html"],
    },
    include: ["packages/**/*.test.ts", "apps/**/*.test.{ts,tsx}"],
  },
});
