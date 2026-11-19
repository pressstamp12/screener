# Mode D Screener (PWA)

Aplikasi PWA screening saham rebound harian (IDX / `.JK`) bergaya santai, mobile-first, dan dirancang khusus untuk trader modal kecil di Indonesia.

## Fitur Utama
1. **Screening Hari Ini**: Filter Range Harga (default `Rp 100 - 3.500`), Filter Syariah / Non-Syariah (`data/syariah-list.ts`), Input Modal (default `Rp 500.000` untuk hitung lot), Analisa Mode D otomatis (Drop ≥8% dari High 20H, Dekat Support 20H ≤4%, RSI 14 di 28-48, Volume >1.2x), dan Skor Rebound 0-100.
2. **Watchlist Saya**: Simpan saham incaran, atur Harga Beli Rencana, Target (TP), Cut Loss (SL), Lot, dan Modal. Otomatis hitung Estimasi Untung, Estimasi Rugi, Risk/Reward Ratio, plus tombol **Cek Harga Terbaru**.
3. **Jurnal / Riwayat**: Catat hasil trade (Ticker, Entry, Exit, Lot, Alasan Masuk) ke Supabase dan pantau Total Trade, Win Rate %, serta Total Profit/Loss.
4. **PWA Ready**: Dark mode satu tangan, bisa **Add to Homescreen**, dan punya offline fallback *"Kamu offline, data terakhir tanggal X"*.

---

## Panduan Setup & Deploy (5 Langkah Mudah)

### 1. Buat Project Supabase
1. Buka [https://supabase.com](https://supabase.com) lalu login / daftar gratis.
2. Klik **New Project**, isi nama project (misal `mode-d-screener`), buat password database, pilih region **Singapore (`ap-southeast-1`)**, lalu klik **Create new project**.
3. Tunggu sekitar 1-2 menit sampai project siap.
4. Buka menu **Project Settings** (ikon gerigi kiri bawah) → **API**.
5. Catat dua nilai penting ini:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon / public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 2. Copy & Jalankan SQL
1. Di dashboard Supabase, klik menu **SQL Editor** di sidebar kiri → klik **New query**.
2. Buka file `supabase/schema.sql` dari project ini, copy seluruh isinya.
3. Paste ke SQL Editor Supabase, lalu klik tombol **Run** (Ctrl+Enter).
4. Pastikan muncul pesan `Success. No rows returned`. Cek menu **Table Editor** untuk memastikan tabel `screening_results`, `watchlist`, dan `trades` sudah terbuat.

### 3. Push ke GitHub
1. Buat repository baru di [https://github.com/new](https://github.com/new) (misal nama repo `mode-d-screener`).
2. Extract file ZIP ini di komputer kamu, buka terminal di dalam folder `mode-d-screener`, lalu jalankan:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Mode D Screener PWA"
   git branch -M main
   git remote add origin https://github.com/USERNAME_KAMU/mode-d-screener.git
   git push -u origin main
   ```

### 4. Deploy ke Vercel
1. Buka [https://vercel.com](https://vercel.com) dan login dengan akun GitHub kamu.
2. Klik **Add New...** → **Project**, lalu pilih repo `mode-d-screener`.
3. Buka bagian **Environment Variables**, lalu tambahkan 2 variabel ini:
   - `NEXT_PUBLIC_SUPABASE_URL` = *(Project URL dari Langkah 1)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(anon public key dari Langkah 1)*
4. Klik **Deploy** dan tunggu ~1 menit. Aplikasi langsung online!

### 5. Add to Homescreen (Pasang di HP Seperti Aplikasi)
- **Android (Chrome)**:
  1. Buka link Vercel kamu di Chrome.
  2. Tap ikon titik tiga (`⋮`) di pojok kanan atas.
  3. Pilih **Tambahkan ke layar utama** / **Install app** → tap **Install**.
- **iPhone / iOS (Safari)**:
  1. Buka link Vercel kamu di Safari.
  2. Tap tombol **Share** (ikon kotak dengan panah ke atas di tengah bawah).
  3. Scroll ke bawah lalu pilih **Add to Home Screen** → tap **Add**.

---

## Menjalankan Secara Lokal (Opsional)
```bash
cp .env.example .env.local
# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
npm install
npm run dev
```
Buka `http://localhost:3000`.
