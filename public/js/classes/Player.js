class Player {
  constructor({ x }) {
    this.rotation = 0;
    this.opacity = 1;
    this.x = x;

    const image = new Image();
    image.src = './img/spaceship.png';
    image.onload = () => {
      const scale = 0.15
      this.image = image
      this.width = image.width * scale // 67.5
      this.height = image.height * scale // 33.75
      this.position = {
        y: canvas.height - this.height - 20
      }
    };

    this.particles = [];
    this.frames = 0;
  }

  draw() {
    c.save()
    c.globalAlpha = this.opacity
    c.translate(
      this.x + this.width / 2,
      this.position.y + this.height / 2
    )
    c.rotate(this.rotation)

    c.translate(
      -this.x - this.width / 2,
      -this.position.y - this.height / 2
    )

    c.drawImage(
      this.image,
      this.x,
      this.position.y,
      this.width,
      this.height
    )
    c.restore()
  }

  update() {
    if (!this.image) return

    this.draw()

    if (this.opacity !== 1) return

    this.frames++
    if (this.frames % 2 === 0) {
      this.particles.push(
        new Particle({
          position: {
            x: this.x + this.width / 2,
            y: this.position.y + this.height
          },
          velocity: {
            x: (Math.random() - 0.5) * 1.5,
            y: 1.4
          },
          radius: Math.random() * 2,
          color: 'white',
          fades: true
        })
      )
    }
  }
}
