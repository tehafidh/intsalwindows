// DOM Element Selectors
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

// Summary Elements (Step 4 Detailed Cards)
const sumHost = document.querySelector("#sum-host");
const sumSshPort = document.querySelector("#sum-ssh-port");
const sumSshUser = document.querySelector("#sum-ssh-user");
const sumOsName = document.querySelector("#sum-os-name");
const sumOsMode = document.querySelector("#sum-os-mode");
const sumRdpUser = document.querySelector("#sum-rdp-user");
const sumRdpPwd = document.querySelector("#sum-rdp-pwd");
const sumRdpPort = document.querySelector("#sum-rdp-port");
const sumWebPort = document.querySelector("#sum-web-port");
const sumOptions = document.querySelector("#sum-options");
const toggleSumPwdBtn = document.querySelector("#toggle-sum-pwd-btn");

// Execution Screen Focus Elements
const executionScreen = document.querySelector("#execution-screen");
const stepperNav = document.querySelector(".stepper-nav");
const execHeroIp = document.querySelector("#exec-hero-ip");
const execHeroOs = document.querySelector("#exec-hero-os");
const execRdpUser = document.querySelector("#exec-rdp-user");
const execRdpPwd = document.querySelector("#exec-rdp-pwd");
const execRdpPort = document.querySelector("#exec-rdp-port");
const execWebPort = document.querySelector("#exec-web-port");
const resetInstallerBtn = document.querySelector("#reset-installer-btn");

// RDP Ready Success Banner Elements
const rdpSuccessBanner = document.querySelector("#rdp-success-banner");
const readyIp = document.querySelector("#ready-ip");
const readyUser = document.querySelector("#ready-user");
const readyPwd = document.querySelector("#ready-pwd");
const readyPort = document.querySelector("#ready-port");
const readyMstscCmd = document.querySelector("#ready-mstsc-cmd");
const readyPwdEyeBtn = document.querySelector("#ready-pwd-eye-btn");
const readyPwdCopyBtn = document.querySelector("#ready-pwd-copy-btn");
const copyAllRdpBtn = document.querySelector("#copy-all-rdp-btn");

// Ultra-Luxurious Full-Screen Victory Modal Elements
const rdpReadyModal = document.querySelector("#rdp-ready-modal");
const popReadyIp = document.querySelector("#pop-ready-ip");
const popReadyUser = document.querySelector("#pop-ready-user");
const popReadyPwd = document.querySelector("#pop-ready-pwd");
const popReadyPort = document.querySelector("#pop-ready-port");
const popReadyMstsc = document.querySelector("#pop-ready-mstsc");
const popEyeBtn = document.querySelector("#pop-eye-btn");
const popCopyPwdBtn = document.querySelector("#pop-copy-pwd-btn");
const popCopyAllBtn = document.querySelector("#pop-copy-all-btn");
const popCloseBtn = document.querySelector("#pop-close-btn");

// Device History Elements
const historyList = document.querySelector("#history-list");
const historyCount = document.querySelector("#history-count");
const clearHistoryBtn = document.querySelector("#clear-history-btn");

// New Helper Buttons
const genPasswordBtn = document.querySelector("#gen-password-btn");
const copyRdpBtn = document.querySelector("#copy-rdp-btn");
const copyLogBtn = document.querySelector("#copy-log-btn");
const pasteUrlBtn = document.querySelector("#paste-url-btn");
const openProgressBtn = document.querySelector("#open-progress");

let ws = null;
let waitStartedAt = null;
let timerHandle = null;
let currentProgress = 0;
let currentStatus = "idle";
let currentStep = 1;
let lastProgressBucket = -1;
let lastProgressTopic = "";
let progressUrlValue = "";
let rdpTargetValue = "";
let activeJobId = null;
let hasTriggeredRdpReadyModal = false;

const waitingStatuses = new Set(["rebooting", "remote-progress", "windows-setup"]);
const terminalStatuses = new Set(["rdp-ready", "failed", "remote-error", "timeout", "finished"]);
const flowOrder = ["ssh", "installer", "web", "windows", "rdp"];
const STORAGE_KEY = "hfd_rdp_install_history";

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

