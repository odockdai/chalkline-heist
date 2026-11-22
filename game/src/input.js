// Keyboard and mouse, read once per frame: held keys, keys pressed since the last frame,
// and the mouse in game pixels (the canvas is letterboxed, so client pixels are mapped back).
import { VIEW } from './config.js';

const held = new Set();
const pressed = new Set();
const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, clicked: false, rightClicked: false };
let viewport = { left: 0, top: 0, scale: 1 };

const BLOCKED = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function bindInput(canvas, onFirstGesture) {
  window.addEventListener('keydown', (event) => {
    if (BLOCKED.has(event.code)) event.preventDefault();
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
    onFirstGesture();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (event) => moveMouse(event));
  canvas.addEventListener('mousedown', (event) => {
    moveMouse(event);
    if (event.button === 2) mouse.rightClicked = true;
    else {
      mouse.down = true;
      mouse.clicked = true;
    }
    onFirstGesture();
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

export function setViewport(left, top, scale) {
  viewport = { left, top, scale };
}

function moveMouse(event) {
  mouse.x = (event.clientX - viewport.left) / viewport.scale;
  mouse.y = (event.clientY - viewport.top) / viewport.scale;
}

export function isHeld(...codes) {
  return codes.some((code) => held.has(code));
}

export function wasPressed(...codes) {
  return codes.some((code) => pressed.has(code));
}

/** The movement the arrow keys or WASD ask for, as a vector of length 0 or 1. */
export function moveIntent() {
  let x = 0;
  let y = 0;
  if (isHeld('KeyA', 'ArrowLeft')) x -= 1;
  if (isHeld('KeyD', 'ArrowRight')) x += 1;
  if (isHeld('KeyW', 'ArrowUp')) y -= 1;
  if (isHeld('KeyS', 'ArrowDown')) y += 1;
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

export function pointer() {
  return mouse;
}

/** Forget this frame's presses and clicks; held keys stay held. */
export function endFrame() {
  pressed.clear();
  mouse.clicked = false;
  mouse.rightClicked = false;
}
