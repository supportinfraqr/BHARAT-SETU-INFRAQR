const BASE = 'http://127.0.0.1:8765';
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
function claimLabel(camera) {
  if (camera.claimedByThisDevice) return 'Claimed by this device';
  if (camera.claimStatus === 'CLAIMED_BY_OTHER') return `Claimed by ${camera.claimedByDeviceName || 'another device'}`;
  return 'Not claimed';
}
function statusPill(camera) {
  if (camera.status === 'ONLINE') return '<span class="pill ok">Online</span>';
  if (camera.status === 'NO_RTSP') return '<span class="pill warn">No RTSP</span>';
  if (camera.status === 'AUTH_FAILED') return '<span class="pill bad">Re-claim needed</span>';
  return `<span class="pill ${camera.status === 'RECONNECTING' ? 'warn' : 'muted'}">${esc(camera.status || 'Unknown')}</span>`;
}
function showMessage(id, text, ok = false) {
  const el = qs(id);
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${ok ? 'ok' : 'error'}`;
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
          <input id="deviceName" maxlength="120" placeholder="Reception laptop" />
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

function cameraCard(camera) {
  const id = camera.cameraId;
  const canPreview = camera.rtspConfigured;
  const claim = camera.claimedByThisDevice;
  const takeover = camera.claimStatus === 'CLAIMED_BY_OTHER';
  return `<section class="card cam" data-camera="${id}">
    <div class="cam-head">
      <div class="cam-title"><h3>${esc(camera.label)}</h3>${statusPill(camera)}</div>
      <span class="pill ${camera.claimedByThisDevice ? 'ok' : takeover ? 'warn' : 'muted'}">${esc(claimLabel(camera))}</span>
    </div>
    ${canPreview ? `<img class="feed" src="${BASE}/stream/${id}?t=${Date.now()}" alt="${esc(camera.label)} live view" />` : `<div class="feed" style="display:grid;place-items:center;color:#94A3B8;font-size:12px">RTSP not configured</div>`}
    <div class="cam-body">
      <div class="cam-info">
        <div>Camera ID<b class="mono">${esc(camera.uid || '—')}</b></div>
        <div>BSS Site ID<b>${esc(camera.siteBssId || '—')}</b></div>
        <div>Allowed IP<b>${esc(camera.allowedIp || 'Not set in BSS')}</b></div>
        <div>Schedule<b>${esc(camera.schedule || '24/7')}</b></div>
        <div>FPS<b>${esc(camera.fps ?? 0)}</b></div>
        <div>Last event<b>${esc(when(camera.lastEventAt))}</b></div>
        <div>Mode<b>${esc(camera.sendAllowed ? 'Sending allowed' : 'Live only')}</b></div>
      </div>
      <div class="rtsp-row">
        <div><label>Channel<input id="channel-${id}" inputmode="numeric" value="${esc(camera.channel ?? '')}" placeholder="1" /></label></div>
        <button id="saveChannel-${id}" class="btn" type="button">Save channel</button>
      </div>
      <div class="rtsp-row">
        <div><label>RTSP URL<input id="url-${id}" placeholder="${camera.rtspConfigured ? 'RTSP configured — enter to replace' : 'rtsp://...'}" /></label></div>
        <button id="saveRtsp-${id}" class="btn" type="button">Save RTSP</button>
        <button id="testRtsp-${id}" class="btn" type="button">Test</button>
      </div>
      <p id="testMsg-${id}" class="note"></p>
      ${claim ? `
        <div class="cam-controls">
          <div><label>Mode<select id="mode-${id}">
            <option value="LIVE" ${camera.mode !== 'SENDING' ? 'selected' : ''}>Live only</option>
            <option value="SENDING" ${camera.mode === 'SENDING' ? 'selected' : ''} ${camera.sendAllowed ? '' : 'disabled'}>Send data</option>
          </select></label></div>
          <button id="applyMode-${id}" class="btn primary" type="button">Apply mode</button>
        </div>
        <p class="note">${camera.sendBlockedReason ? `<span class="blocked">${esc(camera.sendBlockedReason)}</span>` : 'Ready inside the capture window.'}</p>
      ` : `
        <div class="row">
          ${takeover ? `<button id="takeover-${id}" class="btn primary" type="button">Take over camera</button>
            <input id="takeoverOtp-${id}" class="hidden" inputmode="numeric" placeholder="Employer OTP" style="max-width:220px" />
            <button id="takeoverConfirm-${id}" class="btn hidden" type="button">Confirm takeover</button>`
            : `<button id="claim-${id}" class="btn primary" type="button" ${camera.canClaim ? '' : 'disabled'}>Claim camera</button>`}
          <span class="note">${camera.allowedIp ? 'Claim after testing the local RTSP feed.' : 'The employer must set the allowed IP before claiming.'}</span>
        </div>
      `}
    </div>
  </section>`;
}

function siteSection(site, cameras) {
  return `<section class="site-group">
    <div class="site-head">
      <div>
        <h3>${esc(site.name || 'Employer site')}</h3>
        <p>${esc(site.bssId || 'No BSS site ID')} · ${cameras.length} camera${cameras.length === 1 ? '' : 's'}</p>
      </div>
      <div class="site-meta"><span class="pill site">BSS Site ID</span></div>
    </div>
    ${cameras.length ? `<div class="grid cams">${cameras.map(cameraCard).join('')}</div>` : '<div class="card empty">No cameras added for this site yet.</div>'}
  </section>`;
}

function render() {
  if (!state || !state.activated) { renderActivation(); return; }
  qs('logoutBtn').classList.remove('hidden');
  qs('refreshBtn').classList.remove('hidden');
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

      <section class="card">
        <p class="section-label" style="margin-bottom:10px">Add a camera</p>
        <div class="addbar">
          <div><label>Site<select id="newSite"><option value="">Select site</option>${sites.map(site => `<option value="${esc(site.bssId)}">${esc(site.name)}${site.bssId ? ` · ${esc(site.bssId)}` : ''}</option>`).join('')}</select></label></div>
          <div><label>Camera label<input id="newLabel" placeholder="Main Gate" /></label></div>
          <button id="addCamera" class="btn primary" type="button">Add camera</button>
        </div>
        <p class="input-note" style="margin-top:8px">Add the camera with a site and label, then set its channel and local RTSP below. The employer sets IP and schedule in BSS.</p>
        <p id="mainMsg" class="msg"></p>
      </section>

      ${grouped.length ? grouped.map(group => siteSection(group, group.cameras)).join('') : '<div class="card empty">No employer sites are available for this client yet. Ask the employer to create a site.</div>'}
    </div>`;

  qs('addCamera').onclick = async () => {
    const siteBssId = qs('newSite').value;
    const label = qs('newLabel').value.trim();
    if (!siteBssId) { showMessage('mainMsg', 'Select a site for this camera.'); return; }
    if (!label) { showMessage('mainMsg', 'Enter a camera label.'); return; }
    try {
      state = await api('/api/cameras', { method: 'POST', body: JSON.stringify({ siteBssId, label }) });
      render();
    } catch (error) { showMessage('mainMsg', error.message); }
  };

  for (const camera of cameras) {
    const id = camera.cameraId;
    qs(`saveChannel-${id}`)?.addEventListener('click', async () => {
      try {
        state = await api(`/api/cameras/${id}/channel`, { method: 'POST', body: JSON.stringify({ channel: qs(`channel-${id}`).value.trim() }) });
        render();
      } catch (error) { showMessage('mainMsg', error.message); }
    });
    qs(`saveRtsp-${id}`)?.addEventListener('click', async () => {
      try {
        state = await api(`/api/cameras/${id}/rtsp`, { method: 'POST', body: JSON.stringify({ rtsp: qs(`url-${id}`).value.trim() }) });
        render();
      } catch (error) { showMessage('mainMsg', error.message); }
    });
    qs(`testRtsp-${id}`)?.addEventListener('click', async () => {
      const message = qs(`testMsg-${id}`);
      try {
        const result = await api(`/api/cameras/${id}/test`, { method: 'POST', body: JSON.stringify({ rtsp: qs(`url-${id}`).value.trim() }) });
        message.textContent = result.ok ? `Connected — ${result.width}×${result.height}` : result.error;
        message.style.color = result.ok ? '#14843C' : '#DC2626';
      } catch (error) { message.textContent = error.message; message.style.color = '#DC2626'; }
    });
    qs(`claim-${id}`)?.addEventListener('click', async () => {
      try { state = await api(`/api/cameras/${id}/claim`, { method: 'POST', body: '{}' }); render(); }
      catch (error) { showMessage('mainMsg', error.message); }
    });
    qs(`takeover-${id}`)?.addEventListener('click', async () => {
      try {
        await api(`/api/cameras/${id}/takeover-otp`, { method: 'POST', body: '{}' });
        qs(`takeoverOtp-${id}`).classList.remove('hidden');
        qs(`takeoverConfirm-${id}`).classList.remove('hidden');
        showMessage('mainMsg', 'Takeover OTP sent to the employer owner.', true);
      } catch (error) { showMessage('mainMsg', error.message); }
    });
    qs(`takeoverConfirm-${id}`)?.addEventListener('click', async () => {
      try {
        state = await api(`/api/cameras/${id}/claim`, { method: 'POST', body: JSON.stringify({ otp: qs(`takeoverOtp-${id}`).value.trim() }) });
        render();
      } catch (error) { showMessage('mainMsg', error.message); }
    });
    qs(`applyMode-${id}`)?.addEventListener('click', async () => {
      try { state = await api(`/api/cameras/${id}/mode`, { method: 'POST', body: JSON.stringify({ mode: qs(`mode-${id}`).value }) }); render(); }
      catch (error) { showMessage('mainMsg', error.message); }
    });
  }
}

