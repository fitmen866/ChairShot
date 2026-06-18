const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const powerBar = document.querySelector("#powerBar");
const angleReadout = document.querySelector("#angleReadout");
const scoreReadout = document.querySelector("#scoreReadout");
const resetButton = document.querySelector("#resetButton");
const chargeButton = document.querySelector("#chargeButton");
const messagePanel = document.querySelector("#messagePanel");

const W = canvas.width;
const H = canvas.height;
const floorY = 614;
const gravity = 1420;
const maxCharge = 1.25;
const minBackAngle = -12;
const maxBackAngle = -57;
const target = { x: 850, y: 323, w: 292, h: 174 };
const chair = { seatX: 344, seatY: 471, backPivotX: 315, backPivotY: 452 };

const state = {
  mode: "ready",
  charge: 0,
  score: 0,
  best: 0,
  chairAngle: minBackAngle,
  recoil: 0,
  shake: 0,
  noodles: makeNoodlesAtRest(),
  particles: [],
  lastTime: performance.now(),
  messageTitle: "准备开弹",
  messageBody: "按住画面或空格蓄力",
  flightStartedAt: 0,
  releaseTimer: 0,
  pendingLaunch: null,
  artReady: false,
  spritesReady: false,
};

const backgroundArt = new Image();
backgroundArt.src = "./assets/game-scene.png";
backgroundArt.addEventListener("load", () => {
  state.artReady = true;
});

const sprites = {
  gamerChair: loadSprite("./assets/ai-gamer-chair.png"),
  sittingChair: loadSprite("./assets/ai-sitting-gamer-chair.png"),
  springChair: loadSprite("./assets/ai-spring-chair.png"),
  noodles: loadSprite("./assets/ai-noodles.png"),
  monitorDesk: loadSprite("./assets/ai-monitor-desk.png"),
};

function loadSprite(src) {
  const img = new Image();
  img.src = src;
  img.addEventListener("load", () => {
    state.spritesReady = Object.values(sprites).every((sprite) => sprite.complete && sprite.naturalWidth > 0);
  });
  return img;
}

function makeNoodlesAtRest() {
  return {
    x: 253,
    y: 318,
    vx: 0,
    vy: 0,
    rot: -0.08,
    spin: 0,
    active: false,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function easeInCubic(t) {
  const v = clamp(t, 0, 1);
  return v * v * v;
}

function setMessage(title, body) {
  state.messageTitle = title;
  state.messageBody = body;
  messagePanel.innerHTML = `<strong>${title}</strong><span>${body}</span>`;
}

function updateHud() {
  powerBar.style.width = `${Math.round(state.charge * 100)}%`;
  const displayAngle = Math.round(Math.abs(state.chairAngle - minBackAngle));
  angleReadout.textContent = `${displayAngle}°`;
  scoreReadout.textContent = `${state.score}`;
}

function startCharge() {
  if (state.mode === "hit" || state.mode === "miss") {
    resetRound();
  }
  if (state.mode !== "ready" && state.mode !== "resetting") return;
  state.mode = "charging";
  state.charge = Math.max(state.charge, 0.08);
  setMessage("椅背开始蓄力", "松手瞬间，泡面就要起飞");
}

function launch() {
  if (state.mode !== "charging") return;

  const power = clamp(state.charge, 0.12, 1);
  const launchAngle = lerp(-0.72, -0.27, power);
  const speed = lerp(780, 1085, power);
  state.mode = "recovering";
  state.releaseTimer = 0;
  state.pendingLaunch = {
    vx: Math.cos(launchAngle) * speed,
    vy: Math.sin(launchAngle) * speed,
    spin: lerp(6.2, 12.8, power),
  };
  setMessage("人刚坐起来", "椅背还憋着劲，泡面马上遭殃");
}

function fireNoodles() {
  const launchData = state.pendingLaunch;
  if (!launchData) return;
  state.mode = "launched";
  state.recoil = 1;
  state.shake = 7;
  state.flightStartedAt = performance.now();
  state.pendingLaunch = null;
  state.noodles = {
    x: 302,
    y: 342,
    vx: launchData.vx,
    vy: launchData.vy,
    rot: -0.15,
    spin: launchData.spin,
    active: true,
  };
  setMessage("泡面升空", "屏幕：怎么感觉背后一凉");
}

function resetRound() {
  state.mode = "ready";
  state.charge = 0;
  state.recoil = 0;
  state.shake = 0;
  state.chairAngle = minBackAngle;
  state.releaseTimer = 0;
  state.pendingLaunch = null;
  state.noodles = makeNoodlesAtRest();
  state.particles = [];
  setMessage("准备开弹", "按住画面或空格蓄力");
}

function finishHit() {
  if (state.mode === "hit") return;
  const bonus = Math.round(300 + state.charge * 700);
  state.score += bonus;
  state.best = Math.max(state.best, state.score);
  state.mode = "hit";
  state.shake = 18;
  spawnImpact(target.x + 48, target.y + 60, "#ffcf4a", 34);
  spawnImpact(target.x + 76, target.y + 45, "#ff6b4a", 22);
  setMessage("精准爆屏！", `+${bonus} 分，泡面完成了它的使命`);
}

function finishMiss(reason = "泡面自由飞翔") {
  if (state.mode === "miss") return;
  state.mode = "miss";
  state.shake = 3;
  setMessage(reason, "点重新开始，再给椅背一次机会");
}

function spawnImpact(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 360;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.6,
      maxLife: 1,
      size: 3 + Math.random() * 8,
      color,
    });
  }
}

