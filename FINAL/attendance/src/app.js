let BASE = 'http://127.0.0.1:8765';
const ENGINE_PORTS = Array.from({ length: 20 }, (_, index) => 8765 + index);
let startupLogText = '';
let startupLogLoading = false;
const qs = (id) => document.getElementById(id);
let state = null;
let timer = null;
let activationToken = '';
let activationPhone = '';
let otpCountdown = null;
let otpSeconds = 0;
let updateInfo = null;
let updateBusy = false;
let engineAttempts = 0;
let appVersion = '';

async function loadAppVersion() {
  const bridge = tauri();
  if (!bridge?.core?.invoke) return;
  try { appVersion = String(await bridge.core.invoke('app_version') || ''); } catch { /* ignore */ }
}

async function discoverEngine() {
  const bridge = tauri();
  if (bridge?.core?.invoke) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const port = Number(await bridge.core.invoke('engine_port'));
        if (port > 0) {
          BASE = `http://127.0.0.1:${port}`;
          return true;
        }
      } catch { /* retry while the supervisor starts the sidecar */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return false;
  }
  for (const port of ENGINE_PORTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 700);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { cache: 'no-store', signal: controller.signal });
      if (response.ok) {
        BASE = `http://127.0.0.1:${port}`;
        return true;
      }
    } catch { /* try the next port */ }
    finally { clearTimeout(timer); }
  }
  return false;
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status}).`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body.data;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function when(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
}
function cameraState(camera) {
  if (camera.approvalStatus !== 'APPROVED') return { label: 'Removed by employer', cls: 'muted' };
  if (!camera.ipWhitelisted) return { label: 'IP whitelisting pending', cls: 'warn' };
  if (camera.cameraOnline) return { label: 'Active · online', cls: 'ok' };
  return { label: 'Active · offline', cls: 'muted' };
}
function statusPill(camera) {
  if (camera.status === 'NO_RTSP') return '<span class="pill warn">No RTSP</span>';
  if (camera.status === 'ONLINE') return '<span class="pill ok">Live</span>';
  if (camera.status === 'AUTH_FAILED') return '<span class="pill bad">Reconnect needed</span>';
  return `<span class="pill ${camera.status === 'RECONNECTING' ? 'warn' : 'muted'}">${esc(camera.status || 'Unknown')}</span>`;
}

function showMessage(id, text, ok = false) {
  const el = qs(id);
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${ok ? 'ok' : 'error'}`;
}
function showDialog({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
      <div class="dialog-icon ${danger ? 'danger' : ''}">${danger ? '!' : '?'}</div>
      <h3 id="dialogTitle">${esc(title)}</h3>
      <p>${esc(body)}</p>
      <div class="dialog-actions">
        ${cancelLabel ? `<button type="button" class="btn" data-dialog-cancel>${esc(cancelLabel)}</button>` : ''}
        <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-dialog-confirm>${esc(confirmLabel)}</button>
      </div>
    </div>`;
    let settled = false;
    const close = value => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      resolve(value);
    };
    const onKey = event => {
      if (event.key === 'Escape') close(false);
      else if (event.key === 'Enter') close(true);
    };
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(false); });
    backdrop.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => close(false));
    backdrop.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.querySelector('[data-dialog-confirm]')?.focus());
  });
}

async function showAlert(title, body) {
  await showDialog({ title, body, confirmLabel: 'OK', cancelLabel: '' });
}

function setStep(step) {
  const ids = ['phoneStep', 'otpStep', 'deviceStep'];
  ids.forEach((id, index) => {
    const el = qs(id);
    if (el) el.classList.toggle('hidden', index + 1 !== step);
    const pill = qs(`stepPill${index + 1}`);
    if (pill) {
      pill.classList.toggle('active', index + 1 === step);
      pill.classList.toggle('done', index + 1 < step);
    }
  });
}
function clearOtpTimer() {
  if (otpCountdown) clearInterval(otpCountdown);
  otpCountdown = null;
}
function startOtpTimer() {
  clearOtpTimer();
  otpSeconds = 60;
  const btn = qs('resendOtpBtn');
  const label = qs('resendNote');
  const tick = () => {
    if (btn) btn.disabled = otpSeconds > 0;
    if (label) label.textContent = otpSeconds > 0 ? `Resend available in ${otpSeconds}s` : 'You can resend the OTP now.';
    if (otpSeconds <= 0) { clearOtpTimer(); return; }
    otpSeconds -= 1;
  };
  tick();
  otpCountdown = setInterval(tick, 1000);
}

function renderActivation() {
  clearOtpTimer();
  qs('logoutBtn').classList.add('hidden');
  qs('refreshBtn').classList.add('hidden');
  qs('stopEngineBtn').classList.add('hidden');
  qs('app').innerHTML = `
    <section class="card activation">
      <div class="activation-head">
        <img class="activation-logo" src="bss-original-logo.png" alt="Bharat Shram Setu" />
        <div>
          <h2>Activate this client</h2>
          <p class="muted">Sign in with the employer owner's mobile. This device will be able to run cameras for every site of that employer.</p>
        </div>
      </div>
      <div class="stepper">
        <div id="stepPill1" class="step-pill active">1 · Mobile</div>
        <div id="stepPill2" class="step-pill">2 · OTP</div>
        <div id="stepPill3" class="step-pill">3 · Device</div>
      </div>

      <section id="phoneStep" class="activation-step">
        <div class="step-title"><span class="num">1</span><p>Employer mobile number</p></div>
        <label>Employer owner mobile
          <input id="phone" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="10-digit mobile" />
        </label>
        <div class="row"><button id="sendOtpBtn" class="btn primary" type="button">Send OTP</button></div>
      </section>

      <section id="otpStep" class="activation-step hidden">
        <div class="step-title"><span class="num">2</span><p>Verify OTP</p></div>
        <label>One-time password
          <input id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6-digit OTP" />
        </label>
        <div class="row">
          <button id="verifyOtpBtn" class="btn primary" type="button">Verify OTP</button>
          <button id="resendOtpBtn" class="btn" type="button">Resend OTP</button>
          <button id="changePhoneBtn" class="btn ghost" type="button">Change number</button>
        </div>
        <div class="otp-meta">
          <p id="otpSentTo"></p>
          <p id="resendNote"></p>
        </div>
      </section>

      <section id="deviceStep" class="activation-step hidden">
        <div class="step-title"><span class="num">3</span><p>Name this device</p></div>
        <label>Device name
          <input id="deviceName" maxlength="120" placeholder="Site server" />
        </label>
        <p class="input-note">Use a name your team will recognise. No site selection is needed.</p>
        <div class="row"><button id="activateBtn" class="btn orange" type="button">Activate device</button></div>
      </section>

      <p id="activationMsg" class="msg"></p>
    </section>`;

  qs('sendOtpBtn').onclick = async () => {
    const phone = qs('phone').value.replace(/\D/g, '');
    if (phone.length !== 10) { showMessage('activationMsg', 'Enter a valid 10-digit employer mobile number.'); return; }
    const btn = qs('sendOtpBtn');
    btn.disabled = true;
    btn.textContent = 'Sending OTP…';
    try {
      await api('/api/activate/request-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      activationPhone = phone;
      qs('otpSentTo').textContent = `OTP sent to ${phone.slice(0, 2)}••••••${phone.slice(-2)}`;
      qs('activationMsg').className = 'msg';
      setStep(2);
      startOtpTimer();
      qs('otp').focus();
    } catch (error) {
      showMessage('activationMsg', error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send OTP';
    }
  };

  qs('verifyOtpBtn').onclick = async () => {
    const otp = qs('otp').value.trim();
    if (!/^\d{4,8}$/.test(otp)) { showMessage('activationMsg', 'Enter the OTP sent to the employer mobile.'); return; }
    const btn = qs('verifyOtpBtn');
    btn.disabled = true;
    btn.textContent = 'Verifying…';
    try {
      const data = await api('/api/activate/verify-otp', { method: 'POST', body: JSON.stringify({ phone: activationPhone, otp }) });
      activationToken = data.activationToken;
      clearOtpTimer();
      setStep(3);
      qs('activationMsg').className = 'msg';
      qs('deviceName').focus();
    } catch (error) {
      showMessage('activationMsg', error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify OTP';
    }
  };

  qs('resendOtpBtn').onclick = async () => {
    const btn = qs('resendOtpBtn');
    btn.disabled = true;
    try {
      await api('/api/activate/request-otp', { method: 'POST', body: JSON.stringify({ phone: activationPhone }) });
      startOtpTimer();
      showMessage('activationMsg', 'A new OTP has been sent.', true);
    } catch (error) {
      showMessage('activationMsg', error.message);
      btn.disabled = false;
    }
  };

  qs('changePhoneBtn').onclick = () => {
    clearOtpTimer();
    activationToken = '';
    activationPhone = '';
    qs('phone').value = '';
    qs('otp').value = '';
    qs('activationMsg').className = 'msg';
    setStep(1);
    qs('phone').focus();
  };

  qs('activateBtn').onclick = async () => {
    const deviceName = qs('deviceName').value.trim();
    if (!deviceName) { showMessage('activationMsg', 'Enter a device name.'); return; }
    const btn = qs('activateBtn');
    btn.disabled = true;
    btn.textContent = 'Activating…';
    try {
      state = await api('/api/activate/complete', {
        method: 'POST',
        body: JSON.stringify({ activationToken, deviceName }),
      });
      render();
      startPolling();
      void checkForUpdates(false);
    } catch (error) {
      showMessage('activationMsg', error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Activate device';
    }
  };

  qs('phone').addEventListener('keydown', event => { if (event.key === 'Enter') qs('sendOtpBtn').click(); });
  qs('otp').addEventListener('keydown', event => { if (event.key === 'Enter') qs('verifyOtpBtn').click(); });
  qs('deviceName').addEventListener('keydown', event => { if (event.key === 'Enter') qs('activateBtn').click(); });
}

function openLiveView(camera) {
  const id = camera.cameraId;
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `<div class="dialog live-dialog" role="dialog" aria-modal="true" aria-labelledby="liveTitle">
    <div class="live-head">
      <div><h3 id="liveTitle">${esc(camera.label)}</h3><p class="muted">${esc(camera.siteName || 'Local camera')} · ${esc(camera.status || 'CONNECTING')}</p></div>
      <button type="button" class="live-close" data-live-close aria-label="Close live view">×</button>
    </div>
    <div class="live-frame">
      <img data-live-image alt="${esc(camera.label)} live view" />
      <div class="live-empty" data-live-empty>Connecting to the camera…</div>
    </div>
    <div class="live-foot">
      <p class="note">Local RTSP preview from this laptop. Attendance upload starts automatically after the employer whitelists this device's public IP.</p>
      <div class="live-meta"><span>Allowed IP</span><b>${esc(camera.allowedIp || 'Waiting for employer')}</b><span>Whitelisted</span><b>${camera.ipWhitelisted ? 'Yes' : 'No'}</b></div>
      <p class="note" data-live-status></p>
    </div>
  </div>`;
  let timer = null;
  let objectUrl = '';
  let closed = false;
  const image = backdrop.querySelector('[data-live-image]');
  const empty = backdrop.querySelector('[data-live-empty]');
  const status = backdrop.querySelector('[data-live-status]');
  const close = () => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
  };
  const onKey = event => { if (event.key === 'Escape') close(); };
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
  backdrop.querySelector('[data-live-close]')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  const tick = async () => {
    if (closed) return;
    try {
      const response = await fetch(`${BASE}/snapshot/${id}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 503 ? 'Waiting for the first camera frame…' : `Camera preview failed (${response.status}).`);
      const blob = await response.blob();
      if (closed) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      image.src = objectUrl;
      image.style.display = 'block';
      empty.style.display = 'none';
      status.textContent = '';
    } catch (error) {
      image.style.display = 'none';
      empty.style.display = 'grid';
      empty.textContent = error.message;
      status.textContent = 'Retrying automatically…';
    } finally {
      if (!closed) timer = setTimeout(tick, 800);
    }
  };
  void tick();
}

