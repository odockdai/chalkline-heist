// Entry point: sizes the canvas, runs the fixed-step loop, and moves between the title, the
// planning table, the job itself, the caught moment and the report. ?shot=N stages a photo scene.
import { VIEW, STEP, MAP } from './config.js';
import { JOBS } from './levels.js';
import { bindInput, setViewport, isHeld, wasPressed, moveIntent, pointer, endFrame } from './input.js';
import { createRun, stepRun, stepPatrols, runLive, peakSuspicion } from './heist.js';
import { startingLoadout, loadoutCost, useTool, TOOLS } from './tools.js';
import { drawWorld } from './render.js';
import { drawFrame, drawTopBar, drawPanel, drawControls, drawBanner, drawDangerEdge } from './hud.js';
import { drawPlanningPanel, shopClick, drawRoute, planningCallouts, startMarker } from './planning.js';
import { drawTitle, drawCaught, drawReport } from './screens.js';
import { drawFieldNotes, fieldNotes } from './notes.js';
import { scoreRun } from './scoring.js';
import { unlockAudio, toggleMute, playEvents, playSound, stepAmbience } from './audio.js';
import { stageShot } from './photo-mode.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const SAVE_KEY = 'chalkline-progress-v1';
const game = {
  screen: 'title',
  run: createRun(0, startingLoadout()),
  progress: loadProgress(),
  time: 0,
  showRoutes: false,
  showNotes: true,
  shot: null,
};

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (saved && typeof saved.unlocked === 'number') return { unlocked: Math.min(saved.unlocked, JOBS.length - 1), best: saved.best ?? {} };
  } catch {
    // Private windows can refuse storage; progress then lasts for the session only.
  }
  return { unlocked: 0, best: {} };
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.progress));
  } catch {
    // See loadProgress.
  }
}

function resize() {
  const ratio = window.devicePixelRatio || 1;
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  const width = VIEW.width * scale;
  const height = VIEW.height * scale;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.width = Math.round(VIEW.width * scale * ratio);
  canvas.height = Math.round(VIEW.height * scale * ratio);
  ctx.setTransform(scale * ratio, 0, 0, scale * ratio, 0, 0);
  setViewport(left, top, scale);
}

function say(message) {
  if (status.textContent !== message) status.textContent = message;
}

function openPlanning(jobIndex, keepPlan = false) {
  const old = game.run;
  const loadout = keepPlan ? old.loadout : startingLoadout();
  const run = createRun(jobIndex, keepPlan ? old.startLoadout ?? loadout : loadout, keepPlan ? old.plan : []);
  run.phase = 'plan';
  run.spent = loadoutCost(run.loadout);
  run.banner = null;
  game.run = run;
  game.screen = 'plan';
  say(`Planning ${run.job.name}. Buy your kit and drag a route, then press Enter.`);
}

function startJob() {
  const planned = game.run;
  const run = createRun(planned.jobIndex, planned.loadout, planned.plan);
  run.spent = loadoutCost(planned.loadout);
  run.startLoadout = { ...planned.loadout };
  game.run = run;
  game.screen = 'play';
  playSound('grab');
  say(`${run.job.name}: lift ${run.job.mark.name}, then reach the van.`);
}

function finishJob() {
  const run = game.run;
  const score = scoreRun(run);
  if (score.escaped) {
    game.progress.unlocked = Math.max(game.progress.unlocked, Math.min(JOBS.length - 1, run.jobIndex + 1));
    const previous = game.progress.best[run.job.id];
    const rank = ['GHOST', 'CLEAN', 'LOUD'];
    if (!previous || rank.indexOf(score.rating.name) < rank.indexOf(previous)) game.progress.best[run.job.id] = score.rating.name;
    saveProgress();
  }
  game.screen = 'report';
  say(`${score.rating.name}. The take: ${score.take} dollars.`);
}

function updateTitle(dt) {
  stepPatrols(game.run, dt);
  const mouse = pointer();
  for (let index = 0; index < JOBS.length; index += 1) {
    if (wasPressed(`Digit${index + 1}`) && index <= game.progress.unlocked) return openPlanning(index);
  }
  if (wasPressed('Enter', 'Space') || mouse.clicked) openPlanning(game.progress.unlocked);
}

function updatePlanning(dt) {
  const run = game.run;
  stepPatrols(run, dt);
  const mouse = pointer();
  if (mouse.clicked) {
    const result = shopClick(run, mouse.x, mouse.y);
    if (result === 'start') return startJob();
    if (result) playSound(result);
  }
  if (mouse.down) drawRoute(run, mouse);
  if (mouse.rightClicked) run.plan = [];
  if (wasPressed('Enter')) return startJob();
  if (wasPressed('Escape', 'KeyT')) game.screen = 'title';
  return undefined;
}

