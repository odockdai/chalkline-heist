// The frame around the map: the top bar (job, objective, time, take), the side panel (alarm meter,
// visibility, the kit with its costs, the legend) and the controls strip along the bottom.
import { VIEW, MAP, PANEL, COLOR, FONT, ALARM } from './config.js';
import { TIERS, tierOf } from './alarm.js';
import { TOOLS } from './tools.js';
import { thiefIsHidden } from './sight.js';
import { peakSuspicion } from './heist.js';
import { drawGem, drawPadlock } from './render.js';

export const GAME_TITLE = 'CHALKLINE';

function text(ctx, value, x, y, size, color, weight = 600, align = 'left', family = FONT.ui) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  ctx.textAlign = 'left';
}

function tracked(ctx, value, x, y, size, color, spacing, weight = 700, align = 'left') {
  ctx.save();
  ctx.letterSpacing = `${spacing}px`;
  text(ctx, value, x, y, size, color, weight, align);
  ctx.restore();
}

function money(value) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
}

function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function drawFrame(ctx) {
  ctx.fillStyle = COLOR.night;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.strokeStyle = COLOR.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(MAP.x - 4.5, MAP.y - 4.5, MAP.width + 9, MAP.height + 9);
}

export function drawTopBar(ctx, run, subtitle) {
  tracked(ctx, GAME_TITLE, 16, 34, 30, COLOR.chalk, 3, 700);
  ctx.strokeStyle = COLOR.chalk;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 42);
  ctx.lineTo(176, 40);
  ctx.stroke();
  tracked(ctx, `JOB ${run.jobIndex + 1}`, 196, 25, 13, COLOR.dim, 2);
  text(ctx, run.job.name, 196, 45, 20, COLOR.ink, 600);

  const objective = subtitle ?? (run.thief.carrying ? 'GET TO THE VAN' : `LIFT ${run.job.mark.name.toUpperCase()}`);
  const objColor = run.thief.carrying ? COLOR.exit : COLOR.loot;
  tracked(ctx, 'OBJECTIVE', 640, 22, 12, COLOR.dim, 2, 600, 'center');
  tracked(ctx, objective, 640, 46, 22, objColor, 1.5, 700, 'center');

  const take = run.stats.loot + run.stats.cash;
  tracked(ctx, 'TIME', 1060, 22, 12, COLOR.dim, 2, 600, 'center');
  text(ctx, clock(run.time), 1060, 46, 22, COLOR.ink, 700, 'center');
  tracked(ctx, 'TAKE', 1190, 22, 12, COLOR.dim, 2, 600, 'center');
  text(ctx, money(take), 1190, 46, 22, take > 0 ? COLOR.loot : COLOR.ink, 700, 'center');
}

function drawAlarmMeter(ctx, run, x, y, w) {
  const level = run.alarm;
  const tier = tierOf(level);
  const lock = run.lockdown !== null;
  tracked(ctx, 'ALARM', x, y + 14, 14, COLOR.ink, 2.5);
  const label = lock ? 'LOCKDOWN' : TIERS[tier].name;
  const labelColor = lock || tier === 2 ? COLOR.danger : tier === 1 ? COLOR.suspect : COLOR.exit;
  tracked(ctx, label, x + w, y + 14, 14, labelColor, 2, 700, 'right');

  const barY = y + 24;
  const barH = 22;
  ctx.fillStyle = '#04101f';
  ctx.fillRect(x, barY, w, barH);
  const fill = (w * level) / ALARM.lockdown;
  const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
  gradient.addColorStop(0, '#3fd08a');
  gradient.addColorStop(0.34, '#ffc247');
  gradient.addColorStop(0.67, '#ff7a3d');
  gradient.addColorStop(1, '#ff2e3f');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, barY, fill, barH);
  ctx.strokeStyle = COLOR.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, barY + 0.5, w - 1, barH - 1);
  for (const floor of ALARM.floors.slice(1)) {
    const fx = x + (w * floor) / ALARM.lockdown;
    ctx.beginPath();
    ctx.moveTo(fx, barY - 3);
    ctx.lineTo(fx, barY + barH + 3);
    ctx.stroke();
  }
  ctx.font = `600 11px ${FONT.ui}`;
  ctx.fillStyle = COLOR.dim;
  ctx.fillText('CALM', x + 3, barY + barH + 14);
  ctx.fillText('ALERT', x + (w * ALARM.floors[1]) / 100 + 3, barY + barH + 14);
  ctx.fillText('HUNT', x + (w * ALARM.floors[2]) / 100 + 3, barY + barH + 14);
  text(ctx, `${Math.round(level)}%`, x + w, barY + barH + 14, 12, COLOR.ink, 700, 'right');
  if (lock) text(ctx, `Police in ${Math.ceil(run.lockdown)}s`, x, barY + barH + 32, 15, COLOR.danger, 700);
  else text(ctx, run.alarm > 0.5 && run.lastAlarmReason ? run.lastAlarmReason : 'Settles back while nobody sees you', x, barY + barH + 32, 13, COLOR.dim, 500);
}

