'use strict';

function valueOrUnknown(value, unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : unknown;
}

function diagnosticsText({ appVersion, build, platform, osVersion, autoSwitch = {}, language = 'en' }) {
  const russian = language === 'ru';
  const unknown = russian ? 'неизвестно' : 'unknown';
  const platformName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : valueOrUnknown(platform, unknown);
  return [
    russian ? 'Codex Switcher — диагностика' : 'Codex Switcher — diagnostics',
    russian
      ? `Версия: ${valueOrUnknown(appVersion, unknown)} (сборка ${Number.isFinite(build) ? build : unknown})`
      : `Version: ${valueOrUnknown(appVersion, unknown)} (build ${Number.isFinite(build) ? build : unknown})`,
    `${russian ? 'Система' : 'System'}: ${platformName} ${valueOrUnknown(osVersion, unknown)}`,
    russian ? 'Режим: полностью локальный' : 'Mode: fully local',
    `${russian ? 'Автопереключение' : 'Auto-switch'}: ${autoSwitch.enabled ? (russian ? 'включено' : 'enabled') : (russian ? 'выключено' : 'disabled')}`,
    `${russian ? 'Последняя проверка лимитов' : 'Last limit check'}: ${valueOrUnknown(autoSwitch.lastCheckedAt, unknown)}`,
    `${russian ? 'Последняя ошибка автопереключения' : 'Last auto-switch error'}: ${valueOrUnknown(autoSwitch.lastError, unknown)}`
  ].join('\n');
}

module.exports = { diagnosticsText };
