// Configuration des exercices
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const EXERCISES = {
  knee_raise: {
    name_fr: 'Montée de genou',
    name_ar: 'رفع الركبة',
    joint: 'LEFT_KNEE',
    landmarks: [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE],
    angle_min: 70,
    angle_max: 130,
    hold_frames: 3,
    game_action: 'JUMP',
    feedback_good: 'Parfait!',
    feedback_low: 'Monte plus le genou!',
    feedback_fast: 'Plus lentement!',
  },
  arm_raise: {
    name_fr: 'Élévation du bras',
    name_ar: 'رفع الذراع',
    joint: 'LEFT_SHOULDER',
    landmarks: [LEFT_ELBOW, LEFT_SHOULDER, LEFT_HIP],
    angle_min: 80,
    angle_max: 170,
    hold_frames: 2,
    game_action: 'PUNCH',
    feedback_good: 'Excellent!',
    feedback_low: 'Lève plus le bras!',
    feedback_fast: 'Contrôle le mouvement!',
  },
  squat: {
    name_fr: 'Squat partiel',
    name_ar: 'انحناء جزئي',
    joint: 'LEFT_HIP',
    landmarks: [LEFT_SHOULDER, LEFT_HIP, LEFT_KNEE],
    angle_min: 100,
    angle_max: 160,
    hold_frames: 5,
    game_action: 'DUCK',
    feedback_good: 'Très bien!',
    feedback_low: 'Descends un peu plus!',
    feedback_fast: 'Va plus lentement!',
  },
};

