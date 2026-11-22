// Full screens and overlays: the title over a live blueprint, the caught moment (who saw you and
// from where), and the job report with the walked route, the take and the rating.
import { VIEW, MAP, COLOR, FONT, TILE } from './config.js';
import { JOBS } from './levels.js';
import { GAME_TITLE } from './hud.js';
import { scoreRun } from './scoring.js';
import { wrap } from './planning.js';
import { drawGem } from './render.js';

function centred(ctx, value, y, size, color, weight = 700, family = FONT.ui, spacing = 0) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(value, VIEW.width / 2, y);
  ctx.restore();
}

export function drawTitle(ctx, progress, time) {
  ctx.fillStyle = 'rgba(5,15,32,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  centred(ctx, GAME_TITLE, 250, 120, COLOR.chalk, 700, FONT.ui, 18);
  ctx.strokeStyle = COLOR.chalk;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(380, 272);
  ctx.quadraticCurveTo(640, 262, 905, 270);
  ctx.stroke();
  centred(ctx, 'Plan it in chalk. Walk it in the dark.', 320, 30, COLOR.ink, 400, FONT.hand);
  centred(ctx, 'A top-down heist game: read the patrols, buy your kit, lift the mark, reach the van.', 360, 20, COLOR.dim, 500);

  const cardW = 300;
  const startX = VIEW.width / 2 - (cardW * 3 + 40) / 2;
  JOBS.forEach((job, index) => {
    const x = startX + index * (cardW + 20);
    const y = 410;
    const open = index <= progress.unlocked;
    ctx.fillStyle = open ? 'rgba(12,37,72,0.92)' : 'rgba(8,22,44,0.9)';
    ctx.fillRect(x, y, cardW, 150);
    ctx.strokeStyle = open ? COLOR.chalk : COLOR.rule;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, 149);
    ctx.font = `700 14px ${FONT.ui}`;
    ctx.fillStyle = COLOR.dim;
    ctx.fillText(`JOB ${index + 1}   ·   PRESS ${index + 1}`, x + 16, y + 26);
    ctx.font = `700 24px ${FONT.ui}`;
    ctx.fillStyle = open ? COLOR.ink : '#5c7aa3';
    ctx.fillText(job.name, x + 16, y + 56);
    ctx.font = `15px ${FONT.hand}`;
    ctx.fillStyle = open ? COLOR.chalk : '#5c7aa3';
    wrap(ctx, job.brief, x + 16, y + 82, cardW - 32, 19);
    drawGem(ctx, x + 24, y + 128, 7, open ? COLOR.loot : '#5c7aa3');
    ctx.font = `600 15px ${FONT.ui}`;
    ctx.fillStyle = open ? COLOR.loot : '#5c7aa3';
    ctx.fillText(`${job.mark.name}  $${job.mark.value.toLocaleString('en-US')}`, x + 40, y + 133);
    const best = progress.best[job.id];
    if (best) {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLOR.exit;
      ctx.fillText(best, x + cardW - 16, y + 133);
      ctx.textAlign = 'left';
    }
    if (!open) {
      ctx.font = `600 14px ${FONT.ui}`;
      ctx.fillStyle = '#7f9cc4';
      ctx.textAlign = 'right';
      ctx.fillText('finish the job before', x + cardW - 16, y + 26);
      ctx.textAlign = 'left';
    }
  });
  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) centred(ctx, 'PRESS ENTER OR CLICK TO PLAN JOB ' + (progress.unlocked + 1), 620, 22, COLOR.chalk, 700, FONT.ui, 3);
  centred(ctx, 'WASD move  ·  SHIFT sneak  ·  E pick / lift  ·  1 2 3 tools  ·  click to throw  ·  M mute', 668, 16, COLOR.dim, 500);
}

