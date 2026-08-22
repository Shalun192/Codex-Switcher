'use strict';

async function switchAccountSafely({ lifecycle, activate }) {
  let stopped = null;
  try {
    stopped = await lifecycle.stop();
    await activate();
  } catch (error) {
    if (stopped?.wasRunning) await lifecycle.start().catch(() => {});
    throw error;
  }
  return lifecycle.start();
}

module.exports = { switchAccountSafely };