function cameraCard(camera) {
  const id = camera.cameraId;
  const stateInfo = cameraState(camera);
  const canPreview = camera.rtspConfigured;
  return `<section class="card cam" data-camera="${id}">
    <div class="cam-head">
      <div class="cam-title"><h3>${esc(camera.label)}</h3>${statusPill(camera)}</div>
      <span class="pill ${stateInfo.cls}">${esc(stateInfo.label)}</span>
    </div>
    <div class="cam-body">
      <div class="cam-info">
        <div>Camera ID<b class="mono">${esc(camera.uid || '—')}</b></div>
        <div>Source device<b>${esc(camera.sourceDeviceName || state.deviceName || 'This device')}</b></div>
        <div>BSS Site ID<b>${esc(camera.siteBssId || '—')}</b></div>
        <div>Timezone<b>IST (UTC+05:30)</b></div>
        <div>Allowed IP<b>${esc(camera.allowedIp || 'Waiting for employer')}</b></div>
        <div>RTSP<b>${esc(camera.rtspConfigured ? 'Configured' : 'Not configured')}</b></div>
        <div>Last event<b>${esc(when(camera.lastEventAt))}</b></div>
      </div>
      <p class="note">${camera.sendBlockedReason ? `<span class="${camera.approvalStatus === 'APPROVED' && camera.ipWhitelisted ? 'blocked' : ''}">${esc(camera.sendBlockedReason)}</span>` : 'Attendance is active. Events sync automatically after an internet outage.'}</p>
      <div class="row cam-actions" style="margin-top:10px">
        <button id="live-${id}" class="btn primary" type="button" ${canPreview ? '' : 'disabled'}>See live</button>
        ${camera.canRemove
          ? `<button id="remove-${id}" class="btn danger" type="button">Remove camera</button>`
          : `<span class="note">Registered on ${esc(camera.sourceDeviceName || 'another device')} — remove it from that device.</span>`}
      </div>
    </div>
  </section>`;
}

