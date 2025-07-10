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
let currentLevelIndex = 0; // Tracks the current level (0 for Level 1, 1 for Level 2, etc.)

const gameOverScreen = document.getElementById('game-over-screen');
const gameOverText = document.getElementById('game-over-text');
const finalScoreSpan = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const livesSpan = document.getElementById('lives');
const scoreSpan = document.getElementById('score');
const currentLevelSpan = document.getElementById('current-level'); // NEW: Reference to the level display

// --- Sound Effects ---
const hopSound = new Audio('hop.mp3');
const bonkSound = new Audio('bonk.mp3');
const dingSound = new Audio('ding.mp3'); // For reaching the goal
const loseSound = new Audio('lose.mp3'); // For game over

hopSound.volume = 0.5;
bonkSound.volume = 0.7;
dingSound.volume = 0.6;
loseSound.volume = 0.8;

// --- Level Data Definitions ---
// You can fine-tune these values (obstacleMultiplier, min/maxObstacles)
// to get the difficulty curve exactly how you want it.
const levelData = [
    { level: 1, obstacleMultiplier: 1.0, minObstacles: 2, maxObstacles: 3 }, // Fairly easy
    { level: 2, obstacleMultiplier: 1.2, minObstacles: 2, maxObstacles: 4 },
    { level: 3, obstacleMultiplier: 1.4, minObstacles: 3, maxObstacles: 4 },
    { level: 4, obstacleMultiplier: 1.6, minObstacles: 3, maxObstacles: 5 },
    { level: 5, obstacleMultiplier: 1.8, minObstacles: 4, maxObstacles: 5 },
    { level: 6, obstacleMultiplier: 2.0, minObstacles: 4, maxObstacles: 6 },
    { level: 7, obstacleMultiplier: 2.2, minObstacles: 5, maxObstacles: 6 },
    { level: 8, obstacleMultiplier: 2.4, minObstacles: 5, maxObstacles: 7 },
    { level: 9, obstacleMultiplier: 2.6, minObstacles: 6, maxObstacles: 7 },
    { level: 10, obstacleMultiplier: 3.0, minObstacles: 6, maxObstacles: 8 } // Extremely hard
];

// --- Base Lane Definitions (with a base speed) ---
// This acts as a template for each level
const baseLanes = [
    { y: 0 * tileSize, type: 'safe', color: '#66CDAA' }, // Top Goal (Light Sea Green)
    { y: 1 * tileSize, type: 'road', direction: 'left', baseSpeed: 2.1 }, // A good starting speed
    { y: 2 * tileSize, type: 'road', direction: 'right', baseSpeed: 1.6 }, // Slightly slower
    { y: 3 * tileSize, type: 'safe', color: '#7CFC00' }, // Safe Zone (Lawn Green)
    { y: 4 * tileSize, type: 'road', direction: 'left', baseSpeed: 1.5 }, // Similar to previous
    { y: 5 * tileSize, type: 'road', direction: 'right', baseSpeed: 2.0 }, // A bit faster
    { y: 6 * tileSize, type: 'safe', color: '#A9A9A9' }, // Safe Zone (Dark Gray)
    { y: 7 * tileSize, type: 'road', direction: 'left', baseSpeed: 1.2 }, // Slowest lane for a breather
    { y: 8 * tileSize, type: 'road', direction: 'right', baseSpeed: 2.4 }, // Fastest initial lane
    { y: 9 * tileSize, type: 'safe', color: '#FFD700' }, // Starting Lane (GOLD, very visible)
];

let lanes = []; // This array will be populated dynamically based on the current level