// ==========================================================================
// WEB AUDIO SYNTHESIZER FOR VICTORY CHIME
// ==========================================================================

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.38);
    });
  } catch (err) {
    console.warn("Audio chime failed:", err);
  }
}

// ==========================================================================
// FULL-SCREEN RDP READY VICTORY POPUP LOGIC
// ==========================================================================

function showRdpReadyModal() {
  if (!rdpReadyModal) return;

  const targetHost = host.value.trim();
  const targetUser = rdpUsername.value.trim() || "administrator";
  const targetPwd = rdpPassword.value || "";
  const targetPort = rdpPort.value || "3389";

  if (popReadyIp) popReadyIp.textContent = targetHost;
  if (popReadyUser) popReadyUser.textContent = targetUser;
  if (popReadyPwd) {
    if (popReadyPwd.classList.contains("revealed")) {
      popReadyPwd.textContent = targetPwd;
    } else {
      popReadyPwd.textContent = "********";
    }
  }
  if (popReadyPort) popReadyPort.textContent = targetPort;
  if (popReadyMstsc) popReadyMstsc.textContent = `mstsc /v:${targetHost}:${targetPort}`;

  rdpReadyModal.classList.add("active");
  rdpReadyModal.setAttribute("aria-hidden", "false");
}

function hideRdpReadyModal() {
  if (rdpReadyModal) {
    rdpReadyModal.classList.remove("active");
    rdpReadyModal.setAttribute("aria-hidden", "true");
  }
}

if (popEyeBtn) {
  popEyeBtn.addEventListener("click", () => {
    if (popReadyPwd) {
      popReadyPwd.classList.toggle("revealed");
      showRdpReadyModal();
    }
  });
}

if (popCopyPwdBtn) {
  popCopyPwdBtn.addEventListener("click", () => {
    const pwdVal = rdpPassword.value || "";
    navigator.clipboard.writeText(pwdVal);
    const orig = popCopyPwdBtn.textContent;
    popCopyPwdBtn.textContent = "Tersalin!";
    setTimeout(() => { popCopyPwdBtn.textContent = orig; }, 2000);
  });
}

if (popCopyAllBtn) {
  popCopyAllBtn.addEventListener("click", () => {
    const targetHost = host.value.trim();
    const targetUser = rdpUsername.value.trim() || "administrator";
    const targetPwd = rdpPassword.value || "";
    const targetPort = rdpPort.value || "3389";

    copyAllRdpDetails(targetHost, targetUser, targetPwd, targetPort);
  });
}

if (popCloseBtn) {
  popCloseBtn.addEventListener("click", hideRdpReadyModal);
}

// ==========================================================================
// DEVICE-LOCAL STORAGE INSTALLATION HISTORY LOGIC (ISOLATED PER BROWSER)
// ==========================================================================

function getDeviceHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeviceHistory(historyArray) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyArray.slice(0, 30)));
  } catch (err) {
    console.warn("Storage save failed:", err);
  }
  renderDeviceHistory();
}

function addJobToHistory(jobInfo) {
  const history = getDeviceHistory();
  // Filter out duplicate if existing
  const filtered = history.filter((item) => item.id !== jobInfo.id);
  filtered.unshift(jobInfo);
  saveDeviceHistory(filtered);
}

function updateJobStatusInHistory(jobId, newStatus) {
  const history = getDeviceHistory();
  const target = history.find((item) => item.id === jobId);
  if (target) {
    target.status = newStatus;
    saveDeviceHistory(history);
  }
}