function update(dt) {
  if (state.mode === "charging") {
    state.charge = clamp(state.charge + dt / maxCharge, 0, 1);
    state.chairAngle = lerp(minBackAngle, maxBackAngle, state.charge);
    const rest = makeNoodlesAtRest();
    state.noodles.x = lerp(rest.x, 205, state.charge);
    state.noodles.y = lerp(rest.y, 292, state.charge);
    state.noodles.rot = lerp(-0.08, -0.38, state.charge);
    if (state.charge >= 1) {
      setMessage("蓄满了！", "现在松手，显示器会有点紧张");
    }
  } else if (state.mode === "recovering") {
    state.releaseTimer += dt;
    const sitUp = easeOutCubic(state.releaseTimer / 0.42);
    const snap = easeInCubic((state.releaseTimer - 0.24) / 0.24);
    state.chairAngle = lerp(maxBackAngle, minBackAngle, snap);
    state.recoil = snap * 0.8;
    state.noodles.x = lerp(205, 302, snap);
    state.noodles.y = lerp(292, 342, snap);
    state.noodles.rot = lerp(-0.38, -0.15, snap);
    if (sitUp > 0.45) {
      setMessage("椅背回弹！", "就是现在，泡面弹射");
    }
    if (state.releaseTimer >= 0.5) {
      fireNoodles();
    }
  } else if (state.mode === "launched") {
    state.noodles.vy += gravity * dt;
    state.noodles.x += state.noodles.vx * dt;
    state.noodles.y += state.noodles.vy * dt;
    state.noodles.rot += state.noodles.spin * dt;
    state.chairAngle = lerp(state.chairAngle, minBackAngle + Math.sin(performance.now() / 36) * 3, 0.16);
    if (circleRectHit(state.noodles.x, state.noodles.y, 35, target)) {
      finishHit();
    } else if (state.noodles.y > floorY - 25) {
      finishMiss("差点烫到键盘");
    } else if (state.noodles.x > W + 90 || state.noodles.y < -120) {
      finishMiss("泡面自由飞翔");
    }
  } else if (state.mode === "hit" || state.mode === "miss") {
    state.chairAngle = lerp(state.chairAngle, minBackAngle, 0.08);
  } else {
    state.chairAngle = lerp(state.chairAngle, minBackAngle, 0.1);
  }

  state.recoil = Math.max(0, state.recoil - dt * 3.4);
  state.shake = Math.max(0, state.shake - dt * 25);
  updateParticles(dt);
  updateHud();
}

