// Night lighting on the map: the ceiling lamps that leave warm pools on open floor (where a cone
// will see you), the hatching that keeps shadow pockets readable as safe ground in the dark, and
// the spotlight over the mark. Painted once per job, then laid over the night layer each frame.
import { TILE, COLS, ROWS, COLOR } from './config.js';
import { TILE_KIND, tileAt } from './map.js';

const K = TILE_KIND;
const POOL = 118;

function isLitFloor(kind) {
  return kind === K.FLOOR || kind === K.OPEN || kind === K.LOCKED;
}

/** Lamp spots: every open-floor tile on a fixed 6 x 5 lattice, so each room gets its own pools. */
export function lampSpots(map) {
  const spots = [];
  for (let r = 2; r < ROWS - 1; r += 5) {
    for (let c = 3; c < COLS - 1; c += 6) {
      let best = null;
      for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
        if (isLitFloor(tileAt(map, c + dc, r + dr))) {
          best = { x: (c + dc + 0.5) * TILE, y: (r + dr + 0.5) * TILE };
          break;
        }
      }
      if (best) spots.push(best);
    }
  }
  return spots;
}

/** The warm pools, cut to open floor so shadow tiles, walls and cases stay dark. */
export function paintLampLight(map) {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  for (const lamp of lampSpots(map)) {
    const pool = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, POOL);
    pool.addColorStop(0, 'rgba(255,200,130,0.42)');
    pool.addColorStop(0.5, 'rgba(255,186,110,0.2)');
    pool.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(lamp.x - POOL, lamp.y - POOL, POOL * 2, POOL * 2);
  }
  const mask = document.createElement('canvas');
  mask.width = canvas.width;
  mask.height = canvas.height;
  const maskCtx = mask.getContext('2d');
  maskCtx.fillStyle = '#000';
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (isLitFloor(tileAt(map, c, r))) maskCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  ctx.globalCompositeOperation = 'destination-in';
  ctx.filter = 'blur(5px)';
  ctx.drawImage(mask, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  for (const lamp of lampSpots(map)) {
    ctx.fillStyle = 'rgba(255,226,170,0.9)';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,226,170,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  return canvas;
}

/** Cool hatching over shadow tiles, drawn above the night so safe ground still reads as safe. */
export function paintShadowHatch(map) {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = COLOR.shadowHatch;
  ctx.lineWidth = 1.2;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (tileAt(map, c, r) !== K.SHADOW) continue;
      const x = c * TILE;
      const y = r * TILE;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, TILE, TILE);
      ctx.clip();
      ctx.beginPath();
      for (let d = -TILE; d < TILE; d += 8) {
        ctx.moveTo(x + d, y + TILE);
        ctx.lineTo(x + d + TILE, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  return canvas;
}

/** A pale beam from above onto the mark's plinth, so the prize is the brightest thing on the map. */
export function drawSpotlight(ctx, mark, time) {
  const flicker = 0.92 + 0.08 * Math.sin(time * 2.3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createRadialGradient(mark.x, mark.y, 6, mark.x, mark.y, 64);
  beam.addColorStop(0, `rgba(255,224,120,${0.55 * flicker})`);
  beam.addColorStop(0.5, `rgba(255,214,90,${0.22 * flicker})`);
  beam.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.arc(mark.x, mark.y, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