function renderDeviceHistory() {
  const history = getDeviceHistory();
  if (historyCount) historyCount.textContent = history.length;

  if (!historyList) return;

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <span>Belum ada riwayat instalasi pada perangkat ini.</span>
      </div>
    `;
    return;
  }

  historyList.innerHTML = history
    .map((item) => {
      const dateStr = new Date(item.timestamp).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <div class="history-card" data-job-id="${item.id}">
          <div class="hist-card-head">
            <div class="hist-host-info">
              <strong>${item.host}</strong>
              <span class="hist-os-tag">${item.osName}</span>
            </div>
            <span class="hist-status-pill" data-status="${item.status}">${item.status}</span>
          </div>

          <div class="hist-card-details">
            <div class="hist-cred-row">
              <span>Username: <strong class="highlight-text">${item.rdpUsername}</strong></span>
              <span>Port RDP: <strong>${item.rdpPort}</strong></span>
              <span>Port Web: <strong>${item.webPort}</strong></span>
            </div>
            <div class="hist-time">Dipasang: ${dateStr}</div>
          </div>

          <div class="hist-card-actions">
            <button type="button" class="btn-copy-chip" onclick="copyText('${item.host}:${item.rdpPort}')">
              Salin IP:Port
            </button>
            <button type="button" class="btn-copy-chip" onclick="copyText('mstsc /v:${item.host}:${item.rdpPort}')">
              Salin Command MSTSC
            </button>
            <button type="button" class="btn-copy-chip" onclick="copyAllRdpDetails('${item.host}', '${item.rdpUsername}', '${item.rdpPassword}', '${item.rdpPort}')">
              Salin Semua Kredensial
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    if (window.confirm("Hapus seluruh riwayat instalasi pada perangkat/browser ini?")) {
      localStorage.removeItem(STORAGE_KEY);
      renderDeviceHistory();
    }
  });
}

// Global Copy Helper for inline buttons
window.copyText = function (text) {
  navigator.clipboard.writeText(text);
  alert(`Tersalin ke Clipboard: ${text}`);
};

window.copyAllRdpDetails = function (ip, user, pwd, port) {
  const formatted = [
    `=== KREDENSIAL RDP WINDOWS (Haf.id Store) ===`,
    `IP Address Target: ${ip}`,
    `Username RDP     : ${user}`,
    `Password RDP     : ${pwd}`,
    `Port RDP         : ${port}`,
    `Perintah MSTSC   : mstsc /v:${ip}:${port}`,
    `==============================================`,
  ].join("\n");

  navigator.clipboard.writeText(formatted);
  alert("Seluruh detail RDP berhasil disalin ke Clipboard!");
};

// ==========================================================================
// RDP READY SUCCESS BANNER LOGIC
// ==========================================================================

function updateRdpSuccessBanner() {
  if (!rdpSuccessBanner) return;

  const targetHost = host.value.trim();
  const targetUser = rdpUsername.value.trim() || "administrator";
  const targetPwd = rdpPassword.value || "";
  const targetPort = rdpPort.value || "3389";

  if (readyIp) readyIp.textContent = targetHost;
  if (readyUser) readyUser.textContent = targetUser;
  if (readyPwd) {
    if (readyPwd.classList.contains("revealed")) {
      readyPwd.textContent = targetPwd;
    } else {
      readyPwd.textContent = "********";
    }
  }
  if (readyPort) readyPort.textContent = targetPort;
  if (readyMstscCmd) readyMstscCmd.textContent = `mstsc /v:${targetHost}:${targetPort}`;

  rdpSuccessBanner.style.display = "flex";
}

if (readyPwdEyeBtn) {
  readyPwdEyeBtn.addEventListener("click", () => {
    if (readyPwd) {
      readyPwd.classList.toggle("revealed");
      updateRdpSuccessBanner();
    }
  });
}

if (readyPwdCopyBtn) {
  readyPwdCopyBtn.addEventListener("click", () => {
    const pwdVal = rdpPassword.value || "";
    navigator.clipboard.writeText(pwdVal);
    const orig = readyPwdCopyBtn.textContent;
    readyPwdCopyBtn.textContent = "Tersalin!";
    setTimeout(() => { readyPwdCopyBtn.textContent = orig; }, 2000);
  });
}

if (copyAllRdpBtn) {
  copyAllRdpBtn.addEventListener("click", () => {
    const targetHost = host.value.trim();
    const targetUser = rdpUsername.value.trim() || "administrator";
    const targetPwd = rdpPassword.value || "";
    const targetPort = rdpPort.value || "3389";

    copyAllRdpDetails(targetHost, targetUser, targetPwd, targetPort);
  });
}

// Attach event listeners for .btn-copy-chip data-copy targets
document.querySelectorAll(".btn-copy-chip[data-copy]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetEl = document.querySelector(btn.dataset.copy);
    if (targetEl) {
      navigator.clipboard.writeText(targetEl.textContent.trim());
      const orig = btn.textContent;
      btn.textContent = "Tersalin!";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
  });
});

// ==========================================================================
// DYNAMIC VIEW TRANSITIONS (FORM VS ACTIVE INSTALLATION SCREEN)
// ==========================================================================

function enterExecutionView() {
  form.style.display = "none";
  if (stepperNav) stepperNav.style.display = "none";
  if (executionScreen) executionScreen.style.display = "flex";
  if (rdpSuccessBanner) rdpSuccessBanner.style.display = "none";

  if (execHeroIp) execHeroIp.textContent = host.value.trim() || "-";
  if (execHeroOs) {
    const presetObj = windowsPresets[windowsPreset.value];
    execHeroOs.textContent = presetObj && windowsPreset.value !== "custom" ? presetObj.imageName : (imageName.value.trim() || "Custom ISO");
  }
  if (execRdpUser) execRdpUser.textContent = rdpUsername.value.trim() || "administrator";
  if (execRdpPwd) execRdpPwd.textContent = rdpPassword.value || "********";
  if (execRdpPort) execRdpPort.textContent = rdpPort.value || "3389";
  if (execWebPort) execWebPort.textContent = `Port ${webPort.value || 80}`;

  document.body.classList.add("is-installing");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exitExecutionView() {
  if (executionScreen) executionScreen.style.display = "none";
  if (rdpSuccessBanner) rdpSuccessBanner.style.display = "none";
  if (stepperNav) stepperNav.style.display = "flex";
  form.style.display = "flex";
  document.body.classList.remove("is-installing");
  switchStep(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

if (resetInstallerBtn) {
  resetInstallerBtn.addEventListener("click", () => {
    if (window.confirm("Buka kembali formulir untuk melakukan konfigurasi VPS baru?")) {
      exitExecutionView();
    }
  });
}

// ==========================================================================
// CUSTOM LUXURY CONFIRMATION MODAL LOGIC
// ==========================================================================

function showConfirmModal(targetIp) {
  return new Promise((resolve) => {
    const modal = document.querySelector("#confirm-modal");
    const targetIpSpan = document.querySelector("#modal-target-ip");
    const confirmBtn = document.querySelector("#modal-confirm-btn");
    const cancelBtn = document.querySelector("#modal-cancel-btn");

    if (!modal) return resolve(window.confirm("Install akan menghapus seluruh disk VPS target. Lanjutkan?"));

    if (targetIpSpan) targetIpSpan.textContent = targetIp || host.value.trim() || "-";

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
  });
}

// ==========================================================================
// STEPPER WIZARD NAVIGATION & OS CARDS LOGIC
// ==========================================================================

function switchStep(targetStep) {
  const stepNum = Number(targetStep);
  if (stepNum < 1 || stepNum > 4) return;
  currentStep = stepNum;

  // Update Stepper Nav Tabs
  document.querySelectorAll(".step-tab").forEach((tab) => {
    const tNum = Number(tab.dataset.stepTarget);
    tab.classList.toggle("active", tNum === currentStep);
    tab.classList.toggle("completed", tNum < currentStep);
  });

  // Update Wizard Panes
  document.querySelectorAll(".wizard-pane").forEach((pane) => {
    const pNum = Number(pane.dataset.stepPane);
    pane.classList.toggle("active", pNum === currentStep);
  });

  updateSummary();
}

function syncOsCards(presetKey) {
  document.querySelectorAll(".os-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.preset === presetKey);
  });
}

function updateSummary() {
  if (sumHost) sumHost.textContent = host.value.trim() || "-";
  if (sumSshPort) sumSshPort.textContent = sshLoginPort.value || "22";
  if (sumSshUser) sumSshUser.textContent = sshUsername.value.trim() || "root";

  if (sumOsName) {
    const presetObj = windowsPresets[windowsPreset.value];
    sumOsName.textContent = presetObj && windowsPreset.value !== "custom" ? presetObj.imageName : (imageName.value.trim() || "Custom ISO");
  }
  if (sumOsMode) sumOsMode.textContent = windowsPreset.value === "custom" ? "Custom ISO Direct Link" : "Windows ISO Official";

  if (sumRdpUser) sumRdpUser.textContent = rdpUsername.value.trim() || "administrator";
  if (sumRdpPwd) {
    const pwdVal = rdpPassword.value || "";
    if (sumRdpPwd.classList.contains("revealed")) {
      sumRdpPwd.textContent = pwdVal || "(Belum diisi)";
    } else {
      sumRdpPwd.textContent = pwdVal ? "********" : "(Belum diisi)";
    }
  }
  if (sumRdpPort) sumRdpPort.textContent = rdpPort.value || "3389";
  if (sumWebPort) sumWebPort.textContent = webPort.value || "80";

  if (sumOptions) {
    const opts = [];
    if (allowPing.checked) opts.push("Ping ICMP [ok]");
    if (autoReboot.checked) opts.push("Auto Reboot [ok]");
    if (cnMirror.checked) opts.push("CN Mirror [ok]");
    sumOptions.textContent = opts.length ? opts.join(" | ") : "Tanpa Opsi";
  }
}

if (toggleSumPwdBtn) {
  toggleSumPwdBtn.addEventListener("click", () => {
    if (sumRdpPwd) {
      sumRdpPwd.classList.toggle("revealed");
      updateSummary();
    }
  });
}

// Password Generator
function generateRandomPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pwd = "";
  // Ensure strong password requirements: uppercase, lowercase, number, symbol
  pwd += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  pwd += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  pwd += "0123456789"[Math.floor(Math.random() * 10)];
  pwd += "!@#$%^&*"[Math.floor(Math.random() * 8)];
  for (let i = 4; i < 14; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  rdpPassword.value = pwd;
  renderValidation();
}

// Helper & Validation Functions
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
  return "Siap: Universal KVM VPS (Ready ISO).";
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
    problems.push("Link ISO Windows harus URL http atau https yang valid.");
  }
  if (imageName.value.trim().length < 3) {
    problems.push("Nama edisi WIM Windows wajib diisi (minimal 3 karakter).");
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
  if (manualProgressIp) manualProgressIp.value = manualProgressIp.value || host.value.trim();
  if (manualProgressPort) manualProgressPort.value = webPort.value;

  updateSummary();

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
  const presetKey = windowsPreset.value;
  syncOsCards(presetKey);
  mode.value = "iso";

  if (presetKey === "custom") {
    // Explicitly CLEAR both fields so user can input/paste their custom link from scratch
    imageUrl.value = "";
    imageName.value = "";
    imageUrl.placeholder = "Tempel / ketik URL ISO Windows kustom Anda (https://domain.com/win.iso)";
    imageName.placeholder = "Ketik nama edisi WIM Windows (contoh: Windows Server 2022 Datacenter)";
    renderValidation();
    setTimeout(() => imageUrl.focus(), 50);
    return;
  }

  const preset = windowsPresets[presetKey];
  if (preset) {
    imageName.value = preset.imageName;
    imageUrl.value = preset.imageUrl;
  }
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
  if (!force && normalized < currentProgress) return;
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
  setProgress(0, "Progress Installer", "Belum mulai.", true);
}

function applyStatusProgress(status) {
  const labelMap = {
    queued: ["Job Antrean", "Menunggu antrean..."],
    running: ["Job Dijalankan", "Script runner mulai..."],
    rebooting: ["Reboot VPS Target", "Server reboot..."],
    "remote-progress": ["Remote Progress Web", "Menerima progress..."],
    "windows-setup": ["Windows Penyiapan", "Penyiapan Windows..."],
    "rdp-ready": ["RDP Siap Dituju", "Install selesai."],
    failed: ["Gagal", "Terjadi kesalahan."],
    "remote-error": ["Gagal Progress", "Remoting gagal."],
    timeout: ["Timeout Progress", "Batas waktu habis."],
    finished: ["Selesai", "Reinstall selesai."],
  };

  const info = labelMap[status] || ["Status", status];
  stageLabel.textContent = info[0];

  const bucketMap = {
    queued: 5,
    running: 15,
    rebooting: 25,
    "remote-progress": 40,
    "windows-setup": 75,
    "rdp-ready": 100,
    finished: 100,
  };

  if (bucketMap[status] !== undefined) {
    setProgress(bucketMap[status], info[0], info[1]);
  }
}

function updateFlowStep(activeStep, hasError = false) {
  const isAllComplete = activeStep === "rdp" && !hasError;
  const activeIndex = flowOrder.indexOf(activeStep);

  document.querySelectorAll(".flow-step").forEach((el) => {
    const key = el.dataset.step;
    const itemIndex = flowOrder.indexOf(key);

    el.classList.remove("active", "complete", "error");
    const sub = el.querySelector("em");

    if (isAllComplete || itemIndex < activeIndex) {
      el.classList.add("complete");
      if (sub) sub.textContent = "Selesai";
    } else if (itemIndex === activeIndex) {
      if (hasError) {
        el.classList.add("error");
        if (sub) sub.textContent = "Error";
      } else {
        el.classList.add("active");
        if (sub) sub.textContent = "Proses...";
      }
    } else {
      if (sub) sub.textContent = "Terkunci";
    }
  });
}

function updateGatedOutputs(status) {
  const isReady = status === "rdp-ready" || status === "finished";

  if (isReady && progressUrlValue) {
    progressUrl.href = progressUrlValue;
    progressUrl.classList.remove("disabled");
    progressUrl.querySelector("strong").textContent = progressUrlValue;
  } else {
    progressUrl.href = "#";
    progressUrl.classList.add("disabled");
    progressUrl.querySelector("strong").textContent = "Terkunci";
  }

  if (isReady && rdpTargetValue) {
    rdpTarget.textContent = rdpTargetValue;
  } else {
    rdpTarget.textContent = "Terkunci";
  }
}

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resetWaitTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  waitStartedAt = null;
  waitTimer.textContent = "00:00";
}

function startWaitTimer() {
  if (waitStartedAt) return;
  waitStartedAt = Date.now();
  timerHandle = setInterval(() => {
    waitTimer.textContent = formatElapsed(Date.now() - waitStartedAt);
  }, 1000);
}

function stopWaitTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

function setStage(status) {
  currentStatus = status;
  jobStatus.dataset.status = status;
  jobStatus.textContent = status;
  stageCard.dataset.status = status;

  applyStatusProgress(status);

  if (activeJobId) {
    updateJobStatusInHistory(activeJobId, status);
  }

  if (waitingStatuses.has(status)) {
    startWaitTimer();
  }
  if (terminalStatuses.has(status)) {
    stopWaitTimer();
  }

  if (status === "queued" || status === "running") {
    jobTitle.textContent = "Koneksi SSH Target";
    updateFlowStep("ssh");
  } else if (status === "rebooting") {
    jobTitle.textContent = "Reboot & Runner Script";
    updateFlowStep("installer");
  } else if (status === "remote-progress") {
    jobTitle.textContent = "Progress Installer Web";
    updateFlowStep("web");
  } else if (status === "windows-setup") {
    jobTitle.textContent = "Penyiapan Windows Target";
    updateFlowStep("windows");
  } else if (status === "rdp-ready" || status === "finished") {
    jobTitle.textContent = "Install Selesai - RDP Ready!";
    updateFlowStep("rdp", false);
    updateRdpSuccessBanner();

    // Trigger Ultra-Luxurious Full-Screen Victory Popup + Sound Chime
    if (!hasTriggeredRdpReadyModal) {
      hasTriggeredRdpReadyModal = true;
      showRdpReadyModal();
      playSuccessChime();
    }
  } else if (status === "failed" || status === "remote-error" || status === "timeout") {
    jobTitle.textContent = "Proses Gagal";
    updateFlowStep("installer", true);
  }
}

function addLog(text) {
  if (!text) return;

  if (liveLog.textContent === "Log teknis akan muncul di sini...") {
    liveLog.textContent = "";
  }

  const div = document.createElement("div");
  div.className = "log-row";

  if (/error|failed|fault|invalid|fatal/i.test(text)) {
    div.classList.add("is-error");
  } else if (/success|ok|ready|complete|finished/i.test(text)) {
    div.classList.add("is-ok");
  } else if (/wait|reboot|progress|downloading/i.test(text)) {
    div.classList.add("is-wait");
  } else if (/\[info\]|\[ssh\]|\[ws\]/i.test(text)) {
    div.classList.add("is-info");
  }

  div.textContent = text;
  liveLog.appendChild(div);
  liveLog.scrollTop = liveLog.scrollHeight;

  const percent = extractLogPercent(text);
  if (percent !== null) {
    const topic = progressTopic(text);
    const mapped = mapInstallProgress(percent, text);
    const detail = `${topic}: ${percent}% (${mapped}% total)`;
    setProgress(mapped, topic, detail);

    const bucket = Math.floor(percent / 10);
    if (bucket !== lastProgressBucket || topic !== lastProgressTopic) {
      lastProgressBucket = bucket;
      lastProgressTopic = topic;
    }
  }
}

function payload() {
  const username = rdpUsername.value.trim() || "administrator";
  return {
    host: host.value.trim(),
    sshUsername: sshUsername.value.trim(),
    sshPassword: sshPassword.value,
    sshLoginPort: Number(sshLoginPort.value) || 22,
    provider: provider.value,
    mode: mode.value,
    windowsPreset: windowsPreset.value,
    imageName: imageName.value.trim(),
    imageUrl: imageUrl.value.trim(),
    username,
    rdpUsername: rdpUsername.value.trim(),
    rdpPassword: rdpPassword.value,
    rdpPort: Number(rdpPort.value) || 3389,
    installSshPort: Number(installSshPort.value) || 22,
    webPort: Number(webPort.value) || 80,
    allowPing: allowPing.checked,
    autoReboot: autoReboot.checked,
    cnMirror: cnMirror.checked,
  };
}

function connectLogs(jobId) {
  if (ws) {
    ws.close();
    ws = null;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/jobs/${jobId}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    addLog("[ws] WebSocket terhubung.");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "snapshot") {
        const snapshotStatus = data.job?.status || data.status || currentStatus;
        setStage(snapshotStatus);
        progressUrlValue = data.job?.progressUrl || data.progressUrl || progressUrlValue;
        rdpTargetValue = data.job?.rdpTarget || data.rdpTarget || rdpTargetValue;
        updateGatedOutputs(snapshotStatus);

        const snapshotLogs = data.job?.logs || data.logs || [];
        if (Array.isArray(snapshotLogs)) {
          snapshotLogs.forEach((logItem) => {
            const msg = typeof logItem === "object" ? logItem.message : logItem;
            addLog(msg);
          });
        }
      } else if (data.type === "status") {
        setStage(data.status);
        if (data.progressUrl) progressUrlValue = data.progressUrl;
        if (data.rdpTarget) rdpTargetValue = data.rdpTarget;
        updateGatedOutputs(data.status);
      } else if (data.type === "log") {
        const msg = typeof data.entry === "object" ? data.entry.message : data.message;
        addLog(msg);
      }
    } catch (err) {
      console.warn("WebSocket parse error:", err);
      addLog(`[ws] Gagal membaca pesan WebSocket: ${err.message}`);
    }
  };

  ws.onerror = () => {
    addLog("[ws] Error koneksi WebSocket.");
  };

  ws.onclose = () => {
    addLog("[ws] WebSocket terputus.");
  };
}

// Open Progress URL Helper Button
if (openProgressBtn) {
  openProgressBtn.addEventListener("click", () => {
    const ip = (manualProgressIp.value.trim() || host.value.trim());
    const port = (manualProgressPort.value || webPort.value || 80);
    if (!ip) {
      alert("Masukkan IP Address VPS target terlebih dahulu.");
      return;
    }
    const url = `http://${ip}:${port}/`;
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

// Stepper Tab Click Listeners
document.querySelectorAll(".step-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    switchStep(tab.dataset.stepTarget);
  });
});

