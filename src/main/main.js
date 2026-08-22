'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, net, protocol, safeStorage, session, shell } = require('electron');
const { ProfileStore } = require('./profile-store');
const { GuideStore } = require('./guide-store');
const { CodexClient, resolveCodexBinary } = require('./codex-client');
const { CodexLifecycle } = require('./codex-lifecycle');
const { runAutoSwitchCycle } = require('./auto-switch');
const { switchAccountSafely } = require('./account-switch');
const { diagnosticsText } = require('./support');
const { applicationMenuTemplate, contextMenuTemplate } = require('./edit-menu');

const BUILD_NUMBER = 463;
const AUTO_SWITCH_INTERVAL_MS = 60 * 1000;
const RENDERER_URL = 'app://renderer/index.html';
const RENDERER_ROOT = path.resolve(__dirname, '..', 'renderer');
const ALLOWED_OPENAI_HOSTS = ['openai.com', 'chatgpt.com'];
const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml']
]);

let window = null;
let profiles = null;
let guides = null;
let codexLifecycle = null;
let loginClient = null;
let pendingLoginId = null;
let autoSwitchTimer = null;
let accountOperationPromise = null;
const autoSwitchRuntime = {
  checking: false,
  lastCheckedAt: null,
  lastSwitchAt: null,
  lastError: null
};

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false }
}]);
app.enableSandbox();
app.setName('Codex Switcher Local');

function sendStatus(message) {
  if (window && !window.isDestroyed()) window.webContents.send('status', message);
}

function sendSnapshot() {
  if (window && !window.isDestroyed()) window.webContents.send('snapshot', snapshot());
}

function isAllowedOpenAIUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
    return ALLOWED_OPENAI_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

async function openOpenAIUrl(value) {
  if (!isAllowedOpenAIUrl(value)) throw new Error('Codex returned an untrusted sign-in URL. The operation was stopped.');
  return shell.openExternal(new URL(value).toString());
}

function temporaryClientFor(profileId) {
  const home = profiles.openSession(profileId);
  const binary = resolveCodexBinary(process.resourcesPath, app.getAppPath());
  const client = new CodexClient(binary, home);
  return {
    client,
    close: () => {
      client.stop();
      profiles.closeSession(home);
    }
  };
}

async function refreshMetrics(profileId) {
  const temporary = temporaryClientFor(profileId);
  try {
    const metrics = await temporary.client.metrics();
    profiles.setMetrics(profileId, metrics);
    return metrics;
  } finally {
    temporary.close();
  }
}

async function withAccountOperation(operation, options = {}) {
  if (accountOperationPromise) {
    if (options.skipIfBusy) return null;
    throw new Error('Wait for the current account operation to finish.');
  }
  const running = Promise.resolve().then(operation);
  accountOperationPromise = running;
  try {
    return await running;
  } finally {
    if (accountOperationPromise === running) accountOperationPromise = null;
  }
}

async function activateAndLaunchCodex(id, automatic = false) {
  const profile = profiles.state.profiles.find((item) => item.id === id);
  if (!profile) throw new Error('Account not found.');
  sendStatus(automatic
    ? `The limit is exhausted. Closing Codex and switching to ${profile.email}…`
    : 'Closing Codex before switching accounts…');
  const launch = await switchAccountSafely({
    lifecycle: codexLifecycle,
    activate: () => {
      if (automatic && !profiles.publicSettings().autoSwitchEnabled) {
        throw new Error('Auto-switch was disabled. The account was not changed.');
      }
      profiles.activate(id);
    }
  });
  sendStatus(automatic
    ? (launch.restarted ? `Automatically connected ${profile.email}. Codex is running.` : `Automatically connected ${profile.email}. ${launch.reason}`)
    : (launch.restarted ? 'Account connected. Codex is running.' : launch.reason));
  return launch;
}

function snapshot() {
  return {
    profiles: profiles.publicProfiles(),
    selectedId: profiles.state.selectedId,
    deletedCount: profiles.state.deleted.length,
    settings: profiles.publicSettings(),
    automation: { ...autoSwitchRuntime },
    guides: guides.guides(),
    localMode: true,
    platform: process.platform,
    version: app.getVersion(),
    build: BUILD_NUMBER
  };
}

async function bootstrap() {
  profiles.migrateManagedProfilesToPersonal();
  profiles.importActiveProfile();
  if (profiles.publicSettings().autoSwitchEnabled) setTimeout(() => autoSwitchTick().catch(() => {}), 750);
  return snapshot();
}

