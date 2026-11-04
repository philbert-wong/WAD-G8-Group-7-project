// Vitest settings for the server tests (pnpm test)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Before any test: start a throwaway MongoDB and our real server.js on port 8001 (see the file)
    globalSetup: './tests/start-test-server.js',
    // All test files share that one server and database, so run the files one at a time
    fileParallelism: false,
  },
});
