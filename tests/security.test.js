'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'src', 'main', 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('Electron renderer follows the hardened local-content boundary', () => {
  assert.match(main, /app\.enableSandbox\(\)/);
  assert.match(main, /protocol\.registerSchemesAsPrivileged/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.match(main, /setPermissionCheckHandler/);
  assert.match(main, /will-navigate/);
  assert.match(main, /setWindowOpenHandler\(\(\) => \(\{ action: 'deny' \}\)\)/);
  assert.match(main, /trustedSender/);
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /sandbox: true/);
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(preload, /send:\s*ipcRenderer|on:\s*ipcRenderer/);
});

test('package enables production Electron fuses', () => {
  const fuses = packageJson.build.electronFuses;
  assert.equal(fuses.resetAdHocDarwinSignature, true);
  assert.equal(fuses.runAsNode, false);
  assert.equal(fuses.enableNodeOptionsEnvironmentVariable, false);
  assert.equal(fuses.enableNodeCliInspectArguments, false);
  assert.equal(fuses.enableEmbeddedAsarIntegrityValidation, true);
  assert.equal(fuses.onlyLoadAppFromAsar, true);
  assert.equal(fuses.grantFileProtocolExtraPrivileges, false);
});

test('public client has no private backend or remote administration', () => {
  const source = `${main}\n${preload}\n${html}`;
  assert.doesNotMatch(source, /device:refresh|admin:|\/v1\/devices|\/v1\/admin/);
  assert.doesNotMatch(source, /t\.me\/|https:\/\/[^'"\s]*codex-switcher/);
});
