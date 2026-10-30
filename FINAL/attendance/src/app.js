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
let dataDirPrompted = false;
let dataSetupChecked = false;
let dataSetupRequired = false;
let activeTab = 'overview';

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
  if (camera.paused) return { label: 'Events paused locally', cls: 'warn' };
  if (!camera.ipWhitelisted) return { label: 'IP whitelisting pending', cls: 'warn' };
  if (camera.cameraOnline) return { label: 'Active · online', cls: 'ok' };
  return { label: 'Active · offline', cls: 'muted' };
}
function statusPill(camera) {
  if (camera.status === 'NO_RTSP') return '<span class="pill warn">No RTSP</span>';
  if (camera.paused) return '<span class="pill warn">Events paused</span>';
  if (camera.status === 'ONLINE') return '<span class="pill ok">Live</span>';
  if (camera.status === 'GPU_INITIALIZING') return '<span class="pill warn">GPU initializing</span>';
  if (camera.status === 'GPU_REQUIRED_UNAVAILABLE') return '<span class="pill bad">GPU unavailable</span>';
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

function renderLiveDetections(container, rows) {
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<span class="note">No faces or QR codes detected in the current frame.</span>';
    return;
  }
  container.innerHTML = rows.map(row => {
    const name = row.pending ? 'Checking…' : (row.name || (row.matched ? row.bssWorkerId : 'Unknown'));
    const bss = row.bssWorkerId || '';
    const score = row.matchScore == null ? '' : `${Number(row.matchScore).toFixed(1)}% match`;
    const cls = row.matched ? 'ok' : row.pending ? 'warn' : 'muted';
    return `<div class="live-detection ${cls}">
      <div><b>${esc(name)}</b>${bss ? `<span>${esc(bss)}</span>` : '<span>Unmatched face</span>'}</div>
      <span>${esc(score || (row.pending ? 'Processing' : 'Unknown'))}</span>
    </div>`;
  }).join('');
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
    <div class="live-detections" data-live-detections><span class="note">Waiting for face or QR detection…</span></div>
    <div class="live-foot">
      <p class="note">Local RTSP preview from this laptop. Attendance upload starts automatically after the employer whitelists this device's public IP.</p>
      <div class="live-meta"><span>Allowed IP</span><b>${esc(camera.allowedIp || 'Waiting for employer')}</b><span>Whitelisted</span><b>${camera.ipWhitelisted ? 'Yes' : 'No'}</b></div>
      <p class="note" data-live-status></p>
    </div>
  </div>`;
  let timer = null;
  let objectUrl = '';
  let closed = false;
  let tickBusy = false;
  let tickController = null;
  const image = backdrop.querySelector('[data-live-image]');
  const empty = backdrop.querySelector('[data-live-empty]');
  const status = backdrop.querySelector('[data-live-status]');
  const detections = backdrop.querySelector('[data-live-detections]');
  const close = () => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    if (tickController) tickController.abort();
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
    if (closed || tickBusy) return;
    tickBusy = true;
    const controller = new AbortController();
    tickController = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const [imageResponse, detectionResponse] = await Promise.all([
        fetch(`${BASE}/snapshot/${id}?t=${Date.now()}&w=960`, { cache: 'no-store', signal: controller.signal }),
        fetch(`${BASE}/api/detections/${id}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal }).catch(() => null),
      ]);
      if (!imageResponse.ok) throw new Error(imageResponse.status === 503 ? 'Waiting for the first camera frame…' : `Camera preview failed (${imageResponse.status}).`);
      const blob = await imageResponse.blob();
      if (closed) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      image.src = objectUrl;
      image.style.display = 'block';
      empty.style.display = 'none';
      status.textContent = '';
      if (detectionResponse?.ok) {
        try { renderLiveDetections(detections, (await detectionResponse.json()).data || []); }
        catch { /* keep the image running if detection metadata is malformed */ }
      }
    } catch (error) {
      if (closed) return;
      image.style.display = 'none';
      empty.style.display = 'grid';
      empty.textContent = error.name === 'AbortError' ? 'Camera preview is taking too long…' : error.message;
      status.textContent = 'Retrying automatically…';
    } finally {
      clearTimeout(timeout);
      if (tickController === controller) tickController = null;
      tickBusy = false;
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

function cameraRow(camera) {
  const id = camera.cameraId;
  const stateInfo = cameraState(camera);
  const canPreview = camera.rtspConfigured;
  return `<tr>
    <td><b>${esc(camera.label)}</b><span class="table-sub mono">${esc(camera.uid || '—')}</span></td>
    <td><div class="table-status">${statusPill(camera)}<span class="pill ${stateInfo.cls}">${esc(stateInfo.label)}</span></div></td>
    <td>${esc(camera.sourceDeviceName || state.deviceName || 'This device')}</td>
    <td class="mono">${esc(camera.allowedIp || '—')}</td>
    <td>${esc(camera.rtspConfigured ? 'Configured' : 'No RTSP')}</td>
    <td><select data-attendance-mode="${id}" ${state?.bssConnected ? '' : 'disabled'} aria-label="Attendance mode"><option value="FACE" ${(camera.attendanceMode || 'FACE') === 'FACE' ? 'selected' : ''}>Face</option><option value="QR" ${camera.attendanceMode === 'QR' ? 'selected' : ''}>QR</option><option value="BOTH" ${camera.attendanceMode === 'BOTH' ? 'selected' : ''}>Face + QR</option></select></td>
    <td>${esc(when(camera.lastEventAt))}</td>
    <td><div class="table-actions">
      <button id="live-${id}" class="btn primary" type="button" ${canPreview ? '' : 'disabled'}>See live</button>
      ${camera.canRemove && canPreview
        ? `<button id="pause-${id}" class="btn" type="button">${camera.paused ? 'Resume events' : 'Pause events'}</button>`
        : ''}
      ${camera.canRemove
        ? `<button id="remove-${id}" class="btn danger" type="button">Remove</button>`
        : `<span class="note">Owned by ${esc(camera.sourceDeviceName || 'another device')}</span>`}
    </div></td>
  </tr>`;
}

function siteCapacity(site, cameras) {
  const limit = Math.max(1, Number(site.cameraLimit || 5));
  const used = cameras.length;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

function siteSection(site, cameras) {
  const capacity = siteCapacity(site, cameras);
  return `<section class="site-group" data-panel="cameras">
    <div class="site-head">
      <div>
        <h3>${esc(site.name || 'Employer site')}</h3>
        <p>${esc(site.bssId || 'No BSS site ID')} · ${capacity.used} / ${capacity.limit} camera slots used · ${capacity.remaining} remaining</p>
      </div>
      <div class="site-meta"><span class="pill ${capacity.remaining ? 'ok' : 'warn'}">${capacity.remaining ? `${capacity.remaining} slots left` : 'Camera slots full'}</span></div>
    </div>
    ${cameras.length ? `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Camera</th><th>Status</th><th>Owner</th><th>Allowed IP</th><th>RTSP</th><th>Attendance mode</th><th>Last event</th><th>Actions</th></tr></thead>
      <tbody>${cameras.map(cameraRow).join('')}</tbody>
    </table></div>` : '<div class="card empty">No cameras added for this site yet.</div>'}
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
    initializing: 'GPU initializing',
    detected_disabled: 'GPU detected · disabled',
    detected_unavailable: 'GPU detected · unavailable',
    not_detected: 'No GPU detected',
    required_unavailable: 'GPU required · unavailable',
    unknown: 'GPU detection unavailable',
  };
  const classes = {
    active: 'ok', initializing: 'warn', detected_disabled: 'warn',
    detected_unavailable: 'warn', not_detected: 'muted',
    required_unavailable: 'bad', unknown: 'muted',
  };
  return `<span class="pill ${classes[state] || 'muted'}">${esc(labels[state] || labels.unknown)}</span>`;
}

function resourceLiveHtml(resources) {
  const detected = resources?.detected || {};
  const settings = resources?.settings || {};
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
        <div><span>AI frame interval</span><b>${esc(settings.aiInterval == null ? '—' : `${Number(settings.aiInterval).toFixed(1)}s`)}</b></div>
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
      ${Array.isArray(gpu.availableProviders) && gpu.availableProviders.length ? `<div class="res-sub">ORT providers: ${esc(gpu.availableProviders.join(', '))}</div>` : ''}
      ${gpu.requestedProvider ? `<div class="res-sub">Requested: ${esc(gpu.requestedProvider)}</div>` : ''}
      ${gpu.directmlDll ? `<div class="res-sub">DirectML.dll: ${gpu.directmlDllPresent ? 'found' : 'missing'}</div>` : ''}
      ${gpu.providerError ? `<div class="res-sub res-warn">${esc(gpu.providerError)}</div>` : ''}
      ${gpu.gpuState === 'initializing' ? '<div class="res-sub">Initializing GPU backend… this can take a few seconds on Windows.</div>' : ''}
      ${gpu.gpuState === 'failed' ? `<div class="res-sub res-warn">Last GPU initialization took ${esc(String(gpu.initElapsedSeconds ?? 0))}s${gpu.retryInSeconds ? ` · retry in ${esc(String(gpu.retryInSeconds))}s` : ''}</div>` : ''}
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

function deviceHeartbeatText(current) {
  if (current?.lastDeviceHeartbeatAt) return when(current.lastDeviceHeartbeatAt);
  return current?.lastDeviceHeartbeatError ? 'Failed' : 'Never';
}

function updateStatusLive(current) {
  const set = (id, text) => { const el = qs(id); if (el) el.textContent = text; };
  set('heartbeatAt', when(current?.lastHeartbeatAt));
  const heartbeat = qs('heartbeatAt');
  if (heartbeat) heartbeat.title = current?.lastHeartbeatSource || '';
  const device = qs('deviceHeartbeatAt');
  if (device) {
    device.textContent = deviceHeartbeatText(current);
    device.title = current?.lastDeviceHeartbeatError || '';
  }
}

function dataFolderCard(current) {
  const path = current?.dataDir || '—';
  return `<section class="card" data-panel="storage">
    <div class="cam-title"><h3>Data folder</h3><span class="pill muted">Local only</span></div>
    <p class="muted">Activation, the local event database, worker gallery, and model cache are stored here. Changing the folder safely copies the current data and keeps the old folder as a backup.</p>
    <div class="res-list data-path"><div><span>Current folder</span><b>${esc(path)}</b></div></div>
    <div class="row">
      <button id="changeDataDirBtn" class="btn" type="button">Change folder</button>
      <button id="backupDbBtn" class="btn" type="button">Export database backup</button>
    </div>
    <p id="dataDirMsg" class="note"></p>
  </section>`;
}

function renderDataFolderSetup(info) {
  const app = qs('app');
  if (!app) return;
  app.innerHTML = `<div class="dashboard"><section class="card data-setup">
    <p class="section-label">First-time setup</p>
    <h2>Choose the attendance data folder</h2>
    <p class="muted">BSS Attendance must store activation, the local event database, worker gallery, and model cache in a folder you choose before the engine can start.</p>
    <div class="res-list data-path" style="margin:14px 0"><div><span>Suggested default</span><b>${esc(info?.path || '')}</b></div></div>
    <button id="mandatoryDataFolderBtn" class="btn primary" type="button">Choose folder</button>
    <p id="dataSetupMsg" class="note" style="margin-top:10px">The folder is required. The engine will start after you select it.</p>
  </section></div>`;
  qs('mandatoryDataFolderBtn')?.addEventListener('click', async () => {
    const msg = qs('dataSetupMsg');
    if (msg) msg.textContent = 'Selecting folder…';
    await chooseDataFolder(true);
  });
}

async function enforceDataFolder() {
  if (dataSetupChecked) return dataSetupRequired;
  dataSetupChecked = true;
  const bridge = tauri();
  if (!bridge?.core?.invoke) return false;
  try {
    const info = await bridge.core.invoke('data_dir_info');
    if (!info?.configured && !info?.hasData) {
      dataSetupRequired = true;
      renderDataFolderSetup(info);
      return true;
    }
  } catch { /* let normal startup continue if launcher state is unavailable */ }
  dataSetupRequired = false;
  return false;
}

async function chooseDataFolder(skipConfirm = false) {
  const bridge = tauri();
  if (!bridge?.core?.invoke) {
    await showAlert('Data folder unavailable', 'Run the installed desktop client to choose a data folder.');
    return;
  }
  let selected = '';
  try {
    selected = String(await bridge.core.invoke('choose_data_dir') || '');
  } catch (error) {
    await showAlert('Could not open folder picker', error.message || String(error));
    return;
  }
  if (!selected) return;
  if (!skipConfirm) {
    const confirmed = await showDialog({
      title: 'Change data folder?',
      body: `The current activation, local event database, and worker gallery will be copied to:\n\n${selected}\n\nThe old folder will be kept as a backup, then the engine will restart.`,
      confirmLabel: 'Copy and restart',
    });
    if (!confirmed) return;
  }
  const msg = qs('dataDirMsg');
  try {
    if (msg) msg.textContent = 'Stopping engine and copying data…';
    await bridge.core.invoke('set_data_dir', { path: selected, copyExisting: true });
    dataSetupRequired = false;
    dataSetupChecked = true;
    await refresh();
    showMessage('dataDirMsg', 'Data folder changed. Engine restarted.', true);
  } catch (error) {
    const text = String(error?.message || error);
    if (text.includes('TARGET_HAS_DATA')) {
      const useExisting = await showDialog({
        title: 'Folder already contains BSS data',
        body: 'This folder already has BSS Attendance data. Use that data, or choose a different folder. The current folder will not be changed.',
        confirmLabel: 'Use existing data',
      });
      if (!useExisting) return;
      try {
        await bridge.core.invoke('set_data_dir', { path: selected, copyExisting: false });
        dataSetupRequired = false;
        dataSetupChecked = true;
        await refresh();
        showMessage('dataDirMsg', 'Using the existing data folder.', true);
      } catch (nextError) {
        await showAlert('Could not switch data folder', nextError?.message || String(nextError));
      }
    } else {
      await showAlert('Could not change data folder', text);
    }
  }
}

async function exportDatabaseBackup() {
  const bridge = tauri();
  if (!bridge?.core?.invoke) {
    await showAlert('Backup unavailable', 'Run the installed desktop client to export a database backup.');
    return;
  }
  try {
    const path = String(await bridge.core.invoke('choose_backup_file') || '');
    if (!path) return;
    await bridge.core.invoke('export_data_backup', { path });
    await showAlert('Backup saved', path);
  } catch (error) {
    await showAlert('Backup failed', error?.message || String(error));
  }
}

async function maybePromptDataFolder() {
  if (dataDirPrompted) return;
  dataDirPrompted = true;
  const bridge = tauri();
  if (!bridge?.core?.invoke) return;
  if (localStorage.getItem('bssDataFolderPrompted') === '1') return;
  try {
    const info = await bridge.core.invoke('data_dir_info');
    if (info?.configured || info?.hasData) {
      localStorage.setItem('bssDataFolderPrompted', '1');
      return;
    }
    const choose = await showDialog({
      title: 'Where should attendance data be saved?',
      body: `BSS Attendance stores activation, the local event database, worker gallery, and model cache on this machine.\n\nDefault folder:\n${info?.path || ''}\n\nChoose a folder, or use the default.`,
      confirmLabel: 'Choose folder',
      cancelLabel: 'Use default',
    });
    localStorage.setItem('bssDataFolderPrompted', '1');
    if (choose) await chooseDataFolder(true);
  } catch { /* folder prompt is optional */ }
}

const TABS = [
  ['overview', 'Overview'],
  ['cameras', 'Cameras'],
  ['workers', 'Workers'],
  ['resources', 'Resources'],
  ['storage', 'Data & backup'],
];

function tabBar() {
  return `<nav class="tabbar" aria-label="Client sections">${TABS.map(([id, label]) =>
    `<button type="button" class="tabbtn ${activeTab === id ? 'active' : ''}" data-tab="${id}">${esc(label)}</button>`
  ).join('')}</nav>`;
}

function applyActiveTab() {
  if (!TABS.some(([id]) => id === activeTab)) activeTab = 'overview';
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.style.display = panel.dataset.panel === activeTab ? '' : 'none';
  });
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === activeTab);
  });
}

function siteNameFor(id) {
  const site = (state?.sites || []).find(item => Number(item.id) === Number(id));
  return site?.name || `Site ${id}`;
}

function overviewPanel() {
  const workers = state?.gallery?.status || [];
  const enrolled = workers.filter(worker => worker.hasFaceData).length;
  const manualReady = workers.filter(worker => Number(worker.manualCount || 0) > 0).length;
  const selfReady = workers.filter(worker => Number(worker.selfCount || 0) > 0).length;
  const activeManual = workers.filter(worker => worker.matchSource === 'MANUAL').length;
  const activeSelf = workers.filter(worker => worker.matchSource !== 'MANUAL').length;
  const manualInactive = workers.filter(worker => Number(worker.manualCount || 0) > 0 && worker.matchSource !== 'MANUAL').length;
  const manualWorkers = workers.filter(worker => Number(worker.manualCount || 0) > 0);
  const cameras = state?.cameras || [];
  const active = cameras.filter(camera => camera.sendAllowed).length;
  const gpu = state?.resources?.gpu || state?.gpu || {};
  return `<section class="card" data-panel="overview">
    <div class="cam-title"><h3>Overview</h3><span class="pill muted">Live status</span></div>
    <div class="res-grid" style="margin-top:12px">
      <div class="res-panel"><h4>Workers</h4><div class="res-list">
        <div><span>Bound workers</span><b>${workers.length}</b></div>
        <div><span>Face data ready</span><b>${enrolled} / ${workers.length}</b></div>
        <div><span>Manual camera data</span><b>${manualReady}</b></div>
        <div><span>Self-enrolled data</span><b>${selfReady}</b></div>
        <div><span>Active source · Manual</span><b>${activeManual}</b></div>
        <div><span>Active source · Self</span><b>${activeSelf}</b></div>
        <div><span>Manual stored but inactive</span><b class="${manualInactive ? 'res-warn' : ''}">${manualInactive}</b></div>
      </div></div>
      <div class="res-panel"><h4>Cameras</h4><div class="res-list">
        <div><span>Configured</span><b>${cameras.length}</b></div>
        <div><span>Sending attendance</span><b>${active}</b></div>
        <div><span>Pending events</span><b>${state?.outbox ?? 0}</b></div>
      </div></div>
      <div class="res-panel"><h4>GPU</h4><div class="res-list">
        <div><span>Status</span><b>${esc(gpu.message || gpu.state || 'Not initialized')}</b></div>
        <div><span>Provider</span><b>${esc(gpu.provider || 'CPU')}</b></div>
        <div><span>Detected</span><b>${gpu.detected === false ? 'No' : gpu.detected ? 'Yes' : 'Unknown'}</b></div>
      </div></div>
    </div>
    <div class="res-panel" style="margin-top:12px"><h4>Workers with manual camera embeddings</h4>
      ${manualWorkers.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Worker</th><th>BSS ID</th><th>Manual</th><th>Self</th><th>Active source</th></tr></thead><tbody>${manualWorkers.map(worker => `<tr><td><b>${esc(worker.name || worker.bssWorkerId)}</b></td><td class="mono">${esc(worker.bssWorkerId || '—')}</td><td>${esc(String(worker.manualCount || 0))}</td><td>${esc(String(worker.selfCount || 0))}</td><td><span class="pill ${worker.matchSource === 'MANUAL' ? 'ok' : 'warn'}">${esc(worker.matchSource || 'SELF')}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty" style="margin-top:10px">No worker has manual camera embeddings yet.</p>'}
    </div>
  </section>`;
}

function workerPanel() {
  const workers = state?.gallery?.status || [];
  const enrolled = workers.filter(worker => worker.hasFaceData).length;
  const rows = workers.map(worker => {
    const manual = Number(worker.manualCount || 0);
    const self = Number(worker.selfCount || 0);
    const count = Number(worker.embeddingCount || manual + self);
    const source = worker.matchSource === 'MANUAL' ? 'MANUAL' : 'SELF';
    const activeCount = source === 'MANUAL' ? manual : self;
    const label = activeCount ? `Ready · ${activeCount} ${source.toLowerCase()}` : `No ${source.toLowerCase()} vectors`;
    const cls = activeCount ? 'ok' : 'bad';
    const sites = (worker.siteIds || []).map(siteNameFor).join(', ') || '—';
    const missing = activeCount === 0;
    return `<tr>
      <td><b>${esc(worker.name || worker.bssWorkerId)}</b></td>
      <td class="mono">${esc(worker.bssWorkerId || '—')}</td>
      <td>${esc(sites)}</td>
      <td><span class="pill ${manual ? 'ok' : 'muted'}">${manual ? `Manual · ${manual}` : 'Manual · —'}</span></td>
      <td><span class="pill ${self ? 'ok' : 'muted'}">${self ? `Self · ${self}` : 'Self · —'}</span></td>
      <td><span class="pill ${cls}">${esc(label)}</span>${missing ? '<span class="note blocked" style="display:block;margin-top:4px">No manual vectors</span>' : ''}</td>
      <td><select data-worker-source="${esc(worker.bssWorkerId || '')}" data-previous-source="${source}" class="source-select"><option value="MANUAL" ${source === 'MANUAL' ? 'selected' : ''}>Manual</option><option value="SELF" ${source === 'SELF' ? 'selected' : ''}>Self</option></select></td>
      <td class="muted">${esc(worker.lastManualCaptureAt ? when(worker.lastManualCaptureAt) : '—')}</td>
      <td><button type="button" class="btn" data-manual-enroll="${esc(worker.bssWorkerId || '')}" ${state?.bssConnected ? '' : 'disabled'}>Manual enroll</button></td>
    </tr>`;
  }).join('');
  return `<section class="card" data-panel="workers">
    <div class="cam-title"><h3>Workers</h3><span class="pill ${workers.length && enrolled === workers.length ? 'ok' : 'warn'}">${enrolled} / ${workers.length} with face data</span></div>
    <p class="muted">Manual embeddings come from this site camera and are preferred when selected. Self embeddings come from the worker profile in BSS. Only the selected source is used for matching.</p>
    ${workers.length ? `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Worker</th><th>BSS ID</th><th>Site</th><th>Manual</th><th>Self</th><th>Face data</th><th>Matching source</th><th>Last manual</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>` : '<p class="empty" style="margin-top:12px">No bound workers found for this employer yet.</p>'}
  </section>`;
}

function resourceCard(resources) {
  resources = resources || {};
  const detected = resources.detected || {};
  const settings = resources.settings || {};
  const cores = Number(detected.cpuCores || 1);
  return `<section class="card" data-panel="resources">
    <div class="cam-title"><h3>System resources</h3><span class="pill muted">Display only · 10s refresh</span></div>
    <p class="muted">System-wide usage and the engine's current share. CPU affinity and AI-worker concurrency apply immediately. GPU memory is a best-effort target; RAM and disk are uncapped.</p>
    <div id="resourceLive">${resourceLiveHtml(resources)}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">
      <div><label>CPU cores to use<input id="resourceCores" type="number" min="0" max="${cores}" value="${esc(settings.cpuCores ?? 0)}" /><span class="note">0 = Automatic — uses all ${esc(cores)} available cores</span></label></div>
      <div><label>Cameras processed at once<input id="resourceWorkers" type="number" min="1" max="16" value="${esc(settings.maxCameraWorkers ?? 2)}" /></label></div>
      <div><label>AI frame interval seconds<input id="resourceAiInterval" type="number" min="0.2" max="5" step="0.1" value="${esc(settings.aiInterval ?? 0.5)}" /><span class="note">Lower is faster, higher uses less CPU</span></label></div>
      <div><label>AI acceleration<select id="resourceGpuMode"><option value="auto" ${settings.gpuMode !== 'off' && settings.gpuMode !== 'required' ? 'selected' : ''}>Automatic (GPU if available)</option><option value="off" ${settings.gpuMode === 'off' ? 'selected' : ''}>CPU only</option><option value="required" ${settings.gpuMode === 'required' ? 'selected' : ''}>Require GPU</option></select></label></div>
      <div><label>GPU memory limit MB<input id="resourceGpuMemory" type="number" min="0" max="65536" value="${esc(settings.gpuMemoryMb ?? 0)}" /><span class="note">0 = grow as needed · minimum 1024 MB when set</span></label></div>
      <button id="saveResourcesBtn" class="btn primary" type="button">Save resources</button>
    </div>
    <p id="resourceMsg" class="note"></p>
    ${resources?.gpu?.gpuState === 'failed' ? '<button id="retryGpuBtn" class="btn" type="button" style="margin-top:8px">Retry GPU</button>' : ''}
    ${resources?.gpu?.state === 'required_unavailable' ? '<button id="useCpuFallbackBtn" class="btn" type="button" style="margin-top:8px;margin-left:8px">Use CPU fallback</button><span class="note" style="margin-left:8px">GPU is required but unavailable. Switch to Automatic to keep face processing running on CPU.</span>' : ''}
  </section>`;
}

function updateResourceLive(resources) {
  const container = qs('resourceLive');
  if (container) container.innerHTML = resourceLiveHtml(resources || {});
}

function openManualEnrollment(workerId) {
  const worker = (state?.gallery?.status || []).find(item => String(item.bssWorkerId) === String(workerId));
  if (!worker) { void showAlert('Worker not found', 'Refresh the client and try again.'); return; }
  if (!state?.bssConnected) { void showAlert('BSS connection required', 'Manual enrollment must be saved to BSS. Reconnect and try again.'); return; }
  const siteIds = new Set((worker.siteIds || []).map(Number));
  const cameras = (state.cameras || []).filter(camera =>
    camera.approvalStatus === 'APPROVED' && camera.rtspConfigured && siteIds.has(Number(camera.siteId)));
  if (!cameras.length) {
    void showAlert('No camera available', 'This worker has no approved camera on their site. Add or approve a camera first.');
    return;
  }
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  let cameraId = cameras[0].cameraId;
  let captureId = '';
  let previewTimer = null;
  let busy = false;
  let previewBusy = false;
  let faceCount = 0;
  let faceReady = false;
  let slots = Array(1).fill(null);
  const closed = () => {
    if (previewTimer) clearInterval(previewTimer);
    previewTimer = null;
  };
  const close = (cancel = true) => {
    closed();
    if (cancel && captureId) {
      void api(`/api/cameras/${cameraId}/manual-enroll/cancel`, {
        method: 'POST', body: JSON.stringify({ captureId }),
      }).catch(() => {});
    }
    backdrop.remove();
  };
  backdrop.innerHTML = `<div class="dialog" style="max-width:780px;width:min(780px,94vw);text-align:left">
    <div class="cam-title"><div><h3>Manual enrollment</h3><p class="muted" style="margin:4px 0 0">${esc(worker.name || worker.bssWorkerId)} · ${esc(worker.bssWorkerId || '')}</p></div><span class="pill warn">1 photo · one person</span></div>
    <label style="display:block;margin-top:14px">Camera<select id="manualEnrollCamera">${cameras.map(camera => `<option value="${esc(camera.cameraId)}">${esc(camera.label)} · ${esc(camera.siteName || siteNameFor(camera.siteId))}</option>`).join('')}</select></label>
    <div style="position:relative;margin-top:12px;background:#0b1220;border-radius:12px;overflow:hidden;min-height:240px;display:grid;place-items:center">
      <img id="manualEnrollPreview" alt="Selected camera preview" style="width:100%;max-height:360px;object-fit:contain;display:block" />
    </div>
    <p class="note" id="manualEnrollMsg" style="margin-top:10px;font-weight:600">Starting camera preview…</p>
    <div id="manualEnrollWarning"></div>
    <div id="manualEnrollSlots" style="display:grid;grid-template-columns:minmax(120px,180px);gap:7px;margin-top:10px"></div>
    <div class="row" style="margin-top:14px;justify-content:flex-end">
      <button type="button" class="btn" id="manualEnrollCancel">Cancel</button>
      <button type="button" class="btn primary" id="manualEnrollCapture" disabled>Take photo</button>
      <button type="button" class="btn primary" id="manualEnrollConfirm" disabled>Confirm & sync</button>
    </div>
  </div>`;
  document.body.appendChild(backdrop);
  const preview = backdrop.querySelector('#manualEnrollPreview');
  const cameraSelect = backdrop.querySelector('#manualEnrollCamera');
  const msg = backdrop.querySelector('#manualEnrollMsg');
  const warning = backdrop.querySelector('#manualEnrollWarning');
  const slotBox = backdrop.querySelector('#manualEnrollSlots');
  const captureBtn = backdrop.querySelector('#manualEnrollCapture');
  const confirmBtn = backdrop.querySelector('#manualEnrollConfirm');
  const nextSlot = () => slots.findIndex(item => item === null);
  const filledCount = () => slots.filter(Boolean).length;
  const renderSlots = () => {
    slotBox.innerHTML = slots.map((item, index) => {
      const number = index + 1;
      if (!item) {
        return `<div style="border:1px dashed #cbd5e1;border-radius:10px;min-height:82px;display:grid;place-items:center;text-align:center;padding:6px"><span class="muted" style="font-size:11px">Photo ${number}</span></div>`;
      }
      return `<div style="position:relative;border:1px solid #86efac;border-radius:10px;overflow:hidden;background:#f8fafc">
        <img src="${item.preview}" alt="Photo ${number}" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover" />
        <button type="button" data-retake="${number}" class="btn" style="position:absolute;left:4px;right:4px;bottom:4px;height:24px;padding:0;font-size:10px">Retake</button>
      </div>`;
    }).join('');
    slotBox.querySelectorAll('[data-retake]').forEach(button => {
      button.addEventListener('click', () => void retake(Number(button.dataset.retake)));
    });
    const slot = nextSlot();
    captureBtn.textContent = slot >= 0 ? 'Take photo' : 'Photo captured';
    captureBtn.disabled = busy || !faceReady || slot < 0;
    confirmBtn.disabled = busy || filledCount() < 1;
  };
  const setBusy = value => {
    busy = value;
    cameraSelect.disabled = value;
    renderSlots();
  };
  const updateFaceStatus = () => {
    const slot = nextSlot();
    if (faceCount === 0) {
      msg.textContent = 'No face detected — position the worker inside the frame.';
      msg.style.color = '#C2410C';
    } else if (faceCount > 1) {
      msg.textContent = `${faceCount} people detected — only one person is allowed. Move others out of the frame.`;
      msg.style.color = '#C2410C';
    } else if (slot < 0) {
      msg.textContent = 'Photo captured — review and confirm, or retake it.';
      msg.style.color = '#14843C';
    } else {
      msg.textContent = '1 person detected — ready. Take photo.';
      msg.style.color = '#14843C';
    }
    renderSlots();
  };
  const refreshPreview = async () => {
    if (previewBusy || busy) return;
    previewBusy = true;
    try {
      const result = await api(`/api/cameras/${cameraId}/manual-enroll/preview`);
      preview.src = result.image;
      faceCount = Number(result.count || 0);
      faceReady = !!result.ready;
      updateFaceStatus();
    } catch (error) {
      faceReady = false;
      faceCount = 0;
      msg.textContent = error.message || String(error);
      msg.style.color = '#C2410C';
      renderSlots();
    } finally {
      previewBusy = false;
    }
  };
  const startSession = async () => {
    captureId = '';
    slots = Array(1).fill(null);
    warning.innerHTML = '';
    setBusy(true);
    try {
      const result = await api(`/api/cameras/${cameraId}/manual-enroll/start`, {
        method: 'POST', body: JSON.stringify({ bssWorkerId: worker.bssWorkerId }),
      });
      captureId = result.captureId;
      msg.textContent = 'Camera ready. Position one worker inside the frame.';
      msg.style.color = '';
    } catch (error) {
      msg.textContent = error.message || String(error);
      msg.style.color = '#C2410C';
    } finally {
      setBusy(false);
      await refreshPreview();
    }
  };
  const takePhoto = async () => {
    const slot = nextSlot();
    if (!captureId || slot < 0 || !faceReady || busy) return;
    setBusy(true);
    try {
      const result = await api(`/api/cameras/${cameraId}/manual-enroll/capture-one`, {
        method: 'POST', body: JSON.stringify({ captureId, slot: slot + 1 }),
      });
      slots[slot] = {
        preview: result.preview,
        quality: result.quality,
        warning: result.warning || null,
      };
      warning.innerHTML = result.warning
        ? `<p class="note blocked" style="margin-top:10px">The face looks like <b>${esc(result.warning.name || result.warning.bssWorkerId)}</b> (${esc(String(result.warning.confidence || ''))}% match), not the selected worker. Check before confirming.</p>`
        : '';
      msg.textContent = 'Photo captured. Review and confirm, or retake it.';
      msg.style.color = '#14843C';
      await refreshPreview();
    } catch (error) {
      msg.textContent = error.message || String(error);
      msg.style.color = '#C2410C';
    } finally {
      setBusy(false);
    }
  };
  const retake = async (slot) => {
    if (!captureId || busy) return;
    setBusy(true);
    try {
      await api(`/api/cameras/${cameraId}/manual-enroll/retake`, {
        method: 'POST', body: JSON.stringify({ captureId, slot }),
      });
      slots[slot - 1] = null;
      warning.innerHTML = '';
      msg.textContent = `Photo ${slot} cleared. Position the worker and capture it again.`;
      await refreshPreview();
    } catch (error) {
      msg.textContent = error.message || String(error);
      msg.style.color = '#C2410C';
    } finally {
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (!captureId || filledCount() < 1 || busy) return;
    setBusy(true);
    msg.textContent = 'Saving manual embeddings to BSS…';
    try {
      let result = await api(`/api/cameras/${cameraId}/manual-enroll/confirm`, {
        method: 'POST', body: JSON.stringify({ captureId, confirmMismatch: false }),
      });
      if (result?.requiresConfirmation) {
        const first = (result.matches || [])[0];
        const proceed = await showDialog({
          title: 'Confirm the selected worker',
          body: `The captured face matches ${first ? `${first.name || first.bssWorkerId} (${first.confidence}%)` : 'another worker'}, not ${worker.name || worker.bssWorkerId}. Save these embeddings for the selected worker anyway?`,
          confirmLabel: 'Save anyway', cancelLabel: 'Go back', danger: true,
        });
        if (!proceed) {
          msg.textContent = 'Not saved. Check the worker selection or retake the photos.';
          setBusy(false);
          return;
        }
        result = await api(`/api/cameras/${cameraId}/manual-enroll/confirm`, {
          method: 'POST', body: JSON.stringify({ captureId, confirmMismatch: true }),
        });
      }
      captureId = '';
      close(false);
      state = await api('/api/status');
      render();
      await showAlert('Manual enrollment saved', `${worker.name || worker.bssWorkerId} now has manual camera embeddings. The manual source is selected for this worker.`);
    } catch (error) {
      msg.textContent = error.message || String(error);
      msg.style.color = '#C2410C';
      setBusy(false);
    }
  };
  previewTimer = setInterval(() => void refreshPreview(), 1500);
  captureBtn.addEventListener('click', () => void takePhoto());
  confirmBtn.addEventListener('click', () => void confirm());
  backdrop.querySelector('#manualEnrollCancel').addEventListener('click', () => close(true));
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(true); });
  cameraSelect.addEventListener('change', async () => {
    const previous = cameraId;
    if (captureId) {
      await api(`/api/cameras/${previous}/manual-enroll/cancel`, {
        method: 'POST', body: JSON.stringify({ captureId }),
      }).catch(() => {});
    }
    cameraId = Number(cameraSelect.value);
    slots = Array(1).fill(null);
    warning.innerHTML = '';
    await startSession();
  });
  void startSession();
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
          <div>Last BSS contact<b id="heartbeatAt" title="${esc(state.lastHeartbeatSource || '')}">${esc(when(state.lastHeartbeatAt))}</b></div>
          <div>Device heartbeat<b id="deviceHeartbeatAt" title="${esc(state.lastDeviceHeartbeatError || '')}">${esc(deviceHeartbeatText(state))}</b></div>
          <div>Pending events<b>${esc(state.outbox ?? 0)}</b></div>
          <div>Cameras<b>${cameras.length}</b></div>
          <div>Client version<b>${esc(state.version || '—')}</b></div>
        </div>
      </section>

      ${tabBar()}
      ${overviewPanel()}
      ${workerPanel()}

      ${resourceCard(state.resources)}

      ${dataFolderCard(state)}

      <section class="card" data-panel="cameras">
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

      <section class="card" data-panel="overview">
        <div class="cam-title"><h3>Local event log</h3><span class="pill ${state.outbox ? 'warn' : 'ok'}">${esc(state.outbox ? `${state.outbox} waiting to sync` : 'All events synced')}</span></div>
        <p class="muted">Events are stored on this machine when the internet is down and sync automatically when BSS is reachable.</p>
        ${localEventRows(state.localEvents || [], cameras)}
      </section>

      ${grouped.length ? grouped.map(group => siteSection(group, group.cameras)).join('') : '<div class="card empty">No employer sites are available for this client yet. Ask the employer to create a site.</div>'}
    </div>`;

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab || 'overview';
      applyActiveTab();
    });
  });
  applyActiveTab();

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
        aiInterval: Number(qs('resourceAiInterval').value || 0.5),
        gpuMode: qs('resourceGpuMode').value,
        gpuMemoryMb: Number(qs('resourceGpuMemory').value || 0),
      }) });
      render();
      showMessage('resourceMsg', 'Resource settings saved.', true);
    } catch (error) {
      if (msg) { msg.textContent = error.message; msg.style.color = '#DC2626'; }
    }
  });

  qs('retryGpuBtn')?.addEventListener('click', async () => {
    try {
      state = await api('/api/gpu/retry', { method: 'POST' });
      render();
    } catch (error) {
      const msg = qs('resourceMsg');
      if (msg) { msg.textContent = error.message; msg.style.color = '#DC2626'; }
    }
  });

  qs('useCpuFallbackBtn')?.addEventListener('click', () => {
    const mode = qs('resourceGpuMode');
    if (mode) mode.value = 'auto';
    qs('saveResourcesBtn')?.click();
  });

  qs('changeDataDirBtn')?.addEventListener('click', () => chooseDataFolder(false));
  qs('backupDbBtn')?.addEventListener('click', exportDatabaseBackup);

  for (const camera of cameras) {
    const id = camera.cameraId;
    qs(`live-${id}`)?.addEventListener('click', () => openLiveView(camera));
    qs(`pause-${id}`)?.addEventListener('click', async () => {
      const next = !camera.paused;
      try {
        state = await api(`/api/cameras/${id}/pause`, {
          method: 'POST', body: JSON.stringify({ paused: next }),
        });
        render();
      } catch (error) {
        await showAlert(next ? 'Could not pause events' : 'Could not resume events', error.message || String(error));
      }
    });
    const modeSelect = document.querySelector(`[data-attendance-mode="${id}"]`);
    modeSelect?.addEventListener('change', async () => {
      const previous = camera.attendanceMode || 'FACE';
      const next = modeSelect.value;
      if (!state?.bssConnected) {
        modeSelect.value = previous;
        await showAlert('BSS connection required', 'Camera attendance mode must be synced to BSS.');
        return;
      }
      modeSelect.disabled = true;
      try {
        await api(`/api/cameras/${id}/attendance-mode`, { method: 'POST', body: JSON.stringify({ mode: next }) });
        state = await api('/api/status');
        render();
      } catch (error) {
        modeSelect.value = previous;
        modeSelect.disabled = false;
        await showAlert('Could not change attendance mode', error.message || String(error));
      }
    });
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

  document.querySelectorAll('[data-manual-enroll]').forEach(button => {
    button.addEventListener('click', () => openManualEnrollment(button.dataset.manualEnroll));
  });
  document.querySelectorAll('[data-worker-source]').forEach(select => {
    select.addEventListener('change', async () => {
      const workerId = select.dataset.workerSource;
      const source = select.value;
      if (!state?.bssConnected) {
        select.value = select.dataset.previousSource || 'SELF';
        await showAlert('BSS connection required', 'Matching source changes must be saved to BSS.');
        return;
      }
      select.disabled = true;
      try {
        const result = await api(`/api/workers/${encodeURIComponent(workerId)}/face-source`, {
          method: 'POST', body: JSON.stringify({ source }),
        });
        state = await api('/api/status');
        render();
        const count = source === 'MANUAL' ? Number(result?.manualCount || 0) : Number(result?.selfCount || 0);
        if (!count) {
          await showAlert('No vectors for this source', `${workerId} has no ${source.toLowerCase()} embeddings. The worker will not match until vectors are enrolled or the other source is selected.`);
        }
      } catch (error) {
        select.value = select.dataset.previousSource || 'SELF';
        select.disabled = false;
        await showAlert('Could not change matching source', error.message || String(error));
      }
    });
  });
}

async function refresh() {
  if (await enforceDataFolder()) return;
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
        gallery: (value?.gallery?.status || []).map(worker => [worker.bssWorkerId, worker.matchSource, worker.manualCount, worker.selfCount, worker.embeddingCount, worker.lastManualCaptureAt]),
        localEvents: (value?.localEvents || []).map(event => [event.eventId, event.syncStatus]),
      });
      state = fresh;
      if (shape(old) !== shape(fresh)) render();
      else {
        const conn = qs('conn');
        conn.textContent = state.bssConnected ? 'BSS connected' : 'Connecting to BSS…';
        conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;
        updateStatusLive(state);
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
    title: 'Sign out and release this PC?',
    body: 'Attendance will stop, this PC will be released from the current employer, and its camera claims will be removed. You can then activate it with another employer phone.',
    confirmLabel: 'Sign out',
    danger: true,
  });
  if (!confirmed) return;
  try {
    state = await api('/api/logout', { method: 'POST', body: JSON.stringify({ force: false }) });
    renderUpdateBanner(null); render();
  } catch (error) {
    const force = await showDialog({
      title: 'Could not release this PC',
      body: `${error.message}\n\nClear the local activation anyway? The old employer may still see this PC as active until they revoke it.`,
      confirmLabel: 'Clear locally',
      danger: true,
    });
    if (!force) return;
    try {
      state = await api('/api/logout', { method: 'POST', body: JSON.stringify({ force: true }) });
      renderUpdateBanner(null); render();
    } catch (forceError) {
      await showAlert('Could not clear this PC', forceError.message);
    }
  }
};

void loadAppVersion().then(() => {
  refresh();
  setTimeout(() => void checkForUpdates(false), 3000);
});
