// Runs ONCE before all the test files (Vitest "globalSetup", see vitest.config.mjs).
//
// 1. Starts a throwaway MongoDB that lives in memory, so tests never touch your real database.
// 2. Starts our real server.js as its own program, exactly like `pnpm dev` does, but with
//    DB = the throwaway database and PORT = 8001 (so it never clashes with your pnpm dev on 8000).
//    server.js reads DB and PORT from the environment, so nothing in server.js changes for tests.
// 3. Waits until the server answers, then the tests send real requests to http://localhost:8001.
// After all tests: stops the server and the throwaway database.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const TEST_PORT = '8001';
const SERVER_FOLDER = fileURLToPath(new URL('..', import.meta.url));

let mongo = null;
let serverProcess = null;
let serverOutput = '';

// Waits a little (used while waiting for the server to start)
function wait(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

// Keeps asking /api/health until the server answers (gives up after about 20 seconds)
async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (serverProcess.exitCode !== null) {
      throw new Error('server.js stopped while starting:\n' + serverOutput);
    }
    try {
      const response = await fetch('http://localhost:' + TEST_PORT + '/api/health');
      if (response.ok) {
        return;
      }
    } catch (error) {
      // not listening yet, try again
    }
    await wait(250);
  }
  throw new Error('server.js did not start within 20 seconds:\n' + serverOutput);
}

export async function setup(project) {
  mongo = await MongoMemoryServer.create();
  const dbUri = mongo.getUri();

  // The test files connect to the same throwaway database to put test data in (see helpers.js)
  project.provide('dbUri', dbUri);

  // Same settings as your own computer, but with the throwaway database and port 8001
  const env = Object.assign({}, process.env, { DB: dbUri, PORT: TEST_PORT });

  serverProcess = spawn(process.execPath, ['server.js'], { cwd: SERVER_FOLDER, env: env });
  serverProcess.stdout.on('data', function (chunk) {
    serverOutput = serverOutput + chunk;
  });
  serverProcess.stderr.on('data', function (chunk) {
    serverOutput = serverOutput + chunk;
  });

  await waitForServer();
}

export async function teardown() {
  if (serverProcess !== null) {
    serverProcess.kill();
  }
  if (mongo !== null) {
    await mongo.stop();
  }
}
