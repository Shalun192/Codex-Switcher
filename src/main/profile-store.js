'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { validateAuth, accountIdentity, emailFromAuth } = require('../shared/auth');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function ensurePrivateDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') fs.chmodSync(directory, 0o700);
}

function atomicWrite(file, bytes, mode = 0o600) {
  const directory = path.dirname(file);
  ensurePrivateDirectory(directory);
  const temporary = path.join(directory, `.${path.basename(file)}.${crypto.randomUUID()}.tmp`);
  const backup = path.join(directory, `.${path.basename(file)}.${crypto.randomUUID()}.bak`);
  fs.writeFileSync(temporary, bytes, { mode });
  if (process.platform !== 'win32') fs.chmodSync(temporary, mode);
  let movedOriginal = false;
  try {
    if (fs.existsSync(file)) {
      fs.renameSync(file, backup);
      movedOriginal = true;
    }
    fs.renameSync(temporary, file);
    if (movedOriginal) fs.rmSync(backup, { force: true });
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    if (movedOriginal && !fs.existsSync(file) && fs.existsSync(backup)) fs.renameSync(backup, file);
    throw error;
  }
}

function recoverAtomicWrite(file) {
  const directory = path.dirname(file);
  if (!fs.existsSync(directory)) return;
  const prefix = `.${path.basename(file)}.`;
  const artifacts = fs.readdirSync(directory)
    .filter((name) => name.startsWith(prefix) && (name.endsWith('.bak') || name.endsWith('.tmp')))
    .map((name) => ({ name, file: path.join(directory, name), stat: fs.statSync(path.join(directory, name)) }))
    .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
  if (!fs.existsSync(file)) {
    const backup = artifacts.find((item) => item.name.endsWith('.bak'));
    if (backup) fs.renameSync(backup.file, file);
  }
  for (const artifact of artifacts) fs.rmSync(artifact.file, { force: true });
}