async function addAccount() {
  if (loginClient) throw new Error('Another account sign-in is already in progress.');
  const pending = profiles.createPendingProfile();
  pendingLoginId = pending.id;
  const binary = resolveCodexBinary(process.resourcesPath, app.getAppPath());
  loginClient = new CodexClient(binary, pending.home);
  sendStatus('Opening the official Codex sign-in…');
  let completed = false;
  try {
    await loginClient.login(openOpenAIUrl);
    const account = await loginClient.account().catch(() => null);
    const metrics = await loginClient.metrics().catch(() => null);
    loginClient.stop();
    loginClient = null;
    const profile = profiles.completeProfile(pending.id, account?.email, metrics);
    completed = true;
    sendStatus('Account added. Select it and click Connect.');
    return snapshot();
  } finally {
    loginClient?.stop();
    loginClient = null;
    if (!completed) profiles.cancelPendingProfile(pending.id);
    pendingLoginId = null;
  }
}

async function connectAccount(id) {
  if (!profiles.state.profiles.some((profile) => profile.id === id)) throw new Error('Account not found.');
  profiles.select(id);
  sendStatus('Checking limits and connecting the account…');
  try { await refreshMetrics(id); } catch {}
  await activateAndLaunchCodex(id, false);
  return snapshot();
}

async function autoSwitchTick() {
  if (!profiles || loginClient || accountOperationPromise || !profiles.publicSettings().autoSwitchEnabled) return null;
  return withAccountOperation(async () => {
    if (!profiles.publicSettings().autoSwitchEnabled) return null;
    autoSwitchRuntime.checking = true;
    autoSwitchRuntime.lastError = null;
    sendSnapshot();
    try {
      const visibleProfiles = profiles.publicProfiles();
      const active = visibleProfiles.find((profile) => profile.active);
      if (!active || visibleProfiles.length < 2) return { action: 'not-enough-accounts' };
      profiles.captureActiveProfile();
      try {
        const result = await runAutoSwitchCycle({
          profiles: profiles.publicProfiles(),
          activeId: active.id,
          refreshMetrics: async (id) => {
            const metrics = await refreshMetrics(id);
            sendSnapshot();
            return metrics;
          },
          isEnabled: () => profiles.publicSettings().autoSwitchEnabled,
          onExhausted: () => sendStatus(`${active.email} has exhausted its limit. Looking for the next account…`),
          switchAccount: (id) => activateAndLaunchCodex(id, true)
        });
        if (result.action === 'no-available-account') {
          autoSwitchRuntime.lastError = 'The limits are exhausted and no other available account was found.';
          sendStatus(autoSwitchRuntime.lastError);
        }
        if (result.action === 'switched') autoSwitchRuntime.lastSwitchAt = new Date().toISOString();
        return result;
      } catch (error) {
        autoSwitchRuntime.lastError = error.autoSwitchStage === 'current-metrics'
          ? `Could not check the limit for ${active.email}: ${error.message}`
          : error.message;
        sendStatus(`Auto-switch: ${error.message}`);
        return { action: 'error', error };
      } finally {
        autoSwitchRuntime.lastCheckedAt = new Date().toISOString();
      }
    } finally {
      autoSwitchRuntime.checking = false;
      sendSnapshot();
    }
  }, { skipIfBusy: true });
}

function trustedSender(event) {
  const source = event.senderFrame?.url || event.sender?.getURL?.() || '';
  return source === RENDERER_URL;
}

function handle(channel, action) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trustedSender(event)) throw new Error('Request rejected: untrusted source.');
    return action(...args);
  });
}

