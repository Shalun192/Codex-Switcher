'use strict';

const AUTO_SWITCH_THRESHOLD_PERCENT = 1;

function knownLimitPercentages(metrics) {
  if (!metrics || typeof metrics !== 'object') return [];
  return [metrics.primaryRemainingPercent, metrics.secondaryRemainingPercent]
    .filter((value) => Number.isFinite(value));
}

function isLimitExhausted(metrics) {
  const percentages = knownLimitPercentages(metrics);
  return percentages.length > 0 && percentages.some((value) => value <= AUTO_SWITCH_THRESHOLD_PERCENT);
}

function hasAvailableLimit(metrics) {
  const percentages = knownLimitPercentages(metrics);
  return percentages.length > 0 && percentages.every((value) => value > AUTO_SWITCH_THRESHOLD_PERCENT);
}

function profilesAfterActive(profiles, activeId) {
  if (!Array.isArray(profiles) || profiles.length < 2) return [];
  const activeIndex = profiles.findIndex((profile) => profile.id === activeId);
  if (activeIndex < 0) return [];
  return profiles
    .slice(activeIndex + 1)
    .concat(profiles.slice(0, activeIndex))
    .filter((profile) => profile.id !== activeId && profile.connected === true);
}

async function findNextAvailableProfile(profiles, activeId, refreshMetrics) {
  const checked = [];
  for (const profile of profilesAfterActive(profiles, activeId)) {
    try {
      const metrics = await refreshMetrics(profile.id);
      checked.push({ id: profile.id, metrics });
      if (hasAvailableLimit(metrics)) return { profile, metrics, checked };
    } catch (error) {
      checked.push({ id: profile.id, error: error?.message || String(error) });
    }
  }
  return { profile: null, metrics: null, checked };
}

async function runAutoSwitchCycle(options) {
  const {
    profiles,
    activeId,
    refreshMetrics,
    switchAccount,
    isEnabled = () => true,
    onExhausted = () => {}
  } = options;
  const active = profiles.find((profile) => profile.id === activeId);
  if (!active || profiles.length < 2) return { action: 'not-enough-accounts' };
  let currentMetrics;
  try {
    currentMetrics = await refreshMetrics(active.id);
  } catch (error) {
    error.autoSwitchStage = 'current-metrics';
    throw error;
  }
  if (!isLimitExhausted(currentMetrics)) return { action: 'limit-available', currentMetrics };
  await onExhausted(active, currentMetrics);
  const next = await findNextAvailableProfile(profiles, active.id, refreshMetrics);
  if (!next.profile) return { action: 'no-available-account', currentMetrics, checked: next.checked };
  if (!isEnabled()) return { action: 'disabled', currentMetrics, checked: next.checked };
  try {
    await switchAccount(next.profile.id);
  } catch (error) {
    error.autoSwitchStage = 'switch';
    throw error;
  }
  return {
    action: 'switched',
    profileId: next.profile.id,
    currentMetrics,
    targetMetrics: next.metrics,
    checked: next.checked
  };
}

module.exports = {
  AUTO_SWITCH_THRESHOLD_PERCENT,
  knownLimitPercentages,
  isLimitExhausted,
  hasAvailableLimit,
  profilesAfterActive,
  findNextAvailableProfile,
  runAutoSwitchCycle
};
