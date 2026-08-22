'use strict';

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const MAC_BUNDLE_ID = 'com.openai.codex';

const WINDOWS_STOP_SCRIPT = [
  "$names = @('Codex', 'ChatGPT')",
  '$processes = @(Get-Process -Name $names -ErrorAction SilentlyContinue)',
  'foreach ($process in $processes) { try { $null = $process.CloseMainWindow() } catch {} }',
  '$deadline = (Get-Date).AddSeconds(6)',
  'do {',
  '  $remaining = @(Get-Process -Name $names -ErrorAction SilentlyContinue)',
  '  if ($remaining.Count -eq 0) { break }',
  '  Start-Sleep -Milliseconds 250',
  '} while ((Get-Date) -lt $deadline)',
  '$remaining = @(Get-Process -Name $names -ErrorAction SilentlyContinue)',
  'if ($remaining.Count -gt 0) { $remaining | Stop-Process -Force -ErrorAction Stop }',
  'Start-Sleep -Milliseconds 300',
  'if (@(Get-Process -Name $names -ErrorAction SilentlyContinue).Count -gt 0) { throw "Codex process is still running" }'
].join('\n');

const WINDOWS_START_SCRIPT = [
  "$target = Get-StartApps | Where-Object { $_.Name -match '(Codex|ChatGPT)' } | Sort-Object @{ Expression = { if ($_.Name -match 'Codex') { 0 } else { 1 } } } | Select-Object -First 1",
  'if ($target) {',
  '  Start-Process explorer.exe ("shell:AppsFolder\\" + $target.AppID)',
  '  exit 0',
  '}',
  '$paths = @(',
  '  "$env:LOCALAPPDATA\\Programs\\Codex\\Codex.exe",',
  '  "$env:LOCALAPPDATA\\Programs\\ChatGPT\\ChatGPT.exe",',
  '  "$env:ProgramFiles\\Codex\\Codex.exe",',
  '  "$env:ProgramFiles\\ChatGPT\\ChatGPT.exe"',
  ')',
  'foreach ($candidate in $paths) {',
  '  if (Test-Path $candidate) { Start-Process $candidate; exit 0 }',
  '}',
  'throw "Codex application was not found"'
].join('\n');

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class CodexLifecycle {
  constructor(options = {}) {
    this.platform = options.platform || process.platform;
    this.exec = options.exec || execFileAsync;
    this.wait = options.wait || delay;
  }

  async macIsRunning() {
    try {
      const result = await this.exec('/usr/bin/osascript', ['-e', `application id "${MAC_BUNDLE_ID}" is running`], { timeout: 5000 });
      return String(result?.stdout || '').trim().toLowerCase() === 'true';
    } catch {
      return false;
    }
  }

  async waitForMacState(wanted, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    do {
      if (await this.macIsRunning() === wanted) return true;
      await this.wait(250);
    } while (Date.now() < deadline);
    return false;
  }

  async stop() {
    if (process.env.CODEX_SWITCHER_SKIP_RESTART === '1') return { wasRunning: false, skipped: true };
    if (this.platform === 'darwin') {
      const wasRunning = await this.macIsRunning();
      if (!wasRunning) return { wasRunning: false };
      try {
        await this.exec('/usr/bin/osascript', ['-e', `tell application id "${MAC_BUNDLE_ID}" to quit`], { timeout: 10000 });
      } catch {}
      if (!await this.waitForMacState(false, 10000)) {
        try { await this.exec('/usr/bin/pkill', ['-TERM', '-x', 'Codex'], { timeout: 5000 }); } catch {}
        if (!await this.waitForMacState(false, 4000)) {
          throw new Error('Не удалось полностью закрыть Codex. Аккаунт не изменён.');
        }
      }
      return { wasRunning: true };
    }
    if (this.platform === 'win32') {
      try {
        await this.exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_STOP_SCRIPT], {
          timeout: 20000,
          windowsHide: true
        });
      } catch {
        throw new Error('Не удалось полностью закрыть Codex. Аккаунт не изменён.');
      }
      return { wasRunning: true };
    }
    throw new Error('Автоматический перезапуск поддерживается только на macOS и Windows.');
  }

  async start() {
    if (process.env.CODEX_SWITCHER_SKIP_RESTART === '1') return { restarted: false, skipped: true, reason: 'test' };
    if (this.platform === 'darwin') {
      try {
        await this.exec('/usr/bin/open', ['-b', MAC_BUNDLE_ID], { timeout: 10000 });
        if (!await this.waitForMacState(true, 10000)) throw new Error('Codex не появился среди запущенных приложений.');
        return { restarted: true };
      } catch {
        return { restarted: false, reason: 'Аккаунт изменён, но Codex не запустился. Откройте Codex вручную.' };
      }
    }
    if (this.platform === 'win32') {
      try {
        await this.exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_START_SCRIPT], {
          timeout: 20000,
          windowsHide: true
        });
        return { restarted: true };
      } catch {
        return { restarted: false, reason: 'Аккаунт изменён, но Codex не запустился. Откройте Codex вручную.' };
      }
    }
    return { restarted: false, reason: 'Аккаунт изменён. Перезапустите Codex вручную.' };
  }
}

module.exports = { CodexLifecycle, MAC_BUNDLE_ID, WINDOWS_STOP_SCRIPT, WINDOWS_START_SCRIPT };
