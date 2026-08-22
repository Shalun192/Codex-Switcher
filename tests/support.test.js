'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { diagnosticsText } = require('../src/main/support');

test('support diagnostics contains useful local data without credentials or accounts', () => {
  const result = diagnosticsText({
    appVersion: '4.6.3',
    build: 463,
    platform: 'win32',
    osVersion: '10.0.19045',
    autoSwitch: { enabled: true, lastCheckedAt: '2026-08-22T12:00:00.000Z', lastError: null }
  });
  assert.match(result, /4\.6\.3 \(build 463\)/);
  assert.match(result, /Windows 10\.0\.19045/);
  assert.match(result, /Режим: полностью локальный/);
  assert.match(result, /Автопереключение: включено/);
  assert.doesNotMatch(result, /must-not-leak/);
  assert.doesNotMatch(result, /example\.com/);
});

test('help panel is local-only and contains secure guidance', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'app.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8');
  const numberedSections = html.match(/<summary><span>\d+<\/span>/g) || [];
  assert.equal(numberedSections.length, 10);
  assert.match(html, /Ошибки и решения/);
  assert.match(html, /<b>Решение:<\/b>/);
  assert.match(html, /data-custom-section="10"/);
  assert.match(html, /секретный ключ TOTP/);
  assert.match(html, /Резервные коды — не TOTP-ключ/);
  assert.match(html, /id="help-open-chatgpt"/);
  assert.doesNotMatch(html, /totp\.danhersam\.com/);
  assert.doesNotMatch(main, /support:open-totp-generator/);
  assert.match(html, /id="help-copy-diagnostics"/);
  assert.match(html, /id="guide-editor-open"/);
  assert.match(html, /id="guide-editor-dialog"/);
  assert.match(html, /id="auto-switch"/);
  assert.match(html, /При 1% подключит следующий аккаунт/);
  assert.match(renderer, /переключение при 1%/);
  assert.match(renderer, /PlanLabel\.fromPlanType/);
  assert.match(html, /Автопереключение не сработало/);
  assert.match(html, /Keychain.*DPAPI/);
  assert.doesNotMatch(`${html}\n${renderer}\n${main}`, /онлайн-контроль доступа|admin:|device:refresh/);
});
