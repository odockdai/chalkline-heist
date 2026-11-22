// Security cameras: a lens on a wall bracket sweeping back and forth. Seeing the thief raises the
// alarm fast and calls the nearest guard; a jammer or the fuse box blinds it for a while.
import { ALARM, SIGHT, TILE } from './config.js';
import { sightOfThief } from './sight.js';
import { raiseAlarm } from './alarm.js';
import { alertGuard, GUARD_STATE } from './guard.js';
import { addFloater } from './effects.js';

export function makeCamera(spec, index) {
  return {
    kind: 'camera',
    id: index,
    x: spec.x * TILE,
    y: spec.y * TILE,
    base: spec.base,
    sweep: spec.sweep,
    period: spec.period,
    phase: index * 1.7,
    heading: spec.base,
    jammed: 0,
    lock: 0,
    called: 0,
  };
}

export function cameraOffline(run, camera) {
  return camera.jammed > 0 || run.powerCut > 0;
}

function nearestGuard(run, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const guard of run.guards) {
    if (guard.state === GUARD_STATE.CHASE) continue;
    const d = Math.hypot(guard.x - x, guard.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = guard;
    }
  }
  return best;
}

/** One fixed step: sweep (or hold on the thief while it sees them), feed the alarm, call a guard. */
export function stepCamera(run, camera, dt) {
  camera.jammed = Math.max(0, camera.jammed - dt);
  camera.called = Math.max(0, camera.called - dt);
  camera.phase += dt;
  if (cameraOffline(run, camera)) {
    camera.lock = 0;
    return;
  }
  const strength = sightOfThief(run, camera, SIGHT.cameraRange, SIGHT.cameraHalf);
  if (strength > 0) {
    camera.lock = Math.min(1, camera.lock + dt * 1.6);
    camera.heading += (Math.atan2(run.thief.y - camera.y, run.thief.x - camera.x) - camera.heading) * Math.min(1, dt * 4);
    raiseAlarm(run, ALARM.camera * (0.4 + strength) * dt, 'Caught on camera');
    run.seenBy.push(camera);
    if (camera.lock > 0.45 && camera.called === 0) {
      const guard = nearestGuard(run, run.thief.x, run.thief.y);
      if (guard) alertGuard(run, guard, run.thief.x, run.thief.y, 'Camera call!');
      camera.called = 4;
      run.events.push('camera');
      addFloater(run, camera.x, camera.y - 16, 'RECORDING', 'camera');
    }
    return;
  }
  camera.lock = Math.max(0, camera.lock - dt);
  const target = camera.base + Math.sin((camera.phase / camera.period) * Math.PI * 2) * camera.sweep;
  camera.heading += (target - camera.heading) * Math.min(1, dt * 3);
}
