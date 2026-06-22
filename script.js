// script.js
let score = 0;
let bugsCaught = 0;
let bestScore = parseInt(localStorage.getItem('maldy_best_score')) || 0;
let combo = 1;
let lives = 3;
let escapedBugs = 0;

let bugs = [];
let isPlaying = false;
let spawnRate = 1200;
let previousTime = 0;
let spawnTimeout = null;

let bugsSpawned = 0;
let nextLifeDropAt = 10;
let nextBombAt = 8;
let isMuted = localStorage.getItem('maldy_music_muted') === 'true';

let targetBowlX = 0;
let currentBowlX = 0;

// Configs for bugs
const BUGS_CONFIG = [
  { type: 'red', src: 'assets/bugs/bug-red.png', points: 1, probability: 45, speedMul: 1 },
  { type: 'green', src: 'assets/bugs/bug-green.png', points: 2, probability: 30, speedMul: 1.2 },
  { type: 'purple', src: 'assets/bugs/bug-purple.png', points: 5, probability: 15, speedMul: 1.5 },
  { type: 'gold', src: 'assets/bugs/bug-gold.png', points: 10, probability: 5, speedMul: 2 },
  { type: 'bomb', src: 'assets/bugs/bomb.png', points: -5, probability: 10, speedMul: 1.3 }
];

