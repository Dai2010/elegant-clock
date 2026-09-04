const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RECOVERY_COOLDOWN_MS,
  RENDERER_STALE_AFTER_MS,
  WATCHDOG_CHECK_INTERVAL_MS,
  createWatchdogMonitor
} = require('../src/watchdog-monitor');

test('uses a low-frequency watchdog schedule', () => {
  assert.equal(WATCHDOG_CHECK_INTERVAL_MS, 15_000);
  assert.equal(RENDERER_STALE_AFTER_MS, 45_000);
  assert.equal(RECOVERY_COOLDOWN_MS, 120_000);
});

test('does not report a stall until a renderer heartbeat becomes stale', () => {
  let now = 0;
  const stalls = [];
  const monitor = createWatchdogMonitor({
    now: () => now,
    onStall: (event) => stalls.push(event)
  });

  assert.equal(monitor.check(), false);
  monitor.heartbeat();

  now = RENDERER_STALE_AFTER_MS - 1;
  assert.equal(monitor.check(), false);

  now = RENDERER_STALE_AFTER_MS;
  assert.equal(monitor.check(), true);
  assert.deepEqual(stalls, [{ staleForMs: RENDERER_STALE_AFTER_MS }]);
});

test('limits repeated recovery requests with a cooldown', () => {
  let now = 0;
  let stallCount = 0;
  const monitor = createWatchdogMonitor({
    now: () => now,
    onStall: () => {
      stallCount += 1;
    }
  });

  monitor.heartbeat();
  now = RENDERER_STALE_AFTER_MS;
  assert.equal(monitor.check(), true);

  now += WATCHDOG_CHECK_INTERVAL_MS;
  assert.equal(monitor.check(), false);

  now = RENDERER_STALE_AFTER_MS + RECOVERY_COOLDOWN_MS;
  assert.equal(monitor.check(), true);
  assert.equal(stallCount, 2);
});

test('grants a fresh observation period after the watchdog itself is delayed', () => {
  let now = 0;
  let stallCount = 0;
  const monitor = createWatchdogMonitor({
    now: () => now,
    onStall: () => {
      stallCount += 1;
    }
  });

  monitor.heartbeat();
  now = 10 * RENDERER_STALE_AFTER_MS;
  monitor.grantGracePeriod();
  assert.equal(monitor.check(), false);

  now += RENDERER_STALE_AFTER_MS;
  assert.equal(monitor.check(), true);
  assert.equal(stallCount, 1);
});

test('pauses hidden windows and starts a new grace period when they return', () => {
  let now = 0;
  let stallCount = 0;
  const monitor = createWatchdogMonitor({
    now: () => now,
    onStall: () => {
      stallCount += 1;
    }
  });

  monitor.resume();
  monitor.pause();
  now = 10 * RENDERER_STALE_AFTER_MS;
  assert.equal(monitor.check(), false);

  monitor.resume();
  now += RENDERER_STALE_AFTER_MS - 1;
  assert.equal(monitor.check(), false);

  now += 1;
  assert.equal(monitor.check(), true);
  assert.equal(stallCount, 1);
});
