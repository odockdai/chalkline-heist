// The planning table before each job: the blueprint with every patrol route shown, a kit shop where
// each tool costs money from the take, and a chalk route the player drags across the map.
import { MAP, PANEL, COLOR, FONT, TILE } from './config.js';
import { TOOLS, loadoutCost } from './tools.js';
import { drawToolIcon } from './hud.js';
import { thiefCanStand, tileAtPoint } from './map.js';

export function shopButtons() {
  const buttons = [];
  let y = PANEL.y + 120;
  for (const tool of TOOLS) {
    buttons.push({ tool: tool.id, delta: -1, x: PANEL.x + 176, y: y + 8, w: 28, h: 28 });
    buttons.push({ tool: tool.id, delta: 1, x: PANEL.x + 240, y: y + 8, w: 28, h: 28 });
    y += 64;
  }
  return buttons;
}

export const START_BUTTON = { x: PANEL.x + 6, y: PANEL.y + PANEL.height - 58, w: PANEL.width - 12, h: 46 };
export const CLEAR_BUTTON = { x: PANEL.x + 6, y: PANEL.y + PANEL.height - 98, w: PANEL.width - 12, h: 32 };

function inside(button, x, y) {
  return x >= button.x && y >= button.y && x <= button.x + button.w && y <= button.y + button.h;
}

/** Spend or refund one tool; never below zero, above the tool's max, or past the job's funds. */
export function shopClick(run, x, y) {
  for (const button of shopButtons()) {
    if (!inside(button, x, y)) continue;
    const tool = TOOLS.find((t) => t.id === button.tool);
    const next = run.loadout[tool.id] + button.delta;
    if (next < 0 || next > tool.max) return 'deny';
    run.loadout[tool.id] = next;
    if (loadoutCost(run.loadout) > run.job.funds) {
      run.loadout[tool.id] -= button.delta;
      return 'deny';
    }
    run.spent = loadoutCost(run.loadout);
    return 'click';
  }
  if (inside(START_BUTTON, x, y)) return 'start';
  if (inside(CLEAR_BUTTON, x, y)) {
    run.plan = [];
    return 'click';
  }
  return null;
}

/** Extend the chalk route while the mouse is held on the map (points kept at least 10 px apart). */
export function drawRoute(run, mouse) {
  const x = mouse.x - MAP.x;
  const y = mouse.y - MAP.y;
  if (x < 0 || y < 0 || x > MAP.width || y > MAP.height) return;
  if (!thiefCanStand(tileAtPoint(run.map, x, y)) && tileAtPoint(run.map, x, y) !== 5) return;
  const last = run.plan[run.plan.length - 1];
  if (!last) {
    run.plan.push({ x: run.map.start.x, y: run.map.start.y });
    run.plan.push({ x, y });
  } else if (Math.hypot(last.x - x, last.y - y) > 10) run.plan.push({ x, y });
}

function button(ctx, b, label, fill, ink, size = 18) {
  ctx.fillStyle = fill;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = COLOR.chalk;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  ctx.font = `700 ${size}px ${FONT.ui}`;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.letterSpacing = '2px';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + size * 0.36);
  ctx.restore();
  ctx.textAlign = 'left';
}

