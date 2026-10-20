const BASE = 'http://127.0.0.1:8765';
const qs = (id) => document.getElementById(id);
let state = null;
let timer = null;

async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' }, ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body.data;
}

function showMessage(el, text, ok = false) {
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${ok ? 'ok' : 'error'}`;
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

function statusPill(camera) {
  if (camera.status === 'ONLINE') return '<span class="pill ok">Online</span>';
  if (camera.status === 'NO_RTSP') return '<span class="pill warn">No RTSP</span>';
  return `<span class="pill ${camera.status === 'RECONNECTING' ? 'warn' : 'muted'}">${esc(camera.status || 'Unknown')}</span>`;
}

function renderActivation() {
  qs('logoutBtn').classList.add('hidden');
  qs('refreshBtn').classList.add('hidden');
  qs('app').innerHTML = `
    <section class="card activation">
      <h2>Activate this device</h2>
      <p class="muted">Use the employer owner's mobile number. The activation is permanent until revoked in BSS.</p>
      <div class="grid two" style="margin-top:14px">
        <label>Employer mobile<input id="phone" inputmode="numeric" placeholder="10-digit mobile" /></label>
        <label>Site code<input id="siteCode" placeholder="Site code from BSS" /></label>
      </div>
      <div class="grid two" style="margin-top:12px">
        <label>Device name<input id="deviceName" placeholder="Reception laptop" /></label>
        <label>OTP<input id="otp" inputmode="numeric" placeholder="6-digit OTP" /></label>
      </div>
      <div class="row">
        <button id="otpBtn" class="btn" type="button">Send OTP</button>
        <button id="activateBtn" class="btn primary" type="button">Activate</button>
      </div>
      <p id="activationMsg" class="msg"></p>
    </section>`;
  qs('otpBtn').onclick = async () => {
    const msg = qs('activationMsg');
    try {
      msg.className = 'msg'; msg.textContent = '';
      await api('/api/activate/request-otp', { method: 'POST', body: JSON.stringify({ phone: qs('phone').value.trim() }) });
      showMessage(msg, 'OTP sent to the employer-owner mobile.', true);
    } catch (error) { showMessage(msg, error.message); }
  };
  qs('activateBtn').onclick = async () => {
    const msg = qs('activationMsg');
    try {
      msg.className = 'msg'; msg.textContent = '';
      state = await api('/api/activate/verify', { method: 'POST', body: JSON.stringify({
        phone: qs('phone').value.trim(), otp: qs('otp').value.trim(),
        siteCode: qs('siteCode').value.trim(), deviceName: qs('deviceName').value.trim(),
      }) });
      render();
      startPolling();
    } catch (error) { showMessage(msg, error.message); }
  };
}

function render() {
  const focused = document.activeElement;
  if (focused && ['INPUT', 'SELECT'].includes(focused.tagName)) return;
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
        <div>
          <h2>${esc(state.site?.name || 'Attendance site')}</h2>
          <p class="muted">${esc(state.site?.code || '')} · Device ${esc(state.deviceId || '').slice(0, 8)} · ${esc(state.faceModel?.model || '')} ${esc(state.faceModel?.version || '')}</p>
        </div>
        <div class="meta">
          <div>Heartbeat<b id="sumHeartbeat">${esc(when(state.lastHeartbeatAt))}</b></div>
          <div>Pending events<b id="sumOutbox">${esc(state.outbox ?? 0)}</b></div>
          <div>Cameras<b id="sumCameras">${cameras.length}</b></div>
        </div>
      </section>
      <section class="card">
        <div class="addbar">
          <div><label>Camera label<input id="newLabel" placeholder="Main Gate" /></label></div>
          <div><label>RTSP URL<input id="newRtsp" placeholder="rtsp://user:pass@192.168.1.20:554/Streaming/Channels/101" /></label></div>
          <button id="addCamera" class="btn primary" type="button">Add camera</button>
        </div>
        <p class="note" style="margin-top:8px">The RTSP URL stays on this laptop. BSS receives only camera health and face embeddings. After adding, set the camera's allowed IP in BSS.</p>
        <p id="mainMsg" class="msg"></p>
      </section>
      <div class="grid cams">
        ${cameras.map(camera => cameraCard(camera)).join('') || '<section class="card muted">No cameras yet. Add an RTSP camera above.</section>'}
      </div>
    </div>`;
  qs('addCamera').onclick = async () => {
    const msg = qs('mainMsg');
    try {
      state = await api('/api/cameras', { method: 'POST', body: JSON.stringify({ label: qs('newLabel').value.trim(), rtsp: qs('newRtsp').value.trim() }) });
      state = await api('/api/config/refresh', { method: 'POST', body: '{}' });
      render();
    } catch (error) { showMessage(msg, error.message); }
  };
  for (const camera of cameras) {
    qs(`apply-${cssId(camera.label)}`)?.addEventListener('click', async () => {
      const msg = qs('mainMsg');
      try {
        state = await api(`/api/cameras/${encodeURIComponent(camera.label)}/mode`, { method: 'POST', body: JSON.stringify({ mode: qs(`mode-${cssId(camera.label)}`).value }) });
        render();
      } catch (error) { showMessage(msg, error.message); }
    });
    qs(`rtsp-${cssId(camera.label)}`)?.addEventListener('click', async () => {
      const msg = qs('mainMsg');
      try {
        const url = qs(`url-${cssId(camera.label)}`).value.trim();
        if (!url) throw new Error('Enter an RTSP URL.');
        state = await api('/api/cameras', { method: 'POST', body: JSON.stringify({ label: camera.label, rtsp: url }) });
        render();
      } catch (error) { showMessage(msg, error.message); }
    });
    qs(`remove-${cssId(camera.label)}`)?.addEventListener('click', async () => {
      if (!window.confirm(`Remove local camera ${camera.label}?`)) return;
      try { state = await api(`/api/cameras/${encodeURIComponent(camera.label)}`, { method: 'DELETE' }); render(); }
      catch (error) { showMessage(qs('mainMsg'), error.message); }
    });
  }
}

