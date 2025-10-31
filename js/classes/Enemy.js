class Enemy extends Sprite {
  constructor({
    position = { x: 0, y: 0 },
    speed = 1,
    size = 100,
    health = 100,
    attackRadius = 120,
    imageSrc = './img/orc2.png',
    context = c,
  }) {
    super({
      position,
      imageSrc,
      frames: { max: 10 },
      context,
    });

    this.width = size;
    this.height = size;
    this.radius = size;

    this._waypointIndex = 0;

    this.maxHealth = health;
    this._health = health;
    this.attackRadius = attackRadius;
    this.bountyPaid = false;

    this.speed = speed;
    this.velocity = { x: 0, y: 0 };

    this.flipX = false;

    // 🔥 fade-out параметри
    this.isDying = false;
    this.alpha = 1; // прозорість [1..0]
    this.fadeSpeed = 0.03; // швидкість зникнення
  }

  get center() {
    return {
      x: this.position.x + this.width / 2,
      y: this.position.y + this.height / 2,
    };
  }

  get health() {
    return this._health;
  }

  set health(v) {
    this._health = Math.max(0, Math.min(this.maxHealth, v));
    if (this._health <= 0 && !this.isDying) this.startDeath();
  }

  get isDead() {
    return this._health <= 0 && this.alpha <= 0;
  }

  takeDamage(amount = 0) {
    this.health = this._health - amount;
  }

  startDeath() {
    this.isDying = true;
  }

  _setFlipByVector(dx, dy, EPS) {
    if (Math.abs(dx) > Math.abs(dy) + EPS) this.flipX = dx < 0;
  }

  _maybeFlipOnSegment(prev, next, EPS) {
    if (!prev || !next) return;
    const ndx = next.x - prev.x;
    const ndy = next.y - prev.y;
    this._setFlipByVector(ndx, ndy, EPS);
  }

  drawHealthBar() {
    if (this.isDying) return; // не малюємо під час зникнення

    const ctx = this.context;
    const barPadding = 2;
    const barHeight = 10;
    const barWidth = this.width;
    const x = this.position.x;
    const y = this.position.y - barHeight - 5;

    ctx.fillStyle = 'red';
    ctx.fillRect(x, y, barWidth, barHeight);

    const ratio = this._health / this.maxHealth;
    if (ratio > 0) {
      ctx.fillStyle = 'green';
      ctx.fillRect(
        x + barPadding,
        y + barPadding,
        (barWidth - barPadding * 2) * ratio,
        barHeight - barPadding * 2
      );
    }
  }

  draw() {
    if (!this.isLoaded) return;

    const ctx = this.context;
    const { x, y } = this.position;
    const { x: ox, y: oy } = this.offset;
    const { current } = this.frames;
    const sw = this.cropWidth;
    const sh = this.cropHeight;
    const dx = x + ox;
    const dy = y + oy;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.flipX) {
      ctx.translate(dx + sw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, current * sw, 0, sw, sh, 0, 0, sw, sh);
    } else {
      ctx.drawImage(this.image, current * sw, 0, sw, sh, dx, dy, sw, sh);
    }

    ctx.restore();

    this.drawHealthBar();
  }

  update(dt = 1) {
    super.update();
    this.draw();

    // 🔥 плавне зникнення після смерті
    if (this.isDying) {
      this.alpha = Math.max(0, this.alpha - this.fadeSpeed * dt);
      return; // не рухаємось
    }

    if (!Array.isArray(waypoints) || waypoints.length === 0) return;

    let remainingMove = this.speed * dt;
    const EPS = 0.1;

    while (remainingMove > 0 && this._waypointIndex < waypoints.length) {
      const wp = waypoints[this._waypointIndex];
      if (!wp) break;

      const { x: cx, y: cy } = this.center;
      const dx = wp.x - cx;
      const dy = wp.y - cy;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        if (this._waypointIndex < waypoints.length - 1) {
          const next = waypoints[this._waypointIndex + 1];
          this._maybeFlipOnSegment(wp, next, EPS);
          this._waypointIndex++;
          continue;
        } else break;
      }

      if (dist <= remainingMove) {
        this.position.x += dx;
        this.position.y += dy;
        remainingMove -= dist;

        if (this._waypointIndex < waypoints.length - 1) {
          const next = waypoints[this._waypointIndex + 1];
          this._maybeFlipOnSegment(wp, next, EPS);
          this._waypointIndex++;
          continue;
        } else break;
      }

      const inv = 1 / dist;
      this.velocity.x = dx * inv;
      this.velocity.y = dy * inv;

      this._setFlipByVector(this.velocity.x, this.velocity.y, EPS);

      this.position.x += this.velocity.x * remainingMove;
      this.position.y += this.velocity.y * remainingMove;
      remainingMove = 0;
    }
  }
}
