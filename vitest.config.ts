import { defineConfig } from 'vitest/config';

const processEnv = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env;

const isGitHubActions = processEnv?.GITHUB_ACTIONS === 'true';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    reporters: isGitHubActions ? ['default', 'junit'] : ['default'],
    outputFile: isGitHubActions
      ? {
          junit: './test-results/vitest.junit.xml',
        }
      : undefined,
    coverage: {
      enabled: isGitHubActions,
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
