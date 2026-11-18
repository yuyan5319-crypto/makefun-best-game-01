// Prismfall's world: the state machine and every rule. Title, playing,
// paused, wave-clear, victory and game over live here, along with scoring,
// combos, power-ups, collisions and the sinking prisms. render.js only reads
// this state; main.js only feeds it time and input.

import {
  COLORS,
  FINAL_WAVE,
  ORB_BASE_SPEED,
  ORB_MAX_BOUNCE_ANGLE,
  ORB_SPEED_PER_WAVE,
  PADDLE_KEY_SPEED,
  PADDLE_WIDE_WIDTH,
  PADDLE_WIDTH,
  POWERUP_CHANCE,
  POWERUP_FALL_SPEED,
  SHATTER_LINE_Y,
  SLOW_FACTOR,
  SLOW_SECONDS,
  START_SHIELDS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WAVE_CLEAR_BONUS,
  WIDE_SECONDS,
} from './config.js';
import {
  buildFormation,
  makeOrb,
  makePaddle,
  makePowerup,
  makeStuckOrb,
  rollPowerupKind,
} from './entities.js';
import { ParticleSystem } from './particles.js';

function loadBest() {
  try {
    return Number(localStorage.getItem('prismfall-best')) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem('prismfall-best', String(score));
  } catch {
    // storage can be unavailable; the best score is a nicety, not the game
  }
}

export class World {
  constructor(rng, sound) {
    this.rng = rng;
    this.sound = sound;
    this.particles = new ParticleSystem();
    this.state = 'title';
    this.best = loadBest();
    this.time = 0;
    this.shake = 0;
    this.dangerFlash = 0;
    this.resetRun();
  }

  resetRun() {
    this.score = 0;
    this.wave = 1;
    this.shields = START_SHIELDS;
    this.combo = 0;
    this.bestCombo = 0;
    this.shattered = 0;
    this.slowTimer = 0;
    this.bannerTimer = 0;
    this.paddle = makePaddle();
    this.orbs = [makeStuckOrb(this.paddle)];
    this.powerups = [];
    this.prisms = buildFormation(this.rng, this.wave);
  }

  startGame() {
    this.resetRun();
    this.state = 'playing';
    this.sound.gameStarted();
  }

  handlePress(press) {
    switch (this.state) {
      case 'title':
        if (press === 'confirm' || press === 'launch') this.startGame();
        break;
      case 'playing':
        if (press === 'launch') this.launchStuckOrbs();
        if (press === 'pause') this.state = 'paused';
        break;
      case 'paused':
        if (press === 'pause' || press === 'confirm') this.state = 'playing';
        break;
      case 'gameover':
      case 'victory':
        if (press === 'confirm' || press === 'launch') this.startGame();
        break;
      default:
        break;
    }
    if (press === 'mute') {
      const muted = this.sound.toggleMute();
      this.particles.addLabel(this.paddle.x, this.paddle.y - 60, muted ? 'SOUND OFF' : 'SOUND ON', COLORS.textDim);
    }
  }

  orbSpeed() {
    return ORB_BASE_SPEED + (this.wave - 1) * ORB_SPEED_PER_WAVE;
  }

  launchStuckOrbs() {
    for (const orb of this.orbs) {
      if (!orb.stuck) continue;
      const speed = this.orbSpeed();
      const angle = (this.rng() - 0.5) * 0.7;
      orb.vx = Math.sin(angle) * speed;
      orb.vy = -Math.cos(angle) * speed;
      orb.stuck = false;
      this.sound.paddleBounce();
    }
  }

  update(dt, input) {
    this.time += dt;
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.dangerFlash = Math.max(0, this.dangerFlash - dt * 2.2);
    if (this.state !== 'playing' && this.state !== 'waveclear') return;

    if (this.state === 'waveclear') {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.beginWave(this.wave + 1);
      return;
    }

    this.updatePaddle(dt, input);
    this.updateTimers(dt);
    this.sinkPrisms(dt);
    this.updateOrbs(dt);
    this.updatePowerups(dt);
    if (this.prisms.length > 0 && this.prisms.every((prism) => prism.dead)) this.clearWave();
  }

