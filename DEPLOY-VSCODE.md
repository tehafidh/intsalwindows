# Deploy Ke GitHub Lewat VS Code

Panduan ini untuk membuka project di VS Code, menjalankan web installer, lalu
push source code ke GitHub.

## 1. Buka Project

Di terminal:

```powershell
cd C:\Users\bigbo\OneDrive\Desktop\reinstal
code .
```

## 2. Jalankan Web Installer Dari VS Code

Di VS Code:

1. Tekan `Ctrl+Shift+P`.
2. Pilih `Tasks: Run Task`.
3. Pilih `Installer: start web`.
4. Buka browser:

```text
http://localhost:8081
```

Untuk cek syntax:

1. Tekan `Ctrl+Shift+P`.
2. Pilih `Tasks: Run Task`.
3. Pilih `Installer: check syntax`.

## 3. Login GitHub Di VS Code

Di VS Code:

1. Klik icon akun di kiri bawah.
2. Pilih `Sign in to Sync Settings` atau `Sign in with GitHub`.
3. Ikuti login browser sampai selesai.

Kalau extension GitHub diminta, install:

- GitHub Pull Requests
- GitHub Actions

## 4. Buat Repo GitHub

Buka:

```text
https://github.com/new
```

Isi nama repo, contoh:

```text
windows-vps-installer
```

Jangan centang `Add README`, karena README sudah ada di project ini.

## 5. Sambungkan Remote

Setelah repo dibuat, GitHub memberi URL seperti:

```text
https://github.com/USERNAME/windows-vps-installer.git
```

Jalankan di terminal VS Code:

```powershell
git remote add origin https://github.com/USERNAME/windows-vps-installer.git
git push -u origin main
```

Setelah itu update berikutnya bisa dilakukan dari tab Source Control VS Code:

1. Edit file.
2. Klik `+` untuk stage.
3. Isi pesan commit.
4. Klik `Commit`.
5. Klik `Sync Changes` atau `Push`.

## Catatan Penting

GitHub Pages tidak bisa menjalankan installer langsung karena app ini butuh
backend Node.js untuk SSH ke VPS. GitHub dipakai untuk menyimpan source code.
Untuk menjalankan installer, pakai:

```powershell
npm start
```
