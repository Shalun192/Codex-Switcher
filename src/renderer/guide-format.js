'use strict';

(function exposeGuideFormat(root) {
  function parseGuide(source) {
    const lines = String(source || '').replace(/\r\n?/g, '\n').slice(0, 30000).split('\n');
    const tokens = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        tokens.push({ type: 'break', text: '' });
        continue;
      }
      if (line.startsWith('# ')) tokens.push({ type: 'heading', text: line.slice(2).trim() });
      else if (line.startsWith('! ')) tokens.push({ type: 'warning', text: line.slice(2).trim() });
      else if (line.startsWith('> ')) tokens.push({ type: 'note', text: line.slice(2).trim() });
      else if (line.startsWith('- ')) tokens.push({ type: 'unordered', text: line.slice(2).trim() });
      else if (/^\d+\.\s+/.test(line)) tokens.push({ type: 'ordered', text: line.replace(/^\d+\.\s+/, '') });
      else tokens.push({ type: 'paragraph', text: line });
    }
    return tokens.filter((token, index) => token.type !== 'break' || (index > 0 && tokens[index - 1].type !== 'break'));
  }

  const api = { parseGuide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GuideFormat = api;
})(typeof window !== 'undefined' ? window : globalThis);
