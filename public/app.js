const form = document.querySelector("#installer-form");
const host = document.querySelector("#host");
const sshUsername = document.querySelector("#ssh-username");
const sshPassword = document.querySelector("#ssh-password");
const sshLoginPort = document.querySelector("#ssh-login-port");
const provider = document.querySelector("#provider");
const mode = document.querySelector("#mode");
const windowsPresetRow = document.querySelector("#windows-preset-row");
const windowsPreset = document.querySelector("#windows-preset");
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
const progressLabel = document.querySelector("#progress-label");
const progressPercent = document.querySelector("#progress-percent");
const progressFill = document.querySelector("#progress-fill");
const progressDetail = document.querySelector("#progress-detail");
const progressUrl = document.querySelector("#progress-url");
const rdpTarget = document.querySelector("#rdp-target");
const manualProgressIp = document.querySelector("#manual-progress-ip");
const manualProgressPort = document.querySelector("#manual-progress-port");
const startButton = document.querySelector("#start-install");

let ws = null;
let waitStartedAt = null;
let timerHandle = null;
let currentProgress = 0;
let currentStatus = "idle";
let lastProgressBucket = -1;
let lastProgressTopic = "";
let progressUrlValue = "";
let rdpTargetValue = "";

const waitingStatuses = new Set(["rebooting", "remote-progress", "windows-setup"]);
const terminalStatuses = new Set(["rdp-ready", "failed", "remote-error", "timeout", "finished"]);
const flowOrder = ["ssh", "installer", "web", "windows", "rdp"];
const windowsPresets = {
  server2012r2: {
    imageName: "Windows Server 2012 R2 SERVERDATACENTER",
    imageUrl:
      "https://download.microsoft.com/download/6/2/A/62A76ABB-9990-4EFC-A4FE-C7D698DAEB96/9600.17050.WINBLUE_REFRESH.140317-1640_X64FRE_SERVER_EVAL_EN-US-IR3_SSS_X64FREE_EN-US_DV9.ISO",
  },
  server2016: {
    imageName: "Windows Server 2016 SERVERDATACENTER",
    imageUrl:
      "https://software-static.download.prss.microsoft.com/pr/download/Windows_Server_2016_Datacenter_EVAL_en-us_14393_refresh.ISO",
  },
  server2019: {
    imageName: "Windows Server 2019 SERVERDATACENTER",
    imageUrl:
      "https://software-static.download.prss.microsoft.com/dbazure/988969d5-f34g-4e03-ac9d-1f9786c66749/17763.3650.221105-1748.rs5_release_svc_refresh_SERVER_EVAL_x64FRE_en-us.iso",
  },
  server2022: {
    imageName: "Windows Server 2022 SERVERDATACENTER",
    imageUrl:
      "https://software-static.download.prss.microsoft.com/sg/download/888969d5-f34g-4e03-ac9d-1f9786c66749/SERVER_EVAL_x64FRE_en-us.iso",
  },
  server2025: {
    imageName: "Windows Server 2025 SERVERDATACENTER",
    imageUrl:
      "https://software-static.download.prss.microsoft.com/dbazure/998969d5-f34g-4e03-ac9d-1f9786c66749/26100.32230.260111-0550.lt_release_svc_refresh_SERVER_EVAL_x64FRE_en-us.iso",
  },
  windows11: {
    imageName: "Windows 11 Enterprise Evaluation",
    imageUrl:
      "https://software-static.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-1f9786c66749/26200.6584.250915-1905.25h2_ge_release_svc_refresh_CLIENTENTERPRISEEVAL_OEMRET_x64FRE_en-us.iso",
  },
};

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
    return "Siap: Universal KVM.";
  }
  if (provider.value === "digitalocean") {
    return "Siap: DigitalOcean KVM.";
  }
  if (provider.value === "tencent") {
    return "Siap: Tencent Cloud.";
  }
  return "Siap: Provider KVM.";
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
  const isDdMode = mode.value === "dd";
  windowsPresetRow.hidden = isDdMode;
  imageNameRow.hidden = isDdMode;
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

function applyWindowsPreset() {
  const preset = windowsPresets[windowsPreset.value];
  if (!preset) {
    renderValidation();
    return;
  }
  mode.value = "iso";
  imageName.value = preset.imageName;
  imageUrl.value = preset.imageUrl;
  renderValidation();
}

function splitLogPrefix(message) {
  const match = message.match(/^(\[[^\]]+\]\s*)(.*)$/);
  return {
    prefix: match ? match[1] : "",
    body: match ? match[2] : message,
  };
}

