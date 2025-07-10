const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 40;
const gameWidth = canvas.width;
const gameHeight = canvas.height;

const player = {
    x: gameWidth / 2 - tileSize / 2,
    y: gameHeight - tileSize,
    width: tileSize,
    height: tileSize,
    speed: tileSize,
    img: new Image()
};
player.img.src = "dog-bonk.png";

let lives = 3;
let score = 0;
let gameActive = true;
let isPaused = false;
let currentLevelIndex = 0;

const gameOverScreen = document.getElementById('game-over-screen');
const gameOverText = document.getElementById('game-over-text');
const finalScoreSpan = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const livesSpan = document.getElementById('lives');
const scoreSpan = document.getElementById('score');
const currentLevelSpan = document.getElementById('current-level');
const levelFlash = document.getElementById('level-flash');

const hopSound = new Audio('hop.mp3');
const bonkSound = new Audio('bonk.mp3');
const dingSound = new Audio('ding.mp3');
const loseSound = new Audio('lose.mp3');

hopSound.volume = 0.5;
bonkSound.volume = 0.7;
dingSound.volume = 0.6;
loseSound.volume = 0.8;

const levelData = [
    { level: 1, obstacleMultiplier: 1.0, minObstacles: 2, maxObstacles: 3 },
    { level: 2, obstacleMultiplier: 1.2, minObstacles: 2, maxObstacles: 4 },
    { level: 3, obstacleMultiplier: 1.4, minObstacles: 3, maxObstacles: 4 },
    { level: 4, obstacleMultiplier: 1.6, minObstacles: 3, maxObstacles: 5 },
    { level: 5, obstacleMultiplier: 1.8, minObstacles: 4, maxObstacles: 5 },
    { level: 6, obstacleMultiplier: 2.0, minObstacles: 4, maxObstacles: 6 },
    { level: 7, obstacleMultiplier: 2.2, minObstacles: 5, maxObstacles: 6 },
    { level: 8, obstacleMultiplier: 2.4, minObstacles: 5, maxObstacles: 7 },
    { level: 9, obstacleMultiplier: 2.6, minObstacles: 6, maxObstacles: 7 },
    { level: 10, obstacleMultiplier: 3.0, minObstacles: 6, maxObstacles: 8 }
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

function initializeLevel(levelIndex) {
    if (levelIndex >= levelData.length) {
        gameActive = false;
        gameOverText.textContent = "YOU ARE THE ULTIMATE BONKER! YOU CONQUERED ALL LEVELS!";
        finalScoreSpan.textContent = score;
        gameOverScreen.style.display = 'flex';
        dingSound.play();
        return;
    }

    const currentLevel = levelData[levelIndex];
    player.x = gameWidth / 2 - tileSize / 2;
    player.y = gameHeight - tileSize;

    lanes = baseLanes.map(lane => ({ ...lane }));

    lanes.forEach(lane => {
        if (lane.type === 'road') {
            lane.obstacles = [];
            lane.speed = lane.baseSpeed * currentLevel.obstacleMultiplier;

            const numObstacles = Math.floor(Math.random() * (currentLevel.maxObstacles - currentLevel.minObstacles + 1)) + currentLevel.minObstacles;
            for (let i = 0; i < numObstacles; i++) {
                const obstacleWidth = tileSize * (Math.floor(Math.random() * 2) + 1);
                const startOffset = Math.random() * gameWidth;
                const colorRand = Math.random();
                const obstacleColor = colorRand < 0.33 ? '#FF4500' : (colorRand < 0.66 ? '#4682B4' : '#32CD32');

                lane.obstacles.push({
                    x: startOffset + (i * gameWidth / numObstacles),
                    y: lane.y,
                    width: obstacleWidth,
                    height: tileSize,
                    color: obstacleColor,
                    speed: lane.speed
                });
            }
        }
    });

    updateGameInfo();
    showLevelFlash(currentLevel.level);
    console.log("Initialized Level:", currentLevel.level);
}

function drawPlayer() {
    if (player.img.complete && player.img.naturalWidth !== 0) {
        ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawLanes() {
    lanes.forEach(lane => {
        ctx.fillStyle = lane.color || '#444';
        ctx.fillRect(0, lane.y, gameWidth, tileSize);

        if (lane.type === 'road') {
            ctx.setLineDash([10, 10]);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, lane.y + tileSize / 2);
            ctx.lineTo(gameWidth, lane.y + tileSize / 2);
            ctx.stroke();
            ctx.setLineDash([]);

            lane.obstacles.forEach(obstacle => {
                ctx.fillStyle = obstacle.color;
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                ctx.fillStyle = '#333';
                ctx.fillRect(obstacle.x + obstacle.width / 2 - 5, obstacle.y + obstacle.height / 2, 10, obstacle.height / 2);
                ctx.fillStyle = '#666';
                ctx.fillRect(obstacle.x + obstacle.width / 4, obstacle.y + obstacle.height / 4, obstacle.width / 2, obstacle.height / 2);
            });
        }
    });
}

function updateObstacles() {
    lanes.forEach(lane => {
        if (lane.type === 'road') {
            lane.obstacles.forEach(obstacle => {
                if (lane.direction === 'left') {
                    obstacle.x -= obstacle.speed;
                    if (obstacle.x + obstacle.width < 0) {
                        obstacle.x = gameWidth;
                    }
                } else {
                    obstacle.x += obstacle.speed;
                    if (obstacle.x > gameWidth) {
                        obstacle.x = -obstacle.width;
                    }
                }
            });
        }
    });
}

function updateGameInfo() {
    livesSpan.textContent = lives;
    scoreSpan.textContent = score;
    currentLevelSpan.textContent = levelData[currentLevelIndex].level;
}

function gameOver(message) {
    gameActive = false;
    gameOverText.textContent = message;
    finalScoreSpan.textContent = score;
    gameOverScreen.style.display = 'flex';
    loseSound.play();
}

function resetGame() {
    lives = 3;
    score = 0;
    currentLevelIndex = 0;
    gameActive = true;
    isPaused = false;
    gameOverScreen.style.display = 'none';
    initializeLevel(currentLevelIndex);
    gameLoop();
}

function checkCollision() {
    const currentPlayerLane = lanes.find(lane =>
        player.y >= lane.y && player.y < lane.y + tileSize
    );

    if (currentPlayerLane && currentPlayerLane.type === 'road') {
        for (const obstacle of currentPlayerLane.obstacles) {
            if (player.x < obstacle.x + obstacle.width &&
                player.x + player.width > obstacle.x &&
                player.y < obstacle.y + obstacle.height &&
                player.y + player.height > obstacle.y) {

                lives--;
                updateGameInfo();
                bonkSound.play();
                if (lives <= 0) {
                    gameOver("GAME OVER!");
                } else {
                    player.x = gameWidth / 2 - tileSize / 2;
                    player.y = gameHeight - tileSize;
                }
                return true;
            }
        }
    }
    return false;
}

function gameLoop() {
    if (!gameActive || isPaused) return;
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    updateObstacles();
    drawLanes();
    drawPlayer();
    checkCollision();
    requestAnimationFrame(gameLoop);
}

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused && gameActive) gameLoop();
}

