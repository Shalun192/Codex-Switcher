'use strict';

(function exposePlanLabel(root) {
  const labels = new Map([
    ['free', 'Free'],
    ['chatgptfree', 'Free'],
    ['go', 'Go'],
    ['chatgptgo', 'Go'],
    ['plus', 'Plus'],
    ['chatgptplus', 'Plus'],
    ['pro', 'Pro'],
    ['chatgptpro', 'Pro']
  ]);

  function fromPlanType(value, language = 'en') {
    const normalized = typeof value === 'string'
      ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
      : '';
    return labels.get(normalized) || (language === 'ru' ? 'Подписка —' : 'Plan —');
  }

  const api = { fromPlanType };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlanLabel = api;
})(typeof window !== 'undefined' ? window : globalThis);
