'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fromPlanType } = require('../src/renderer/plan-label');

test('formats the supported personal ChatGPT plans', () => {
  assert.equal(fromPlanType('free'), 'Free');
  assert.equal(fromPlanType('chatgpt_go'), 'Go');
  assert.equal(fromPlanType('PLUS'), 'Plus');
  assert.equal(fromPlanType('chatgpt-pro'), 'Pro');
});

test('keeps an unknown plan minimal and does not invent a subscription', () => {
  assert.equal(fromPlanType(null), 'Plan —');
  assert.equal(fromPlanType('unknown'), 'Plan —');
  assert.equal(fromPlanType(null, 'ru'), 'Подписка —');
});
