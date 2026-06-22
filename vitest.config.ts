import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["packages/shared/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}"],
      exclude: ["apps/web/src/mockData.ts", "apps/web/src/reportingMockData.ts"],
      reporter: ["text", "html"],
    },
    include: ["packages/**/*.test.ts", "apps/**/*.test.{ts,tsx}"],
  },
});
