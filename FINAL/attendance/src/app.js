const BASE = 'http://127.0.0.1:8765';
const qs = (id) => document.getElementById(id);
let state = null;
let timer = null;
let activationToken = '';
let pendingSiteId = '';
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
function modeLabel(mode) {
  return mode === 'SENDING' ? 'Sending data' : mode === 'SCHEDULED_OFF' ? 'Outside window' : 'Live only';
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

function renderActivation() {
  qs('logoutBtn').classList.add('hidden');
  qs('refreshBtn').classList.add('hidden');
  qs('app').innerHTML = `
    <section class="card activation">
      <h2>Activate this device</h2>
      <p class="muted">Use the employer owner's mobile number. After OTP verification, select the site.</p>
      <div class="grid two" style="margin-top:14px">
        <label>Employer mobile<input id="phone" inputmode="numeric" placeholder="10-digit mobile" /></label>
        <label>OTP<input id="otp" inputmode="numeric" placeholder="6-digit OTP" /></label>
      </div>
      <div class="row">
        <button id="otpBtn" class="btn" type="button">Send OTP</button>
        <button id="verifyOtpBtn" class="btn" type="button">Verify OTP</button>
      </div>
      <div id="siteStep" class="hidden" style="margin-top:16px">
        <div class="grid two">
          <label>Site<select id="siteSelect"><option value="">Select site</option></select></label>
          <label>Device name<input id="deviceName" placeholder="Reception laptop" /></label>
        </div>
        <div class="row"><button id="activateBtn" class="btn primary" type="button">Activate device</button></div>
      </div>
      <p id="activationMsg" class="msg"></p>
    </section>`;
  qs('otpBtn').onclick = async () => {
    try {
      await api('/api/activate/request-otp', { method: 'POST', body: JSON.stringify({ phone: qs('phone').value.trim() }) });
      showMessage('activationMsg', 'OTP sent to the employer-owner mobile.', true);
    } catch (error) { showMessage('activationMsg', error.message); }
  };
  qs('verifyOtpBtn').onclick = async () => {
    try {
      const data = await api('/api/activate/verify-otp', { method: 'POST', body: JSON.stringify({ phone: qs('phone').value.trim(), otp: qs('otp').value.trim() }) });
      activationToken = data.activationToken;
      const select = qs('siteSelect');
      select.innerHTML = '<option value="">Select site</option>' + (data.sites || []).map(site => `<option value="${esc(site.bssId)}">${esc(site.name)}${site.bssId ? ` · ${esc(site.bssId)}` : ''}</option>`).join('');
      qs('siteStep').classList.remove('hidden');
      showMessage('activationMsg', 'OTP verified. Select the site.', true);
    } catch (error) { showMessage('activationMsg', error.message); }
  };
  qs('activateBtn').onclick = async () => {
    try {
      state = await api('/api/activate/complete', { method: 'POST', body: JSON.stringify({ activationToken, siteId: qs('siteSelect').value, deviceName: qs('deviceName').value.trim() }) });
      render();
      startPolling();
    } catch (error) { showMessage('activationMsg', error.message); }
  };
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
    ${canPreview ? `<img class="feed" src="${BASE}/stream/${id}?t=${Date.now()}" alt="${esc(camera.label)} live view" />` : `<div class="feed" style="display:grid;place-items:center;color:#94a3b8;font-size:12px">RTSP not configured</div>`}
    <div class="cam-body">
      <div class="cam-info">
        <div>Allowed IP<b>${esc(camera.allowedIp || 'Not set in BSS')}</b></div>
        <div>Schedule<b>${esc(camera.schedule || '24/7')}</b></div>
        <div>FPS<b>${esc(camera.fps ?? 0)}</b></div>
        <div>Last event<b>${esc(when(camera.lastEventAt))}</b></div>
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

function render() {
  if (!state || !state.activated) { renderActivation(); return; }
  qs('logoutBtn').classList.remove('hidden');
  qs('refreshBtn').classList.remove('hidden');
  const conn = qs('conn');
  conn.textContent = state.bssConnected ? 'BSS connected' : 'BSS heartbeat pending';
  conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;
  const cameras = state.cameras || [];
  qs('app').innerHTML = `
    <div class="dashboard">
      <section class="card summary">
        <div><h2>${esc(state.site?.name || 'Attendance site')}</h2><p class="muted">${esc(state.site?.bssId || '')} · ${esc(state.faceModel?.model || '')} ${esc(state.faceModel?.version || '')}</p></div>
        <div class="meta">
          <div>Heartbeat<b>${esc(when(state.lastHeartbeatAt))}</b></div>
          <div>Pending events<b>${esc(state.outbox ?? 0)}</b></div>
          <div>Cameras<b>${cameras.length}</b></div>
        </div>
      </section>
      <section class="card">
        <div class="addbar">
          <div><label>Camera label<input id="newLabel" placeholder="Main Gate" /></label></div>
          <div><label>Channel<input id="newChannel" placeholder="1" /></label></div>
          <button id="addCamera" class="btn primary" type="button">Add camera</button>
        </div>
        <p class="note" style="margin-top:8px">This creates a pending site camera in BSS. The employer then sets the allowed IP and capture window. RTSP stays on this laptop.</p>
        <p id="mainMsg" class="msg"></p>
      </section>
      <div class="grid cams">
        ${cameras.map(cameraCard).join('') || '<section class="card muted">No cameras added yet. Add a camera above.</section>'}
      </div>
    </div>`;
  qs('addCamera').onclick = async () => {
    try {
      state = await api('/api/cameras', { method: 'POST', body: JSON.stringify({ label: qs('newLabel').value.trim(), channel: qs('newChannel').value.trim() }) });
      render();
    } catch (error) { showMessage('mainMsg', error.message); }
  };
  for (const camera of cameras) {
    const id = camera.cameraId;
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
        message.style.color = result.ok ? '#0f7b4f' : '#b42318';
      } catch (error) { message.textContent = error.message; message.style.color = '#b42318'; }
    });
    qs(`claim-${id}`)?.addEventListener('click', async () => {
      try {
        state = await api(`/api/cameras/${id}/claim`, { method: 'POST', body: '{}' });
        render();
      } catch (error) { showMessage('mainMsg', error.message); }
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
      try {
        state = await api(`/api/cameras/${id}/mode`, { method: 'POST', body: JSON.stringify({ mode: qs(`mode-${id}`).value }) });
        render();
      } catch (error) { showMessage('mainMsg', error.message); }
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
        <h2>Starting local attendance engine…</h2>
        <p class="muted">The app is starting its local camera engine. This can take a few seconds on first launch.</p>
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
      const sameShape = old && old.activated === fresh.activated
        && JSON.stringify((old.cameras || []).map(c => [c.cameraId, c.claimStatus, c.rtspConfigured, c.claimedByThisDevice]))
          === JSON.stringify((fresh.cameras || []).map(c => [c.cameraId, c.claimStatus, c.rtspConfigured, c.claimedByThisDevice]));
      state = fresh;
      if (!sameShape) render();
      else {
        const conn = qs('conn');
        conn.textContent = state.bssConnected ? 'BSS connected' : 'BSS heartbeat pending';
        conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;
      }
    } catch { /* keep last known state */ }
  }, 5000);
}

qs('refreshBtn').onclick = async () => {
  try { state = await api('/api/config/refresh', { method: 'POST', body: '{}' }); render(); }
  catch (error) { alert(error.message); }
};
qs('logoutBtn').onclick = async () => {
  if (!window.confirm('Sign out this client? Local RTSP settings are kept.')) return;
  try { state = await api('/api/logout', { method: 'POST', body: '{}' }); render(); }
  catch (error) { alert(error.message); }
};

refresh();
