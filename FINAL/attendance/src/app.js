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

function cameraCard(camera) {
  const id = camera.cameraId;
  const stateInfo = cameraState(camera);
  const canPreview = camera.rtspConfigured;
  return `<section class="card cam" data-camera="${id}">
    <div class="cam-head">
      <div class="cam-title"><h3>${esc(camera.label)}</h3>${statusPill(camera)}</div>
      <span class="pill ${stateInfo.cls}">${esc(stateInfo.label)}</span>
    </div>
    ${canPreview ? `<img class="feed" src="${BASE}/stream/${id}?t=${Date.now()}" alt="${esc(camera.label)} live view" />` : `<div class="feed" style="display:grid;place-items:center;color:#94A3B8;font-size:12px">RTSP not configured</div>`}
    <div class="cam-body">
      <div class="cam-info">
        <div>Camera ID<b class="mono">${esc(camera.uid || '—')}</b></div>
        <div>Source device<b>${esc(camera.sourceDeviceName || state.deviceName || 'This device')}</b></div>
        <div>BSS Site ID<b>${esc(camera.siteBssId || '—')}</b></div>
        <div>Channel<b>${esc(camera.channel ?? '—')}</b></div>
        <div>Timezone<b>IST (UTC+05:30)</b></div>
        <div>Allowed IP<b>${esc(camera.allowedIp || 'Waiting for employer')}</b></div>
        <div>RTSP<b>${esc(camera.rtspConfigured ? 'Configured' : 'Not configured')}</b></div>
        <div>Last event<b>${esc(when(camera.lastEventAt))}</b></div>
      </div>
      <p class="note">${camera.sendBlockedReason ? `<span class="${camera.approvalStatus === 'APPROVED' && camera.ipWhitelisted ? 'blocked' : ''}">${esc(camera.sendBlockedReason)}</span>` : 'Attendance is active. Events sync automatically after an internet outage.'}</p>
      <div class="row" style="margin-top:10px">
        <button id="remove-${id}" class="btn ghost" type="button">Remove camera</button>
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

      <section class="card">
        <div class="cam-title"><h3>Add camera</h3><span class="pill muted">Test before saving</span></div>
        <p class="muted">Enter all details, test the RTSP connection, then save. Connection details cannot be edited after saving.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end">
          <div><label>Site<select id="newCameraSite">${siteChoices.map(site => `<option value="${esc(site.bssId || site.id)}" ${site.capacity.remaining <= 0 ? 'disabled' : ''} ${firstAvailable && site.id === firstAvailable.id ? 'selected' : ''}>${esc(site.name)} — ${site.capacity.used}/${site.capacity.limit} used (${site.capacity.remaining} left)</option>`).join('')}</select></label></div>
          <div><label>Camera label<input id="newCameraLabel" maxlength="120" placeholder="Main Gate" /></label></div>
          <div><label>Channel<input id="newCameraChannel" inputmode="numeric" placeholder="1" /></label></div>
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
  ['newCameraSite', 'newCameraLabel', 'newCameraChannel', 'newCameraRtsp'].forEach(id => {
    qs(id)?.addEventListener('input', resetTest);
    qs(id)?.addEventListener('change', resetTest);
  });
  const readForm = () => ({
    siteBssId: qs('newCameraSite').value,
    label: qs('newCameraLabel').value.trim(),
    channel: qs('newCameraChannel').value.trim(),
    rtsp: qs('newCameraRtsp').value.trim(),
  });
  const validateForm = form => {
    if (!form.label) return 'Enter a camera label.';
    if (!/^\d+$/.test(form.channel)) return 'Enter a numeric camera channel.';
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

  for (const camera of cameras) {
    const id = camera.cameraId;
    qs(`remove-${id}`)?.addEventListener('click', async () => {
      const confirmed = await showDialog({
        title: 'Remove this camera?',
        body: `${camera.label} will stop reporting and disappear from the employer dashboard. Past attendance is kept.`,
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
        cameras: (value?.cameras || []).map(camera => [camera.cameraId, camera.approvalStatus, camera.status, camera.rtspConfigured, camera.sendAllowed, camera.cameraOnline, camera.ipWhitelisted]),
        outbox: value?.outbox,
        localEvents: (value?.localEvents || []).map(event => [event.eventId, event.syncStatus]),
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

refresh();
setTimeout(() => void checkForUpdates(false), 3000);
