const scoreEl = document.querySelector('#scoreEl')
const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io();

canvas.width = 1024;
canvas.height = 576;

// let player = new Player()
let projectiles = []
let grids = []
let invaderProjectiles = []
let particles = []
let bombs = []
let powerUps = []

let keys = {
  a: {
    pressed: false
  },
  d: {
    pressed: false
  },
  space: {
    pressed: false
  }
}

let frames = 0
let randomInterval = Math.floor(Math.random() * 500 + 500)
let game = {
  over: false,
  active: true
}
let score = 0

let spawnBuffer = 500
let fps = 60
let fpsInterval = 1000 / fps
let msPrev = window.performance.now()

let frontend_players = {};
let frontend_grids = {};
let frontend_bombs = {};
let frontend_powerups = {};
let frontend_projectiles = {};
let frontend_invader_projectiles = {};
let frontend_particles = {};

function resetGameState() {
  frontend_players = {};
  frontend_grids = {};
  frontend_bombs = {};
  frontend_powerups = {};
  frontend_projectiles = {};
  frontend_invader_projectiles = {};
  frontend_particles = {};
}
let last_invader_kill;

socket.on('audio', (sound) => {
  switch (sound) {
    case 'bomb':
      audio.bomb.play()
      break;
    case 'enemyShoot':
      audio.enemyShoot.play()
      break;
    case 'explode':
      audio.explode.play()
      break;
  }
})

socket.on('updateScore', (score) => {
  document.querySelector('#scoreEl').innerHTML = score;
})

socket.on('updateStartTimer', (timer) => {
  document.querySelector("#startText").innerHTML = timer;
});

socket.on('updateRestartTimer', (timer) => {
  document.querySelector("#restart-text").innerHTML = timer;
});

socket.on('updatePlayers', (backend_players) => {
  for (const id in backend_players) {
    const backend_player = backend_players[id];
    if (!frontend_players[id]) { frontend_players[id] = new Player({ x: backend_player.position.x }); }

    else {
      if (id === socket.id) {
        // player already exists
        frontend_players[id].x = backend_player.position.x;
      } else {
        // for all other players and animate them to their new positions in case of lag
        gsap.to(frontend_players[id], {
          x: backend_player.position.x,
          rotation: backend_player.rotation,
          duration: 0.015,
          ease: 'linear',
        })
      }
    }
  }

  // delete frontend players
  for (const id in frontend_players) {
    if (!backend_players[id]) {
      delete frontend_players[id];
      audio.gameOver.play();
    }
  }
});

socket.on('updateGrids', (backend_grids) => {
  for (const id in backend_grids) {
    const backend_grid = backend_grids[id];

    if (!frontend_grids[id]) {
      frontend_grids[id] = new Grid({
        columns: backend_grid.columns,
        rows: backend_grid.rows,
        x: backend_grid.position.x,
        y: backend_grid.position.y,
      })

    } else {
      if (frontend_grids[id].invaders.length != backend_grid.invaders.length) {
        frontend_grids[id].invaders.splice(last_invader_kill, 1);
      }
      frontend_grids[id].x = backend_grid.position.x;
      frontend_grids[id].y = backend_grid.position.y;
    }

    // update invaders' position
    for (let i = frontend_grids[id].invaders.length - 1; i >= 0; i--) {
      frontend_grids[id].invaders[i].position.x = backend_grid.invaders[i].x;
      frontend_grids[id].invaders[i].position.y = backend_grid.invaders[i].y;
    }

    // delete frontend grids
    for (const id in frontend_grids) {
      if (!backend_grids[id]) {
        delete frontend_grids[id];
      }
    }
  }
})

socket.on('killInvader', ({ id, i }) => {
  frontend_grids[id].invaders.splice(i, 1);
})

socket.on('updateLastInvaderKill', (i) => {
  last_invader_kill = i;
})

socket.on('updateBombs', (backend_bombs) => {
  for (const id in backend_bombs) {
    const backend_bomb = backend_bombs[id];

    if (!frontend_bombs[id]) {
      frontend_bombs[id] = new Bomb({
        position: {
          x: backend_bomb.position.x,
          y: backend_bomb.position.y,
        },
        velocity: {
          x: backend_bomb.velocity.x,
          y: backend_bomb.velocity.y,
        }
      })
    }

    else {
      frontend_bombs[id].position.x = backend_bomb.position.x;
      frontend_bombs[id].position.y = backend_bomb.position.y;
    }

    // delete frontend bombs
    for (const id in frontend_bombs) {
      if (!backend_bombs[id]) {
        delete frontend_bombs[id];
      }
    }
  }
})

