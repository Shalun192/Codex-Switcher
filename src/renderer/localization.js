'use strict';

(function exposeLocalization(root) {
  const DEFAULT_LANGUAGE = 'en';
  const supported = new Set(['en', 'ru']);
  const strings = {
    en: {
      'language.label': 'Language',
      'header.helpTitle': 'Instructions and help',
      'header.helpAria': 'Open instructions',
      'header.addTitle': 'Add a personal account',
      'header.addAria': 'Add a personal account',
      'empty.message': 'Add your account through the official Codex sign-in.',
      'empty.add': 'Add account',
      'accounts.aria': 'Codex accounts',
      'auto.title': 'Auto-switch',
      'auto.off': 'Connects the next account at 1%',
      'auto.on': 'Enabled · switches at 1% · checks once per minute',
      'auto.checking': 'Checking account limits…',
      'auto.titleToggle': 'Enable or disable auto-switch',
      'auto.aria': 'Automatic account switching',
      'action.connect': 'Connect to Codex',
      'action.reconnect': 'Reconnect to Codex',
      'action.refresh': 'Refresh limits',
      'action.remove': 'Remove',
      'action.restore': 'Restore removed',
      'status.select': 'Select an account.',
      'status.add': 'Add your account.',
      'status.done': 'Done.',
      'status.starting': 'Starting the local application…',
      'status.openingSignIn': 'Opening the official Codex sign-in…',
      'status.connecting': 'Connecting the account…',
      'status.refreshing': 'Refreshing limits…',
      'status.restoring': 'Restoring the account…',
      'status.enablingAuto': 'Enabling auto-switch…',
      'status.disablingAuto': 'Disabling auto-switch…',
      'status.languageChanging': 'Changing language…',
      'status.languageChanged': 'Language changed to English.',
      'account.active': 'connected to Codex',
      'account.ready': 'ready to connect',
      'account.signIn': 'sign-in required',
      'account.planTitle': 'Account plan',
      'limit.unknown': 'reset time unknown',
      'limit.resets': 'resets {date}',
      'device.local': 'Local mode · account data is not sent anywhere',
      'help.title': 'Instructions',
      'help.subtitle': 'Short answers about using Codex Switcher',
      'help.edit': 'Edit locally',
      'help.closeAria': 'Close instructions',
      'help.copyDiagnostics': 'Copy diagnostics',
      'help.openChatGPT': 'Open official ChatGPT',
      'help.copyingDiagnostics': 'Copying safe diagnostics…',
      'help.diagnosticsCopied': 'Diagnostics copied.',
      'help.openingChatGPT': 'Opening the official ChatGPT page…',
      'help.chatGPTOpened': 'The official ChatGPT page is open.',
      'editor.title': 'Guide editor',
      'editor.subtitle': 'Changes are saved only on this computer',
      'editor.closeAria': 'Close editor',
      'editor.section': 'Section',
      'editor.guideTitle': 'Title',
      'editor.content': 'Guide content',
      'editor.headingSyntax': '# Heading',
      'editor.stepSyntax': '1. Step',
      'editor.itemSyntax': '- Item',
      'editor.noteSyntax': '> Note',
      'editor.warningSyntax': '! Warning',
      'editor.security': 'Do not paste passwords, OAuth tokens, QR codes, TOTP secrets, or recovery codes here. The editor does not need them, and they would remain in a local file.',
      'editor.restore': 'Restore built-in text',
      'editor.cancel': 'Cancel',
      'editor.save': 'Save locally',
      'editor.localVersion': 'Local version · {date}',
      'editor.builtin': 'Using the built-in application text.',
      'editor.required': 'The title and content cannot be empty.',
      'editor.saving': 'Saving the guide locally…',
      'editor.saved': 'The guide was saved on this computer.',
      'editor.restoreConfirm': 'Restore the built-in text for section {section}? Local changes will be deleted.',
      'editor.restoring': 'Restoring the built-in text…',
      'editor.restored': 'The built-in text was restored locally.',
      'error.unknown': 'Unknown error'
    },
    ru: {
      'language.label': 'Язык',
      'header.helpTitle': 'Инструкции и помощь',
      'header.helpAria': 'Открыть инструкции',
      'header.addTitle': 'Добавить личный аккаунт',
      'header.addAria': 'Добавить личный аккаунт',
      'empty.message': 'Добавьте аккаунт через официальную страницу входа Codex.',
      'empty.add': 'Добавить аккаунт',
      'accounts.aria': 'Аккаунты Codex',
      'auto.title': 'Автопереключение',
      'auto.off': 'Подключает следующий аккаунт при 1%',
      'auto.on': 'Включено · порог 1% · проверка раз в минуту',
      'auto.checking': 'Проверяем лимиты аккаунтов…',
      'auto.titleToggle': 'Включить или выключить автопереключение',
      'auto.aria': 'Автоматическое переключение аккаунтов',
      'action.connect': 'Подключить к Codex',
      'action.reconnect': 'Переподключить к Codex',
      'action.refresh': 'Обновить лимиты',
      'action.remove': 'Удалить',
      'action.restore': 'Восстановить удалённый',
      'status.select': 'Выберите аккаунт.',
      'status.add': 'Добавьте аккаунт.',
      'status.done': 'Готово.',
      'status.starting': 'Запускаем локальное приложение…',
      'status.openingSignIn': 'Открываем официальную страницу входа Codex…',
      'status.connecting': 'Подключаем аккаунт…',
      'status.refreshing': 'Обновляем лимиты…',
      'status.restoring': 'Восстанавливаем аккаунт…',
      'status.enablingAuto': 'Включаем автопереключение…',
      'status.disablingAuto': 'Выключаем автопереключение…',
      'status.languageChanging': 'Меняем язык…',
      'status.languageChanged': 'Язык изменён на русский.',
      'account.active': 'подключён к Codex',
      'account.ready': 'готов к подключению',
      'account.signIn': 'требуется вход',
      'account.planTitle': 'Подписка аккаунта',
      'limit.unknown': 'время обновления неизвестно',
      'limit.resets': 'обновится {date}',
      'device.local': 'Локальный режим · данные аккаунтов никуда не отправляются',
      'help.title': 'Инструкции',
      'help.subtitle': 'Краткие ответы по использованию Codex Switcher',
      'help.edit': 'Редактировать локально',
      'help.closeAria': 'Закрыть инструкции',
      'help.copyDiagnostics': 'Скопировать диагностику',
      'help.openChatGPT': 'Открыть официальный ChatGPT',
      'help.copyingDiagnostics': 'Копируем безопасную диагностику…',
      'help.diagnosticsCopied': 'Диагностика скопирована.',
      'help.openingChatGPT': 'Открываем официальную страницу ChatGPT…',
      'help.chatGPTOpened': 'Официальная страница ChatGPT открыта.',
      'editor.title': 'Редактор инструкций',
      'editor.subtitle': 'Изменения сохраняются только на этом компьютере',
      'editor.closeAria': 'Закрыть редактор',
      'editor.section': 'Раздел',
      'editor.guideTitle': 'Название',
      'editor.content': 'Текст инструкции',
      'editor.headingSyntax': '# Заголовок',
      'editor.stepSyntax': '1. Шаг',
      'editor.itemSyntax': '- Пункт',
      'editor.noteSyntax': '> Примечание',
      'editor.warningSyntax': '! Предупреждение',
      'editor.security': 'Не вставляйте сюда пароли, OAuth-токены, QR-коды, секреты TOTP или коды восстановления. Редактору они не нужны и останутся в локальном файле.',
      'editor.restore': 'Вернуть встроенный текст',
      'editor.cancel': 'Отмена',
      'editor.save': 'Сохранить локально',
      'editor.localVersion': 'Локальная версия · {date}',
      'editor.builtin': 'Используется встроенный текст приложения.',
      'editor.required': 'Название и текст не могут быть пустыми.',
      'editor.saving': 'Сохраняем инструкцию локально…',
      'editor.saved': 'Инструкция сохранена на этом компьютере.',
      'editor.restoreConfirm': 'Вернуть встроенный текст раздела {section}? Локальные изменения будут удалены.',
      'editor.restoring': 'Восстанавливаем встроенный текст…',
      'editor.restored': 'Встроенный текст восстановлен локально.',
      'error.unknown': 'Неизвестная ошибка'
    }
  };

  const russianGuides = new Map([
    [1, {
      title: 'Быстрый старт',
      content: `1. Нажмите + и добавьте личный аккаунт Free, Go, Plus или Pro.
2. Завершите официальный вход OpenAI в браузере.
3. Выберите нужный аккаунт в списке.
4. Нажмите «Подключить к Codex».
5. Дождитесь зелёной точки и подписи «подключён к Codex».`
    }],
    [2, {
      title: 'Как добавить аккаунт',
      content: `1. Нажмите кнопку + в правом верхнем углу.
2. В браузере войдите именно в тот аккаунт, который хотите сохранить.
3. После успешного входа вернитесь в Switcher. Аккаунт появится в списке.
4. Выберите его и нажмите «Подключить к Codex».

> Switcher никогда не запрашивает и не сохраняет ваш пароль или код двухфакторной аутентификации.`
    }],
    [3, {
      title: 'Как переключать аккаунты',
      content: `1. Один раз нажмите на нужный аккаунт. Его строка станет выбранной.
2. Нажмите «Подключить к Codex». Сам по себе выбор строки не меняет аккаунт Codex.
3. Switcher полностью закрывает Codex, атомарно заменяет локальную авторизацию и снова запускает Codex.
4. Дождитесь сообщения «Аккаунт подключён. Codex запущен.»

> Зелёная точка отмечает аккаунт, который сейчас подключён к Codex.`
    }],
    [4, {
      title: 'Лимиты и время обновления',
      content: `Процент справа показывает оставшийся доступный лимит. Если отображаются два процента, это два разных окна использования.

- Зелёный — доступно достаточно лимита.
- Оранжевый — осталось 50% или меньше.
- Красный — осталось 20% или меньше.

Время обновления основного окна лимита указано под процентом. Для ручной проверки выберите аккаунт и нажмите «Обновить лимиты».

# Автопереключение

1. Включите переключатель «Автопереключение» на главном экране.
2. Пока Switcher запущен, он проверяет активный аккаунт примерно раз в минуту.
3. Когда одно из окон использования достигает 1% или меньше, Switcher по порядку проверяет следующие аккаунты и выбирает первый, у которого доступно больше 1%.
4. Codex закрывается, аккаунт меняется, затем Codex запускается снова без дополнительного нажатия.

> Если доступного аккаунта нет, текущий аккаунт остаётся выбранным, а Switcher продолжает проверки. Функцию можно выключить тем же переключателем.`
    }],
    [5, {
      title: 'Как обновить приложение',
      content: `# Windows

1. Откройте раздел Releases этого репозитория GitHub и скачайте новую сборку для Windows.
2. Закройте старую версию Switcher.
3. Распакуйте скачанный ZIP в новую папку и запустите Codex Switcher Local.exe.
4. После проверки новой версии старую папку можно удалить.

# macOS

1. Скачайте новый DMG из Releases и закройте Switcher.
2. Откройте DMG и переместите приложение в папку Applications с заменой старой версии.
3. Снова запустите Codex Switcher.

> Сохранённые аккаунты находятся отдельно от приложения и не удаляются при обычном обновлении.`
    }],
    [6, {
      title: 'Удаление и восстановление',
      content: `1. Выберите аккаунт и нажмите «Удалить».
2. Подтвердите действие. Аккаунт будет перемещён в локальный архив.
3. Чтобы отменить случайное удаление, нажмите «Восстановить удалённый».

> Это не удаляет аккаунт OpenAI и не отменяет его подписку. Восстанавливается последний удалённый локальный профиль.`
    }],
    [7, {
      title: 'Ошибки и решения',
      content: `# Кнопка подключения не работает

Решение: выберите строку аккаунта, убедитесь, что вход завершён, перезапустите Switcher и попробуйте подключиться снова.

# Аккаунт не переключился

Решение: после выбора аккаунта нажмите «Подключить к Codex» и дождитесь автоматического перезапуска. Если Switcher сообщает, что не удалось закрыть Codex, закройте Codex вручную и повторите попытку.

# Автопереключение не сработало

Решение: убедитесь, что переключатель включён, Switcher продолжает работать, сохранено минимум два аккаунта, а у следующего аккаунта доступно больше 1%. Если вместо процента стоит тире, нажмите «Обновить лимиты».

# Codex вышел из аккаунта

Решение: не удаляйте папки данных Switcher или Codex. Выберите сохранённый аккаунт и подключите его снова. Если авторизация OpenAI истекла, удалите локальный профиль и снова добавьте аккаунт через официальный вход.

# Лимиты не отображаются

Решение: проверьте интернет-соединение, выберите аккаунт и нажмите «Обновить лимиты». Если тире осталось, подождите несколько минут: OpenAI может временно не возвращать данные о лимитах. Это не мешает подключить аккаунт.

# Окно авторизации не открылось

Решение: проверьте браузер по умолчанию и блокировку всплывающих окон, затем снова нажмите +. Если вход уже выполняется, перезапустите Switcher и повторите попытку.

# Защищённое хранилище недоступно

Решение: разблокируйте сеанс macOS или Windows и перезапустите приложение. Switcher не сохраняет новые данные авторизации без Keychain или DPAPI.

# Codex не найден

Решение: соберите приложение стандартной командой из README, которая скачивает проверенный официальный файл Codex. Также установите официальное приложение Codex на компьютер.

# Приложение неожиданно закрылось

Решение: снова откройте Switcher и установите последнюю версию из GitHub Releases. Если сбой повторяется, скопируйте диагностику и приложите её к отчёту об ошибке без файлов авторизации.`
    }],
    [8, {
      title: 'Безопасность и конфиденциальность',
      content: `- Аккаунты хранятся только локально; у приложения нет собственного сервера или телеметрии.
- Сохранённые копии авторизации зашифрованы через Keychain в macOS или DPAPI в Windows.
- Официальный процесс Codex использует интернет для входа и получения лимитов напрямую от OpenAI.
- Никому не отправляйте пароль, код 2FA, файлы авторизации или папку данных приложения.`
    }],
    [9, {
      title: 'Поддержка и диагностика',
      content: `Диагностика содержит только версию приложения, операционную систему и состояние автопереключения. В ней нет адресов аккаунтов, паролей или токенов.`
    }],
    [10, {
      title: 'Новый аккаунт ChatGPT и 2FA',
      content: `# Шаг 1. Подготовьте данные

- Используйте адрес электронной почты, к которому у вас всегда будет доступ.
- Если регистрируетесь с паролем, придумайте уникальный пароль и сохраните его в менеджере паролей.
- Заранее установите приложение-аутентификатор: Google Authenticator, Microsoft Authenticator, Authy, 1Password или другое приложение с поддержкой TOTP.

# Шаг 2. Создайте аккаунт ChatGPT

1. Нажмите кнопку ниже или самостоятельно откройте chatgpt.com.
2. Выберите Sign up.
3. Введите электронную почту и придумайте пароль либо выберите Continue with Google, Microsoft или Apple.
4. Если OpenAI отправит письмо, откройте его и подтвердите адрес.
5. Заполните запрошенные данные и примите условия сервиса.
6. После входа убедитесь, что открылся обычный экран ChatGPT.

> Запомните способ регистрации. Если использовали Google, Microsoft или Apple, в будущем выбирайте тот же способ входа.

# Шаг 3. Откройте настройки безопасности

1. В ChatGPT нажмите значок профиля.
2. Откройте Settings.
3. Перейдите в Security.
4. Найдите Multi-factor authentication (MFA) и выберите Authenticator app.
5. Если OpenAI попросит, подтвердите вход ещё раз.

# Шаг 4. Получите и сохраните секрет 2FA

1. OpenAI покажет QR-код для настройки приложения-аутентификатора.
2. Если нужен текстовый ключ, выберите ссылку вроде Can't scan it? или Enter setup key, если она доступна.
3. Копируйте показанный секрет TOTP только в защищённую запись менеджера паролей. В некоторых версиях интерфейса доступен только QR-код — тогда отсканируйте его напрямую.
4. В приложении-аутентификаторе нажмите +, отсканируйте QR-код либо выберите ручной ввод и вставьте ключ.
5. Аутентификатор начнёт создавать шестизначный одноразовый код, который меняется примерно каждые 30 секунд.

! Никогда не вводите QR-код или секрет TOTP на постороннем сайте и никому его не передавайте. Храните его только в надёжном аутентификаторе или менеджере паролей.

# Шаг 5. Завершите включение 2FA

1. Введите текущий шестизначный код из аутентификатора в окне ChatGPT.
2. Нажмите Confirm или Continue.
3. Убедитесь, что Authenticator app отображается как включённый способ MFA.
4. Если OpenAI покажет коды восстановления, сохраните их в отдельной защищённой записи.

> Коды восстановления — это не секрет TOTP. Каждый код восстановления нужен для возврата доступа при потере телефона или аутентификатора.

# Шаг 6. Проверьте вход

1. Не выходя из аккаунта на текущем устройстве, откройте приватное окно браузера.
2. Войдите тем же способом, который использовали при регистрации.
3. Когда ChatGPT запросит второй фактор, введите новый код из аутентификатора.
4. После успешной проверки закройте приватное окно.

# Шаг 7. Добавьте аккаунт в Switcher

1. Вернитесь в Codex Switcher и нажмите +.
2. Завершите официальный вход ChatGPT в браузере и самостоятельно введите код 2FA.
3. Вернитесь в Switcher, выберите добавленный аккаунт и нажмите «Подключить к Codex».

! Не храните пароль, QR-код, секрет TOTP или коды восстановления в незащищённых заметках, сообщениях или скриншотах. Если секрет узнал посторонний, отключите этот способ MFA и настройте его заново.`
    }]
  ]);

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
    ['The official Codex executable was not found. Reinstall the app or Codex CLI.', 'Официальный исполняемый файл Codex не найден. Переустановите приложение или Codex CLI.'],
    ['Codex could not be closed completely. The account was not changed.', 'Не удалось полностью закрыть Codex. Аккаунт не изменён.'],
    ['The sign-in timed out. Please try again.', 'Время ожидания входа истекло. Попробуйте ещё раз.'],
    ['Usage limits are temporarily unavailable.', 'Данные о лимитах временно недоступны.']
  ]);

  function normalizeLanguage(value) {
    return supported.has(value) ? value : DEFAULT_LANGUAGE;
  }

  function format(template, variables = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_match, name) => String(variables[name] ?? ''));
  }

  function translate(language, key, variables) {
    const normalized = normalizeLanguage(language);
    return format(strings[normalized][key] || strings.en[key] || key, variables);
  }

  function translateError(language, value) {
    const message = String(value?.message || value || translate(language, 'error.unknown'));
    if (normalizeLanguage(language) !== 'ru') return message;
    return russianErrors.get(message) || message;
  }

  function translateDocument(document, language) {
    const normalized = normalizeLanguage(language);
    document.documentElement.lang = normalized;
    for (const element of document.querySelectorAll('[data-i18n]')) {
      element.textContent = translate(normalized, element.dataset.i18n);
    }
    for (const element of document.querySelectorAll('[data-i18n-title]')) {
      element.title = translate(normalized, element.dataset.i18nTitle);
    }
    for (const element of document.querySelectorAll('[data-i18n-aria-label]')) {
      element.setAttribute('aria-label', translate(normalized, element.dataset.i18nAriaLabel));
    }
  }

  function guide(language, id, englishGuides) {
    const normalized = normalizeLanguage(language);
    return normalized === 'ru' ? russianGuides.get(Number(id)) : englishGuides.get(Number(id));
  }

  const api = { DEFAULT_LANGUAGE, normalizeLanguage, translate, translateError, translateDocument, guide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Localization = api;
})(typeof window !== 'undefined' ? window : globalThis);
