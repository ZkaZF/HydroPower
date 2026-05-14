/* ============================================================
   HydroPower Estimator — script.js
   ============================================================ */
'use strict';

const RHO = 1000;
const G   = 9.81;
const AVG_HOME_KW = 0.9;

// DOM
const inputDebit     = document.getElementById('debit');
const inputHead      = document.getElementById('head');
const inputEfisiensi = document.getElementById('efisiensi');
const outKw          = document.getElementById('output-kw');
const outWatt        = document.getElementById('output-watt');
const outMw          = document.getElementById('output-mw');
const outHomes       = document.getElementById('output-homes');
const scaleBadge     = document.getElementById('scale-badge');
const scaleIcon      = document.getElementById('scale-icon');
const scaleText      = document.getElementById('scale-text');
const effFill        = document.getElementById('efficiency-fill');
const effLabel       = document.getElementById('efficiency-label');
const overlay        = document.getElementById('canvas-overlay');
const canvas         = document.getElementById('turbine-canvas');
const ctx            = canvas.getContext('2d');

// State
let currentKw    = 0;
let displayedKw  = 0;
let turbineAngle = 0;
let particles    = [];
let time         = 0;

// Params exposed for canvas
let paramQ   = 0; // 0-1 normalized
let paramH   = 0; // 0-1 normalized
let paramEta = 0; // 0-1

const SCALES = [
  { max: 5,        cls: 'pico',  icon: '💧', label: 'Pico Hydro (< 5 kW)'       },
  { max: 100,      cls: 'micro', icon: '🌊', label: 'Micro Hydro (5 – 100 kW)'  },
  { max: 1000,     cls: 'mini',  icon: '⚡', label: 'Mini Hydro (100 – 1.000 kW)'},
  { max: 25000,    cls: 'small', icon: '🏭', label: 'Small Hydro (1 – 25 MW)'   },
  { max: Infinity, cls: 'large', icon: '🔥', label: 'Large Hydro (> 25 MW)'     },
];

// ── Calculation ────────────────────────────────────────────
function calculate() {
  const Q   = Math.max(parseFloat(inputDebit.value)     || 0, 0);
  const H   = Math.max(parseFloat(inputHead.value)      || 0, 0);
  let   eta = parseFloat(inputEfisiensi.value) || 0;
  eta = Math.min(Math.max(eta, 0), 100);

  // Normalize params for animation (clamp to sensible max)
  paramQ   = Math.min(Q / 20, 1);       // max reference 20 m³/s
  paramH   = Math.min(H / 200, 1);      // max reference 200 m
  paramEta = eta / 100;

  effFill.style.width  = eta + '%';
  effLabel.textContent = eta.toFixed(0) + '%';

  const watt = RHO * G * Q * H * (eta / 100);
  currentKw  = watt / 1000;

  animateNumber(displayedKw, currentKw, 450, v => {
    displayedKw = v;
    outKw.textContent = v.toFixed(2);
  });

  outKw.classList.remove('pulse');
  void outKw.offsetWidth;
  outKw.classList.add('pulse');

  outWatt.textContent  = `≈ ${fmt(Math.round(watt))} Watt`;
  outMw.textContent    = (currentKw / 1000).toFixed(4);
  outHomes.textContent = fmt(Math.round(currentKw / AVG_HOME_KW));

  updateScale(currentKw);

  const active = currentKw > 0 && Q > 0 && H > 0;
  overlay.classList.toggle('hidden', active);
}

function fmt(n) { return n.toLocaleString('id-ID'); }

function animateNumber(from, to, dur, cb) {
  const start = performance.now();
  const diff  = to - from;
  (function step(now) {
    const t = Math.min((now - start) / dur, 1);
    const e = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    cb(from + diff * e);
    if (t < 1) requestAnimationFrame(step);
  })(performance.now());
}

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
//  CANVAS
// ============================================================
function resizeCanvas() {
  canvas.width  = canvas.parentElement.clientWidth;
  canvas.height = Math.round(canvas.width * 0.44);
}

