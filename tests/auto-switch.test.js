'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isLimitExhausted,
  hasAvailableLimit,
  profilesAfterActive,
  findNextAvailableProfile,
  runAutoSwitchCycle
} = require('../src/main/auto-switch');
const { switchAccountSafely } = require('../src/main/account-switch');

test('an account is exhausted when either known Codex limit reaches one percent', () => {
  assert.equal(isLimitExhausted({ primaryRemainingPercent: 0, secondaryRemainingPercent: 50 }), true);
  assert.equal(isLimitExhausted({ primaryRemainingPercent: 1, secondaryRemainingPercent: 50 }), true);
  assert.equal(isLimitExhausted({ primaryRemainingPercent: 20, secondaryRemainingPercent: 0 }), true);
  assert.equal(isLimitExhausted({ primaryRemainingPercent: 2, secondaryRemainingPercent: 2 }), false);
  assert.equal(isLimitExhausted({}), false);
  assert.equal(hasAvailableLimit({ primaryRemainingPercent: 2, secondaryRemainingPercent: 2 }), true);
  assert.equal(hasAvailableLimit({ primaryRemainingPercent: 1, secondaryRemainingPercent: 50 }), false);
  assert.equal(hasAvailableLimit({ primaryRemainingPercent: 50, secondaryRemainingPercent: 0 }), false);
  assert.equal(hasAvailableLimit({}), false, 'unknown limits must not be selected automatically');
});

test('automatic selection walks forward, wraps around, and skips exhausted or unreadable accounts', async () => {
  const profiles = [
    { id: 'a', connected: true },
    { id: 'b', connected: true },
    { id: 'c', connected: true },
    { id: 'd', connected: false }
  ];
  assert.deepEqual(profilesAfterActive(profiles, 'c').map((profile) => profile.id), ['a', 'b']);
  const seen = [];
  const result = await findNextAvailableProfile(profiles, 'a', async (id) => {
    seen.push(id);
    if (id === 'b') return { primaryRemainingPercent: 0 };
    if (id === 'c') return { primaryRemainingPercent: 37, secondaryRemainingPercent: 12 };
    throw new Error('should not check disconnected profile');
  });
  assert.equal(result.profile.id, 'c');
  assert.deepEqual(seen, ['b', 'c']);
});

test('safe account switch always stops Codex before auth changes and starts it afterwards', async () => {
  const order = [];
  const result = await switchAccountSafely({
    lifecycle: {
      stop: async () => { order.push('stop'); return { wasRunning: true }; },
      start: async () => { order.push('start'); return { restarted: true }; }
    },
    activate: async () => { order.push('activate'); }
  });
  assert.deepEqual(order, ['stop', 'activate', 'start']);
  assert.equal(result.restarted, true);
});

test('safe account switch never changes auth if Codex could not be stopped', async () => {
  let activated = false;
  await assert.rejects(() => switchAccountSafely({
    lifecycle: {
      stop: async () => { throw new Error('still running'); },
      start: async () => ({ restarted: true })
    },
    activate: async () => { activated = true; }
  }), /still running/);
  assert.equal(activated, false);
});

test('full automatic cycle switches only after the active limit is exhausted', async () => {
  const profiles = [
    { id: 'a', connected: true },
    { id: 'b', connected: true },
    { id: 'c', connected: true }
  ];
  const refreshed = [];
  const switched = [];
  const exhausted = [];
  const metrics = {
    a: { primaryRemainingPercent: 0, secondaryRemainingPercent: 20 },
    b: { primaryRemainingPercent: 0, secondaryRemainingPercent: 80 },
    c: { primaryRemainingPercent: 41, secondaryRemainingPercent: 9 }
  };
  const result = await runAutoSwitchCycle({
    profiles,
    activeId: 'a',
    refreshMetrics: async (id) => { refreshed.push(id); return metrics[id]; },
    onExhausted: async (profile) => exhausted.push(profile.id),
    switchAccount: async (id) => switched.push(id)
  });
  assert.equal(result.action, 'switched');
  assert.equal(result.profileId, 'c');
  assert.deepEqual(refreshed, ['a', 'b', 'c']);
  assert.deepEqual(exhausted, ['a']);
  assert.deepEqual(switched, ['c']);

  const noSwitch = await runAutoSwitchCycle({
    profiles,
    activeId: 'c',
    refreshMetrics: async () => ({ primaryRemainingPercent: 2 }),
    switchAccount: async (id) => switched.push(id)
  });
  assert.equal(noSwitch.action, 'limit-available');
  assert.deepEqual(switched, ['c']);
});

test('automatic cycle can be disabled before the account is changed', async () => {
  let enabled = true;
  let switched = false;
  const result = await runAutoSwitchCycle({
    profiles: [{ id: 'a', connected: true }, { id: 'b', connected: true }],
    activeId: 'a',
    refreshMetrics: async (id) => {
      if (id === 'a') return { primaryRemainingPercent: 0 };
      enabled = false;
      return { primaryRemainingPercent: 60 };
    },
    isEnabled: () => enabled,
    switchAccount: async () => { switched = true; }
  });
  assert.equal(result.action, 'disabled');
  assert.equal(switched, false);
});
