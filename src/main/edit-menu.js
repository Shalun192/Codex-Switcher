'use strict';

function applicationMenuTemplate(platform) {
  if (platform !== 'darwin') return [];
  return [
    {
      role: 'appMenu',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { role: 'editMenu' }
  ];
}

function contextMenuTemplate(params = {}) {
  if (params.isEditable) {
    return [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' }
    ];
  }
  return params.selectionText ? [{ role: 'copy' }] : [];
}

module.exports = { applicationMenuTemplate, contextMenuTemplate };
