'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LEGACY_DIRECTORY_NAME = 'Codex Switcher Public';

function hasProfiles(root) {
  try {
    return fs.statSync(path.join(root, 'profiles.json')).isFile();
  } catch {
    return false;
  }
}

function resolveDataRoot(electronApp, environment = process.env) {
  if (environment.CODEX_SWITCHER_DATA_ROOT) return environment.CODEX_SWITCHER_DATA_ROOT;

  const currentRoot = electronApp.getPath('userData');
  const legacyRoot = path.join(electronApp.getPath('appData'), LEGACY_DIRECTORY_NAME);
  return hasProfiles(legacyRoot) ? legacyRoot : currentRoot;
}

module.exports = { LEGACY_DIRECTORY_NAME, hasProfiles, resolveDataRoot };