function localEventRows(events, cameras) {
  if (!events.length) return '<p class="muted" style="margin:0">No local events yet. Events are saved here even when the internet is down.</p>';
  const labels = new Map(cameras.map(camera => [Number(camera.cameraId), camera.label]));
  return events.map(event => {
    const status = event.syncStatus === 'SYNCED' ? 'Synced to BSS'
      : event.syncStatus === 'REJECTED' ? 'Rejected by BSS' : 'Saved locally · waiting to sync';
    const cls = event.syncStatus === 'SYNCED' ? 'ok' : event.syncStatus === 'REJECTED' ? 'bad' : 'warn';
    return `<div class="local-event">
      <div><b>${esc(labels.get(Number(event.cameraId)) || `Camera ${event.cameraId}`)}</b><span>${esc(when(event.occurredAt))}</span></div>
      <span class="pill ${cls}">${esc(status)}</span>
    </div>`;
  }).join('');
}

function siteCapacity(site, cameras) {
  const limit = Math.max(1, Number(site.cameraLimit || 5));
  const used = cameras.length;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

function siteSection(site, cameras) {
  const capacity = siteCapacity(site, cameras);
  return `<section class="site-group">
    <div class="site-head">
      <div>
        <h3>${esc(site.name || 'Employer site')}</h3>
        <p>${esc(site.bssId || 'No BSS site ID')} · ${capacity.used} / ${capacity.limit} camera slots used · ${capacity.remaining} remaining</p>
      </div>
      <div class="site-meta"><span class="pill ${capacity.remaining ? 'ok' : 'warn'}">${capacity.remaining ? `${capacity.remaining} slots left` : 'Camera slots full'}</span></div>
    </div>
    ${cameras.length ? `<div class="grid cams">${cameras.map(cameraCard).join('')}</div>` : '<div class="card empty">No cameras added for this site yet.</div>'}
  </section>`;
}

function resourceNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resourceMb(value) {
  const number = resourceNumber(value);
  if (number === null) return '—';
  if (Math.abs(number) >= 1024) return `${(number / 1024).toFixed(1)} GB`;
  return `${Math.round(number)} MB`;
}

function resourceGb(value) {
  const number = resourceNumber(value);
  return number === null ? '—' : `${(number / 1024).toFixed(1)} GB`;
}

function resourcePercent(value) {
  const number = resourceNumber(value);
  return number === null ? '—' : `${number.toFixed(1)}%`;
}

function resourceBitRate(value) {
  const number = resourceNumber(value);
  if (number === null) return '—';
  const bits = number * 8;
  if (bits >= 1e9) return `${(bits / 1e9).toFixed(1)} Gbps`;
  if (bits >= 1e6) return `${(bits / 1e6).toFixed(1)} Mbps`;
  if (bits >= 1e3) return `${(bits / 1e3).toFixed(1)} Kbps`;
  return `${Math.round(bits)} bps`;
}

function resourceDataRate(value) {
  const number = resourceNumber(value);
  if (number === null) return '—';
  if (number >= 1e9) return `${(number / 1e9).toFixed(1)} GB/s`;
  if (number >= 1e6) return `${(number / 1e6).toFixed(1)} MB/s`;
  if (number >= 1e3) return `${(number / 1e3).toFixed(1)} KB/s`;
  return `${Math.round(number)} B/s`;
}

function resourceDuration(value) {
  const number = resourceNumber(value);
  if (number === null) return '—';
  const seconds = Math.max(0, Math.round(number));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

function gpuBadge(gpu) {
  const state = gpu.state || (gpu.active ? 'active' : (gpu.detected ? 'detected_unavailable' : 'unknown'));
  const labels = {
    active: 'GPU detected · active',
    detected_disabled: 'GPU detected · disabled',
    detected_unavailable: 'GPU detected · unavailable',
    not_detected: 'No GPU detected',
    required_unavailable: 'GPU required · unavailable',
    unknown: 'GPU detection unavailable',
  };
  const classes = {
    active: 'ok', detected_disabled: 'warn', detected_unavailable: 'warn',
    not_detected: 'muted', required_unavailable: 'bad', unknown: 'muted',
  };
  return `<span class="pill ${classes[state] || 'muted'}">${esc(labels[state] || labels.unknown)}</span>`;
}

function resourceLiveHtml(resources) {
  const detected = resources?.detected || {};
  const allocation = resources?.allocation || {};
  const engine = resources?.engine || {};
  const workload = resources?.workload || {};
  const gpu = resources?.gpu || {};
  const totalCores = resourceNumber(detected.cpuCores) ?? 1;
  const physicalCores = resourceNumber(detected.cpuPhysicalCores);
  const cpuPercent = resourcePercent(detected.cpuPercent);
  const load = resourceNumber(detected.load1);
  const memoryUsed = resourceMb(detected.memoryUsedMb);
  const memoryTotal = resourceGb(detected.memoryTotalMb);
  const memoryPercent = resourcePercent(detected.memoryPercent);
  const diskUsed = resourceGb(detected.diskUsedMb);
  const diskTotal = resourceGb(detected.diskTotalMb);
  const diskPercent = resourcePercent(detected.diskPercent);
  const diskFree = resourceGb(detected.diskFreeMb);
  const netDown = resourceBitRate(detected.netRecvRate);
  const netUp = resourceBitRate(detected.netSentRate);

  const configuredCores = resourceNumber(allocation.cpuCoresConfigured) ?? 0;
  const effectiveCores = resourceNumber(allocation.cpuCoresEffective) ?? totalCores;
  const allocatedCores = allocation.cpuCoresAutomatic
    ? `Automatic · ${effectiveCores} of ${totalCores} cores`
    : `${allocation.cpuCores || configuredCores} of ${totalCores} cores · ${effectiveCores} effective`;
  const gpuLimit = resourceNumber(allocation.gpuMemoryMb);
  const engineCpu = resourceNumber(engine.cpuPercent);
  const engineCoreShare = engineCpu === null ? '—' : `${(engineCpu / 100).toFixed(2)} cores`;
  const engineThreads = resourceNumber(engine.threads);
  const engineMemory = resourceMb(engine.memoryMb);
  const engineMemoryPct = resourcePercent(engine.memoryPercent);
  const engineStorage = resourceMb(engine.storageMb);
  const engineData = resourceMb(engine.dataMb);
  const engineModels = resourceMb(engine.modelsMb);
  const engineDiskRead = resourceDataRate(engine.diskReadRate);
  const engineDiskWrite = resourceDataRate(engine.diskWriteRate);
  const engineUptime = resourceDuration(engine.uptimeSeconds);

  const hardware = Array.isArray(gpu.hardware) ? gpu.hardware : [];
  const gpuHardware = hardware.map(item => {
    const name = item.name || `GPU ${item.index ?? ''}`;
    const memory = (item.memoryUsedMb == null && item.memoryTotalMb == null)
      ? 'VRAM unavailable'
      : `${resourceMb(item.memoryUsedMb)} / ${resourceMb(item.memoryTotalMb)}`;
    const parts = [memory];
    if (item.utilizationPercent != null) parts.push(`${resourcePercent(item.utilizationPercent)} util`);
    if (item.temperatureC != null) parts.push(`${resourcePercent(item.temperatureC).replace('%', '°C')}`);
    if (item.powerW != null) parts.push(`${Number(item.powerW).toFixed(1)} W`);
    return `<div class="res-gpu-name">${esc(name)}</div><div class="res-sub">${parts.map(esc).join(' · ')}</div>`;
  }).join('');
  const gpuTotals = gpu.totals || {};
  const gpuMemory = gpuTotals.memoryUsedMb == null
    ? 'VRAM usage unavailable'
    : `${resourceMb(gpuTotals.memoryUsedMb)} / ${resourceMb(gpuTotals.memoryTotalMb)} · ${resourcePercent(gpuTotals.utilizationPercent)} util`;
  const engineGpuUsed = resourceNumber(gpu.engineProcessMemoryMb);
  const engineGpuOver = engineGpuUsed !== null && gpuLimit !== null && engineGpuUsed > gpuLimit;
  const engineGpu = engineGpuUsed === null
    ? 'Engine GPU memory unavailable'
    : `Engine ${resourceMb(engineGpuUsed)}${gpuLimit ? ` · configured target ${resourceMb(gpuLimit)}${engineGpuOver ? ' (target exceeded)' : ''}` : ' · no target'}`;
  const gpuDetail = gpu.telemetryAvailable === false
    ? 'Detailed GPU telemetry is unavailable for this provider.'
    : (gpu.detected === false ? 'No GPU hardware was detected.' : '');
  const gpuMessage = gpu.message || gpuDetail;

  return `<div class="res-grid">
    <div class="res-panel">
      <h4>System</h4>
      <div class="res-list">
        <div><span>CPU</span><b>${esc(String(totalCores))} logical${physicalCores ? ` · ${physicalCores} physical` : ''}</b></div>
        <div><span>CPU load</span><b>${esc(cpuPercent)}${load === null ? '' : ` · ${load.toFixed(2)} load`}</b></div>
        <div><span>RAM</span><b>${esc(memoryUsed)} / ${esc(memoryTotal)} · ${esc(memoryPercent)}</b></div>
        <div><span>Swap</span><b>${esc(resourceMb(detected.swapUsedMb))} / ${esc(resourceMb(detected.swapTotalMb))}</b></div>
        <div><span>Disk</span><b>${esc(diskUsed)} / ${esc(diskTotal)} · ${esc(diskPercent)}</b></div>
        <div><span>Disk free</span><b>${esc(diskFree)}</b></div>
        <div><span>Disk I/O</span><b>${esc(resourceDataRate(detected.diskReadRate))} read · ${esc(resourceDataRate(detected.diskWriteRate))} write</b></div>
        <div><span>Network</span><b>${esc(netDown)} ↓ · ${esc(netUp)} ↑</b></div>
      </div>
    </div>
    <div class="res-panel">
      <h4>Allocated to engine</h4>
      <div class="res-list">
        <div><span>CPU</span><b>${esc(allocatedCores)}</b></div>
        <div><span>AI workers</span><b>${esc(String(allocation.maxCameraWorkers ?? '—'))}</b></div>
        <div><span>GPU memory target</span><b>${gpuLimit ? esc(resourceMb(gpuLimit)) : 'No target'}</b></div>
        <div><span>RAM</span><b>No cap</b></div>
        <div><span>Disk</span><b>No cap</b></div>
      </div>
    </div>
    <div class="res-panel">
      <h4>Engine usage</h4>
      <div class="res-list">
        <div><span>CPU</span><b>${esc(engineCpu === null ? '—' : `${engineCpu.toFixed(1)}% · ${engineCoreShare}`)}</b></div>
        <div><span>Threads</span><b>${esc(engineThreads === null ? '—' : String(engineThreads))}</b></div>
        <div><span>RAM</span><b>${esc(engineMemory)} · ${esc(engineMemoryPct)}</b></div>
        <div><span>Disk data</span><b>${esc(engineStorage)} (${esc(engineData)} data + ${esc(engineModels)} models)</b></div>
        <div><span>Disk I/O</span><b>${esc(engineDiskRead)} read · ${esc(engineDiskWrite)} write</b></div>
        <div><span>Uptime</span><b>${esc(engineUptime)}</b></div>
      </div>
    </div>
    <div class="res-panel">
      <h4>GPU</h4>
      <div style="margin-bottom:8px">${gpuBadge(gpu)}</div>
      ${gpuHardware || `<div class="res-sub">${esc(gpuMessage)}</div>`}
      ${gpuHardware ? `<div class="res-sub">${esc(gpuMemory)}</div>` : ''}
      <div class="res-sub${engineGpuOver ? ' res-warn' : ''}" style="margin-top:6px">${esc(engineGpu)}</div>
      ${gpu.driver ? `<div class="res-sub">Driver ${esc(gpu.driver)} · ${esc(gpu.provider || '')}</div>` : ''}
      ${gpuDetail && gpuHardware ? `<div class="res-sub">${esc(gpuDetail)}</div>` : ''}
    </div>
    <div class="res-panel">
      <h4>Workload</h4>
      <div class="res-list">
        <div><span>Cameras</span><b>${esc(String(workload.cameras ?? '—'))}</b></div>
        <div><span>Active workers</span><b>${esc(String(workload.activeWorkers ?? '—'))} / ${esc(String(workload.maxWorkers ?? '—'))}</b></div>
        <div><span>Processing now</span><b>${esc(String(workload.processing ?? '—'))}</b></div>
        <div><span>FPS</span><b>${esc(String(workload.fps ?? '—'))}</b></div>
        <div><span>Faces now</span><b>${esc(String(workload.facesNow ?? '—'))}</b></div>
        <div><span>Frames processed</span><b>${esc(String(workload.framesProcessed ?? '—'))}</b></div>
      </div>
    </div>
  </div>`;
}

function resourceCard(resources) {
  resources = resources || {};
  const detected = resources.detected || {};
  const settings = resources.settings || {};
  const cores = Number(detected.cpuCores || 1);
  return `<section class="card">
    <div class="cam-title"><h3>System resources</h3><span class="pill muted">Display only · 10s refresh</span></div>
    <p class="muted">System-wide usage and the engine's current share. CPU affinity and AI-worker concurrency apply immediately. GPU memory is a best-effort target; RAM and disk are uncapped.</p>
    <div id="resourceLive">${resourceLiveHtml(resources)}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">
      <div><label>CPU cores to use<input id="resourceCores" type="number" min="0" max="${cores}" value="${esc(settings.cpuCores ?? 0)}" /><span class="note">0 = Automatic — uses all ${esc(cores)} available cores</span></label></div>
      <div><label>Cameras processed at once<input id="resourceWorkers" type="number" min="1" max="16" value="${esc(settings.maxCameraWorkers ?? 2)}" /></label></div>
      <div><label>AI acceleration<select id="resourceGpuMode"><option value="auto" ${settings.gpuMode !== 'off' && settings.gpuMode !== 'required' ? 'selected' : ''}>Automatic (GPU if available)</option><option value="off" ${settings.gpuMode === 'off' ? 'selected' : ''}>CPU only</option><option value="required" ${settings.gpuMode === 'required' ? 'selected' : ''}>Require GPU</option></select></label></div>
      <div><label>GPU memory limit MB<input id="resourceGpuMemory" type="number" min="0" max="65536" value="${esc(settings.gpuMemoryMb ?? 0)}" /><span class="note">0 = grow as needed · minimum 1024 MB when set</span></label></div>
      <button id="saveResourcesBtn" class="btn primary" type="button">Save resources</button>
    </div>
    <p id="resourceMsg" class="note"></p>
  </section>`;
}

function updateResourceLive(resources) {
  const container = qs('resourceLive');
  if (container) container.innerHTML = resourceLiveHtml(resources || {});
}

function render() {
  if (!state || !state.activated) { renderActivation(); return; }
  qs('logoutBtn').classList.remove('hidden');
  qs('refreshBtn').classList.remove('hidden');
  qs('stopEngineBtn').classList.remove('hidden');
  const conn = qs('conn');
  conn.textContent = state.bssConnected ? 'BSS connected' : 'Connecting to BSS…';
  conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;

  const sites = state.sites || [];
  const cameras = state.cameras || [];
  const grouped = sites.map(site => ({
    ...site,
    cameras: cameras.filter(camera => String(camera.siteBssId || '') === String(site.bssId || '') || Number(camera.siteId) === Number(site.id)),
  }));
  const known = new Set(grouped.flatMap(group => group.cameras.map(camera => camera.cameraId)));
  const unassigned = cameras.filter(camera => !known.has(camera.cameraId));
  if (unassigned.length) grouped.push({ id: null, bssId: '', name: 'Unassigned cameras', cameras: unassigned });
  const siteChoices = sites.map(site => {
    const count = cameras.filter(camera => String(camera.siteBssId || '') === String(site.bssId || '') || Number(camera.siteId) === Number(site.id)).length;
    return { ...site, capacity: siteCapacity(site, { length: count }) };
  });
  const firstAvailable = siteChoices.find(site => site.capacity.remaining > 0);
  const allSitesFull = sites.length > 0 && !firstAvailable;

  qs('app').innerHTML = `
    <div class="dashboard">
      <section class="card summary">
        <div>
          <p class="section-label">Bharat Shram Setu · Attendance Client</p>
          <h2>${esc(state.deviceName || state.employerName || 'Attendance device')}</h2>
          <p class="muted">${esc(state.employerName || 'Employer')} · ${sites.length} site${sites.length === 1 ? '' : 's'}</p>
        </div>
        <div class="meta">
          <div>Device ID<b class="mono" style="font-size:10px;word-break:break-all">${esc(state.deviceId || '—')}</b></div>
          <div>Heartbeat<b>${esc(when(state.lastHeartbeatAt))}</b></div>
          <div>Pending events<b>${esc(state.outbox ?? 0)}</b></div>
          <div>Cameras<b>${cameras.length}</b></div>
          <div>Client version<b>${esc(state.version || '—')}</b></div>
        </div>
      </section>

      ${resourceCard(state.resources)}

      <section class="card">
        <div class="cam-title"><h3>Add camera</h3><span class="pill muted">Test before saving</span></div>
        <p class="muted">Enter all details, test the RTSP connection, then save. Connection details cannot be edited after saving. Saving requires a live BSS server connection so the camera is synced.</p>
        ${state.bssConnected ? '' : '<p class="note blocked">BSS server connection required to save a camera.</p>'}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">
          <div><label>Site<select id="newCameraSite">${siteChoices.map(site => `<option value="${esc(site.bssId || site.id)}" ${site.capacity.remaining <= 0 ? 'disabled' : ''} ${firstAvailable && site.id === firstAvailable.id ? 'selected' : ''}>${esc(site.name)} — ${site.capacity.used}/${site.capacity.limit} used (${site.capacity.remaining} left)</option>`).join('')}</select></label></div>
          <div><label>Camera label<input id="newCameraLabel" maxlength="120" placeholder="Main Gate" /></label></div>
          <div><label>RTSP URL<input id="newCameraRtsp" placeholder="rtsp://user:pass@ip/stream" /></label></div>
        </div>
        <div class="row" style="margin-top:10px">
          <button id="testCameraBtn" class="btn" type="button" ${firstAvailable ? '' : 'disabled'}>Test RTSP</button>
          <button id="addCameraBtn" class="btn primary" type="button" disabled>Save camera</button>
        </div>
        <p id="testCameraMsg" class="note"></p>
        ${!sites.length ? '<p class="note blocked">The employer must create a site before you can add a camera.</p>' : allSitesFull ? '<p class="note blocked">All sites have reached their camera limit. Remove a camera or ask BSS admin to raise the limit.</p>' : ''}
      </section>

      <section class="card">
        <div class="cam-title"><h3>Local event log</h3><span class="pill ${state.outbox ? 'warn' : 'ok'}">${esc(state.outbox ? `${state.outbox} waiting to sync` : 'All events synced')}</span></div>
        <p class="muted">Events are stored on this machine when the internet is down and sync automatically when BSS is reachable.</p>
        ${localEventRows(state.localEvents || [], cameras)}
      </section>

      ${grouped.length ? grouped.map(group => siteSection(group, group.cameras)).join('') : '<div class="card empty">No employer sites are available for this client yet. Ask the employer to create a site.</div>'}
    </div>`;

  let cameraTested = false;
  const testMsg = qs('testCameraMsg');
  const saveBtn = qs('addCameraBtn');
  const testBtn = qs('testCameraBtn');
  const resetTest = () => {
    cameraTested = false;
    if (saveBtn) saveBtn.disabled = true;
    if (testMsg) { testMsg.textContent = ''; testMsg.style.color = ''; }
  };
  ['newCameraSite', 'newCameraLabel', 'newCameraRtsp'].forEach(id => {
    qs(id)?.addEventListener('input', resetTest);
    qs(id)?.addEventListener('change', resetTest);
  });
  const readForm = () => ({
    siteBssId: qs('newCameraSite').value,
    label: qs('newCameraLabel').value.trim(),
    rtsp: qs('newCameraRtsp').value.trim(),
  });
  const validateForm = form => {
    if (!form.label) return 'Enter a camera label.';
    if (!form.rtsp.toLowerCase().startsWith('rtsp://') && !form.rtsp.toLowerCase().startsWith('rtsps://')) return 'Enter a valid RTSP URL.';
    return '';
  };
  testBtn?.addEventListener('click', async () => {
    const form = readForm();
    const problem = validateForm(form);
    if (problem) { testMsg.textContent = problem; testMsg.style.color = '#DC2626'; return; }
    resetTest();
    testBtn.disabled = true;
    testBtn.textContent = 'Testing…';
    testMsg.textContent = 'Connecting to the camera stream…';
    testMsg.style.color = '';
    try {
      const result = await api('/api/test-rtsp', { method: 'POST', body: JSON.stringify({ rtsp: form.rtsp }) });
      if (result.ok) {
        cameraTested = true;
        saveBtn.disabled = false;
        testMsg.textContent = `RTSP connected — ${result.width}×${result.height}. You can save the camera.`;
        testMsg.style.color = '#14843C';
      } else {
        testMsg.textContent = result.error || 'RTSP test failed.';
        testMsg.style.color = '#DC2626';
      }
    } catch (error) {
      testMsg.textContent = error.message;
      testMsg.style.color = '#DC2626';
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test RTSP';
    }
  });
  saveBtn?.addEventListener('click', async () => {
    const form = readForm();
    const problem = validateForm(form);
    if (problem) { testMsg.textContent = problem; testMsg.style.color = '#DC2626'; return; }
    if (!cameraTested) { testMsg.textContent = 'Test the RTSP connection before saving.'; testMsg.style.color = '#DC2626'; return; }
    const chosen = siteChoices.find(site => String(site.bssId || site.id) === String(form.siteBssId));
    if (!chosen || chosen.capacity.remaining <= 0) {
      testMsg.textContent = 'This site has no camera slots left.'; testMsg.style.color = '#DC2626'; return;
    }
    saveBtn.disabled = true;
    try {
      state = await api('/api/cameras', { method: 'POST', body: JSON.stringify(form) });
      render();
    } catch (error) {
      testMsg.textContent = error.message;
      testMsg.style.color = '#DC2626';
      saveBtn.disabled = false;
    }
  });

  qs('saveResourcesBtn')?.addEventListener('click', async () => {
    const msg = qs('resourceMsg');
    try {
      state = await api('/api/resources', { method: 'POST', body: JSON.stringify({
        cpuCores: Number(qs('resourceCores').value || 0),
        maxCameraWorkers: Number(qs('resourceWorkers').value || 1),
        gpuMode: qs('resourceGpuMode').value,
        gpuMemoryMb: Number(qs('resourceGpuMemory').value || 0),
      }) });
      render();
      showMessage('resourceMsg', 'Resource settings saved.', true);
    } catch (error) {
      if (msg) { msg.textContent = error.message; msg.style.color = '#DC2626'; }
    }
  });

  for (const camera of cameras) {
    const id = camera.cameraId;
    qs(`live-${id}`)?.addEventListener('click', () => openLiveView(camera));
    qs(`remove-${id}`)?.addEventListener('click', async () => {
      const confirmed = await showDialog({
        title: 'Remove this camera?',
        body: `${camera.label} will stop reporting and disappear from the employer dashboard. Past attendance is kept. BSS must be online so the removal stays in sync.`,
        confirmLabel: 'Remove camera',
        danger: true,
      });
      if (!confirmed) return;
      try {
        state = await api(`/api/cameras/${id}`, { method: 'DELETE' });
        render();
      } catch (error) { await showAlert('Could not remove camera', error.message); }
    });
  }
}

async function refresh() {
  try {
    await discoverEngine();
    state = await api('/api/status');
    engineAttempts = 0;
    render();
    startPolling();
  } catch {
    engineAttempts += 1;
    const conn = qs('conn');
    conn.textContent = 'Starting local engine…';
    conn.className = 'pill warn';
    const app = qs('app');
    if (engineAttempts >= 8 && !startupLogText && !startupLogLoading) {
      const bridge = tauri();
      if (bridge?.core?.invoke) {
        startupLogLoading = true;
        try { startupLogText = await bridge.core.invoke('read_engine_log'); }
        catch { startupLogText = 'Could not read the engine log.'; }
        finally { startupLogLoading = false; }
      }
    }
    if (app && (!state || !state.activated)) {
      app.innerHTML = `<section class="card activation">
        <div class="activation-head">
          <img class="activation-logo" src="bss-original-logo.png" alt="Bharat Shram Setu" />
          <div><h2>Starting local attendance engine…</h2><p class="muted">This can take a few seconds on first launch.</p></div>
        </div>
        <p id="startupMsg" class="msg ${engineAttempts >= 8 ? 'error' : ''}">${engineAttempts >= 8 ? 'The local engine did not start. The app will keep retrying. If it still fails, send the engine log below to BSS support.' : 'Please wait…'}</p>
        ${startupLogText ? `<pre class="engine-log">${esc(startupLogText)}</pre>` : ''}
      </section>`;
    }
    setTimeout(refresh, 2000);
  }
}

function startPolling() {
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    try {
      const fresh = await api('/api/status');
      const old = state;
      const shape = value => JSON.stringify({
        activated: value?.activated,
        sites: (value?.sites || []).map(site => [site.id, site.bssId, site.name]),
        cameras: (value?.cameras || []).map(camera => [camera.cameraId, camera.approvalStatus, camera.status, camera.rtspConfigured, camera.sendAllowed, camera.cameraOnline, camera.ipWhitelisted, camera.canRemove, camera.sourceDeviceName]),
        outbox: value?.outbox,
        localEvents: (value?.localEvents || []).map(event => [event.eventId, event.syncStatus]),
      });
      state = fresh;
      if (shape(old) !== shape(fresh)) render();
      else {
        const conn = qs('conn');
        conn.textContent = state.bssConnected ? 'BSS connected' : 'Connecting to BSS…';
        conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;
        updateResourceLive(state.resources);
      }
    } catch {
      try {
        if (await discoverEngine()) {
          state = await api('/api/status');
          render();
        }
      } catch { /* keep retrying */ }
    }
  }, 10000);
}

