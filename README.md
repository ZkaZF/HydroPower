# 💧 HydroPower Estimator

Aplikasi web statis untuk mengestimasikan daya listrik yang dihasilkan oleh turbin air (hydropower) secara real-time.

## 🌐 Live Demo

> Deploy ke GitHub Pages: `https://<username>.github.io/tugasKia/`

## ✨ Fitur

- **Kalkulasi real-time** — output berubah instan saat input diketik
- **Visualisasi animasi** — partikel air mengalir, turbin berputar, lampu menyala
- **Kategori skala otomatis** — Pico / Micro / Mini / Small / Large Hydro
- **Responsive** — desktop & mobile
- **Pure static** — HTML + CSS + JS, tanpa framework

## 📐 Rumus

```
P = ρ × g × Q × H × η
```

| Simbol | Keterangan | Nilai |
|--------|-----------|-------|
| ρ | Massa jenis air | 1000 kg/m³ |
| g | Gravitasi | 9.81 m/s² |
| Q | Debit air | Input user (m³/detik) |
| H | Net Head | Input user (meter) |
| η | Efisiensi | Input user (%) |

## 🚀 Deploy ke GitHub Pages

```bash
git init
git add .
git commit -m "feat: HydroPower Estimator"
git remote add origin https://github.com/USERNAME/tugasKia.git
git push -u origin main
```

Lalu aktifkan di: **Settings → Pages → Source: main / root**
