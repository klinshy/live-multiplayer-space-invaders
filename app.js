const { log } = require('console');
const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = 3000;

app.use(express.static('public'));

let start_game = false;
let player_count = 0;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/play', (req, res) => {
    res.sendFile(__dirname + '/game.html');
});

let connected_users = 0;
let timer;

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 576;

// game states
let backend_players = {};
let backend_projectiles = {};
const SPEED = 7;

let backend_grids = {};
let backend_bombs = {};
let backend_powerups = {};
let backend_invader_projectiles = {};
let backend_particles = {};

let total_score = 0;

let projectile_id = -1;

let particles_id = -1;

let frames = 0
let grids_id = -1;

let bombs_id = -1;
let bomb_count = 0;

let powerups_id = -1;

let invader_projectiles_id = -1;

let randomInterval = Math.floor(Math.random() * 500 + 500)

function resetGameState() {
    player_count = 0;

    backend_players = {};
    backend_projectiles = {};

    backend_grids = {};
    backend_bombs = {};
    backend_powerups = {};
    backend_invader_projectiles = {};
    backend_particles = {};

    total_score = 0;

    projectile_id = -1;

    particles_id = -1;

    frames = 0
    grids_id = -1;

    bombs_id = -1;
    bomb_count = 0;

    powerups_id = -1;

    invader_projectiles_id = -1;

    randomInterval = Math.floor(Math.random() * 500 + 500)

    // stars
    for (let i = 0; i < 100; i++) {
        particles_id++;
        backend_particles[particles_id] = {
            position: {
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
            },
            velocity: {
                x: 0,
                y: 0.3,
            },
            radius: Math.random() * 2,
            color: 'white',
        }
    }
}

// stars
for (let i = 0; i < 100; i++) {
    particles_id++;
    backend_particles[particles_id] = {
        position: {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
        },
        velocity: {
            x: 0,
            y: 0.3,
        },
        radius: Math.random() * 2,
        color: 'white',
    }
}

let start_timer_running = false;

function startTimer() {
    start_timer_running = true;
    const INTERVAL = setInterval(() => {
        if (timer > 0) {
            timer--;
            io.emit('updateStartTimer', timer);
        };
        if (timer === 0) {
            // Stop the timer and start the game
            clearInterval(INTERVAL);
            io.emit('startGame', { spectate: false });
            start_timer_running = false;
            start_game = true;
        };
    }, 1000);
}

function restartTimer() {
    const INTERVAL = setInterval(() => {
        if (timer > 0) {
            timer--;
            io.emit('updateRestartTimer', timer);
        };
        if (timer === 0) {
            // Stop the timer and start the game
            clearInterval(INTERVAL);
            io.emit('restartGame', { spectate: false });
            start_game = true;
        };
    }, 1000);
}

io.on('connection', (socket) => {
    console.log('a user has connected');
    connected_users++;

    // Start a timer if there is only one user connected
    if (connected_users == 1) {
        timer = 10;
        startTimer();
    } else {
        if (timer === 0) {
            // if the user is late
            socket.emit('startGame', ({ spectate: true }));
        } else {
            // if the user is in time
            if (!start_timer_running) {
                socket.emit('fixLatePlayerDisplay')
            }
        };
    }

    socket.on('initGame', () => {
        player_count += 1;
        backend_players[socket.id] = {
            username: 'Player',
            position: {
                x: 500 * Math.random(),
                y: 522.25,
            },
            rotation: 0,
            sequence_number: 0,
            width: 67.5,
            height: 33.75,
        };
    })

    socket.on('keydown', ({ key, sequence_number }) => {
        if (!backend_players[socket.id]) return;
        backend_players[socket.id].sequence_number = sequence_number;
        switch (key) {
            case 'a':
                backend_players[socket.id].position.x -= SPEED;
                backend_players[socket.id].rotation = -0.15;
                break;
            case 'd':
                backend_players[socket.id].position.x += SPEED;
                backend_players[socket.id].rotation = 0.15;
                break;
            case ' ':
                if (frames % 15 === 0) {
                    projectile_id++;
                    backend_players[socket.id].rotation = 0;
                    backend_projectiles[projectile_id] = {
                        position: {
                            x: backend_players[socket.id].position.x + 67.5 / 2,
                            y: backend_players[socket.id].position.y,
                        },
                        velocity: {
                            x: 0,
                            y: -10,
                        },
                        color: 'red',
                    }
                }
        }
    })

    socket.on('disconnect', (reason) => {
        console.log(reason);
        connected_users--;

        if (backend_players[socket.id]) {
            delete backend_players[socket.id];
            player_count--;
        }
    });
});