function tauri() {
  return window.__TAURI__ || null;
}

function renderUpdateBanner(message, kind = 'info') {
  const banner = qs('updateBanner');
  if (!banner) return;
  if (!message) { banner.classList.add('hidden'); banner.innerHTML = ''; return; }
  banner.classList.remove('hidden');
  banner.innerHTML = `<div class="update-inner"><div><p>${esc(message.title)}</p><p class="muted">${esc(message.body || '')}</p></div><div class="row" style="margin:0"><button id="updateActionBtn" class="btn ${kind === 'available' ? 'orange' : ''}" type="button">${esc(message.action || 'OK')}</button></div></div>`;
  qs('updateActionBtn').onclick = message.onAction || (() => renderUpdateBanner(null));
}

async function checkForUpdates(manual = false) {
  const bridge = tauri();
  if (!bridge?.core?.invoke) {
    if (manual) renderUpdateBanner({ title: 'Update check unavailable', body: 'Run the installed desktop client to check for updates.', action: 'Close' });
    return;
  }
  const btn = qs('updateBtn');
  if (btn && manual) { btn.disabled = true; btn.textContent = 'Checking…'; }
  try {
    const update = await bridge.core.invoke('check_update');
    if (update) {
      updateInfo = update;
      renderUpdateBanner({
        title: `Update available: ${update.version}`,
        body: `Installed: ${update.currentVersion} · Available: ${update.version}. Download and install, then the app will restart.`,
        action: 'Download & install',
        onAction: () => void installUpdate(),
      });
    } else if (manual) {
      renderUpdateBanner({ title: 'You are up to date', body: `Installed version: ${appVersion || 'unknown'}${state?.version && appVersion && state.version !== appVersion ? ` · Engine: ${state.version}` : ''}.`, action: 'Close' });
    }
  } catch (error) {
    if (manual) renderUpdateBanner({ title: 'Update check failed', body: error?.message || String(error), action: 'Close' });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Check for updates'; }
  }
}