function drawEye(ctx, x, y, color, open) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 11, y);
  ctx.quadraticCurveTo(x, y - (open ? 9 : 3), x + 11, y);
  ctx.quadraticCurveTo(x, y + (open ? 9 : 3), x - 11, y);
  ctx.stroke();
  if (open) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 7);
    ctx.lineTo(x + 12, y - 7);
    ctx.stroke();
  }
}

function drawVisibility(ctx, run, x, y, w) {
  const hidden = thiefIsHidden(run);
  const seen = run.seenBy.length > 0;
  const peak = peakSuspicion(run);
  const state = seen ? 'SEEN' : hidden ? 'HIDDEN' : peak > 0.3 ? 'SUSPECTED' : 'IN THE OPEN';
  const color = seen ? COLOR.danger : hidden ? COLOR.thief : peak > 0.3 ? COLOR.suspect : COLOR.ink;
  ctx.fillStyle = '#04101f';
  ctx.fillRect(x, y, w, 40);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 39);
  drawEye(ctx, x + 22, y + 20, color, !hidden);
  tracked(ctx, state, x + 42, y + 27, 18, color, 2);
  const note = run.thief.inVent ? 'in a vent' : run.thief.inShadow ? 'in shadow' : run.thief.sneaking ? 'sneaking' : run.thief.moving ? 'footsteps carry' : 'still';
  text(ctx, note, x + w - 10, y + 26, 13, COLOR.dim, 500, 'right');
}

export function drawToolIcon(ctx, id, x, y, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (id === 'rattle') {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 9, -0.6, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 9, Math.PI - 0.6, Math.PI + 0.6);
    ctx.stroke();
  } else if (id === 'smoke') {
    for (const [dx, dy, r] of [[-4, 2, 5], [3, 0, 6], [0, -4, 5]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === 'jammer') {
    ctx.strokeRect(x - 7, y - 3, 14, 10);
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 3);
    ctx.lineTo(x - 5, y - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 5, y - 10, 4, -1.2, 0.4);
    ctx.stroke();
  } else if (id === 'pick') {
    drawPadlock(ctx, x, y + 2, color);
  }
}

function drawKit(ctx, run, x, y, w) {
  tracked(ctx, 'KIT', x, y + 14, 14, COLOR.ink, 2.5);
  text(ctx, `spent ${money(run.spent)}`, x + w, y + 14, 13, COLOR.dim, 500, 'right');
  let rowY = y + 24;
  for (const tool of TOOLS) {
    const selected = run.selectedTool === tool.id;
    const count = run.loadout[tool.id];
    const color = count > 0 ? (selected ? COLOR.night : COLOR.ink) : '#53709a';
    ctx.fillStyle = selected ? COLOR.chalk : '#0a2140';
    ctx.fillRect(x, rowY, w, 30);
    if (!selected) {
      ctx.strokeStyle = '#1f4677';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, rowY + 0.5, w - 1, 29);
    }
    text(ctx, tool.key || 'E', x + 12, rowY + 20, 14, selected ? COLOR.night : COLOR.dim, 700, 'center');
    drawToolIcon(ctx, tool.id, x + 38, rowY + 15, color);
    text(ctx, tool.name, x + 56, rowY + 20, 16, color, 600);
    text(ctx, `$${tool.cost}`, x + 156, rowY + 20, 14, selected ? COLOR.night : COLOR.dim, 500);
    for (let pip = 0; pip < Math.max(count, 1); pip += 1) {
      ctx.fillStyle = count > 0 ? (selected ? COLOR.night : COLOR.loot) : '#2c4a74';
      ctx.fillRect(x + w - 12 - pip * 11, rowY + 10, 7, 10);
    }
    rowY += 34;
  }
}

function legendSwatch(ctx, kind, x, y) {
  if (kind === 'guard') {
    ctx.fillStyle = 'rgba(255,98,74,0.45)';
    ctx.beginPath();
    ctx.moveTo(x - 9, y);
    ctx.lineTo(x + 10, y - 7);
    ctx.lineTo(x + 10, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLOR.guard;
    ctx.beginPath();
    ctx.arc(x - 8, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'camera') {
    ctx.fillStyle = 'rgba(180,140,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + 10, y - 6);
    ctx.lineTo(x + 10, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLOR.camera;
    ctx.fillRect(x - 11, y - 3.5, 8, 7);
  } else if (kind === 'shadow') {
    ctx.fillStyle = COLOR.shadow;
    ctx.fillRect(x - 10, y - 7, 20, 14);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 10, y - 7, 20, 14);
    ctx.clip();
    ctx.strokeStyle = COLOR.shadowHatch;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let d = -14; d < 20; d += 5) {
      ctx.moveTo(x - 10 + d, y + 7);
      ctx.lineTo(x + 4 + d, y - 7);
    }
    ctx.stroke();
    ctx.restore();
  } else if (kind === 'vent') {
    ctx.strokeStyle = COLOR.ventLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 9, y - 7, 18, 14);
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 2);
    ctx.lineTo(x + 5, y - 2);
    ctx.moveTo(x - 5, y + 2);
    ctx.lineTo(x + 5, y + 2);
    ctx.stroke();
  } else if (kind === 'loot') {
    drawGem(ctx, x, y, 7, COLOR.loot);
  } else if (kind === 'lock') {
    drawPadlock(ctx, x, y + 2, COLOR.lock);
  } else if (kind === 'van') {
    ctx.strokeStyle = COLOR.exit;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 6, 20, 12);
  } else if (kind === 'cover') {
    ctx.fillStyle = COLOR.furniture;
    ctx.fillRect(x - 9, y - 7, 18, 14);
    ctx.strokeStyle = COLOR.furnitureLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 9, y - 7, 18, 14);
  }
}

