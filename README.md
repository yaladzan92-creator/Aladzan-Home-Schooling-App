<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# PPDB & Manajemen PKBM Srikandi

Frontend React/Vite yang bisa dijalankan di GitHub tanpa bergantung pada Google AI Studio.

## Fitur utama

- Pendaftaran siswa
- Konfirmasi ijazah
- Dashboard admin/guru/siswa
- Sinkronisasi Google Drive, Sheets, dan Classroom via OAuth Google
- Generator materi pembelajaran Gemini dengan fallback lokal

## Menjalankan proyek

1. Install dependensi: `npm install`
2. Jalankan mode development: `npm run dev`
3. Build production: `npm run build`

## Gemini opsional

Jika ingin generator materi AI aktif saat build frontend, set:

`VITE_GEMINI_API_KEY`

Kalau tidak diisi, app tetap berjalan dan memakai generator fallback lokal.
