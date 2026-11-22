// The kit the crew buys before each job: what each tool costs, what it does when used, and how far
// it reaches. Every dollar spent on tools comes out of the take.
import { TILE } from './config.js';
import { castRay, blocksThrow } from './map.js';
import { addNoise, addFloater } from './effects.js';
import { hearNoise } from './guard.js';

export const TOOLS = [
  { id: 'rattle', key: '1', name: 'Rattle', cost: 60, start: 2, max: 5, range: 6.5 * TILE, blurb: 'Click to throw. Guards walk over to look.' },
  { id: 'smoke', key: '2', name: 'Smoke', cost: 140, start: 1, max: 3, range: 4.5 * TILE, blurb: 'A cloud no cone can see through. 7 seconds.' },
  { id: 'jammer', key: '3', name: 'Jammer', cost: 180, start: 1, max: 3, range: 7 * TILE, blurb: 'Click a camera to blind it for 9 seconds.' },
  { id: 'pick', key: '', name: 'Lockpick', cost: 90, start: 1, max: 4, range: 0, blurb: 'Opens one locked door (hold E).' },
];

export function toolById(id) {
  return TOOLS.find((tool) => tool.id === id);
}

export function startingLoadout() {
  const loadout = {};
  for (const tool of TOOLS) loadout[tool.id] = tool.start;
  return loadout;
}

export function loadoutCost(loadout) {
  return TOOLS.reduce((sum, tool) => sum + tool.cost * loadout[tool.id], 0);
}

/** Where a throw toward (x, y) lands: no further than the tool's reach, short of the first wall. */
function landingSpot(run, tool, x, y) {
  const thief = run.thief;
  const dist = Math.hypot(x - thief.x, y - thief.y);
  const angle = Math.atan2(y - thief.y, x - thief.x);
  const free = castRay(run.map, thief.x, thief.y, angle, Math.min(dist, tool.range), blocksThrow);
  const reach = free < Math.min(dist, tool.range) ? Math.max(0, free - 10) : free;
  return { x: thief.x + Math.cos(angle) * reach, y: thief.y + Math.sin(angle) * reach, reach };
}

/** Where the selected tool would land if used at (x, y) now, and whether it can be used there. */
export function aimTool(run, x, y) {
  const tool = toolById(run.selectedTool);
  if (!tool || tool.id === 'pick') return null;
  if (tool.id === 'jammer') {
    let best = null;
    for (const camera of run.cameras) {
      const d = Math.hypot(camera.x - x, camera.y - y);
      const reach = Math.hypot(camera.x - run.thief.x, camera.y - run.thief.y);
      if (d < 40 && reach <= tool.range && (!best || d < best.d)) best = { camera, d };
    }
    return { tool, x: best ? best.camera.x : x, y: best ? best.camera.y : y, ok: Boolean(best) && run.loadout.jammer > 0, camera: best?.camera ?? null };
  }
  const spot = landingSpot(run, tool, x, y);
  const ok = run.loadout[tool.id] > 0 && spot.reach > 12;
  return { tool, x: spot.x, y: spot.y, ok };
}

/** Use the selected tool at (x, y). Returns true when something happened. */
export function useTool(run, x, y) {
  const aim = aimTool(run, x, y);
  if (!aim || !aim.ok) {
    if (aim) run.events.push('deny');
    return false;
  }
  const { tool } = aim;
  run.loadout[tool.id] -= 1;
  run.stats.toolsUsed += 1;
  if (tool.id === 'rattle') {
    run.thrown.push({ x0: run.thief.x, y0: run.thief.y, x: aim.x, y: aim.y, t: 0, flight: 0.45 });
    run.events.push('throw');
  } else if (tool.id === 'smoke') {
    run.smokes.push({ x: aim.x, y: aim.y, radius: 54, life: 7, maxLife: 7 });
    addNoise(run, aim.x, aim.y, 60, 'puff');
    run.events.push('smoke');
  } else if (tool.id === 'jammer') {
    aim.camera.jammed = 9;
    addFloater(run, aim.camera.x, aim.camera.y - 16, 'JAMMED 9s', 'camera');
    run.events.push('jam');
  }
  return true;
}

/** Fly thrown rattles to where they land, then make the noise guards come running to. */
export function stepTools(run, dt) {
  for (const rattle of run.thrown) {
    rattle.t += dt;
    if (rattle.t >= rattle.flight && !rattle.landed) {
      rattle.landed = true;
      const noise = addNoise(run, rattle.x, rattle.y, 210, 'rattle');
      for (const guard of run.guards) hearNoise(run, guard, noise);
      run.events.push('rattle');
      run.rattles.push({ x: rattle.x, y: rattle.y, age: 0 });
    }
  }
  run.thrown = run.thrown.filter((rattle) => !rattle.landed);
  for (const rattle of run.rattles) rattle.age += dt;
  run.rattles = run.rattles.filter((rattle) => rattle.age < 8);
  for (const smoke of run.smokes) smoke.life -= dt;
  run.smokes = run.smokes.filter((smoke) => smoke.life > 0);
  run.powerCut = Math.max(0, run.powerCut - dt);
}
