import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set");
}

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      CORS_ORIGIN: "http://localhost:3000",
    },
  },
});