function showLevelFlash(level) {
    levelFlash.textContent = `LEVEL ${level}`;
    levelFlash.style.display = 'block';
    levelFlash.style.animation = 'flashFade 1.5s ease-out forwards';
    setTimeout(() => {
        levelFlash.style.display = 'none';
    }, 1500);
}

document.addEventListener('keydown', (e) => {
    if (!gameActive) return;

    if (e.key === 'p' || e.key === 'P' || e.code === 'Space') {
        togglePause();
        return;
    }

    const prevPlayerY = player.y;

    switch (e.key) {
        case 'ArrowUp':
            player.y = Math.max(0, player.y - player.speed);
            hopSound.currentTime = 0;
            hopSound.play();
            break;
        case 'ArrowDown':
            player.y = Math.min(gameHeight - player.height, player.y + player.speed);
            hopSound.currentTime = 0;
            hopSound.play();
            break;
        case 'ArrowLeft':
            player.x = Math.max(0, player.x - player.speed);
            hopSound.currentTime = 0;
            hopSound.play();
            break;
        case 'ArrowRight':
            player.x = Math.min(gameWidth - player.width, player.x + player.speed);
            hopSound.currentTime = 0;
            hopSound.play();
            break;
    }

    if (player.y < prevPlayerY) {
        score += 10;
    }
    updateGameInfo();

    if (player.y === 0) {
        score += 100;
        dingSound.play();

        if (currentLevelIndex < levelData.length - 1) {
            currentLevelIndex++;
            initializeLevel(currentLevelIndex);
        } else {
            gameOver("YOU ARE THE ULTIMATE BONKER! YOU CONQUERED ALL LEVELS!");
        }
    }
});

restartButton.addEventListener('click', resetGame);

player.img.onload = () => {
    initializeLevel(currentLevelIndex);
    gameLoop();
};

player.img.onerror = () => {
    console.error("Failed to load player image: dog-bonk.png");
    initializeLevel(currentLevelIndex);
    gameLoop();
};
