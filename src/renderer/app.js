'use strict';

const elements = {
  accounts: document.querySelector('#accounts'),
  empty: document.querySelector('#empty'),
  add: document.querySelector('#add'),
  emptyAdd: document.querySelector('#empty-add'),
  connect: document.querySelector('#connect'),
  refresh: document.querySelector('#refresh'),
  remove: document.querySelector('#remove'),
  restore: document.querySelector('#restore'),
  autoSwitch: document.querySelector('#auto-switch'),
  autoSwitchRow: document.querySelector('#auto-switch-row'),
  autoSwitchNote: document.querySelector('#auto-switch-note'),
  device: document.querySelector('#device'),
  status: document.querySelector('#status'),
  version: document.querySelector('#version'),
  helpOpen: document.querySelector('#help-open'),
  helpDialog: document.querySelector('#help-dialog'),
  helpClose: document.querySelector('#help-close'),
  helpCopyDiagnostics: document.querySelector('#help-copy-diagnostics'),
  helpOpenChatGPT: document.querySelector('#help-open-chatgpt'),
  helpActionStatus: document.querySelector('#help-action-status'),
  guideEditorOpen: document.querySelector('#guide-editor-open'),
  guideEditorDialog: document.querySelector('#guide-editor-dialog'),
  guideEditorClose: document.querySelector('#guide-editor-close'),
  guideEditorCancel: document.querySelector('#guide-editor-cancel'),
  guideEditorSection: document.querySelector('#guide-editor-section'),
  guideEditorTitle: document.querySelector('#guide-editor-title'),
  guideEditorContent: document.querySelector('#guide-editor-content'),
  guideEditorStatus: document.querySelector('#guide-editor-status'),
  guideEditorSave: document.querySelector('#guide-editor-save'),
  guideEditorReset: document.querySelector('#guide-editor-reset')
};

let state = null;
let busy = false;
let guideEditorBusy = false;
const defaultGuides = new Map();
const appliedGuideOverrideIds = new Set();

function friendlyError(error) {
  return String(error?.message || error || 'Неизвестная ошибка')
    .replace(/^Error invoking remote method '[^']+': Error:\s*/, '');
}

function formatReset(timestamp) {
  if (!Number.isFinite(timestamp)) return 'дата обновления неизвестна';
  return `обновится ${new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp * 1000))}`;
}

function selectedProfile() {
  return state?.profiles.find((profile) => profile.id === state.selectedId) || null;
}

function guideTitle(section) {
  const summary = section.querySelector('summary');
  const number = summary?.querySelector('span')?.textContent || '';
  return String(summary?.textContent || '').replace(number, '').trim();
}

