// Field notes (H): live chalk labels on the blueprint that say what the nearest guard is doing,
// what the nearest camera sees, where you stand, and where the mark or the van is. Each label
// tries a few spots around its subject and takes the first that does not cover another.
import { MAP, FONT, SIGHT } from './config.js';
import { GUARD_STATE } from './guard.js';
import { cameraOffline } from './camera.js';
import { thiefIsHidden } from './sight.js';
import { chalkNote } from './render.js';

const G = GUARD_STATE;

function guardLine(guard) {
  const lured = guard.cause === 'rattle';
  switch (guard.state) {
    case G.CHASE: return `${guard.name.toUpperCase()}: chasing you!`;
    case G.SUSPECT: return lured ? `${guard.name.toUpperCase()}: heard your rattle` : `${guard.name.toUpperCase()}: suspicious, ring filling`;
    case G.LISTEN: return `${guard.name.toUpperCase()}: heard footsteps`;
    case G.INVESTIGATE: return lured ? `${guard.name.toUpperCase()}: lured off by the rattle` : `${guard.name.toUpperCase()}: off to check a noise`;
    case G.SEARCH: return lured ? `${guard.name.toUpperCase()}: searching where it landed` : `${guard.name.toUpperCase()}: searching the spot`;
    case G.WAIT: return `${guard.name.toUpperCase()}: stops, sweeps the torch`;
    default: return `${guard.name.toUpperCase()}: on patrol`;
  }
}

function thiefLine(run) {
  if (run.thief.inVent) return 'YOU: in the vent, out of every cone';
  if (run.seenBy.length > 0) return 'YOU: SEEN. Break the line of sight';
  if (thiefIsHidden(run)) return 'YOU: hidden in the shadow';
  if (run.thief.carrying) return 'YOU: carrying the mark';
  return run.thief.sneaking ? 'YOU: sneaking, no footsteps' : 'YOU: in the open';
}

function nearest(list, x, y, skip) {
  let best = null;
  let bestDist = Infinity;
  for (const item of list) {
    if (skip && skip(item)) continue;
    const d = Math.hypot(item.x - x, item.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

/** The notes to show this frame, nearest things first, at most `limit` of them. */
export function fieldNotes(run, limit = 4) {
  const thief = run.thief;
  const notes = [{ subject: thief, text: thiefLine(run), color: run.seenBy.length > 0 ? 'danger' : 'thief' }];
  if (thief.carrying) notes.push({ subject: run.map.exit, text: 'VAN: get here with the mark', color: 'exit' });
  else notes.push({ subject: run.map.mark, text: `${run.job.mark.name.toUpperCase()}: $${run.job.mark.value.toLocaleString('en-US')}`, color: 'loot' });
  const guards = [...run.guards].sort((a, b) => Math.hypot(a.x - thief.x, a.y - thief.y) - Math.hypot(b.x - thief.x, b.y - thief.y));
  const guardNote = (guard) => ({ subject: guard, text: guardLine(guard), color: guard.state === G.CHASE ? 'danger' : guard.state === G.PATROL || guard.state === G.WAIT ? 'guard' : 'suspect' });
  if (guards[0]) notes.push(guardNote(guards[0]));
  const camera = nearest(run.cameras, thief.x, thief.y);
  if (camera) {
    const off = cameraOffline(run, camera);
    const left = Math.ceil(Math.max(camera.jammed, run.powerCut));
    notes.push({ subject: camera, text: off ? `CAMERA: blind for ${left}s` : camera.lock > 0 ? 'CAMERA: has you, recording' : `CAMERA: sweeps, ${Math.round(SIGHT.cameraRange / 32)} tiles deep`, color: 'camera' });
  }
  if (guards[1]) notes.push(guardNote(guards[1]));
  return notes.slice(0, limit);
}

const OFFSETS = [
  [40, -38], [40, 52], [-40, -38], [-40, 52], [54, 8], [-54, 8], [34, -80], [-34, -80], [34, 92], [-34, 92],
];

function overlaps(a, list) {
  return list.some((b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
}

/** Draw the notes in map space (the caller has translated to the map). */
export function drawFieldNotes(ctx, notes, size = 15, avoid = []) {
  ctx.save();
  ctx.font = `${size}px ${FONT.hand}`;
  // Keep every label off every subject and every guard or camera, so a note never hides what it explains.
  const placed = [...notes.map((note) => note.subject), ...avoid].map((point) => ({ x: point.x - 22, y: point.y - 22, w: 44, h: 44 }));
  for (const note of notes) {
    const width = ctx.measureText(note.text).width + 12;
    const height = size + 10;
    let spot = null;
    for (const [dx, dy] of OFFSETS) {
      const x = dx > 0 ? note.subject.x + dx : note.subject.x + dx - width;
      const y = note.subject.y + dy;
      const box = { x: x - 6, y: y - size - 2, w: width, h: height };
      if (box.x < 4 || box.y < 4 || box.x + box.w > MAP.width - 4 || box.y + box.h > MAP.height - 4) continue;
      if (overlaps(box, placed)) continue;
      spot = { x, y, box };
      break;
    }
    if (!spot) continue;
    placed.push(spot.box);
    const anchor = { x: note.subject.x + Math.sign(spot.x - note.subject.x) * 16, y: note.subject.y };
    note.placed = { x: spot.x, y: spot.y, from: anchor };
  }
  for (const note of notes) {
    if (!note.placed) continue;
    chalkNote(ctx, note.placed.x, note.placed.y, note.text, colorOf(note.color), size, note.placed.from);
  }
  ctx.restore();
}

const NOTE_COLORS = {
  thief: '#4ff0c1',
  danger: '#ff5a4f',
  guard: '#ff8a75',
  suspect: '#ffb648',
  camera: '#c7a6ff',
  exit: '#4be38c',
  loot: '#ffd23f',
};

function colorOf(name) {
  return NOTE_COLORS[name] ?? '#fff4d2';
}