function updatePlay(dt) {
  const run = game.run;
  const mouse = pointer();
  TOOLS.forEach((tool) => {
    if (tool.key && wasPressed(`Digit${tool.key}`)) {
      run.selectedTool = tool.id;
      playSound('click');
    }
  });
  if (wasPressed('KeyQ')) {
    const usable = TOOLS.filter((tool) => tool.key);
    const at = usable.findIndex((tool) => tool.id === run.selectedTool);
    run.selectedTool = usable[(at + 1) % usable.length].id;
  }
  if (mouse.clicked && mouse.x < MAP.x + MAP.width) useTool(run, mouse.x - MAP.x, mouse.y - MAP.y);
  const intent = { move: moveIntent(), sneak: isHeld('ShiftLeft', 'ShiftRight'), interact: isHeld('KeyE', 'Space') };
  stepRun(run, intent, dt);
  if (run.phase === 'caught') game.screen = 'caught';
  else if (run.phase === 'escaped') finishJob();
  if (wasPressed('KeyR')) startJob();
  if (wasPressed('KeyP')) openPlanning(run.jobIndex, true);
}

function updateEnded(dt) {
  const run = game.run;
  stepRun(run, { move: { x: 0, y: 0 }, sneak: false, interact: false }, dt);
  if (game.screen === 'caught') {
    if (wasPressed('KeyR', 'Enter')) startJob();
    else if (wasPressed('KeyP')) openPlanning(run.jobIndex, true);
    else if (wasPressed('KeyT', 'Escape')) game.screen = 'title';
    return;
  }
  const next = run.jobIndex + 1 < JOBS.length;
  if (wasPressed('Enter')) {
    if (next) openPlanning(run.jobIndex + 1);
    else {
      game.run = createRun(0, startingLoadout());
      game.screen = 'title';
    }
  } else if (wasPressed('KeyR')) openPlanning(run.jobIndex, true);
  else if (wasPressed('KeyT', 'Escape')) game.screen = 'title';
}

function update(dt) {
  game.time += dt;
  if (wasPressed('KeyM')) toggleMute();
  if (wasPressed('Tab')) game.showRoutes = !game.showRoutes;
  if (wasPressed('KeyH')) game.showNotes = !game.showNotes;
  const run = game.run;
  if (game.screen === 'title') updateTitle(dt);
  else if (game.screen === 'plan') updatePlanning(dt);
  else if (game.screen === 'play') updatePlay(dt);
  else updateEnded(dt);
  playEvents(game.run.events);
  game.run.events = [];
  stepAmbience(dt, game.screen === 'play' ? peakSuspicion(run) : 0, run.lockdown !== null && runLive(run));
}

/** Draw the current screen. Photo scenes pass their own options (callouts, routes, subtitle). */
export function draw(options = {}) {
  const run = game.run;
  const time = game.time;
  drawFrame(ctx);
  const planning = game.screen === 'plan';
  const notes = options.notes ?? (game.showNotes && (game.screen === 'play' || game.screen === 'caught'));
  drawWorld(ctx, run, time, game.screen === 'play' && !options.hideAim ? options.mouse ?? pointer() : null, {
    routes: planning || game.showRoutes || options.routes,
    callouts: planning ? planningCallouts(run) : options.callouts,
  });
  if (notes) {
    ctx.save();
    ctx.translate(MAP.x, MAP.y);
    drawFieldNotes(ctx, fieldNotes(run, options.noteLimit ?? 5), 17);
    ctx.restore();
  }
  if (planning) startMarker(ctx, run);
  drawTopBar(ctx, run, planning ? 'PLAN THE JOB' : options.subtitle);
  if (planning) drawPlanningPanel(ctx, run);
  else drawPanel(ctx, run);
  drawControls(ctx);
  if (game.screen === 'play') {
    drawDangerEdge(ctx, run, time);
    drawBanner(ctx, run);
  }
  if (game.screen === 'caught') drawCaught(ctx, run, time);
  if (game.screen === 'report') drawReport(ctx, run, time, run.jobIndex + 1 < JOBS.length);
  if (game.screen === 'title') drawTitle(ctx, game.progress, time);
}

function loop() {
  let last = performance.now();
  let carry = 0;
  const frame = (now) => {
    carry = Math.min(0.25, carry + (now - last) / 1000);
    last = now;
    while (carry >= STEP) {
      update(STEP);
      endFrame();
      carry -= STEP;
    }
    draw();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function boot() {
  resize();
  window.addEventListener('resize', () => {
    resize();
    if (game.shot) game.shot.redraw();
  });
  bindInput(canvas, unlockAudio);
  try {
    await Promise.all([document.fonts.load('700 20px "Barlow Condensed"'), document.fonts.load('500 20px "Barlow Condensed"'), document.fonts.load('20px "Architects Daughter"')]);
  } catch {
    // The fallback fonts still read fine.
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    const seconds = query.has('t') ? Number(query.get('t')) : null;
    game.shot = stageShot(shot, game, draw, Number.isFinite(seconds) ? seconds : null);
    game.shot.redraw();
    return;
  }
  game.run.phase = 'plan';
  say('Chalkline. Press Enter to plan the first job.');
  loop();
}

boot();
