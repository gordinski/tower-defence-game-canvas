class Sprite {
  constructor({
    position = { x: 0, y: 0 },
    imageSrc,
    frames = {},
    offset = { x: 0, y: 0 },
    context = c, // можна передавати свій контекст
  }) {
    this.position = { ...position };
    this.offset = { ...offset };
    this.context = context;

    // завантаження зображення
    this.image = new Image();
    this.image.src = imageSrc;
    this.loaded = false;
    this.image.onload = () => {
      this.loaded = true;
      this._frameWidth = this.image.width / this.frames.max;
      this._frameHeight = this.image.height;
    };

    // анімаційні кадри
    this.frames = {
      max: frames.max ?? 1,
      current: 0,
      elapsed: 0,
      hold: frames.hold ?? 3,
    };
  }

  // --- getters ---
  get cropWidth() {
    return this._frameWidth ?? this.image.width / this.frames.max;
  }

  get cropHeight() {
    return this._frameHeight ?? this.image.height;
  }

  get isLoaded() {
    return this.loaded;
  }

  // --- methods ---
  draw() {
    if (!this.loaded) return;

    const { x, y } = this.position;
    const { x: ox, y: oy } = this.offset;
    const { current } = this.frames;
    const w = this.cropWidth;
    const h = this.cropHeight;

    this.context.drawImage(
      this.image,
      current * w, 0,      // джерело в спрайті
      w, h,                // розмір кадру
      x + ox, y + oy,      // позиція на канвасі
      w, h                 // розмір відображення (можна змінити для масштабу)
    );
  }

  update() {
    if (this.frames.max <= 1) return;

    this.frames.elapsed++;
    if (this.frames.elapsed % this.frames.hold === 0) {
      this.frames.current = (this.frames.current + 1) % this.frames.max;
    }
  }
}
