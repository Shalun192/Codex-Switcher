'use strict';

const labels = {
  en: { about: 'About Codex Switcher', hide: 'Hide Codex Switcher', hideOthers: 'Hide Others', unhide: 'Show All', quit: 'Quit Codex Switcher', edit: 'Edit', undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All' },
  ru: { about: 'О Codex Switcher', hide: 'Скрыть Codex Switcher', hideOthers: 'Скрыть остальные', unhide: 'Показать все', quit: 'Выйти из Codex Switcher', edit: 'Правка', undo: 'Отменить', redo: 'Повторить', cut: 'Вырезать', copy: 'Копировать', paste: 'Вставить', selectAll: 'Выбрать всё' }
};

function menuLabels(language) {
  return labels[language] || labels.en;
}

function editItems(language) {
  const value = menuLabels(language);
  return [
    { role: 'undo', label: value.undo },
    { role: 'redo', label: value.redo },
    { type: 'separator' },
    { role: 'cut', label: value.cut },
    { role: 'copy', label: value.copy },
    { role: 'paste', label: value.paste },
    { type: 'separator' },
    { role: 'selectAll', label: value.selectAll }
  ];
}

function applicationMenuTemplate(platform, language = 'en') {
  if (platform !== 'darwin') return [];
  const value = menuLabels(language);
  return [
    {
      role: 'appMenu',
      submenu: [
        { role: 'about', label: value.about },
        { type: 'separator' },
        { role: 'hide', label: value.hide },
        { role: 'hideOthers', label: value.hideOthers },
        { role: 'unhide', label: value.unhide },
        { type: 'separator' },
        { role: 'quit', label: value.quit }
      ]
    },
    { role: 'editMenu', label: value.edit, submenu: editItems(language) }
  ];
}

function contextMenuTemplate(params = {}, language = 'en') {
  if (params.isEditable) {
    return editItems(language);
  }
  return params.selectionText ? [{ role: 'copy', label: menuLabels(language).copy }] : [];
}

module.exports = { applicationMenuTemplate, contextMenuTemplate };
