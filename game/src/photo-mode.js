// Photo scenes behind ?shot=cover|plan|caught|report. Each one builds a real job and plays the
// real rules forward on a fixed clock: the thief walks from waypoint to waypoint along the
// shortest open path (sneaking where told, holding E where told, using a tool on arrival), the
// guards and cameras run their own code, and the frame is whatever the game draws at the end.
// The same scene always gives the same frame.
import { STEP, TILE } from './config.js';
import { createRun, stepRun, stepPatrols } from './heist.js';
import { loadoutCost, useTool } from './tools.js';
import { findPath, thiefCanStand, openDoor, tileAtPoint } from './map.js';

const at = (c, r) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE });

export const SCENES = {
  cover: {
    job: 0,
    loadout: { rattle: 3, smoke: 1, jammer: 1, pick: 1 },
    plan: [[2, 2], [4, 4], [8, 4], [9, 7], [12, 7], [17, 7], [19, 5], [20, 4], [23, 4], [24, 7], [24, 9], [24, 12], [25, 13]],
    from: [24, 9],
    walked: 11,
    opened: [[20, 4]],
    clock: 52,
    alarm: 38,
    alarmReason: 'Seen by Dunmore',
    cash: [[26, 2], [22, 7]],
    path: [
      { c: 24, r: 9, wait: 0.3, sneak: true, tool: { id: 'jammer', c: 28.85, r: 10.15 } },
      { c: 24, r: 9, wait: 1.2, sneak: true, tool: { id: 'rattle', c: 27, r: 16 } },
      { c: 24, r: 12, sneak: true },
      { c: 24.5, r: 13.2, sneak: true, hold: 3 },
    ],
    seconds: 4.9,
    routes: true,
  },
  plan: {
    job: 1,
    loadout: { rattle: 3, smoke: 1, jammer: 2, pick: 1 },
    plan: [[1, 8], [5, 8], [8, 8], [10, 9], [11, 9], [14, 9], [16, 9], [20, 9], [22, 9], [22, 12], [22, 13], [26, 15], [26, 16]],
    seconds: 14,
    screen: 'plan',
  },
  caught: {
    job: 2,
    loadout: { rattle: 2, smoke: 0, jammer: 1, pick: 1 },
    plan: [],
    path: [{ c: 14, r: 13 }, { c: 12, r: 11 }, { c: 13, r: 9 }],
    seconds: 18,
    after: 1.2,
  },
  report: {
    job: 0,
    loadout: { rattle: 2, smoke: 1, jammer: 1, pick: 2 },
    plan: [[2, 2], [4, 4], [8, 4], [8, 7], [9, 7], [12, 8], [17, 8], [19, 5], [20, 4], [23, 4], [24, 8], [24, 9], [24, 12], [25, 14], [23, 15], [20, 16], [11, 16], [10, 13], [4, 13], [3, 15], [2, 16]],
    from: [3, 15],
    walked: 20,
    opened: [[20, 4], [20, 16]],
    carrying: true,
    cash: [[26, 2], [22, 7], [10, 16]],
    clock: 94,
    alarm: 9,
    closeCalls: 2,
    used: 2,
    path: [{ c: 2, r: 16 }],
    seconds: 3,
  },
};

