// Prismfall's entry point: sizes the canvas, wires input and sound to the
// world, and runs the fixed-step loop. With ?shot=<scene>&seed=<n> it instead
// builds one deterministic scene from shots.js, renders it, and raises
// window.__shotReady so a headless browser can capture the screenshot.

import { FIXED_STEP, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { makeRng } from './random.js';
import { Renderer } from './render.js';
import { setupShotScene } from './shots.js';
import { World } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed')) || 1;

const sound = new SoundEngine();
const world = new World(makeRng(shotName ? seed : (Date.now() % 2147483647) + 1), sound);
const input = new Input(canvas);
const renderer = new Renderer();

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function viewTransform() {
  const scale = Math.min(canvas.width / VIEW_WIDTH, canvas.height / VIEW_HEIGHT);
  const offsetX = (canvas.width - VIEW_WIDTH * scale) / 2;
  const offsetY = (canvas.height - VIEW_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY };
}

function render() {
  const { scale, offsetX, offsetY } = viewTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#070818';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  renderer.draw(ctx, world);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

if (shotName) {
  setupShotScene(world, shotName);
  world.time = 1.4; // a fixed moment, so pulses and twinkles match every capture
  render();
  window.__shotReady = true;
  document.body.dataset.shot = shotName;
} else {
  const unlock = () => sound.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  let last = performance.now();
  let accumulator = 0;
  let lastStatus = '';

  function frame(now) {
    accumulator += Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const press of input.takePresses()) world.handlePress(press);
    while (accumulator >= FIXED_STEP) {
      world.update(FIXED_STEP, input);
      accumulator -= FIXED_STEP;
    }
    render();
    const line = `${world.state} · score ${world.score} · wave ${world.wave} · shields ${world.shields}`;
    if (line !== lastStatus) {
      status.textContent = `Prismfall: ${line}`;
      lastStatus = line;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
