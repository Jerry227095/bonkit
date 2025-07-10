// Final attempt to force GitHub Pages refresh - [Current Date/Time, e.g., 2025-07-10 17:45 EDT]
// script.js with image obstacles, power-ups, and pause/resume functionality
// ... (rest of your code)
// script.js with image obstacles, power-ups, and pause/resume functionality

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 40;
const gameWidth = canvas.width;
const gameHeight = canvas.height;

let gameActive = true;
let isPaused = false;
let lives = 3;
let score = 0;
let currentLevelIndex = 0;
let hasShield = false;
let doubleScore = false;
let doubleScoreTimeout = null;

const pauseButton = document.getElementById('pause-button');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverText = document.getElementById('game-over-text');
const finalScoreSpan = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const livesSpan = document.getElementById('lives');
const scoreSpan = document.getElementById('score');
const currentLevelSpan = document.getElementById('current-level');
const shieldStatus = document.getElementById('shield-status');
const levelFlash = document.getElementById('level-flash');

const player = {
    x: gameWidth / 2 - tileSize / 2,
    y: gameHeight - tileSize,
    width: tileSize,
    height: tileSize,
    speed: tileSize,
    img: new Image()
};
player.img.src = 'dog-bonk.png';

// --- NEW: Image declarations for obstacles ---
const greenCarImg = new Image();
greenCarImg.src = 'green.png'; // Make sure this matches your actual filename and path

const redCarImg = new Image();
redCarImg.src = 'redcar.png'; // Make sure this matches your actual filename and path

const hammerImg = new Image();
hammerImg.src = 'hammer.png'; // Make sure this matches your actual filename and path

const logImg = new Image();
logImg.src = 'log.png'; // Make sure this matches your actual filename and path

const rockImg = new Image();
rockImg.src = 'rock.png'; // Make sure this matches your actual filename and path
// --- END NEW IMAGE DECLARATIONS ---


const hopSound = new Audio('hop.mp3');
const bonkSound = new Audio('bonk.mp3');
const dingSound = new Audio('ding.mp3');
const loseSound = new Audio('lose.mp3');
const powerUpSound = new Audio('power.mp3'); // Assumes power.mp3 exists in the same directory

const powerUps = [];

const levelData = [
    { level: 1, obstacleMultiplier: 1.0, minObstacles: 2, maxObstacles: 3 },
    { level: 2, obstacleMultiplier: 1.2, minObstacles: 2, maxObstacles: 4 },
    { level: 3, obstacleMultiplier: 1.4, minObstacles: 3, maxObstacles: 4 },
    { level: 4, obstacleMultiplier: 1.6, minObstacles: 3, maxObstacles: 5 },
    { level: 5, obstacleMultiplier: 1.8, minObstacles: 4, maxObstacles: 5 }
];

const baseLanes = [
    { y: 0 * tileSize, type: 'safe', color: '#66CDAA' },
    { y: 1 * tileSize, type: 'road', direction: 'left', baseSpeed: 2.0 },
    { y: 2 * tileSize, type: 'road', direction: 'right', baseSpeed: 1.5 },
    { y: 3 * tileSize, type: 'safe', color: '#7CFC00' },
    { y: 4 * tileSize, type: 'road', direction: 'left', baseSpeed: 1.4 },
    { y: 5 * tileSize, type: 'road', direction: 'right', baseSpeed: 1.9 },
    { y: 6 * tileSize, type: 'safe', color: '#A9A9A9' },
    { y: 7 * tileSize, type: 'road', direction: 'left', baseSpeed: 1.1 },
    { y: 8 * tileSize, type: 'road', direction: 'right', baseSpeed: 2.3 },
    { y: 9 * tileSize, type: 'safe', color: '#FFD700' }
];

let lanes = [];