/** Thief intent for this step: follow the current leg's path, then hold E or use a tool on arrival. */
function scriptedIntent(run, script) {
  const leg = script.path[script.index];
  if (!leg) return { move: { x: 0, y: 0 }, sneak: true, interact: false };
  if (!script.route) {
    const goal = at(leg.c, leg.r);
    script.route = findPath(run.map, run.thief.x, run.thief.y, goal.x, goal.y, thiefCanStand) ?? [];
    if (thiefCanStand(tileAtPoint(run.map, goal.x, goal.y))) script.route.push(goal);
  }
  const node = script.route[0];
  if (node) {
    const dx = node.x - run.thief.x;
    const dy = node.y - run.thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2.5) script.route.shift();
    else return { move: { x: dx / dist, y: dy / dist }, sneak: Boolean(leg.sneak), interact: false };
    if (script.route.length > 0) return { move: { x: 0, y: 0 }, sneak: Boolean(leg.sneak), interact: false };
  }
  if (leg.tool && !script.used) {
    script.used = true;
    run.selectedTool = leg.tool.id;
    const spot = at(leg.tool.c, leg.tool.r);
    useTool(run, spot.x, spot.y);
  }
  if (leg.hold && script.held < leg.hold) {
    script.held += STEP;
    return { move: { x: 0, y: 0 }, sneak: true, interact: true };
  }
  if (leg.wait && script.waited < leg.wait) {
    script.waited += STEP;
    return { move: { x: 0, y: 0 }, sneak: true, interact: false };
  }
  script.index += 1;
  script.route = null;
  script.held = 0;
  script.waited = 0;
  script.used = false;
  return { move: { x: 0, y: 0 }, sneak: Boolean(leg.sneak), interact: false };
}

/** Play a scene's job forward and return the run and the screen it ends on (no drawing). */
export function playScene(scene) {
  const plan = scene.plan.map(([c, r]) => at(c, r));
  const run = createRun(scene.job, scene.loadout, plan);
  run.spent = loadoutCost(scene.loadout);
  run.startLoadout = { ...scene.loadout };
  if (scene.from) {
    // The scene opens partway through the job: the thief has already come this far along the plan.
    const spot = at(scene.from[0], scene.from[1]);
    run.thief.x = spot.x;
    run.thief.y = spot.y;
    run.thief.trail = plan.slice(0, scene.walked ?? 0).concat([spot]);
    for (const [c, r] of scene.opened ?? []) {
      const door = run.map.doors.find((d) => d.c === c && d.r === r);
      if (door) {
        openDoor(run.map, door);
        run.loadout.pick -= 1;
      }
    }
    run.time = scene.clock ?? 0;
    run.banner = null;
    if (scene.carrying) {
      run.thief.carrying = true;
      run.phase = 'getaway';
      run.stats.loot += run.job.mark.value;
    }
    if (scene.closeCalls) run.stats.closeCalls = scene.closeCalls;
    if (scene.used) run.stats.toolsUsed = scene.used;
  }
  if (scene.alarm) {
    run.alarm = scene.alarm;
    run.lastAlarmReason = scene.alarmReason ?? null;
  }
  if (scene.cash) for (const [c, r] of scene.cash) {
    const stack = run.map.cash.find((s) => s.c === c && s.r === r);
    if (stack) {
      stack.taken = true;
      run.stats.cash += stack.value;
    }
  }
  const steps = Math.round(scene.seconds / STEP);
  if (scene.screen === 'plan') {
    run.phase = 'plan';
    run.banner = null;
    for (let index = 0; index < steps; index += 1) stepPatrols(run, STEP);
    return { run, screen: 'plan' };
  }
  const script = { path: scene.path ?? [], index: 0, route: null, held: 0, waited: 0, used: false };
  let screen = 'play';
  for (let index = 0; index < steps; index += 1) {
    stepRun(run, scriptedIntent(run, script), STEP);
    run.events = [];
    if (run.phase === 'caught' || run.phase === 'escaped') break;
  }
  if (run.phase === 'caught') {
    screen = 'caught';
    const extra = Math.round((scene.after ?? 1) / STEP);
    for (let index = 0; index < extra; index += 1) stepRun(run, { move: { x: 0, y: 0 }, sneak: false, interact: false }, STEP);
  }
  if (scene.screen === 'report' || run.phase === 'escaped') screen = 'report';
  return { run, screen, script };
}

/** Build the named scene for main.js and return a redraw function. */
export function stageShot(name, game, draw, seconds = null) {
  const base = SCENES[name] ?? SCENES.cover;
  const scene = seconds === null ? base : { ...base, seconds };
  const { run, screen } = playScene(scene);
  game.run = run;
  game.screen = screen;
  game.time = run.time;
  const options = { hideAim: true, routes: Boolean(scene.routes) };
  return { redraw: () => draw(options), run };
}