function randomBetween(min, max) {
    return Math.random() * (max - min) + min
}

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.position.y + rectangle1.height >= rectangle2.position.y &&
        rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
        rectangle1.position.x <= rectangle2.position.x + rectangle2.width
    )
}

function createParticles({ object, color, fades }, amount) {
    for (let i = 0; i < amount; i++) {
        particles_id++;
        backend_particles[particles_id] = {
            position: {
                x: object.position.x + object.width / 2,
                y: object.position.y + object.height / 2
            },
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            },
            radius: Math.random() * 3,
            color: color || '#BAA0DE',
            opacity: 1,
            fades: fades,
        }
    }
}

// fix invader display bug
function updateLastInvaderKill(i) {
    io.emit('updateLastInvaderKill', i);
}

// backend ticker
setInterval(() => {
    if (start_game) {
        // create new grid
        if (frames % randomInterval === 0) {
            grids_id++;
            const columns = Math.floor(Math.random() * 10 + 5);

            backend_grids[grids_id] = {
                columns: columns,
                rows: Math.floor(Math.random() * 5 + 2),
                position: {
                    x: 0,
                    y: 0,
                },
                velocity: {
                    x: 3,
                    y: 0,
                },
                width: columns * 30,
                invaders: [],
            };

            for (let i = 0; i < backend_grids[grids_id].columns; i++) {
                for (let j = 0; j < backend_grids[grids_id].rows; j++) {
                    backend_grids[grids_id].invaders.push({
                        x: i * 30,
                        y: j * 30,
                    });
                }
            }
        }

        // update grid and invaders position
        for (const grid in backend_grids) {
            backend_grids[grid].position.x += backend_grids[grid].velocity.x
            backend_grids[grid].position.y += backend_grids[grid].velocity.y

            backend_grids[grid].velocity.y = 0

            if (backend_grids[grid].position.x + backend_grids[grid].width >= CANVAS_WIDTH || backend_grids[grid].position.x <= 0) {
                backend_grids[grid].velocity.x = -backend_grids[grid].velocity.x * 1.15
                backend_grids[grid].velocity.y = 30
            }

            for (let i = backend_grids[grid].invaders.length - 1; i >= 0; i--) {
                backend_grids[grid].invaders[i].x += backend_grids[grid].velocity.x;
                backend_grids[grid].invaders[i].y += backend_grids[grid].velocity.y;
            }

            // spawn invader projectiles
            if (frames % 100 === 0 && backend_grids[grid].invaders.length > 0) {
                invader_projectiles_id++;
                let temp_index = Math.floor(Math.random() * backend_grids[grid].invaders.length);
                backend_invader_projectiles[invader_projectiles_id] = {
                    position: {
                        x: backend_grids[grid].invaders[temp_index].x + (31 / 2),
                        y: backend_grids[grid].invaders[temp_index].y,
                    },
                    velocity: {
                        x: 0,
                        y: 5,
                    },
                    width: 3,
                    height: 10,
                }
            }

            if (backend_grids[grid].position.y >= CANVAS_HEIGHT) {
                delete backend_grids[grid];
                player_count = 0;
                if (player_count <= 0) {
                    io.emit('endGame', total_score);
                    setTimeout(() => {
                        start_game = false;
                        timer = 10;
                        restartTimer();
                        resetGameState();
                    }, 2000);
                }
                continue;
            }
        }

        // update invader projectiles
        for (const invader_projectile in backend_invader_projectiles) {
            backend_invader_projectiles[invader_projectile].position.x += backend_invader_projectiles[invader_projectile].velocity.x;
            backend_invader_projectiles[invader_projectile].position.y += backend_invader_projectiles[invader_projectile].velocity.y;

            let hit = false;

            // projectile hits player
            for (player in backend_players) {
                if (hit) break;
                if (rectangularCollision({
                    rectangle1: backend_invader_projectiles[invader_projectile],
                    rectangle2: backend_players[player],
                })) {
                    hit = true;
                    createParticles({
                        object: backend_players[player],
                        color: 'white',
                        fades: true,
                    }, 10);
                    backend_players[player].position.x = CANVAS_WIDTH / 2;
                    backend_players[player].position.y = CANVAS_HEIGHT - 100;
                    backend_players[player].rotation = 0;
                    delete backend_players[player];
                    player_count--;
                    if (player_count <= 0) {
                        io.emit('endGame', total_score);
                        setTimeout(() => {
                            start_game = false;
                            timer = 10;
                            restartTimer();
                            resetGameState();
                        }, 2000);
                    }
                }
            }

            if (backend_invader_projectiles[invader_projectile].position.y >= CANVAS_HEIGHT + 5 || hit) {
                delete backend_invader_projectiles[invader_projectile];
                continue;
            }
        }

        // create new bomb
        if (frames % 200 === 0 && bomb_count < 3) {
            bombs_id++;
            bomb_count++;
            backend_bombs[bombs_id] = {
                position: {
                    x: randomBetween(30, CANVAS_WIDTH - 30),
                    y: randomBetween(30, CANVAS_HEIGHT - 30),
                },
                velocity: {
                    x: (Math.random() - 0.5) * 6,
                    y: (Math.random() - 0.5) * 6,
                },
                active: false,
                radius: 30,
            }
        }

        // update bombs position
        for (const bomb in backend_bombs) {
            backend_bombs[bomb].position.x += backend_bombs[bomb].velocity.x
            backend_bombs[bomb].position.y += backend_bombs[bomb].velocity.y

            if (backend_bombs[bomb].position.x + 30 + backend_bombs[bomb].velocity.x >= CANVAS_WIDTH || backend_bombs[bomb].position.x - 30 + backend_bombs[bomb].velocity.x <= 0) {
                backend_bombs[bomb].velocity.x = -backend_bombs[bomb].velocity.x

            } else if (backend_bombs[bomb].position.y + 30 + backend_bombs[bomb].velocity.y >= CANVAS_HEIGHT || backend_bombs[bomb].position.y - 30 + backend_bombs[bomb].velocity.y <= 0) {
                backend_bombs[bomb].velocity.y = -backend_bombs[bomb].velocity.y
            }
        }

        // POWERUP WAS SCRATCHED BECAUSE IT MADE THE GAME TOO EASY
        // MIGHT IMPLEMENT FOR TUGAS UAS
        // create new powerup
        // if (frames % 500 === 0) {
        //     powerups_id++;
        //     backend_powerups[powerups_id] = {
        //         position: {
        //             x: 0,
        //             y: Math.random() * 300 + 15,
        //         },
        //         velocity: {
        //             x: 5,
        //             y: 0,
        //         }
        //     }
        // }

        // // update powerups position
        // for (const powerup in backend_powerups) {
        //     backend_powerups[powerup].position.x += backend_powerups[powerup].velocity.x
        //     backend_powerups[powerup].position.y += backend_powerups[powerup].velocity.y
        // }

        // update projectiles
        for (const projectile in backend_projectiles) {
            let hit = false;
            backend_projectiles[projectile].position.x += backend_projectiles[projectile].velocity.x;
            backend_projectiles[projectile].position.y += backend_projectiles[projectile].velocity.y;

            // projectile hits enemy
            for (const grid in backend_grids) {
                if (hit) break;
                for (let i = backend_grids[grid].invaders.length - 1; i >= 0; i--) {
                    if (hit) break;

                    if (
                        backend_projectiles[projectile].position.y - 4 <= backend_grids[grid].invaders[i].y + 39 &&
                        backend_projectiles[projectile].position.x + 4 >= backend_grids[grid].invaders[i].x &&
                        backend_projectiles[projectile].position.x - 4 <= backend_grids[grid].invaders[i].x + 31 &&
                        backend_projectiles[projectile].position.y + 4 >= backend_grids[grid].invaders[i].y
                    ) {
                        hit = true;
                        total_score += 100;
                        createParticles({
                            object: {
                                position: {
                                    x: backend_grids[grid].invaders[i].x,
                                    y: backend_grids[grid].invaders[i].y,
                                },
                                width: 4,
                                height: 4,
                            },
                            fades: true,
                        }, 15)
                        io.emit('audio', 'explode');
                        backend_grids[grid].invaders.splice(i, 1);
                        updateLastInvaderKill(i);
                        io.emit('killInvader', { id: grid, i: i });

                        if (backend_grids[grid].invaders.length > 0) {
                            const FIRST_INVADER = backend_grids[grid].invaders[0];
                            const LAST_INVADER = backend_grids[grid].invaders[backend_grids[grid].invaders.length - 1];

                            backend_grids[grid].width = LAST_INVADER.x - FIRST_INVADER.x + 30;
                            backend_grids[grid].position.x = FIRST_INVADER.x;
                        } else {
                            delete backend_grids[grid];
                        }
                    }
                }
            }

            // projectile hits a bomb
            for (const bomb in backend_bombs) {
                if (hit) break;

                if (
                    Math.hypot(
                        backend_projectiles[projectile].position.x - backend_bombs[bomb].position.x,
                        backend_projectiles[projectile].position.y - backend_bombs[bomb].position.y,
                    ) < 4 + 30 && !backend_bombs[bomb].active
                ) {
                    hit = true;
                    io.emit('audio', 'bomb');
                    io.emit('explodeBomb', { id: bomb })
                    bomb_count -= 1;

                    backend_bombs[bomb].active = true;
                    backend_bombs[bomb].radius = 200;
                    backend_bombs[bomb].velocity.x = 0;
                    backend_bombs[bomb].velocity.y = 0;

                    // remove invader if bomb touches invader
                    for (const grid in backend_grids) {
                        for (let i = backend_grids[grid].invaders.length - 1; i >= 0; i--) {
                            if (Math.hypot(
                                backend_grids[grid].invaders[i].x - backend_bombs[bomb].position.x,
                                backend_grids[grid].invaders[i].y - backend_bombs[bomb].position.y
                            ) < 15 + 150) {
                                total_score += 50;
                                createParticles({
                                    object: {
                                        position: {
                                            x: backend_grids[grid].invaders[i].x,
                                            y: backend_grids[grid].invaders[i].y,
                                        },
                                        width: 4,
                                        height: 4,
                                    },
                                    fades: true,
                                }, 5)
                                io.emit('audio', 'explode');
                                backend_grids[grid].invaders.splice(i, 1);
                                io.emit('killInvader', { id: grid, i: i });

                                if (backend_grids[grid].invaders.length > 0) {
                                    const FIRST_INVADER = backend_grids[grid].invaders[0];
                                    const LAST_INVADER = backend_grids[grid].invaders[backend_grids[grid].invaders.length - 1];

                                    backend_grids[grid].width = LAST_INVADER.x - FIRST_INVADER.x + 30;
                                    backend_grids[grid].position.x = FIRST_INVADER.x;
                                } else {
                                    delete backend_grids[grid];
                                }
                            }
                        }
                    }
                }

                if (hit) {
                    setTimeout(() => {
                        delete backend_bombs[bomb];
                    }, 5000)
                }
            }

            // projectile hits a powerup
            for (const powerup in backend_powerups) {

            }

            if (backend_projectiles[projectile].position.y <= 0 || hit) {
                delete backend_projectiles[projectile];
                continue;
            }
        }

        // create player particles
        for (const player in backend_players) {
            if (frames % 2 === 0) {
                particles_id++;
                backend_particles[particles_id] = {
                    position: {
                        x: backend_players[player].position.x + 67.5 / 2,
                        y: backend_players[player].position.y + 33.75,
                    },
                    velocity: {
                        x: (Math.random() - 0.5) * 1.5,
                        y: 1.4,
                    },
                    radius: Math.random() * 2,
                    color: 'white',
                    opacity: 1,
                    fades: true,
                }
            }
        }

        // update particles
        for (const particle in backend_particles) {
            backend_particles[particle].position.x += backend_particles[particle].velocity.x;
            backend_particles[particle].position.y += backend_particles[particle].velocity.y;

            if (backend_particles[particle].fades) {
                backend_particles[particle].opacity -= 0.01;
            }

            if (backend_particles[particle].position.y >= CANVAS_HEIGHT + backend_particles[particle].radius || backend_particles[particle].opacity <= 0) {
                if (particle >= 100) {
                    delete backend_particles[particle];
                } else {
                    backend_particles[particle].position.x = Math.random() * CANVAS_WIDTH;
                    backend_particles[particle].position.y = Math.random() * CANVAS_HEIGHT;
                    backend_particles[particle].opacity = 1;
                }
            }
        }

        io.emit('updatePlayers', backend_players);
        io.emit('updateGrids', backend_grids);
        io.emit('updateBombs', backend_bombs);
        io.emit('updatePowerUps', backend_powerups);
        io.emit('updateProjectiles', backend_projectiles);
        io.emit('updateInvaderProjectiles', backend_invader_projectiles);
        io.emit('updateParticles', backend_particles);
        io.emit('updateScore', total_score);

        frames++;
    }
}, 15)

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});