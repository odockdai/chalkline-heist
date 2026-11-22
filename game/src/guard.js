// Guards: walking a patrol loop and sweeping their torch at each stop, turning toward a noise,
// growing suspicious while they half-see the thief, chasing once sure, searching, and walking back.
import { DETECT, SIGHT, SPEED, TILE, CATCH_RADIUS, ALARM } from './config.js';
import { findPath, clearLine, moveBox, guardCanStand } from './map.js';
import { sightOfThief, angleGap } from './sight.js';
import { raiseAlarm, tierOf } from './alarm.js';
import { addFloater } from './effects.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  WAIT: 'wait',
  LISTEN: 'listen',
  SUSPECT: 'suspect',
  INVESTIGATE: 'investigate',
  SEARCH: 'search',
  CHASE: 'chase',
  RETURN: 'return',
};
const G = GUARD_STATE;

/** A guard standing at the first stop of its route, its loop of tile steps worked out once. */
export function makeGuard(map, spec) {
  const stops = spec.route.map(([c, r, wait, look]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, wait, look }));
  const loop = [];
  for (let index = 0; index < stops.length; index += 1) {
    const from = stops[index];
    const to = stops[(index + 1) % stops.length];
    const leg = findPath(map, from.x, from.y, to.x, to.y) ?? [{ x: to.x, y: to.y }];
    leg.forEach((node, at) => loop.push(at === leg.length - 1 ? { ...node, stop: to } : { ...node, stop: null }));
  }
  const first = loop[0];
  return {
    kind: 'guard',
    name: spec.name,
    x: stops[0].x,
    y: stops[0].y,
    heading: Math.atan2(first.y - stops[0].y, first.x - stops[0].x) || 0,
    stops,
    loop,
    next: 0,
    state: G.PATROL,
    timer: 0,
    sweepBase: 0,
    sweepT: 0,
    detect: 0,
    detour: [],
    lastSeen: null,
    lostT: 0,
    mood: '',
  };
}

export function guardRange(run) {
  return SIGHT.guardRange * (1 + 0.12 * tierOf(run.alarm));
}

function turnToward(guard, angle, rate, dt) {
  const gap = angleGap(angle, guard.heading);
  const stepTurn = rate * dt;
  guard.heading += Math.abs(gap) <= stepTurn ? gap : Math.sign(gap) * stepTurn;
}

/** Walk toward (x, y); true once there. */
function walkTo(run, guard, x, y, speed, dt) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const move = Math.min(dist, speed * dt);
  turnToward(guard, Math.atan2(dy, dx), SPEED.turn * (guard.state === G.CHASE ? 2 : 1.3), dt);
  moveBox(run.map, guard, (dx / dist) * move, (dy / dist) * move, 9, guardCanStand);
  return false;
}

function followDetour(run, guard, speed, dt) {
  if (guard.detour.length === 0) return true;
  const node = guard.detour[0];
  if (walkTo(run, guard, node.x, node.y, speed, dt)) guard.detour.shift();
  return guard.detour.length === 0;
}

function setDetour(run, guard, x, y) {
  guard.detour = findPath(run.map, guard.x, guard.y, x, y) ?? [];
}

function nearestLoopIndex(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.loop.forEach((node, index) => {
    const d = Math.hypot(node.x - guard.x, node.y - guard.y);
    if (d < bestDist) {
      bestDist = d;
      best = index;
    }
  });
  return best;
}

function speedFor(run, guard) {
  const boost = 1 + 0.14 * tierOf(run.alarm);
  if (guard.state === G.CHASE) return SPEED.chase;
  if (guard.state === G.INVESTIGATE) return SPEED.investigate * boost;
  return SPEED.patrol * boost;
}

/** Send a guard to look at a point: a thrown rattle, a camera's call, footsteps close by. */
export function alertGuard(run, guard, x, y, why) {
  if (guard.state === G.CHASE) return;
  guard.state = G.SUSPECT;
  guard.timer = 0.9;
  guard.lastSeen = { x, y };
  guard.mood = why;
  run.events.push('huh');
}

export function hearNoise(run, guard, noise) {
  if (guard.state === G.CHASE) return;
  const dist = Math.hypot(noise.x - guard.x, noise.y - guard.y);
  if (dist > noise.radius) return;
  if (noise.kind === 'step') {
    if (guard.state === G.SUSPECT || guard.state === G.INVESTIGATE) return;
    guard.state = G.LISTEN;
    guard.timer = 1.3;
    guard.lastSeen = { x: noise.x, y: noise.y };
    guard.detect = Math.min(0.6, guard.detect + 0.12);
    run.events.push('huh');
  } else {
    alertGuard(run, guard, noise.x, noise.y, 'What was that?');
    guard.cause = noise.kind;
  }
}

function startChase(run, guard) {
  guard.state = G.CHASE;
  guard.detect = 1;
  guard.lostT = 0;
  run.stats.spotted += 1;
  run.events.push('spotted');
  raiseAlarm(run, ALARM.spotBurst, `Spotted by ${guard.name}`);
  run.banner = { text: `SPOTTED BY ${guard.name.toUpperCase()}`, sub: 'Break the line of sight: shadow, vent or smoke', color: 'danger', t: 2.4 };
  addFloater(run, guard.x, guard.y - 24, 'THERE!', 'danger');
}