function circleRectHit(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function updateParticles(dt) {
  state.particles = state.particles.filter((p) => {
    p.vy += 520 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    return p.life > 0;
  });
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.translate(shakeX, shakeY);

  if (state.artReady) {
    drawBackgroundArt();
  } else {
    drawRoom();
  }
  if (state.spritesReady) {
    drawAISceneSprites();
  } else {
    drawDesk();
    drawMonitor();
    drawChairAndPerson();
  }
  drawInteractiveTargets();
  drawNoodles();
  drawParticles();
  drawForeground();

  ctx.restore();
}

function drawBackgroundArt() {
  ctx.drawImage(backgroundArt, 0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(0, 0, W, H);
}

function drawInteractiveTargets() {
  if (!state.artReady && !state.spritesReady) return;
  ctx.save();
  ctx.globalAlpha = 0.96;
  if (!state.spritesReady) {
    drawMonitor();
  }
  if (state.mode === "charging" || state.mode === "launched") {
    drawLaunchGuide();
  }
  ctx.restore();
}

function drawAISceneSprites() {
  ctx.save();
  ctx.fillStyle = "rgba(32,36,42,0.14)";
  ctx.beginPath();
  ctx.ellipse(374, 638, 245, 28, 0, 0, Math.PI * 2);
  ctx.ellipse(1000, 638, 270, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.mode === "charging") {
    const wobble = Math.sin(performance.now() / 55) * 4 * state.charge;
    drawImageFit(sprites.gamerChair, 74 - state.charge * 22, 128 + wobble, 610, 606, -state.charge * 0.04);
  } else if (state.mode === "recovering") {
    const sitUp = easeOutCubic(state.releaseTimer / 0.42);
    const snap = easeInCubic((state.releaseTimer - 0.24) / 0.24);
    if (state.releaseTimer < 0.3) {
      drawImageFit(
        sprites.sittingChair,
        lerp(150, 126, sitUp),
        lerp(120, 138, sitUp),
        lerp(500, 532, sitUp),
        lerp(500, 532, sitUp),
        lerp(-0.08, 0.02, sitUp),
      );
    } else if (snap < 0.98) {
      drawImageFit(
        sprites.sittingChair,
        126 + Math.sin(performance.now() / 24) * 4 * snap,
        138 - snap * 10,
        532,
        532,
        0.02 + snap * 0.04,
      );
    } else {
      drawImageFit(sprites.springChair, 122 + state.recoil * 18, 158 - state.recoil * 22, 500, 500, 0.03);
    }
  } else if (state.mode === "launched") {
    drawImageFit(sprites.springChair, 118 + state.recoil * 16, 160 - state.recoil * 20, 500, 500, -0.08 + state.recoil * 0.08);
  } else {
    drawImageFit(sprites.gamerChair, 82, 132, 600, 598, 0);
  }

  const hitWobble = state.mode === "hit" ? Math.sin(performance.now() / 34) * 8 : 0;
  drawImageFit(sprites.monitorDesk, 755 + hitWobble, 292 - Math.abs(hitWobble) * 0.35, 500, 466, 0);

  if (state.mode === "hit") {
    ctx.save();
    ctx.translate(Math.sin(performance.now() / 35) * 4, Math.cos(performance.now() / 42) * 3);
    ctx.strokeStyle = "#f6fbff";
    ctx.lineWidth = 5;
    drawCrack(target.x + target.w / 2, target.y + target.h / 2);
    ctx.strokeStyle = "#ffcf4a";
    ctx.lineWidth = 3;
    drawBurst(target.x + target.w / 2, target.y + target.h / 2, 72, 13);
    ctx.restore();
  }

  ctx.restore();
}

function drawImageFit(img, x, y, w, h, rotation = 0) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rotation);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawLaunchGuide() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 207, 74, 0.72)";
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 14]);
  ctx.beginPath();
  ctx.moveTo(306, 343);
  ctx.quadraticCurveTo(622, 160, target.x + 70, target.y + 56);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffcf4a";
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(306, 343, 12 + state.charge * 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRoom() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#aee2ff");
  sky.addColorStop(0.58, "#dff6ff");
  sky.addColorStop(0.581, "#f1d6a7");
  sky.addColorStop(1, "#dfbf82");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  roundedRect(76, 72, 238, 118, 8, true);
  ctx.strokeStyle = "#2b3139";
  ctx.lineWidth = 5;
  ctx.strokeRect(76, 72, 238, 118);
  ctx.beginPath();
  ctx.moveTo(195, 72);
  ctx.lineTo(195, 190);
  ctx.moveTo(76, 131);
  ctx.lineTo(314, 131);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(0, 560, W, 24);
}

