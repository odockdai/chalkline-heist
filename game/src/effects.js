// Short-lived marks on the blueprint: noise rings, floating words, sparks from a lock, smoke puffs.

export function addNoise(run, x, y, radius, kind) {
  const noise = { x, y, radius, kind, age: 0, life: kind === 'step' ? 0.5 : 1.1 };
  run.noises.push(noise);
  return noise;
}

export function addFloater(run, x, y, text, color) {
  run.floaters.push({ x, y, text, color, age: 0, life: 1.4 });
}

export function addSparks(run, x, y, count, color) {
  for (let index = 0; index < count; index += 1) {
    const angle = run.rng() * Math.PI * 2;
    const speed = 30 + run.rng() * 70;
    run.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 0.35 + run.rng() * 0.3, color });
  }
}

export function stepEffects(run, dt) {
  for (const noise of run.noises) noise.age += dt;
  run.noises = run.noises.filter((noise) => noise.age < noise.life);
  for (const floater of run.floaters) {
    floater.age += dt;
    floater.y -= 18 * dt;
  }
  run.floaters = run.floaters.filter((floater) => floater.age < floater.life);
  for (const spark of run.sparks) {
    spark.age += dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.9;
    spark.vy *= 0.9;
  }
  run.sparks = run.sparks.filter((spark) => spark.age < spark.life);
  if (run.banner) {
    run.banner.t -= dt;
    if (run.banner.t <= 0) run.banner = null;
  }
}