/** The side panel during planning: the brief, the funds, the shop rows and the start button. */
export function drawPlanningPanel(ctx, run) {
  const x = PANEL.x;
  const w = PANEL.width;
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(x - 6, PANEL.y - 4, w + 12, PANEL.height + 8);
  ctx.strokeStyle = COLOR.rule;
  ctx.strokeRect(x - 5.5, PANEL.y - 3.5, w + 11, PANEL.height + 7);

  ctx.save();
  ctx.letterSpacing = '2.5px';
  ctx.font = `700 14px ${FONT.ui}`;
  ctx.fillStyle = COLOR.ink;
  ctx.fillText('THE PLAN', x + 6, PANEL.y + 22);
  ctx.restore();
  ctx.font = `15px ${FONT.hand}`;
  ctx.fillStyle = COLOR.chalk;
  wrap(ctx, run.job.brief, x + 6, PANEL.y + 46, w - 12, 19);

  const left = run.job.funds - run.spent;
  ctx.font = `600 13px ${FONT.ui}`;
  ctx.fillStyle = COLOR.dim;
  ctx.fillText('FUNDS LEFT FOR KIT', x + 6, PANEL.y + 104);
  ctx.font = `700 22px ${FONT.ui}`;
  ctx.fillStyle = left > 0 ? COLOR.loot : COLOR.danger;
  ctx.textAlign = 'right';
  ctx.fillText(`$${left}`, x + w - 6, PANEL.y + 106);
  ctx.textAlign = 'left';

  let y = PANEL.y + 120;
  const buttons = shopButtons();
  TOOLS.forEach((tool, index) => {
    ctx.fillStyle = '#0a2140';
    ctx.fillRect(x + 6, y, w - 12, 58);
    ctx.strokeStyle = '#1f4677';
    ctx.strokeRect(x + 6.5, y + 0.5, w - 13, 57);
    drawToolIcon(ctx, tool.id, x + 26, y + 20, COLOR.ink);
    ctx.font = `600 17px ${FONT.ui}`;
    ctx.fillStyle = COLOR.ink;
    ctx.fillText(tool.name, x + 44, y + 25);
    ctx.font = `500 14px ${FONT.ui}`;
    ctx.fillStyle = COLOR.loot;
    ctx.fillText(`$${tool.cost} each`, x + 110, y + 25);
    ctx.font = `500 12px ${FONT.ui}`;
    ctx.fillStyle = COLOR.dim;
    ctx.fillText(tool.blurb, x + 16, y + 48);
    const minus = buttons[index * 2];
    const plus = buttons[index * 2 + 1];
    button(ctx, minus, '-', '#0c2a52', COLOR.ink, 18);
    button(ctx, plus, '+', '#0c2a52', COLOR.ink, 18);
    ctx.font = `700 20px ${FONT.ui}`;
    ctx.fillStyle = COLOR.ink;
    ctx.textAlign = 'center';
    ctx.fillText(String(run.loadout[tool.id]), x + 222, y + 29);
    ctx.textAlign = 'left';
    y += 64;
  });

  ctx.font = `15px ${FONT.hand}`;
  ctx.fillStyle = COLOR.chalk;
  wrap(ctx, run.plan.length > 1 ? 'Route drawn. Keep to it for a +$300 planner bonus.' : 'Drag on the map to chalk your route. Red dots: where guards stop and look.', x + 6, y + 18, w - 12, 19);
  button(ctx, CLEAR_BUTTON, 'WIPE ROUTE', '#0c2a52', COLOR.ink, 14);
  button(ctx, START_BUTTON, 'START THE JOB  (ENTER)', COLOR.chalk, COLOR.night, 18);
}

export function wrap(ctx, value, x, y, width, lineHeight) {
  const words = value.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, lineY);
  return lineY;
}

/** Chalk callouts that explain the blueprint during planning. */
export function planningCallouts(run) {
  const mark = run.map.mark;
  const exit = run.map.exit;
  return [
    { x: mark.x + 26, y: mark.y - 18, text: run.job.mark.name, color: 'loot', from: { x: mark.x + 12, y: mark.y - 8 } },
    { x: exit.x + 24, y: exit.y - 16, text: 'van waits here', color: 'exit', from: { x: exit.x + 14, y: exit.y - 6 } },
    { x: run.map.start.x + 22, y: run.map.start.y + 30, text: 'in through here', color: 'chalk', from: { x: run.map.start.x + 6, y: run.map.start.y + 8 } },
  ].map((note) => ({ ...note, x: Math.min(note.x, MAP.width - 150), y: Math.max(28, Math.min(note.y, MAP.height - 10)) }));
}

export function startMarker(ctx, run) {
  const start = run.map.start;
  ctx.save();
  ctx.translate(MAP.x, MAP.y);
  ctx.strokeStyle = COLOR.thief;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(start.x, start.y, TILE * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(start.x - 5, start.y);
  ctx.lineTo(start.x + 5, start.y);
  ctx.moveTo(start.x, start.y - 5);
  ctx.lineTo(start.x, start.y + 5);
  ctx.stroke();
  ctx.restore();
}
