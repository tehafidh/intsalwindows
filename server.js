const crypto = require("crypto");
const http = require("http");
const net = require("net");
const path = require("path");
const express = require("express");
const { Client } = require("ssh2");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const jobs = new Map();

const publicDir = path.join(__dirname, "public");
const defaultReinstallBase =
    "https://raw.githubusercontent.com/tehafidh/intsalwindows/main";
const upstreamCnBase = "https://cnb.cool/bin456789/reinstall/-/git/raw/main";
const rawBase = process.env.REINSTALL_BASE_URL || defaultReinstallBase;
const cnBase = process.env.REINSTALL_CN_BASE_URL || upstreamCnBase;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(publicDir));

function bashQuote(value) {
    return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

function isPort(value) {
    return Number.isInteger(value) && value >= 1 && value <= 65535;
}

function normalizePort(value, fallback) {
    const numberValue = Number(value);
    return isPort(numberValue) ? numberValue : fallback;
}

function isAllowedUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:", "magnet:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function maskSecrets(line) {
    return String(line)
        .replace(/(--password\s+)(?:"[^"]*"|'[^']*'|\S+)/gi, "$1[hidden]")
        .replace(/(RDP_PASSWORD=)(?:"[^"]*"|'[^']*'|\S+)/gi, "$1[hidden]")
        .replace(/(password:?\s*)(\S+)/gi, "$1[hidden]");
}

function createJob(config) {
    const id = crypto.randomUUID();
    const job = {
        id,
        config: {
            host: config.host,
            webPort: config.webPort,
            rdpPort: config.rdpPort,
        },
        status: "queued",
        logs: [],
        clients: new Set(),
        createdAt: new Date().toISOString(),
    };
    jobs.set(id, job);
    return job;
}

function appendLog(job, message) {
    const lines = String(message).replace(/\r/g, "\n").split("\n");
    for (const line of lines) {
        if (!line) continue;
        const entry = {
            time: new Date().toISOString(),
            message: maskSecrets(line),
        };
        job.logs.push(entry);
        if (job.logs.length > 2000) {
            job.logs.shift();
        }
        const payload = JSON.stringify({ type: "log", entry });
        for (const client of job.clients) {
            if (client.readyState === client.OPEN) {
                client.send(payload);
            }
        }
    }
}

function setStatus(job, status) {
    job.status = status;
    const payload = JSON.stringify({ type: "status", status });
    for (const client of job.clients) {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnectTcp(host, port, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host, port });
        const finish = (result) => {
            socket.removeAllListeners();
            socket.destroy();
            resolve(result);
        };
        socket.setTimeout(timeoutMs);
        socket.once("connect", () => finish(true));
        socket.once("timeout", () => finish(false));
        socket.once("error", () => finish(false));
    });
}

function fetchProgressPage(host, port, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const req = http.get(
            {
                host,
                port,
                path: "/",
                timeout: timeoutMs,
            },
            (res) => {
                let body = "";
                res.setEncoding("utf8");
                res.on("data", (chunk) => {
                    body += chunk;
                    if (body.length > 12000) {
                        req.destroy();
                    }
                });
                res.on("end", () => resolve({ ok: true, statusCode: res.statusCode, body }));
            }
        );
        req.on("timeout", () => {
            req.destroy();
            resolve({ ok: false });
        });
        req.on("error", () => resolve({ ok: false }));
    });
}

