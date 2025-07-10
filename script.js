const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 40;
const gameWidth = canvas.width;
const gameHeight = canvas.height;
const numLanes = gameHeight / tileSize;

const player = {
    x: gameWidth / 2 - tileSize / 2,
    y: gameHeight - tileSize, // Start on the bottom-most lane
    width: tileSize,
    height: tileSize,
    speed: tileSize,
    img: new Image()
};
player.img.src = "dog-bonk.png"; // MAKE SURE THIS PATH IS CORRECT!

let lives = 3;
let score = 0;
let gameActive = true;

const gameOverScreen = document.getElementById('game-over-screen');
const gameOverText = document.getElementById('game-over-text');
const finalScoreSpan = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const livesSpan = document.getElementById('lives');
const scoreSpan = document.getElementById('score');

// --- Lane Definitions ---
const lanes = [];

// Adjusted colors for better visibility and more lanes
lanes.push({ y: 0 * tileSize, type: 'safe', color: '#66CDAA' }); // Top Goal (Light Sea Green)
lanes.push({ y: 1 * tileSize, type: 'road', direction: 'left', speed: 2.5, obstacles: [] });
lanes.push({ y: 2 * tileSize, type: 'road', direction: 'right', speed: 1.8, obstacles: [] });
lanes.push({ y: 3 * tileSize, type: 'safe', color: '#7CFC00' }); // Safe Zone (Lawn Green)
lanes.push({ y: 4 * tileSize, type: 'road', direction: 'left', speed: 1.5, obstacles: [] });
lanes.push({ y: 5 * tileSize, type: 'road', direction: 'right', speed: 2.2, obstacles: [] });
lanes.push({ y: 6 * tileSize, type: 'safe', color: '#A9A9A9' }); // Safe Zone (Dark Gray)
lanes.push({ y: 7 * tileSize, type: 'road', direction: 'left', speed: 1.2, obstacles: [] });
lanes.push({ y: 8 * tileSize, type: 'road', direction: 'right', speed: 2.8, obstacles: [] });
lanes.push({ y: 9 * tileSize, type: 'safe', color: '#FFD700' }); // Starting Lane (GOLD, very visible)


// Populate obstacles for road lanes
lanes.forEach(lane => {
    if (lane.type === 'road') {
        const numObstacles = Math.floor(Math.random() * 3) + 2; // 2 to 4 obstacles
        for (let i = 0; i < numObstacles; i++) {
            const obstacleWidth = tileSize * (Math.floor(Math.random() * 2) + 1); // 1 or 2 tiles wide
            const startOffset = Math.random() * gameWidth; // Random starting position
            let obstacleColor;
            const colorRand = Math.random();
            if (colorRand < 0.33) obstacleColor = '#FF4500'; // Orange Red Hammer
            else if (colorRand < 0.66) obstacleColor = '#4682B4'; // Steel Blue Hammer
            else obstacleColor = '#32CD32'; // Lime Green Hammer

            lane.obstacles.push({
                x: startOffset + (i * gameWidth / numObstacles),
                y: lane.y,
                width: obstacleWidth,
                height: tileSize,
                speed: lane.speed,
                color: obstacleColor
            });
        }
    }
});

// --- Drawing Functions ---
function drawPlayer() {
    console.log("Attempting to draw player at X:", player.x, "Y:", player.y);
    if (player.img.complete && player.img.naturalWidth !== 0) {
        ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
        console.log("Player image drawn successfully.");
    } else {
        console.log("Player image not loaded or broken, drawing red square fallback.");
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawLanes() {
    console.log("Drawing lanes...");
    lanes.forEach(lane => {
        ctx.fillStyle = lane.color || '#444';
        ctx.fillRect(0, lane.y, gameWidth, tileSize);

        if (lane.type === 'road') { // This check now contains all road-specific drawing
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            const lineDashLength = 10;
            const lineGapLength = 10;
            ctx.setLineDash([lineDashLength, lineGapLength]);
            ctx.beginPath();
            ctx.moveTo(0, lane.y + tileSize / 2);
            ctx.lineTo(gameWidth, lane.y + tileSize / 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // The obstacle drawing loop is now INSIDE this 'if' block
            lane.obstacles.forEach(obstacle => {
                ctx.fillStyle = obstacle.color;
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                ctx.fillStyle = '#333'; // Hammer handle
                ctx.fillRect(obstacle.x + obstacle.width / 2 - 5, obstacle.y + obstacle.height / 2, 10, obstacle.height / 2);
                ctx.fillStyle = '#666'; // Hammer head detail
                ctx.fillRect(obstacle.x + obstacle.width / 4, obstacle.y + obstacle.height / 4, obstacle.width / 2, obstacle.height / 2);
            });
        }
    });
    console.log("Lanes and obstacles drawn.");
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
                } else { // 'right'
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
}

function gameOver(message) {
    gameActive = false;
    gameOverText.textContent = message;
    finalScoreSpan.textContent = score;
    gameOverScreen.style.display = 'flex';
}

function resetGame() {
    lives = 3;
    score = 0;
    player.x = gameWidth / 2 - tileSize / 2;
    player.y = gameHeight - tileSize;
    gameActive = true;
    gameOverScreen.style.display = 'none';
    updateGameInfo();

    lanes.forEach(lane => {
        if (lane.type === 'road') {
            lane.obstacles = [];
            const numObstacles = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < numObstacles; i++) {
                const obstacleWidth = tileSize * (Math.floor(Math.random() * 2) + 1);
                const startOffset = Math.random() * gameWidth;
                let obstacleColor;
                const colorRand = Math.random();
                if (colorRand < 0.33) obstacleColor = '#FF4500';
                else if (colorRand < 0.66) obstacleColor = '#4682B4';
                else obstacleColor = '#32CD32';

                lane.obstacles.push({
                    x: startOffset + (i * gameWidth / numObstacles),
                    y: lane.y,
                    width: obstacleWidth,
                    height: tileSize,
                    speed: lane.speed,
                    color: obstacleColor
                });
            }
        }
    });
    gameLoop();
}

// --- Input Handling ---
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;

    const prevPlayerY = player.y;

    switch (e.key) {
        case 'ArrowUp':
            player.y = Math.max(0, player.y - player.speed);
            break;
        case 'ArrowDown':
            player.y = Math.min(gameHeight - player.height, player.y + player.speed);
            break;
        case 'ArrowLeft':
            player.x = Math.max(0, player.x - player.speed);
            break;
        case 'ArrowRight':
            player.x = Math.min(gameWidth - player.width, player.x + player.speed);
            break;
    }

    if (player.y < prevPlayerY) {
        score += 10;
    }
    updateGameInfo();

    if (player.y === 0) {
        gameOver("YOU BONKED IT!");
    }
});

restartButton.addEventListener('click', resetGame);

// --- Collision Detection ---
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

// --- Game Loop ---
function gameLoop() {
    if (!gameActive) return;
    console.log("Game loop executing.");

    ctx.clearRect(0, 0, gameWidth, gameHeight);

    updateObstacles();
    drawLanes();
    drawPlayer();

    checkCollision();

    requestAnimationFrame(gameLoop);
}

// --- Start the game ONLY after the player image loads ---
player.img.onload = () => {
    console.log("Player image loaded successfully! Starting game loop.");
    updateGameInfo();
    gameLoop();
};

player.img.onerror = () => {
    console.error("Failed to load player image: dog-bonk.png - Make sure path is correct! Drawing red square fallback.");
    updateGameInfo();
    ameLoop(); // Start the game loop even if image fails, drawing red square
}; //
