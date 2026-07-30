# Instaler Haf.id Store

Web installer Haf.id Store ini dipakai untuk menjalankan reinstall Windows VPS langsung dari browser.
Kamu cukup masukkan IP VPS, password root/SSH, link ISO Windows, password RDP baru,
dan port RDP. Backend akan SSH ke VPS target, menjalankan `reinstall.sh`, lalu
menampilkan progress install secara live.

> Peringatan: proses reinstall akan menghapus seluruh disk VPS target.
> Jangan jalankan di server yang masih menyimpan data penting.

## Fitur

- Install Windows dari ISO resmi Microsoft.
- Preset ISO Windows Server 2012 R2, 2016, 2019, 2022, 2025, dan Windows 11.
- Mode DD untuk image Windows `raw` atau `vhd`.
- Custom username RDP.
- Custom password RDP.
- Custom port RDP.
- Custom port SSH log dan web progress.
- Progress live dari output SSH.
- Link progress bawaan script, contoh `http://IP-VPS:80/`.
- Tombol buka progress manual berdasarkan IP dan port.
- Auto reboot setelah setup reinstall sukses.
- Monitor otomatis sampai port RDP terbuka.
- Otomatis install Remote Desktop Session Host di Windows Server.
- Otomatis set policy: maximum password age 999 hari, minimum password length 1, complexity disabled, do not require Ctrl+Alt+Del enabled, dan machine account password age 999 hari.
- Otomatis membersihkan pinned taskbar dan menyembunyikan icon volume serta battery/power.

## Cara Menjalankan Di Komputer Lokal

Pastikan sudah ada Node.js versi 18 atau lebih baru.

```bash
npm install
npm start
```

Buka:

```text
http://localhost:8081
```

## SEO Google

Aplikasi sudah menyiapkan title, description, Open Graph, manifest,
`/robots.txt`, dan `/sitemap.xml`.

Saat deploy di aaPanel, isi domain publik agar sitemap memakai URL yang benar:

```bash
PUBLIC_SITE_URL="https://domain-kamu.com" npm start
```

Di aaPanel Node.js Project, masukkan environment variable:

```text
PUBLIC_SITE_URL=https://domain-kamu.com
```

## Cara Pakai

1. Isi `IP / domain VPS`.
2. Isi `Username SSH`, biasanya `root`.
3. Isi `Password root / SSH`, yaitu password VPS saat ini.
4. Pilih provider.
5. Pilih mode install:
   - `Windows ISO langsung` untuk link ISO.
   - `DD image Windows RAW/VHD` untuk image siap DD.
6. Pilih preset Windows, atau pilih `Custom ISO / image name`.
7. Cek `Nama image Windows` dan `Link ISO / image`.
8. Isi username RDP.
9. Isi password RDP baru.
10. Isi port RDP, misalnya `3389` atau `3390`.
11. Klik `Mulai install sekarang`.

Saat VPS reboot, koneksi SSH bisa putus. Itu normal. Lanjut cek progress lewat
link `Web progress VPS` atau buka manual:

```text
http://IP-VPS:PORT_WEB_PROGRESS/
```

Setelah selesai, konek RDP ke:

```text
IP-VPS:PORT_RDP
```

## Port Yang Harus Dibuka

Di firewall/security group provider, buka minimal:

- Port SSH login saat ini, biasanya `22`.
- Port web progress, default `80`.
- Port RDP baru, default `3389` atau sesuai yang kamu isi.

Untuk Tencent Cloud, cek bagian Security Group CVM.
Untuk DigitalOcean, cek Cloud Firewall jika digunakan.

## Sumber Script Reinstall

Secara default backend download `reinstall.sh` dan file pendukung dari repo ini:

```text
https://raw.githubusercontent.com/tehafidh/intsalwindows/main
```

Kalau kamu edit `reinstall.sh`, `windows.xml`, atau file pendukung lain di repo
GitHub ini, installer akan memakai versi terbaru dari repo kamu setelah file
tersebut dipush ke branch `main`.

Kalau ingin memakai source lain:

```powershell
$env:REINSTALL_BASE_URL="https://raw.githubusercontent.com/USERNAME/REPO/main"
npm start
```

## Catatan Provider

Mode installer langsung memakai alur **Universal KVM**, jadi DigitalOcean,
Tencent Cloud, dan provider KVM lain bisa memakai form dan backend yang sama.
Yang berbeda hanya firewall/security group, console recovery, dan dukungan resmi
Windows dari provider.

Tencent Cloud cocok untuk Windows dan custom image. Kalau ingin produksi yang
lebih rapi, jalur paling stabil adalah membuat custom image Windows, upload ke
COS, lalu import ke CVM.

DigitalOcean tidak mendukung Windows custom image secara resmi. Installer bisa
dicoba sebagai mode experimental, tetapi wajib punya akses console/recovery jika
boot gagal.

## Tentang GitHub

Project ini bisa di-push ke GitHub sebagai source code.

GitHub Pages tidak bisa dipakai untuk fitur install langsung, karena GitHub Pages
hanya hosting statis dan tidak bisa melakukan SSH ke VPS. Untuk install langsung,
jalankan app Node.js ini di komputer sendiri atau di server yang kamu kontrol.

Contoh push ke GitHub:

```bash
git init
git add .
git commit -m "Add Windows VPS web installer"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## Keamanan

- Password SSH dan password RDP dikirim ke backend lokal hanya saat tombol
  install ditekan.
- Password tidak disimpan ke file oleh aplikasi ini.
- Jangan publish aplikasi ini secara publik tanpa HTTPS, login admin, dan
  pembatasan akses.
- Jangan masukkan password VPS ke website yang tidak kamu jalankan sendiri.

## Preset ISO

Form sudah menyediakan preset berikut. Saat dipilih, `Nama image Windows` dan
`Link ISO / image` otomatis terisi.

- Windows Server 2012 R2: `Windows Server 2012 R2 SERVERDATACENTER`
- Windows Server 2016: `Windows Server 2016 SERVERDATACENTER`
- Windows Server 2019: `Windows Server 2019 SERVERDATACENTER`
- Windows Server 2022: `Windows Server 2022 SERVERDATACENTER`
- Windows Server 2025: `Windows Server 2025 SERVERDATACENTER`
- Windows 11: `Windows 11 Enterprise Evaluation`

Versi evaluation punya masa pakai terbatas dan tidak disarankan untuk produksi
jangka panjang. Kalau memakai ISO lain, pilih `Custom ISO / image name`, lalu
isi nama image sesuai isi file WIM/ESD di ISO tersebut.