  updatePaddle(dt, input) {
    const paddle = this.paddle;
    if (input.mouseX !== null) paddle.x = input.mouseX * VIEW_WIDTH;
    if (input.leftHeld) paddle.x -= PADDLE_KEY_SPEED * dt;
    if (input.rightHeld) paddle.x += PADDLE_KEY_SPEED * dt;
    const half = paddle.width / 2;
    paddle.x = Math.max(half, Math.min(VIEW_WIDTH - half, paddle.x));
    for (const orb of this.orbs) {
      if (orb.stuck) {
        orb.x = paddle.x;
        orb.y = paddle.y - orb.radius - 2;
      }
    }
  }

  updateTimers(dt) {
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.paddle.wideTimer > 0) {
      this.paddle.wideTimer -= dt;
      if (this.paddle.wideTimer <= 0) this.paddle.width = PADDLE_WIDTH;
    }
  }

  sinkPrisms(dt) {
    const sinkRate = 3.1 + this.wave * 0.55;
    for (const prism of this.prisms) {
      if (prism.dead) continue;
      prism.y += sinkRate * dt;
      if (prism.y + prism.height >= SHATTER_LINE_Y) this.prismBreaches(prism);
    }
  }

  prismBreaches(prism) {
    prism.dead = true;
    this.dangerFlash = 1;
    this.shake = 9;
    this.particles.burst(this.rng, prism.x + prism.width / 2, prism.y + prism.height / 2, COLORS.danger, 22, 300);
    this.loseShield('A prism crossed the line');
  }

  loseShield() {
    this.shields -= 1;
    this.sound.shieldLost();
    if (this.shields <= 0) {
      this.state = 'gameover';
      this.finishRun();
      this.sound.gameOver();
      return;
    }
    if (this.orbs.length === 0) this.orbs = [makeStuckOrb(this.paddle)];
  }

  finishRun() {
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
  }

  updateOrbs(dt) {
    const timeScale = this.slowTimer > 0 ? SLOW_FACTOR : 1;
    const step = dt * timeScale;
    const survivors = [];
    for (const orb of this.orbs) {
      if (orb.stuck) {
        survivors.push(orb);
        continue;
      }
      this.moveOrb(orb, step);
      if (orb.y - orb.radius > VIEW_HEIGHT + 24) continue; // fell past the bar: gone
      survivors.push(orb);
    }
    const hadOrb = this.orbs.length > 0;
    this.orbs = survivors;
    if (hadOrb && this.orbs.length === 0 && this.state === 'playing') {
      this.shake = 7;
      this.loseShield('The orb was lost');
    }
  }

  moveOrb(orb, dt) {
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    orb.trail.push({ x: orb.x, y: orb.y });
    if (orb.trail.length > 9) orb.trail.shift();

    if (orb.x < orb.radius) {
      orb.x = orb.radius;
      orb.vx = Math.abs(orb.vx);
      this.sound.wallBounce();
    } else if (orb.x > VIEW_WIDTH - orb.radius) {
      orb.x = VIEW_WIDTH - orb.radius;
      orb.vx = -Math.abs(orb.vx);
      this.sound.wallBounce();
    }
    if (orb.y < orb.radius) {
      orb.y = orb.radius;
      orb.vy = Math.abs(orb.vy);
      this.sound.wallBounce();
    }

    this.bounceOffPaddle(orb);
    this.hitPrisms(orb);
  }

  bounceOffPaddle(orb) {
    const paddle = this.paddle;
    if (orb.vy <= 0) return;
    const withinX = Math.abs(orb.x - paddle.x) <= paddle.width / 2 + orb.radius * 0.6;
    const atBar = orb.y + orb.radius >= paddle.y && orb.y - orb.radius <= paddle.y + paddle.height;
    if (!withinX || !atBar) return;
    const offset = Math.max(-1, Math.min(1, (orb.x - paddle.x) / (paddle.width / 2)));
    const speed = Math.hypot(orb.vx, orb.vy);
    const angle = offset * ORB_MAX_BOUNCE_ANGLE;
    orb.vx = Math.sin(angle) * speed;
    orb.vy = -Math.cos(angle) * speed;
    orb.y = paddle.y - orb.radius - 1;
    this.combo = 0;
    this.sound.paddleBounce();
    this.particles.sparkle(this.rng, orb.x, paddle.y, COLORS.paddle);
  }

  hitPrisms(orb) {
    for (const prism of this.prisms) {
      if (prism.dead) continue;
      const nearX = Math.max(prism.x, Math.min(orb.x, prism.x + prism.width));
      const nearY = Math.max(prism.y, Math.min(orb.y, prism.y + prism.height));
      const dx = orb.x - nearX;
      const dy = orb.y - nearY;
      if (dx * dx + dy * dy > orb.radius * orb.radius) continue;
      // Reflect along the shallower penetration axis, then damage the prism.
      if (Math.abs(dx) > Math.abs(dy)) orb.vx = dx > 0 ? Math.abs(orb.vx) : -Math.abs(orb.vx);
      else orb.vy = dy > 0 ? Math.abs(orb.vy) : -Math.abs(orb.vy);
      this.damagePrism(prism);
      return;
    }
  }

  damagePrism(prism) {
    prism.hp -= 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const centerX = prism.x + prism.width / 2;
    const centerY = prism.y + prism.height / 2;
    if (prism.hp > 0) {
      this.sound.prismCrack(prism.tier);
      this.particles.burst(this.rng, centerX, centerY, COLORS.prismTiers[prism.tier], 6, 170);
      this.addScore(10, centerX, centerY);
      return;
    }
    prism.dead = true;
    this.shattered += 1;
    this.sound.prismShatter(prism.tier);
    this.particles.burst(this.rng, centerX, centerY, COLORS.prismTiers[prism.tier], 16 + prism.tier * 5, 280);
    this.addScore(50 * (prism.tier + 1), centerX, centerY);
    if (this.rng() < POWERUP_CHANCE) {
      this.powerups.push(makePowerup(rollPowerupKind(this.rng), centerX, centerY));
    }
  }

  addScore(points, x, y) {
    const multiplier = 1 + Math.floor(this.combo / 8);
    const gained = points * multiplier;
    this.score += gained;
    if (multiplier > 1) {
      this.particles.addLabel(x, y - 14, `+${gained} x${multiplier}`, COLORS.accent);
    }
  }

  updatePowerups(dt) {
    const falling = [];
    for (const powerup of this.powerups) {
      powerup.y += POWERUP_FALL_SPEED * dt;
      powerup.spin += dt * 3;
      const caught =
        powerup.y + powerup.radius >= this.paddle.y &&
        powerup.y < this.paddle.y + 26 &&
        Math.abs(powerup.x - this.paddle.x) <= this.paddle.width / 2 + powerup.radius;
      if (caught) {
        this.applyPowerup(powerup);
        continue;
      }
      if (powerup.y - powerup.radius < VIEW_HEIGHT + 20) falling.push(powerup);
    }
    this.powerups = falling;
  }

  applyPowerup(powerup) {
    this.sound.powerupCaught();
    this.particles.sparkle(this.rng, powerup.x, this.paddle.y, COLORS.powerups[powerup.kind]);
    switch (powerup.kind) {
      case 'wide':
        this.paddle.width = PADDLE_WIDE_WIDTH;
        this.paddle.wideTimer = WIDE_SECONDS;
        break;
      case 'split': {
        const source = this.orbs.find((orb) => !orb.stuck) || this.orbs[0];
        if (source && this.orbs.length < 4) {
          const speed = this.orbSpeed();
          const extra = makeOrb(source.x, source.y, -source.vx, -Math.abs(source.vy));
          if (extra.stuck || Math.hypot(extra.vx, extra.vy) < 1) {
            extra.vx = speed * 0.45;
            extra.vy = -speed * 0.89;
            extra.stuck = false;
          }
          this.orbs.push(extra);
        }
        break;
      }
      case 'slow':
        this.slowTimer = SLOW_SECONDS;
        break;
      case 'shield':
        this.shields = Math.min(this.shields + 1, 5);
        break;
      default:
        break;
    }
  }

  clearWave() {
    this.score += WAVE_CLEAR_BONUS;
    this.particles.addLabel(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 60, `WAVE BONUS +${WAVE_CLEAR_BONUS}`, COLORS.shield);
    this.sound.waveCleared();
    if (this.wave >= FINAL_WAVE) {
      this.state = 'victory';
      this.finishRun();
      this.sound.victory();
      return;
    }
    this.state = 'waveclear';
    this.bannerTimer = 2.2;
  }

  beginWave(wave) {
    this.wave = wave;
    this.prisms = buildFormation(this.rng, wave);
    this.powerups = [];
    this.orbs = [makeStuckOrb(this.paddle)];
    this.state = 'playing';
  }
}
