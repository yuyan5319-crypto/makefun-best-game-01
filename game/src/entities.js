// Prismfall's pieces: the light bar the player steers, the orbs that bounce,
// the crystal prisms that sink toward the shatter line, and the power-up
// glyphs that fall from broken prisms. This file only makes and describes
// them; world.js moves them and render.js draws them.

import {
  ORB_RADIUS,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  PRISM_COLS,
  PRISM_GAP,
  PRISM_HEIGHT,
  PRISM_TOP,
  PRISM_WIDTH,
  VIEW_WIDTH,
} from './config.js';
import { pickWeighted } from './random.js';

export function makePaddle() {
  return { x: VIEW_WIDTH / 2, width: PADDLE_WIDTH, y: PADDLE_Y, height: PADDLE_HEIGHT, wideTimer: 0 };
}

export function makeOrb(x, y, vx, vy) {
  return { x, y, vx, vy, radius: ORB_RADIUS, stuck: false, trail: [] };
}

export function makeStuckOrb(paddle) {
  const orb = makeOrb(paddle.x, paddle.y - ORB_RADIUS - 2, 0, 0);
  orb.stuck = true;
  return orb;
}

export function prismGridOriginX() {
  const total = PRISM_COLS * PRISM_WIDTH + (PRISM_COLS - 1) * PRISM_GAP;
  return (VIEW_WIDTH - total) / 2;
}

// The shapes a wave's formation can take, chosen per wave from the seed.
const FORMATIONS = [
  (row, col, rows) => row < rows, // full wall
  (row, col, rows) => (row + col) % 2 === 0 || row === rows - 1, // checker with a solid base
  (row, col, rows) => Math.abs(col - 4) <= row + 1 && row < rows, // pyramid
  (row, col) => col !== 4, // split wall with a gate down the middle
  (row, col, rows) => row === 0 || row === rows - 1 || col === 0 || col === PRISM_COLS - 1, // hollow frame
];

// Builds one wave of prisms. Higher waves grow more rows, tougher prisms and
// a faster sink rate; the formation and the tough prisms' spots come from the
// wave's own seed so a wave is the same fight every time it is met.
export function buildFormation(rng, wave) {
  const rows = Math.min(3 + Math.ceil(wave / 2), 6);
  const shape = FORMATIONS[(wave - 1) % FORMATIONS.length];
  const maxTier = Math.min(1 + Math.floor(wave / 3), 4);
  const prisms = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < PRISM_COLS; col++) {
      if (!shape(row, col, rows)) continue;
      const toughChance = 0.1 + wave * 0.03 + row * 0.02;
      const tier = rng() < toughChance ? 1 + Math.floor(rng() * maxTier) : 0;
      prisms.push({
        x: prismGridOriginX() + col * (PRISM_WIDTH + PRISM_GAP),
        y: PRISM_TOP + row * (PRISM_HEIGHT + PRISM_GAP),
        width: PRISM_WIDTH,
        height: PRISM_HEIGHT,
        tier,
        hp: tier + 1,
        maxHp: tier + 1,
        wobble: rng() * Math.PI * 2,
        dead: false,
      });
    }
  }
  return prisms;
}

const POWERUP_KINDS = [
  { value: 'wide', weight: 30 },
  { value: 'split', weight: 26 },
  { value: 'slow', weight: 22 },
  { value: 'shield', weight: 12 },
];

export function rollPowerupKind(rng) {
  return pickWeighted(rng, POWERUP_KINDS);
}

export function makePowerup(kind, x, y) {
  return { kind, x, y, radius: 13, spin: 0 };
}

export const POWERUP_GLYPHS = { wide: 'W', split: 'S', slow: 'T', shield: '+' };
export const POWERUP_NAMES = {
  wide: 'WIDE BAR',
  split: 'SPLIT ORB',
  slow: 'SLOW TIME',
  shield: 'SHIELD +1',
};
