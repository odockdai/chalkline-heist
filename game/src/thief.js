// The thief: walking, sneaking and crawling through vents, footstep noise, hiding in shadow,
// and the hold-to-finish jobs (picking a lock, cutting the power, lifting the mark).
import { SPEED, NOISE, TILE, GRAB_SECONDS, PICK_SECONDS } from './config.js';
import { TILE_KIND, tileAtPoint, thiefCanStand, moveBox, openDoor } from './map.js';
import { addNoise, addFloater, addSparks } from './effects.js';
import { raiseAlarm } from './alarm.js';

export const REACH = 30;

export function makeThief(map) {
  return {
    x: map.start.x,
    y: map.start.y,
    heading: 0,
    sneaking: false,
    moving: false,
    inShadow: false,
    inVent: false,
    busy: false,
    task: null,
    stepT: 0,
    carrying: false,
    trail: [{ x: map.start.x, y: map.start.y }],
    trailT: 0,
  };
}

/** The interaction in reach right now, if any: a locked door, the fuse box, or the mark. */
export function reachableTask(run) {
  const thief = run.thief;
  const near = (spot) => Math.hypot(spot.x - thief.x, spot.y - thief.y) < REACH + 6;
  for (const door of run.map.doors) {
    if (!door.open && near(door)) return { kind: 'pick', target: door, need: PICK_SECONDS, label: run.loadout.pick > 0 ? 'Hold E: pick the lock' : 'Locked: you need a lockpick' };
  }
  for (const fuse of run.map.fuses) {
    if (!fuse.used && near(fuse)) return { kind: 'fuse', target: fuse, need: 0.8, label: 'Hold E: cut the camera power (loud)' };
  }
  if (!thief.carrying && near(run.map.mark)) return { kind: 'grab', target: run.map.mark, need: GRAB_SECONDS, label: `Hold E: lift ${run.job.mark.name}` };
  return null;
}

function finishTask(run, task) {
  const thief = run.thief;
  if (task.kind === 'pick') {
    run.loadout.pick -= 1;
    openDoor(run.map, task.target);
    addSparks(run, task.target.x, task.target.y, 10, 'lock');
    addFloater(run, task.target.x, task.target.y - 18, 'Click.', 'lock');
    run.events.push('unlock');
  } else if (task.kind === 'fuse') {
    task.target.used = true;
    run.powerCut = 12;
    addNoise(run, task.target.x, task.target.y, 170, 'clunk');
    addFloater(run, task.target.x, task.target.y - 18, 'Cameras dark: 12s', 'camera');
    run.events.push('fuse');
  } else if (task.kind === 'grab') {
    thief.carrying = true;
    run.phase = 'getaway';
    run.stats.loot += run.job.mark.value;
    raiseAlarm(run, 12, 'The pedestal alarm');
    addSparks(run, task.target.x, task.target.y, 16, 'loot');
    run.banner = { text: 'GOT IT', sub: 'The pedestal is chirping. Get to the van.', color: 'loot', t: 3 };
    run.events.push('grab');
  }
}

/** One fixed step of the thief from this frame's intent: { move, sneak, interact }. */
export function stepThief(run, intent, dt) {
  const thief = run.thief;
  const here = tileAtPoint(run.map, thief.x, thief.y);
  thief.inVent = here === TILE_KIND.VENT;
  thief.inShadow = here === TILE_KIND.SHADOW;
  thief.sneaking = intent.sneak || thief.inVent;

  const task = reachableTask(run);
  const canWork = task && (task.kind !== 'pick' || run.loadout.pick > 0);
  if (intent.interact && canWork) {
    if (!thief.task || thief.task.kind !== task.kind || thief.task.target !== task.target) thief.task = { ...task, progress: 0 };
    thief.task.progress += dt;
    thief.busy = true;
    if (Math.floor(thief.task.progress * 6) !== Math.floor((thief.task.progress - dt) * 6)) run.events.push('work');
    if (thief.task.progress >= thief.task.need) {
      finishTask(run, thief.task);
      thief.task = null;
    }
  } else {
    thief.task = null;
    thief.busy = false;
  }

  const speed = thief.busy ? 0 : thief.inVent ? SPEED.crawl : thief.sneaking ? SPEED.sneak : SPEED.walk;
  thief.moving = speed > 0 && (intent.move.x !== 0 || intent.move.y !== 0);
  if (thief.moving) {
    thief.heading = Math.atan2(intent.move.y, intent.move.x);
    moveBox(run.map, thief, intent.move.x * speed * dt, intent.move.y * speed * dt, 8, thiefCanStand);
    thief.stepT += dt;
    if (!thief.sneaking && thief.stepT >= NOISE.stepEvery) {
      thief.stepT = 0;
      addNoise(run, thief.x, thief.y, NOISE.walk, 'step');
      run.events.push('step');
    }
  }

  for (const cash of run.map.cash) {
    if (!cash.taken && Math.hypot(cash.x - thief.x, cash.y - thief.y) < 18) {
      cash.taken = true;
      run.stats.cash += cash.value;
      addFloater(run, cash.x, cash.y - 14, `+$${cash.value}`, 'loot');
      run.events.push('coin');
    }
  }

  thief.trailT += dt;
  if (thief.trailT > 0.25) {
    thief.trailT = 0;
    const last = thief.trail[thief.trail.length - 1];
    if (Math.hypot(last.x - thief.x, last.y - thief.y) > 6) thief.trail.push({ x: thief.x, y: thief.y });
  }

  if (thief.carrying && Math.hypot(run.map.exit.x - thief.x, run.map.exit.y - thief.y) < TILE * 0.9) {
    run.phase = 'escaped';
    run.events.push('escape');
  }
}
