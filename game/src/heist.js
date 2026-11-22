// One job in progress: building it from a blueprint and a bought kit, and the fixed-step update
// that moves the thief, the guards and the cameras, the alarm and the getaway in order.
import { JOBS } from './levels.js';
import { parseBlueprint } from './map.js';
import { makeThief, stepThief } from './thief.js';
import { makeGuard, stepGuard, hearNoise } from './guard.js';
import { makeCamera, stepCamera } from './camera.js';
import { stepTools } from './tools.js';
import { stepAlarm } from './alarm.js';
import { stepEffects } from './effects.js';
import { makeRng } from './rng.js';

export function createRun(jobIndex, loadout, plan = []) {
  const job = JOBS[jobIndex];
  const map = parseBlueprint(job);
  return {
    jobIndex,
    job,
    map,
    thief: makeThief(map),
    guards: job.guards.map((spec) => makeGuard(map, spec)),
    cameras: job.cameras.map((spec, index) => makeCamera(spec, index)),
    loadout: { ...loadout },
    spent: 0,
    plan: plan.map((point) => ({ ...point })),
    selectedTool: 'rattle',
    alarm: 0,
    lockdown: null,
    phase: 'infiltrate',
    caughtBy: null,
    caughtT: 0,
    time: 0,
    stats: { spotted: 0, loot: 0, cash: 0, toolsUsed: 0, closeCalls: 0 },
    noises: [],
    floaters: [],
    sparks: [],
    smokes: [],
    thrown: [],
    rattles: [],
    powerCut: 0,
    seenBy: [],
    events: [],
    banner: { text: job.name.toUpperCase(), sub: `Lift ${job.mark.name}, then get to the van.`, color: 'ink', t: 2.8 },
    closeCall: false,
    wasClose: false,
    notes: true,
    rng: makeRng(jobIndex * 7919 + 17),
  };
}

/** Is the run still being played (not caught, not away clean)? */
export function runLive(run) {
  return run.phase === 'infiltrate' || run.phase === 'getaway';
}

/** One fixed step of the whole job. `intent` is { move: {x, y}, sneak, interact }. */
export function stepRun(run, intent, dt) {
  run.seenBy = [];
  run.closeCall = false;
  if (!runLive(run)) {
    if (run.phase === 'caught') run.caughtT += dt;
    stepEffects(run, dt);
    return;
  }
  run.time += dt;
  const before = run.noises.length;
  stepThief(run, intent, dt);
  for (let index = before; index < run.noises.length; index += 1) {
    const noise = run.noises[index];
    if (noise.kind === 'step' || noise.kind === 'clunk') for (const guard of run.guards) hearNoise(run, guard, noise);
  }
  stepTools(run, dt);
  for (const guard of run.guards) {
    stepGuard(run, guard, dt);
    if (!runLive(run)) break;
  }
  for (const camera of run.cameras) stepCamera(run, camera, dt);
  stepAlarm(run, dt, run.seenBy.length > 0);
  if (run.closeCall && !run.wasClose) run.stats.closeCalls += 1;
  run.wasClose = run.closeCall;
  stepEffects(run, dt);
}

/** Guards walk and cameras sweep with no thief on the map: the planning table and the title screen. */
export function stepPatrols(run, dt) {
  run.seenBy = [];
  run.time += dt;
  for (const guard of run.guards) stepGuard(run, guard, dt);
  for (const camera of run.cameras) stepCamera(run, camera, dt);
  stepEffects(run, dt);
}

/** The highest suspicion any guard holds right now (0 to 1), for the heartbeat and the HUD. */
export function peakSuspicion(run) {
  let peak = 0;
  for (const guard of run.guards) peak = Math.max(peak, guard.detect);
  for (const camera of run.cameras) peak = Math.max(peak, camera.lock * 0.8);
  return peak;
}
