// ==============================
// Constants
// ==============================
const TILE_SIZE = 64;
const TILE_SHIFT = 6; // 2^6 = 64
const GRID_COLS = 20;
const GRID_ROWS = 12;
const CANVAS_W = 1280;
const CANVAS_H = 768;

const BUILDING_COST = 50;
const COIN_REWARD = 25;
const PROJECTILE_DAMAGE = 20;

const INITIAL = {
  HEARTS: 10,
  COINS: 100,
  ENEMY_COUNT: 3,
  ENEMY_SPEED: 4,
};

const WAVE = {
  ENEMY_INC: 2,
  SPEED_INC: 1,
};

const EXIT_THRESHOLD = 10;

// ==============================
// DOM / Canvas
// ==============================
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

// Однаразовий кліп скруглення
c.beginPath();
c.roundRect(0, 0, canvas.width, canvas.height, 8);
c.clip();

// Кеш посилань
const ui = {
  hearts: document.querySelector(".hearts"),
  coins: document.querySelector(".coins"),
  gameOverText: document.querySelector(".text-game-over"),
  gameOverFill: document.querySelector(".text-game-over-fill"),
  restartBtn: document.querySelector(".btn-restart"),
};

// Фон
const bgImage = new Image();
bgImage.src = "img/gameMap2.png";

// ==============================
// Helpers
// ==============================
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

function sliceTo2D(arr, cols) {
  const out = [];
  for (let i = 0; i < arr.length; i += cols) out.push(arr.slice(i, i + cols));
  return out;
}

function insertByY(arr, bld) {
  let lo = 0,
    hi = arr.length;
  const y = bld.position.y;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].position.y <= y) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, bld);
}

// ==============================
// Tiles init
// ==============================
const placementTilesData2D = sliceTo2D(placementTilesData, GRID_COLS);

const placementTiles = [];
for (let y = 0; y < placementTilesData2D.length; y++) {
  const row = placementTilesData2D[y];
  for (let x = 0; x < row.length; x++) {
    if (row[x] === 1) {
      placementTiles.push(new PlacementTile({ position: { x: x * TILE_SIZE, y: y * TILE_SIZE } }));
    }
  }
}

const tilesByIndex = new Map();

for (const t of placementTiles) {
  t.gx = (t.x / TILE_SIZE) | 0;
  t.gy = (t.y / TILE_SIZE) | 0;
  tilesByIndex.set(t.gy * GRID_COLS + t.gx, t);
}