// Next / Prev Buttons in Panes
document.querySelectorAll("[data-next-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchStep(btn.dataset.nextStep);
  });
});

document.querySelectorAll("[data-prev-step]").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchStep(btn.dataset.prevStep);
  });
});

// OS Cards Click Listener
document.querySelectorAll(".os-card").forEach((card) => {
  card.addEventListener("click", () => {
    const presetKey = card.dataset.preset;
    windowsPreset.value = presetKey;
    applyWindowsPreset();
  });
});

// Paste ISO URL Helper Button
if (pasteUrlBtn) {
  pasteUrlBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        imageUrl.value = text.trim();
        windowsPreset.value = "custom";
        syncOsCards("custom");
        if (!imageName.value.trim()) {
          imageName.value = "Windows Custom Image";
        }
        renderValidation();
        const originalHtml = pasteUrlBtn.innerHTML;
        pasteUrlBtn.textContent = "Tertempel!";
        setTimeout(() => { pasteUrlBtn.innerHTML = originalHtml; }, 2000);
      }
    } catch (err) {
      console.warn("Clipboard access failed:", err);
    }
  });
}

// Password Generator
if (genPasswordBtn) {
  genPasswordBtn.addEventListener("click", generateRandomPassword);
}

// Copy RDP Command
if (copyRdpBtn) {
  copyRdpBtn.addEventListener("click", () => {
    const textToCopy = rdpTargetValue ? `mstsc /v:${rdpTargetValue}` : `${host.value.trim()}:${rdpPort.value}`;
    navigator.clipboard.writeText(textToCopy);
    const originalText = copyRdpBtn.textContent;
    copyRdpBtn.textContent = "Tersalin!";
    setTimeout(() => { copyRdpBtn.textContent = originalText; }, 2000);
  });
}

