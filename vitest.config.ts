import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit + integration tests run under Vitest. E2E (Playwright), smoke, and load
// tests live under tests/ but are NOT picked up here — they have their own
// runners (see package.json). Default env is node; hook/component tests opt into
// jsdom with a `// @vitest-environment jsdom` docblock at the top of the file.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/{unit,integration}/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["src/lib/google-sheets.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