/** The caught moment: the frame dims around the guard and the thief, and says who and why. */
export function drawCaught(ctx, run, time) {
  const t = Math.min(1, run.caughtT / 0.6);
  const thief = run.thief;
  const tx = MAP.x + thief.x;
  const ty = MAP.y + thief.y;
  ctx.save();
  ctx.fillStyle = `rgba(40,0,6,${0.55 * t})`;
  ctx.beginPath();
  ctx.rect(0, 0, VIEW.width, VIEW.height);
  ctx.arc(tx, ty, 70 + (1 - t) * 300, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = COLOR.chase;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tx, ty, 70 + (1 - t) * 300, 0, Math.PI * 2);
  ctx.stroke();
  if (run.catcher) {
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(MAP.x + run.catcher.x, MAP.y + run.catcher.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  if (run.caughtT < 0.3) return;
  const boxY = ty > VIEW.height / 2 ? 90 : 470;
  ctx.fillStyle = 'rgba(5,15,32,0.92)';
  ctx.fillRect(MAP.x + MAP.width / 2 - 270, boxY, 540, 130);
  ctx.strokeStyle = COLOR.danger;
  ctx.lineWidth = 2;
  ctx.strokeRect(MAP.x + MAP.width / 2 - 269.5, boxY + 0.5, 539, 129);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `700 40px ${FONT.ui}`;
  ctx.letterSpacing = '4px';
  ctx.fillStyle = COLOR.danger;
  const who = run.caughtBy === 'the police' ? 'THE POLICE ARRIVED' : `CAUGHT BY ${run.caughtBy.toUpperCase()}`;
  ctx.fillText(who, MAP.x + MAP.width / 2, boxY + 50);
  ctx.letterSpacing = '0px';
  ctx.font = `17px ${FONT.hand}`;
  ctx.fillStyle = COLOR.ink;
  const why = run.caughtBy === 'the police' ? 'The lockdown ran out before you reached the van.' : `${run.stats.spotted} time${run.stats.spotted === 1 ? '' : 's'} spotted. The chase started at the "!": a cone held you until the ring filled.`;
  ctx.fillText(why, MAP.x + MAP.width / 2, boxY + 82);
  ctx.font = `700 16px ${FONT.ui}`;
  ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? COLOR.chalk : COLOR.dim;
  ctx.fillText('R  retry the job      ·      P  back to the plan', MAP.x + MAP.width / 2, boxY + 112);
  ctx.restore();
}

/** The job report: the route you walked over the blueprint on the left, the take on the right. */
export function drawReport(ctx, run, time, hasNext) {
  const score = scoreRun(run);
  ctx.fillStyle = 'rgba(5,15,32,0.55)';
  ctx.fillRect(MAP.x, MAP.y, MAP.width, MAP.height);
  ctx.save();
  ctx.translate(MAP.x, MAP.y);
  ctx.strokeStyle = COLOR.thief;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 20;
  ctx.beginPath();
  run.thief.trail.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
  ctx.lineTo(run.thief.x, run.thief.y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const guard of run.guards) {
    ctx.fillStyle = COLOR.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const x = 640;
  const y = 92;
  const w = 330;
  const h = 520;
  ctx.fillStyle = 'rgba(5,15,32,0.95)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COLOR.chalk;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = `700 14px ${FONT.ui}`;
  ctx.fillStyle = COLOR.dim;
  ctx.fillText(`JOB ${run.jobIndex + 1} REPORT`, x + 22, y + 32);
  ctx.font = `700 34px ${FONT.ui}`;
  ctx.fillStyle = score.escaped ? COLOR.exit : COLOR.danger;
  ctx.fillText(score.escaped ? 'CLEAN GETAWAY' : 'NO TAKE', x + 22, y + 70);

  ctx.save();
  ctx.translate(x + w / 2, y + 128);
  ctx.rotate(-0.06);
  const stampColor = score.rating.id === 'ghost' ? COLOR.thief : score.rating.id === 'busted' ? COLOR.danger : COLOR.loot;
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(-105, -32, 210, 64);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-98, -25, 196, 50);
  ctx.font = `700 40px ${FONT.ui}`;
  ctx.fillStyle = stampColor;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '8px';
  ctx.fillText(score.rating.name, 4, 14);
  ctx.restore();
  ctx.font = `16px ${FONT.hand}`;
  ctx.fillStyle = COLOR.ink;
  ctx.textAlign = 'center';
  ctx.fillText(score.rating.line, x + w / 2, y + 190);
  ctx.textAlign = 'left';

  const rows = [
    [run.job.mark.name, score.loot, COLOR.loot],
    ['Cash stacks', score.cash, COLOR.cash],
    ['Ghost bonus (never seen)', score.ghostBonus, COLOR.thief],
    ['Speed bonus', score.speedBonus, COLOR.ink],
    [`Kept to the plan (${Math.round(score.fidelity * 100)}%)`, score.planBonus, COLOR.chalk],
    ['Kit bought', -score.kit, COLOR.danger],
  ];
  let rowY = y + 230;
  ctx.font = `500 16px ${FONT.ui}`;
  for (const [label, value, color] of rows) {
    ctx.fillStyle = COLOR.dim;
    ctx.fillText(label, x + 22, rowY);
    ctx.textAlign = 'right';
    ctx.fillStyle = value === 0 ? '#5c7aa3' : color;
    ctx.fillText(`${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US')}`, x + w - 22, rowY);
    ctx.textAlign = 'left';
    rowY += 27;
  }
  ctx.strokeStyle = COLOR.rule;
  ctx.beginPath();
  ctx.moveTo(x + 22, rowY - 12);
  ctx.lineTo(x + w - 22, rowY - 12);
  ctx.stroke();
  ctx.font = `700 22px ${FONT.ui}`;
  ctx.fillStyle = COLOR.ink;
  ctx.fillText('THE TAKE', x + 22, rowY + 16);
  ctx.textAlign = 'right';
  ctx.fillStyle = score.take >= 0 ? COLOR.loot : COLOR.danger;
  ctx.fillText(`${score.take < 0 ? '-' : ''}$${Math.abs(score.take).toLocaleString('en-US')}`, x + w - 22, rowY + 16);
  ctx.textAlign = 'left';

  const facts = `Time ${Math.floor(run.time / 60)}:${String(Math.floor(run.time % 60)).padStart(2, '0')}   ·   Spotted ${run.stats.spotted}   ·   Close calls ${run.stats.closeCalls}   ·   Tools ${run.stats.toolsUsed}`;
  ctx.font = `500 14px ${FONT.ui}`;
  ctx.fillStyle = COLOR.dim;
  ctx.fillText(facts, x + 22, rowY + 50);
  ctx.font = `700 16px ${FONT.ui}`;
  ctx.fillStyle = COLOR.chalk;
  ctx.fillText(hasNext ? 'ENTER  next job      R  replay      T  title' : 'ENTER  title      R  replay', x + 22, y + h - 22);

  ctx.save();
  ctx.translate(MAP.x, MAP.y);
  ctx.font = `15px ${FONT.hand}`;
  ctx.fillStyle = COLOR.thief;
  ctx.fillText('— your route', 20, MAP.height - 18);
  ctx.fillStyle = COLOR.guard;
  ctx.fillText('●  where the guards stood at the end', 140, MAP.height - 18);
  ctx.restore();
}

export function tileToMap(c, r) {
  return { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
}