async function monitorAfterReboot(job, config) {
    const startedAt = Date.now();
    const timeoutMs = 90 * 60 * 1000;
    let lastMessage = "";
    let lastHeartbeatAt = 0;

    appendLog(job, "Monitor aktif: mengecek web progress dan port RDP sampai Windows siap.");

    while (Date.now() - startedAt < timeoutMs) {
        const elapsedMinutes = Math.max(1, Math.floor((Date.now() - startedAt) / 60000));
        const rdpReady = await canConnectTcp(config.host, config.rdpPort);
        if (rdpReady) {
            setStatus(job, "rdp-ready");
            appendLog(job, `RDP sudah terbuka: ${config.host}:${config.rdpPort}`);
            appendLog(job, "Jika login gagal, coba username .\\administrator.");
            return;
        }

        const progress = await fetchProgressPage(config.host, config.webPort);
        let message;
        if (progress.ok) {
            if (/ERROR/i.test(progress.body)) {
                setStatus(job, "remote-error");
                message = `Web progress aktif, tetapi terdeteksi error. Buka http://${config.host}:${config.webPort}/`;
            } else if (/DONE/i.test(progress.body)) {
                setStatus(job, "windows-setup");
                message = "Installer awal selesai. Menunggu Windows boot dan membuka RDP.";
            } else {
                setStatus(job, "remote-progress");
                message = `Web progress masih aktif: http://${config.host}:${config.webPort}/`;
            }
        } else {
            setStatus(job, "windows-setup");
            message = "Web progress tidak bisa diakses. Ini normal saat VPS reboot atau Windows Setup berjalan.";
        }

        const shouldHeartbeat = Date.now() - lastHeartbeatAt >= 60 * 1000;
        if (message !== lastMessage || shouldHeartbeat) {
            appendLog(job, `${message} Menunggu RDP ${config.host}:${config.rdpPort}. Durasi monitor: ${elapsedMinutes} menit.`);
            lastMessage = message;
            lastHeartbeatAt = Date.now();
        }

        await sleep(15000);
    }

    setStatus(job, "timeout");
    appendLog(job, "Monitor timeout setelah 90 menit. Cek console/VNC provider atau firewall RDP.");
}

function validateRequest(body) {
    const mode = String(body.mode || "iso");
    const imageName = normalizeWindowsImageName(String(body.imageName || "").trim());
    const config = {
        host: String(body.host || "").trim(),
        sshUsername: String(body.sshUsername || "root").trim(),
        sshPassword: String(body.sshPassword || ""),
        sshLoginPort: normalizePort(body.sshLoginPort, 22),
        provider: String(body.provider || "other"),
        mode,
        imageName,
        imageUrl: String(body.imageUrl || "").trim(),
        username: String(body.username || "administrator").trim(),
        rdpPassword: String(body.rdpPassword || ""),
        rdpPort: normalizePort(body.rdpPort, 3389),
        installSshPort: normalizePort(body.installSshPort, 22),
        webPort: normalizePort(body.webPort, 80),
        allowPing: Boolean(body.allowPing),
        autoReboot: body.autoReboot !== false,
        cnMirror: Boolean(body.cnMirror),
    };

    const problems = [];
    if (!config.host || !/^[a-z0-9.-]+$/i.test(config.host)) {
        problems.push("IP/domain VPS tidak valid.");
    }
    if (!config.sshUsername) {
        problems.push("Username SSH wajib diisi.");
    }
    if (!config.sshPassword) {
        problems.push("Password SSH/root wajib diisi.");
    }
    if (!["iso", "dd"].includes(config.mode)) {
        problems.push("Mode install tidak valid.");
    }
    if (!isAllowedUrl(config.imageUrl)) {
        problems.push("Link ISO/image harus http, https, atau magnet.");
    }
    if (config.mode === "iso" && config.imageName.length < 3) {
        problems.push("Nama image Windows wajib diisi.");
    }
    if (!config.username) {
        problems.push("Username RDP wajib diisi.");
    }
    if (config.rdpPassword.length < 8) {
        problems.push("Password RDP minimal 8 karakter.");
    }
    if (/[\r\n]/.test(config.rdpPassword) || /[\r\n]/.test(config.sshPassword)) {
        problems.push("Password tidak boleh berisi baris baru.");
    }

    return { config, problems };
}

function normalizeWindowsImageName(value) {
    const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
    const aliases = new Map([
        [
            "windows server 2012 r2 datacenter evaluation",
            "Windows Server 2012 R2 SERVERDATACENTER",
        ],
        [
            "windows server 2012 r2 datacenter",
            "Windows Server 2012 R2 SERVERDATACENTER",
        ],
        [
            "windows server 2012 r2 standard evaluation",
            "Windows Server 2012 R2 SERVERSTANDARD",
        ],
        [
            "windows server 2012 r2 standard",
            "Windows Server 2012 R2 SERVERSTANDARD",
        ],
    ]);
    return aliases.get(normalized) || value;
}

