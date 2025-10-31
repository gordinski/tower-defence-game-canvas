class PlacementTile {
  static SIZE = 64;
  static BASE_COLOR = 'rgba(255, 255, 255, 0.2)';
  static HOVER_COLOR = 'white';

  constructor({ position }) {
    this.x = position.x;
    this.y = position.y;
    this.isOccupied = false;
    this.isHovered = false;
  }

  draw() {
    c.fillStyle = this.isHovered
      ? PlacementTile.HOVER_COLOR
      : PlacementTile.BASE_COLOR;
    c.fillRect(this.x, this.y, PlacementTile.SIZE, PlacementTile.SIZE);
  }

  checkHover(mouse) {
    const mx = mouse.x, my = mouse.y;
    const x = this.x, y = this.y, s = PlacementTile.SIZE;

    this.isHovered =
      mx >= x && mx <= x + s &&
      my >= y && my <= y + s;
  }

  update(mouse) {
    this.checkHover(mouse);
    this.draw();
  }
}
