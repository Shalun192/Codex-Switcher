'use strict';

function valueOrUnknown(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'unknown';
}

function diagnosticsText({ appVersion, build, platform, osVersion, autoSwitch = {} }) {
  const platformName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : valueOrUnknown(platform);
  return [
    'Codex Switcher — diagnostics',
    `Version: ${valueOrUnknown(appVersion)} (build ${Number.isFinite(build) ? build : 'unknown'})`,
    `System: ${platformName} ${valueOrUnknown(osVersion)}`,
    'Mode: fully local',
    `Auto-switch: ${autoSwitch.enabled ? 'enabled' : 'disabled'}`,
    `Last limit check: ${valueOrUnknown(autoSwitch.lastCheckedAt)}`,
    `Last auto-switch error: ${valueOrUnknown(autoSwitch.lastError)}`
  ].join('\n');
}

module.exports = { diagnosticsText };
