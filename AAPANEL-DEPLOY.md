# Deploy aaPanel

Project ini adalah aplikasi Node.js, bukan website static biasa.

## Folder runtime aaPanel

Upload isi folder `instalerwindows` ke:

```text
/www/wwwroot/instalerwindows
```

File yang wajib untuk menjalankan web:

```text
server.js
package.json
package-lock.json
public/
```

## Install dependency

```bash
cd /www/wwwroot/instalerwindows
npm install --production
```

## Node.js Project aaPanel

- Project path: `/www/wwwroot/instalerwindows`
- Startup file: `server.js`
- Port: `8081`
- Start command: `npm start`
- Environment variable: `PUBLIC_SITE_URL=https://domain-kamu.com`

Reverse proxy domain ke:

```text
http://127.0.0.1:8081
```

Aktifkan WebSocket di reverse proxy.

## SEO

App menyediakan `/robots.txt` dan `/sitemap.xml`. Isi `PUBLIC_SITE_URL` dengan
domain publik agar Google melihat sitemap dengan URL yang benar.

## Catatan penting

Installer VPS target download file reinstall dari GitHub:

```text
https://raw.githubusercontent.com/tehafidh/intsalwindows/main
```

Jadi perubahan script seperti `reinstall.sh`, `trans.sh`, `windows.xml`, dan
file `windows-*.bat` harus tetap di-push ke GitHub branch `main`.
