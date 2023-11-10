class Grid {
  constructor({ columns, rows, x, y }) {
    this.x = x;
    this.y = y;

    this.velocity = {
      x: 3,
      y: 0
    }

    this.invaders = []

    this.columns = columns;
    this.row = rows;

    this.width = this.columns * 30

    for (let i = 0; i < this.columns; i++) {
      for (let j = 0; j < rows; j++) {
        this.invaders.push(
          new Invader({
            position: {
              x: i * 30,
              y: j * 30
            }
          })
        )
      }
    }
  }

  update() {
    // this.position.x += this.velocity.x
    // this.position.y += this.velocity.y

    // this.velocity.y = 0

    // if (this.position.x + this.width >= canvas.width || this.position.x <= 0) {
    //   this.velocity.x = -this.velocity.x * 1.15
    //   this.velocity.y = 30
    // }
  }
}
