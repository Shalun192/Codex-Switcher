'use strict';

const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

function packagedCodexPath(resourcesPath, platform = process.platform, arch = process.arch) {
  const platformArch = `${platform}-${arch}`;
  return path.join(resourcesPath, 'codex', platformArch, platform === 'win32' ? 'codex.exe' : 'codex');
}

function resolveCodexBinary(resourcesPath, appPath) {
  const override = process.env.CODEX_SWITCHER_CODEX_BINARY;
  const candidates = [];
  if (override) candidates.push(override);
  candidates.push(packagedCodexPath(resourcesPath));
  candidates.push(path.join(appPath, 'vendor', 'codex', `${process.platform}-${process.arch}`, process.platform === 'win32' ? 'codex.exe' : 'codex'));
  if (process.platform === 'darwin') candidates.push('/Applications/ChatGPT.app/Contents/Resources/codex');
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  const lookup = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [process.platform === 'win32' ? 'codex.exe' : 'codex'], { encoding: 'utf8' });
  const found = lookup.status === 0 ? lookup.stdout.trim().split(/\r?\n/)[0] : '';
  if (found) return found;
  throw new Error('The official Codex executable was not found. Reinstall the app or Codex CLI.');
}

class CodexClient extends EventEmitter {
  constructor(binary, codexHome) {
    super();
    this.binary = binary;
    this.codexHome = codexHome;
    this.buffer = '';
    this.nextId = 1;
    this.pending = new Map();
    this.process = null;
  }

  async start() {
    if (this.process) return;
    fs.mkdirSync(this.codexHome, { recursive: true, mode: 0o700 });
    const environment = { ...process.env, CODEX_HOME: this.codexHome };
    delete environment.OPENAI_API_KEY;
    delete environment.CODEX_ACCESS_TOKEN;
    const args = ['app-server', '--listen', 'stdio://', '-c', 'cli_auth_credentials_store="file"'];
    this.process = spawn(this.binary, args, {
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    this.process.stdout.setEncoding('utf8');
    this.process.stdout.on('data', (chunk) => this.consume(chunk));
    this.process.stderr.on('data', () => {});
    this.process.once('exit', (code) => {
      const error = new Error(code === 0 ? 'The Codex app server stopped.' : 'The Codex app server exited with an error.');
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
      this.process = null;
      this.emit('exit', error);
    });
    this.process.once('error', (error) => this.emit('process-error', error));
    await this.request('initialize', {
      clientInfo: { name: 'codex-switcher-local', title: 'Codex Switcher', version: '4.6.4' },
      capabilities: { experimentalApi: true }
    });
    this.notify('initialized', {});
  }

  consume(chunk) {
    this.buffer += chunk;
    while (true) {
      const newline = this.buffer.indexOf('\n');
      if (newline < 0) break;
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (typeof message.id === 'number') {
        const entry = this.pending.get(message.id);
        if (!entry) continue;
        clearTimeout(entry.timer);
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message || 'Codex app server error'));
        else entry.resolve(message.result || {});
      } else if (typeof message.method === 'string') {
        this.emit(message.method, message.params || {});
      }
    }
  }

  request(method, params, timeoutMs = 30000) {
    if (!this.process || !this.process.stdin.writable) return Promise.reject(new Error('The Codex app server is not running.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex did not respond to ${method}.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params: params || {} })}\n`);
    });
  }

  notify(method, params) {
    if (this.process && this.process.stdin.writable) {
      this.process.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params: params || {} })}\n`);
    }
  }

  async login(openUrl) {
    await this.start();
    let cleanup = () => {};
    const completedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('The sign-in timed out. Please try again.'));
      }, 10 * 60 * 1000);
      const completed = (params) => {
        cleanup();
        if (params.success) resolve(params);
        else reject(new Error(params.error || 'Codex authorization did not complete.'));
      };
      const exited = (error) => { cleanup(); reject(error); };
      cleanup = () => {
        clearTimeout(timer);
        this.off('account/login/completed', completed);
        this.off('exit', exited);
      };
      this.on('account/login/completed', completed);
      this.on('exit', exited);
    });
    try {
      const result = await this.request('account/login/start', {
        type: 'chatgpt',
        appBrand: 'codex',
        codexStreamlinedLogin: true,
        useHostedLoginSuccessPage: true
      });
      if (typeof result.authUrl !== 'string') throw new Error('Codex did not return an authorization URL.');
      await openUrl(result.authUrl);
      return await completedPromise;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  async account() {
    await this.start();
    const result = await this.request('account/read', { refreshToken: false });
    return result.account || null;
  }

  async metrics() {
    await this.start();
    const [accountResult, rateResult] = await Promise.allSettled([
      this.request('account/read', { refreshToken: false }),
      this.request('account/rateLimits/read', {})
    ]);
    const account = accountResult.status === 'fulfilled' ? accountResult.value.account || {} : {};
    const rateLimits = rateResult.status === 'fulfilled' ? rateResult.value.rateLimits || {} : {};
    const primary = rateLimits.primary || {};
    const secondary = rateLimits.secondary || {};
    const metrics = {};
    if (typeof primary.usedPercent === 'number') metrics.primaryRemainingPercent = Math.max(0, Math.round(100 - primary.usedPercent));
    if (typeof secondary.usedPercent === 'number') metrics.secondaryRemainingPercent = Math.max(0, Math.round(100 - secondary.usedPercent));
    if (typeof primary.resetsAt === 'number') metrics.primaryResetsAt = primary.resetsAt;
    if (typeof secondary.resetsAt === 'number') metrics.secondaryResetsAt = secondary.resetsAt;
    metrics.planType = rateLimits.planType || account.planType || null;
    if (!Object.keys(metrics).some((key) => key.endsWith('Percent'))) {
      const reason = rateResult.status === 'rejected' ? rateResult.reason.message : 'Usage limits are temporarily unavailable.';
      throw new Error(reason);
    }
    return metrics;
  }

  stop() {
    if (!this.process) return;
    try { this.process.stdin.end(); } catch {}
    const child = this.process;
    setTimeout(() => { if (!child.killed) child.kill(); }, 500).unref();
  }
}

module.exports = { CodexClient, resolveCodexBinary, packagedCodexPath };
