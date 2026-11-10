/* GitHub Pages / static-hosting helpers: service worker, key vault UI, backup, reminders, install, audio unlock */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const st = () => !!(self.AvaStatic && self.AvaStatic.active);
const post = (u, b) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
const toast = (m) => (window.AvaApp ? window.AvaApp.toast(m) : alert(m));

if ('serviceWorker' in navigator && location.protocol !== 'file:') fetch('sw.js', { method: 'HEAD' }).then((r) => r.ok && navigator.serviceWorker.register('sw.js')).catch(() => {});
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

/* ---- audio unlock (iOS/Safari only allow sound after a gesture; reuse ONE element) ---- */
const el = new Audio(); el.preload = 'auto'; window.__ttsEl = el;
const SIL = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
function unlock() {
  document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true);
  try { el.src = SIL; el.play().catch(() => {}); } catch {}
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch {}
}
document.addEventListener('pointerdown', unlock, true); document.addEventListener('keydown', unlock, true);

/* ---- in-app browser warning (mic + speech usually blocked there) ---- */
const ua = navigator.userAgent;
if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|; wv\)/i.test(ua)) {
  const b = $('#banner'); if (b) { b.hidden = false; b.textContent = '⚠️ You are inside an in-app browser — the microphone usually does not work here. Open this page in Chrome or Safari.'; }
}

/* ---- install button ---- */
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; const b = $('#pgInstall'); if (b) b.hidden = false; });