function registerIPC() {
  handle('bootstrap', () => bootstrap());
  handle('accounts:select', (id) => { profiles.select(id); return snapshot(); });
  handle('accounts:add', () => withAccountOperation(addAccount));
  handle('accounts:cancel-login', () => {
    loginClient?.stop();
    loginClient = null;
    if (pendingLoginId) profiles.cancelPendingProfile(pendingLoginId);
    pendingLoginId = null;
  });
  handle('accounts:connect', (id) => withAccountOperation(() => connectAccount(id)));
  handle('accounts:refresh', (id) => withAccountOperation(async () => {
    profiles.select(id);
    sendStatus('Refreshing limits for the selected account…');
    await refreshMetrics(id);
    sendStatus('Limits refreshed.');
    return snapshot();
  }));
  handle('accounts:remove', (id) => withAccountOperation(async () => {
    const profile = profiles.state.profiles.find((item) => item.id === id);
    if (!profile) throw new Error('Account not found.');
    const result = await dialog.showMessageBox(window, {
      type: 'warning',
      buttons: ['Cancel', 'Remove account'],
      defaultId: 0,
      cancelId: 0,
      title: 'Remove account?',
      message: profile.email,
      detail: 'The encrypted profile will be moved to a local archive and remain available for restoration.'
    });
    if (result.response === 1) profiles.remove(id);
    return snapshot();
  }));
  handle('accounts:restore', () => { profiles.restoreLast(); return snapshot(); });
  handle('settings:auto-switch', (enabled) => {
    profiles.setAutoSwitchEnabled(enabled === true);
    autoSwitchRuntime.lastError = null;
    sendStatus(enabled === true
      ? 'Auto-switch is enabled. The active account will be checked once per minute.'
      : 'Auto-switch is disabled.');
    const current = snapshot();
    if (enabled === true) setTimeout(() => autoSwitchTick().catch(() => {}), 100);
    return current;
  });
  handle('guides:save', (sectionId, title, content) => {
    guides.save(sectionId, title, content);
    sendSnapshot();
    return snapshot();
  });
  handle('guides:reset', (sectionId) => {
    guides.reset(sectionId);
    sendSnapshot();
    return snapshot();
  });
  handle('support:copy-diagnostics', () => {
    clipboard.writeText(diagnosticsText({
      appVersion: app.getVersion(),
      build: BUILD_NUMBER,
      platform: process.platform,
      osVersion: os.release(),
      autoSwitch: {
        enabled: profiles.publicSettings().autoSwitchEnabled,
        lastCheckedAt: autoSwitchRuntime.lastCheckedAt,
        lastError: autoSwitchRuntime.lastError
      }
    }));
    return true;
  });
  handle('support:open-chatgpt', () => openOpenAIUrl('https://chatgpt.com/'));
}

function rendererFile(urlValue) {
  try {
    const parsed = new URL(urlValue);
    if (parsed.protocol !== 'app:' || parsed.hostname !== 'renderer') return null;
    const relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(RENDERER_ROOT, relative);
    const insideRoot = file === RENDERER_ROOT || file.startsWith(`${RENDERER_ROOT}${path.sep}`);
    return insideRoot ? file : null;
  } catch {
    return null;
  }
}

function registerLocalProtocol() {
  protocol.handle('app', (request) => {
    const file = rendererFile(request.url);
    if (!file || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return new Response('Not found', { status: 404 });
    const type = CONTENT_TYPES.get(path.extname(file).toLowerCase()) || 'application/octet-stream';
    return new Response(fs.readFileSync(file), { status: 200, headers: { 'Content-Type': type } });
  });
}

function createWindow() {
  window = new BrowserWindow({
    width: 620,
    height: 720,
    minWidth: 520,
    minHeight: 500,
    title: 'Codex Switcher',
    backgroundColor: '#151515',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      devTools: !app.isPackaged
    }
  });
  window.once('ready-to-show', () => {
    if (!window || window.isDestroyed()) return;
    window.show();
    window.focus();
    if (process.platform === 'darwin') app.focus({ steal: true });
  });
  window.webContents.on('will-navigate', (event, target) => {
    if (target !== RENDERER_URL) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('context-menu', (_event, params) => {
    const template = contextMenuTemplate(params);
    if (template.length > 0) Menu.buildFromTemplate(template).popup({ window });
  });
  window.loadURL(RENDERER_URL).catch((error) => {
    dialog.showErrorBox('Codex Switcher', `Could not open the local interface: ${error.message}`);
  });
}

app.whenReady().then(() => {
  registerLocalProtocol();
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setSpellCheckerEnabled(false);
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate(applicationMenuTemplate(process.platform)));
  else Menu.setApplicationMenu(null);
  const dataRoot = process.env.CODEX_SWITCHER_DATA_ROOT || app.getPath('userData');
  profiles = new ProfileStore(dataRoot, { safeStorage });
  guides = new GuideStore(dataRoot);
  codexLifecycle = new CodexLifecycle();
  registerIPC();
  createWindow();
  autoSwitchTimer = setInterval(() => autoSwitchTick().catch(() => {}), AUTO_SWITCH_INTERVAL_MS);
  app.on('activate', () => {
    const existing = BrowserWindow.getAllWindows()[0];
    if (existing) existing.show();
    else createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (autoSwitchTimer) clearInterval(autoSwitchTimer);
  loginClient?.stop();
  profiles?.cleanupSessions();
});

module.exports = { isAllowedOpenAIUrl, rendererFile, RENDERER_URL };