// ── Geometry helpers ──
function getLayout() {
  const W = canvas.width, H = canvas.height;
  // Reservoir: height changes with paramH
  const resH   = H * (0.25 + paramH * 0.35);       // taller = higher head
  const resW   = W * 0.16;
  const resX   = W * 0.08;
  const resY   = H * 0.08;

  // Turbine position (fixed bottom-center-ish)
  const turbX  = W * 0.56;
  const turbY  = H * 0.64;

  // Penstock exit from reservoir bottom-right corner
  const penX1  = resX + resW;
  const penY1  = resY + resH;           // always from bottom of reservoir
  const penX2  = turbX - 30;
  const penY2  = turbY;

  // Generator & output
  const genX   = turbX + 68;
  const genY   = turbY - 14;
  const outX   = W * 0.85;
  const outY   = turbY - 14;

  return { W, H, resX, resY, resW, resH, penX1, penY1, penX2, penY2, turbX, turbY, genX, genY, outX, outY };
}

// ── Particle management ──
function spawnParticle(l) {
  // Spawn near top of penstock
  const t = Math.random() * 0.3; // only spawn in top 30% of pipe
  const dx = l.penX2 - l.penX1;
  const dy = l.penY2 - l.penY1;
  // speed scales strongly with Q
  const speed = (0.006 + paramQ * 0.022) * (0.8 + Math.random() * 0.4);
  particles.push({
    t,
    speed,
    x: l.penX1 + dx * t,
    y: l.penY1 + dy * t,
    dx, dy,
    len: Math.hypot(dx, dy),
    alpha: 0.7 + Math.random() * 0.3,
    r: 2 + paramQ * 3.5 + Math.random() * 1.5, // bigger with higher Q
  });
}

function updateParticles(l) {
  for (const p of particles) {
    p.t     += p.speed;
    p.x     += p.dx * p.speed;
    p.y     += p.dy * p.speed;
    p.alpha -= 0.012;
  }
  particles = particles.filter(p => p.t <= 1 && p.alpha > 0);
}

// ── Main draw loop ──
function draw() {
  time += 0.016;
  const l = getLayout();
  const { W, H } = l;
  const active = currentKw > 0 && paramQ > 0;

  // Turbine RPM: very dramatic change — 0 kW = stopped, scales fast
  const rpm = active ? Math.min(currentKw * 3.5, 360) : 0;
  turbineAngle += (rpm / 60) * (Math.PI * 2) / 60;

  ctx.clearRect(0, 0, W, H);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#060f1e');
  bg.addColorStop(1, '#08111f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawGround(l);
  drawReservoir(l, active);
  drawPenstock(l);
  if (active) {
    // Spawn rate scales with Q
    const spawnRate = 0.15 + paramQ * 0.75;
    if (Math.random() < spawnRate) spawnParticle(l);
    updateParticles(l);
    drawParticles();
  } else {
    particles = [];
  }
  drawTurbine(l, active);
  drawShaft(l, active);
  drawGenerator(l, active);
  drawPowerLine(l, active);
  drawBulb(l, active);
  drawLabels(l);

  requestAnimationFrame(draw);
}

function drawGround(l) {
  const { W, H } = l;
  // Left ground (under reservoir)
  ctx.fillStyle = '#0c1e30';
  ctx.fillRect(0, H * 0.75, W * 0.48, H * 0.25);
  // Right ground
  ctx.fillStyle = '#0c1e30';
  ctx.fillRect(W * 0.48, H * 0.75, W * 0.52, H * 0.25);
  // Ground line
  ctx.strokeStyle = '#1a2d45';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.75);
  ctx.lineTo(W, H * 0.75);
  ctx.stroke();
}