async function installUpdate() {
  if (updateBusy) return;
  const bridge = tauri();
  if (!bridge?.core?.invoke) return;
  updateBusy = true;
  renderUpdateBanner({ title: 'Installing update…', body: 'Downloading the signed update. The app will restart automatically.', action: 'Installing…' });
  try {
    await bridge.core.invoke('install_update');
  } catch (error) {
    updateBusy = false;
    renderUpdateBanner({ title: 'Update failed', body: error?.message || String(error), action: 'Close' });
  }
}

qs('refreshBtn').onclick = async () => {
  try { state = await api('/api/config/refresh', { method: 'POST', body: '{}' }); render(); }
  catch (error) { alert(error.message); }
};
qs('updateBtn').onclick = () => void checkForUpdates(true);
qs('stopEngineBtn').onclick = async () => {
  const confirmed = await showDialog({
    title: 'Stop the local engine?',
    body: 'Camera processing, heartbeats and offline syncing will stop, and the app will close. Sign out keeps the engine running; this does not.',
    confirmLabel: 'Stop engine',
    danger: true,
  });
  if (!confirmed) return;
  const bridge = tauri();
  if (!bridge?.core?.invoke) { await showAlert('Stop engine unavailable', 'Run the installed desktop client to use this action.'); return; }
  try { await bridge.core.invoke('stop_engine_now'); }
  catch (error) { await showAlert('Could not stop engine', error?.message || String(error)); }
};
qs('logoutBtn').onclick = async () => {
  const confirmed = await showDialog({
    title: 'Sign out this client?',
    body: 'Attendance will stop and this device will show offline. Camera setup stays saved locally.',
    confirmLabel: 'Sign out',
    danger: true,
  });
  if (!confirmed) return;
  try { state = await api('/api/logout', { method: 'POST', body: '{}' }); renderUpdateBanner(null); render(); }
  catch (error) { await showAlert('Could not sign out', error.message); }
};

void loadAppVersion().then(() => {
  refresh();
  setTimeout(() => void checkForUpdates(false), 3000);
});