function initializeLevel(index) {
    const currentLevel = levelData[index];
    player.x = gameWidth / 2 - tileSize / 2;
    player.y = gameHeight - tileSize;

    lanes = baseLanes.map(l => ({ ...l }));

    lanes.forEach(lane => {
        if (lane.type === 'road') {
            lane.obstacles = [];
            lane.speed = lane.baseSpeed * currentLevel.obstacleMultiplier;
            const count = Math.floor(Math.random() * (currentLevel.maxObstacles - currentLevel.minObstacles + 1)) + currentLevel.minObstacles;
            for (let i = 0; i < count; i++) {
                let obstacleImg;
                let obstacleWidth;

                // --- NEW: Assign images based on direction/type ---
                if (lane.direction === 'left') {
                    // Randomly choose between green car, hammer, log, rock for left lanes
                    const leftMovingImages = [greencarImg, hammerImg, logImg, rockImg];
                    obstacleImg = leftMovingImages[Math.floor(Math.random() * leftMovingImages.length)];
                } else if (lane.direction === 'right') {
                    // Randomly choose between red car, hammer, log, rock for right lanes
                    const rightMovingImages = [redCarImg, hammerImg, logImg, rockImg];
                    obstacleImg = rightMovingImages[Math.floor(Math.random() * rightMovingImages.length)];
                } else {
                    // Fallback for unexpected lane types, though all are road/safe here
                    const genericImages = [hammerImg, logImg, rockImg];
                    obstacleImg = genericImages[Math.floor(Math.random() * genericImages.length)];
                }

                // Set width based on the image type or a random selection
                // Assuming cars and logs are 80px wide (2 tiles), hammer and rock are 40px wide (1 tile)
                if (obstacleImg === greencarImg || obstacleImg === redCarImg || obstacleImg === logImg) {
                    obstacleWidth = tileSize * 2; // 80px wide
                } else {
                    obstacleWidth = tileSize; // 40px wide (hammer, rock)
                }
                // --- END NEW IMAGE ASSIGNMENT ---

                lane.obstacles.push({
                    x: Math.random() * gameWidth,
                    y: lane.y,
                    width: obstacleWidth,
                    height: tileSize,
                    img: obstacleImg, // Store the image object
                    speed: lane.speed
                });
            }
        }
    });

    powerUps.length = 0;
    spawnPowerUps();
    updateGameInfo();
    flashLevel(levelData[index].level);
}

function spawnPowerUps() {
    const types = ['shield', 'double'];
    const eligibleSafeLanes = lanes.filter(l => l.type === 'safe' && l.y !== 0 && l.y !== (gameHeight - tileSize)); 
    eligibleSafeLanes.forEach(lane => {
        if (Math.random() < 0.7) { 
            const type = types[Math.floor(Math.random() * types.length)];
            powerUps.push({
                type,
                x: Math.floor(Math.random() * (gameWidth - tileSize)),
                y: lane.y,
                width: tileSize,
                height: tileSize,
                collected: false
            });
        }
    });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        if (!p.collected) {
            ctx.fillStyle = p.type === 'shield' ? '#00FFFF' : '#FF00FF'; 
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = 'black';
            ctx.font = '12px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.type === 'shield' ? 'S' : '2X', p.x + p.width / 2, p.y + p.height / 2);
        }
    });
}

function checkPowerUpCollision() {
    powerUps.forEach(p => {
        if (!p.collected && player.x < p.x + p.width && player.x + player.width > p.x && player.y < p.y + p.height && player.y + player.height > p.y) {
            p.collected = true;
            powerUpSound.currentTime = 0; 
            powerUpSound.play(); 
            if (p.type === 'shield') {
                hasShield = true;
            } else if (p.type === 'double') {
                doubleScore = true;
                clearTimeout(doubleScoreTimeout);
                doubleScoreTimeout = setTimeout(() => {
                    doubleScore = false;
                    updateGameInfo(); 
                }, 10000); 
            }
            updateGameInfo(); 
        }
    });
}

function updateObstacles() {
    lanes.forEach(lane => {
        if (lane.type === 'road') {
            lane.obstacles.forEach(obstacle => {
                obstacle.x += lane.direction === 'left' ? -obstacle.speed : obstacle.speed;
                if (lane.direction === 'left' && obstacle.x + obstacle.width < 0) obstacle.x = gameWidth;
                if (lane.direction === 'right' && obstacle.x > gameWidth) obstacle.x = -obstacle.width;
            });
        }
    });
}

function drawLanes() {
    lanes.forEach(lane => {
        ctx.fillStyle = lane.color || '#333';
        ctx.fillRect(0, lane.y, gameWidth, tileSize);
        if (lane.type === 'road') {
            lane.obstacles.forEach(ob => {
                // --- NEW: Draw image instead of rect ---
                ctx.drawImage(ob.img, ob.x, ob.y, ob.width, ob.height);
                // --- END NEW ---
            });
        }
    });
}

function drawPlayer() {
    ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
}

function updateGameInfo() {
    livesSpan.textContent = lives;
    scoreSpan.textContent = score;
    currentLevelSpan.textContent = levelData[currentLevelIndex].level;
    shieldStatus.textContent = hasShield ? 'On' : 'Off'; 
}

