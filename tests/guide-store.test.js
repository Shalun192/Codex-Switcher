'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GuideStore } = require('../src/main/guide-store');

test('guide overrides are local, validated, and reversible', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-guides-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new GuideStore(root);
  assert.deepEqual(store.guides(), []);
  assert.equal(store.save(2, 'Локальный гайд', '# Заголовок')[0].section_id, 2);
  assert.equal(new GuideStore(root).guides()[0].title, 'Локальный гайд');
  assert.deepEqual(store.reset(2), []);
  assert.throws(() => store.save(11, 'Нет', 'Текст'), /неверный формат/);
  assert.throws(() => store.save(1, '', 'Текст'), /неверный формат/);
});