// --- Function to Initialize a Specific Level ---
function initializeLevel(levelIndex) {
    // If player somehow tries to access a level beyond what's defined, or completes the last one
    if (levelIndex >= levelData.length) {
        // This means player completed ALL defined levels!
        gameActive = false; // Stop game loop
        gameOverText.textContent = "YOU ARE THE ULTIMATE BONKER! YOU CONQUERED ALL LEVELS!";
        finalScoreSpan.textContent = score;
        gameOverScreen.style.display = 'flex';
        dingSound.play(); // Play a victory sound
        return; // Exit function, game is over (won)
    }

    const currentLevel = levelData[levelIndex];

    // Reset player position for the new level
    player.x = gameWidth / 2 - tileSize / 2;
    player.y = gameHeight - tileSize;

    // Deep copy baseLanes to create the new set of lanes for this level
    // This ensures each level starts with a fresh set of lanes
    lanes = baseLanes.map(lane => ({ ...lane }));

    // Populate obstacles for road lanes based on current level's data
    lanes.forEach(lane => {
        if (lane.type === 'road') {
            lane.obstacles = []; // Clear any existing obstacles from previous level
            lane.speed = lane.baseSpeed * currentLevel.obstacleMultiplier; // Apply level-specific speed

            // Determine number of obstacles based on current level
            const numObstacles = Math.floor(Math.random() * (currentLevel.maxObstacles - currentLevel.minObstacles + 1)) + currentLevel.minObstacles;
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
                    color: obstacleColor,
                    speed: lane.speed // Obstacle speed should be the lane's speed
                });
            }
        }
    });

    // Update the displayed game info including the new level
    updateGameInfo();
    console.log("Initialized Level:", currentLevel.level);
}


// --- Drawing Functions ---
function drawPlayer() {
    // console.log("Attempting to draw player at X:", player.x, "Y:", player.y); // Can be noisy
    if (player.img.complete && player.img.naturalWidth !== 0) {
        ctx.drawImage(player.img, player.x, player.y, player.width, player.height);
        // console.log("Player image drawn successfully."); // Can be noisy
    } else {
        console.log("Player image not loaded or broken, drawing red square fallback.");
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawLanes() {
    // console.log("Drawing lanes..."); // Can be noisy
    lanes.forEach(lane => {
        ctx.fillStyle = lane.color || '#444';
        ctx.fillRect(0, lane.y, gameWidth, tileSize);

        if (lane.type === 'road') {
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
    // console.log("Lanes and obstacles drawn."); // Can be noisy
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
    currentLevelSpan.textContent = levelData[currentLevelIndex].level; // NEW: Update level display
}

function gameOver(message) {
    gameActive = false;
    gameOverText.textContent = message;
    finalScoreSpan.textContent = score;
    gameOverScreen.style.display = 'flex';
    loseSound.play(); // Play lose sound
}

function resetGame() {
    lives = 3;
    score = 0;
    currentLevelIndex = 0; // Reset to Level 1
    gameActive = true;
    gameOverScreen.style.display = 'none';
    initializeLevel(currentLevelIndex); // Initialize Level 1
    gameLoop();
}

// --- Input Handling ---
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;

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

    if (player.y < prevPlayerY) { // Only add score if moving UP
        score += 10;
    }
    updateGameInfo();

    // Check if player reached the goal (top lane)
    if (player.y === 0) {
        score += 100; // Bonus for reaching goal
        dingSound.play(); // Play ding sound for reaching goal

        // Check if there are more levels
        if (currentLevelIndex < levelData.length - 1) {
            currentLevelIndex++; // Advance to the next level
            console.log("Advancing to Level:", levelData[currentLevelIndex].level);
            initializeLevel(currentLevelIndex); // Set up the next level
        } else {
            // Player completed the final level!
            gameOver("YOU ARE THE ULTIMATE BONKER! YOU CONQUERED ALL LEVELS!");
            // No need to initializeLevel here as the game is won/over
        }
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
                bonkSound.play(); // Play bonk sound
                if (lives <= 0) {
                    gameOver("GAME OVER!");
                } else {
                    // Reset player to bottom if hit, but not game over
                    player.x = gameWidth / 2 - tileSize / 2;
                    player.y = gameHeight - tileSize;
                }
                return true; // Collision detected
            }
        }
    }
    return false; // No collision
}

// --- Game Loop ---
function gameLoop() {
    if (!gameActive) return;
    // console.log("Game loop executing."); // Can be noisy

    ctx.clearRect(0, 0, gameWidth, gameHeight);

    updateObstacles();
    drawLanes();
    drawPlayer();

    checkCollision();

    requestAnimationFrame(gameLoop);
}

// --- Initial Game Start (Important: call initializeLevel first) ---
player.img.onload = () => {
    console.log("Player image loaded successfully! Starting game loop.");
    initializeLevel(currentLevelIndex); // Initialize Level 1 when image loads
    gameLoop();
};

player.img.onerror = () => {
    console.error("Failed to load player image: dog-bonk.png - Make sure path is correct! Drawing red square fallback.");
    initializeLevel(currentLevelIndex); // Initialize Level 1 even if image fails
    gameLoop();
};//
