// The still layer of a job, painted once to an offscreen canvas: blueprint paper, hatched wall
// sections, rooms with their grid, hatched shadow, display cases, vents and room names.
import { TILE, COLS, ROWS, COLOR, FONT } from './config.js';
import { TILE_KIND, tileAt } from './map.js';

const K = TILE_KIND;

function hatch(ctx, x, y, w, h, color, gap, width) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let d = -h; d < w; d += gap) {
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

function isWalkable(kind) {
  return kind !== K.WALL;
}

/** Paint the job's map at 1:1 into a new canvas of COLS x ROWS tiles. */
export function paintBlueprint(map, job) {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLOR.wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  hatch(ctx, 0, 0, canvas.width, canvas.height, COLOR.wallHatch, 7, 1.4);

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const kind = tileAt(map, c, r);
      if (kind === K.WALL) continue;
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = kind === K.SHADOW ? COLOR.shadow : COLOR.room;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }

  ctx.strokeStyle = COLOR.gridMinor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += TILE / 2) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += TILE / 2) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
  }
  ctx.stroke();

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const kind = tileAt(map, c, r);
      const x = c * TILE;
      const y = r * TILE;
      if (kind === K.SHADOW) hatch(ctx, x, y, TILE, TILE, COLOR.shadowHatch, 6, 1);
      if (kind === K.VENT) paintVent(ctx, x, y);
    }
  }

  paintCover(ctx, map);
  paintWallEdges(ctx, map);

  ctx.font = `600 13px ${FONT.ui}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(200,222,250,0.55)';
  for (const room of job.rooms) {
    ctx.save();
    ctx.letterSpacing = '2px';
    ctx.fillText(room.label, room.x * TILE, room.y * TILE);
    ctx.restore();
  }
  return canvas;
}

/** An opaque mask of the tiles night falls on (floor, shadow, vents), so walls and cases stay crisp. */
export function paintFloorMask(map) {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const kind = tileAt(map, c, r);
      if (kind === K.WALL || kind === K.COVER || kind === K.LOCKED) continue;
      ctx.fillStyle = kind === K.SHADOW ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.78)';
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  return canvas;
}

function paintVent(ctx, x, y) {
  ctx.fillStyle = COLOR.vent;
  ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.strokeStyle = COLOR.ventLine;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
  ctx.beginPath();
  for (let k = 9; k < TILE - 6; k += 5) {
    ctx.moveTo(x + 7, y + k);
    ctx.lineTo(x + TILE - 7, y + k);
  }
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function paintCover(ctx, map) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (tileAt(map, c, r) !== K.COVER) continue;
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = COLOR.furniture;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }
  ctx.strokeStyle = COLOR.furnitureLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (tileAt(map, c, r) !== K.COVER) continue;
      const x = c * TILE;
      const y = r * TILE;
      if (tileAt(map, c, r - 1) !== K.COVER) { ctx.moveTo(x, y + 1); ctx.lineTo(x + TILE, y + 1); }
      if (tileAt(map, c, r + 1) !== K.COVER) { ctx.moveTo(x, y + TILE - 1); ctx.lineTo(x + TILE, y + TILE - 1); }
      if (tileAt(map, c - 1, r) !== K.COVER) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + TILE); }
      if (tileAt(map, c + 1, r) !== K.COVER) { ctx.moveTo(x + TILE - 1, y); ctx.lineTo(x + TILE - 1, y + TILE); }
    }
  }
  ctx.stroke();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const block = tileAt(map, c, r) === K.COVER && tileAt(map, c + 1, r) === K.COVER && tileAt(map, c, r + 1) === K.COVER && tileAt(map, c - 1, r) !== K.COVER && tileAt(map, c, r - 1) !== K.COVER;
      if (block) {
        const cx = (c + 1) * TILE;
        const cy = (r + 1) * TILE;
        ctx.strokeStyle = 'rgba(207,225,248,0.55)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - 22, cy - 22, 44, 44);
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy - 22);
        ctx.lineTo(cx - 8, cy - 8);
        ctx.moveTo(cx + 22, cy - 22);
        ctx.lineTo(cx + 8, cy - 8);
        ctx.moveTo(cx - 22, cy + 22);
        ctx.lineTo(cx - 8, cy + 8);
        ctx.moveTo(cx + 22, cy + 22);
        ctx.lineTo(cx + 8, cy + 8);
        ctx.stroke();
      } else if (tileAt(map, c, r) === K.COVER && tileAt(map, c - 1, r) !== K.COVER && tileAt(map, c, r - 1) !== K.COVER && tileAt(map, c + 1, r) !== K.COVER) {
        const cx = (c + 0.5) * TILE;
        const cy = (r + 0.5) * TILE;
        ctx.strokeStyle = 'rgba(207,225,248,0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

function paintWallEdges(ctx, map) {
  ctx.strokeStyle = COLOR.wallEdge;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';
  ctx.beginPath();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (tileAt(map, c, r) !== K.WALL) continue;
      const x = c * TILE;
      const y = r * TILE;
      if (r > 0 && isWalkable(tileAt(map, c, r - 1))) { ctx.moveTo(x, y); ctx.lineTo(x + TILE, y); }
      if (r < ROWS - 1 && isWalkable(tileAt(map, c, r + 1))) { ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE, y + TILE); }
      if (c > 0 && isWalkable(tileAt(map, c - 1, r))) { ctx.moveTo(x, y); ctx.lineTo(x, y + TILE); }
      if (c < COLS - 1 && isWalkable(tileAt(map, c + 1, r))) { ctx.moveTo(x + TILE, y); ctx.lineTo(x + TILE, y + TILE); }
    }
  }
  ctx.stroke();
  ctx.strokeRect(1.5, 1.5, COLS * TILE - 3, ROWS * TILE - 3);
}