function cssId(label) {
  return String(label).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function cameraCard(camera) {
  const id = cssId(camera.label);
  const canSend = camera.sendAllowed;
  const reason = camera.sendBlockedReason ? `<span class="blocked">${esc(camera.sendBlockedReason)}</span>` : 'Ready inside the capture window.';
  return `<section class="card cam">
    <div class="cam-head">
      <div class="cam-title"><h3>${esc(camera.label)}</h3><span id="status-${id}">${statusPill(camera)}</span></div>
      <span id="mode-pill-${id}" class="pill ${camera.mode === 'SENDING' ? 'ok' : 'muted'}">${esc(modeLabel(camera.mode))}</span>
    </div>
    <img class="feed" src="${BASE}/stream/${encodeURIComponent(camera.label)}?t=${Date.now()}" alt="${esc(camera.label)} live view" />
    <div class="cam-body">
      <div class="cam-info">
        <div>Allowed IP<b id="ip-${id}">${esc(camera.allowedIp || 'Not set in BSS')}</b></div>
        <div>Schedule<b id="schedule-${id}">${esc(camera.schedule || '24/7')}</b></div>
        <div>FPS<b id="fps-${id}">${esc(camera.fps ?? 0)}</b></div>
        <div>Last event<b id="event-${id}">${esc(when(camera.lastEventAt))}</b></div>
      </div>
      <div class="cam-controls">
        <div><label>Mode<select id="mode-${id}">
          <option value="LIVE" ${camera.mode !== 'SENDING' ? 'selected' : ''}>Live only</option>
          <option value="SENDING" ${camera.mode === 'SENDING' ? 'selected' : ''} ${canSend ? '' : 'disabled'}>Send data</option>
        </select></label></div>
        <button id="apply-${id}" class="btn primary" type="button">Apply mode</button>
      </div>
      <p class="note" id="reason-${id}">${reason}</p>
      <div class="rtsp-row">
        <div><label>Replace RTSP URL<input id="url-${id}" placeholder="${camera.rtspConfigured ? 'RTSP configured — enter to replace' : 'rtsp://...'}" /></label></div>
        <button id="rtsp-${id}" class="btn" type="button">Save RTSP</button>
      </div>
      <div class="row">
        <button id="remove-${id}" class="btn danger" type="button">Remove local camera</button>
      </div>
    </div>
  </section>`;
}

function updateDynamic() {
  if (!state || !state.activated) return;
  const conn = qs('conn');
  conn.textContent = state.bssConnected ? 'BSS connected' : 'BSS heartbeat pending';
  conn.className = `pill ${state.bssConnected ? 'ok' : 'warn'}`;
  const heartbeat = qs('sumHeartbeat');
  if (heartbeat) heartbeat.textContent = when(state.lastHeartbeatAt);
  const outbox = qs('sumOutbox');
  if (outbox) outbox.textContent = state.outbox ?? 0;
  const count = qs('sumCameras');
  if (count) count.textContent = (state.cameras || []).length;
  for (const camera of state.cameras || []) {
    const id = cssId(camera.label);
    const status = qs(`status-${id}`);
    if (status) status.innerHTML = statusPill(camera);
    const modePill = qs(`mode-pill-${id}`);
    if (modePill) {
      modePill.textContent = modeLabel(camera.mode);
      modePill.className = `pill ${camera.mode === 'SENDING' ? 'ok' : 'muted'}`;
    }
    const ip = qs(`ip-${id}`); if (ip) ip.textContent = camera.allowedIp || 'Not set in BSS';
    const schedule = qs(`schedule-${id}`); if (schedule) schedule.textContent = camera.schedule || '24/7';
    const fps = qs(`fps-${id}`); if (fps) fps.textContent = camera.fps ?? 0;
    const event = qs(`event-${id}`); if (event) event.textContent = when(camera.lastEventAt);
    const reason = qs(`reason-${id}`);
    if (reason) reason.innerHTML = camera.sendBlockedReason ? `<span class="blocked">${esc(camera.sendBlockedReason)}</span>` : 'Ready inside the capture window.';
    const select = qs(`mode-${id}`);
    if (select && document.activeElement !== select) {
      select.value = camera.mode === 'SENDING' ? 'SENDING' : 'LIVE';
      const option = select.querySelector('option[value="SENDING"]');
      if (option) option.disabled = !camera.sendAllowed;
    }
  }
}

async function refresh() {
  try {
    state = await api('/api/status');
    render();
    startPolling();
  } catch (error) {
    const conn = qs('conn');
    conn.textContent = 'Engine offline';
    conn.className = 'pill bad';
  }
}

function startPolling() {
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    try {
      const fresh = await api('/api/status');
      const previous = state;
      const sameShape = previous && previous.activated === fresh.activated
        && JSON.stringify((previous.cameras || []).map(c => c.label)) === JSON.stringify((fresh.cameras || []).map(c => c.label));
      state = fresh;
      if (!sameShape) render();
      else updateDynamic();
    } catch { /* keep last known UI */ }
  }, 4000);
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
