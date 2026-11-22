// The take and the rating when a job ends: loot and cash, less the kit, with a bonus for going
// unseen, for speed, and for following the route you drew on the blueprint.

export const RATINGS = [
  { id: 'ghost', name: 'GHOST', line: 'Nobody will ever know you were there.' },
  { id: 'clean', name: 'CLEAN', line: 'A few raised eyebrows. Nothing on record.' },
  { id: 'loud', name: 'LOUD', line: 'Out with the prize and sirens behind you.' },
  { id: 'busted', name: 'BUSTED', line: 'The kit is in an evidence bag now.' },
];

/** How closely the walked trail kept to the drawn plan: share of trail points within 1.5 tiles of it. */
export function planFidelity(run) {
  const plan = run.plan;
  const trail = run.thief.trail;
  if (plan.length < 2 || trail.length < 2) return 0;
  let near = 0;
  for (const point of trail) {
    let best = Infinity;
    for (let index = 1; index < plan.length; index += 1) best = Math.min(best, segmentDistance(point, plan[index - 1], plan[index]));
    if (best < 48) near += 1;
  }
  return near / trail.length;
}

function segmentDistance(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y);
}

export function scoreRun(run) {
  const escaped = run.phase === 'escaped';
  const loot = escaped ? run.stats.loot : 0;
  const cash = escaped ? run.stats.cash : 0;
  const kit = run.spent;
  const ghost = escaped && run.stats.spotted === 0 && run.alarm < 34;
  const fidelity = planFidelity(run);
  const ghostBonus = ghost ? Math.round(loot * 0.5) : 0;
  const speedBonus = escaped ? Math.max(0, Math.round((150 - run.time) * 4)) : 0;
  const planBonus = escaped && fidelity >= 0.6 ? 300 : 0;
  const take = loot + cash + ghostBonus + speedBonus + planBonus - kit;
  let rating = RATINGS[3];
  if (escaped) rating = ghost ? RATINGS[0] : run.stats.spotted === 0 ? RATINGS[1] : RATINGS[2];
  return { escaped, loot, cash, kit, ghostBonus, speedBonus, planBonus, fidelity, take, rating };
}
