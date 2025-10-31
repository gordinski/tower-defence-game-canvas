class Building extends Sprite {
  /**
   * @param {{ position: {x:number,y:number} }} param0
   */
  constructor({ position = { x: 0, y: 0 } }) {
    super({
      position,
      imageSrc: './img/tower.png',
      frames: { max: 19 },
      offset: { x: 0, y: -80 }
    });

    // Розміри спрайта/хіта
    this.width = 64 * 2;
    this.height = 64;

    // Діапазон атаки (у пікселях)
    this.radius = 250;

    // Мішень і снаряди
    this.target = null;
    this.projectiles = [];

    // Внутрішній стан
    this._isHovered = false;

    // Музл/точка вильоту відносно центру (підігнай під свій спрайт)
    this.MUZZLE_OFFSET = { x: -20, y: -110 };
  }

  /** Обчислюємо центр щоапдейт */
  _recalcCenter() {
    this.center = {
      x: this.position.x + this.width / 2,
      y: this.position.y + this.height / 2
    };
  }

  /** Показувати коло радіуса лише коли наводять мишу */
  setHovered(isHovered) {
    this._isHovered = !!isHovered;
  }

  /** Змінити/скинути ціль */
  setTarget(enemy) {
    this.target = enemy || null;
  }

  /** Малюємо саму вежу + (за потреби) її радіус */
  draw() {
    super.draw();

    if (!this._isHovered) return;

    // лише обводка, без заливки
    c.beginPath();
    c.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    c.lineWidth = 2;
    c.stroke();
  }

  update() {
    // завжди тримаємо центр у синхроні з position
    this._recalcCenter();

    this.draw();

    // чіткіша умова анімації: якщо є ціль — анімуємо; якщо нема — анімуємо лише коли не на першому кадрі
    if ((this.target) || (!this.target && this.frames.current !== 0)) {
      super.update();
    }

    // постріл на потрібному кадрі анімації, раз на "hold"
    if (
      this.target &&
      this.frames.current === 6 &&
      this.frames.elapsed % this.frames.hold === 0
    ) {
      this.shoot();
    }
  }

  shoot() {
    const muzzleX = this.center.x + this.MUZZLE_OFFSET.x;
    const muzzleY = this.center.y + this.MUZZLE_OFFSET.y;

    this.projectiles.push(
      new Projectile({
        position: { x: muzzleX, y: muzzleY },
        enemy: this.target
      })
    );
  }
}
