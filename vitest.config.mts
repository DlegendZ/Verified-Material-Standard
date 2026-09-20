import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "app/**/*.test.ts"],
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
    coverage: {
      provider: "v8",
      include: ["lib/scoring/**"],
      exclude: ["lib/scoring/__tests__/**"],
    },
  },
});
