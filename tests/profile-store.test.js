'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ProfileStore, recoverAtomicWrite } = require('../src/main/profile-store');

const fakeSafeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from([...value].reverse().join('')),
  decryptString: (value) => [...value.toString()].reverse().join('')
};

function options(globalAuthFile) {
  return { globalAuthFile, safeStorage: fakeSafeStorage };
}

function auth(account, email) {
  const payload = Buffer.from(JSON.stringify({ email })).toString('base64url');
  return { auth_mode: 'chatgpt', tokens: { refresh_token: `refresh-token-${account}`, account_id: account, id_token: `x.${payload}.x` } };
}

test('selection is passive, activation is explicit, and delete is reversible', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const global = path.join(root, 'global', 'auth.json');
  const store = new ProfileStore(path.join(root, 'app'), options(global));
  const first = store.createPendingProfile();
  fs.writeFileSync(path.join(first.home, 'auth.json'), JSON.stringify(auth('one', 'one@example.com')));
  store.completeProfile(first.id);
  const encrypted = fs.readFileSync(store.encryptedAuthFile(first.id), 'utf8');
  assert.doesNotMatch(encrypted, /refresh-token-one/);
  assert.equal(fs.existsSync(store.legacyAuthFile(first.id)), false);
  const second = store.createPendingProfile();
  fs.writeFileSync(path.join(second.home, 'auth.json'), JSON.stringify(auth('two', 'two@example.com')));
  store.completeProfile(second.id);
  const sessionHome = store.openSession(first.id);
  assert.equal(fs.existsSync(path.join(sessionHome, 'auth.json')), true);
  store.closeSession(sessionHome);
  assert.equal(fs.existsSync(sessionHome), false);

  store.activate(first.id);
  assert.equal(store.activeIdentity(), 'chatgpt:one');
  assert.match(fs.readFileSync(path.join(root, 'global', 'config.toml'), 'utf8'), /^cli_auth_credentials_store = "file"/);
  store.select(second.id);
  assert.equal(store.activeIdentity(), 'chatgpt:one', 'clicking a row must not switch Codex');
  store.activate(second.id);
  assert.equal(store.activeIdentity(), 'chatgpt:two');
  store.activate(first.id);
  const personalConfig = fs.readFileSync(path.join(root, 'global', 'config.toml'), 'utf8');
  assert.doesNotMatch(personalConfig, /forced_chatgpt_workspace_id/);
  assert.equal(fs.existsSync(global), true);

  store.remove(first.id);
  assert.equal(store.publicProfiles().length, 1);
  assert.equal(store.state.deleted.length, 1);
  store.restoreLast();
  assert.equal(store.publicProfiles().length, 2);
  assert.equal(store.profileIdentity(first.id), 'chatgpt:one');
});

test('migrates legacy managed metadata to personal without deleting authorization', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-personal-migration-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const global = path.join(root, 'global', 'auth.json');
  const store = new ProfileStore(path.join(root, 'app'), options(global));
  const pending = store.createPendingProfile();
  fs.writeFileSync(path.join(pending.home, 'auth.json'), JSON.stringify(auth('legacy', 'legacy@example.com')));
  const profile = store.completeProfile(pending.id);
  Object.assign(profile, {
    managedAccessId: 'WSP-LEGACY-1',
    workspaceId: '11111111-aaaa-4bbb-8ccc-222222222222',
    accessName: 'Legacy Team'
  });
  store.save();
  fs.mkdirSync(path.dirname(global), { recursive: true });
  fs.writeFileSync(path.join(root, 'global', 'config.toml'), 'forced_login_method = "chatgpt"\nforced_chatgpt_workspace_id = "11111111-aaaa-4bbb-8ccc-222222222222"\n');
  fs.writeFileSync(path.join(root, 'app', 'managed-policy-baseline.json'), JSON.stringify({ forcedLoginMethod: null, forcedWorkspaceId: null }));

  assert.equal(store.migrateManagedProfilesToPersonal(), true);
  const migrated = store.publicProfiles()[0];
  assert.equal(migrated.managedAccessId, undefined);
  assert.equal(migrated.workspaceId, undefined);
  assert.equal(migrated.accessName, undefined);
  assert.equal(store.publicProfiles().length, 1);
  assert.equal(store.profileIdentity(profile.id), 'chatgpt:legacy');
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'global', 'config.toml'), 'utf8'), /forced_chatgpt_workspace_id/);
});

test('imports the already active Codex account locally without duplicates', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-import-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const global = path.join(root, 'global', 'auth.json');
  fs.mkdirSync(path.dirname(global), { recursive: true });
  fs.writeFileSync(global, JSON.stringify(auth('active', 'active@example.com')));
  const store = new ProfileStore(path.join(root, 'app'), options(global));
  const imported = store.importActiveProfile();
  assert.equal(imported.email, 'active@example.com');
  assert.equal(store.publicProfiles().length, 1);
  assert.equal(store.publicProfiles()[0].active, true);
  store.importActiveProfile();
  assert.equal(store.publicProfiles().length, 1);
});

test('auto-switch preference is local, disabled by default, and survives restart', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-settings-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const appRoot = path.join(root, 'app');
  const global = path.join(root, 'global', 'auth.json');
  const store = new ProfileStore(appRoot, options(global));
  assert.deepEqual(store.publicSettings(), { autoSwitchEnabled: false });
  store.setAutoSwitchEnabled(true);
  assert.deepEqual(new ProfileStore(appRoot, options(global)).publicSettings(), { autoSwitchEnabled: true });
  store.setAutoSwitchEnabled(false);
  assert.deepEqual(new ProfileStore(appRoot, options(global)).publicSettings(), { autoSwitchEnabled: false });
});

test('refuses to persist a new account when OS encryption is unavailable', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-encryption-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new ProfileStore(path.join(root, 'app'), {
    globalAuthFile: path.join(root, 'global', 'auth.json'),
    safeStorage: { isEncryptionAvailable: () => false }
  });
  const pending = store.createPendingProfile();
  fs.writeFileSync(path.join(pending.home, 'auth.json'), JSON.stringify(auth('secure', 'secure@example.com')));
  assert.throws(() => store.completeProfile(pending.id), /Защищённое хранилище ОС недоступно/);
  assert.equal(store.publicProfiles().length, 0);
});

test('recovers an interrupted atomic replacement without leaving plaintext backups', (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-switcher-recovery-test-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'auth.json');
  const backup = path.join(root, '.auth.json.fixture.bak');
  const temporary = path.join(root, '.auth.json.fixture.tmp');
  fs.writeFileSync(backup, 'previous-value');
  fs.writeFileSync(temporary, 'incomplete-value');
  recoverAtomicWrite(file);
  assert.equal(fs.readFileSync(file, 'utf8'), 'previous-value');
  assert.equal(fs.existsSync(backup), false);
  assert.equal(fs.existsSync(temporary), false);
});
