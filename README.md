# Maldy Portfolio

Portfolio multibahasa berbasis React, Vite, dan Supabase. Situs mendukung bahasa Indonesia, Inggris, dan Jepang, halaman admin, karya dengan media carousel, aktivitas, SEO statis, serta deployment otomatis ke GitHub Pages.

## Teknologi

- React 19 + React Router
- Vite 7
- Supabase Database, Auth, Storage, dan Edge Functions
- GitHub Actions + GitHub Pages

## Menjalankan lokal

Persyaratan: Node.js 22 dan npm.

```bash
npm ci
npm run dev
```

Buat `.env.local` di komputer sendiri:

```dotenv
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_ADMIN_USER_ID=YOUR_ADMIN_USER_UUID
```

File environment tidak boleh di-commit. Jangan pernah menaruh `service_role` key, GitHub token/PAT, atau `REBUILD_WEBHOOK_SECRET` di source code maupun variabel `VITE_*`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Build produksi dan membuat snapshot SEO |
| `npm run preview` | Mengecek hasil build secara lokal |

## Setup Supabase

Untuk database baru, jalankan file dalam folder `sql/` sesuai nomor. Sebelum menjalankan `002-admin-rls.sql`, ganti `YOUR_ADMIN_UUID` dengan UUID pengguna admin dari Supabase Authentication.

| Urutan | File | Tujuan |
| --- | --- | --- |
| 001 | `001-core-schema.sql` | Kategori dan karya |
| 002 | `002-admin-rls.sql` | Fungsi admin, RLS, dan akses Storage |
| 003 | `003-profile-and-activity.sql` | Profil, kelompok aktivitas, dan relasi karya |
| 004 | `004-work-media.sql` | Media/carousel karya dan policy admin |
| 005 | `005-profile-tools.sql` | Daftar tools profil |
| 006 | `006-home-showcase.sql` | Slider karya pilihan di beranda |
| 007 | `007-site-status.sql` | Status halaman dan maintenance mode |
| 008 | `008-work-seo-permalinks.sql` | Slug stabil untuk karya |
| 009 | `009-activity-seo-permalinks.sql` | Slug stabil untuk aktivitas |
| 010 | `010-external-work-url.sql` | Tautan proyek eksternal opsional |
| 011 | `011-security-hardening.sql` | Penguatan policy sebelum publikasi |

Untuk database yang sudah dipakai, buat backup dan jalankan hanya migrasi yang belum pernah diterapkan.

## Deploy ke GitHub Pages

1. Upload isi proyek ini ke branch `main` repository `maldyrais.github.io`.
2. Di **Settings → Secrets and variables → Actions**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_USER_ID`
3. Di **Settings → Pages**, pilih **GitHub Actions** sebagai sumber deployment.
4. Push ke `main`, lalu workflow `.github/workflows/deploy-pages.yml` akan menjalankan `npm ci`, build, dan deploy folder `dist/`.

Deployment juga dapat dipicu melalui `repository_dispatch` dengan event `portfolio-content-changed`.

## Auto rebuild dari Supabase

Edge Function `supabase/functions/trigger-site-rebuild/` meneruskan perubahan konten ke GitHub Actions. Simpan nilai berikut sebagai secret Edge Function, bukan di repository:

- `GITHUB_REBUILD_TOKEN`
- `REBUILD_WEBHOOK_SECRET`

Hubungkan Database Webhook untuk operasi `INSERT`, `UPDATE`, dan `DELETE` pada tabel konten yang perlu memicu build ulang.

## Struktur penting

```text
.github/workflows/     Workflow GitHub Pages
public/                Aset statis
scripts/               Generator SEO setelah build
src/                   Aplikasi React
  styles/              Modul CSS; urutan import ada di styles.css
supabase/functions/    Edge Function auto rebuild
sql/                   Migrasi berurutan
```

`node_modules/`, `dist/`, seluruh file `.env*`, dan credential tidak termasuk source repository.

## SEO dan route

Route publik menggunakan prefix bahasa `/id/`, `/en/`, dan `/ja/`. Saat build, script SEO menghasilkan halaman statis, canonical, `hreflang`, sitemap, robots.txt, dan fallback untuk route karya serta aktivitas. Route lama tanpa prefix bahasa diarahkan ke versi Indonesia.

Sebelum publish, jalankan:

```bash
npm run build
npm run preview
```

Cek Home, About, Works, detail karya, dan detail aktivitas di ketiga bahasa, termasuk refresh langsung pada URL detail.
