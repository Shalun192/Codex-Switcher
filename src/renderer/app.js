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
  language: document.querySelector('#language'),
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

function currentLanguage() {
  return window.Localization.normalizeLanguage(state?.settings?.language);
}

function t(key, variables) {
  return window.Localization.translate(currentLanguage(), key, variables);
}

function friendlyError(error) {
  const message = String(error?.message || error || t('error.unknown'))
    .replace(/^Error invoking remote method '[^']+': Error:\s*/, '');
  return window.Localization.translateError(currentLanguage(), message);
}

function formatReset(timestamp) {
  if (!Number.isFinite(timestamp)) return t('limit.unknown');
  const locale = currentLanguage() === 'ru' ? 'ru-RU' : 'en';
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp * 1000));
  return t('limit.resets', { date });
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
    const value = override || window.Localization.guide(currentLanguage(), id, defaultGuides);
    if (!value) continue;
    setGuideTitle(section, value.title);
    renderGuideSource(section.querySelector('.help-content'), value.content);
    if (override) appliedGuideOverrideIds.add(id);
    else appliedGuideOverrideIds.delete(id);
  }
}

function updateGuideEditorOptions() {
  for (const option of elements.guideEditorSection.options) {
    const id = Number(option.value);
    const value = window.Localization.guide(currentLanguage(), id, defaultGuides);
    if (value) option.textContent = `${id} · ${value.title}`;
  }
}

function applyLanguage() {
  const language = currentLanguage();
  elements.language.value = language;
  window.Localization.translateDocument(document, language);
  updateGuideEditorOptions();
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
  elements.language.disabled = busy;
  elements.restore.classList.toggle('hidden', !state?.deletedCount);
  if (selected?.active) elements.connect.textContent = t('action.reconnect');
  else elements.connect.textContent = t('action.connect');
}

function render() {
  applyLanguage();
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
    const connection = profile.active ? t('account.active') : profile.connected ? t('account.ready') : t('account.signIn');
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
    plan.textContent = window.PlanLabel.fromPlanType(profile.metrics?.planType, currentLanguage());
    plan.title = t('account.planTitle');
    percentLine.append(percent, plan);
    const reset = document.createElement('div');
    reset.className = 'reset';
    reset.textContent = formatReset(profile.metrics?.primaryResetsAt);
    limit.append(percentLine, reset);
    button.append(dot, identity, limit);
    button.addEventListener('click', () => run(() => window.switcher.select(profile.id)));
    elements.accounts.append(button);
  }

  elements.device.textContent = t('device.local');
  const autoSwitchEnabled = state.settings?.autoSwitchEnabled === true;
  elements.autoSwitch.checked = autoSwitchEnabled;
  elements.autoSwitchRow.classList.toggle('has-error', Boolean(autoSwitchEnabled && state.automation?.lastError));
  elements.autoSwitchNote.textContent = state.automation?.checking
    ? t('auto.checking')
    : autoSwitchEnabled && state.automation?.lastError
      ? state.automation.lastError
      : autoSwitchEnabled
        ? t('auto.on')
        : t('auto.off');
  elements.version.textContent = `v${state.version} · ${state.platform === 'darwin' ? 'macOS' : 'Windows'}`;
  applyGuideOverrides();
  renderControls();
}

async function run(action, message, successMessage = null) {
  if (busy) return;
  setBusy(true, message);
  try {
    const result = await action();
    if (result?.profiles) {
      state = result;
      render();
    }
    if (message && elements.status.textContent === message) {
      elements.status.textContent = successMessage || (message === window.Localization.translate('en', 'status.starting')
        ? (state?.profiles.length ? t('status.select') : t('status.add'))
        : t('status.done'));
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
  return { id, override, value: override || window.Localization.guide(currentLanguage(), id, defaultGuides) };
}

function loadGuideEditor() {
  const { override, value } = selectedGuideForEditor();
  elements.guideEditorTitle.value = value?.title || '';
  elements.guideEditorContent.value = value?.content || '';
  elements.guideEditorStatus.textContent = override
    ? t('editor.localVersion', { date: new Date(override.updated_at * 1000).toLocaleString(currentLanguage() === 'ru' ? 'ru-RU' : 'en') })
    : t('editor.builtin');
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

elements.add.addEventListener('click', () => run(() => window.switcher.add(), t('status.openingSignIn')));
elements.emptyAdd.addEventListener('click', () => run(() => window.switcher.add(), t('status.openingSignIn')));
elements.connect.addEventListener('click', () => {
  const selected = selectedProfile();
  if (selected) run(() => window.switcher.connect(selected.id), t('status.connecting'));
});
elements.refresh.addEventListener('click', () => {
  const selected = selectedProfile();
  if (selected) run(() => window.switcher.refresh(selected.id), t('status.refreshing'));
});
elements.remove.addEventListener('click', () => {
  const selected = selectedProfile();
  if (selected) run(() => window.switcher.remove(selected.id));
});
elements.restore.addEventListener('click', () => run(() => window.switcher.restore(), t('status.restoring')));
elements.autoSwitch.addEventListener('change', () => {
  const enabled = elements.autoSwitch.checked;
  run(
    () => window.switcher.setAutoSwitch(enabled),
    enabled ? t('status.enablingAuto') : t('status.disablingAuto')
  );
});
elements.language.addEventListener('change', () => {
  const language = window.Localization.normalizeLanguage(elements.language.value);
  run(
    () => window.switcher.setLanguage(language),
    window.Localization.translate(language, 'status.languageChanging'),
    window.Localization.translate(language, 'status.languageChanged')
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
    elements.guideEditorStatus.textContent = t('editor.required');
    return;
  }
  const result = await runGuideEditorAction(
    () => window.switcher.saveGuide(sectionId, title, content),
    t('editor.saving')
  );
  if (result) {
    loadGuideEditor();
    elements.guideEditorStatus.textContent = t('editor.saved');
  }
});
elements.guideEditorReset.addEventListener('click', async () => {
  const sectionId = Number(elements.guideEditorSection.value);
  if (!window.confirm(t('editor.restoreConfirm', { section: sectionId }))) return;
  const result = await runGuideEditorAction(
    () => window.switcher.resetGuide(sectionId),
    t('editor.restoring')
  );
  if (result) {
    loadGuideEditor();
    elements.guideEditorStatus.textContent = t('editor.restored');
  }
});
elements.helpCopyDiagnostics.addEventListener('click', () => runHelpAction(
  () => window.switcher.copyDiagnostics(),
  t('help.copyingDiagnostics'),
  t('help.diagnosticsCopied')
));
elements.helpOpenChatGPT.addEventListener('click', () => runHelpAction(
  () => window.switcher.openChatGPT(),
  t('help.openingChatGPT'),
  t('help.chatGPTOpened')
));
window.switcher.onStatus((message) => { elements.status.textContent = message; });
window.switcher.onSnapshot((value) => {
  if (!value?.profiles) return;
  state = value;
  render();
});

run(() => window.switcher.bootstrap(), window.Localization.translate('en', 'status.starting'));