// Copy Live Log
if (copyLogBtn) {
  copyLogBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(liveLog.innerText);
    const originalText = copyLogBtn.textContent;
    copyLogBtn.textContent = "Tersalin!";
    setTimeout(() => { copyLogBtn.textContent = originalText; }, 2000);
  });
}

// Password View Toggle
document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(button.dataset.toggle);
    input.type = input.type === "password" ? "text" : "password";
  });
});

// Load Preset Example
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
  switchStep(1);
});

windowsPreset.addEventListener("change", applyWindowsPreset);

imageName.addEventListener("input", () => {
  windowsPreset.value = "custom";
  syncOsCards("custom");
});

imageUrl.addEventListener("input", () => {
  windowsPreset.value = "custom";
  syncOsCards("custom");
});

// Form Submit with Luxury Modal Confirm & Transition to Active Execution Dashboard
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const problems = validate();
  if (problems.length) {
    renderValidation();
    switchStep(1);
    return;
  }

  const confirmed = await showConfirmModal(host.value.trim());
  if (!confirmed) return;

  // Transition UI: Hide 4-Step Form, Show Active Execution Dashboard & Focus Monitor
  enterExecutionView();

  hasTriggeredRdpReadyModal = false;
  startButton.disabled = true;
  liveLog.textContent = "";
  resetWaitTimer();
  resetProgress();
  progressUrlValue = "";
  rdpTargetValue = "";
  updateGatedOutputs("idle");
  addLog("Mengirim job install ke backend...");
  setStage("queued");

  let response;
  let result;
  try {
    response = await fetch("/api/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const text = await response.text();
    result = text ? JSON.parse(text) : {};
  } catch (err) {
    addLog(`[backend] Request install gagal: ${err.message}`);
    setStage("failed");
    startButton.disabled = false;
    return;
  }

  if (!response.ok) {
    addLog((result.problems || [result.error || "Request gagal."]).join(" "));
    setStage("failed");
    startButton.disabled = false;
    return;
  }

  activeJobId = result.jobId;
  addLog(`[backend] Job diterima: ${result.jobId}`);
  progressUrlValue = result.progressUrl;
  rdpTargetValue = result.rdpTarget;
  updateGatedOutputs(currentStatus);
  manualProgressIp.value = host.value.trim();
  manualProgressPort.value = webPort.value;

  // Save Job into Device-Local History (Isolated per Browser/Device)
  const presetObj = windowsPresets[windowsPreset.value];
  const osNameStr = presetObj && windowsPreset.value !== "custom" ? presetObj.imageName : (imageName.value.trim() || "Custom ISO");

  addJobToHistory({
    id: result.jobId,
    timestamp: new Date().toISOString(),
    host: host.value.trim(),
    osName: osNameStr,
    rdpUsername: rdpUsername.value.trim() || "administrator",
    rdpPassword: rdpPassword.value || "",
    rdpPort: Number(rdpPort.value) || 3389,
    webPort: Number(webPort.value) || 80,
    status: "queued",
  });

  connectLogs(result.jobId);
});

form.addEventListener("input", renderValidation);
form.addEventListener("change", renderValidation);

// Initial State Setup
setStage("idle");
resetProgress();
updateGatedOutputs("idle");
renderValidation();
applyWindowsPreset();
renderDeviceHistory();
switchStep(1);
