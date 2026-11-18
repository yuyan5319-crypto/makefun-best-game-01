// Prismfall's renderer: everything the player sees, drawn on one canvas.
// A starfield and nebula wash behind neon prisms, a glowing light bar, orbs
// with trails, the HUD across the top, and the title, pause, wave-clear,
// victory and game-over screens. It reads the world and never changes it.

import {
  COLORS,
  FINAL_WAVE,
  SHATTER_LINE_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { POWERUP_GLYPHS } from './entities.js';
import { makeRng } from './random.js';

export class Renderer {
  constructor() {
    const rng = makeRng(20261);
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: rng() * VIEW_WIDTH,
        y: rng() * VIEW_HEIGHT,
        size: 0.7 + rng() * 1.7,
        phase: rng() * Math.PI * 2,
      });
    }
  }

  draw(ctx, world) {
    ctx.save();
    if (world.shake > 0) {
      const t = world.time * 91;
      ctx.translate(Math.sin(t * 1.3) * world.shake * 0.5, Math.cos(t * 1.7) * world.shake * 0.5);
    }
    this.drawBackground(ctx, world);
    this.drawShatterLine(ctx, world);
    this.drawPrisms(ctx, world);
    this.drawPowerups(ctx, world);
    this.drawPaddle(ctx, world);
    this.drawOrbs(ctx, world);
    world.particles.draw(ctx);
    this.drawHud(ctx, world);
    ctx.restore();

    if (world.dangerFlash > 0) {
      ctx.fillStyle = `rgba(255, 60, 90, ${world.dangerFlash * 0.16})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
    switch (world.state) {
      case 'title':
        this.drawTitle(ctx, world);
        break;
      case 'paused':
        this.drawCentredPanel(ctx, world, 'PAUSED', ['Press P to keep playing']);
        break;
      case 'waveclear':
        this.drawWaveClear(ctx, world);
        break;
      case 'victory':
        this.drawEndScreen(ctx, world, true);
        break;
      case 'gameover':
        this.drawEndScreen(ctx, world, false);
        break;
      default:
        break;
    }
  }

  drawBackground(ctx, world) {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, COLORS.backgroundTop);
    gradient.addColorStop(1, COLORS.backgroundBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(-20, -20, VIEW_WIDTH + 40, VIEW_HEIGHT + 40);
    const glow = ctx.createRadialGradient(VIEW_WIDTH / 2, 120, 40, VIEW_WIDTH / 2, 120, 520);
    glow.addColorStop(0, 'rgba(90, 70, 200, 0.20)');
    glow.addColorStop(1, 'rgba(90, 70, 200, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    for (const star of this.stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(world.time * 0.7 + star.phase));
      ctx.globalAlpha = twinkle * 0.8;
      ctx.fillStyle = COLORS.star;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  drawShatterLine(ctx, world) {
    const nearest = world.prisms
      .filter((prism) => !prism.dead)
      .reduce((min, prism) => Math.min(min, SHATTER_LINE_Y - (prism.y + prism.height)), Infinity);
    const urgent = nearest < 90;
    ctx.save();
    ctx.strokeStyle = urgent ? COLORS.danger : 'rgba(255, 93, 122, 0.35)';
    ctx.globalAlpha = urgent ? 0.55 + 0.35 * Math.sin(world.time * 6) : 0.6;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, SHATTER_LINE_Y);
    ctx.lineTo(VIEW_WIDTH - 12, SHATTER_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = urgent ? COLORS.danger : 'rgba(255, 93, 122, 0.55)';
    ctx.fillText('SHATTER LINE', VIEW_WIDTH - 16, SHATTER_LINE_Y + 16);
    ctx.restore();
  }

  drawPrisms(ctx, world) {
    for (const prism of world.prisms) {
      if (prism.dead) continue;
      const color = COLORS.prismTiers[prism.tier];
      const { x, y, width, height } = prism;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 13;
      const fill = ctx.createLinearGradient(x, y, x, y + height);
      fill.addColorStop(0, color);
      fill.addColorStop(1, 'rgba(10, 10, 30, 0.55)');
      ctx.fillStyle = fill;
      this.roundRect(ctx, x, y, width, height, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1.4;
      this.roundRect(ctx, x + 1, y + 1, width - 2, height - 2, 6);
      ctx.stroke();
      // A bright core that dims as the prism takes damage.
      const coreAlpha = 0.25 + 0.55 * (prism.hp / prism.maxHp);
      ctx.fillStyle = `rgba(255,255,255,${coreAlpha})`;
      this.roundRect(ctx, x + width * 0.3, y + height * 0.28, width * 0.4, height * 0.44, 4);
      ctx.fill();
      if (prism.hp < prism.maxHp) this.drawCracks(ctx, prism);
      ctx.restore();
    }
  }

  drawCracks(ctx, prism) {
    const { x, y, width, height } = prism;
    ctx.save();
    ctx.strokeStyle = 'rgba(5, 5, 20, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + 3);
    ctx.lineTo(x + width * 0.42, y + height * 0.5);
    ctx.lineTo(x + width * 0.34, y + height - 3);
    if (prism.maxHp - prism.hp > 1) {
      ctx.moveTo(x + width * 0.78, y + 3);
      ctx.lineTo(x + width * 0.6, y + height * 0.55);
      ctx.lineTo(x + width * 0.72, y + height - 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawPowerups(ctx, world) {
    for (const powerup of world.powerups) {
      const color = COLORS.powerups[powerup.kind];
      ctx.save();
      ctx.translate(powerup.x, powerup.y);
      ctx.rotate(Math.sin(powerup.spin) * 0.25);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(8, 8, 26, 0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWERUP_GLYPHS[powerup.kind], 0, 1);
      ctx.restore();
    }
  }

  drawPaddle(ctx, world) {
    const paddle = world.paddle;
    const x = paddle.x - paddle.width / 2;
    ctx.save();
    ctx.shadowColor = COLORS.paddle;
    ctx.shadowBlur = 18;
    const fill = ctx.createLinearGradient(x, paddle.y, x, paddle.y + paddle.height);
    fill.addColorStop(0, COLORS.paddleCore);
    fill.addColorStop(0.45, COLORS.paddle);
    fill.addColorStop(1, '#1d7f96');
    ctx.fillStyle = fill;
    this.roundRect(ctx, x, paddle.y, paddle.width, paddle.height, 7);
    ctx.fill();
    ctx.restore();
  }

  drawOrbs(ctx, world) {
    for (const orb of world.orbs) {
      for (let i = 0; i < orb.trail.length; i++) {
        const point = orb.trail[i];
        const fade = (i + 1) / orb.trail.length;
        ctx.save();
        ctx.globalAlpha = fade * 0.22;
        ctx.fillStyle = COLORS.orbGlow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, orb.radius * fade, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.shadowColor = COLORS.orbGlow;
      ctx.shadowBlur = 20;
      ctx.fillStyle = COLORS.orb;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawHud(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 5, 22, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, 58);
    ctx.fillStyle = COLORS.text;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillText(`SCORE ${world.score}`, 22, 37);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(`WAVE ${world.wave} / ${FINAL_WAVE}`, VIEW_WIDTH / 2, 37);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, VIEW_WIDTH - 22, 37);
    // Shields as small diamonds under the score.
    for (let i = 0; i < world.shields; i++) {
      const cx = 30 + i * 24;
      const cy = 50;
      ctx.save();
      ctx.translate(cx, cy - 0); // cy is the HUD strip's lower edge area
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.shield;
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    }
    if (world.combo >= 4) {
      const multiplier = 1 + Math.floor(world.combo / 8);
      ctx.textAlign = 'center';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillStyle = COLORS.accent;
      ctx.fillText(`COMBO ${world.combo}  x${multiplier}`, VIEW_WIDTH / 2, 80);
    }
    if (world.slowTimer > 0) {
      ctx.textAlign = 'left';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = '#8ea2ff';
      ctx.fillText('SLOW TIME', 22, 80);
    }
    ctx.restore();
  }

  drawTitle(ctx, world) {
    this.dim(ctx, 0.45);
    ctx.save();
    ctx.textAlign = 'center';
    const titleGradient = ctx.createLinearGradient(0, 130, 0, 215);
    titleGradient.addColorStop(0, '#a5fbff');
    titleGradient.addColorStop(0.5, '#57f7ff');
    titleGradient.addColorStop(1, '#b78bff');
    ctx.font = '900 84px system-ui, sans-serif';
    ctx.shadowColor = '#57f7ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = titleGradient;
    ctx.fillText('PRISMFALL', VIEW_WIDTH / 2, 208);
    ctx.shadowBlur = 0;
    ctx.font = '500 19px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('Bounce the light. Shatter the prisms before they cross the line.', VIEW_WIDTH / 2, 252);
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Move: mouse or arrow keys    Launch: Space or click', VIEW_WIDTH / 2, 316);
    ctx.fillText('Catch falling glyphs:  W wide bar · S split orb · T slow time · + shield', VIEW_WIDTH / 2, 344);
    ctx.fillText(`Clear ${FINAL_WAVE} waves to bring back the dawn.`, VIEW_WIDTH / 2, 372);
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillStyle = COLORS.orb;
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS ENTER OR CLICK TO PLAY', VIEW_WIDTH / 2, 448);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(`BEST SCORE ${world.best}`, VIEW_WIDTH / 2, 486);
    }
    ctx.restore();
  }

  drawWaveClear(ctx, world) {
    this.dim(ctx, 0.3);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillStyle = COLORS.shield;
    ctx.shadowColor = COLORS.shield;
    ctx.shadowBlur = 22;
    ctx.fillText(`WAVE ${world.wave} CLEARED`, VIEW_WIDTH / 2, 268);
    ctx.shadowBlur = 0;
    ctx.font = '500 18px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`Wave ${world.wave + 1} is sinking in…`, VIEW_WIDTH / 2, 308);
    ctx.restore();
  }

  drawEndScreen(ctx, world, won) {
    this.dim(ctx, 0.62);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 56px system-ui, sans-serif';
    ctx.fillStyle = won ? COLORS.shield : COLORS.danger;
    ctx.shadowColor = won ? COLORS.shield : COLORS.danger;
    ctx.shadowBlur = 26;
    ctx.fillText(won ? 'DAWN RESTORED' : 'THE LIGHT WENT OUT', VIEW_WIDTH / 2, 190);
    ctx.shadowBlur = 0;
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`SCORE ${world.score}`, VIEW_WIDTH / 2, 262);
    ctx.font = '400 17px system-ui, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    const lines = [
      `Best score ${Math.max(world.best, world.score)}`,
      `Reached wave ${world.wave} of ${FINAL_WAVE} · Prisms shattered ${world.shattered}`,
      `Longest combo ${world.bestCombo}`,
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, 302 + i * 28));
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillStyle = COLORS.orb;
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS ENTER TO PLAY AGAIN', VIEW_WIDTH / 2, 428);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawCentredPanel(ctx, world, heading, lines) {
    this.dim(ctx, 0.5);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 42px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(heading, VIEW_WIDTH / 2, 280);
    ctx.font = '400 17px system-ui, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, 322 + i * 26));
    ctx.restore();
  }

  dim(ctx, alpha) {
    ctx.fillStyle = `rgba(4, 4, 18, ${alpha})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}
