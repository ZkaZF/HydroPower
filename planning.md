# 🌊 HydroPower Estimator — Implementation Plan

## 1. Project Overview

Aplikasi web statis untuk mengestimasikan daya listrik yang dihasilkan oleh turbin air (hydropower). User memasukkan parameter input dan langsung mendapatkan output berupa estimasi daya serta visualisasi animasi sistem turbin air.

**Target Deployment:** GitHub Pages (static hosting)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 |
| Styling | Vanilla CSS3 (dark theme, glassmorphism) |
| Logic | Vanilla JavaScript (ES6+) |
| Visualization | HTML5 Canvas API (animated turbine) |
| Fonts | Google Fonts — Inter / Outfit |
| Hosting | GitHub Pages |

> [!NOTE]
> Tidak memerlukan framework, bundler, atau build step. Semua file bisa langsung di-serve sebagai static site.

---

## 3. File Structure

```
tugasKia/
├── index.html          # Halaman utama
├── style.css           # Seluruh styling
├── script.js           # Logika kalkulasi + animasi canvas
└── README.md           # Dokumentasi project
```

---

## 4. Rumus Fisika

```
P = ρ × g × Q × H × η
```

| Simbol | Deskripsi | Nilai / Input |
|--------|-----------|---------------|
| **P** | Daya listrik (Watt) | Output |
| **ρ** | Massa jenis air | 1000 kg/m³ (konstanta) |
| **g** | Percepatan gravitasi | 9.81 m/s² (konstanta) |
| **Q** | Debit air | User input (m³/detik) |
| **H** | Net Head turbin | User input (meter) |
| **η** | Efisiensi sistem | User input (%) → dikonversi ke desimal |

**Output tambahan:**
- Konversi ke Kilowatt (kW)
- Konversi ke Watt
- Kategori skala pembangkit:
  - **Pico Hydro**: < 5 kW
  - **Micro Hydro**: 5 – 100 kW
  - **Mini Hydro**: 100 – 1.000 kW
  - **Small Hydro**: 1.000 – 25.000 kW
  - **Large Hydro**: > 25.000 kW

---

## 5. UI/UX Design System

### 5.1 Color Palette (Dark Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0a1628` | Background utama |
| `--bg-card` | `#111d33` | Card background |
| `--bg-input` | `#162340` | Input field background |
| `--accent` | `#1e90ff` | Primary accent (Dodger Blue) |
| `--accent-glow` | `#1e90ff33` | Glow/shadow accent |
| `--text-primary` | `#e8edf5` | Teks utama |
| `--text-secondary` | `#8899b0` | Teks sekunder |
| `--text-muted` | `#556680` | Teks muted |
| `--border` | `#1a2d4a` | Border cards |
| `--water-blue` | `#2196F3` | Warna air animasi |
| `--turbine-gray` | `#cfd8dc` | Warna turbin |

### 5.2 Typography

- **Heading**: `Outfit` (bold, 700)
- **Body / UI**: `Inter` (regular 400, medium 500)
- **Monospace (angka)**: `JetBrains Mono`

### 5.3 Layout

- **Desktop**: 2-column grid (input kiri, output kanan)
- **Below**: Full-width canvas visualization
- **Mobile**: Single column stack
- **Max-width container**: 960px

---

## 6. Feature Specifications

### 6.1 Parameter Input (Kiri)

- 3 input fields: Debit Air (Q), Net Head (H), Efisiensi (η)
- Masing-masing dengan label, placeholder, dan unit suffix
- **Real-time calculation** — kalkulasi berjalan setiap input berubah (`oninput` event)
- Validasi: angka positif, efisiensi 0–100%
- Default values: Q=0, H=0, η=80%

### 6.2 Estimasi Output Daya (Kanan)

- **Daya Kilowatt** — angka besar dengan animasi count-up
- **Daya Watt** — konversi dalam badge
- **Kategori Skala** — badge dengan warna sesuai kategori
- Smooth transition saat angka berubah