function drawReservoir(l, active) {
  const { resX, resY, resW, resH } = l;

  // Dam wall left
  ctx.fillStyle = '#1c3050';
  ctx.fillRect(resX - 14, resY - 6, 14, resH + 12);
  ctx.strokeStyle = '#2a4060';
  ctx.lineWidth = 1;
  ctx.strokeRect(resX - 14, resY - 6, 14, resH + 12);

  // Water fill — level scales with H (higher head → fuller reservoir)
  const waterFrac = 0.35 + paramH * 0.6;
  const waterTop  = resY + resH * (1 - waterFrac);

  const wg = ctx.createLinearGradient(resX, waterTop, resX, resY + resH);
  wg.addColorStop(0, `rgba(33,150,243,${0.3 + paramH * 0.3})`);
  wg.addColorStop(1, `rgba(13,71,161,${0.7 + paramH * 0.25})`);
  ctx.fillStyle = wg;
  ctx.fillRect(resX, waterTop, resW, resY + resH - waterTop);

  // Reservoir border
  ctx.strokeStyle = 'rgba(30,144,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(resX, resY, resW, resH);

  // Water surface ripples — speed scales with Q
  if (active && paramQ > 0) {
    ctx.strokeStyle = `rgba(100,181,246,${0.3 + paramQ * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const off = ((time * (0.8 + paramQ * 2) + i * 0.9) % 1) * resW;
      ctx.beginPath();
      ctx.moveTo(resX + off, waterTop + 3);
      ctx.quadraticCurveTo(resX + off + 9, waterTop, resX + off + 18, waterTop + 3);
      ctx.stroke();
    }
  }

  // Head label on dam wall
  if (paramH > 0) {
    const hVal = parseFloat(inputHead.value) || 0;
    ctx.save();
    ctx.strokeStyle = 'rgba(30,144,255,0.5)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(resX - 22, waterTop);
    ctx.lineTo(resX - 22, resY + resH);
    ctx.stroke();
    // Arrow tips
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(30,144,255,0.7)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`H=${hVal}m`, resX - 26, (waterTop + resY + resH) / 2);
    ctx.restore();
  }
}

function drawPenstock(l) {
  const { penX1, penY1, penX2, penY2 } = l;

  // Pipe shadow
  ctx.strokeStyle = '#0d1a2d';
  ctx.lineWidth   = 20;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(penX1, penY1);
  ctx.lineTo(penX2, penY2);
  ctx.stroke();

  // Pipe body — width slightly scales with Q
  const pipeW = 10 + paramQ * 5;
  ctx.strokeStyle = '#1e3555';
  ctx.lineWidth   = pipeW;
  ctx.beginPath();
  ctx.moveTo(penX1, penY1);
  ctx.lineTo(penX2, penY2);
  ctx.stroke();

  // Pipe highlight
  ctx.strokeStyle = 'rgba(60,110,180,0.35)';
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.moveTo(penX1 - 3, penY1 - 3);
  ctx.lineTo(penX2 - 3, penY2 - 3);
  ctx.stroke();

  ctx.lineCap = 'butt';
}

function drawParticles() {
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,181,246,${Math.max(0, p.alpha)})`;
    ctx.fill();
  }
}