socket.on('explodeBomb', ({ id }) => {
  frontend_bombs[id].explode();
})

// POWERUP WAS SCRATCHED BECAUSE IT MADE THE GAME TOO EASY
// MIGHT IMPLEMENT FOR TUGAS UAS
// socket.on('updatePowerUps', (backend_powerups) => {
//   for (const id in backend_powerups) {
//     const backend_powerup = backend_powerups[id];

//     if (!frontend_powerups[id]) {
//       frontend_powerups[id] = new PowerUp({
//         position: {
//           x: backend_powerup.position.x,
//           y: backend_powerup.position.y,
//         },
//         velocity: {
//           x: backend_powerup.velocity.x,
//           y: backend_powerup.velocity.y,
//         }
//       })
//     }

//     else {
//       frontend_powerups[id].position.x = backend_powerup.position.x;
//       frontend_powerups[id].position.y = backend_powerup.position.y;
//     }
//   }
// })

socket.on('updateProjectiles', (backend_projectiles) => {
  for (const id in backend_projectiles) {
    const backend_projectile = backend_projectiles[id];

    if (!frontend_projectiles[id]) {
      audio.shoot.play()
      frontend_projectiles[id] = new Projectile({
        position: {
          x: backend_projectile.position.x,
          y: backend_projectile.position.y,
        },
        velocity: {
          x: backend_projectile.velocity.x,
          y: backend_projectile.velocity.y,
        },
        color: backend_projectile.color,
      })
    }

    else {
      frontend_projectiles[id].position.x = backend_projectile.position.x;
      frontend_projectiles[id].position.y = backend_projectile.position.y;
    }
  }
  // delete projectiles
  for (const id in frontend_projectiles) {
    if (!backend_projectiles[id]) {
      delete frontend_projectiles[id];
    }
  }
})

socket.on('updateInvaderProjectiles', (backend_invader_projectiles) => {
  for (const id in backend_invader_projectiles) {
    const backend_invader_projectile = backend_invader_projectiles[id];

    if (!frontend_invader_projectiles[id]) {
      audio.enemyShoot.play()
      frontend_invader_projectiles[id] = new InvaderProjectile({
        position: {
          x: backend_invader_projectile.position.x,
          y: backend_invader_projectile.position.y,
        },
        velocity: {
          x: backend_invader_projectile.velocity.x,
          y: backend_invader_projectile.velocity.y,
        },
      })
    }

    else {
      frontend_invader_projectiles[id].position.x = backend_invader_projectile.position.x;
      frontend_invader_projectiles[id].position.y = backend_invader_projectile.position.y;
    }
  }

  // delete invader projectiles
  for (const id in frontend_invader_projectiles) {
    if (!backend_invader_projectiles[id]) {
      delete frontend_invader_projectiles[id];
    }
  }
})

socket.on('updateParticles', (backend_particles) => {
  for (const id in backend_particles) {
    const backend_particle = backend_particles[id];

    if (!frontend_particles[id]) {
      frontend_particles[id] = new Particle({
        position: {
          x: backend_particle.position.x,
          y: backend_particle.position.y,
        },
        velocity: {
          x: backend_particle.velocity.x,
          y: backend_particle.velocity.y,
        },
        radius: backend_particle.radius,
        color: backend_particle.color,
      })
    }

    else {
      frontend_particles[id].position.x = backend_particle.position.x;
      frontend_particles[id].position.y = backend_particle.position.y;
      frontend_particles[id].opacity = backend_particle.opacity;
    }

    // delete particles
    for (const id in frontend_particles) {
      if (!backend_particles[id]) {
        delete frontend_particles[id];
      }
    }
  }
})

function init() {

  keys = {
    a: {
      pressed: false
    },
    d: {
      pressed: false
    },
    space: {
      pressed: false
    }
  }

  frames = 0
  randomInterval = Math.floor(Math.random() * 500 + 500)

}