document.addEventListener('error', function(e) {
  if (e.target.tagName.toLowerCase() === 'img') {
    const label = e.target.getAttribute('alt') || 'Image';
    const isBig = label.includes('Hero');
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none">
        <rect width="200" height="200" fill="#EBDAB7" rx="${isBig ? 0 : 10}" ry="${isBig ? 0 : 10}" stroke="#E67E22" stroke-width="2" stroke-dasharray="8,8"/>
        <text x="50%" y="50%" font-family="sans-serif" font-size="${isBig ? 12 : 24}" fill="#5A3A31" font-weight="bold" text-anchor="middle" dominant-baseline="middle">
          <tspan x="50%" dy="-10">${label}</tspan>
        </text>
      </svg>
    `;
    e.target.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    e.target.style.objectFit = isBig ? 'cover' : 'contain';
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    initBowlInput();
    initMapleLeaves();
    initMusic();
    
    document.getElementById('btn-start').addEventListener('click', () => {
        document.getElementById('start-screen-overlay').classList.add('hidden');
        startGame();
    });
});

function initMusic() {
    const bgm = document.getElementById('bgm');
    if (!bgm) return;
    bgm.volume = 0.3;
    
    const iconOn = document.getElementById('music-float-icon-on');
    const iconOff = document.getElementById('music-float-icon-off');
    const popup = document.getElementById('music-popup');
    const btnToggle = document.getElementById('popup-music-toggle');
    
    function updateMusicState() {
        bgm.muted = isMuted;
        if (isMuted) {
            if(iconOn) iconOn.style.display = 'none';
            if(iconOff) iconOff.style.display = 'block';
            if(btnToggle) btnToggle.innerText = "Resume Music";
        } else {
            if(iconOn) iconOn.style.display = 'block';
            if(iconOff) iconOff.style.display = 'none';
            if(btnToggle) btnToggle.innerText = "Pause Music";
        }
    }
    
    updateMusicState();
    
    const btnMusic = document.getElementById('btn-music-floating');
    if (btnMusic) {
        btnMusic.addEventListener('click', () => {
            if (popup) popup.classList.toggle('hidden');
        });
    }
    
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            isMuted = !isMuted;
            localStorage.setItem('maldy_music_muted', isMuted);
            updateMusicState();
        });
    }
    
    const btnClose = document.getElementById('popup-music-close');
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (popup) popup.classList.add('hidden');
        });
    }
}

function initBowlInput() {
    const board = document.getElementById('game-board');
    targetBowlX = board.clientWidth / 2;
    currentBowlX = targetBowlX;
    
    board.addEventListener('mousemove', (e) => {
        if(!isPlaying) return;
        const rect = board.getBoundingClientRect();
        targetBowlX = e.clientX - rect.left;
    });
    
    board.addEventListener('touchmove', (e) => {
        if(!isPlaying) return;
        e.preventDefault(); 
        const rect = board.getBoundingClientRect();
        targetBowlX = e.touches[0].clientX - rect.left;
    }, {passive: false});
    
    board.addEventListener('touchstart', (e) => {
        if(!isPlaying) return;
        const rect = board.getBoundingClientRect();
        targetBowlX = e.touches[0].clientX - rect.left;
    }, {passive: true});
    
    document.getElementById('btn-restart').addEventListener('click', startGame);
}

function getScoreMultiplier() {
    let mul = 1.0 + Math.floor(score / 1000) * 0.08;
    return Math.min(mul, 1.8);
}

function getBugDuration(bugSpeedMul) {
    let baseMultiplier = getScoreMultiplier();
    let comboMultiplier = Math.min(0.5, (combo - 1) * 0.02);
    let totalMultiplier = baseMultiplier + comboMultiplier;
    
    // Base fall duration is 6000ms.
    let fallDurationMs = 6000 / (totalMultiplier * bugSpeedMul);
    
    // Clamp to secure min and max constraints
    return Math.max(3000, Math.min(fallDurationMs, 7000));
}

function startGame() {
  score = 0;
  bugsCaught = 0;
  lives = 3;
  escapedBugs = 0;
  combo = 1;
  bugs = [];
  bugsSpawned = 0;
  nextLifeDropAt = 25 + Math.floor(Math.random() * 15);
  nextBombAt = Math.floor(8 + Math.random() * 8);
  isPlaying = true;
  
  document.getElementById('game-over-overlay').classList.add('hidden');
  document.querySelectorAll('.bug').forEach(e => e.remove());
  
  // Center bowl initially
  const board = document.getElementById('game-board');
  targetBowlX = board.clientWidth / 2;
  currentBowlX = targetBowlX;
  
  updateUI();
  updateComboUI();
  
  if(spawnTimeout) clearTimeout(spawnTimeout);
  
  previousTime = performance.now();
  requestAnimationFrame(gameLoop);
  scheduleSpawn();
  
  const bgm = document.getElementById('bgm');
  if(bgm) {
      bgm.currentTime = 0;
      bgm.play().catch(e => console.log('BGM play blocked:', e));
  }
}

function getMaxActiveBugs() {
  if (score < 500) return Math.random() > 0.5 ? 2 : 1;
  if (score < 1000) return 2;
  if (score < 1500) return Math.random() > 0.5 ? 3 : 2;
  if (score < 2000) return 3;
  return Math.random() > 0.5 ? 4 : 3;
}

function scheduleSpawn() {
  if(!isPlaying) return;
  
  if (bugs.length < getMaxActiveBugs()) {
    spawnBug();
  }
  
  // Random delay between 500ms and 1000ms
  let delay = 500 + Math.random() * 500;
  spawnTimeout = setTimeout(scheduleSpawn, delay);
}

function spawnBug() {
  const board = document.getElementById('game-board');
  if(!board) return;
  
  const boardWidth = board.clientWidth;
  const laneWidth = boardWidth / 5;
  
  // Lane System
  let occupiedLanes = bugs.map(b => b.lane);
  let availableLanes = [0, 1, 2, 3, 4].filter(l => !occupiedLanes.includes(l));
  
  // Avoid placing bugs on extreme opposite edges at the same time
  if (occupiedLanes.includes(0)) availableLanes = availableLanes.filter(l => l !== 4);
  if (occupiedLanes.includes(4)) availableLanes = availableLanes.filter(l => l !== 0);
  
  if (availableLanes.length === 0) return;
  
  let chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
  
  bugsSpawned++;
  let selectedBug;
  let wantsLifeDrop = (bugsSpawned >= nextLifeDropAt);
  let wantsBomb = (bugsSpawned >= nextBombAt);
  
  if (wantsLifeDrop && lives < 3) {
    selectedBug = { type: 'life', src: 'assets/ui/life-drop.png', points: 0, speedMul: 1.1 };
    nextLifeDropAt = bugsSpawned + 25 + Math.floor(Math.random() * 15);
  } else if (wantsBomb) {
    selectedBug = { type: 'bomb', src: 'assets/bugs/bomb.png', points: -5, speedMul: 1.3 };
    nextBombAt = bugsSpawned + 5 + Math.floor(Math.random() * 6);
    if (wantsLifeDrop) nextLifeDropAt = bugsSpawned + 2; 
  } else {
    if (wantsLifeDrop) nextLifeDropAt = bugsSpawned + 2; 
    // Select bug based on probability
    const rand = Math.random() * 100;
    let cumulative = 0;
    selectedBug = BUGS_CONFIG[0];
    for(let b of BUGS_CONFIG) {
      if (b.type === 'bomb') continue; // Handled by forced spawns now
      cumulative += b.probability;
      if(rand <= cumulative) {
        selectedBug = b;
        break;
      }
    }
  }
  
  const size = 48;
  const minX = chosenLane * laneWidth + 10;
  const maxX = (chosenLane + 1) * laneWidth - size - 10;
  const diff = Math.max(0, maxX - minX);
  const x = minX + Math.random() * diff;
  
  const img = document.createElement('img');
  img.src = selectedBug.src;
  img.alt = selectedBug.type.charAt(0).toUpperCase() + selectedBug.type.slice(1);
  img.className = 'bug';
  if (selectedBug.type === 'life') {
    img.classList.add('life-drop');
  }
  img.style.left = `${x}px`;
  img.style.top = `-60px`;
  img.draggable = false;
  
  const bugObj = {
    element: img,
    x: x,
    y: -60,
    lastY: -60,
    durationMs: getBugDuration(selectedBug.speedMul),
    config: selectedBug,
    board: board,
    lane: chosenLane,
    processed: false
  };

  board.appendChild(img);
  bugs.push(bugObj);
}

function gameLoop(time) {
  if(!isPlaying) return;
  requestAnimationFrame(gameLoop);
  
  if(!previousTime) previousTime = time;
  let dt = time - previousTime;
  previousTime = time;
  
  // Prevent crazy jumps if user switches tabs
  if(dt > 100) dt = 16; 
  
  const board = document.getElementById('game-board');
  if(!board) return;
  
  // Interpolate bowl X
  const boardWidth = board.clientWidth;
  const boardHeight = board.clientHeight;
  const bowlWidth = 140; 
  const minX = bowlWidth / 2;
  const maxX = boardWidth - bowlWidth / 2;
  
  targetBowlX = Math.max(minX, Math.min(targetBowlX, maxX));
  currentBowlX += (targetBowlX - currentBowlX) * (dt * 0.015);
  
  const bowl = document.getElementById('bowl');
  if(bowl) bowl.style.left = `${currentBowlX}px`;
  
  // Define intersection plane
  const catchLine = boardHeight - 75; 
  
  for(let i = bugs.length - 1; i >= 0; i--) {
    let b = bugs[i];
    
    b.lastY = b.y;
    let velocity = boardHeight / b.durationMs;
    b.y += velocity * dt;
    b.element.style.top = `${b.y}px`;
    
    let bugBottomY = b.y + 40; 
    let bugCenterX = b.x + 24;
    
    // Check if it crossed the plane in this frame interval
    let previousBottom = b.lastY + 40;
    
    if (previousBottom < catchLine && bugBottomY >= catchLine && !b.processed) {
      let dist = Math.abs(bugCenterX - currentBowlX);
      if (dist <= 65) {
        b.processed = true;
        catchBug(b, dist <= 20); // 20px allowance for PERFECT
        bugs.splice(i, 1);
        continue;
      }
    }
    
    // Check missing condition (it fell way past safely)
    if (bugBottomY > boardHeight && !b.processed) {
      b.processed = true;
      missBug(b);
      bugs.splice(i, 1);
    }
  }
}

function missBug(bugObj) {
  if(bugObj.board.contains(bugObj.element)) {
      bugObj.board.removeChild(bugObj.element);
  }
  
  if(bugObj.config.type === 'life') {
    return; // Missing life drop does nothing
  }
  
  if(bugObj.config.type !== 'bomb') {
    combo = 1;
    escapedBugs++;
    
    let lifeLost = false;
    if (escapedBugs >= 5) {
      lives--;
      escapedBugs = 0;
      lifeLost = true;
    }
    
    updateUI();
    updateComboUI();
    
    if (lifeLost) {
      showFloatText(bugObj.board, "ESCAPED MAX!<br>-1 LIFE", bugObj.x + 24, bugObj.y, '#c0392b');
    }
    
    bugObj.board.style.backgroundColor = 'rgba(192, 57, 43, 0.1)';
    setTimeout(() => { bugObj.board.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; }, 150);
    
    if(lives <= 0) {
      triggerGameOver();
    }
  }
}

function catchBug(bugObj, isPerfect) {
  if(bugObj.board.contains(bugObj.element)) {
      bugObj.board.removeChild(bugObj.element);
  }
  
  if(bugObj.config.type === 'life') {
    if (lives < 3) {
      lives++;
      updateUI();
    }
    showFloatText(bugObj.board, "+1 LIFE", bugObj.x + 24, bugObj.y, '#e74c3c');
    return;
  }
  
  if(bugObj.config.type === 'bomb') {
    combo = 1;
    lives--;
    score += bugObj.config.points; 
    if(score < 0) score = 0;
    
    showFloatText(bugObj.board, "-1 LIFE<br>-5", bugObj.x + 24, bugObj.y, '#c0392b');
    
    // Shake effect
    bugObj.board.style.transform = 'translateX(6px)';
    setTimeout(() => { bugObj.board.style.transform = 'translateX(-6px)'; }, 50);
    setTimeout(() => { bugObj.board.style.transform = 'translateX(0)'; }, 100);
    
    updateUI();
    updateComboUI();
    
    if(lives <= 0) {
      triggerGameOver();
    }
    return;
  }
  
  combo++;
  bugsCaught++;
  
  let pts = bugObj.config.points;
  let finalPts = pts * combo; 
  let feedback = "GOOD";
  let fColor = "#E67E22";
  
  if(isPerfect) {
    finalPts = Math.floor(finalPts * 1.5);
    feedback = "PERFECT!";
    fColor = "#C0392B";
  }
  
  score += finalPts;
  if(score > bestScore) {
    bestScore = score;
    localStorage.setItem('maldy_best_score', bestScore);
  }
  
  showFloatText(bugObj.board, `${feedback}<br>+${finalPts}`, bugObj.x + 24, bugObj.y, fColor);
  
  updateUI();
  updateComboUI();
}

function showFloatText(board, text, x, y, color) {
  const floatEl = document.createElement('div');
  floatEl.className = 'floating-score';
  floatEl.innerHTML = text;
  floatEl.style.left = `${x}px`;
  floatEl.style.top = `${y}px`;
  floatEl.style.transform = 'translate(-50%, 0)';
  if(color) floatEl.style.color = color;
  
  board.appendChild(floatEl);
  setTimeout(() => {
    if(board.contains(floatEl)) board.removeChild(floatEl);
  }, 800);
}

function updateUI() {
  document.querySelectorAll('.sync-stat-score').forEach(el => el.innerText = score);
  document.querySelectorAll('.sync-stat-best').forEach(el => el.innerText = bestScore);
  
  let heartsHtml = '';
  for(let i = 1; i <= 3; i++) {
    if(i <= lives) {
      heartsHtml += `<svg class="life-icon" width="22" height="22" viewBox="0 0 24 24" fill="#c0392b" style="margin-left: 4px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    } else {
      heartsHtml += `<svg class="life-icon" width="22" height="22" viewBox="0 0 24 24" fill="rgba(0,0,0,0.2)" style="margin-left: 4px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    }
  }
  document.querySelectorAll('.sync-stat-lives').forEach(el => el.innerHTML = heartsHtml);
  
  let escapePercent = Math.min(100, (escapedBugs / 5) * 100);
  document.querySelectorAll('.sync-escape-bar').forEach(bar => bar.style.width = escapePercent + '%');
  document.querySelectorAll('.sync-escape-text').forEach(t => t.innerText = `${escapedBugs} / 5`);
}

function updateComboUI() {
  document.querySelectorAll('.sync-stat-combo').forEach(el => el.innerText = combo);
  const icons = document.querySelectorAll('.sync-combo-icon');
  const boxes = document.querySelectorAll('.sync-combo-box');
  
  if(combo >= 3) {
    icons.forEach(icon => {
      icon.classList.remove('hidden');
      icon.classList.add('combo-fire');
    });
    boxes.forEach(box => {
      box.style.transform = 'scale(1.02)';
      setTimeout(()=> box.style.transform = 'scale(1)', 150);
    });
  } else {
    icons.forEach(icon => {
      icon.classList.add('hidden');
      icon.classList.remove('combo-fire');
    });
  }
}

function triggerGameOver() {
  isPlaying = false;
  if(spawnTimeout) clearTimeout(spawnTimeout);
  
  document.getElementById('go-fixed').innerText = bugsCaught;
  document.getElementById('go-score').innerText = score;
  document.getElementById('go-best').innerText = bestScore;
  
  document.getElementById('game-over-overlay').classList.remove('hidden');
  
  const bgm = document.getElementById('bgm');
  if(bgm) bgm.pause();
}

// Background Maple Leaves Decoration
function initMapleLeaves() {
  const container = document.getElementById('leaves-container');
  if(!container) return;
  
  const numLeaves = 15;
  
  for(let i=0; i<numLeaves; i++) {
    setTimeout(() => {
      createLeaf(container);
      setInterval(() => createLeaf(container), 12000 + Math.random()*6000);
    }, Math.random() * 8000);
  }
}

function createLeaf(container) {
  const leaf = document.createElement('div');
  leaf.className = 'leaf';
  
  const colors = ['#C0392B', '#E67E22', '#F39C12', '#D35400', '#CD6155'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const rot = Math.random() * 360;
  
  leaf.innerHTML = `<svg style="transform: rotate(${rot}deg);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="${color}" width="100%" height="100%">
    <path d="M495.2 249.2l-64.4-23.7 20-74.5c2.6-9.7-5.5-18.4-15.3-16.5l-82.5 16.1-39.7-65.7c-5-8.4-17.6-8.4-22.6 0l-40.6 67.2-80.4-15.6c-9.8-1.9-17.9 6.8-15.3 16.5l20 74.5-64.4 23.7c-9.4 3.4-11.7 15.8-4.3 22l61.6 51.5-16.1 79.5c-2 9.8 6.7 17.9 16.5 15.3l74.9-19.8 45.4 69.1c5 7.6 16.1 7.4 20.9 0l46.2-70.2 74.9 19.8c9.8 2.6 18.5-5.5 16.5-15.3l-16.1-79.5 61.6-51.5c7.4-6.2 5.1-18.6-4.3-22zm-225.8 198.8v75.9c0 8.8-7.2 16-16 16s-16-7.2-16-16v-75.9l-29.2-44.5c-3.1-4.7-2.2-11.1 2.2-14.7 4.7-3.9 11.8-3.4 15.8 1.2l27.2 31.4 27.2-31.4c4-4.6 11.1-5.1 15.8-1.2 4.4 3.7 5.3 10.1 2.2 14.7l-29.2 44.5z"/>
  </svg>`;
  
  const startX = Math.random() * window.innerWidth;
  const duration = 10 + Math.random() * 15;
  
  leaf.style.left = `${startX}px`;
  leaf.style.animationDuration = `${duration}s`;
  
  const scale = 0.5 + Math.random() * 1.2;
  leaf.style.width = `${32 * scale}px`;
  leaf.style.height = `${32 * scale}px`;
  leaf.style.opacity = (0.2 + Math.random() * 0.6).toFixed(2);
  
  container.appendChild(leaf);
  setTimeout(() => {
    if(container.contains(leaf)) container.removeChild(leaf);
  }, duration * 1000);
}