function guideSourceFromContent(content) {
  const lines = [];
  const visit = (container) => {
    for (const child of container.children) {
      if (child.hasAttribute('data-guide-action')) continue;
      const text = child.textContent.trim();
      if (!text) continue;
      if (child.tagName === 'H3') lines.push(`# ${text}`, '');
      else if (child.tagName === 'P') {
        const prefix = child.classList.contains('help-warning') ? '! ' : child.classList.contains('help-note') ? '> ' : '';
        lines.push(`${prefix}${text}`, '');
      } else if (child.tagName === 'UL') {
        for (const item of child.children) lines.push(`- ${item.textContent.trim()}`);
        lines.push('');
      } else if (child.tagName === 'OL') {
        [...child.children].forEach((item, index) => lines.push(`${index + 1}. ${item.textContent.trim()}`));
        lines.push('');
      } else visit(child);
    }
  };
  visit(content);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function captureDefaultGuides() {
  for (const section of document.querySelectorAll('.help-section[data-guide-id]')) {
    const id = Number(section.dataset.guideId);
    defaultGuides.set(id, {
      title: guideTitle(section),
      content: guideSourceFromContent(section.querySelector('.help-content'))
    });
  }
}

function setGuideTitle(section, title) {
  const summary = section.querySelector('summary');
  const number = summary.querySelector('span');
  summary.replaceChildren(number, document.createTextNode(title));
}

function renderGuideSource(content, source) {
  const actions = [...content.children].filter((child) => child.hasAttribute('data-guide-action'));
  const fragment = document.createDocumentFragment();
  let list = null;
  let listType = null;
  const endList = () => { list = null; listType = null; };
  for (const token of window.GuideFormat.parseGuide(source)) {
    if (token.type === 'break') {
      endList();
      continue;
    }
    if (token.type === 'ordered' || token.type === 'unordered') {
      const wanted = token.type === 'ordered' ? 'OL' : 'UL';
      if (!list || listType !== wanted) {
        list = document.createElement(wanted.toLowerCase());
        listType = wanted;
        fragment.append(list);
      }
      const item = document.createElement('li');
      item.textContent = token.text;
      list.append(item);
      continue;
    }
    endList();
    const element = document.createElement(token.type === 'heading' ? 'h3' : 'p');
    if (token.type === 'warning') element.className = 'help-warning';
    if (token.type === 'note') element.className = 'help-note';
    element.textContent = token.text;
    fragment.append(element);
  }
  content.replaceChildren(fragment, ...actions);
}

function applyGuideOverrides() {
  const overrides = new Map((state?.guides || []).map((guide) => [Number(guide.section_id), guide]));
  for (const section of document.querySelectorAll('.help-section[data-guide-id]')) {
    const id = Number(section.dataset.guideId);
    const override = overrides.get(id);
    if (override) {
      setGuideTitle(section, override.title);
      renderGuideSource(section.querySelector('.help-content'), override.content);
      appliedGuideOverrideIds.add(id);
    } else if (appliedGuideOverrideIds.has(id)) {
      const fallback = defaultGuides.get(id);
      setGuideTitle(section, fallback.title);
      renderGuideSource(section.querySelector('.help-content'), fallback.content);
      appliedGuideOverrideIds.delete(id);
    }
  }
}

function setBusy(value, message) {
  busy = value;
  if (message) elements.status.textContent = message;
  renderControls();
}

function renderControls() {
  const selected = selectedProfile();
  const operationBusy = busy || Boolean(state?.automation?.checking);
  elements.connect.disabled = operationBusy || !selected || !selected.connected;
  elements.refresh.disabled = operationBusy || !selected || !selected.connected;
  elements.remove.disabled = operationBusy || !selected;
  elements.add.disabled = operationBusy;
  elements.autoSwitch.disabled = busy;
  elements.restore.classList.toggle('hidden', !state?.deletedCount);
  if (selected?.active) elements.connect.textContent = 'Переподключить к Codex';
  else elements.connect.textContent = 'Подключить к Codex';
}

function render() {
  elements.accounts.replaceChildren();
  elements.empty.classList.toggle('hidden', state.profiles.length !== 0);
  elements.accounts.classList.toggle('hidden', state.profiles.length === 0);
  for (const profile of state.profiles) {
    const button = document.createElement('button');
    button.className = `account${profile.id === state.selectedId ? ' selected' : ''}${profile.active ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.id = profile.id;
    button.disabled = Boolean(state.automation?.checking);

    const dot = document.createElement('span');
    dot.className = 'dot';
    const identity = document.createElement('span');
    identity.className = 'identity';
    const email = document.createElement('div');
    email.className = 'email';
    email.textContent = profile.email;
    const subline = document.createElement('div');
    subline.className = 'subline';
    const connection = profile.active ? 'подключён к Codex' : profile.connected ? 'готов к подключению' : 'нужен вход';
    subline.textContent = connection;
    identity.append(email, subline);

    const limit = document.createElement('span');
    limit.className = 'limit';
    const percentLine = document.createElement('div');
    percentLine.className = 'percent-line';
    const percent = document.createElement('div');
    percent.className = 'percent';
    const remaining = profile.metrics?.primaryRemainingPercent;
    const secondaryRemaining = profile.metrics?.secondaryRemainingPercent;
    percent.textContent = Number.isFinite(remaining)
      ? (Number.isFinite(secondaryRemaining) ? `${remaining}% · ${secondaryRemaining}%` : `${remaining}%`)
      : '—';
    if (Number.isFinite(remaining)) {
      const lowest = Number.isFinite(secondaryRemaining) ? Math.min(remaining, secondaryRemaining) : remaining;
      percent.classList.add(lowest <= 20 ? 'low' : lowest <= 50 ? 'medium' : 'good');
    }
    const plan = document.createElement('span');
    plan.className = 'plan-badge';
    plan.textContent = window.PlanLabel.fromPlanType(profile.metrics?.planType);
    plan.title = 'Подписка аккаунта';
    percentLine.append(percent, plan);
    const reset = document.createElement('div');
    reset.className = 'reset';
    reset.textContent = formatReset(profile.metrics?.primaryResetsAt);
    limit.append(percentLine, reset);
    button.append(dot, identity, limit);
    button.addEventListener('click', () => run(() => window.switcher.select(profile.id)));
    elements.accounts.append(button);
  }

  elements.device.textContent = 'Локальный режим · данные аккаунтов не отправляются';
  const autoSwitchEnabled = state.settings?.autoSwitchEnabled === true;
  elements.autoSwitch.checked = autoSwitchEnabled;
  elements.autoSwitchRow.classList.toggle('has-error', Boolean(autoSwitchEnabled && state.automation?.lastError));
  elements.autoSwitchNote.textContent = state.automation?.checking
    ? 'Проверяю лимиты аккаунтов…'
    : autoSwitchEnabled && state.automation?.lastError
      ? state.automation.lastError
      : autoSwitchEnabled
        ? 'Включено · переключение при 1% · проверка раз в минуту'
        : 'При 1% подключит следующий аккаунт';
  elements.version.textContent = `v${state.version} · ${state.platform === 'darwin' ? 'macOS' : 'Windows'}`;
  applyGuideOverrides();
  renderControls();
}

async function run(action, message) {
  if (busy) return;
  setBusy(true, message);
  try {
    const result = await action();
    if (result?.profiles) {
      state = result;
      render();
    }
    if (message && elements.status.textContent === message) {
      elements.status.textContent = message === 'Запускаю локальное приложение…'
        ? (state?.profiles.length ? 'Выберите аккаунт.' : 'Добавьте свой аккаунт.')
        : 'Готово.';
    }
  } catch (error) {
    elements.status.textContent = friendlyError(error);
  } finally {
    setBusy(false);
  }
}

async function runHelpAction(action, pendingMessage, successMessage) {
  elements.helpActionStatus.textContent = pendingMessage;
  try {
    const result = await action();
    elements.helpActionStatus.textContent = typeof successMessage === 'function' ? successMessage(result) : successMessage;
    return result;
  } catch (error) {
    elements.helpActionStatus.textContent = friendlyError(error);
    return null;
  }
}

function selectedGuideForEditor() {
  const id = Number(elements.guideEditorSection.value);
  const override = (state?.guides || []).find((guide) => Number(guide.section_id) === id);
  return { id, override, value: override || defaultGuides.get(id) };
}

function loadGuideEditor() {
  const { override, value } = selectedGuideForEditor();
  elements.guideEditorTitle.value = value?.title || '';
  elements.guideEditorContent.value = value?.content || '';
  elements.guideEditorStatus.textContent = override
    ? `Локальная версия · ${new Date(override.updated_at * 1000).toLocaleString('ru')}`
    : 'Используется встроенный текст приложения.';
}

function setGuideEditorBusy(value, message = '') {
  guideEditorBusy = value;
  elements.guideEditorSection.disabled = value;
  elements.guideEditorTitle.disabled = value;
  elements.guideEditorContent.disabled = value;
  elements.guideEditorSave.disabled = value;
  elements.guideEditorReset.disabled = value;
  if (message) elements.guideEditorStatus.textContent = message;
}

async function runGuideEditorAction(action, pendingMessage) {
  if (guideEditorBusy) return null;
  setGuideEditorBusy(true, pendingMessage);
  try {
    const result = await action();
    if (result?.profiles) {
      state = result;
      render();
    }
    return result;
  } catch (error) {
    elements.guideEditorStatus.textContent = friendlyError(error);
    return null;
  } finally {
    setGuideEditorBusy(false);
  }
}

function closeGuideEditor() {
  elements.guideEditorDialog.close();
  if (!elements.helpDialog.open) elements.helpDialog.showModal();
}

captureDefaultGuides();

elements.add.addEventListener('click', () => run(() => window.switcher.add(), 'Открываю официальный вход Codex…'));
elements.emptyAdd.addEventListener('click', () => run(() => window.switcher.add(), 'Открываю официальный вход Codex…'));
elements.connect.addEventListener('click', () => {
  const selected = selectedProfile();
  if (selected) run(() => window.switcher.connect(selected.id), 'Подключаю аккаунт…');
});
elements.refresh.addEventListener('click', () => {
  const selected = selectedProfile();
  if (selected) run(() => window.switcher.refresh(selected.id), 'Обновляю лимиты…');
});
elements.remove.addEventListener('click', () => {
  const selected = selectedProfile();
  if (selected) run(() => window.switcher.remove(selected.id));
});
elements.restore.addEventListener('click', () => run(() => window.switcher.restore(), 'Восстанавливаю аккаунт…'));
elements.autoSwitch.addEventListener('change', () => {
  const enabled = elements.autoSwitch.checked;
  run(
    () => window.switcher.setAutoSwitch(enabled),
    enabled ? 'Включаю автопереключение…' : 'Выключаю автопереключение…'
  );
});
elements.helpOpen.addEventListener('click', () => {
  elements.helpActionStatus.textContent = '';
  elements.helpDialog.showModal();
});
elements.helpClose.addEventListener('click', () => elements.helpDialog.close());
elements.guideEditorOpen.addEventListener('click', () => {
  const openSection = document.querySelector('.help-section[open][data-guide-id]');
  elements.guideEditorSection.value = openSection?.dataset.guideId || '1';
  loadGuideEditor();
  elements.helpDialog.close();
  elements.guideEditorDialog.showModal();
});
elements.guideEditorClose.addEventListener('click', closeGuideEditor);
elements.guideEditorCancel.addEventListener('click', closeGuideEditor);
elements.guideEditorSection.addEventListener('change', loadGuideEditor);
elements.guideEditorSave.addEventListener('click', async () => {
  const sectionId = Number(elements.guideEditorSection.value);
  const title = elements.guideEditorTitle.value.trim();
  const content = elements.guideEditorContent.value.trim();
  if (!title || !content) {
    elements.guideEditorStatus.textContent = 'Название и текст не должны быть пустыми.';
    return;
  }
  const result = await runGuideEditorAction(
    () => window.switcher.saveGuide(sectionId, title, content),
    'Сохраняю гайд локально…'
  );
  if (result) {
    loadGuideEditor();
    elements.guideEditorStatus.textContent = 'Гайд сохранён на этом компьютере.';
  }
});
elements.guideEditorReset.addEventListener('click', async () => {
  const sectionId = Number(elements.guideEditorSection.value);
  if (!window.confirm(`Вернуть встроенный текст раздела ${sectionId}? Локальные изменения будут удалены.`)) return;
  const result = await runGuideEditorAction(
    () => window.switcher.resetGuide(sectionId),
    'Возвращаю встроенный текст…'
  );
  if (result) {
    loadGuideEditor();
    elements.guideEditorStatus.textContent = 'Встроенный текст восстановлен локально.';
  }
});
elements.helpCopyDiagnostics.addEventListener('click', () => runHelpAction(
  () => window.switcher.copyDiagnostics(),
  'Копирую безопасную диагностику…',
  'Диагностика скопирована.'
));
elements.helpOpenChatGPT.addEventListener('click', () => runHelpAction(
  () => window.switcher.openChatGPT(),
  'Открываю официальный ChatGPT…',
  'Официальная страница ChatGPT открыта.'
));
window.switcher.onStatus((message) => { elements.status.textContent = message; });
window.switcher.onSnapshot((value) => {
  if (!value?.profiles) return;
  state = value;
  render();
});

run(() => window.switcher.bootstrap(), 'Запускаю локальное приложение…');
