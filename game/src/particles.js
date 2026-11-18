// Particles and floating score text: the juice layer. Shattered prisms burst
// into coloured shards, catches sparkle, and every score pops up as a small
// rising label so the player always sees what an action was worth.

const MAX_PARTICLES = 420;

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.labels = [];
  }

  burst(rng, x, y, color, count, speed = 260) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const angle = rng() * Math.PI * 2;
      const velocity = (0.25 + rng() * 0.75) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 60,
        life: 0,
        maxLife: 0.45 + rng() * 0.5,
        size: 2 + rng() * 4,
        color,
        spin: (rng() - 0.5) * 12,
        rotation: rng() * Math.PI,
      });
    }
  }

  sparkle(rng, x, y, color) {
    this.burst(rng, x, y, color, 10, 130);
  }

  addLabel(x, y, text, color) {
    this.labels.push({ x, y, text, color, life: 0, maxLife: 0.9 });
  }

  update(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    for (const label of this.labels) {
      label.life += dt;
      label.y -= 44 * dt;
    }
    this.labels = this.labels.filter((label) => label.life < label.maxLife);
  }

  draw(ctx) {
    for (const p of this.particles) {
      const fade = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 17px system-ui, sans-serif';
    for (const label of this.labels) {
      const fade = 1 - label.life / label.maxLife;
      ctx.globalAlpha = Math.min(1, fade * 1.6);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, label.x, label.y);
    }
    ctx.restore();
  }
}
