// Vision: the shape of a cone cut short by walls and cover, and whether a viewer can see the thief
// right now (range, angle, line of sight, shadow, vents and smoke all count).
import { SIGHT, TILE } from './config.js';
import { castRay, clearLine } from './map.js';

/** Points [x0, y0, x1, y1, ...] of a cone from (x, y) facing `heading`, each ray stopped at the first wall. */
export function conePolygon(map, x, y, heading, half, range, rays = SIGHT.rays) {
  const points = [x, y];
  for (let index = 0; index <= rays; index += 1) {
    const angle = heading - half + (2 * half * index) / rays;
    const dist = castRay(map, x, y, angle, range);
    points.push(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
  }
  return points;
}

/** True when a smoke cloud sits across the line from (x0, y0) to (x1, y1). */
export function smokeBlocks(smokes, x0, y0, x1, y1) {
  for (const smoke of smokes) {
    const radius = smoke.radius * Math.min(1, smoke.life / 0.8, (smoke.maxLife - smoke.life) / 0.4 + 0.3);
    const vx = x1 - x0;
    const vy = y1 - y0;
    const len2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((smoke.x - x0) * vx + (smoke.y - y0) * vy) / len2));
    const px = x0 + vx * t - smoke.x;
    const py = y0 + vy * t - smoke.y;
    if (px * px + py * py < radius * radius) return true;
  }
  return false;
}

export function angleGap(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * How plainly `viewer` sees the thief this frame: 0 when it cannot, else a strength that is
 * highest up close and falls off toward the cone's edge of range.
 */
export function sightOfThief(run, viewer, range, half) {
  const thief = run.thief;
  if (thief.inVent || run.phase === 'escaped' || run.phase === 'plan') return 0;
  const dx = thief.x - viewer.x;
  const dy = thief.y - viewer.y;
  const dist = Math.hypot(dx, dy);
  const bumped = dist < SIGHT.peripheral && viewer.kind === 'guard';
  if (!bumped) {
    if (dist > range) return 0;
    if (Math.abs(angleGap(Math.atan2(dy, dx), viewer.heading)) > half) return 0;
  }
  if (thief.inShadow && dist > SIGHT.shadowReveal) return 0;
  if (!clearLine(run.map, viewer.x, viewer.y, thief.x, thief.y)) return 0;
  if (smokeBlocks(run.smokes, viewer.x, viewer.y, thief.x, thief.y)) return 0;
  const near = 1 - Math.min(1, dist / range);
  return 0.35 + 0.65 * near + (thief.sneaking ? -0.1 : 0.1) + (thief.busy ? 0.15 : 0);
}

/** Is the thief out of every cone's reach because of where they stand (shadow far from guards, or a vent)? */
export function thiefIsHidden(run) {
  const thief = run.thief;
  if (thief.inVent) return true;
  if (!thief.inShadow) return false;
  for (const guard of run.guards) {
    if (Math.hypot(guard.x - thief.x, guard.y - thief.y) <= SIGHT.shadowReveal) return false;
  }
  return true;
}

export function tileCentre(c, r) {
  return { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
}
