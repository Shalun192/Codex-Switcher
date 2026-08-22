'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveDataRoot } = require('../src/main/data-root');

function fakeApp(root) {
  return {
    getPath(name) {
      if (name === 'appData') return root;
      if (name === 'userData') return path.join(root, 'Codex Switcher Local');
      throw new Error(`Unexpected path request: ${name}`);
    }
  };
}

test('uses the current application directory for a new installation', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-data-root-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(resolveDataRoot(fakeApp(root), {}), path.join(root, 'Codex Switcher Local'));
});

test('reuses valid legacy profiles so an update preserves existing accounts', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-data-root-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const legacyRoot = path.join(root, 'Codex Switcher Public');
  fs.mkdirSync(legacyRoot, { recursive: true });
  fs.writeFileSync(path.join(legacyRoot, 'profiles.json'), JSON.stringify({ profiles: [], deleted: [] }));
  assert.equal(resolveDataRoot(fakeApp(root), {}), legacyRoot);
});

test('an explicit data directory always wins', () => {
  assert.equal(resolveDataRoot(fakeApp('/unused'), { CODEX_SWITCHER_DATA_ROOT: '/private/custom-root' }), '/private/custom-root');
});
