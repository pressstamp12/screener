# Screener IDX v2 — Day Trade & Rebound

Screener saham IDX pribadi (PWA) dengan skor multi-faktor, rencana trade otomatis, dan **backtest yang memakai logika skor yang sama persis**, supaya akurasinya bisa diukur, bukan ditebak.

## Isi aplikasi

| Halaman | Fungsi |
|---|---|
| **Screener** | Scan ±100 saham likuid. Dua strategi: **Day Trade** (momentum intraday) dan **Rebound** (pantulan dari support). Tiap saham dapat skor 0–100, alasan per faktor, peringatan, rencana Entry/Cut loss/TP1/TP2, ukuran lot sesuai risiko, berita 7 hari, dan win rate historis dari backtest. |
| **Watchlist** | Rencana yang dipantau + harga terkini, status (kena SL / TP), P/L bersih. Satu ketukan untuk memindahkan ke jurnal. |
| **Jurnal** | Catatan trade nyata: win rate, profit factor, rata-rata R, P/L setelah biaya. |
| **Backtest** | Uji 2 tahun data harian atau 60 hari data 5 menit. Hasil per rentang skor dan per faktor; otomatis jadi kalibrasi di kartu screener. |
| **Atur** | Modal, risiko per trade, biaya broker, batas likuiditas, auto-refresh, daftar saham. |

### Faktor yang dinilai

**Day Trade (sesi berjalan):** tren harian (EMA20/50 + kemiringan), **RVOL yang disesuaikan jam** (volume hari ini dibanding porsi volume yang normalnya sudah terjadi pada jam yang sama, dari profil intraday 5 hari), posisi terhadap **VWAP**, breakout **opening range 15 menit** & dekat high hari ini, momentum 5 menit (EMA9/21, RSI), RSI harian, ATR%, ruang ke resistance, MACD.
**Day Trade (pasar tutup):** menilai setup untuk sesi berikutnya — close dekat high, breakout high 20 hari, momentum, volume.
**Rebound:** RSI Wilder oversold, jarak ke support (dalam satuan ATR, dari klaster pivot low 90 hari), berapa kali support teruji, besar koreksi, candle pembalikan (hammer/engulfing), volume konfirmasi, stochastic cross, MACD melemah, filter downtrend kuat (ADX/DI), tanda akumulasi (MFI/OBV).
**Untuk semua:** filter likuiditas (nilai transaksi rata-rata), regime IHSG (bullish/netral/bearish + kondisi hari ini), berita negatif 24 jam, ARA/ARB, fraksi harga, R:R bersih setelah biaya.

Aturan BEI ada di `lib/idx.ts`: fraksi harga, ARB 7% (berlaku s/d 31 Des 2026; mulai 2027 otomatis simetris), jam sesi termasuk Jumat.

## Setup

### 1. Supabase
1. SQL Editor → paste seluruh isi `supabase/schema.sql` → **Run**. Aman untuk database v1 lama: data tetap ada, duplikat dibersihkan, RLS dinyalakan.
2. Project Settings → API → salin **Project URL** dan **service_role key** (bukan anon key).

### 2. Environment Variables di Vercel
Project → Settings → Environment Variables:

| Nama | Isi |
|---|---|
| `APP_PASSWORD` | password untuk masuk aplikasi |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

Hapus `NEXT_PUBLIC_SUPABASE_ANON_KEY` yang lama (tidak dipakai lagi). Lalu **Redeploy**.

### 3. Pemakaian yang disarankan
1. Buka **Backtest** → jalankan *Day Trade · Harian* dan *Rebound · Harian* (semua saham). Untuk day trade, jalankan juga *Intraday 5m*.
2. Lihat rentang skor mana yang rata-rata R-nya positif. Hanya trade rentang itu.
3. Di Screener, kartu saham akan menampilkan "Histori skor X–Y: Z% profit".
4. Catat setiap trade di Jurnal, lalu bandingkan dengan angka backtest.

## Keamanan
- Semua halaman & API dilindungi password (cookie httpOnly, dibatasi 5 percobaan / 5 menit).
- Supabase hanya diakses dari server dengan service role key; tabel memakai RLS tanpa policy, jadi anon key tidak bisa membaca/menulis apa pun.

## Batasan yang perlu diketahui
- Data Yahoo untuk IDX **tertunda ±10 menit** dan tidak resmi; bisa sesekali gagal (rate limit).
- Tidak ada data broker summary / foreign flow / bid-offer (tidak tersedia gratis).
- Label syariah memakai DES OJK Periode I 2026. Saat DES baru terbit (akhir Mei & November), tempel daftarnya di halaman Atur.
- Backtest harian untuk day trade bersifat konservatif (jika SL & TP tersentuh di hari yang sama dianggap SL).

## Pengembangan
```bash
cp .env.example .env.local
npm install
npm test        # unit test indikator, aturan BEI, skor, backtest
npm run dev
```
