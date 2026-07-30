const form = document.querySelector("#installer-form");
const host = document.querySelector("#host");
const sshUsername = document.querySelector("#ssh-username");
const sshPassword = document.querySelector("#ssh-password");
const sshLoginPort = document.querySelector("#ssh-login-port");
const provider = document.querySelector("#provider");
const mode = document.querySelector("#mode");
const imageNameRow = document.querySelector("#image-name-row");
const imageName = document.querySelector("#image-name");
const imageUrl = document.querySelector("#image-url");
const rdpUsername = document.querySelector("#rdp-username");
const rdpPassword = document.querySelector("#rdp-password");
const rdpPort = document.querySelector("#rdp-port");
const installSshPort = document.querySelector("#install-ssh-port");
const webPort = document.querySelector("#web-port");
const allowPing = document.querySelector("#allow-ping");
const autoReboot = document.querySelector("#auto-reboot");
const cnMirror = document.querySelector("#cn-mirror");
const validation = document.querySelector("#validation");
const liveLog = document.querySelector("#live-log");
const jobTitle = document.querySelector("#job-title");
const jobStatus = document.querySelector("#job-status");
const stageCard = document.querySelector("#stage-card");
const stageLabel = document.querySelector("#stage-label");
const waitTimer = document.querySelector("#wait-timer");
const progressUrl = document.querySelector("#progress-url");
const rdpTarget = document.querySelector("#rdp-target");
const manualProgressIp = document.querySelector("#manual-progress-ip");
const manualProgressPort = document.querySelector("#manual-progress-port");
const startButton = document.querySelector("#start-install");

let ws = null;
let waitStartedAt = null;
let timerHandle = null;

const waitingStatuses = new Set(["rebooting", "remote-progress", "windows-setup"]);
const terminalStatuses = new Set(["rdp-ready", "failed", "remote-error", "timeout", "finished"]);

function isPort(input) {
  const value = Number(input.value);
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

function isUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "magnet:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function providerNotice() {
  if (provider.value === "universal") {
    return "Mode Universal KVM: logic install sama untuk DigitalOcean, Tencent, dan VPS KVM sejenis.";
  }
  if (provider.value === "digitalocean") {
    return "DigitalOcean tidak support Windows resmi. Pastikan console recovery tersedia.";
  }
  if (provider.value === "tencent") {
    return "Tencent Cloud cocok. Installer default download script dari repo GitHub kamu.";
  }
  return "Pastikan provider mendukung boot installer dan menyediakan VNC/console.";
}

function validate() {
  const problems = [];

  if (!/^[a-z0-9.-]+$/i.test(host.value.trim())) {
    problems.push("IP/domain VPS wajib diisi.");
  }
  if (!sshUsername.value.trim()) {
    problems.push("Username SSH wajib diisi.");
  }
  if (!sshPassword.value) {
    problems.push("Password SSH/root wajib diisi.");
  }
  if (!isPort(sshLoginPort)) {
    problems.push("Port SSH login harus 1 sampai 65535.");
  }
  if (!isUrl(imageUrl.value.trim())) {
    problems.push("Link ISO/image harus http, https, atau magnet.");
  }
  if (mode.value === "iso" && imageName.value.trim().length < 3) {
    problems.push("Nama image Windows wajib diisi.");
  }
  if (!rdpUsername.value.trim()) {
    problems.push("Username RDP wajib diisi.");
  }
  if (rdpPassword.value.length < 8) {
    problems.push("Password RDP minimal 8 karakter.");
  }
  if (/[\r\n]/.test(sshPassword.value) || /[\r\n]/.test(rdpPassword.value)) {
    problems.push("Password tidak boleh berisi baris baru.");
  }
  [
    ["RDP", rdpPort],
    ["SSH log", installSshPort],
    ["web progress", webPort],
  ].forEach(([label, input]) => {
    if (!isPort(input)) {
      problems.push(`Port ${label} harus 1 sampai 65535.`);
    }
  });

  return problems;
}