function extractLogPercent(message) {
  const matches = [...message.matchAll(/\((\d{1,3})%\)|\b(\d{1,3})%\b/g)];
  if (!matches.length) return null;
  const value = Number(matches[matches.length - 1][1] || matches[matches.length - 1][2]);
  if (!Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

function progressTopic(message) {
  if (/calculating integrity table/i.test(message)) return "Verifikasi WIM";
  if (/extracting|apply|wim|image/i.test(message)) return "Menulis image Windows";
  if (/download|aria2|wget|curl|iso/i.test(message)) return "Download image";
  if (/installing|apk|package|grub|boot/i.test(message)) return "Menyiapkan boot installer";
  return "Progress installer";
}

function mapInstallProgress(percent, message) {
  if (/download|aria2|wget|curl/i.test(message)) {
    return Math.round(12 + percent * 0.24);
  }
  if (/calculating integrity table|wim|extracting|apply|image/i.test(message)) {
    return Math.round(32 + percent * 0.56);
  }
  return Math.min(92, Math.round(18 + percent * 0.7));
}

function setProgress(percent, label, detail, force = false) {
  const normalized = Math.min(100, Math.max(0, Math.round(percent)));
  if (!force && normalized < currentProgress) {
    return;
  }
  currentProgress = normalized;
  progressLabel.textContent = label;
  progressPercent.textContent = `${normalized}%`;
  progressFill.style.width = `${normalized}%`;
  progressDetail.textContent = detail;
}

function resetProgress() {
  currentProgress = 0;
  lastProgressBucket = -1;
  lastProgressTopic = "";
  setProgress(0, "Progress", "Belum mulai.", true);
}

function applyStatusProgress(status) {
  const progressByStatus = {
    queued: [3, "SSH Login", "Job dibuat."],
    connecting: [8, "SSH Login", "Menghubungkan."],
    running: [16, "Installer VPS", "Berjalan."],
    rebooting: [91, "Windows Setup", "Reboot."],
    "remote-progress": [78, "Web Progress", "Aktif."],
    "windows-setup": [95, "Waiting RDP Ready", "Cek port RDP."],
    "rdp-ready": [100, "Windows Ready", "Ready."],
    failed: [currentProgress, "Gagal", "Cek log."],
    "remote-error": [currentProgress, "Error", "Cek console."],
    timeout: [currentProgress, "Gagal", "RDP belum ready 15 menit."],
    finished: [currentProgress, "Selesai", "Menunggu status."],
  };
  const progress = progressByStatus[status];
  if (progress) {
    setProgress(...progress);
  }
}

function compactProgressLog(message) {
  const percent = extractLogPercent(message);
  if (percent === null) return { message, skip: false };

  const topic = progressTopic(message);
  setProgress(
    mapInstallProgress(percent, message),
    topic,
    `${topic}: ${percent}%.`,
  );

  const isNoisy =
    /calculating integrity table|mib of|archiving file data|extracting|download|aria2|^\s*#/i.test(message);
  if (!isNoisy) return { message, skip: false };

  const bucket = percent === 100 ? 100 : Math.floor(percent / 10) * 10;
  const shouldShow = topic !== lastProgressTopic || bucket > lastProgressBucket || percent === 100;
  if (!shouldShow) return { message, skip: true };

  lastProgressBucket = bucket;
  lastProgressTopic = topic;
  const { prefix } = splitLogPrefix(message);
  return {
    message: `${prefix}${topic}: ${percent}%`,
    skip: false,
  };
}

function applyStatusFromLog(message) {
  if (terminalStatuses.has(currentStatus)) return;
  if (/websocket disconnected|installation finished|(?:^\[[^\]]+\]\s*)?\*\*\*\*\*\s*done/i.test(message)) {
    setStatus("windows-setup");
  }
}

function addLog(message) {
  applyStatusFromLog(message);
  const compacted = compactProgressLog(message);
  if (compacted.skip) return;
  const atBottom =
    Math.ceil(liveLog.scrollTop + liveLog.clientHeight) >= liveLog.scrollHeight;
  if (liveLog.textContent === "Log teknis akan muncul di sini.") {
    liveLog.textContent = "";
  }
  const row = document.createElement("div");
  row.className = `log-row ${classifyLog(compacted.message)}`;
  row.textContent = compacted.message;
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
    "remote-progress": "web",
    "windows-setup": "windows",
    "rdp-ready": "rdp",
    "remote-error": "web",
    finished: "windows",
    timeout: "windows",
    failed: "ssh",
  };
  const active = stepByStatus[status] || "ssh";
  document.querySelectorAll(".flow-step").forEach((step) => {
    const state = flowState(step.dataset.step, active, status);
    step.classList.toggle("active", state === "active");
    step.classList.toggle("complete", state === "complete");
    step.classList.toggle("locked", state === "locked");
    step.classList.toggle("error", state === "error");
    step.querySelector("em").textContent = flowLabel(step.dataset.step, state, status);
  });
}

