const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../assets/holo-card/card.jsx'), 'utf8');
const controllerSource = source.slice(0, source.indexOf('function HolographicPortrait()'));

function eventTarget(extra = {}) {
  const listeners = new Map();
  return Object.assign({
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name, event = {}) { for (const fn of listeners.get(name) || []) fn(event); },
    count(name) { return listeners.get(name)?.size || 0; }
  }, extra);
}

function setup({ permission, secure = true, supported = true, reduced = false } = {}) {
  const updates = [], statuses = [], timers = new Map();
  const media = eventTarget({ matches: reduced });
  const screenOrientation = eventTarget({ angle: 0 });
  const doc = eventTarget({ hidden: false });
  const win = eventTarget({ isSecureContext: secure, screen: { orientation: screenOrientation }, matchMedia: () => media });
  if (supported) win.DeviceOrientationEvent = permission ? { requestPermission: permission } : {};
  let clock = 100, timerId = 0, observer;
  const context = vm.createContext({
    window: win, document: doc, performance: { now: () => clock },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { observer = this; this.callback = callback; this.connected = false; }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    }
  });
  vm.runInContext(controllerSource, context);
  const controller = context.createHoloMotion({}, (x, y) => updates.push({ x, y }), value => statuses.push(value));
  return {
    controller, context, win, doc, media, screenOrientation, updates, statuses, timers,
    get observer() { return observer; },
    sample(beta, gamma, alpha = 0, elapsed = 16) { clock += elapsed; win.emit('deviceorientation', { beta, gamma, alpha }); },
    visible(value) { observer.callback([{ isIntersecting: value }]); },
    timeout() { const pending = [...timers.values()]; timers.clear(); for (const item of pending) item.fn(); }
  };
}

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('permission is requested only on enable; valid readings calibrate, clamp and smooth tilt', async () => {
  let requests = 0;
  const env = setup({ permission: async () => { requests++; return 'granted'; } });
  assert.equal(requests, 0);
  assert.equal(env.win.count('deviceorientation'), 0);
  await env.controller.enable();
  assert.equal(requests, 1);
  assert.equal(env.statuses.at(-1), 'calibrating');
  env.sample(60, 0);
  assert.equal(env.statuses.at(-1), 'active');
  near(env.updates.at(-1).x, 0);
  near(env.updates.at(-1).y, 0);
  env.sample(60, 25);
  assert.ok(env.updates.at(-1).x > 0 && env.updates.at(-1).x < 1);
  for (let i = 0; i < 100; i++) env.sample(60, 80);
  near(env.updates.at(-1).x, 1);
  assert.equal(env.timers.size, 0);
  env.controller.stop();
  assert.equal(env.win.count('deviceorientation'), 0);
  assert.equal(env.observer.connected, false);
  assert.equal(env.statuses.at(-1), 'off');
  near(env.updates.at(-1).x, 0);
});

test('relative rotation works in portrait, landscape, and across equivalent Euler representations', () => {
  const { context: { holoOrientation: q, holoRelativeTilt: tilt } } = setup();
  const origin = q({ alpha: 0, beta: 0, gamma: 0 });
  near(tilt(origin, q({ alpha: 0, beta: 0, gamma: 25 }), 0).x, 1);
  near(tilt(origin, q({ alpha: 0, beta: 25, gamma: 0 }), 0).y, 1);
  near(tilt(origin, q({ alpha: 0, beta: 25, gamma: 0 }), 90).x, 1);
  near(tilt(origin, q({ alpha: 0, beta: 25, gamma: 0 }), 270).x, -1);
  const first = q({ alpha: 0, beta: 89, gamma: 0 });
  near(tilt(first, q({ alpha: 0, beta: 91, gamma: 0 }), 0).y, 2 / 25);
  const equivalent = q({ alpha: 180, beta: 91, gamma: 180 });
  near(tilt(first, equivalent, 0).x, 0);
  near(tilt(first, equivalent, 0).y, 0);
  const wrapped = tilt(q({ alpha: 359, beta: 60, gamma: 0 }), q({ alpha: 1, beta: 60, gamma: 0 }), 0);
  assert.ok(Math.abs(wrapped.x) < .1 && Math.abs(wrapped.y) < .1);
});

