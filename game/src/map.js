// The blueprint as a tile map: parsing a job's grid, who may walk where, what blocks sight,
// grid ray casting for vision cones, and breadth-first paths for guards who leave their route.
import { TILE, COLS, ROWS } from './config.js';

export const TILE_KIND = { WALL: 0, FLOOR: 1, SHADOW: 2, COVER: 3, VENT: 4, LOCKED: 5, OPEN: 6 };
const K = TILE_KIND;

const GLYPH = { '#': K.WALL, ',': K.SHADOW, T: K.COVER, V: K.VENT, L: K.LOCKED };

/** Turn a job's 30 x 19 grid into tiles plus the marked spots (start, van, mark, cash, fuse boxes, doors). */
export function parseBlueprint(job) {
  const tiles = new Uint8Array(COLS * ROWS);
  const map = { tiles, start: null, exit: null, mark: null, cash: [], fuses: [], doors: [] };
  for (let r = 0; r < ROWS; r += 1) {
    const line = job.grid[r];
    for (let c = 0; c < COLS; c += 1) {
      const ch = line[c] ?? '#';
      tiles[r * COLS + c] = GLYPH[ch] ?? K.FLOOR;
      const spot = { c, r, x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
      if (ch === 'S') map.start = spot;
      else if (ch === 'X') map.exit = spot;
      else if (ch === '*') map.mark = spot;
      else if (ch === '$') map.cash.push({ ...spot, taken: false, value: 150 + ((c * 7 + r * 13) % 4) * 50 });
      else if (ch === 'F') map.fuses.push({ ...spot, used: false });
      else if (ch === 'L') map.doors.push({ ...spot, open: false });
    }
  }
  return map;
}

export function tileAt(map, c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return K.WALL;
  return map.tiles[r * COLS + c];
}

export function tileAtPoint(map, x, y) {
  return tileAt(map, Math.floor(x / TILE), Math.floor(y / TILE));
}

export function thiefCanStand(kind) {
  return kind === K.FLOOR || kind === K.SHADOW || kind === K.VENT || kind === K.OPEN;
}

export function guardCanStand(kind) {
  return kind === K.FLOOR || kind === K.SHADOW || kind === K.OPEN;
}

export function blocksSight(kind) {
  return kind === K.WALL || kind === K.COVER || kind === K.VENT || kind === K.LOCKED;
}

export function openDoor(map, door) {
  door.open = true;
  map.tiles[door.r * COLS + door.c] = K.OPEN;
}

/** Slide a box of half-size `half` by (dx, dy), one axis at a time, stopping at tiles `canStand` refuses. */
export function moveBox(map, body, dx, dy, half, canStand) {
  const fits = (x, y) =>
    canStand(tileAtPoint(map, x - half, y - half)) &&
    canStand(tileAtPoint(map, x + half, y - half)) &&
    canStand(tileAtPoint(map, x - half, y + half)) &&
    canStand(tileAtPoint(map, x + half, y + half));
  if (dx !== 0 && fits(body.x + dx, body.y)) body.x += dx;
  if (dy !== 0 && fits(body.x, body.y + dy)) body.y += dy;
}

/** A thrown thing sails over display cases and stops only at walls, doors and vents. */
export function blocksThrow(kind) {
  return kind === K.WALL || kind === K.LOCKED || kind === K.VENT;
}

/** Distance from (x, y) along `angle` to the first tile `blocks` refuses (sight by default), at most `max` (grid DDA). */
export function castRay(map, x, y, angle, max, blocks = blocksSight) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let c = Math.floor(x / TILE);
  let r = Math.floor(y / TILE);
  const stepC = dx > 0 ? 1 : -1;
  const stepR = dy > 0 ? 1 : -1;
  const deltaX = dx === 0 ? Infinity : Math.abs(TILE / dx);
  const deltaY = dy === 0 ? Infinity : Math.abs(TILE / dy);
  let sideX = dx === 0 ? Infinity : (dx > 0 ? (c + 1) * TILE - x : x - c * TILE) / Math.abs(dx);
  let sideY = dy === 0 ? Infinity : (dy > 0 ? (r + 1) * TILE - y : y - r * TILE) / Math.abs(dy);
  for (let guard = 0; guard < 64; guard += 1) {
    let dist;
    if (sideX < sideY) {
      dist = sideX;
      sideX += deltaX;
      c += stepC;
    } else {
      dist = sideY;
      sideY += deltaY;
      r += stepR;
    }
    if (dist >= max) return max;
    if (blocks(tileAt(map, c, r))) return dist;
  }
  return max;
}

export function clearLine(map, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  if (d < 1) return true;
  return castRay(map, x0, y0, Math.atan2(y1 - y0, x1 - x0), d) >= d - 0.5;
}

/** Tile-centre path from one point to another over tiles `canStand` allows (guards' by default), or null. */
export function findPath(map, fromX, fromY, toX, toY, canStand = guardCanStand) {
  const start = Math.floor(fromY / TILE) * COLS + Math.floor(fromX / TILE);
  let goal = Math.floor(toY / TILE) * COLS + Math.floor(toX / TILE);
  if (!canStand(map.tiles[goal])) goal = nearestGuardTile(map, goal);
  if (goal < 0) return null;
  const came = new Int16Array(COLS * ROWS).fill(-1);
  const queue = [start];
  came[start] = start;
  for (let head = 0; head < queue.length; head += 1) {
    const at = queue[head];
    if (at === goal) break;
    const c = at % COLS;
    const r = (at - c) / COLS;
    const next = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
    for (const [nc, nr] of next) {
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const id = nr * COLS + nc;
      if (came[id] !== -1 || !canStand(map.tiles[id])) continue;
      came[id] = at;
      queue.push(id);
    }
  }
  if (came[goal] === -1) return null;
  const path = [];
  for (let at = goal; at !== start; at = came[at]) {
    const c = at % COLS;
    path.push({ x: (c + 0.5) * TILE, y: ((at - c) / COLS + 0.5) * TILE });
  }
  path.reverse();
  return path;
}

function nearestGuardTile(map, id) {
  const c0 = id % COLS;
  const r0 = (id - c0) / COLS;
  for (let ring = 1; ring < 4; ring += 1) {
    for (let dr = -ring; dr <= ring; dr += 1) {
      for (let dc = -ring; dc <= ring; dc += 1) {
        const c = c0 + dc;
        const r = r0 + dr;
        if (guardCanStand(tileAt(map, c, r))) return r * COLS + c;
      }
    }
  }
  return -1;
}