### 6.3 Visualisasi Sistem (Bawah) — HTML5 Canvas

Animasi interaktif yang menggambarkan:

```
┌─────────────┐
│  RESERVOIR   │ ← Bendungan / waduk (biru)
│  ~~~~~~~~~~~~│
└──────┬───────┘
       │ PENSTOCK (pipa)
       │ ← Air mengalir (animated particles)
       ▼
   ┌───────┐
   │TURBINE│ ← Turbin berputar (animated rotation)
   │  ✻    │
   └───┬───┘
       │
   ┌───┴───┐
   │ GEN   │ ← Generator
   └───┬───┘
       │ ⚡
   ┌───┴───┐
   │OUTPUT │ ← Power line / lampu menyala
   └───────┘
```

**Animasi yang responsif terhadap input:**
- **Debit air** → kecepatan partikel air di penstock
- **Head** → tinggi visual penstock
- **Efisiensi** → brightness/intensitas lampu output
- **Daya** → kecepatan putaran turbin

> [!IMPORTANT]
> Animasi berjalan menggunakan `requestAnimationFrame` dan hanya aktif jika daya > 0.

### 6.4 Footer — Rumus Reference

- Menampilkan rumus `P = ρ × g × Q × H × η`
- Menampilkan nilai konstanta ρ dan g

---

## 7. Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| > 768px | 2-column grid (input + output) |
| ≤ 768px | Single column, full-width stacked |

---

## 8. Implementation Steps

### Phase 1: Foundation
1. ~~Buat planning.md~~ ✅
2. Buat `index.html` — semantic structure
3. Buat `style.css` — design system tokens + full styling
4. Buat `script.js` — kalkulasi + canvas visualization

### Phase 2: Core Logic
5. Implementasi real-time calculation engine
6. Implementasi count-up animation untuk angka
7. Implementasi kategori skala otomatis

### Phase 3: Visualization
8. Gambar scene turbin di Canvas (static)
9. Animasi partikel air mengalir
10. Animasi turbin berputar
11. Animasi responsif terhadap input values

### Phase 4: Polish
12. Responsive design testing
13. Micro-animations (hover, focus, transitions)
14. Final review + deploy instructions

---

## 9. Deployment (GitHub Pages)

```bash
# 1. Init repo
git init
git add .
git commit -m "feat: HydroPower Estimator app"

# 2. Push ke GitHub
git remote add origin https://github.com/USERNAME/tugasKia.git
git push -u origin main

# 3. Enable GitHub Pages
# Settings → Pages → Source: main branch, / (root)
```

**URL final:** `https://USERNAME.github.io/tugasKia/`

---

## 10. Preview — Expected UI Layout

```
┌──────────────────────────────────────────────────┐
│  💧 HydroPower Estimator                        │
│     Kalkulator Estimasi Daya Turbin Air          │
├────────────────────┬─────────────────────────────┤
│  ◇ Parameter Input │  ⚡ Estimasi Output Daya    │
│                    │                             │
│  Debit Air (Q)     │  Daya Listrik (Kilowatt)    │
│  [________] m³/s   │       78.48 kW              │
│                    │     ≈ 78.480 Watt            │
│  Net Head (H)      │                             │
│  [________] meter  │  Kategori Skala             │
│                    │  ┌─────────────────┐        │
│  Efisiensi (η)     │  │  Micro Hydro    │        │
│  [________] %      │  └─────────────────┘        │
├────────────────────┴─────────────────────────────┤
│  ≋ Visualisasi Sistem                            │
│  ┌───────────────────────────────────────────┐   │
│  │                                           │   │
│  │   [Animated Canvas: Water → Turbine →     │   │
│  │    Generator → Power Output]              │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│  ⚙ Rumus: P = ρ × g × Q × H × η                │
│  ρ = 1000 kg/m³  |  g = 9.81 m/s²               │
└──────────────────────────────────────────────────┘
```