// Utilitaires
function calcAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((radians * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return Math.round(deg);
}

// Web Audio
let audioCtx;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone({ type = 'sine', startFreq = 440, endFreq = 880, duration = 0.15, volume = 0.25 }) {
  ensureAudio();
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playArpeggio(freqs, step = 0.09) {
  ensureAudio();
  freqs.forEach((f, i) => {
    setTimeout(() => {
      playTone({ startFreq: f, endFreq: f * 1.1, duration: 0.12, volume: 0.22 });
    }, i * step * 1000);
  });
}

function playNoiseImpact(duration = 0.18, volume = 0.35) {
  ensureAudio();
  const ctx = audioCtx;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  noise.connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + duration);
}

function playVictoryFanfare() {
  playArpeggio([523, 659, 784, 1047, 1319], 0.13);
}

// DOM
const screens = {
  welcome: document.getElementById('screen-welcome'),
  game: document.getElementById('screen-game'),
  complete: document.getElementById('screen-complete'),
};
const btnStart = document.getElementById('btn-start');
const btnDemo = document.getElementById('btn-demo');
const btnReplay = document.getElementById('btn-replay');
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const video = document.getElementById('video');

const goodFlash = document.getElementById('good-flash');
const shakeLayer = document.getElementById('shake-layer');
const comboBanner = document.getElementById('combo-banner');
const demoBadge = document.getElementById('demo-badge');

const repsDoneEl = document.getElementById('reps-done');
const repsTargetEl = document.getElementById('reps-target');
const scoreValueEl = document.getElementById('score-value');
const comboValueEl = document.getElementById('combo-value');

const exerciseSelect = document.getElementById('exercise-select');
const repsInput = document.getElementById('reps-input');
const exerciseNameFrEl = document.getElementById('exercise-name-fr');
const exerciseNameArEl = document.getElementById('exercise-name-ar');
const angleValueEl = document.getElementById('angle-value');
const angleDot = document.getElementById('angle-dot');
const feedbackTextEl = document.getElementById('feedback-text');
const healthLabelEl = document.getElementById('health-label');
const healthBarEl = document.getElementById('health-bar');
const breathLabelEl = document.getElementById('breath-label');
const breathBarEl = document.getElementById('breath-bar');
const statusLabelEl = document.getElementById('status-label');

const statRepsEl = document.getElementById('stat-reps');
const statScoreEl = document.getElementById('stat-score');
const statQualityEl = document.getElementById('stat-quality');
const statComboEl = document.getElementById('stat-combo');
const completeFlash = document.getElementById('complete-flash');

// État jeu
const GAME_WIDTH = 700;
const GAME_HEIGHT = 400;

const player = {
  x: 120,
  y: 285,
  vy: 0,
  baseY: 285,
  width: 40,
  height: 90,
  punching: false,
  ducking: false,
};

let gravity = 0.9;
let obstacles = [];
let lastObstacleTime = 0;
let score = 0;
let repsDone = 0;
let repsTarget = 15;
let combo = 0;
let maxCombo = 0;
let lastRepTime = 0;
let health = 100;
let qualitySamples = [];
let gameRunning = false;
let demoMode = false;
let activeExerciseKey = 'knee_raise';

// Rep detection
let repState = {
  phase: 'down',
  holdFrames: 0,
  lastAngle: 0,
};

// Fallback fps
let frameCount = 0;
let lastFpsCheck = performance.now();
let usingCamera = false;

// MediaPipe Pose
let pose;
let camera;

function switchScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

function updateExerciseUI() {
  const cfg = EXERCISES[activeExerciseKey];
  exerciseNameFrEl.textContent = cfg.name_fr;
  exerciseNameArEl.textContent = cfg.name_ar;
}

function resetGameState() {
  obstacles = [];
  score = 0;
  repsDone = 0;
  combo = 0;
  maxCombo = 0;
  health = 100;
  qualitySamples = [];
  repState = { phase: 'down', holdFrames: 0, lastAngle: 0 };
  repsTarget = parseInt(repsInput.value, 10) || 15;
  if (repsTarget < 1) repsTarget = 1;
  repsInput.value = repsTarget;
  repsTargetEl.textContent = repsTarget;
  updateHUD();
}

function updateHUD() {
  repsDoneEl.textContent = repsDone;
  scoreValueEl.textContent = score;
  comboValueEl.textContent = 'x' + combo;
  healthLabelEl.textContent = Math.round(health);
  healthBarEl.style.width = Math.max(0, Math.min(100, health)) + '%';
}

function screenFlashGood() {
  goodFlash.style.transition = 'none';
  goodFlash.style.opacity = '0.3';
  requestAnimationFrame(() => {
    goodFlash.style.transition = 'opacity 120ms ease-out';
    goodFlash.style.opacity = '0';
  });
}

function screenShake(intensity = 5, duration = 200) {
  const start = performance.now();
  function step(now) {
    const t = now - start;
    if (t >= duration) {
      shakeLayer.style.transform = 'translate3d(0,0,0)';
      return;
    }
    const progress = 1 - t / duration;
    const dx = (Math.random() * 2 - 1) * intensity * progress;
    const dy = (Math.random() * 2 - 1) * intensity * progress;
    shakeLayer.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function spawnFloatText(text, color = '#88c488') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.color = color;
  el.style.left = player.x + 60 + 'px';
  el.style.top = player.y - 40 + 'px';
  gameCanvas.parentElement.appendChild(el);
  const start = performance.now();
  const duration = 700;
  function anim(now) {
    const t = (now - start) / duration;
    if (t >= 1) {
      el.remove();
      return;
    }
    const y = -30 * t;
    el.style.transform = `translateY(${y}px)`;
    el.style.opacity = String(1 - t);
    requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

function triggerComboBanner() {
  comboBanner.classList.add('visible');
  setTimeout(() => comboBanner.classList.remove('visible'), 1000);
}

function onGoodRep() {
  repsDone += 1;
  lastRepTime = performance.now();
  score += 10;
  combo += 1;
  if (combo > maxCombo) maxCombo = combo;
  updateHUD();
  screenFlashGood();
  const texts = ['BIEN!', 'PARFAIT!', 'HARAKA!', 'ENCORE!'];
  spawnFloatText(texts[Math.floor(Math.random() * texts.length)], '#88c488');
  playTone({ type: 'sine', startFreq: 440, endFreq: 880, duration: 0.15, volume: 0.3 });
  if (combo >= 3) {
    playArpeggio([523, 659, 784, 1047], 0.08);
    triggerComboBanner();
  }
  const cfg = EXERCISES[activeExerciseKey];
  if (cfg) {
    if (cfg.game_action === 'JUMP') playerJump();
    else if (cfg.game_action === 'PUNCH') playerPunch();
    else if (cfg.game_action === 'DUCK') playerDuck();
  }
  if (repsDone >= repsTarget) {
    setTimeout(() => endSession(), 600);
  }
}

function onBadForm(feedback) {
  screenShake(5, 200);
  spawnFloatText(feedback, '#e8836a');
  playTone({ type: 'sawtooth', startFreq: 150, endFreq: 80, duration: 0.2, volume: 0.25 });
}

function onObstacleHit() {
  health -= 10;
  if (health < 0) health = 0;
  updateHUD();
  playNoiseImpact();
  screenShake(8, 220);
}

function endSession() {
  if (!gameRunning) return;
  gameRunning = false;
  const total = Math.max(1, qualitySamples.length);
  const sum = qualitySamples.reduce((a, b) => a + b, 0);
  const quality = Math.round((sum / total) * 100);
  statRepsEl.textContent = repsDone;
  statScoreEl.textContent = score;
  statQualityEl.textContent = quality + '%';
  statComboEl.textContent = 'x' + maxCombo;

  completeFlash.style.transition = 'none';
  completeFlash.style.opacity = '1';
  requestAnimationFrame(() => {
    completeFlash.style.transition = 'opacity 280ms ease-out';
    completeFlash.style.opacity = '0';
  });
  playVictoryFanfare();
  saveSession(quality);
  switchScreen('complete');
}

// Player actions
function playerJump() {
  if (player.y >= player.baseY - 4) {
    player.vy = -18;
  }
}
function playerPunch() {
  player.punching = true;
  setTimeout(() => (player.punching = false), 400);
}
function playerDuck() {
  player.ducking = true;
  setTimeout(() => (player.ducking = false), 800);
}

// Obstacles
function spawnObstacle() {
  const kinds = ['low', 'high', 'fly'];
  const type = kinds[Math.floor(Math.random() * kinds.length)];
  let y = 280;
  if (type === 'high') y = 180;
  if (type === 'fly') y = 220;
  obstacles.push({
    x: GAME_WIDTH + 40,
    y,
    w: 40,
    h: 50,
    type,
  });
}

function updateObstacles(dt) {
  const speedBase = 4 + score * 0.01;
  obstacles.forEach((o) => {
    o.x -= speedBase;
  });
  obstacles = obstacles.filter((o) => o.x + o.w > -40);

  const now = performance.now();
  if (now - lastObstacleTime > 2200) {
    spawnObstacle();
    lastObstacleTime = now;
  }
}

function checkObstacleCollisions() {
  const px = player.x;
  const py = player.y;
  const pw = player.width;
  const ph = player.ducking ? player.height * 0.6 : player.height;
  obstacles.forEach((o) => {
    const hit = px < o.x + o.w && px + pw > o.x && py < o.y + o.h && py + ph > o.y;
    if (!hit) return;
    let avoided = false;
    if (o.type === 'low' && player.y < player.baseY - 40) avoided = true;
    if (o.type === 'high' && player.ducking) avoided = true;
    if (o.type === 'fly' && player.punching) avoided = true;
    if (!avoided) {
      onObstacleHit();
      o.x = -999;
    } else {
      score += 5;
      updateHUD();
    }
  });
}

// Dessin
let particles = [];

function spawnParticles(x, y, color = '#a08ec8') {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() * 2 - 1) * 2,
      vy: (Math.random() * 2 - 1) * 2,
      life: 1,
      color,
    });
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0, '#08080f');
  grad.addColorStop(1, '#050509');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 73) % GAME_WIDTH) + (Date.now() * 0.02) % GAME_WIDTH;
    const y = (i * 47) % GAME_HEIGHT;
    ctx.fillStyle = 'rgba(160,142,200,0.45)';
    ctx.beginPath();
    ctx.arc(x % GAME_WIDTH, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = '#1e1e30';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(GAME_WIDTH, 320);
  ctx.stroke();
}

