'use strict';

function valueOrUnknown(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'неизвестно';
}

function diagnosticsText({ appVersion, build, platform, osVersion, autoSwitch = {} }) {
  const platformName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : valueOrUnknown(platform);
  return [
    'Codex Switcher — диагностика',
    `Версия: ${valueOrUnknown(appVersion)} (build ${Number.isFinite(build) ? build : 'неизвестно'})`,
    `Система: ${platformName} ${valueOrUnknown(osVersion)}`,
    'Режим: полностью локальный',
    `Автопереключение: ${autoSwitch.enabled ? 'включено' : 'выключено'}`,
    `Последняя проверка лимита: ${valueOrUnknown(autoSwitch.lastCheckedAt)}`,
    `Последняя ошибка автопереключения: ${valueOrUnknown(autoSwitch.lastError)}`
  ].join('\n');
}

module.exports = { diagnosticsText };