test('permission-free browsers work; explicit recenter and screen rotation reset the neutral pose', async () => {
  const env = setup();
  await env.controller.enable();
  env.sample(50, 10);
  env.sample(65, 20);
  assert.ok(env.updates.at(-1).y > 0);
  env.controller.recenter();
  env.sample(65, 20);
  near(env.updates.at(-1).y, 0);
  env.screenOrientation.angle = 90;
  env.screenOrientation.emit('change');
  env.sample(30, -20);
  near(env.updates.at(-1).x, 0);
  near(env.updates.at(-1).y, 0);
});

test('denied and rejected permission leave manual controls available', async () => {
  for (const permission of [async () => 'denied', async () => { throw Object.assign(new Error('blocked'), { name: 'NotAllowedError' }); }]) {
    const env = setup({ permission });
    await env.controller.enable();
    assert.equal(env.controller.isEnabled(), false);
    assert.equal(env.statuses.at(-1), 'denied');
    assert.equal(env.win.count('deviceorientation'), 0);
  }
});

test('insecure, unsupported and reduced-motion cases do not request permission', async () => {
  for (const [options, expected] of [[{ secure: false }, 'insecure'], [{ supported: false }, 'unavailable'], [{ reduced: true }, 'reduced']]) {
    const env = setup({ ...options, permission: () => { throw new Error('Must not request'); } });
    await env.controller.enable();
    assert.equal(env.statuses.at(-1), expected);
    assert.equal(env.controller.isEnabled(), false);
    assert.equal(env.timers.size, 0);
  }
});

test('missing or null readings time out and allow retry', async () => {
  const env = setup();
  await env.controller.enable();
  env.sample(null, null);
  env.sample(NaN, 0);
  assert.equal(env.statuses.at(-1), 'calibrating');
  assert.equal([...env.timers.values()][0].delay, 8000);
  env.timeout();
  assert.equal(env.statuses.at(-1), 'unavailable');
  assert.equal(env.controller.isEnabled(), false);
  await env.controller.enable();
  env.sample(0, 0);
  assert.equal(env.statuses.at(-1), 'active');
  assert.equal(env.win.count('deviceorientation'), 1);
});

test('offscreen and hidden updates pause and resume with fresh calibration', async () => {
  const env = setup();
  await env.controller.enable();
  env.sample(40, 0);
  env.visible(false);
  const before = env.updates.length;
  env.sample(50, 15);
  assert.equal(env.updates.length, before);
  assert.equal(env.timers.size, 0);
  env.visible(true);
  env.sample(50, 15);
  near(env.updates.at(-1).x, 0);
  env.doc.hidden = true;
  env.doc.emit('visibilitychange');
  const hidden = env.updates.length;
  env.sample(70, 30);
  assert.equal(env.updates.length, hidden);
  assert.equal(env.timers.size, 0);
  env.doc.hidden = false;
  env.doc.emit('visibilitychange');
  env.sample(70, 30);
  near(env.updates.at(-1).y, 0);
});

test('changing reduced-motion preference stops an active sensor', async () => {
  const env = setup();
  await env.controller.enable();
  env.media.matches = true;
  env.media.emit('change');
  assert.equal(env.controller.isEnabled(), false);
  assert.equal(env.statuses.at(-1), 'reduced');
  assert.equal(env.win.count('deviceorientation'), 0);
});

test('unmount clears listeners/timers and cannot be undone by a pending permission result', async () => {
  let grant;
  const env = setup({ permission: () => new Promise(resolve => { grant = resolve; }) });
  const pending = env.controller.enable();
  env.controller.destroy();
  grant('granted');
  await pending;
  assert.equal(env.controller.isEnabled(), false);
  assert.equal(env.win.count('deviceorientation'), 0);
  assert.equal(env.statuses.at(-1), 'requesting');
  assert.equal(env.timers.size, 0);
  const active = setup();
  await active.controller.enable();
  active.controller.destroy();
  assert.equal(active.win.count('deviceorientation'), 0);
  assert.equal(active.win.count('orientationchange'), 0);
  assert.equal(active.screenOrientation.count('change'), 0);
  assert.equal(active.doc.count('visibilitychange'), 0);
  assert.equal(active.media.count('change'), 0);
  assert.equal(active.timers.size, 0);
});