function animate() {
  if (!game.active) return
  requestAnimationFrame(animate)

  const msNow = window.performance.now()
  const elapsed = msNow - msPrev

  if (elapsed < fpsInterval) return

  msPrev = msNow - (elapsed % fpsInterval) // 3.34

  c.fillStyle = 'black'
  c.fillRect(0, 0, canvas.width, canvas.height)

  // POWERUP WAS SCRATCHED BECAUSE IT MADE THE GAME TOO EASY
  // MIGHT IMPLEMENT FOR TUGAS UAS
  // for (const ID in frontend_powerups) {
  //   const FRONTEND_POWERUP = frontend_powerups[ID];
  //   FRONTEND_POWERUP.update();
  // }

  for (const ID in frontend_bombs) {
    const FRONTEND_BOMB = frontend_bombs[ID];
    FRONTEND_BOMB.update();
  }

  for (const ID in frontend_players) {
    const FRONTEND_PLAYER = frontend_players[ID];
    FRONTEND_PLAYER.update();
  }

  for (const ID in frontend_projectiles) {
    const FRONTEND_PROJECTILE = frontend_projectiles[ID];
    FRONTEND_PROJECTILE.update();
  }

  for (const ID in frontend_invader_projectiles) {
    const FRONTEND_INVADER_PROJECTILE = frontend_invader_projectiles[ID];
    FRONTEND_INVADER_PROJECTILE.update();
  }

  for (const ID in frontend_particles) {
    const FRONTEND_PARTICLE = frontend_particles[ID];
    FRONTEND_PARTICLE.update();
  }

  for (const ID in frontend_grids) {
    const FRONTEND_GRID = frontend_grids[ID]
    FRONTEND_GRID.update()
    for (let i = FRONTEND_GRID.invaders.length - 1; i >= 0; i--) {
      const invader = FRONTEND_GRID.invaders[i]
      invader.update()
    }
  }
  frames++
}

socket.on('startGame', ({ spectate }) => {
  audio.backgroundMusic.play()
  audio.start.play()

  document.querySelector('#startScreen').style.display = 'none'
  document.querySelector('#scoreContainer').style.display = 'block'
  init()
  animate()

  if (!spectate) {
    socket.emit("initGame");
    document.querySelector('#spectate-status').innerHTML = ''

  }

  if (spectate) {
    document.querySelector('#spectate-status').innerHTML = 'Spectating'
  }
})

socket.on('restartGame', ({ spectate }) => {
  audio.backgroundMusic.play()
  audio.start.play()

  document.querySelector('#restartScreen').style.display = 'none'
  init()
  animate()

  if (!spectate) {
    socket.emit("initGame");
  }

  if (spectate) {
    document.querySelector('#spectate-status').innerHTML = 'Spectating'
  }
})

socket.on('fixLatePlayerDisplay', () => {
  document.querySelector('#startScreen').style.display = 'none'
  document.querySelector('#scoreContainer').style.display = 'block'
  document.querySelector('#restartScreen').style.display = 'flex'
  document.querySelector('#finalScore').innerHTML = total_score
})

socket.on('endGame', (total_score) => {
  // stops game altogether
  setTimeout(() => {
    document.querySelector('#restartScreen').style.display = 'flex'
    document.querySelector('#finalScore').innerHTML = total_score
    resetGameState();
  }, 2000)
})

// handle frontend movement
const SPEED = 7;
const PLAYER_INPUTS = [];
let sequence_number = 0;

setInterval(() => {
  if (keys.a.pressed) {
    sequence_number++
    PLAYER_INPUTS.push({ sequence_number, dx: -SPEED, dy: 0 });
    frontend_players[socket.id].position.x -= SPEED;
    frontend_players[socket.id].rotation = -0.15;
    socket.emit('keydown', { key: 'a', sequence_number });
  }
  if (keys.space.pressed) {
    sequence_number++
    PLAYER_INPUTS.push({ sequence_number, dx: 0, dy: SPEED });
    frontend_players[socket.id].rotation = 0;
    socket.emit('keydown', { key: ' ', sequence_number });
  }
  if (keys.d.pressed) {
    sequence_number++
    PLAYER_INPUTS.push({ sequence_number, dx: SPEED, dy: 0 });
    frontend_players[socket.id].position.x += SPEED;
    frontend_players[socket.id].rotation = 0.15;
    socket.emit('keydown', { key: 'd', sequence_number });
  }
}, 15)

addEventListener('keydown', ({ key }) => {
  if (game.over) return

  switch (key) {
    case 'a':
      keys.a.pressed = true
      break
    case 'd':
      keys.d.pressed = true
      break
    case ' ':
      keys.space.pressed = true
      break
  }
})

addEventListener('keyup', ({ key }) => {
  switch (key) {
    case 'a':
      keys.a.pressed = false
      break
    case 'd':
      keys.d.pressed = false
      break
    case ' ':
      keys.space.pressed = false
      break
  }
})
