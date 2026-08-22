'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseGuide } = require('../src/renderer/guide-format');

test('guide formatting recognizes only the supported safe block syntax', () => {
  const tokens = parseGuide('# Заголовок\n1. Шаг\n- Пункт\n> Заметка\n! Предупреждение\n<script>alert(1)</script>');
  assert.deepEqual(tokens.map((token) => token.type), [
    'heading', 'ordered', 'unordered', 'note', 'warning', 'paragraph'
  ]);
  assert.equal(tokens.at(-1).text, '<script>alert(1)</script>');
});

test('guide formatting limits oversized server text', () => {
  const tokens = parseGuide('x'.repeat(40000));
  assert.equal(tokens[0].text.length, 30000);
});
