// The things in a room that are not people: locked doors, the fuse box, cash stacks, the mark on
// its pedestal, the getaway van, smoke clouds, thrown rattles and the rings of noise.
import { TILE, COLOR, FONT } from './config.js';

export function drawDoors(ctx, run) {
  for (const door of run.map.doors) {
    const x = door.c * TILE;
    const y = door.r * TILE;
    if (door.open) {
      ctx.strokeStyle = COLOR.door;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, TILE - 4, 0, Math.PI / 2);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = COLOR.lock;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
    drawPadlock(ctx, x + TILE / 2, y + TILE / 2 + 2, COLOR.lock);
  }
}

export function drawPadlock(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 4, 4.5, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(x - 6.5, y - 4, 13, 9);
}

export function drawFuses(ctx, run) {
  for (const fuse of run.map.fuses) {
    const x = fuse.x;
    const y = fuse.y;
    ctx.fillStyle = fuse.used ? '#2a2f3a' : '#33204a';
    ctx.fillRect(x - 10, y - 12, 20, 24);
    ctx.strokeStyle = fuse.used ? '#6b7486' : COLOR.camera;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 12, 20, 24);
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 8);
    ctx.lineTo(x - 4, y + 1);
    ctx.lineTo(x + 3, y + 1);
    ctx.lineTo(x - 2, y + 9);
    ctx.stroke();
  }
}

export function drawCash(ctx, run, time) {
  for (const cash of run.map.cash) {
    if (cash.taken) continue;
    const bob = Math.sin(time * 3 + cash.c) * 1.2;
    ctx.fillStyle = COLOR.cash;
    ctx.strokeStyle = '#7a5a12';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k += 1) {
      ctx.beginPath();
      ctx.rect(cash.x - 9, cash.y - 2 - k * 4 + bob, 18, 6);
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function drawMark(ctx, run, time) {
  const mark = run.map.mark;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.save();
  ctx.fillStyle = `rgba(255,210,63,${0.1 + 0.08 * pulse})`;
  ctx.beginPath();
  ctx.arc(mark.x, mark.y, 30 + pulse * 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,210,63,${0.55 + 0.3 * pulse})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(mark.x, mark.y, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2b2a44';
  ctx.strokeStyle = '#d9c38a';
  ctx.lineWidth = 2;
  ctx.fillRect(mark.x - 12, mark.y - 12, 24, 24);
  ctx.strokeRect(mark.x - 12, mark.y - 12, 24, 24);
  if (!run.thief.carrying) drawGem(ctx, mark.x, mark.y, 9, COLOR.loot);
  ctx.restore();
}

export function drawGem(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff6c9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.85, y - size * 0.25);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.85, y - size * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.85, y - size * 0.25);
  ctx.lineTo(x + size * 0.85, y - size * 0.25);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawVan(ctx, run, time) {
  const exit = run.map.exit;
  const live = run.thief.carrying;
  const pulse = live ? 0.5 + 0.5 * Math.sin(time * 5) : 0;
  ctx.save();
  if (live) {
    ctx.fillStyle = `rgba(75,227,140,${0.12 + 0.12 * pulse})`;
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 34 + 8 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#0d3a2a';
  ctx.strokeStyle = COLOR.exit;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(exit.x - 15, exit.y - 11, 30, 22, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOR.exit;
  ctx.fillRect(exit.x + 7, exit.y - 9, 5, 18);
  ctx.font = `700 10px ${FONT.ui}`;
  ctx.textAlign = 'center';
  ctx.fillText('VAN', exit.x - 3, exit.y + 4);
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawSmokes(ctx, run) {
  for (const smoke of run.smokes) {
    const grow = Math.min(1, (smoke.maxLife - smoke.life) / 0.4 + 0.3);
    const fade = Math.min(1, smoke.life / 0.8);
    const radius = smoke.radius * grow;
    for (let k = 0; k < 7; k += 1) {
      const a = k * 0.9 + smoke.life * 0.3;
      const ox = Math.cos(a) * radius * 0.45;
      const oy = Math.sin(a) * radius * 0.45;
      ctx.fillStyle = `${COLOR.smoke}${0.32 * fade})`;
      ctx.beginPath();
      ctx.arc(smoke.x + ox, smoke.y + oy, radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawNoises(ctx, run) {
  for (const noise of run.noises) {
    const t = noise.age / noise.life;
    const color = noise.kind === 'step' ? '255,244,210' : noise.kind === 'clunk' ? '180,140,255' : '255,210,63';
    ctx.strokeStyle = `rgba(${color},${(1 - t) * 0.75})`;
    ctx.lineWidth = noise.kind === 'step' ? 1.2 : 2.2;
    ctx.beginPath();
    ctx.arc(noise.x, noise.y, noise.radius * (0.25 + 0.75 * t), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const rattle of run.thrown) {
    const t = Math.min(1, rattle.t / rattle.flight);
    const x = rattle.x0 + (rattle.x - rattle.x0) * t;
    const y = rattle.y0 + (rattle.y - rattle.y0) * t - Math.sin(t * Math.PI) * 26;
    ctx.fillStyle = COLOR.loot;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const rattle of run.rattles) {
    const alpha = Math.max(0.25, 1 - rattle.age / 8);
    ctx.fillStyle = `rgba(255,210,63,${alpha})`;
    ctx.beginPath();
    ctx.arc(rattle.x, rattle.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,210,63,${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(rattle.x, rattle.y, 9, side > 0 ? -0.7 : Math.PI - 0.7, side > 0 ? 0.7 : Math.PI + 0.7);
      ctx.stroke();
    }
  }
}
