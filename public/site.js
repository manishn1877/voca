/* Voca — site structure: Home page, calmer Speak screen, organised Progress area, SVG icon set */
(() => {
'use strict';
const A = window.AvaApp; if (!A) return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const svg = (d, w = 1.8) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  topics: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  hands: svg('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
  solo: svg('<path d="M4 5.5C6.5 4 9.5 4 12 5.5c2.5-1.5 5.5-1.5 8 0V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z"/><path d="M12 5.5V19"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  speaker: svg('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>'),
  skip: svg('<path d="M5 5l9 7-9 7zM18 5v14"/>'),
  palette: svg('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1-.8-1.4-.8-2.3 0-.8.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>'),
  type: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
window.VocaIcons = IC;

/* ---------- brand ---------- */
const logo = $('.logo'); if (logo) logo.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><rect x="4" y="12" width="3.6" height="8" rx="1.8"/><rect x="10" y="6" width="3.6" height="20" rx="1.8"/><rect x="16" y="10" width="3.6" height="12" rx="1.8"/><rect x="22" y="4" width="3.6" height="24" rx="1.8"/></g></svg>';
const tag = $('.brand small'); if (tag) tag.remove();

/* ---------- nav ---------- */
function go(t) { A.switchTab(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }
$('.brand').style.cursor = 'pointer'; $('.brand').onclick = () => go('practice');

/* ---------- calmer Speak screen ---------- */
const rep = (sel, html) => { const e = $(sel); if (e) e.innerHTML = html; };
rep('#surpriseBtn', IC.topics + '<span>Topics</span>'); rep('#handsBtn', IC.hands + '<span>Hands-free</span>'); rep('#skipBtn', IC.stop + '<span>Stop</span>');
const mi = $('#micBtn .mic-ico'); if (mi) mi.innerHTML = IC.mic;
const sb = $('#soloBtn'); if (sb) sb.innerHTML = IC.solo + '<span>Solo</span>';
const tb = $('#themeBtn'); if (tb) tb.innerHTML = IC.palette;
const ch = $('#charBtn'); if (ch) ch.innerHTML = 'Coach: <span id="charName">' + ($('#charName') ? $('#charName').textContent : 'Ava') + '</span>';
{ const f = $('#typedForm'), t = document.createElement('button'); t.className = 'linkbtn'; t.type = 'button'; t.innerHTML = IC.type + ' Prefer typing?'; f.hidden = true; f.parentNode.insertBefore(t, f); t.onclick = () => { f.hidden = !f.hidden; if (!f.hidden) $('#typedInput').focus(); }; }
/* ---------- Speak / Type mode ---------- */
{
  const seg = document.createElement('div'); seg.className = 'modeseg';
  seg.innerHTML = `<div class="seg2"><button data-m="speak" class="on">${IC.mic} Speak</button><button data-m="type">${IC.type} Type</button></div><label class="chk rdaloud" hidden><input type="checkbox" id="readAloud"> Read replies aloud</label>`;
  $('.stage').prepend(seg);
  const stage = $('.stage'), f = $('#typedForm'), lb = $('.linkbtn');
  const set = (m, focus) => {
    window.__typeMode = m === 'type'; stage.classList.toggle('type-on', window.__typeMode);
    $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.m === m)); $('.rdaloud', seg).hidden = !window.__typeMode;
    if (window.__typeMode) { A.cancelAll(); A.stopListen(); f.hidden = false; $('#typedInput').placeholder = 'Type your answer, then press Enter…'; $('#hint').textContent = 'Type a topic to begin, or tap Topics for ideas.'; if (focus) $('#typedInput').focus(); }
    else { f.hidden = true; }
    try { localStorage.setItem('voca.mode', m); } catch {}
  };
  seg.onclick = (e) => { const b = e.target.closest('button[data-m]'); if (b) set(b.dataset.m, true); };
  window.__readAloud = false; $('#readAloud').onchange = (e) => { window.__readAloud = e.target.checked; };
  window.VocaSetMode = set;
  const tr = $('#transcript'), esc = A.esc;
  A.on('status', ({ s }) => {
    $$('.m.typing', tr).forEach((e) => e.remove());
    if (window.__typeMode && s === 'thinking') { const d = document.createElement('div'); d.className = 'm bot typing'; d.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>'; tr.appendChild(d); tr.scrollTop = 1e9; }
    if (s === 'idle') setTimeout(drain, 120);
  });
  /* messages typed while the coach is busy are queued and sent in order */
  const queue = [], form = $('#typedForm'), inp = $('#typedInput');
  const busy = () => ['thinking', 'speaking'].includes(A.status);
  function drain() { if (!queue.length || busy()) return; const t = queue.shift(); $$('.m.queued', tr).shift()?.remove(); inp.value = t; form.requestSubmit(); }
  form.addEventListener('submit', (e) => {
    if (!busy() || form.dataset.drain) return;
    const v = inp.value.trim(); if (!v) return;
    e.preventDefault(); e.stopImmediatePropagation();
    queue.push(v); inp.value = ''; const d = document.createElement('div'); d.className = 'm you queued'; d.textContent = v; tr.appendChild(d); tr.scrollTop = 1e9;
  }, true);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  A.on('botDone', () => setTimeout(drain, 150));
  A.on('turn', ({ rep }) => {
    if (!window.__typeMode || !rep) return;
    const mine = $$('.m.you', tr).pop(); if (!mine) return;
    const box = document.createElement('div'); box.className = 'inl ' + (rep.corrected ? 'has' : 'clean');
    box.innerHTML = rep.corrected ? `<div class="ok1">${window.VocaDiff(rep.text, rep.corrected).fixed}</div>` : '<span>Looks good</span>';
    mine.appendChild(box); tr.scrollTop = 1e9;
  });
  let m = 'speak'; try { m = localStorage.getItem('voca.mode') || 'speak'; } catch {} set(m === 'type' ? 'type' : 'speak');
}
$('#aiPill').title = 'Shows whether the AI coach is connected';

/* ---------- Progress: organised into sub-pages ---------- */
const P = $('#tab-progress'); if (!P.dataset.org) { P.dataset.org = 1;
  const grab = (s) => $(s, P), kids = [...P.children];
  const daily = grab('#daily'), xp = grab('.xpcard'), g3 = grab('.grid3'), three = grab('.three'), badges = grab('#badges').closest('.card'), heat = grab('#heat').closest('.card'), two = grab('.two');
  const lb = grab('#learnbox'), nb = grab('#notebook').closest('.card'), settings = grab('#saveSettings').closest('.card'), themes = $('#themeRow') ? $('#themeRow').closest('.card') : null;
  const pane = (id, ...els) => { const d = document.createElement('div'); d.className = 'ppane'; d.id = 'pp-' + id; els.filter(Boolean).forEach((e) => d.appendChild(e)); return d; };
  const bar = document.createElement('div'); bar.className = 'psub'; bar.innerHTML = [['over', 'Overview'], ['trend', 'Trends'], ['badge', 'Badges'], ['notes', 'Notebook'], ['set', 'Settings']].map(([k, n], i) => `<button data-p="${k}" class="${i ? '' : 'on'}">${n}</button>`).join('');
  // settings groups
  const grp = (title, ids, open) => { const d = document.createElement('details'); d.className = 'sgrp'; if (open) d.open = true; d.innerHTML = `<summary>${title}</summary><div class="sbody"></div>`; ids.forEach((id) => { const el = $('#' + id, settings); const lab = el && (el.closest('label') || el.closest('.row') || el); if (lab) d.lastChild.appendChild(lab); }); return d; };
  const save = $('#saveSettings').closest('.row'); const h3 = settings.querySelector('h3'); if (h3) h3.textContent = 'Settings';
  const groups = [grp('Practice', ['setGoal', 'setRemind', 'setLevel', 'setLang'], true), grp('Voice', ['setVoice', 'setRate', 'setSound', 'setTts', 'setTtsUrl', 'setTtsKey', 'ttsTest']), grp('AI coach', ['setKey']), grp('Online helpers', ['setLT', 'setDict', 'setNeural', 'neuralRow'])];
  if (themes) { const d = document.createElement('details'); d.className = 'sgrp'; d.innerHTML = '<summary>Look &amp; theme</summary><div class="sbody"></div>'; const row = $('#themeRow'); row.previousElementSibling && row.previousElementSibling.remove(); d.lastChild.appendChild(row); groups.splice(1, 0, d); themes.remove(); }
  groups.forEach((g) => settings.insertBefore(g, save));
  const finalize = () => { const pg = $('#pgBox'); if (pg && !pg.closest('.sgrp')) { const d = document.createElement('details'); d.className = 'sgrp'; d.innerHTML = '<summary>Data &amp; hosting</summary><div class="sbody"></div>'; d.lastChild.appendChild(pg); settings.insertBefore(d, save); const h = pg.querySelector('h4'); if (h) h.remove(); } };
  addEventListener('load', () => setTimeout(finalize, 600)); setTimeout(finalize, 1500);
  P.innerHTML = ''; P.appendChild(bar);
  const panes = [pane('over', daily, xp, g3), pane('trend', three, heat), pane('badge', badges), pane('notes', lb, nb), pane('set', settings)];
  if (two) two.remove(); panes.forEach((p) => P.appendChild(p)); panes[0].classList.add('on');
  [three, g3].forEach((e) => e && (e.style.marginTop = '0'));
  bar.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', bar).forEach((x) => x.classList.toggle('on', x === b)); panes.forEach((p) => p.classList.toggle('on', p.id === 'pp-' + b.dataset.p)); };
}
})();