function drawDesk() {
  ctx.fillStyle = "#7b4b31";
  roundedRect(829, 461, 345, 32, 6, true);
  ctx.fillStyle = "#5b3828";
  ctx.fillRect(850, 493, 24, 118);
  ctx.fillRect(1136, 493, 24, 118);
  ctx.fillStyle = "#2b3139";
  roundedRect(930, 507, 168, 25, 7, true);
  ctx.fillStyle = "#d8edf4";
  roundedRect(947, 512, 132, 8, 4, true);
}

function drawMonitor() {
  ctx.save();
  if (state.mode === "hit") {
    ctx.translate(Math.sin(performance.now() / 35) * 4, Math.cos(performance.now() / 42) * 3);
  }
  ctx.fillStyle = "#20242a";
  roundedRect(target.x - 16, target.y - 16, target.w + 32, target.h + 32, 8, true);
  ctx.fillStyle = state.mode === "hit" ? "#252b34" : "#4aebd2";
  roundedRect(target.x, target.y, target.w, target.h, 4, true);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(target.x + 15, target.y + 16, target.w - 48, 18);

  if (state.mode === "hit") {
    ctx.strokeStyle = "#f6fbff";
    ctx.lineWidth = 5;
    drawCrack(target.x + 88, target.y + 64);
    ctx.strokeStyle = "#ffcf4a";
    ctx.lineWidth = 3;
    drawBurst(target.x + 88, target.y + 64, 58, 11);
  }

  ctx.fillStyle = "#20242a";
  ctx.fillRect(target.x + 72, target.y + target.h + 14, 33, 55);
  roundedRect(target.x + 31, target.y + target.h + 63, 116, 20, 9, true);
  ctx.restore();
}

function drawChairAndPerson() {
  drawChairBack();
  drawChairSeat();
  drawPerson();
}

function drawChairBack() {
  ctx.save();
  ctx.translate(chair.backPivotX, chair.backPivotY);
  ctx.rotate((state.chairAngle * Math.PI) / 180);
  const recoilSquash = 1 + state.recoil * 0.07;
  ctx.scale(1, recoilSquash);
  ctx.fillStyle = "#243b67";
  roundedRect(-45, -212, 91, 213, 14, true);
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 7;
  roundedRect(-45, -212, 91, 213, 14, false);
  ctx.fillStyle = "#4d8bd8";
  roundedRect(-30, -190, 61, 151, 10, true);
  ctx.restore();
}

function drawChairSeat() {
  ctx.fillStyle = "#243b67";
  roundedRect(chair.seatX - 93, chair.seatY - 15, 154, 58, 13, true);
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 7;
  roundedRect(chair.seatX - 93, chair.seatY - 15, 154, 58, 13, false);
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(chair.seatX - 4, chair.seatY + 42);
  ctx.lineTo(chair.seatX - 4, floorY - 28);
  ctx.moveTo(chair.seatX - 46, floorY - 28);
  ctx.lineTo(chair.seatX + 42, floorY - 28);
  ctx.stroke();
  ctx.fillStyle = "#20242a";
  ctx.beginPath();
  ctx.arc(chair.seatX - 53, floorY - 20, 13, 0, Math.PI * 2);
  ctx.arc(chair.seatX + 51, floorY - 20, 13, 0, Math.PI * 2);
  ctx.fill();
}

