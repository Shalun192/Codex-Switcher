'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CodexLifecycle, WINDOWS_STOP_SCRIPT, WINDOWS_START_SCRIPT } = require('../src/main/codex-lifecycle');

test('macOS lifecycle waits for a complete quit and verifies the relaunch', async () => {
  let running = true;
  const calls = [];
  const lifecycle = new CodexLifecycle({
    platform: 'darwin',
    wait: async () => {},
    exec: async (file, args) => {
      calls.push([file, ...args]);
      if (file === '/usr/bin/osascript' && args[1].includes('to quit')) {
        running = false;
        return { stdout: '' };
      }
      if (file === '/usr/bin/osascript') return { stdout: running ? 'true\n' : 'false\n' };
      if (file === '/usr/bin/open') {
        running = true;
        return { stdout: '' };
      }
      throw new Error(`unexpected command ${file}`);
    }
  });
  assert.equal((await lifecycle.stop()).wasRunning, true);
  assert.equal((await lifecycle.start()).restarted, true);
  assert.ok(calls.some((call) => call[0] === '/usr/bin/osascript' && call[2].includes('to quit')));
  assert.ok(calls.some((call) => call[0] === '/usr/bin/open' && call.includes('com.openai.codex')));
});

test('Windows lifecycle has graceful close, forced fallback, and reliable launch fallbacks', async () => {
  const scripts = [];
  const lifecycle = new CodexLifecycle({
    platform: 'win32',
    exec: async (file, args) => {
      assert.equal(file, 'powershell.exe');
      scripts.push(args.at(-1));
      return { stdout: '' };
    }
  });
  await lifecycle.stop();
  await lifecycle.start();
  assert.equal(scripts[0], WINDOWS_STOP_SCRIPT);
  assert.equal(scripts[1], WINDOWS_START_SCRIPT);
  assert.match(WINDOWS_STOP_SCRIPT, /CloseMainWindow/);
  assert.match(WINDOWS_STOP_SCRIPT, /Stop-Process -Force/);
  assert.match(WINDOWS_START_SCRIPT, /Get-StartApps/);
  assert.match(WINDOWS_START_SCRIPT, /LOCALAPPDATA/);
});
