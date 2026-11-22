// Draws the map area each frame, in layer order: the painted blueprint, chalk lines, props,
// camera and guard cones, smoke and noise, then the thief, cameras, guards and labels on top.
import { MAP, COLOR, SIGHT } from './config.js';
import { guardRange, GUARD_STATE } from './guard.js';
import { cameraOffline } from './camera.js';
import { aimTool } from './tools.js';
import { paintBlueprint, paintFloorMask, drawRoomLabels } from './blueprint.js';
import { paintLampLight, paintShadowHatch, drawSpotlight } from './lamps.js';
import { coneColors, coneShape, drawCone, drawNight, drawPatrolRoutes, drawPlan } from './cones.js';
import { drawDoors, drawFuses, drawCash, drawMark, drawVan, drawSmokes, drawNoises } from './props.js';
import { drawCamera, drawGuard, drawThief, drawTaskRing, drawFloaters, chalkNote } from './actors.js';

export { drawPlan, drawPatrolRoutes } from './cones.js';
export { drawGem, drawPadlock, drawMark } from './props.js';
export { chalkNote } from './actors.js';

const G = GUARD_STATE;
const blueprints = new Map();

function blueprintFor(run) {
  if (!blueprints.has(run.job.id)) blueprints.set(run.job.id, { paper: paintBlueprint(run.map, run.job), floor: paintFloorMask(run.map), lamps: paintLampLight(run.map), hatch: paintShadowHatch(run.map) });
  return blueprints.get(run.job.id);
}

function drawAim(ctx, run, mouse) {
  const local = { x: mouse.x - MAP.x, y: mouse.y - MAP.y };
  if (local.x < 0 || local.y < 0 || local.x > MAP.width || local.y > MAP.height) return;
  const aim = aimTool(run, local.x, local.y);
  if (!aim) return;
  ctx.save();
  ctx.strokeStyle = aim.ok ? 'rgba(255,244,210,0.8)' : 'rgba(255,90,79,0.8)';
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(run.thief.x, run.thief.y);
  ctx.lineTo(aim.x, aim.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  const radius = aim.tool.id === 'smoke' ? 54 : aim.tool.id === 'jammer' ? 18 : 10;
  ctx.arc(aim.x, aim.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Draw the whole map area for a run. `options.notes` adds the chalk legend callouts. */
export function drawWorld(ctx, run, time, mouse, options = {}) {
  ctx.save();
  ctx.translate(MAP.x, MAP.y);
  ctx.beginPath();
  ctx.rect(0, 0, MAP.width, MAP.height);
  ctx.clip();
  const sheets = blueprintFor(run);
  ctx.drawImage(sheets.paper, 0, 0);
  if (options.routes) drawPatrolRoutes(ctx, run, 0.45);
  drawPlan(ctx, run.plan, time, run.phase !== 'plan');
  drawDoors(ctx, run);
  drawFuses(ctx, run);
  const lenses = run.cameras.filter((camera) => !cameraOffline(run, camera)).map((camera) => ({ camera, shape: coneShape(run, camera.x, camera.y, camera.heading, SIGHT.cameraHalf, SIGHT.cameraRange) }));
  const range = guardRange(run);
  const torches = run.guards.map((guard) => ({ guard, shape: coneShape(run, guard.x, guard.y, guard.heading, SIGHT.guardHalf, range) }));
  drawNight(ctx, sheets.floor, [...lenses, ...torches].map((cone) => cone.shape), run.phase === 'plan' ? 0.4 : 0.95);
  if (run.phase !== 'plan') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(sheets.lamps, 0, 0);
    ctx.restore();
  }
  ctx.drawImage(sheets.hatch, 0, 0);
  drawRoomLabels(ctx, run.job);
  if (!run.thief.carrying) drawSpotlight(ctx, run.map.mark, time);
  drawCash(ctx, run, time);
  drawMark(ctx, run, time);
  drawVan(ctx, run, time);
  for (const { camera, shape } of lenses) drawCone(ctx, shape, COLOR.cameraCone, camera.lock > 0 ? 1.3 : 0.85);
  for (const { guard, shape } of torches) drawCone(ctx, shape, coneColors(guard).rgb, guard.state === G.CHASE ? 1.25 : 1);
  drawSmokes(ctx, run);
  drawNoises(ctx, run);
  if (run.phase !== 'plan') drawThief(ctx, run, time);
  for (const camera of run.cameras) drawCamera(ctx, run, camera, time);
  for (const guard of run.guards) drawGuard(ctx, guard, time);
  if (run.phase === 'infiltrate' || run.phase === 'getaway') drawTaskRing(ctx, run);
  drawFloaters(ctx, run);
  if (options.callouts) for (const note of options.callouts) chalkNote(ctx, note.x, note.y, note.text, COLOR[note.color] ?? COLOR.chalk, note.size ?? 15, note.from);
  if (mouse && (run.phase === 'infiltrate' || run.phase === 'getaway')) drawAim(ctx, run, mouse);
  if (run.seenBy.length > 0 && run.phase !== 'caught') {
    ctx.strokeStyle = 'rgba(255,61,61,0.9)';
    ctx.lineWidth = 2;
    for (const viewer of run.seenBy) {
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(viewer.x, viewer.y);
      ctx.lineTo(run.thief.x, run.thief.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}