function drawTurbine(l, active) {
  const { turbX, turbY } = l;
  const r = 34;

  ctx.save();
  ctx.translate(turbX, turbY);

  // Housing glow — brightness scales with power
  if (active) {
    const glowAlpha = 0.2 + Math.min(currentKw / 500, 0.6);
    ctx.shadowColor = `rgba(30,144,255,${glowAlpha})`;
    ctx.shadowBlur  = 8 + Math.min(currentKw / 50, 20);
  }

  // Housing ring
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#112030';
  ctx.fill();
  ctx.strokeStyle = active ? `rgba(30,144,255,${0.3 + paramQ * 0.5})` : '#1e3550';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // Blades — rotate fast when high power
  ctx.rotate(turbineAngle);
  const blades = 8;
  for (let i = 0; i < blades; i++) {
    ctx.rotate((Math.PI * 2) / blades);
    ctx.beginPath();
    ctx.ellipse(r * 0.52, 0, r * 0.48, r * 0.13, 0, 0, Math.PI * 2);
    const bg = ctx.createLinearGradient(0, 0, r, 0);
    const brightness = active ? (160 + Math.round(paramEta * 70)) : 100;
    bg.addColorStop(0, `rgb(${brightness+30},${brightness+40},${brightness+50})`);
    bg.addColorStop(1, `rgb(${brightness-20},${brightness-10},${brightness})`);
    ctx.fillStyle = bg;
    ctx.fill();
  }

  // Hub
  ctx.rotate(0);
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#2a5080' : '#263545';
  ctx.fill();
  ctx.strokeStyle = active ? '#5090c0' : '#3a5060';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // RPM indicator text
  if (active) {
    const rpm = Math.min(currentKw * 3.5, 360);
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(30,144,255,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(rpm)} RPM`, turbX, turbY + r + 18);
  }
}

function drawShaft(l, active) {
  const { turbX, turbY, genX, genY } = l;
  ctx.strokeStyle = active ? '#2a5080' : '#1e3040';
  ctx.lineWidth   = 7;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(turbX + 34, turbY);
  ctx.lineTo(genX - 16, genY + 16);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Rotation indicator dots on shaft if active
  if (active) {
    const dotT = (time * (0.5 + paramQ)) % 1;
    const dx = genX - 16 - (turbX + 34);
    const dy = genY + 16 - turbY;
    ctx.beginPath();
    ctx.arc(turbX + 34 + dx * dotT, turbY + dy * dotT, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(30,144,255,${0.4 + paramEta * 0.5})`;
    ctx.fill();
  }
}