/* ---- backup ---- */
const KEEP = (k) => k.startsWith('ava.') && k !== 'ava.static.config' && k !== 'ava.static.vault' && k !== 'ava.static.keymode';
function exportBackup() {
  const d = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEEP(k)) d[k] = localStorage.getItem(k); } } catch {}
  const blob = new Blob([JSON.stringify({ app: 'ava', v: 1, at: new Date().toISOString(), data: d })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'voca-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  try { localStorage.setItem('ava.pages.lastBackup', String(Date.now())); } catch {}
  toast('Backup downloaded — keep that file safe.');
}
function importBackup(file) {
  const r = new FileReader();
  r.onload = () => { try { const j = JSON.parse(r.result); if (j.app !== 'ava' || !j.data) throw 0; Object.entries(j.data).forEach(([k, v]) => KEEP(k) && localStorage.setItem(k, v)); toast('Restored! Reloading…'); setTimeout(() => location.reload(), 700); } catch { toast('That is not a valid Ava backup file.'); } };
  r.readAsText(file);
}

/* ---- daily reminder as a calendar event (web pages cannot push when closed) ---- */
function reminderIcs() {
  const t = ($('#setRemind') && $('#setRemind').value) || '19:00', [h, m] = t.split(':');
  const d = new Date(); const ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ava//EN', 'BEGIN:VEVENT', 'UID:ava-daily@local', 'DTSTAMP:' + ymd + 'T000000', `DTSTART:${ymd}T${h}${m}00`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Practise English with Ava', 'DESCRIPTION:Keep your streak alive: ' + location.href.split('?')[0], 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Time to practise English', 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'voca-daily-reminder.ics'; a.click();
}

/* ---- settings UI ---- */
function buildUi(cfg) {
  const host = $('#saveSettings') && $('#saveSettings').closest('.card'); if (!host || $('#pgBox')) return;
  const box = document.createElement('div'); box.id = 'pgBox'; box.className = 'pgbox';
  box.innerHTML = `<h4>Hosting &amp; data</h4>
  <p class="muted" id="pgNote"></p>
  <label>Where to keep my API keys
    <select id="pgMode"><option value="tab">This tab only (safest — re-paste each visit)</option><option value="pass">Encrypted with a passphrase</option><option value="device">Plain on this device (convenient)</option></select></label>
  <div class="row"><button class="ghost" type="button" id="pgTest">✅ Test AI connection</button><button class="ghost" type="button" id="pgForget">🗑 Forget my keys</button></div>
  <div class="row"><button class="ghost" type="button" id="pgExport">⬇️ Download backup</button><button class="ghost" type="button" id="pgImport">⬆️ Restore backup</button><input type="file" id="pgFile" accept="application/json" hidden></div>
  <div class="row"><button class="ghost" type="button" id="pgIcs">📅 Add daily reminder to my calendar</button><button class="ghost" type="button" id="pgInstall" hidden>📲 Install app</button></div>
  <p class="muted" id="pgIos" hidden>On iPhone: tap Share → “Add to Home Screen”.</p>`;
  host.appendChild(box);
  $('#pgNote').textContent = 'Running browser-only (no server). Your progress is saved in this browser on this device — use Download backup before clearing data or switching phones.';
  $('#pgMode').value = cfg.keyMode || 'tab';
  $('#pgMode').onchange = async (e) => {
    const m = e.target.value; let pw = '';
    if (m === 'pass') { pw = prompt('Choose a passphrase (6+ characters). You will type it each time you open the app.'); if (!pw || pw.length < 6) { e.target.value = cfg.keyMode || 'tab'; return toast('Passphrase too short.'); } }
    const r = await post('/api/keymode', { mode: m, pass: pw }); cfg.keyMode = r.keyMode; toast('Key storage changed — paste your key(s) again and press Save.');
  };
  $('#pgTest').onclick = async () => { toast('Testing…'); const r = await (await fetch('/api/ping')).json().catch(() => ({ ok: false, error: 'No browser backend.' })); toast(r.ok ? '✅ Claude is connected!' : '❌ ' + (r.error || 'Failed')); };
  $('#pgForget').onclick = async () => { await post('/api/forgetkeys'); toast('Keys removed from this browser.'); };
  $('#pgExport').onclick = exportBackup;
  $('#pgImport').onclick = () => $('#pgFile').click();
  $('#pgFile').onchange = (e) => e.target.files[0] && importBackup(e.target.files[0]);
  $('#pgIcs').onclick = reminderIcs;
  $('#pgInstall').onclick = async () => { if (deferred) { deferred.prompt(); deferred = null; $('#pgInstall').hidden = true; } };
  if (deferred) $('#pgInstall').hidden = false;
  if (/iPhone|iPad/.test(ua) && !navigator.standalone) $('#pgIos').hidden = false;
}

/* ---- unlock modal ---- */
function askUnlock() {
  const m = $('#modal'), body = $('#modalBody'); if (!m || !body) return;
  body.innerHTML = `<h3>🔒 Unlock your keys</h3><p class="muted">Type your passphrase to use AI coaching and character voices.</p>
  <input type="password" id="pgPw" placeholder="passphrase" autocomplete="current-password"><div class="row"><button class="primary" id="pgGo">Unlock</button><button class="ghost" id="pgSkip">Skip (offline mode)</button><button class="ghost" id="pgLost">Forgot it</button></div><small class="muted" id="pgMsg"></small>`;
  m.hidden = false;
  const done = () => { m.hidden = true; window.__refreshConfig && window.__refreshConfig(); toast('Unlocked ✔'); };
  $('#pgGo').onclick = async () => { const r = await post('/api/unlock', { pass: $('#pgPw').value }); if (r.ok) done(); else $('#pgMsg').textContent = 'Wrong passphrase.'; };
  $('#pgPw').onkeydown = (e) => e.key === 'Enter' && $('#pgGo').click();
  $('#pgSkip').onclick = () => { m.hidden = true; };
  $('#pgLost').onclick = async () => { await post('/api/forgetkeys'); await post('/api/keymode', { mode: 'tab' }); m.hidden = true; toast('Keys cleared — paste them again in Progress → Settings.'); };
  setTimeout(() => $('#pgPw') && $('#pgPw').focus(), 50);
}

addEventListener('load', async () => {
  if (!st()) return;
  let cfg = {}; try { cfg = await (await fetch('/api/config')).json(); } catch {}
  buildUi(cfg);
  if (cfg.locked) askUnlock();
  try { const t = +localStorage.getItem('ava.pages.lastBackup') || 0, first = +localStorage.getItem('ava.pages.first') || (localStorage.setItem('ava.pages.first', Date.now()), Date.now());
    if (Date.now() - Math.max(t, first) > 7 * 864e5 && window.AvaApp) window.AvaApp.toast('💾 Tip: download a backup (Progress → Settings) so you never lose your streak.'); } catch {}
});
})();