function buildRemoteCommand(config) {
    const base = config.cnMirror ? cnBase : rawBase;
    const args = [];

    if (config.mode === "dd") {
        args.push("dd");
        args.push("--img", bashQuote(config.imageUrl));
    } else {
        args.push("windows");
        args.push("--image-name", bashQuote(config.imageName));
        args.push("--iso", bashQuote(config.imageUrl));
    }

    args.push("--username", bashQuote(config.username));
    args.push("--password", '"$RDP_PASSWORD"');
    args.push("--rdp-port", String(config.rdpPort));
    args.push("--ssh-port", String(config.installSshPort));
    args.push("--web-port", String(config.webPort));
    if (config.allowPing) {
        args.push("--allow-ping");
    }

    const lines = [
        "set -e",
        "cd /root",
        `export RDP_PASSWORD=${bashQuote(config.rdpPassword)}`,
        `curl -fsSLO ${bashQuote(`${base}/reinstall.sh`)} || wget -O reinstall.sh ${bashQuote(`${base}/reinstall.sh`)}`,
        "chmod +x reinstall.sh",
        `bash reinstall.sh ${args.join(" ")}`,
    ];

    if (config.autoReboot) {
        lines.push("echo 'AUTO_REBOOT: setup sukses, VPS akan reboot untuk mulai install.'");
        lines.push("sync");
        lines.push("nohup sh -c 'sleep 3; /sbin/reboot || reboot || shutdown -r now' >/dev/null 2>&1 &");
    } else {
        lines.push("echo 'AUTO_REBOOT: dimatikan. Reboot manual diperlukan untuk mulai install.'");
    }

    return lines.join("\n");
}

function runInstall(job, config) {
    const conn = new Client();
    setStatus(job, "connecting");
    appendLog(job, `Menghubungkan SSH ke ${config.host}:${config.sshLoginPort} sebagai ${config.sshUsername}`);

    conn
        .on("ready", () => {
            setStatus(job, "running");
            appendLog(job, "SSH tersambung. Menjalankan installer di VPS target.");
            conn.exec(buildRemoteCommand(config), { pty: false }, (err, stream) => {
                if (err) {
                    appendLog(job, `Gagal menjalankan command: ${err.message}`);
                    setStatus(job, "failed");
                    conn.end();
                    return;
                }

                stream
                    .on("close", (code) => {
                        appendLog(job, `Koneksi command selesai dengan kode ${code}. Jika VPS reboot, ini normal.`);
                        appendLog(job, `Progress setelah reboot: http://${config.host}:${config.webPort}/`);
                        appendLog(job, `RDP nanti: ${config.host}:${config.rdpPort}`);
                        setStatus(job, code === 0 ? "rebooting" : "finished");
                        conn.end();
                        if (code === 0) {
                            monitorAfterReboot(job, config).catch((monitorErr) => {
                                appendLog(job, `Monitor error: ${monitorErr.message}`);
                            });
                        }
                    })
                    .on("data", (data) => appendLog(job, data.toString()))
                    .stderr.on("data", (data) => appendLog(job, data.toString()));
            });
        })
        .on("error", (err) => {
            appendLog(job, `SSH error: ${err.message}`);
            setStatus(job, "failed");
        })
        .connect({
            host: config.host,
            port: config.sshLoginPort,
            username: config.sshUsername,
            password: config.sshPassword,
            readyTimeout: 30000,
            keepaliveInterval: 10000,
        });
}

app.post("/api/install", (req, res) => {
    const { config, problems } = validateRequest(req.body || {});
    if (problems.length > 0) {
        res.status(400).json({ problems });
        return;
    }

    const job = createJob(config);
    res.json({
        jobId: job.id,
        progressUrl: `http://${config.host}:${config.webPort}/`,
        rdpTarget: `${config.host}:${config.rdpPort}`,
    });
    setImmediate(() => runInstall(job, config));
});

app.get("/api/jobs/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: "Job tidak ditemukan." });
        return;
    }
    res.json({
        id: job.id,
        status: job.status,
        logs: job.logs,
        config: job.config,
        createdAt: job.createdAt,
    });
});

server.on("upgrade", (request, socket, head) => {
    const match = request.url.match(/^\/ws\/jobs\/([^/]+)$/);
    if (!match) {
        socket.destroy();
        return;
    }

    const job = jobs.get(match[1]);
    if (!job) {
        socket.destroy();
        return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
        job.clients.add(ws);
        ws.send(JSON.stringify({ type: "status", status: job.status }));
        ws.send(JSON.stringify({ type: "snapshot", logs: job.logs }));
        ws.on("close", () => job.clients.delete(ws));
    });
});

const port = normalizePort(process.env.PORT, 8081);
server.listen(port, () => {
    console.log(`Windows VPS Web Installer jalan di http://localhost:${port}`);
});
