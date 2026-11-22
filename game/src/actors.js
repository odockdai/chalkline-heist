// The people and machines that move: cameras on their brackets, guards with their suspicion ring
// and ? or ! marks, the thief with a trail, the hold-E progress ring, floating words and chalk notes.
import { MAP, COLOR, FONT } from './config.js';
import { GUARD_STATE } from './guard.js';
import { cameraOffline } from './camera.js';
import { reachableTask } from './thief.js';
import { thiefIsHidden } from './sight.js';
import { drawGem } from './props.js';
import { coneColors } from './cones.js';

const G = GUARD_STATE;

export function drawCamera(ctx, run, camera, time) {
  const off = cameraOffline(run, camera);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = '#1a1030';
  ctx.strokeStyle = off ? '#7d8597' : COLOR.camera;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(camera.heading);
  ctx.fillStyle = off ? '#4b5263' : COLOR.camera;
  ctx.fillRect(2, -5, 15, 10);
  ctx.fillStyle = off ? '#262b36' : '#fff';
  ctx.fillRect(15, -3, 4, 6);
  ctx.restore();
  if (!off && Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ff2e55';
    ctx.beginPath();
    ctx.arc(camera.x - 8, camera.y - 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (off) {
    ctx.strokeStyle = '#c9d2e3';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.max(camera.jammed / 9, run.powerCut / 12)));
    ctx.stroke();
  }
}

export function drawGuard(ctx, guard, time) {
  const { ring } = coneColors(guard);
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.heading);
  ctx.fillStyle = '#1b0f12';
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(1, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1c4';
  ctx.fillRect(9, 3, 7, 3);
  ctx.restore();

  if (guard.detect > 0.02 || guard.state === G.CHASE) {
    const full = guard.state === G.CHASE ? 1 : guard.detect;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = guard.state === G.CHASE ? COLOR.chase : COLOR.suspect;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * full);
    ctx.stroke();
  }
  const mark = guard.state === G.CHASE ? '!' : guard.state === G.SUSPECT || guard.state === G.INVESTIGATE || guard.state === G.SEARCH || guard.state === G.LISTEN ? '?' : '';
  if (mark) {
    const bob = Math.sin(time * 8) * 1.5;
    const color = mark === '!' ? COLOR.chase : COLOR.suspect;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 30 + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b0f12';
    ctx.font = `700 15px ${FONT.ui}`;
    ctx.textAlign = 'center';
    ctx.fillText(mark, guard.x, guard.y - 25 + bob);
    ctx.textAlign = 'left';
  }
}

/** What a wary guard mutters, in a speech bubble over the head, so the cone's change of mood reads at once. */
function guardSpeech(guard) {
  if (guard.state === G.CHASE) return 'Stop right there!';
  if (guard.state === G.LISTEN) return 'Footsteps?';
  if (guard.state === G.SUSPECT) return guard.mood || 'Hm?';
  if (guard.state === G.INVESTIGATE || guard.state === G.SEARCH) return guard.cause === 'rattle' ? 'What was that?' : 'Someone there?';
  return '';
}

export function drawSpeech(ctx, guard) {
  const line = guardSpeech(guard);
  if (!line) return;
  ctx.save();
  ctx.font = `700 14px ${FONT.ui}`;
  const w = ctx.measureText(line).width + 16;
  const h = 22;
  const x = Math.max(4, Math.min(MAP.width - w - 4, guard.x - w / 2));
  const y = Math.max(4, guard.y - 64);
  const color = guard.state === G.CHASE ? COLOR.chase : COLOR.suspect;
  ctx.fillStyle = 'rgba(255,248,228,0.96)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.moveTo(guard.x - 5, y + h);
  ctx.lineTo(guard.x, y + h + 7);
  ctx.lineTo(guard.x + 5, y + h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1b0f12';
  ctx.textAlign = 'center';
  ctx.fillText(line, x + w / 2, y + 16);
  ctx.restore();
}

export function drawThief(ctx, run, time) {
  const thief = run.thief;
  const hidden = thiefIsHidden(run);
  ctx.save();
  ctx.strokeStyle = 'rgba(79,240,193,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  const trail = thief.trail;
  for (let index = Math.max(0, trail.length - 40); index < trail.length; index += 1) {
    const point = trail[index];
    if (index === Math.max(0, trail.length - 40)) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.lineTo(thief.x, thief.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(thief.x, thief.y);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 26);
  glow.addColorStop(0, 'rgba(79,240,193,0.45)');
  glow.addColorStop(1, 'rgba(79,240,193,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  if (hidden) {
    ctx.strokeStyle = COLOR.thief;
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15 + Math.sin(time * 4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.rotate(thief.heading);
  ctx.globalAlpha = thief.inVent ? 0.6 : 1;
  ctx.fillStyle = '#062a22';
  ctx.strokeStyle = COLOR.thief;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOR.thief;
  ctx.beginPath();
  ctx.arc(1, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#062a22';
  ctx.fillRect(3, -4, 3.5, 8);
  ctx.fillStyle = COLOR.thief;
  ctx.fillRect(-12, -9, 5, 18);
  if (thief.carrying) {
    ctx.rotate(-thief.heading);
    drawGem(ctx, -10, -10, 6, COLOR.loot);
  }
  ctx.restore();
}

export function drawTaskRing(ctx, run) {
  const thief = run.thief;
  const task = reachableTask(run);
  if (thief.task) {
    const t = thief.task.progress / thief.task.need;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = thief.task.kind === 'grab' ? COLOR.loot : thief.task.kind === 'fuse' ? COLOR.camera : COLOR.lock;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
    ctx.stroke();
  }
  if (task && !thief.task) chalkNote(ctx, thief.x + 18, thief.y + 26, task.label, COLOR.chalk, 14);
}

export function drawFloaters(ctx, run) {
  ctx.textAlign = 'center';
  for (const floater of run.floaters) {
    const alpha = Math.min(1, (floater.life - floater.age) / 0.4);
    ctx.globalAlpha = alpha;
    ctx.font = `700 15px ${FONT.hand}`;
    const half = ctx.measureText(floater.text).width / 2 + 4;
    const x = Math.max(half, Math.min(MAP.width - half, floater.x));
    const y = Math.max(18, floater.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(5,15,32,0.9)';
    ctx.strokeText(floater.text, x, y);
    ctx.fillStyle = COLOR[floater.color] ?? COLOR.ink;
    ctx.fillText(floater.text, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  for (const spark of run.sparks) {
    ctx.fillStyle = spark.color === 'loot' ? COLOR.loot : COLOR.lock;
    ctx.globalAlpha = 1 - spark.age / spark.life;
    ctx.fillRect(spark.x - 1.5, spark.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
}

/** A hand-written chalk note with a short leader line, the way a crew marks up a blueprint. */
export function chalkNote(ctx, x, y, text, color = COLOR.chalk, size = 15, from = null) {
  ctx.save();
  ctx.font = `${size}px ${FONT.hand}`;
  const width = ctx.measureText(text).width;
  if (from) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x + (from.x < x ? 0 : width), y - size * 0.35);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(5,15,32,0.82)';
  ctx.fillRect(x - 5, y - size - 1, width + 10, size + 9);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 5.5, y - size - 1.5, width + 11, size + 10);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}
