'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_LANGUAGE, normalizeLanguage, translate, translateError, guide } = require('../src/renderer/localization');

const englishGuides = new Map([[1, { title: 'Quick start', content: 'English content' }]]);

test('English is the default and unsupported language values fall back safely', () => {
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.equal(normalizeLanguage(undefined), 'en');
  assert.equal(normalizeLanguage('de'), 'en');
  assert.equal(translate('en', 'action.connect'), 'Connect to Codex');
});

test('Russian translates the interface, errors, and all ten built-in guides', () => {
  assert.equal(translate('ru', 'action.connect'), 'Подключить к Codex');
  assert.equal(translateError('ru', 'Account not found.'), 'Аккаунт не найден.');
  assert.equal(guide('en', 1, englishGuides).title, 'Quick start');
  for (let id = 1; id <= 10; id += 1) {
    const value = guide('ru', id, englishGuides);
    assert.ok(value?.title);
    assert.ok(value?.content);
    assert.match(`${value.title}\n${value.content}`, /[А-Яа-яЁё]/);
  }
});
