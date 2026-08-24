'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('switcher', {
  bootstrap: () => ipcRenderer.invoke('bootstrap'),
  select: (id) => ipcRenderer.invoke('accounts:select', id),
  add: () => ipcRenderer.invoke('accounts:add'),
  connect: (id) => ipcRenderer.invoke('accounts:connect', id),
  refresh: (id) => ipcRenderer.invoke('accounts:refresh', id),
  remove: (id) => ipcRenderer.invoke('accounts:remove', id),
  restore: () => ipcRenderer.invoke('accounts:restore'),
  setAutoSwitch: (enabled) => ipcRenderer.invoke('settings:auto-switch', enabled),
  setLanguage: (language) => ipcRenderer.invoke('settings:language', language),
  saveGuide: (sectionId, title, content) => ipcRenderer.invoke('guides:save', sectionId, title, content),
  resetGuide: (sectionId) => ipcRenderer.invoke('guides:reset', sectionId),
  copyDiagnostics: () => ipcRenderer.invoke('support:copy-diagnostics'),
  openChatGPT: () => ipcRenderer.invoke('support:open-chatgpt'),
  onStatus: (callback) => ipcRenderer.on('status', (_event, value) => callback(value)),
  onSnapshot: (callback) => ipcRenderer.on('snapshot', (_event, value) => callback(value))
});