function renderValidation() {
  imageNameRow.hidden = mode.value === "dd";
  manualProgressIp.value = manualProgressIp.value || host.value.trim();
  manualProgressPort.value = webPort.value;

  const problems = validate();
  if (problems.length) {
    validation.classList.remove("ok");
    validation.textContent = problems.join(" ");
    startButton.disabled = true;
  } else {
    validation.classList.add("ok");
    validation.textContent = providerNotice();
    startButton.disabled = false;
  }
}

function addLog(message) {
  const atBottom =
    Math.ceil(liveLog.scrollTop + liveLog.clientHeight) >= liveLog.scrollHeight;
  if (liveLog.textContent === "Menunggu install dimulai...") {
    liveLog.textContent = "";
  }
  const row = document.createElement("div");
  row.className = `log-row ${classifyLog(message)}`;
  row.textContent = message;
  liveLog.appendChild(row);
  if (atBottom) {
    liveLog.scrollTop = liveLog.scrollHeight;
  }
}

function classifyLog(message) {
  if (/error|failed|gagal|timeout/i.test(message)) return "is-error";
  if (/done|berhasil|ready|sudah terbuka/i.test(message)) return "is-ok";
  if (/menunggu|waiting|reboot|windows setup|tidak bisa diakses/i.test(message)) return "is-wait";
  if (/ssh|menghubungkan|connected|tersambung/i.test(message)) return "is-info";
  return "is-muted";
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimer() {
  if (!waitStartedAt) {
    waitTimer.textContent = "00:00";
    return;
  }
  waitTimer.textContent = formatElapsed(Date.now() - waitStartedAt);
}

function startWaitTimer() {
  if (!waitStartedAt) {
    waitStartedAt = Date.now();
  }
  if (!timerHandle) {
    timerHandle = window.setInterval(updateTimer, 1000);
  }
  updateTimer();
}

function stopWaitTimer() {
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
  updateTimer();
}

function resetWaitTimer() {
  waitStartedAt = null;
  stopWaitTimer();
}

function setActiveStep(status) {
  const stepByStatus = {
    queued: "ssh",
    connecting: "ssh",
    running: "installer",
    rebooting: "windows",
    "remote-progress": "installer",
    "windows-setup": "windows",
    "rdp-ready": "rdp",
    "remote-error": "windows",
    timeout: "windows",
    failed: "ssh",
  };
  const active = stepByStatus[status] || "ssh";
  document.querySelectorAll(".step").forEach((step) => {
    const isActive = step.dataset.step === active;
    step.classList.toggle("active", isActive);
    step.classList.toggle("complete", isStepComplete(step.dataset.step, active, status));
  });
}

function isStepComplete(step, active, status) {
  const order = ["ssh", "installer", "windows", "rdp"];
  if (status === "rdp-ready") return true;
  return order.indexOf(step) < order.indexOf(active);
}

function setStage(status) {
  const labels = {
    idle: "Menunggu konfigurasi",
    queued: "Job dibuat, menyiapkan koneksi",
    connecting: "Menghubungkan ke VPS",
    running: "Menjalankan installer awal",
    rebooting: "VPS reboot, menunggu Windows Setup",
    "remote-progress": "Installer remote masih berjalan",
    "windows-setup": "Web progress disconnect, menunggu RDP siap",
    "rdp-ready": "RDP siap digunakan",
    "remote-error": "Installer remote melaporkan error",
    timeout: "Monitor selesai karena timeout",
    failed: "Job gagal",
    finished: "Command selesai",
  };
  stageLabel.textContent = labels[status] || "Memantau proses";
  stageCard.dataset.status = status;
  setActiveStep(status);

  if (waitingStatuses.has(status)) {
    startWaitTimer();
  } else if (terminalStatuses.has(status)) {
    stopWaitTimer();
  }
}

function setStatus(status) {
  jobStatus.textContent = status;
  jobStatus.dataset.status = status;
  setStage(status);
  if (status === "running") {
    jobTitle.textContent = "Installer sedang berjalan";
  } else if (status === "connecting") {
    jobTitle.textContent = "Menghubungkan SSH";
  } else if (status === "rebooting") {
    jobTitle.textContent = "VPS reboot / lanjut install";
  } else if (status === "remote-progress") {
    jobTitle.textContent = "Installer sedang diproses";
  } else if (status === "windows-setup") {
    jobTitle.textContent = "Menunggu Windows siap";
  } else if (status === "rdp-ready") {
    jobTitle.textContent = "RDP sudah siap";
  } else if (status === "remote-error") {
    jobTitle.textContent = "Installer remote error";
  } else if (status === "timeout") {
    jobTitle.textContent = "Monitor timeout";
  } else if (status === "failed") {
    jobTitle.textContent = "Install gagal";
  } else {
    jobTitle.textContent = "Progress install";
  }
}

function payload() {
  return {
    host: host.value.trim(),
    sshUsername: sshUsername.value.trim(),
    sshPassword: sshPassword.value,
    sshLoginPort: Number(sshLoginPort.value),
    provider: provider.value,
    mode: mode.value,
    imageName: imageName.value.trim(),
    imageUrl: imageUrl.value.trim(),
    username: rdpUsername.value.trim(),
    rdpPassword: rdpPassword.value,
    rdpPort: Number(rdpPort.value),
    installSshPort: Number(installSshPort.value),
    webPort: Number(webPort.value),
    allowPing: allowPing.checked,
    autoReboot: autoReboot.checked,
    cnMirror: cnMirror.checked,
  };
}

function connectLogs(jobId) {
  if (ws) {
    ws.close();
  }
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${scheme}://${location.host}/ws/jobs/${jobId}`);
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "status") {
      setStatus(data.status);
    }
    if (data.type === "snapshot") {
      data.logs.forEach((entry) => addLog(`[${entry.time}] ${entry.message}`));
    }
    if (data.type === "log") {
      addLog(`[${data.entry.time}] ${data.entry.message}`);
    }
  });
  ws.addEventListener("close", () => addLog("WebSocket progress terputus."));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const problems = validate();
  if (problems.length) {
    renderValidation();
    return;
  }

  const confirmed = window.confirm(
    "Install akan menghapus seluruh disk VPS target. Lanjutkan?"
  );
  if (!confirmed) return;

  startButton.disabled = true;
  liveLog.textContent = "";
  resetWaitTimer();
  addLog("Mengirim job install ke backend...");
  setStatus("queued");

  const response = await fetch("/api/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload()),
  });

  const result = await response.json();
  if (!response.ok) {
    addLog((result.problems || [result.error || "Request gagal."]).join(" "));
    setStatus("failed");
    startButton.disabled = false;
    return;
  }

  progressUrl.href = result.progressUrl;
  progressUrl.classList.remove("disabled");
  progressUrl.querySelector("strong").textContent = result.progressUrl;
  rdpTarget.textContent = result.rdpTarget;
  manualProgressIp.value = host.value.trim();
  manualProgressPort.value = webPort.value;
  connectLogs(result.jobId);
});

