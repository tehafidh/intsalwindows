# Windows VPS Web Installer

Web installer untuk install ulang VPS ke Windows langsung dari browser.
Masukkan IP VPS, password root/SSH, link ISO Windows, password RDP baru, dan
port RDP. Aplikasi akan SSH ke VPS target, menjalankan `reinstall.sh`, lalu
menampilkan progress install secara live.

> Peringatan: proses ini menghapus seluruh disk VPS target.

## Fitur

- Install Windows dari ISO resmi Microsoft.
- Mode DD untuk image Windows `raw` atau `vhd`.
- Custom username RDP.
- Custom password RDP.
- Custom port RDP.
- Custom port SSH log dan web progress.
- Progress live dari output SSH.
- Link progress bawaan script, contoh `http://IP-VPS:80/`.
- Auto reboot setelah setup reinstall sukses.
- Monitor otomatis sampai port RDP terbuka.

## Menjalankan

Pastikan Node.js sudah terpasang.

```bash
npm install
npm start
```

Buka:

```text
http://localhost:8081
```

Jika memakai VS Code, buka file `DEPLOY-VSCODE.md` atau jalankan task
`Installer: start web`.

## Sumber Script Reinstall

Secara default backend akan download script dari repo ini:

```text
https://raw.githubusercontent.com/tehafidh/intsalwindows/main
```

Kalau ingin memakai source lain, jalankan dengan environment variable:

```powershell
$env:REINSTALL_BASE_URL="https://raw.githubusercontent.com/USERNAME/REPO/main"
npm start
```

## Cara Pakai

1. Isi `IP / domain VPS`.
2. Isi `Username SSH`, biasanya `root`.
3. Isi `Password root / SSH`, yaitu password VPS saat ini.
4. Pilih provider.
5. Pilih mode install:
   - `Windows ISO langsung` untuk link ISO.
   - `DD image Windows RAW/VHD` untuk image siap DD.
6. Isi link ISO/image.
7. Isi username RDP.
8. Isi password RDP baru.
9. Isi port RDP.
10. Klik `Mulai install sekarang`.

Saat VPS reboot, koneksi SSH bisa putus. Itu normal. Lanjut cek progress lewat:

```text
http://IP-VPS:PORT_WEB_PROGRESS/
```

Setelah selesai, konek RDP ke:

```text
IP-VPS:PORT_RDP
```

## Port Yang Harus Dibuka

Buka port ini di firewall/security group provider:

- Port SSH login saat ini, biasanya `22`.
- Port web progress, default `80`.
- Port RDP baru, default `3389` atau port custom.

## Catatan Provider

Tencent Cloud cocok untuk Windows. Untuk produksi yang lebih rapi, jalur paling
stabil adalah membuat custom image Windows, upload ke COS, lalu import ke CVM.

DigitalOcean tidak mendukung Windows custom image secara resmi. Installer bisa
dicoba sebagai experimental, tetapi wajib punya akses console/recovery jika boot
gagal.

## Tentang GitHub

Project ini bisa di-push ke GitHub sebagai source code. GitHub Pages tidak bisa
dipakai untuk install langsung karena tidak bisa menjalankan backend SSH.

Contoh push:

```bash
git init
git add .
git commit -m "Add Windows VPS web installer"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## Keamanan

- Password SSH dan password RDP dikirim ke backend lokal hanya saat install
  dimulai.
- Password tidak disimpan ke file oleh aplikasi ini.
- Jangan publish aplikasi ini secara publik tanpa HTTPS, login admin, dan
  pembatasan akses.
- Jangan masukkan password VPS ke website yang tidak kamu jalankan sendiri.

## ISO Contoh

ISO default di form:

```text
https://download.microsoft.com/download/6/2/A/62A76ABB-9990-4EFC-A4FE-C7D698DAEB96/9600.17050.WINBLUE_REFRESH.140317-1640_X64FRE_SERVER_EVAL_EN-US-IR3_SSS_X64FREE_EN-US_DV9.ISO
```

Itu Windows Server 2012 R2 Evaluation. Versi evaluation punya masa pakai
terbatas dan tidak disarankan untuk produksi jangka panjang.

Untuk ISO Windows Server 2012 R2 di atas, nama image yang benar adalah:

```text
Windows Server 2012 R2 SERVERDATACENTER
```

Dokumentasi asli repo sebelum web installer disimpan di `README.original.md`.
