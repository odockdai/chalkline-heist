// Shared constants: the screen layout, the tile grid, movement and sight numbers, and the blueprint palette.

export const VIEW = { width: 1280, height: 720 };
export const TILE = 32;
export const COLS = 30;
export const ROWS = 19;
export const MAP = { x: 14, y: 60, width: COLS * TILE, height: ROWS * TILE };
export const PANEL = { x: 988, y: 60, width: 278, height: ROWS * TILE };
export const STEP = 1 / 60;

export const SPEED = { walk: 118, sneak: 62, crawl: 50, patrol: 56, investigate: 80, chase: 128, turn: 3.4 };
export const NOISE = { walk: 84, rattle: 220, stepEvery: 0.38 };
export const SIGHT = { guardRange: 205, guardHalf: 0.58, cameraRange: 235, cameraHalf: 0.38, shadowReveal: 44, peripheral: 30, rays: 64 };
export const DETECT = { near: 1.7, far: 0.6, decay: 0.32, suspect: 0.28 };
export const ALARM = { camera: 16, guard: 22, spotBurst: 18, decay: 2.5, floors: [0, 34, 67], lockdown: 100 };
export const CATCH_RADIUS = 21;
export const GRAB_SECONDS = 1.4;
export const PICK_SECONDS = 1.2;

export const COLOR = {
  night: '#050f20',
  paper: '#0c2548',
  room: '#0f2c55',
  gridMinor: 'rgba(130,180,240,0.07)',
  gridMajor: 'rgba(150,195,250,0.15)',
  shadow: '#061631',
  shadowHatch: 'rgba(96,152,224,0.42)',
  wall: '#a9c6ec',
  wallHatch: 'rgba(12,37,72,0.35)',
  wallEdge: '#eef5ff',
  furniture: '#16406f',
  furnitureLine: '#cfe1f8',
  vent: '#08203f',
  ventLine: '#5fd8ff',
  lock: '#ff9b3d',
  door: '#8fb6e6',
  guard: '#ff6a55',
  guardCone: 'rgba(255,98,74,',
  suspect: '#ffb648',
  suspectCone: 'rgba(255,182,72,',
  chase: '#ff3d3d',
  chaseCone: 'rgba(255,61,61,',
  camera: '#b48cff',
  cameraCone: 'rgba(180,140,255,',
  loot: '#ffd23f',
  cash: '#f2c55c',
  thief: '#4ff0c1',
  exit: '#4be38c',
  chalk: '#fff4d2',
  ink: '#e9f2ff',
  dim: '#90b2da',
  rule: '#3a679f',
  panel: '#081b37',
  danger: '#ff5a4f',
  smoke: 'rgba(214,226,240,',
};

export const FONT = {
  ui: '"Barlow Condensed", "Liberation Sans Narrow", "Arial Narrow", sans-serif',
  hand: '"Architects Daughter", "Comic Sans MS", cursive',
};