async function refresh() {
  try {
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
    if (app && (!state || !state.activated)) {
      app.innerHTML = `<section class="card activation">
        <div class="activation-head">
          <img class="activation-logo" src="bss-original-logo.png" alt="Bharat Shram Setu" />
          <div><h2>Starting local attendance engine…</h2><p class="muted">This can take a few seconds on first launch.</p></div>
        </div>
        <p id="startupMsg" class="msg ${engineAttempts >= 8 ? 'error' : ''}">${engineAttempts >= 8 ? 'The local engine did not start. Close and reopen the app. If it still fails, contact BSS support.' : 'Please wait…'}</p>
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
        cameras: (value?.cameras || []).map(camera => [camera.cameraId, camera.claimStatus, camera.rtspConfigured, camera.claimedByThisDevice]),
      });
      state = fresh;
      if (shape(old) !== shape(fresh)) render();
      else {
        const conn = qs('conn');
        conn.textContent = state.bssConnected ? 'BSS connected' : 'Connecting to BSS…';
        conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;
      }
    } catch { /* keep last known state */ }
  }, 5000);
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
      renderUpdateBanner({ title: 'You are up to date', body: `Installed version: ${state?.version || update?.currentVersion || 'unknown'}.`, action: 'Close' });
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
qs('logoutBtn').onclick = async () => {
  if (!window.confirm('Sign out this client? Local RTSP settings are kept.')) return;
  try { state = await api('/api/logout', { method: 'POST', body: '{}' }); renderUpdateBanner(null); render(); }
  catch (error) { alert(error.message); }
};

refresh();
setTimeout(() => void checkForUpdates(false), 3000);