function drawPlayer() {
  ctx.save();
  ctx.shadowColor = '#a08ec8';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#a08ec8';

  const bodyHeight = player.ducking ? player.height * 0.6 : player.height;
  const radius = 18;
  const bx = player.x;
  const by = player.y - bodyHeight;
  const bw = player.width;
  const bh = bodyHeight;

  ctx.beginPath();
  ctx.moveTo(bx + radius, by);
  ctx.lineTo(bx + bw - radius, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
  ctx.lineTo(bx + bw, by + bh - radius);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
  ctx.lineTo(bx + radius, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
  ctx.lineTo(bx, by + radius);
  ctx.quadraticCurveTo(bx, by, bx + radius, by);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x + bw / 2, by - 18, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#cebfec';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const armY = by + bh * 0.35;
  ctx.moveTo(player.x + bw / 2, armY);
  ctx.lineTo(player.x + bw + 24, armY);
  ctx.stroke();

  if (player.punching) {
    ctx.fillStyle = '#d4a85a';
    ctx.beginPath();
    ctx.arc(player.x + bw + 32, armY, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacles() {
  ctx.save();
  ctx.fillStyle = '#e8836a';
  obstacles.forEach((o) => {
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(o.x + r, o.y);
    ctx.lineTo(o.x + o.w - r, o.y);
    ctx.quadraticCurveTo(o.x + o.w, o.y, o.x + o.w, o.y + r);
    ctx.lineTo(o.x + o.w, o.y + o.h - r);
    ctx.quadraticCurveTo(o.x + o.w, o.y + o.h, o.x + o.w - r, o.y + o.h);
    ctx.lineTo(o.x + r, o.y + o.h);
    ctx.quadraticCurveTo(o.x, o.y + o.h, o.x, o.y + o.h - r);
    ctx.lineTo(o.x, o.y + r);
    ctx.quadraticCurveTo(o.x, o.y, o.x + r, o.y);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function drawParticles(dt) {
  ctx.save();
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt * 2;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  particles = particles.filter((p) => p.life > 0);
}

let lastFrameTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (gameRunning) {
    player.vy += gravity;
    player.y += player.vy;
    if (player.y > player.baseY) {
      player.y = player.baseY;
      player.vy = 0;
    }

    updateObstacles(dt);
    checkObstacleCollisions();
  }

  drawBackground();
  drawObstacles();
  drawPlayer();
  drawParticles(dt);

  if (gameRunning) {
    const nowMs = performance.now();
    if (nowMs - lastRepTime > 3000 && combo > 0) {
      combo = 0;
      comboValueEl.textContent = 'x0';
    }
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// Détection des reps
function handlePoseAngle(angle) {
  const cfg = EXERCISES[activeExerciseKey];
  if (!cfg || !gameRunning) return;
  angleValueEl.textContent = angle;
  let quality = 0;
  if (angle >= cfg.angle_min && angle <= cfg.angle_max) {
    angleDot.style.background = 'var(--green)';
    quality = 1;
    feedbackTextEl.textContent = cfg.feedback_good;
  } else {
    angleDot.style.background = 'var(--coral)';
    if (angle < cfg.angle_min) feedbackTextEl.textContent = cfg.feedback_low;
  }
  qualitySamples.push(quality);

  const fast = Math.abs(angle - repState.lastAngle) > 20 && repState.holdFrames === 0;
  if (fast && angle > cfg.angle_max) {
    feedbackTextEl.textContent = cfg.feedback_fast;
    onBadForm(cfg.feedback_fast);
  }

  if (repState.phase === 'down' && angle >= cfg.angle_min) {
    repState.phase = 'up';
    repState.holdFrames = 1;
  } else if (repState.phase === 'up') {
    if (angle >= cfg.angle_min) {
      repState.holdFrames += 1;
    }
    if (repState.holdFrames >= cfg.hold_frames && angle < cfg.angle_min * 0.75) {
      onGoodRep();
      spawnParticles(player.x + player.width / 2, player.y - player.height / 2);
      repState.phase = 'down';
      repState.holdFrames = 0;
    }
  }
  repState.lastAngle = angle;
}

function processPose(results) {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsCheck > 2000 && usingCamera && !demoMode) {
    const fps = (frameCount * 1000) / (now - lastFpsCheck);
    frameCount = 0;
    lastFpsCheck = now;
    // On ne force plus le mode démo sur faible FPS pour garder le mode "réel"
    // console.log('Pose FPS ~', fps.toFixed(1));
  }
  if (!results.poseLandmarks) return;
  const cfg = EXERCISES[activeExerciseKey];
  if (!cfg) return;
  const [aIdx, bIdx, cIdx] = cfg.landmarks;
  const lm = results.poseLandmarks;
  const a = lm[aIdx];
  const b = lm[bIdx];
  const c = lm[cIdx];
  if (!a || !b || !c) return;
  const angle = calcAngle(a, b, c);
  handlePoseAngle(angle);
}

// MediaPipe init
function initPose() {
  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });
  pose.onResults(processPose);
}

function startCamera() {
  usingCamera = true;
  statusLabelEl.textContent = 'Initialisation de la caméra…';
  camera = new Camera(video, {
    onFrame: async () => {
      await pose.send({ image: video });
    },
    width: 640,
    height: 480,
  });
  return camera
    .start()
    .then(() => {
      deactivateDemoMode();
      statusLabelEl.textContent = 'Caméra active · Pose en temps réel';
    })
    .catch((e) => {
      console.error(e);
      activateDemoMode('Caméra indisponible, mode démo.');
    });
}

// Demo mode
const DEMO_ANGLES = [45, 55, 70, 85, 100, 110, 115, 118, 115, 100, 80, 60, 45];
let demoTimer = null;

function runDemoSequence() {
  let i = 0;
  function nextAngle() {
    if (!demoMode || !gameRunning) return;
    handlePoseAngle(DEMO_ANGLES[i]);
    i++;
    if (i >= DEMO_ANGLES.length) {
      i = 0;
      demoTimer = setTimeout(nextAngle, 1500);
    } else {
      demoTimer = setTimeout(nextAngle, 100);
    }
  }
  nextAngle();
}

function activateDemoMode(reason) {
  if (demoMode) return;
  demoMode = true;
  demoBadge.style.display = 'inline-flex';
  statusLabelEl.textContent = reason || 'Mode démo actif';
  if (camera) {
    try {
      camera.stop();
    } catch (_) {}
  }
  if (gameRunning) runDemoSequence();
}

function deactivateDemoMode() {
  demoMode = false;
  demoBadge.style.display = 'none';
  if (demoTimer) {
    clearTimeout(demoTimer);
    demoTimer = null;
  }
}

// LocalStorage
const PATIENT_ID = 'youssef'; // démo

function saveSession(quality) {
  const data = {
    timestamp: Date.now(),
    exercise: activeExerciseKey,
    reps: repsDone,
    score,
    quality,
    combo_max: maxCombo,
    duration_seconds: Math.round((Date.now() - sessionStartTime) / 1000),
  };
  const key = `haraka_sessions_${PATIENT_ID}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.unshift(data);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
}

let activePingTimer = null;
let sessionStartTime = Date.now();

function startActivePing() {
  const key = `haraka_active_${PATIENT_ID}`;
  localStorage.setItem(key, String(Date.now()));
  if (activePingTimer) clearInterval(activePingTimer);
  activePingTimer = setInterval(() => {
    localStorage.setItem(key, String(Date.now()));
  }, 5000);
}

function stopActivePing() {
  if (activePingTimer) {
    clearInterval(activePingTimer);
    activePingTimer = null;
  }
}

// Évènements UI
btnStart.addEventListener('click', async () => {
  ensureAudio();
  switchScreen('game');
  resetGameState();
  statusLabelEl.textContent = 'Démarrage…';
  if (!pose) initPose();
  try {
    await startCamera();
  } catch (_) {
    // startCamera gère déjà l’erreur vers demo
  }
  gameRunning = true;
  sessionStartTime = Date.now();
  startActivePing();
  if (demoMode) runDemoSequence();
});

btnReplay.addEventListener('click', () => {
  switchScreen('game');
  resetGameState();
  gameRunning = true;
  sessionStartTime = Date.now();
  startActivePing();
  if (demoMode) runDemoSequence();
});

btnDemo.addEventListener('click', () => {
  if (!demoMode) {
    activateDemoMode('Mode démo manuel');
    if (gameRunning) runDemoSequence();
  } else {
    deactivateDemoMode();
    statusLabelEl.textContent = 'Pose en cours…';
    if (!pose) initPose();
    startCamera();
  }
});

exerciseSelect.addEventListener('change', () => {
  activeExerciseKey = exerciseSelect.value;
  updateExerciseUI();
});

repsInput.addEventListener('change', () => {
  repsTarget = parseInt(repsInput.value, 10) || 15;
  repsTargetEl.textContent = repsTarget;
});

// Simule une respiration via Web Audio input simplifié
setInterval(() => {
  if (!gameRunning) return;
  const phase = Math.sin(Date.now() / 1600);
  const v = (phase + 1) / 2;
  breathBarEl.style.width = 20 + v * 60 + '%';
  breathLabelEl.textContent = v > 0.6 ? 'Inspire' : v < 0.3 ? 'Expire' : 'Calme';
}, 300);

updateExerciseUI();