function drawGenerator(l, active) {
  const { genX, genY } = l;
  const w = 48, h = 32;

  ctx.save();
  ctx.translate(genX, genY);

  if (active) {
    ctx.shadowColor = `rgba(105,240,174,${0.2 + paramEta * 0.6})`;
    ctx.shadowBlur  = 6 + paramEta * 18;
  }

  // Box
  ctx.beginPath();
  ctx.roundRect(-w / 2, 0, w, h, 5);
  ctx.fillStyle = active
    ? `rgba(${Math.round(15 + paramEta * 10)},${Math.round(40 + paramEta * 30)},${Math.round(30 + paramEta * 15)},1)`
    : '#112030';
  ctx.fill();
  ctx.strokeStyle = active
    ? `rgba(105,240,174,${0.25 + paramEta * 0.65})`
    : '#1e3040';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // "G" label
  ctx.font = `bold 15px Outfit, sans-serif`;
  ctx.fillStyle = active ? `rgba(105,240,174,${0.5 + paramEta * 0.5})` : '#3a5060';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', 0, h / 2);

  // Efficiency dots
  const dots = 5;
  const filled = Math.round(paramEta * dots);
  for (let i = 0; i < dots; i++) {
    ctx.beginPath();
    ctx.arc(-10 + i * 5, h + 9, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = i < filled ? `rgba(105,240,174,${0.5 + paramEta * 0.5})` : '#1a2d3a';
    ctx.fill();
  }

  ctx.restore();
  lbl(ctx, genX, genY + 50, 'Generator', `rgba(105,240,174,${0.4 + paramEta * 0.5})`);
}

function drawPowerLine(l, active) {
  const { genX, genY, outX, outY } = l;
  if (!active) return;

  // Animated dashes — speed scales with power
  const dashSpeed = 0.3 + Math.min(currentKw / 200, 2.5);
  const offset    = (time * dashSpeed * 20) % 20;

  ctx.save();
  ctx.strokeStyle = `rgba(105,240,174,${0.3 + paramEta * 0.5})`;
  ctx.lineWidth   = 2;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -offset;
  ctx.beginPath();
  ctx.moveTo(genX + 24, genY + 16);
  ctx.lineTo(outX - 22, outY + 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBulb(l, active) {
  const { outX, outY } = l;

  // brightness: combined effect of power AND efficiency
  const brightness = active ? Math.min((currentKw / 100) * 0.6 + paramEta * 0.4, 1) : 0;
  const flicker    = active ? 0.93 + Math.sin(time * 11.3) * 0.07 : 0;
  const alpha      = brightness * flicker;

  ctx.save();
  ctx.translate(outX, outY);

  // Glow halo — very obvious when bright
  if (active && alpha > 0.05) {
    const gr = ctx.createRadialGradient(0, 18, 0, 0, 18, 55 + alpha * 30);
    gr.addColorStop(0, `rgba(255,230,80,${alpha * 0.65})`);
    gr.addColorStop(0.5, `rgba(255,200,50,${alpha * 0.2})`);
    gr.addColorStop(1, 'rgba(255,180,30,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(-60, -20, 120, 100);
  }

  // Glass
  ctx.beginPath();
  ctx.arc(0, 16, 18, 0, Math.PI * 2);
  ctx.fillStyle = active
    ? `rgba(255,235,100,${0.08 + alpha * 0.82})`
    : 'rgba(20,40,65,0.6)';
  ctx.fill();
  ctx.strokeStyle = active
    ? `rgba(255,215,50,${0.3 + alpha * 0.7})`
    : 'rgba(20,60,100,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Filament
  ctx.strokeStyle = active ? `rgba(255,200,50,${0.4 + alpha * 0.6})` : '#0f2035';
  ctx.lineWidth   = 1.8;
  ctx.beginPath();
  ctx.moveTo(-5, 16); ctx.quadraticCurveTo(0, 9, 5, 16);
  ctx.stroke();

  // Base
  ctx.fillStyle = '#1a3050';
  ctx.fillRect(-11, 32, 22, 8);
  ctx.fillRect(-8,  40, 16, 5);

  // Power number above bulb
  if (active && currentKw > 0) {
    ctx.font = `bold ${9 + Math.round(alpha * 4)}px JetBrains Mono, monospace`;
    ctx.fillStyle = `rgba(255,230,80,${0.5 + alpha * 0.5})`;
    ctx.textAlign = 'center';
    ctx.fillText(`${currentKw.toFixed(1)} kW`, 0, -8);
  }

  ctx.restore();
  lbl(ctx, outX, outY + 54, 'Output Listrik', `rgba(255,193,7,${0.4 + alpha * 0.6})`);
}

function drawLabels(l) {
  const { resX, resY, resW, resH, penX1, penY1, penX2, penY2, turbX, turbY } = l;
  lbl(ctx, resX + resW / 2, resY - 14, 'Reservoir', '#7db8e0');

  // Q label on penstock mid
  const mx = (penX1 + penX2) / 2, my = (penY1 + penY2) / 2;
  if (paramQ > 0) {
    const qVal = parseFloat(inputDebit.value) || 0;
    lbl(ctx, mx + 4, my - 16, `Q = ${qVal} m³/s`, `rgba(100,181,246,${0.4 + paramQ * 0.5})`);
  }
  lbl(ctx, turbX, turbY + 44, 'Turbin', '#8eaabe');
}

function lbl(ctx, x, y, text, color, size = 9) {
  ctx.font          = `${size}px Inter, sans-serif`;
  ctx.fillStyle     = color;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'top';
  ctx.fillText(text, x, y);
}

// ============================================================
//  INIT
// ============================================================
function init() {
  inputEfisiensi.value = '80';
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); });
  [inputDebit, inputHead, inputEfisiensi].forEach(el => el.addEventListener('input', calculate));
  calculate();
  draw();
}

document.addEventListener('DOMContentLoaded', init);
