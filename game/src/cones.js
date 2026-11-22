// Vision cones and chalk lines on the map: torch and lens cones cut short by walls, the guards'
// dotted patrol loops with their stop timers, and the route the player chalked during planning.
import { COLOR, FONT } from './config.js';
import { conePolygon } from './sight.js';
import { GUARD_STATE } from './guard.js';

const G = GUARD_STATE;

export function fillPolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index], points[index + 1]);
  ctx.closePath();
}

export function coneColors(guard) {
  if (guard.state === G.CHASE) return { rgb: COLOR.chaseCone, ring: COLOR.chase };
  if (guard.detect > 0.05 || guard.state === G.SUSPECT || guard.state === G.INVESTIGATE || guard.state === G.SEARCH || guard.state === G.LISTEN) return { rgb: COLOR.suspectCone, ring: COLOR.suspect };
  return { rgb: COLOR.guardCone, ring: COLOR.guard };
}

/** The outline of a cone from (x, y), each ray stopped at the first wall or case. */
export function coneShape(run, x, y, heading, half, range) {
  return { x, y, range, points: conePolygon(run.map, x, y, heading, half, range) };
}

/** Tint a cone shape (from coneShape) in its owner's colour, brighter near the source. */
export function drawCone(ctx, shape, rgb, strength) {
  const { x, y, range, points } = shape;
  const gradient = ctx.createRadialGradient(x, y, 6, x, y, range);
  gradient.addColorStop(0, `${rgb}${0.5 * strength})`);
  gradient.addColorStop(0.7, `${rgb}${0.26 * strength})`);
  gradient.addColorStop(1, `${rgb}${0.1 * strength})`);
  fillPolygon(ctx, points);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = `${rgb}${0.85 * strength})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/**
 * Night over the blueprint: dim the whole map, then let each torch and lens cone cut its light
 * back out, so the lit wedges are the danger and everything dim is where you can move.
 */
let nightLayer = null;

export function drawNight(ctx, floorMask, cones, strength) {
  const width = floorMask.width;
  const height = floorMask.height;
  if (!nightLayer) nightLayer = document.createElement('canvas');
  if (nightLayer.width !== width || nightLayer.height !== height) {
    nightLayer.width = width;
    nightLayer.height = height;
  }
  const layer = nightLayer.getContext('2d');
  layer.globalCompositeOperation = 'source-over';
  layer.clearRect(0, 0, width, height);
  layer.drawImage(floorMask, 0, 0);
  layer.globalCompositeOperation = 'source-in';
  layer.fillStyle = `rgba(1,5,14,${strength})`;
  layer.fillRect(0, 0, width, height);
  layer.globalCompositeOperation = 'destination-out';
  for (const cone of cones) {
    const gradient = layer.createRadialGradient(cone.x, cone.y, 4, cone.x, cone.y, cone.range);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.45)');
    fillPolygon(layer, cone.points);
    layer.fillStyle = gradient;
    layer.fill();
  }
  ctx.drawImage(nightLayer, 0, 0);
}

export function drawPatrolRoutes(ctx, run, alpha = 0.35) {
  ctx.save();
  ctx.setLineDash([3, 6]);
  ctx.lineWidth = 1.5;
  for (const guard of run.guards) {
    ctx.strokeStyle = `rgba(255,140,120,${alpha})`;
    ctx.beginPath();
    guard.stops.forEach((stop, index) => (index === 0 ? ctx.moveTo(stop.x, stop.y) : ctx.lineTo(stop.x, stop.y)));
    for (const node of guard.loop) ctx.lineTo(node.x, node.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const stop of guard.stops) {
      ctx.fillStyle = `rgba(255,140,120,${alpha + 0.2})`;
      ctx.beginPath();
      ctx.arc(stop.x, stop.y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (stop.wait > 0) {
        ctx.font = `600 11px ${FONT.ui}`;
        ctx.fillText(`${stop.wait.toFixed(1)}s`, stop.x + 6, stop.y - 6);
      }
    }
    ctx.setLineDash([3, 6]);
  }
  ctx.restore();
}

export function drawPlan(ctx, plan, time, faded) {
  if (plan.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = faded ? 'rgba(255,244,210,0.45)' : 'rgba(255,244,210,0.9)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -time * 18;
  ctx.beginPath();
  plan.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  const end = plan[plan.length - 1];
  const prev = plan[Math.max(0, plan.length - 4)];
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  ctx.beginPath();
  ctx.moveTo(end.x + Math.cos(angle) * 8, end.y + Math.sin(angle) * 8);
  ctx.lineTo(end.x + Math.cos(angle + 2.5) * 10, end.y + Math.sin(angle + 2.5) * 10);
  ctx.moveTo(end.x + Math.cos(angle) * 8, end.y + Math.sin(angle) * 8);
  ctx.lineTo(end.x + Math.cos(angle - 2.5) * 10, end.y + Math.sin(angle - 2.5) * 10);
  ctx.stroke();
  ctx.restore();
}
