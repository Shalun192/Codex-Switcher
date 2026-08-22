'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { diagnosticsText } = require('../src/main/support');

test('support diagnostics contains useful local data without credentials or accounts', () => {
  const result = diagnosticsText({
    appVersion: '4.6.4',
    build: 464,
    platform: 'win32',
    osVersion: '10.0.19045',
    autoSwitch: { enabled: true, lastCheckedAt: '2026-08-22T12:00:00.000Z', lastError: null }
  });
  assert.match(result, /4\.6\.4 \(build 464\)/);
  assert.match(result, /Windows 10\.0\.19045/);
  assert.match(result, /Mode: fully local/);
  assert.match(result, /Auto-switch: enabled/);
  assert.doesNotMatch(result, /must-not-leak/);
  assert.doesNotMatch(result, /example\.com/);
});

test('support diagnostics follows the selected Russian language', () => {
  const result = diagnosticsText({
    appVersion: '4.6.4',
    build: 464,
    platform: 'darwin',
    osVersion: '25.6.0',
    language: 'ru',
    autoSwitch: { enabled: false, lastCheckedAt: null, lastError: null }
  });
  assert.match(result, /Codex Switcher — диагностика/);
  assert.match(result, /Версия: 4\.6\.4 \(сборка 464\)/);
  assert.match(result, /Режим: полностью локальный/);
  assert.match(result, /Автопереключение: выключено/);
});

test('help panel is local-only and contains secure guidance', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'app.js'), 'utf8');
  const localization = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'localization.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8');
  const numberedSections = html.match(/<summary><span>\d+<\/span>/g) || [];
  assert.equal(numberedSections.length, 10);
  assert.match(html, /Errors and solutions/);
  assert.match(html, /<b>Solution:<\/b>/);
  assert.match(html, /data-custom-section="10"/);
  assert.match(html, /TOTP secret/);
  assert.match(html, /Recovery codes are not the TOTP secret/);
  assert.match(html, /id="help-open-chatgpt"/);
  assert.doesNotMatch(html, /totp\.danhersam\.com/);
  assert.doesNotMatch(main, /support:open-totp-generator/);
  assert.match(html, /id="help-copy-diagnostics"/);
  assert.match(html, /id="guide-editor-open"/);
  assert.match(html, /id="guide-editor-dialog"/);
  assert.match(html, /id="auto-switch"/);
  assert.match(html, /id="language"/);
  assert.match(html, /<option value="en">EN<\/option>/);
  assert.match(html, /<script src="localization\.js"><\/script>/);
  assert.match(html, /Connects the next account at 1%/);
  assert.match(localization, /switches at 1%/);
  assert.match(renderer, /PlanLabel\.fromPlanType/);
  assert.match(html, /Auto-switch did not run/);
  assert.match(html, /Keychain.*DPAPI/);
  assert.doesNotMatch(`${html}\n${renderer}\n${localization}\n${main}`, /online access control|admin:|device:refresh/);
});
