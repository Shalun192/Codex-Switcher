'use strict';

const path = require('node:path');
const { atomicWrite, readJson } = require('./profile-store');

function validSectionId(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function validateGuide(sectionId, title, content) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanContent = typeof content === 'string' ? content.replace(/\r\n?/g, '\n').trim() : '';
  const hasBadControls = [...cleanTitle + cleanContent].some((character) => character.charCodeAt(0) < 32 && !['\n', '\t'].includes(character));
  if (!validSectionId(sectionId) || !cleanTitle || cleanTitle.length > 100 || !cleanContent || cleanContent.length > 30000 || hasBadControls) {
    throw new Error('The guide title or content has an invalid format.');
  }
  return { section_id: sectionId, title: cleanTitle, content: cleanContent, updated_at: Math.floor(Date.now() / 1000) };
}

class GuideStore {
  constructor(root) {
    this.file = path.join(root, 'guide-overrides.json');
    const parsed = readJson(this.file);
    this.state = Array.isArray(parsed?.guides)
      ? parsed.guides.filter((guide) => validSectionId(Number(guide?.section_id)))
      : [];
  }

  guides() {
    return this.state.map((guide) => ({ ...guide }));
  }

  save(sectionId, title, content) {
    const guide = validateGuide(Number(sectionId), title, content);
    const index = this.state.findIndex((item) => Number(item.section_id) === guide.section_id);
    if (index >= 0) this.state[index] = guide;
    else this.state.push(guide);
    this.state.sort((left, right) => Number(left.section_id) - Number(right.section_id));
    this.persist();
    return this.guides();
  }

  reset(sectionId) {
    const id = Number(sectionId);
    if (!validSectionId(id)) throw new Error('Unknown guide section.');
    this.state = this.state.filter((guide) => Number(guide.section_id) !== id);
    this.persist();
    return this.guides();
  }

  persist() {
    atomicWrite(this.file, Buffer.from(JSON.stringify({ guides: this.state }, null, 2)));
  }
}

module.exports = { GuideStore, validateGuide };
