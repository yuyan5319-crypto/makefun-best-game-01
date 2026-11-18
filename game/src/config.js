// Prismfall configuration: the playfield, the palette and every tuning number
// the rest of the game reads. One place for balance so a wave feels the same
// on every machine.

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 600;

export const PADDLE_Y = VIEW_HEIGHT - 46;
export const PADDLE_WIDTH = 118;
export const PADDLE_WIDE_WIDTH = 176;
export const PADDLE_HEIGHT = 14;
export const PADDLE_KEY_SPEED = 640;

export const ORB_RADIUS = 8;
export const ORB_BASE_SPEED = 385;
export const ORB_SPEED_PER_WAVE = 16;
export const ORB_MAX_BOUNCE_ANGLE = 1.05; // radians from vertical at the paddle's edge

export const PRISM_COLS = 9;
export const PRISM_WIDTH = 78;
export const PRISM_HEIGHT = 30;
export const PRISM_GAP = 10;
export const PRISM_TOP = 92;
export const SHATTER_LINE_Y = VIEW_HEIGHT - 96; // a prism that sinks this low breaks a shield

export const START_SHIELDS = 3;
export const FINAL_WAVE = 10;
export const WAVE_CLEAR_BONUS = 250;

export const POWERUP_FALL_SPEED = 150;
export const POWERUP_CHANCE = 0.16;
export const WIDE_SECONDS = 12;
export const SLOW_SECONDS = 6;
export const SLOW_FACTOR = 0.55;

export const FIXED_STEP = 1 / 120;

// Neon-on-indigo palette. Prism tiers are ordered weakest to strongest; the
// last tier is the hue a prism shows at full strength for its wave.
export const COLORS = {
  backgroundTop: '#070818',
  backgroundBottom: '#141038',
  star: '#aab4ff',
  paddle: '#57f7ff',
  paddleCore: '#eaffff',
  orb: '#fff6c9',
  orbGlow: '#ffd94d',
  shield: '#7dffb0',
  danger: '#ff5d7a',
  text: '#eef1ff',
  textDim: '#9aa3d7',
  accent: '#ffb3ec',
  prismTiers: ['#37e0a0', '#39b6ff', '#b78bff', '#ff9f43', '#ff5d7a'],
  powerups: { wide: '#57f7ff', split: '#ffb3ec', slow: '#8ea2ff', shield: '#7dffb0' },
};
