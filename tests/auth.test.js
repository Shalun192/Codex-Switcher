'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAuth, accountIdentity, emailFromAuth } = require('../src/shared/auth');

function jwt(payload) {
  return `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.x`;
}

test('validates supported Codex auth and extracts local identity', () => {
  const chat = { auth_mode: 'chatgpt', tokens: { refresh_token: 'refresh-token-value', account_id: 'account-1', id_token: jwt({ email: 'me@example.com' }) } };
  const api = { auth_mode: 'apikey', OPENAI_API_KEY: 'test-key-not-a-real-secret' };
  assert.equal(validateAuth(chat), true);
  assert.equal(accountIdentity(chat), 'chatgpt:account-1');
  assert.equal(emailFromAuth(chat), 'me@example.com');
  assert.equal(validateAuth(api), true);
  assert.equal(validateAuth({ auth_mode: 'chatgpt', tokens: {} }), false);
});
