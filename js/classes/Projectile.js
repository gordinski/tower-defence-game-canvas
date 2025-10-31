class Projectile extends Sprite {
  constructor({
    position = { x: 0, y: 0 },
    enemy,
    speed = 9,
    radius = 15,
    imageSrc = './img/projectile.png',
    context = c
  }) {
    super({ position, imageSrc, context });

    this.enemy = enemy;
    this.speed = speed;
    this.radius = radius;
    this.velocity = { x: 0, y: 0 };

    // Кешуємо початковий напрямок — якщо ціль раптом зникне
    if (enemy?.center) {
      this.velocity = this.#calculateVelocity();
    }
  }

  /**
   * Приватний метод для обчислення напрямку польоту до цілі
   */
  #calculateVelocity() {
    const target = this.enemy?.center;
    if (!target) return this.velocity; // залишає попередній напрямок

    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const angle = Math.atan2(dy, dx);

    return {
      x: Math.cos(angle) * this.speed,
      y: Math.sin(angle) * this.speed
    };
  }

  /**
   * Оновлює позицію та малює снаряд
   */
  update() {
    if (!this.isLoaded) return; // не малюємо, доки не завантажено зображення

    this.draw();

    // оновлюємо швидкість кожен кадр (ціль може рухатися)
    this.velocity = this.#calculateVelocity();

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
  }

  /**
   * Перевіряє зіткнення з поточним ворогом
   * (корисно винести з головного циклу)
   */
  collidesWithEnemy() {
    const enemy = this.enemy;
    if (!enemy?.center) return false;

    const dx = enemy.center.x - this.position.x;
    const dy = enemy.center.y - this.position.y;
    const distance = Math.hypot(dx, dy);

    return distance < this.radius + enemy.radius;
  }
}