const LEGEND = [
  ['guard', 'Guard + torch cone', 'red cone, amber when wary'],
  ['camera', 'Camera, sweeping', 'jam it or cut the fuse'],
  ['shadow', 'Shadow: hidden', 'unless a guard is on you'],
  ['cover', 'Cases: block sight', ''],
  ['vent', 'Vent: crawl unseen', ''],
  ['lock', 'Locked door', 'costs a lockpick'],
  ['loot', 'The mark', 'cash stacks are a bonus'],
  ['van', 'Getaway van', 'reach it with the mark'],
];

function drawLegend(ctx, x, y, w) {
  tracked(ctx, 'LEGEND', x, y + 14, 14, COLOR.ink, 2.5);
  let rowY = y + 32;
  for (const [kind, name, note] of LEGEND) {
    legendSwatch(ctx, kind, x + 12, rowY - 4);
    text(ctx, name, x + 30, rowY + 1, 14, COLOR.ink, 500);
    if (note) text(ctx, note, x + w, rowY + 1, 12, COLOR.dim, 500, 'right');
    rowY += 22;
  }
}

export function drawPanel(ctx, run) {
  const x = PANEL.x;
  const w = PANEL.width;
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(x - 6, PANEL.y - 4, w + 12, PANEL.height + 8);
  ctx.strokeStyle = COLOR.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 5.5, PANEL.y - 3.5, w + 11, PANEL.height + 7);
  drawAlarmMeter(ctx, run, x + 6, PANEL.y + 8, w - 12);
  drawVisibility(ctx, run, x + 6, PANEL.y + 110, w - 12);
  drawKit(ctx, run, x + 6, PANEL.y + 164, w - 12);
  drawLegend(ctx, x + 6, PANEL.y + 334, w - 12);
}

const CONTROLS = [
  ['WASD', 'move'],
  ['SHIFT', 'sneak (silent)'],
  ['E', 'hold: pick, cut, lift'],
  ['1 2 3', 'choose tool'],
  ['CLICK', 'throw / use'],
  ['TAB', 'patrol routes'],
  ['R', 'restart'],
  ['M', 'mute'],
];

export function drawControls(ctx) {
  let x = 16;
  const y = 700;
  for (const [key, action] of CONTROLS) {
    ctx.font = `700 13px ${FONT.ui}`;
    const kw = ctx.measureText(key).width + 12;
    ctx.strokeStyle = COLOR.dim;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y - 14.5, kw, 20);
    text(ctx, key, x + kw / 2, y, 13, COLOR.ink, 700, 'center');
    ctx.font = `500 14px ${FONT.ui}`;
    const aw = ctx.measureText(action).width;
    text(ctx, action, x + kw + 7, y, 14, COLOR.dim, 500);
    x += kw + aw + 24;
  }
}

/** The big centred banner for tier changes, spotting and the job's opening. */
export function drawBanner(ctx, run) {
  const banner = run.banner;
  if (!banner) return;
  const alpha = Math.min(1, banner.t / 0.4, 1);
  const cx = MAP.x + MAP.width / 2;
  const y = MAP.y + 70;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 34px ${FONT.ui}`;
  const width = Math.max(ctx.measureText(banner.text).width, 300) + 60;
  ctx.fillStyle = 'rgba(5,15,32,0.88)';
  ctx.fillRect(cx - width / 2, y - 40, width, 74);
  const color = COLOR[banner.color] ?? COLOR.ink;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - width / 2 + 0.5, y - 39.5, width - 1, 73);
  ctx.letterSpacing = '3px';
  text(ctx, banner.text, cx, y, 34, color, 700, 'center');
  ctx.letterSpacing = '0px';
  text(ctx, banner.sub, cx, y + 24, 17, COLOR.ink, 400, 'center', FONT.hand);
  ctx.restore();
}

/** A red edge on the map while anything sees the thief, pulsing faster as suspicion grows. */
export function drawDangerEdge(ctx, run, time) {
  const peak = Math.max(peakSuspicion(run), run.lockdown !== null ? 1 : 0);
  if (peak < 0.15) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * (4 + peak * 8));
  ctx.save();
  ctx.strokeStyle = `rgba(255,61,61,${0.25 + 0.5 * peak * pulse})`;
  ctx.lineWidth = 6;
  ctx.strokeRect(MAP.x - 2, MAP.y - 2, MAP.width + 4, MAP.height + 4);
  ctx.restore();
}
