/* ============================================================
   HydroPower Estimator — script.js
   Logic: Real-time calc + Canvas Turbine Animation
   ============================================================ */

'use strict';

// ── Constants ──────────────────────────────────────────────
const RHO = 1000;   // kg/m³
const G   = 9.81;   // m/s²
const AVG_HOME_KW = 0.9; // average home consumption kW

// ── DOM Refs ───────────────────────────────────────────────
const inputDebit     = document.getElementById('debit');
const inputHead      = document.getElementById('head');
const inputEfisiensi = document.getElementById('efisiensi');

const outKw    = document.getElementById('output-kw');
const outWatt  = document.getElementById('output-watt');
const outMw    = document.getElementById('output-mw');
const outHomes = document.getElementById('output-homes');
const scaleBadge = document.getElementById('scale-badge');
const scaleIcon  = document.getElementById('scale-icon');
const scaleText  = document.getElementById('scale-text');

const effFill  = document.getElementById('efficiency-fill');
const effLabel = document.getElementById('efficiency-label');
const overlay  = document.getElementById('canvas-overlay');
const canvas   = document.getElementById('turbine-canvas');
const ctx      = canvas.getContext('2d');

// ── State ──────────────────────────────────────────────────
let currentKw    = 0;
let displayedKw  = 0;
let animFrameId  = null;
let turbineAngle = 0;
let particles    = [];
let lightFlicker = 0;

// ── Scale Categories ───────────────────────────────────────
const SCALES = [
  { max: 5,     cls: 'pico',  icon: '💧', label: 'Pico Hydro (< 5 kW)'      },
  { max: 100,   cls: 'micro', icon: '🌊', label: 'Micro Hydro (5–100 kW)'   },
  { max: 1000,  cls: 'mini',  icon: '⚡', label: 'Mini Hydro (100–1.000 kW)' },
  { max: 25000, cls: 'small', icon: '🏭', label: 'Small Hydro (1–25 MW)'     },
  { max: Infinity, cls: 'large', icon: '🔥', label: 'Large Hydro (> 25 MW)'  },
];

// ── Calculation ────────────────────────────────────────────
function calculate() {
  const Q   = parseFloat(inputDebit.value)     || 0;
  const H   = parseFloat(inputHead.value)      || 0;
  const eta = parseFloat(inputEfisiensi.value) || 0;

  // Clamp efficiency
  if (eta > 100) { inputEfisiensi.value = 100; }
  if (eta < 0)   { inputEfisiensi.value = 0;   }

  const etaDecimal = Math.min(Math.max(eta, 0), 100) / 100;
  const watt = RHO * G * Q * H * etaDecimal;
  currentKw  = watt / 1000;

  // Update efficiency bar
  const pct = Math.min(eta, 100);
  effFill.style.width  = pct + '%';
  effLabel.textContent = pct.toFixed(0) + '%';

  // Update output
  updateOutput(currentKw, watt);
  updateScale(currentKw);

  // Toggle overlay
  if (currentKw > 0 && Q > 0 && H > 0) {
    overlay.classList.add('hidden');
  } else {
    overlay.classList.remove('hidden');
  }
}

// ── Update Output Numbers ──────────────────────────────────
function updateOutput(kw, watt) {
  animateNumber(outKw, displayedKw, kw, 400, v => {
    displayedKw = v;
    outKw.textContent = v.toFixed(2);
    outKw.classList.remove('pulse');
    void outKw.offsetWidth; // reflow
    outKw.classList.add('pulse');
  });

  outWatt.textContent  = `≈ ${formatNumber(Math.round(watt))} Watt`;
  outMw.textContent    = (kw / 1000).toFixed(4);
  outHomes.textContent = formatNumber(Math.round(kw / AVG_HOME_KW));
}

function formatNumber(n) {
  return n.toLocaleString('id-ID');
}