document.querySelector("#clear-log").addEventListener("click", () => {
  liveLog.textContent = "";
});

document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(button.dataset.toggle);
    input.type = input.type === "password" ? "text" : "password";
  });
});

document.querySelector("#load-example").addEventListener("click", () => {
  host.value = "1.2.3.4";
  sshUsername.value = "root";
  sshLoginPort.value = "22";
  provider.value = "universal";
  mode.value = "iso";
  imageName.value = "Windows Server 2012 R2 SERVERDATACENTER";
  imageUrl.value =
    "https://download.microsoft.com/download/6/2/A/62A76ABB-9990-4EFC-A4FE-C7D698DAEB96/9600.17050.WINBLUE_REFRESH.140317-1640_X64FRE_SERVER_EVAL_EN-US-IR3_SSS_X64FREE_EN-US_DV9.ISO";
  rdpUsername.value = "administrator";
  rdpPassword.value = "ChangeMe!2026";
  rdpPort.value = "3390";
  installSshPort.value = "22";
  webPort.value = "80";
  allowPing.checked = true;
  autoReboot.checked = true;
  renderValidation();
});

document.querySelector("#open-progress").addEventListener("click", () => {
  const ip = manualProgressIp.value.trim();
  const port = manualProgressPort.value || "80";
  if (!ip) return;
  window.open(`http://${ip}:${port}/`, "_blank", "noopener,noreferrer");
});

form.addEventListener("input", renderValidation);
form.addEventListener("change", renderValidation);
setStage("idle");
renderValidation();