function flashLevel(level) {
    levelFlash.textContent = `LEVEL ${level}`;
    levelFlash.style.display = 'block';
    levelFlash.style.animation = 'none'; 
    levelFlash.offsetHeight; 
    levelFlash.style.animation = null; 
    levelFlash.style.animation = 'flashInOut 1.5s ease forwards'; 
    setTimeout(() => {
        levelFlash.style.display = 'none';
        levelFlash.style.animation = 'none'; 
    }, 1500);
}

function gameOver(message) {
    gameActive = false;
    gameOverText.textContent = message;
    finalScoreSpan.textContent = score;
    gameOverScreen.style.display = 'flex';
    loseSound.currentTime = 0; 
    loseSound.play();
}

function resetGame() {
    lives = 3;
    score = 0;
    currentLevelIndex = 0;
    hasShield = false;
    doubleScore = false;
    clearTimeout(doubleScoreTimeout); 
    gameActive = true;
    gameOverScreen.style.display = 'none';
    initializeLevel(currentLevelIndex);
    gameLoop();
}

function checkCollision() {
    const lane = lanes.find(l => player.y >= l.y && player.y < l.y + tileSize);
    if (lane && lane.type === 'road') {
        for (const ob of lane.obstacles) {
            if (player.x < ob.x + ob.width && player.x + player.width > ob.x && player.y < ob.y + ob.height && player.y + player.height > ob.y) {
                if (hasShield) {
                    hasShield = false; 
                    updateGameInfo(); 
                    bonkSound.currentTime = 0; 
                    bonkSound.play(); 
                } else {
                    lives--;
                    if (lives <= 0) {
                        gameOver('GAME OVER!');
                        return; 
                    }
                }
                player.x = gameWidth / 2 - tileSize / 2;
                player.y = gameHeight - tileSize;
                updateGameInfo();
                bonkSound.currentTime = 0; 
                bonkSound.play(); 
                return; 
            }
        }
    }
}

function gameLoop() {
    if (!gameActive || isPaused) return;
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    updateObstacles();
    drawLanes();
    drawPowerUps(); 
    drawPlayer();
    checkPowerUpCollision(); 
    checkCollision();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
    if (!gameActive || isPaused) return;
    const oldY = player.y; 
    
    let moved = false;

    if (e.key === 'ArrowUp') {
        player.y = Math.max(0, player.y - player.speed);
        if (player.y < oldY) moved = true; 
    } else if (e.key === 'ArrowDown') {
        player.y = Math.min(gameHeight - player.height, player.y + player.speed);
        if (player.y > oldY) moved = true; 
    } else if (e.key === 'ArrowLeft') {
        player.x = Math.max(0, player.x - player.speed);
        moved = true; 
    } else if (e.key === 'ArrowRight') {
        player.x = Math.min(gameWidth - player.width, player.x + player.speed);
        moved = true; 
    }

    if (moved) {
        hopSound.currentTime = 0; 
        hopSound.play();
    }

    if (player.y < oldY) {
        score += doubleScore ? 20 : 10;
    }
    updateGameInfo();

    if (player.y === 0) {
        score += doubleScore ? 200 : 100; 
        dingSound.currentTime = 0; 
        dingSound.play(); 
        if (currentLevelIndex < levelData.length - 1) {
            currentLevelIndex++;
            initializeLevel(currentLevelIndex);
        } else {
            gameOver('YOU WON! BONK LEGEND!');
        }
    }
});

pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    if (!isPaused) {
        gameLoop(); 
    }
});

restartButton.addEventListener('click', resetGame);


// --- NEW: Image loading counter to ensure all images are ready before starting ---
let imagesLoadedCount = 0;
const totalImagesToLoad = 6; // player.img + greencarImg + redcarImg + hammerImg + logImg + rockImg

function imageLoaded() {
    imagesLoadedCount++;
    if (imagesLoadedCount === totalImagesToLoad) {
        initializeLevel(currentLevelIndex);
        gameLoop();
    }
}

// Assign the onload/onerror for all images
player.img.onload = imageLoaded;
player.img.onerror = () => { console.error("Failed to load player image."); imageLoaded(); }; 

greencarImg.onload = imageLoaded;
greencarImg.onerror = () => { console.error("Failed to load green car image."); imageLoaded(); };
redCarImg.onload = imageLoaded;
redCarImg.onerror = () => { console.error("Failed to load red car image."); imageLoaded(); };
hammerImg.onload = imageLoaded;
hammerImg.onerror = () => { console.error("Failed to load hammer image."); imageLoaded(); };
logImg.onload = imageLoaded;
logImg.onerror = () => { console.error("Failed to load log image."); imageLoaded(); };
rockImg.onload = imageLoaded;
rockImg.onerror = () => { console.error("Failed to load rock image."); imageLoaded(); };
// --- END NEW IMAGE LOADING ---