function flowState(step, active, status) {
  if (status === "rdp-ready") return "complete";
  if (["failed", "remote-error", "timeout"].includes(status) && step === active) return "error";
  if (flowOrder.indexOf(step) < flowOrder.indexOf(active)) return "complete";
  if (step === active) return "active";
  return "locked";
}

function flowLabel(step, state, status) {
  if (state === "locked") return "Terkunci";
  if (state === "complete") {
    if (step === "rdp") return "Ready";
    return "Selesai";
  }
  if (state === "error") return "Perlu cek";

  const activeLabels = {
    idle: "Belum mulai",
    queued: "Job dibuat",
    connecting: "Login",
    running: "Berjalan",
    rebooting: "Reboot",
    "remote-progress": "Aktif",
    "windows-setup": "Cek port",
    finished: "Menunggu",
  };
  return activeLabels[status] || "Aktif";
}

function updateGatedOutputs(status) {
  const progressText = progressUrl.querySelector("strong");
  const progressOpen = status === "remote-progress" && Boolean(progressUrlValue);
  const progressDone = ["rebooting", "windows-setup", "rdp-ready"].includes(status);
  progressUrl.classList.toggle("disabled", !progressOpen);
  progressUrl.href = progressOpen ? progressUrlValue : "#";
  if (progressOpen) {
    progressText.textContent = progressUrlValue;
  } else if (progressDone) {
    progressText.textContent = "Selesai";
  } else {
    progressText.textContent = progressUrlValue ? "Menunggu aktif" : "Terkunci";
  }

  const rdpReady = status === "rdp-ready";
  rdpTarget.parentElement.classList.toggle("ready", rdpReady);
  rdpTarget.textContent = rdpReady && rdpTargetValue ? rdpTargetValue : "Terkunci";
}

function setStage(status) {
  const labels = {
    idle: "Belum mulai",
    queued: "Job dibuat",
    connecting: "SSH login",
    running: "Installer VPS",
    rebooting: "Windows Setup",
    "remote-progress": "Web Progress aktif",
    "windows-setup": "Waiting RDP Ready",
    "rdp-ready": "Windows Ready",
    "remote-error": "Error",
    timeout: "Gagal",
    failed: "Gagal",
    finished: "Menunggu status",
  };
  stageLabel.textContent = labels[status] || "Memantau";
  stageCard.dataset.status = status;
  setActiveStep(status);

  if (waitingStatuses.has(status)) {
    startWaitTimer();
  } else if (terminalStatuses.has(status)) {
    stopWaitTimer();
  }
}

function setStatus(status) {
  currentStatus = status;
  jobStatus.textContent = status;
  jobStatus.dataset.status = status;
  setStage(status);
  applyStatusProgress(status);
  updateGatedOutputs(status);
  if (status === "running") {
    jobTitle.textContent = "Installer VPS";
  } else if (status === "connecting") {
    jobTitle.textContent = "SSH Login";
  } else if (status === "rebooting") {
    jobTitle.textContent = "Windows Setup";
  } else if (status === "remote-progress") {
    jobTitle.textContent = "Web Progress";
  } else if (status === "windows-setup") {
    jobTitle.textContent = "Waiting RDP Ready";
  } else if (status === "rdp-ready") {
    jobTitle.textContent = "Windows Ready";
  } else if (status === "remote-error") {
    jobTitle.textContent = "Installer remote error";
  } else if (status === "timeout") {
    jobTitle.textContent = "Gagal";
  } else if (status === "failed") {
    jobTitle.textContent = "Gagal";
  } else {
    jobTitle.textContent = "Belum mulai";
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
  ws.addEventListener("close", () => {
    addLog("WebSocket disconnected. Waiting RDP Ready...");
    if (!terminalStatuses.has(currentStatus)) {
      setStatus("windows-setup");
    }
  });
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
  resetProgress();
  progressUrlValue = "";
  rdpTargetValue = "";
  updateGatedOutputs("idle");
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

  progressUrlValue = result.progressUrl;
  rdpTargetValue = result.rdpTarget;
  updateGatedOutputs(currentStatus);
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
  windowsPreset.value = "server2012r2";
  applyWindowsPreset();
  rdpUsername.value = "administrator";
  rdpPassword.value = "ChangeMe!2026";
  rdpPort.value = "3390";
  installSshPort.value = "22";
  webPort.value = "80";
  allowPing.checked = true;
  autoReboot.checked = true;
  renderValidation();
});

windowsPreset.addEventListener("change", applyWindowsPreset);

imageName.addEventListener("input", () => {
  windowsPreset.value = "custom";
});

imageUrl.addEventListener("input", () => {
  windowsPreset.value = "custom";
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
resetProgress();
updateGatedOutputs("idle");
renderValidation();
