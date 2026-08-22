'use strict';

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = new Set(['en', 'ru']);

const messages = {
  en: {
    'status.closingAutomatic': 'The limit is exhausted. Closing Codex and switching to {email}…',
    'status.closingManual': 'Closing Codex before switching accounts…',
    'status.automaticConnected': 'Automatically connected {email}. Codex is running.',
    'status.automaticConnectedReason': 'Automatically connected {email}. {reason}',
    'status.connected': 'Account connected. Codex is running.',
    'status.openingSignIn': 'Opening the official Codex sign-in…',
    'status.accountAdded': 'Account added. Select it and click Connect.',
    'status.checkingAndConnecting': 'Checking limits and connecting the account…',
    'status.limitExhausted': '{email} has exhausted its limit. Looking for the next account…',
    'status.noAvailableAccount': 'The limits are exhausted and no other available account was found.',
    'status.limitCheckFailed': 'Could not check the limit for {email}: {error}',
    'status.autoSwitchError': 'Auto-switch: {error}',
    'status.refreshing': 'Refreshing limits for the selected account…',
    'status.refreshed': 'Limits refreshed.',
    'status.autoSwitchEnabled': 'Auto-switch is enabled. The active account will be checked once per minute.',
    'status.autoSwitchDisabled': 'Auto-switch is disabled.',
    'status.languageChanged': 'Language changed to English.',
    'dialog.remove.cancel': 'Cancel',
    'dialog.remove.confirm': 'Remove account',
    'dialog.remove.title': 'Remove account?',
    'dialog.remove.detail': 'The encrypted profile will be moved to a local archive and remain available for restoration.',
    'dialog.interfaceError': 'Could not open the local interface: {error}'
  },
  ru: {
    'status.closingAutomatic': 'Лимит исчерпан. Закрываем Codex и переключаемся на {email}…',
    'status.closingManual': 'Закрываем Codex перед переключением аккаунта…',
    'status.automaticConnected': 'Аккаунт {email} подключён автоматически. Codex запущен.',
    'status.automaticConnectedReason': 'Аккаунт {email} подключён автоматически. {reason}',
    'status.connected': 'Аккаунт подключён. Codex запущен.',
    'status.openingSignIn': 'Открываем официальную страницу входа Codex…',
    'status.accountAdded': 'Аккаунт добавлен. Выберите его и нажмите «Подключить к Codex».',
    'status.checkingAndConnecting': 'Проверяем лимиты и подключаем аккаунт…',
    'status.limitExhausted': 'Лимит аккаунта {email} исчерпан. Ищем следующий аккаунт…',
    'status.noAvailableAccount': 'Лимиты исчерпаны, а другой доступный аккаунт не найден.',
    'status.limitCheckFailed': 'Не удалось проверить лимит аккаунта {email}: {error}',
    'status.autoSwitchError': 'Автопереключение: {error}',
    'status.refreshing': 'Обновляем лимиты выбранного аккаунта…',
    'status.refreshed': 'Лимиты обновлены.',
    'status.autoSwitchEnabled': 'Автопереключение включено. Активный аккаунт проверяется раз в минуту.',
    'status.autoSwitchDisabled': 'Автопереключение выключено.',
    'status.languageChanged': 'Язык изменён на русский.',
    'dialog.remove.cancel': 'Отмена',
    'dialog.remove.confirm': 'Удалить аккаунт',
    'dialog.remove.title': 'Удалить аккаунт?',
    'dialog.remove.detail': 'Зашифрованный профиль будет перемещён в локальный архив, откуда его можно восстановить.',
    'dialog.interfaceError': 'Не удалось открыть локальный интерфейс: {error}'
  }
};

const russianErrors = new Map([
  ['Unknown error', 'Неизвестная ошибка.'],
  ['Protected operating-system storage is unavailable. Authorization was not saved.', 'Защищённое хранилище операционной системы недоступно. Данные авторизации не сохранены.'],
  ['Codex did not save valid authorization data. Please sign in again.', 'Codex не сохранил корректные данные авторизации. Войдите ещё раз.'],
  ['Add an account through the official Codex sign-in first.', 'Сначала добавьте аккаунт через официальную страницу входа Codex.'],
  ['Account not found.', 'Аккаунт не найден.'],
  ['Codex account-switch verification failed.', 'Не удалось подтвердить переключение аккаунта Codex.'],
  ['There are no removed accounts to restore.', 'Нет удалённых аккаунтов для восстановления.'],
  ['The archive for this account was not found.', 'Архив этого аккаунта не найден.'],
  ['The guide title or content has an invalid format.', 'Название или содержимое инструкции имеет неверный формат.'],
  ['Unknown guide section.', 'Неизвестный раздел инструкции.'],
  ['Codex returned an untrusted sign-in URL. The operation was stopped.', 'Codex вернул ненадёжный адрес входа. Операция остановлена.'],
  ['Wait for the current account operation to finish.', 'Дождитесь завершения текущей операции с аккаунтом.'],
  ['Auto-switch was disabled. The account was not changed.', 'Автопереключение было выключено. Аккаунт не изменён.'],
  ['Another account sign-in is already in progress.', 'Вход в другой аккаунт уже выполняется.'],
  ['Request rejected: untrusted source.', 'Запрос отклонён: ненадёжный источник.'],
  ['Codex could not be closed completely. The account was not changed.', 'Не удалось полностью закрыть Codex. Аккаунт не изменён.'],
  ['Automatic restart is supported only on macOS and Windows.', 'Автоматический перезапуск поддерживается только в macOS и Windows.'],
  ['Codex did not appear among running applications.', 'Codex не появился среди запущенных приложений.'],
  ['The account changed, but Codex did not start. Open Codex manually.', 'Аккаунт изменён, но Codex не запустился. Откройте Codex вручную.'],
  ['The account changed. Restart Codex manually.', 'Аккаунт изменён. Перезапустите Codex вручную.'],
  ['The official Codex executable was not found. Reinstall the app or Codex CLI.', 'Официальный исполняемый файл Codex не найден. Переустановите приложение или Codex CLI.'],
  ['The Codex app server stopped.', 'Сервер приложения Codex остановлен.'],
  ['The Codex app server exited with an error.', 'Сервер приложения Codex завершился с ошибкой.'],
  ['Codex app server error', 'Ошибка сервера приложения Codex.'],
  ['The Codex app server is not running.', 'Сервер приложения Codex не запущен.'],
  ['The sign-in timed out. Please try again.', 'Время ожидания входа истекло. Попробуйте ещё раз.'],
  ['Codex authorization did not complete.', 'Авторизация Codex не завершена.'],
  ['Codex did not return an authorization URL.', 'Codex не вернул адрес авторизации.'],
  ['Usage limits are temporarily unavailable.', 'Данные о лимитах временно недоступны.'],
  ['test', 'тест']
]);

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.has(value) ? value : DEFAULT_LANGUAGE;
}

function format(template, variables = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, name) => String(variables[name] ?? ''));
}

function translate(language, key, variables) {
  const normalized = normalizeLanguage(language);
  return format(messages[normalized][key] || messages.en[key] || key, variables);
}

function localizeError(language, value) {
  const message = String(value?.message || value || 'Unknown error');
  if (normalizeLanguage(language) !== 'ru') return message;
  const exact = russianErrors.get(message);
  if (exact) return exact;
  const responseMatch = message.match(/^Codex did not respond to (.+)\.$/);
  if (responseMatch) return `Codex не ответил на запрос ${responseMatch[1]}.`;
  return message;
}

module.exports = { DEFAULT_LANGUAGE, normalizeLanguage, translate, localizeError };