function animateNumber(el, from, to, duration, cb) {
  const start = performance.now();
  const diff  = to - from;
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // easeInOut
    cb(from + diff * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Update Scale Badge ─────────────────────────────────────
function updateScale(kw) {
  if (kw <= 0) {
    scaleBadge.className = 'scale-badge';
    scaleIcon.textContent = '💧';
    scaleText.textContent = 'Masukkan data...';
    return;
  }
  const s = SCALES.find(s => kw < s.max);
  scaleBadge.className  = `scale-badge ${s.cls}`;
  scaleIcon.textContent = s.icon;
  scaleText.textContent = s.label;
}

// ============================================================
//  CANVAS ANIMATION
// ============================================================

// Canvas sizing
function resizeCanvas() {
  const W = canvas.parentElement.clientWidth;
  const H = Math.round(W * 0.42);
  canvas.width  = W;
  canvas.height = H;
}

// ── Particle System ────────────────────────────────────────
function spawnParticle(penX1, penY1, penX2, penY2) {
  const t = Math.random();
  particles.push({
    t,
    speed: 0.004 + Math.random() * 0.003,
    x: penX1 + (penX2 - penX1) * t,
    y: penY1 + (penY2 - penY1) * t,
    alpha: 0.6 + Math.random() * 0.4,
    r: 2 + Math.random() * 2,
    dx: penX2 - penX1,
    dy: penY2 - penY1,
  });
}

function updateParticles() {
  particles = particles.filter(p => p.t <= 1);
  particles.forEach(p => {
    p.t += p.speed;
    p.x += p.dx * p.speed;
    p.y += p.dy * p.speed;
    p.alpha -= 0.008;
  });
}

// ── Main Draw ──────────────────────────────────────────────
function draw() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const Q   = parseFloat(inputDebit.value)     || 0;
  const H_  = parseFloat(inputHead.value)      || 0;
  const eta = parseFloat(inputEfisiensi.value) || 0;
  const kw  = currentKw;
  const active = kw > 0 && Q > 0 && H_ > 0;

  // ─ Background gradient ─
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#060f1e');
  bgGrad.addColorStop(1, '#08111f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ─ Layout geometry ─
  const res = {
    x: W * 0.08, y: H * 0.05,
    w: W * 0.2,  h: H * 0.35,
  };
  const penX1 = res.x + res.w;
  const penY1 = res.y + res.h * 0.5;
  const turbX  = W * 0.55;
  const turbY  = H * 0.62;
  const penX2  = turbX - 28;
  const penY2  = turbY;
  const genX   = turbX + 60;
  const genY   = turbY - 10;
  const outX   = W * 0.84;
  const outY   = turbY - 10;

  // ─ Draw terrain / ground ─
  ctx.fillStyle = '#0d1e30';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.72);
  ctx.lineTo(W * 0.42, H * 0.72);
  ctx.lineTo(W * 0.42, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Ground right side
  ctx.fillStyle = '#0d1e30';
  ctx.fillRect(W * 0.44, H * 0.72, W * 0.56, H * 0.28);

  // ─ Draw Dam / Reservoir ─
  // Dam wall
  ctx.fillStyle = '#1a2d4a';
  ctx.beginPath();
  ctx.roundRect(res.x - 14, res.y - 4, 16, res.h + 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#2a4060';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Water in reservoir
  const waterLevel = active ? 0.75 : 0.5;
  const waterGrad = ctx.createLinearGradient(res.x, res.y, res.x, res.y + res.h);
  waterGrad.addColorStop(0, `rgba(33,150,243,${0.2 + waterLevel * 0.2})`);
  waterGrad.addColorStop(1, `rgba(21,101,192,${0.6 + waterLevel * 0.3})`);

  ctx.fillStyle = waterGrad;
  ctx.fillRect(res.x, res.y + res.h * (1 - waterLevel), res.w, res.h * waterLevel);

  // Reservoir box border
  ctx.strokeStyle = 'rgba(30,144,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(res.x, res.y, res.w, res.h);

  // Water surface ripple
  if (active) {
    const rippleY = res.y + res.h * (1 - waterLevel);
    ctx.strokeStyle = 'rgba(100,181,246,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const off = ((Date.now() / 600 + i * 0.8) % 1) * res.w;
      ctx.beginPath();
      ctx.moveTo(res.x + off, rippleY + 3);
      ctx.quadraticCurveTo(res.x + off + 10, rippleY, res.x + off + 20, rippleY + 3);
      ctx.stroke();
    }
  }

  // Label
  drawLabel(ctx, res.x + res.w / 2, res.y - 10, 'Reservoir', '#7db8e0', 10);

  // ─ Penstock (pipe) ─
  // Pipe shadow
  ctx.save();
  ctx.shadowColor = 'rgba(30,144,255,0.3)';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = '#1a2d55';
  ctx.lineWidth   = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(penX1, penY1);
  ctx.lineTo(penX2, penY2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = '#2a3f6a';
  ctx.lineWidth   = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(penX1, penY1);
  ctx.lineTo(penX2, penY2);
  ctx.stroke();

  // Pipe highlight
  ctx.strokeStyle = 'rgba(80,130,200,0.3)';
  ctx.lineWidth   = 4;
  ctx.beginPath();
  ctx.moveTo(penX1 - 3, penY1 - 3);
  ctx.lineTo(penX2 - 3, penY2 - 3);
  ctx.stroke();

  drawLabel(ctx, (penX1 + penX2) / 2 - 10, (penY1 + penY2) / 2 - 14, 'Penstock', '#5c7ab0', 9);

  // ─ Water particles ─
  if (active) {
    const speed = Math.min(Q / 5, 1);
    if (Math.random() < 0.3 + speed * 0.5) {
      spawnParticle(penX1, penY1, penX2, penY2);
    }
    updateParticles();

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,181,246,${Math.max(0, p.alpha)})`;
      ctx.fill();
    });
  } else {
    particles = [];
  }

  // ─ Turbine ─
  drawTurbine(turbX, turbY, 30, active, kw);

  // ─ Connector turbine → generator ─
  ctx.strokeStyle = '#2a3f6a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(turbX + 30, turbY);
  ctx.lineTo(genX - 18, genY + 15);
  ctx.stroke();

  // ─ Generator ─
  drawGenerator(genX, genY, active, eta);

  // ─ Power line → output ─
  ctx.strokeStyle = active ? 'rgba(105,240,174,0.5)' : '#1a2d40';
  ctx.lineWidth   = active ? 2.5 : 2;
  ctx.setLineDash(active ? [6, 4] : []);
  ctx.beginPath();
  ctx.moveTo(genX + 22, genY + 14);
  ctx.lineTo(outX - 22, outY + 14);
  ctx.stroke();
  ctx.setLineDash([]);

  // ─ Output / Bulb ─
  drawOutput(outX, outY, active, kw);

  // ─ Flow arrows ─
  if (active) {
    drawFlowArrow(ctx, (penX1 + penX2) / 2, (penY1 + penY2) / 2, penX2 - penX1, penY2 - penY1);
  }

  // ─ Turbin angle update ─
  const rpm = active ? Math.min(kw * 2, 200) : 0;
  turbineAngle += (rpm / 60) * (Math.PI * 2) * (1 / 60);

  animFrameId = requestAnimationFrame(draw);
}

// ── Draw Turbine ───────────────────────────────────────────
function drawTurbine(cx, cy, r, active, kw) {
  const blades = 8;

  ctx.save();
  ctx.translate(cx, cy);

  // Turbine housing
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2d4a';
  ctx.fill();
  ctx.strokeStyle = active ? 'rgba(30,144,255,0.5)' : '#2a3f60';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Glow if active
  if (active) {
    ctx.shadowColor = 'rgba(30,144,255,0.5)';
    ctx.shadowBlur  = 16;
  }

  // Blades
  ctx.rotate(turbineAngle);
  for (let i = 0; i < blades; i++) {
    ctx.rotate((Math.PI * 2) / blades);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.ellipse(r * 0.55, 0, r * 0.5, r * 0.14, 0, 0, Math.PI * 2);
    const bladeGrad = ctx.createLinearGradient(0, 0, r, 0);
    bladeGrad.addColorStop(0, '#cfd8dc');
    bladeGrad.addColorStop(1, '#90a4ae');
    ctx.fillStyle = bladeGrad;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Center hub
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#37474f';
  ctx.fill();
  ctx.strokeStyle = '#607d8b';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  drawLabel(ctx, cx, cy + r + 22, 'Turbin', '#90a4ae', 9);
}

// ── Draw Generator ─────────────────────────────────────────
function drawGenerator(cx, cy, active, eta) {
  const w = 44, h = 30;
  ctx.save();
  ctx.translate(cx, cy);

  // Box
  ctx.beginPath();
  ctx.roundRect(-w / 2, 0, w, h, 5);
  ctx.fillStyle = active ? '#1a3020' : '#1a2030';
  ctx.fill();
  ctx.strokeStyle = active ? 'rgba(105,240,174,0.5)' : '#2a3f60';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (active) {
    ctx.shadowColor = 'rgba(105,240,174,0.4)';
    ctx.shadowBlur  = 12;
  }

  // "G" label
  ctx.font = 'bold 13px Outfit, sans-serif';
  ctx.fillStyle = active ? '#69f0ae' : '#607d8b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', 0, h / 2);
  ctx.shadowBlur = 0;

  // Efficiency indicator dots
  const dots = 5;
  const filled = Math.round((eta / 100) * dots);
  for (let i = 0; i < dots; i++) {
    ctx.beginPath();
    ctx.arc(-10 + i * 5, h + 8, 2, 0, Math.PI * 2);
    ctx.fillStyle = i < filled ? '#69f0ae' : '#1a2d3a';
    ctx.fill();
  }

  ctx.restore();
  drawLabel(ctx, cx, cy + 46, 'Generator', '#69f0ae', 9);
}

// ── Draw Output Bulb ───────────────────────────────────────
function drawOutput(cx, cy, active, kw) {
  ctx.save();
  ctx.translate(cx, cy);

  const brightness = active ? Math.min(kw / 100, 1) : 0;
  lightFlicker = active ? lightFlicker + 0.05 : 0;
  const flicker = active ? 0.92 + Math.sin(lightFlicker * 7.3) * 0.08 : 0;
  const alpha   = brightness * flicker;

  // Glow
  if (active && alpha > 0) {
    const glowGrad = ctx.createRadialGradient(0, 18, 0, 0, 18, 55);
    glowGrad.addColorStop(0, `rgba(255,235,100,${alpha * 0.6})`);
    glowGrad.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-55, -20, 110, 90);
  }

  // Bulb glass
  ctx.beginPath();
  ctx.arc(0, 14, 18, 0, Math.PI * 2);
  const bulbColor = active
    ? `rgba(255,235,100,${0.15 + alpha * 0.7})`
    : 'rgba(30,60,90,0.6)';
  ctx.fillStyle = bulbColor;
  ctx.fill();
  ctx.strokeStyle = active
    ? `rgba(255,220,60,${0.4 + alpha * 0.6})`
    : 'rgba(30,80,120,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Filament
  ctx.strokeStyle = active ? `rgba(255,200,50,${0.5 + alpha * 0.5})` : '#1a3050';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, 14);
  ctx.quadraticCurveTo(0, 8, 5, 14);
  ctx.stroke();

  // Base
  ctx.fillStyle = '#2a3f5a';
  ctx.fillRect(-10, 30, 20, 8);
  ctx.fillRect(-7,  38, 14, 5);

  // Lightning bolt if active
  if (active && alpha > 0.3) {
    ctx.fillStyle = `rgba(255,235,100,${alpha})`;
    ctx.font = `bold ${12 + Math.round(alpha * 4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 14);
  }

  ctx.restore();
  drawLabel(ctx, cx, cy + 56, 'Output Listrik', '#ffc107', 9);
}

// ── Helpers ────────────────────────────────────────────────
function drawLabel(ctx, x, y, text, color, size) {
  ctx.font      = `${size}px Inter, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

function drawFlowArrow(ctx, x, y, dx, dy) {
  const len  = Math.hypot(dx, dy);
  const ux   = dx / len;
  const uy   = dy / len;
  const size = 7;

  ctx.save();
  ctx.translate(x + ux * 10, y + uy * 10);
  ctx.rotate(Math.atan2(uy, ux));
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size, -size * 0.6);
  ctx.lineTo(-size, size * 0.6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(100,181,246,0.7)';
  ctx.fill();
  ctx.restore();
}

// ============================================================
//  INIT
// ============================================================
function init() {
  // Set default efficiency
  inputEfisiensi.value = '80';

  // Resize canvas
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // Input events
  [inputDebit, inputHead, inputEfisiensi].forEach(el => {
    el.addEventListener('input', calculate);
  });

  // Initial calc
  calculate();

  // Start render loop
  draw();
}

document.addEventListener('DOMContentLoaded', init);