function rootTomlParts(source) {
  const sectionIndex = source.search(/^\s*\[/m);
  const rootEnd = sectionIndex < 0 ? source.length : sectionIndex;
  return { root: source.slice(0, rootEnd), rest: source.slice(rootEnd) };
}

function setRootTomlSetting(source, key, value) {
  const { root, rest } = rootTomlParts(source);
  const expression = new RegExp(`^\\s*${key}\\s*=.*(?:\\r?\\n|$)`, 'm');
  let updatedRoot = root.replace(expression, '');
  if (value !== null && value !== undefined) updatedRoot = `${key} = ${JSON.stringify(String(value))}\n${updatedRoot}`;
  return updatedRoot + rest;
}

class ProfileStore {
  constructor(root, options = {}) {
    this.root = root;
    this.safeStorage = options.safeStorage || null;
    this.profilesDirectory = path.join(root, 'accounts');
    this.deletedDirectory = path.join(root, 'deleted-accounts');
    this.sessionsDirectory = path.join(root, 'temporary-sessions');
    this.metadataFile = path.join(root, 'profiles.json');
    this.policyBaselineFile = path.join(root, 'managed-policy-baseline.json');
    this.globalAuthFile = options.globalAuthFile || path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'auth.json');
    this.globalConfigFile = path.join(path.dirname(this.globalAuthFile), 'config.toml');
    this.pendingSessions = new Map();
    ensurePrivateDirectory(root);
    ensurePrivateDirectory(this.profilesDirectory);
    ensurePrivateDirectory(this.deletedDirectory);
    recoverAtomicWrite(this.metadataFile);
    recoverAtomicWrite(this.globalAuthFile);
    recoverAtomicWrite(this.globalConfigFile);
    fs.rmSync(this.sessionsDirectory, { recursive: true, force: true });
    ensurePrivateDirectory(this.sessionsDirectory);
    this.state = this.loadState();
  }

  loadState() {
    const parsed = readJson(this.metadataFile);
    if (!parsed || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.deleted)) {
      return { profiles: [], deleted: [], selectedId: null, settings: { autoSwitchEnabled: false } };
    }
    return {
      profiles: parsed.profiles.filter((item) => item && typeof item.id === 'string'),
      deleted: parsed.deleted.filter((item) => item && typeof item.id === 'string'),
      selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : null,
      settings: { autoSwitchEnabled: parsed.settings?.autoSwitchEnabled === true }
    };
  }

  save() {
    atomicWrite(this.metadataFile, Buffer.from(JSON.stringify(this.state, null, 2)));
  }

  profileHome(id) {
    return path.join(this.profilesDirectory, id);
  }

  legacyAuthFile(id) {
    return path.join(this.profileHome(id), 'auth.json');
  }

  encryptedAuthFile(id) {
    return path.join(this.profileHome(id), 'credentials.enc.json');
  }

  requireEncryption() {
    if (!this.safeStorage || !this.safeStorage.isEncryptionAvailable()) {
      throw new Error('Protected operating-system storage is unavailable. Authorization was not saved.');
    }
  }

  writeStoredAuth(id, auth) {
    if (!validateAuth(auth)) throw new Error('Codex did not save valid authorization data. Please sign in again.');
    this.requireEncryption();
    const ciphertext = this.safeStorage.encryptString(JSON.stringify(auth)).toString('base64');
    atomicWrite(this.encryptedAuthFile(id), Buffer.from(JSON.stringify({ version: 1, ciphertext })));
    fs.rmSync(this.legacyAuthFile(id), { force: true });
  }

  readStoredAuth(id) {
    recoverAtomicWrite(this.encryptedAuthFile(id));
    const encrypted = readJson(this.encryptedAuthFile(id));
    if (encrypted?.version === 1 && typeof encrypted.ciphertext === 'string') {
      this.requireEncryption();
      try {
        const plaintext = this.safeStorage.decryptString(Buffer.from(encrypted.ciphertext, 'base64'));
        const auth = JSON.parse(plaintext);
        return validateAuth(auth) ? auth : null;
      } catch {
        return null;
      }
    }
    const legacy = readJson(this.legacyAuthFile(id));
    if (!validateAuth(legacy)) return null;
    this.writeStoredAuth(id, legacy);
    return legacy;
  }

  publicProfiles() {
    const active = this.activeIdentity();
    return this.state.profiles.map((profile) => ({
      ...profile,
      connected: Boolean(this.readStoredAuth(profile.id)),
      active: Boolean(active && active === this.profileIdentity(profile.id))
    }));
  }

  createPendingProfile() {
    const id = crypto.randomUUID();
    const home = path.join(this.sessionsDirectory, `login-${id}`);
    ensurePrivateDirectory(home);
    this.pendingSessions.set(id, home);
    return { id, home };
  }

  completeProfile(id, suggestedEmail, metrics = null) {
    const home = this.pendingSessions.get(id);
    const auth = home ? readJson(path.join(home, 'auth.json')) : null;
    if (!validateAuth(auth)) throw new Error('Codex did not save valid authorization data. Please sign in again.');
    const identity = accountIdentity(auth);
    const duplicate = identity && this.state.profiles.find((profile) => this.profileIdentity(profile.id) === identity);
    if (duplicate) {
      this.writeStoredAuth(duplicate.id, auth);
      if (metrics) {
        duplicate.metrics = metrics;
        duplicate.metricsUpdatedAt = new Date().toISOString();
      }
      this.closePendingProfile(id);
      this.state.selectedId = duplicate.id;
      this.save();
      return duplicate;
    }
    const profile = {
      id,
      email: emailFromAuth(auth) || suggestedEmail || `Codex account ${this.state.profiles.length + 1}`,
      createdAt: new Date().toISOString(),
      metrics,
      metricsUpdatedAt: metrics ? new Date().toISOString() : null
    };
    ensurePrivateDirectory(this.profileHome(id));
    this.writeStoredAuth(id, auth);
    this.closePendingProfile(id);
    this.state.profiles.push(profile);
    this.state.selectedId = id;
    this.save();
    return profile;
  }

  closePendingProfile(id) {
    const home = this.pendingSessions.get(id);
    if (home) fs.rmSync(home, { recursive: true, force: true });
    this.pendingSessions.delete(id);
  }

  cancelPendingProfile(id) {
    this.closePendingProfile(id);
  }

  openSession(id) {
    const auth = this.readStoredAuth(id);
    if (!auth) throw new Error('Add an account through the official Codex sign-in first.');
    const home = path.join(this.sessionsDirectory, `session-${crypto.randomUUID()}`);
    ensurePrivateDirectory(home);
    atomicWrite(path.join(home, 'auth.json'), Buffer.from(JSON.stringify(auth)));
    return home;
  }

  closeSession(home) {
    const relative = path.relative(this.sessionsDirectory, home);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return;
    fs.rmSync(home, { recursive: true, force: true });
  }

  select(id) {
    if (!this.state.profiles.some((profile) => profile.id === id)) throw new Error('Account not found.');
    this.state.selectedId = id;
    this.save();
  }

  publicSettings() {
    return { autoSwitchEnabled: this.state.settings.autoSwitchEnabled === true };
  }

  setAutoSwitchEnabled(enabled) {
    this.state.settings.autoSwitchEnabled = enabled === true;
    this.save();
    return this.publicSettings();
  }

  setMetrics(id, metrics) {
    const profile = this.state.profiles.find((item) => item.id === id);
    if (!profile) throw new Error('Account not found.');
    profile.metrics = metrics || null;
    profile.metricsUpdatedAt = new Date().toISOString();
    this.save();
  }

  profileIdentity(id) {
    return accountIdentity(this.readStoredAuth(id));
  }

  importActiveProfile() {
    const auth = readJson(this.globalAuthFile);
    const identity = accountIdentity(auth);
    if (!auth || !identity) return null;
    const existing = this.state.profiles.find((item) => this.profileIdentity(item.id) === identity);
    if (existing) {
      this.writeStoredAuth(existing.id, auth);
      return existing;
    }
    const id = crypto.randomUUID();
    const profile = {
      id,
      email: emailFromAuth(auth) || `Codex account ${this.state.profiles.length + 1}`,
      createdAt: new Date().toISOString(),
      metrics: null,
      metricsUpdatedAt: null
    };
    ensurePrivateDirectory(this.profileHome(id));
    this.writeStoredAuth(id, auth);
    this.state.profiles.push(profile);
    this.state.selectedId = id;
    this.save();
    return profile;
  }

  activeIdentity() {
    return accountIdentity(readJson(this.globalAuthFile));
  }

  captureActiveProfile() {
    const activeAuth = readJson(this.globalAuthFile);
    const identity = accountIdentity(activeAuth);
    if (!identity) return null;
    const profile = this.state.profiles.find((item) => this.profileIdentity(item.id) === identity);
    if (!profile) return null;
    this.writeStoredAuth(profile.id, activeAuth);
    return profile.id;
  }

  ensurePersonalCredentialStorage() {
    const original = fs.existsSync(this.globalConfigFile) ? fs.readFileSync(this.globalConfigFile, 'utf8') : '';
    const storedBaseline = readJson(this.policyBaselineFile);
    const baseline = storedBaseline && typeof storedBaseline === 'object'
      ? storedBaseline
      : { forcedLoginMethod: null, forcedWorkspaceId: null };
    let updated = setRootTomlSetting(original, 'cli_auth_credentials_store', 'file');
    updated = setRootTomlSetting(updated, 'forced_login_method', baseline.forcedLoginMethod);
    updated = setRootTomlSetting(updated, 'forced_chatgpt_workspace_id', baseline.forcedWorkspaceId);
    if (updated === original) return;
    if (original && !fs.existsSync(path.join(this.root, 'backups', 'config-before-switcher.toml'))) {
      const backupDirectory = path.join(this.root, 'backups');
      ensurePrivateDirectory(backupDirectory);
      atomicWrite(path.join(backupDirectory, 'config-before-switcher.toml'), Buffer.from(original));
    }
    atomicWrite(this.globalConfigFile, Buffer.from(updated));
  }

  migrateManagedProfilesToPersonal() {
    let changed = false;
    for (const collection of [this.state.profiles, this.state.deleted]) {
      for (const profile of collection) {
        for (const key of ['managedAccessId', 'workspaceId', 'accessName']) {
          if (Object.prototype.hasOwnProperty.call(profile, key)) {
            delete profile[key];
            changed = true;
          }
        }
      }
    }
    if (this.state.profiles.length > 0) this.ensurePersonalCredentialStorage();
    if (changed) this.save();
    return changed;
  }

  activate(id) {
    const profile = this.state.profiles.find((item) => item.id === id);
    if (!profile) throw new Error('Account not found.');
    const auth = this.readStoredAuth(id);
    if (!auth) throw new Error('Add an account through the official Codex sign-in first.');
    this.captureActiveProfile();
    this.ensurePersonalCredentialStorage();
    atomicWrite(this.globalAuthFile, Buffer.from(JSON.stringify(auth)));
    if (this.activeIdentity() !== accountIdentity(auth)) throw new Error('Codex account-switch verification failed.');
    this.state.selectedId = id;
    this.save();
  }

  remove(id) {
    const index = this.state.profiles.findIndex((profile) => profile.id === id);
    if (index < 0) throw new Error('Account not found.');
    const profile = this.state.profiles[index];
    const archivedName = `${id}-${Date.now()}`;
    const source = this.profileHome(id);
    const destination = path.join(this.deletedDirectory, archivedName);
    if (fs.existsSync(source)) fs.renameSync(source, destination);
    this.state.profiles.splice(index, 1);
    this.state.deleted.unshift({ ...profile, archivedName, deletedAt: new Date().toISOString() });
    if (this.state.selectedId === id) this.state.selectedId = this.state.profiles[0]?.id || null;
    this.save();
  }

  restoreLast() {
    const archived = this.state.deleted.shift();
    if (!archived) throw new Error('There are no removed accounts to restore.');
    const source = path.join(this.deletedDirectory, archived.archivedName);
    const destination = this.profileHome(archived.id);
    if (!fs.existsSync(source)) throw new Error('The archive for this account was not found.');
    fs.renameSync(source, destination);
    const { archivedName, deletedAt, ...profile } = archived;
    this.state.profiles.push(profile);
    this.state.selectedId = profile.id;
    this.save();
    return profile;
  }

  cleanupSessions() {
    fs.rmSync(this.sessionsDirectory, { recursive: true, force: true });
  }
}

module.exports = { ProfileStore, atomicWrite, recoverAtomicWrite, readJson, ensurePrivateDirectory };