// ==============================
// Game module
// ==============================
const Game = (() => {
  let enemies = [];
  let buildings = [];
  let explosions = [];
  let activeTile = undefined;
  let lastHoveredBuilding = undefined;

  let enemyCount = INITIAL.ENEMY_COUNT;
  let enemySpeed = INITIAL.ENEMY_SPEED;
  let hearts = INITIAL.HEARTS;
  let coins = INITIAL.COINS;

  let animationId = null;
  let running = false;

  // Остання точка шляху (вихід)
  const exitPoint = waypoints[waypoints.length - 1];

  // Миша в координатах канви
  const mouse = { x: undefined, y: undefined };

  // =========== UI ===========
  function setCoins(v) {
    coins = v;
    ui.coins.textContent = `🪙${coins}`;
  }

  function addCoins(delta) {
    setCoins(coins + delta);
  }

  function setHearts(v) {
    hearts = Math.max(0, v);
    ui.hearts.textContent = `❤️${hearts}`;
  }

  function addHearts(delta) {
    setHearts(hearts + delta);
  }

  function showGameOver() {
    ui.gameOverText.style.display = "flex";
    ui.gameOverFill.style.display = "flex";
    ui.restartBtn.style.display = "block";
  }

  function hideGameOver() {
    ui.gameOverText.style.display = "none";
    ui.gameOverFill.style.display = "none";
    ui.restartBtn.style.display = "none";
  }

  // =========== Spawning ===========
  function spawnEnemies(count, speed) {
    const SPASING = 150;
    const start = waypoints[0];
    const x = start.x;
    let y = start.y - SPASING;
    for (let i = 0; i < count; i++) {
      enemies.push(new Enemy({ position: { x, y }, speed }));
      y -= SPASING;
    }
  }

  // =========== Mouse ===========
  function positionMouseOnCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  // =========== Public API pieces used by handlers ===========
  function tryPlaceBuilding() {
    const t = activeTile;
    if (!t || t.isOccupied || coins < BUILDING_COST) return;

    addCoins(-BUILDING_COST);

    const b = new Building({ position: { x: t.x, y: t.y } });
    insertByY(buildings, b);

    t.isOccupied = true;
  }

  function handleMouseMove(event) {
    positionMouseOnCanvas(event);

    const mx = mouse.x;
    const my = mouse.y;

    // -------------------------------------
    // Активний тайл (через координати миші)
    // -------------------------------------
    const gx = (mx / TILE_SIZE) | 0;
    const gy = (my / TILE_SIZE) | 0;
    const idx = gy * GRID_COLS + gx;

    // Отримуємо тайл напряму
    const currActiveTile = tilesByIndex.get(idx);

    // Просто оновлюємо обидва — старий і новий
    // (PlacementTile сам вирішує, що малювати)
    if (activeTile && activeTile !== currActiveTile) {
      activeTile.isHovered = false;
    }
    if (currActiveTile) {
      currActiveTile.isHovered = true;
    }
    activeTile = currActiveTile;

    // Перевірка наведення на будівлі
    let hovered = undefined;

    // Якщо попередня все ще під курсором — пропускаємо цикл
    if (lastHoveredBuilding && isInsideBuilding(lastHoveredBuilding, mx, my)) {
      return;
    }

    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (isInsideBuilding(b, mx, my)) {
        hovered = b;
        break;
      }
    }

    if (hovered !== lastHoveredBuilding) {
      if (lastHoveredBuilding) lastHoveredBuilding.isHovered = false;
      if (hovered) hovered.isHovered = true;
      lastHoveredBuilding = hovered;
    }
  }

  // Утиліта для перевірки наведення
  function isInsideBuilding(b, mx, my) {
    return (
      mx >= b.position.x &&
      mx <= b.position.x + b.width &&
      my >= b.position.y &&
      my <= b.position.y + b.height
    );
  }

  function gameOver() {
    if (animationId !== null) cancelAnimationFrame(animationId);
    running = false;
    showGameOver();
  }

  function reset() {
    // масиви
    enemies.length = 0;
    buildings.length = 0;
    explosions.length = 0;

    // стани
    activeTile = undefined;
    enemyCount = INITIAL.ENEMY_COUNT;
    enemySpeed = INITIAL.ENEMY_SPEED;
    setHearts(INITIAL.HEARTS);
    setCoins(INITIAL.COINS);

    // звільнити тайли
    for (const t of placementTiles) {
      t.isOccupied = false;
      if ("color" in t) t.color = "rgba(255, 255, 255, .2)";
    }

    hideGameOver();
    spawnEnemies(enemyCount, enemySpeed);
  }

  // =========== Main loop ===========
  // Допоміжні: порівнюємо квадрати відстаней — без sqrt
  const EXIT_THRESHOLD2 = EXIT_THRESHOLD * EXIT_THRESHOLD;
  const sumR2 = (r1, r2) => (r1 + r2) * (r1 + r2);
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  // Видалити елемент масиву за O(1), порядок не важливий
  function swapPopRemove(arr, i) {
    arr[i] = arr[arr.length - 1];
    arr.pop();
  }

  function step() {
    animationId = requestAnimationFrame(step);

    // фон
    c.fillStyle = "black";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(bgImage, 0, 0);

    // ─────────────────────────────────────────────
    // 1) Оновлення ворогів + вихід/смерть (один прохід)
    // ─────────────────────────────────────────────
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.update();

      // якщо вже помирає — пропускаємо лише логіку виходу/видалення
      // (update анімації вже відбувся)
      if (!enemy.isDying) {
        // Перевірка «виходу» без sqrt
        if (dist2(enemy.center.x, enemy.center.y, exitPoint.x, exitPoint.y) < EXIT_THRESHOLD2) {
          addHearts(-1);
          swapPopRemove(enemies, i);
          if (hearts <= 0) {
            gameOver();
            return;
          }
          continue;
        }
      }

      // Прибрали «другий прохід»: якщо ворог помер — видаляємо тут же
      if (enemy.isDead) {
        swapPopRemove(enemies, i);
      }
    }

    // ─────────────────────────────────────────────
    // 2) Вибухи (один прохід + миттєве прибирання)
    // ─────────────────────────────────────────────
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.draw();
      e.update();
      if (e.frames.current >= e.frames.max - 1) {
        swapPopRemove(explosions, i);
      }
    }

    // ─────────────────────────────────────────────
    // 3) Наступна хвиля
    // ─────────────────────────────────────────────
    if (enemies.length === 0) {
      enemyCount += WAVE.ENEMY_INC;
      enemySpeed += WAVE.SPEED_INC;
      spawnEnemies(enemyCount, enemySpeed);
    }

    // ─────────────────────────────────────────────
    // 4) Ховер плиток (залишаємо як є)
    // ─────────────────────────────────────────────
    for (let i = 0, n = placementTiles.length; i < n; i++) {
      placementTiles[i].update(mouse);
    }

    // ─────────────────────────────────────────────
    // 5) Башні/цілі/снаряди
    //    - НЕ скидаємо target щокадру; утримуємо, доки в радіусі/живий
    //    - Переобираємо ціль лише коли потрібно
    // ─────────────────────────────────────────────
    for (let b = 0; b < buildings.length; b++) {
      const building = buildings[b];
      building.update();

      // зберігаємо попередню ціль, якщо вона ще валідна
      let target = building.target;
      const inRange = target &&
        !target.isDead &&
        dist2(target.center.x, target.center.y, building.center.x, building.center.y) <
        sumR2(target.radius, building.radius);

      if (!inRange) {
        // швидкий підбір нової цілі (перший у радіусі)
        target = null;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.isDead &&
            dist2(e.center.x, e.center.y, building.center.x, building.center.y) <
            sumR2(e.radius, building.radius)) {
            target = e;
            break;
          }
        }
        building.target = target;
      }

      // Снаряди
      for (let p = building.projectiles.length - 1; p >= 0; p--) {
        const projectile = building.projectiles[p];

        // якщо ворог вже мертвий — прибираємо снаряд
        if (!projectile.enemy || projectile.enemy.isDead) {
          swapPopRemove(building.projectiles, p);
          continue;
        }

        projectile.update();

        if (
          dist2(
            projectile.position.x, projectile.position.y,
            projectile.enemy.center.x, projectile.enemy.center.y
          ) < sumR2(projectile.radius, projectile.enemy.radius)
        ) {
          // влучання
          projectile.enemy.health -= PROJECTILE_DAMAGE;

          if (projectile.enemy.health <= 0) {
            // Одноразова виплата
            if (!projectile.enemy.bountyPaid) {
              projectile.enemy.bountyPaid = true;
              addCoins(COIN_REWARD);
            }
            // Запуск анімації смерті
            if (!projectile.enemy.isDying) {
              projectile.enemy.startDeath();
            }
          }

          // вибух
          explosions.push(
            new Sprite({
              position: { x: projectile.position.x, y: projectile.position.y },
              imageSrc: "./img/explosion.png",
              frames: { max: 9 },
              offset: { x: 0, y: 0 },
            })
          );

          swapPopRemove(building.projectiles, p);
        }
      }
    }
  }


  function start() {
    if (running) return; // не створювати другий RAF
    running = true;
    // Старт лише після завантаження фону, щоби не мигало
    if (bgImage.complete) {
      step();
    } else {
      bgImage.onload = step;
    }
  }

  // Публічний інтерфейс
  return {
    start,
    reset,
    onCanvasClick: tryPlaceBuilding,
    onMouseMove: handleMouseMove,
  };
})();

// ==============================
// Wire up events
// ==============================
canvas.addEventListener("click", Game.onCanvasClick);
window.addEventListener("mousemove", Game.onMouseMove);

ui.restartBtn.addEventListener("click", () => {
  Game.reset();
  Game.start();
});

// Перший запуск
Game.reset();
Game.start();
