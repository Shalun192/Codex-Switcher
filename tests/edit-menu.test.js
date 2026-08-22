'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applicationMenuTemplate, contextMenuTemplate } = require('../src/main/edit-menu');

test('macOS application menu includes native editing commands', () => {
  const template = applicationMenuTemplate('darwin');
  assert.equal(template.some((item) => item.role === 'editMenu'), true);
});

test('editable context menu supports standard text operations', () => {
  const roles = contextMenuTemplate({ isEditable: true }).map((item) => item.role).filter(Boolean);
  assert.deepEqual(roles, ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']);
});

test('selected read-only text can be copied', () => {
  assert.deepEqual(contextMenuTemplate({ selectionText: 'text' }), [{ role: 'copy' }]);
  assert.deepEqual(contextMenuTemplate({ selectionText: '' }), []);
});
