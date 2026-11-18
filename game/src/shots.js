// Deterministic screenshot scenes. With ?shot=<name>&seed=<n> the game builds
// one frozen, representative moment instead of starting live play, so its
// maker can capture honest screenshots of the title, the action, the victory
// and the game over with a headless browser. Live play never reads this file.

import { COLORS, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { buildFormation, makeOrb, makePowerup } from './entities.js';

export function setupShotScene(world, name) {
  world.resetRun();
  switch (name) {
    case 'play':
      setupPlayScene(world);
      break;
    case 'win':
      setupWinScene(world);
      break;
    case 'over':
      setupGameOverScene(world);
      break;
    case 'start':
    default:
      world.state = 'title';
      break;
  }
}

function setupPlayScene(world) {
  world.state = 'playing';
  world.score = 1240;
  world.wave = 3;
  world.shields = 2;
  world.combo = 11;
  world.bestCombo = 11;
  world.shattered = 18;
  world.prisms = buildFormation(world.rng, 3);
  // A fight already in progress: some prisms gone, some cracked, all sunk a
  // little way from their starting rows.
  world.prisms.forEach((prism, index) => {
    prism.y += 64;
    if (index % 5 === 0) prism.dead = true;
    else if (index % 3 === 0) prism.hp = Math.max(1, prism.hp - 1);
  });
  world.paddle.x = VIEW_WIDTH * 0.38;
  const orb = makeOrb(VIEW_WIDTH * 0.55, VIEW_HEIGHT * 0.52, 210, -330);
  orb.trail = [
    { x: orb.x - 34, y: orb.y + 52 },
    { x: orb.x - 22, y: orb.y + 34 },
    { x: orb.x - 11, y: orb.y + 17 },
  ];
  const second = makeOrb(VIEW_WIDTH * 0.3, VIEW_HEIGHT * 0.34, -260, 240);
  world.orbs = [orb, second];
  world.powerups = [makePowerup('split', VIEW_WIDTH * 0.44, VIEW_HEIGHT * 0.58)];
  const target = world.prisms.find((prism) => !prism.dead);
  if (target) {
    world.particles.burst(world.rng, target.x + target.width / 2, target.y + target.height / 2, COLORS.prismTiers[target.tier], 14, 240);
    world.particles.update(0.12);
  }
}

function setupWinScene(world) {
  world.state = 'victory';
  world.score = 18650;
  world.best = 18650;
  world.wave = 10;
  world.shields = 2;
  world.shattered = 214;
  world.bestCombo = 23;
  world.prisms = [];
  world.orbs = [makeOrb(VIEW_WIDTH * 0.5, VIEW_HEIGHT * 0.4, 0, 0)];
  for (let i = 0; i < 5; i++) {
    const x = VIEW_WIDTH * (0.2 + i * 0.15);
    world.particles.burst(world.rng, x, 190 + (i % 3) * 46, COLORS.prismTiers[i % COLORS.prismTiers.length], 12, 220);
  }
  world.particles.update(0.15);
}

function setupGameOverScene(world) {
  world.state = 'gameover';
  world.score = 7320;
  world.best = 9100;
  world.wave = 6;
  world.shields = 0;
  world.shattered = 97;
  world.bestCombo = 15;
  world.prisms = buildFormation(world.rng, 6);
  world.prisms.forEach((prism, index) => {
    prism.y += 210;
    if (index % 4 === 0) prism.dead = true;
  });
  world.orbs = [];
}