/** One fixed step of one guard: look, decide, move, and catch the thief if close during a chase. */
export function stepGuard(run, guard, dt) {
  const thief = run.thief;
  const strength = sightOfThief(run, guard, guardRange(run), SIGHT.guardHalf);
  const seen = strength > 0;
  if (seen) {
    guard.lastSeen = { x: thief.x, y: thief.y };
    const gain = strength * (DETECT.far + (DETECT.near - DETECT.far) * strength) * (1 + 0.25 * tierOf(run.alarm));
    guard.detect = Math.min(1, guard.detect + gain * dt);
    raiseAlarm(run, ALARM.guard * strength * dt * (guard.detect > DETECT.suspect ? 1 : 0.35), `Seen by ${guard.name}`);
    run.seenBy.push(guard);
    if (guard.detect > 0.55 && guard.state !== G.CHASE) run.closeCall = true;
  } else if (guard.state !== G.CHASE) {
    guard.detect = Math.max(0, guard.detect - DETECT.decay * dt);
  }

  if (guard.detect >= 1 && guard.state !== G.CHASE) startChase(run, guard);
  else if (seen && guard.detect >= DETECT.suspect && (guard.state === G.PATROL || guard.state === G.WAIT || guard.state === G.RETURN || guard.state === G.LISTEN || guard.state === G.SEARCH)) {
    guard.state = G.SUSPECT;
    guard.timer = 1.6;
    addFloater(run, guard.x, guard.y - 22, 'Hm?', 'suspect');
    run.events.push('huh');
  }

  switch (guard.state) {
    case G.PATROL: {
      const node = guard.loop[guard.next];
      if (walkTo(run, guard, node.x, node.y, speedFor(run, guard), dt)) {
        guard.next = (guard.next + 1) % guard.loop.length;
        if (node.stop && node.stop.wait > 0) {
          guard.state = G.WAIT;
          guard.timer = node.stop.wait;
          guard.sweepBase = guard.heading;
          guard.sweepT = 0;
        }
      }
      break;
    }
    case G.WAIT: {
      const stop = guard.loop[(guard.next + guard.loop.length - 1) % guard.loop.length].stop;
      guard.sweepT += dt;
      const look = stop ? stop.look : 0.6;
      turnToward(guard, guard.sweepBase + Math.sin(guard.sweepT * 2.1) * look, SPEED.turn, dt);
      guard.timer -= dt;
      if (guard.timer <= 0) guard.state = G.PATROL;
      break;
    }
    case G.LISTEN:
    case G.SUSPECT: {
      if (guard.lastSeen) turnToward(guard, Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x), SPEED.turn * 1.4, dt);
      if (!seen) guard.timer -= dt;
      if (guard.timer <= 0) {
        if (guard.state === G.SUSPECT && guard.lastSeen) {
          guard.state = G.INVESTIGATE;
          setDetour(run, guard, guard.lastSeen.x, guard.lastSeen.y);
        } else {
          guard.state = G.RETURN;
          guard.detour = [];
        }
      }
      break;
    }
    case G.INVESTIGATE: {
      if (followDetour(run, guard, speedFor(run, guard), dt)) {
        guard.state = G.SEARCH;
        guard.timer = 2.6;
        guard.sweepBase = guard.heading;
        guard.sweepT = 0;
      }
      break;
    }
    case G.SEARCH: {
      guard.sweepT += dt;
      turnToward(guard, guard.sweepBase + Math.sin(guard.sweepT * 2.6) * 1.4, SPEED.turn * 1.3, dt);
      guard.timer -= dt;
      if (guard.timer <= 0) {
        guard.state = G.RETURN;
        guard.detour = [];
        guard.cause = null;
        addFloater(run, guard.x, guard.y - 22, 'Must be rats.', 'dim');
      }
      break;
    }
    case G.RETURN: {
      if (guard.detour.length === 0) {
        guard.next = nearestLoopIndex(guard);
        const node = guard.loop[guard.next];
        setDetour(run, guard, node.x, node.y);
        if (guard.detour.length === 0) guard.state = G.PATROL;
      } else if (followDetour(run, guard, speedFor(run, guard), dt)) {
        guard.state = G.PATROL;
      }
      break;
    }
    case G.CHASE: {
      if (seen) {
        guard.lostT = 0;
        guard.detour = [];
        walkTo(run, guard, thief.x, thief.y, SPEED.chase, dt);
      } else {
        guard.lostT += dt;
        if (guard.detour.length === 0 && guard.lastSeen) setDetour(run, guard, guard.lastSeen.x, guard.lastSeen.y);
        const arrived = followDetour(run, guard, SPEED.chase * 0.9, dt);
        if (arrived || guard.lostT > 4) {
          guard.state = G.SEARCH;
          guard.timer = 3.2;
          guard.detect = 0.5;
          guard.sweepBase = guard.heading;
          guard.sweepT = 0;
          addFloater(run, guard.x, guard.y - 22, 'Lost them...', 'suspect');
          run.events.push('lost');
        }
      }
      const dist = Math.hypot(thief.x - guard.x, thief.y - guard.y);
      if (dist < CATCH_RADIUS && !thief.inVent && clearLine(run.map, guard.x, guard.y, thief.x, thief.y)) {
        run.phase = 'caught';
        run.caughtBy = guard.name;
        run.catcher = { x: guard.x, y: guard.y };
        run.events.push('caught');
      }
      break;
    }
    default:
      guard.state = G.PATROL;
  }
}