function drawPerson() {
  const stretch = state.mode === "charging" ? state.charge : state.recoil * 0.35;
  ctx.save();
  ctx.translate(0, -stretch * 10);
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.fillStyle = "#ffbd8a";
  ctx.beginPath();
  ctx.arc(414, 286 - stretch * 18, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#20242a";
  ctx.beginPath();
  ctx.arc(401, 283 - stretch * 18, 4, 0, Math.PI * 2);
  ctx.arc(426, 283 - stretch * 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d94836";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(414, 300 - stretch * 18, 13 + stretch * 5, 0.1, Math.PI - 0.1);
  ctx.stroke();

  ctx.fillStyle = "#36a3ff";
  roundedRect(370, 340 - stretch * 10, 94, 126, 22, true);
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 8;
  roundedRect(370, 340 - stretch * 10, 94, 126, 22, false);

  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(383, 356 - stretch * 12);
  ctx.lineTo(320 - stretch * 56, 305 - stretch * 38);
  ctx.moveTo(451, 354 - stretch * 12);
  ctx.lineTo(514 + stretch * 56, 302 - stretch * 36);
  ctx.stroke();

  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(388, 466);
  ctx.lineTo(355, 540);
  ctx.moveTo(445, 465);
  ctx.lineTo(500, 526);
  ctx.stroke();
  ctx.restore();
}

function drawNoodles() {
  const n = state.noodles;
  if (state.spritesReady) {
    if (state.mode !== "launched") {
      return;
    }
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rot);
    ctx.drawImage(sprites.noodles, -62, -41, 124, 82);
    ctx.restore();

    ctx.strokeStyle = "rgba(255,107,74,0.45)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(n.x - 44, n.y + 18);
    ctx.quadraticCurveTo(n.x - 82, n.y + 8, n.x - 130, n.y + 34);
    ctx.stroke();
    return;
  }

  ctx.save();
  ctx.translate(n.x, n.y);
  ctx.rotate(n.rot);
  ctx.fillStyle = "#f3483d";
  roundedRect(-38, -27, 76, 54, 8, true);
  ctx.strokeStyle = "#20242a";
  ctx.lineWidth = 5;
  roundedRect(-38, -27, 76, 54, 8, false);
  ctx.fillStyle = "#fff3be";
  ctx.fillRect(-26, -13, 52, 12);
  ctx.fillStyle = "#20242a";
  ctx.font = "900 16px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("泡面", 0, 11);
  ctx.restore();

  if (state.mode === "launched") {
    ctx.strokeStyle = "rgba(255,107,74,0.45)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(n.x - 44, n.y + 18);
    ctx.quadraticCurveTo(n.x - 82, n.y + 8, n.x - 130, n.y + 34);
    ctx.stroke();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / 0.8, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawForeground() {
  ctx.fillStyle = "rgba(32,36,42,0.13)";
  ctx.beginPath();
  ctx.ellipse(370, 628, 238, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(1005, 627, 260, 23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#20242a";
  ctx.font = "900 24px Microsoft YaHei, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`BEST ${state.best}`, 38, 675);
}

function drawCrack(x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 34, y - 38);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 46, y - 33);
  ctx.moveTo(x, y);
  ctx.lineTo(x - 44, y + 18);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 31, y + 42);
  ctx.moveTo(x + 46, y - 33);
  ctx.lineTo(x + 64, y - 22);
  ctx.moveTo(x - 44, y + 18);
  ctx.lineTo(x - 68, y + 36);
  ctx.stroke();
}

function drawBurst(x, y, radius, points) {
  ctx.beginPath();
  for (let i = 0; i < points; i += 1) {
    const a = (Math.PI * 2 * i) / points;
    ctx.moveTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18);
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.stroke();
}

function roundedRect(x, y, w, h, r, fill) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

function loop(now) {
  const dt = Math.min((now - state.lastTime) / 1000, 0.033);
  state.lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  startCharge();
});
canvas.addEventListener("pointerup", (event) => {
  event.preventDefault();
  launch();
});
canvas.addEventListener("pointercancel", launch);

chargeButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  chargeButton.setPointerCapture(event.pointerId);
  startCharge();
});
chargeButton.addEventListener("pointerup", (event) => {
  event.preventDefault();
  launch();
});
chargeButton.addEventListener("pointercancel", launch);

resetButton.addEventListener("click", resetRound);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  event.preventDefault();
  startCharge();
});

window.addEventListener("keyup", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  launch();
});

setMessage(state.messageTitle, state.messageBody);
requestAnimationFrame(loop);
