(() => {
'use strict';
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(p, body) {
  const r = await fetch(p, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ---------------- settings ---------------- */
const S = { rate: 1.0, voice: '', lang: 'en-US', level: 'intermediate', remind: '', ...(() => { try { return JSON.parse(localStorage.getItem('ava.settings') || '{}'); } catch { return {}; } })() };
const saveS = () => { try { localStorage.setItem('ava.settings', JSON.stringify(S)); } catch {} };

/* ---------------- state ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;
let status = 'idle';                // idle | listening | thinking | speaking
let sess = null;                    // current conversation
let prog = null;                    // server progress
let aiOn = false;
let stopListen = null;              // function to stop active recognition
let ttsToken = 0;
const bus = {};
const emit = (e, d) => (bus[e] || []).forEach((f) => { try { f(d); } catch (err) { console.error(err); } });
const AVA = { id: 'ava', name: 'Ava', tagline: 'Friendly English coach', scenario: null, voice: { gender: 'f', pitch: 1, rate: 0.95, accent: 'US' }, look: { skin: '#f1bd9c', hair: '#4a2210', hairStyle: 'long', bg: ['#1d9d82', '#07322f'], outfit: '#f4f1ea', eyes: '#2a8f78', lips: '#b34a55', acc: [] }, persona: '' };
let char = (() => { try { return JSON.parse(localStorage.getItem('ava.char')) || AVA; } catch { return AVA; } })();
let presets = [AVA];
const cloud = { on: false };
let curAudio = null, curDone = null;
function cancelAll() { ttsToken++; synth?.cancel(); if (curAudio) { try { curAudio.pause(); } catch {} curAudio = null; } const d = curDone; curDone = null; d?.(); }
const vcache = new Map();
async function cloudSpeak(text, reveal) {
  const key = char.id + char.name + '|' + text;
  let url = vcache.get(key);
  if (!url) {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, character: { id: char.id, name: char.name, persona: char.persona, voice: char.voice, anime: !!char.anime } }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch {} throw new Error(m || 'voice error'); }
    url = URL.createObjectURL(await r.blob()); vcache.set(key, url);
    if (vcache.size > 40) { const k = vcache.keys().next().value; URL.revokeObjectURL(vcache.get(k)); vcache.delete(k); }
  }
  return new Promise((resolve, reject) => {
    const a = window.__ttsEl || new Audio(); a.pause(); a.src = url; a.playbackRate = Math.max(0.8, Math.min(1.25, S.rate / 0.95)); curAudio = a; curDone = resolve;
    a.ontimeupdate = () => { if (a.duration) reveal?.(Math.floor(text.length * (a.currentTime / a.duration) * 1.03)); };
    a.onended = () => { curAudio = null; curDone = null; resolve(); };
    a.onerror = () => { curAudio = null; curDone = null; reject(new Error('audio playback failed')); };
    a.play().catch((e) => { curAudio = null; curDone = null; reject(e); });
  });
}
function applyChar() {
  $('#botFace').innerHTML = window.makePortrait(char.look);
  $('#charName').textContent = char.name;
  emit('char', char);
  try { localStorage.setItem('ava.char', JSON.stringify(char)); } catch {}
}

function newSession(topic) {
  return { id: 's' + Date.now(), topic: topic || null, history: [], reports: [], turns: 0, activeSec: 0, words: 0, wpms: [], scores: [], counts: { grammar: 0, pron: 0, vocab: 0, natural: 0, fillers: 0 }, dirty: false, ended: false };
}
sess = newSession();

/* ---------------- avatar animation ---------------- */
setInterval(() => { const b = $('#avBot'); if (!b) return; b.style.setProperty('--mo', status === 'speaking' ? (0.15 + Math.random() * 0.85).toFixed(2) : '0.1'); }, 110);
let lvlStop = null;
async function startLevel() {
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaStreamSource(st); const an = ac.createAnalyser(); an.fftSize = 256; src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount); let on = true; const el = $('#avYou');
    (function tick() { if (!on) return; an.getByteFrequencyData(buf); let sum = 0; for (const v of buf) sum += v; const lv = Math.min(1, sum / buf.length / 70).toFixed(2); el.style.setProperty('--lvl', lv); document.documentElement.style.setProperty('--lvl', lv); requestAnimationFrame(tick); })();
    lvlStop = () => { on = false; el.style.setProperty('--lvl', 0); document.documentElement.style.setProperty('--lvl', 0); st.getTracks().forEach((t) => t.stop()); ac.close(); lvlStop = null; };
  } catch {}
}

/* ---------------- UI helpers ---------------- */
function setStatus(s) {
  const prevS = status; status = s; emit('status', { s, prev: prevS });
  const mic = $('#micBtn');
  mic.classList.toggle('listening', s === 'listening');
  mic.classList.toggle('busy', s === 'thinking');
  $('#avYou').classList.toggle('active', s === 'listening');
  $('#avBot').classList.toggle('active', s === 'speaking');
  $('#youState').textContent = s === 'listening' ? 'listening…' : 'ready';
  $('#botState').innerHTML = s === 'speaking' ? 'speaking…' : s === 'thinking' ? 'thinking…' : '&nbsp;';
  const h = { idle: sess.topic ? 'Tap the mic and answer ' + char.name + '.' : 'Tap the mic and say a topic — or tap “Topics”.', listening: 'Listening… tap the mic when you finish, or just pause for 2 seconds.', thinking: char.name + ' is thinking…', speaking: char.name + ' is speaking. Tap the mic to interrupt and answer.' };
  $('#hint').textContent = h[s];
}
function showSub(who, html, label) {
  const sub = $('#sub');
  sub.className = 'sub ' + who;
  $('#subWho').textContent = label || (who === 'you' ? 'You' : who === 'bot' ? 'Ava' : 'Subtitles');
  $('#subText').innerHTML = html;
}
function addMsg(who, text) {
  const d = document.createElement('div');
  d.className = 'm ' + who; d.textContent = text; $$('#transcript .m.typing').forEach((e) => e.remove());
  $('#transcript').appendChild(d);
  $('#transcript').scrollTop = 1e9;
}
function banner(msg) { const b = $('#banner'); if (!msg) { b.hidden = true; return; } b.hidden = false; b.textContent = msg; }
function toast(msg) { banner(msg); setTimeout(() => banner(''), 4000); }

/* ---------------- speech output (Ava) ---------------- */
let voices = [];
function loadVoices() {
  voices = (synth?.getVoices() || []).filter((v) => /^en/i.test(v.lang));
  const sel = $('#setVoice');
  sel.innerHTML = '<option value="">Auto (best English voice)</option>' + voices.map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');
  sel.value = S.voice;
}
const FEM = /female|samantha|zira|aria|jenny|susan|hazel|karen|moira|tessa|fiona|victoria|allison|serena|libby|sonia|natasha|catherine|heera|google us english|eva\b|emma|amy|joanna|salli|kendra|kimberly|ivy|nicole|olivia|sara|ava\b/i;
const MAL = /\bmale\b|david|mark|guy|daniel|alex\b|fred|george|james|richard|ryan|thomas|oliver|arthur|aaron|rishi|ravi|brian|matthew|joey|justin|kevin|russell|geraint|liam|eric|davis/i;
const gOf = (v) => (FEM.test(v.name) ? 'f' : MAL.test(v.name) ? 'm' : '?');
const ACC = { US: 'en-US', UK: 'en-GB', AU: 'en-AU', IN: 'en-IN' };
const NAT = (v) => (/natural|neural|online|enhanced|premium/i.test(v.name) ? 40 : 0) + (/google/i.test(v.name) ? 22 : 0) + (/samantha|karen|daniel|moira|serena|tessa|aria|jenny|guy|sonia|ryan|libby|allison|ava\b|susan|zoe/i.test(v.name) ? 14 : 0) + (v.localService ? 0 : 6) - (/espeak|compact|novelty|whisper|bad news|bells|boing|bubbles|cellos|jester|organ|trinoids|zarvox|albert|junior|kathy|ralph|superstar/i.test(v.name) ? 90 : 0);
const hashId = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/* per-mood delivery: [pitch x, rate x, volume, pause ms between sentences] */
const DELIVERY = { warm: [1.02, 1.0, 0.95, 160], cheerful: [1.08, 1.1, 1, 90], moody: [0.92, 0.95, 0.85, 300], sarcastic: [0.98, 1.02, 0.95, 260], grumpy: [0.84, 0.98, 1, 200], shy: [1.12, 0.97, 0.72, 320], dramatic: [1.0, 1.04, 1, 280], calm: [0.95, 0.94, 0.8, 340], strict: [0.94, 1.02, 1, 180], wise: [0.88, 0.94, 0.88, 330], playful: [1.08, 1.1, 1, 110], mysterious: [0.82, 0.93, 0.7, 420] };
const moodOf = (c) => { const m = c && c.mood; return DELIVERY[m] ? m : ({ bold: 'cheerful', nerdy: 'strict', energetic: 'cheerful', royal: 'dramatic' })[m] || 'warm'; };
function voiceFor(vp, seed) {
  const want = vp.gender === 'm' ? 'm' : 'f', lang = ACC[vp.accent] || 'en-US';
  const rank = (a) => a.slice().sort((x, y) => NAT(y) - NAT(x));
  const byL = voices.filter((v) => v.lang.replace('_', '-').startsWith(lang));
  let pool = rank(byL.filter((x) => gOf(x) === want)); if (!pool.length) pool = rank(voices.filter((x) => gOf(x) === want));
  if (!pool.length) pool = rank(byL.length ? byL : voices);
  const top = pool.filter((x) => NAT(x) >= NAT(pool[0]) - 14).slice(0, 3);
  const v = top.length ? top[hashId(seed) % top.length] : null;
  let pitch = vp.pitch || 1;
  if (v && gOf(v) !== '?' && gOf(v) !== want) pitch *= want === 'm' ? 0.75 : 1.25;
  return { v, pitch: Math.max(0.3, Math.min(2, pitch)) };
}
function pickVoice() {
  if (S.voice) { const v = voices.find((x) => x.voiceURI === S.voice); if (v) return v; }
  const pref = [/Google US English/i, /Samantha/i, /Microsoft (Aria|Jenny|Zira)/i, /Natural/i, /Google UK English Female/i];
  for (const p of pref) { const v = voices.find((x) => p.test(x.name)); if (v) return v; }
  return voices.find((v) => v.lang === S.lang) || voices[0] || null;
}
function speakRaw(text, rate, onWord, neutral) {
  return new Promise((resolve) => {
    if (!synth) return resolve();
    const my = ++ttsToken;
    synth.cancel();
    const chunks = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
    let base = 0, i = 0;
    const next = () => {
      if (my !== ttsToken || i >= chunks.length) return resolve();
      const chunk = chunks[i++]; const off = base; base += chunk.length;
      const u = new SpeechSynthesisUtterance(chunk);
      let v, pitch = 1, vol = 1, pause = 120, r = rate * 1.1;
      if (neutral || char.id === 'ava') { v = pickVoice(); } else {
        const f = voiceFor(char.voice, char.id); v = f.v; pitch = f.pitch;
        const [pm, rm, vm, pa] = DELIVERY[moodOf(char)]; pitch *= pm; vol = vm; pause = pa; r = rate * 1.1 * rm * Math.max(1, (char.voice.rate || 1) / 0.95);
      }
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      const jit = 1 + (Math.random() - 0.5) * 0.06;
      if (/\?\s*$/.test(chunk)) pitch *= 1.06; if (/!\s*$/.test(chunk)) r *= 1.04;
      u.rate = Math.max(0.9, Math.min(1.5, r * jit)); u.pitch = Math.max(0.3, Math.min(2, pitch * jit)); u.volume = vol;
      let gotBoundary = false;
      u.onboundary = (e) => { if (e.name && e.name !== 'word') return; gotBoundary = true; onWord?.(off + e.charIndex); };
      u.onstart = () => { onWord?.(off); setTimeout(() => { if (!gotBoundary && my === ttsToken) { /* fallback: timed reveal */ let k = 0; const ws = chunk.split(/\s+/); const per = 60000 / (155 * rate); const iv = setInterval(() => { if (my !== ttsToken || gotBoundary || k >= ws.length) return clearInterval(iv); onWord?.(off + chunk.indexOf(ws[k], k ? 0 : 0)); k++; }, per); } }, 700); };
      u.onend = () => setTimeout(next, i < chunks.length && !neutral ? pause : 0); u.onerror = next;
      try { synth.speak(u); } catch { next(); }
    };
    next();
  });
}
async function botSay(text) {
  setStatus('speaking');
  const words = text.split(/(\s+)/);
  // build word spans, with char offsets
  let pos = 0; const spans = words.map((w) => { const s = { w, start: pos, isWord: /\S/.test(w) }; pos += w.length; return s; });
  const html = spans.map((s, i) => (s.isWord ? `<span class="w" data-i="${i}">${esc(s.w)}</span>` : esc(s.w))).join('');
  showSub('bot', html, char.name);
  const els = $$('#subText .w');
  addMsg('bot', text);
  sess.history.push({ role: 'bot', text });
  const reveal = (ch) => { let last = -1; spans.forEach((s, i) => { if (s.isWord && s.start <= ch) last = i; }); els.forEach((el) => { el.classList.toggle('on', +el.dataset.i <= last); }); };
  if (window.__typeMode && !window.__readAloud) { els.forEach((e) => e.classList.add('on')); if (status === 'speaking') setStatus('idle'); emit('botDone'); return; }
  let spoken = false;
  if (cloud.on) { try { await cloudSpeak(text, reveal); spoken = true; } catch (e) { banner('Voice service problem — using browser voice. ' + String(e.message).slice(0, 200)); setTimeout(() => banner(''), 10000); console.warn('[voice]', e.message); } }
  if (!spoken) { if (!synth) await sleep(Math.min(8000, text.length * 55)); else await speakRaw(text, S.rate, reveal); }
  els.forEach((e) => e.classList.add('on'));
  if (status === 'speaking') setStatus('idle');
  emit('botDone');
}

/* ---------------- speech input (you) ---------------- */
function listen({ onInterim, onReady, silenceMs = 2200, lang } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('unsupported'));
    const r = new SR();
    r.lang = lang || S.lang; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
    let finals = '', interim = '', confs = [], t0 = null, tLast = null, timer = null, failed = null;
    const stop = () => { clearTimeout(timer); try { r.stop(); } catch {} };
    stopListen = stop;
    r.onresult = (e) => {
      const now = Date.now(); if (t0 == null) t0 = now; tLast = now; interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) { finals += ' ' + res[0].transcript; if (res[0].confidence) confs.push(res[0].confidence); }
        else interim += res[0].transcript;
      }
      onInterim?.(finals.trim(), interim.trim());
      clearTimeout(timer); timer = setTimeout(stop, silenceMs);
    };
    let readied = false; const ready = () => { if (readied) return; readied = true; clearTimeout(timer); timer = setTimeout(stop, 9000); onReady?.(); emit('micReady'); };
    r.onaudiostart = ready; r.onspeechstart = ready; setTimeout(() => { if (!readied && !failed) ready(); }, 1500);
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') failed = 'denied'; else if (e.error === 'audio-capture') failed = 'nomic'; else if (e.error === 'network') failed = 'network'; };
    r.onend = () => {
      clearTimeout(timer); stopListen = null; lvlStop?.();
      if (failed) return reject(new Error(failed));
      const text = (finals + ' ' + interim).trim();
      const dur = t0 ? Math.max(1, (tLast - t0) / 1000 + 0.6) : 0;
      resolve({ text, confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null, durationSec: dur });
    };
    // no speech at all within 9s -> stop
    timer = setTimeout(stop, 9000);
    try { r.start(); startLevel(); } catch (e) { reject(e); }
  });
}
function micError(e) {
  const m = { unsupported: 'Speech recognition isn\'t supported in this browser. Use Chrome or Edge — or type below.', denied: 'Microphone blocked. Click the 🔒 icon in the address bar → allow microphone, then try again.', nomic: 'No microphone found.', network: 'Speech recognition needs an internet connection (Chrome sends audio to Google).' };
  toast(m[e.message] || 'Mic problem: ' + e.message);
}

/* ---------------- conversation flow ---------------- */
function cleanTopic(t) {
  return t.replace(/^(let'?s|can we|could we|i want to|i'd like to|i would like to|please)?\s*(talk|speak|chat|discuss)?\s*(about|on)?\s*/i, '').replace(/[.?!]+$/, '').trim() || t;
}
const SURPRISE = /(surprise|random|you (choose|pick|decide|start|ask)|any ?thing|whatever|anything is fine|your choice)/i;

const charPayload = () => (char.id === 'ava' ? null : { id: char.id, name: char.name, persona: char.persona, scenario: char.scenario, opener: char.opener, follow: char.follow, mood: char.mood, expert: char.expert, field: char.field, words: char.words });
/* Spoken/typed requests: "talk like a pirate", "pretend you are a doctor", "be my interviewer" */
function detectCharacter(t) {
  t = t.trim().replace(/[.!?]+$/, '');
  const pats = [
    /\b(?:act|talk|speak|behave|pretend|respond|roleplay|role-play|play)\b[^,.]*?\b(?:like|as|to be|you(?:'re| are))\s+(?:a |an |the |my )?(.{3,60})$/i,
    /^(?:please |can you |could you )?(?:be|become)\s+(?:a |an |the |my )?(.{3,60})$/i,
    /^you(?:'re| are)\s+(?:now )?(?:a |an |the |my )?(.{3,60})$/i,
    /^i want to (?:talk|speak|chat) (?:to|with)\s+(?:a |an |the |my )?(.{3,60})$/i,
  ];
  for (const p of pats) { const m = t.match(p); if (m) return m[1].replace(/\b(please|for me|now)\b/gi, '').trim(); }
  return null;
}
async function setCharacterFromText(desc) {
  setStatus('thinking'); showSub('bot', '<span class="interim">Creating a character…</span>', 'Characters');
  try {
    const r = await api('/api/character', { description: desc });
    if (r.error) { setStatus('idle'); showSub('', esc(r.message), 'Characters'); toast(r.message); return false; }
    if (r.note) toast(r.note);
    await chooseCharacter(r.character); return true;
  } catch (e) { setStatus('idle'); toast('Server error: ' + e.message); return false; }
}
async function chooseCharacter(c) {
  cancelAll(); stopListen?.();
  char = c; applyChar();
  $('#modal').hidden = true;
  await startConversation(c.id === 'ava' ? null : c.scenario || 'Chat', false, c.id === 'ava');
}
async function openCharacters() {
  const modal = $('#modal'); modal.hidden = false;
  const cats = ['All', 'Experts', ...[...new Set(presets.map((c) => c.cat).filter((x) => x && x !== 'Experts'))]];
  let cat = 'All', q = '';
  const card = (c, i) => `<button class="chcard ${c.id === char.id ? 'on' : ''}" data-id="${esc(c.id)}" style="--i:${Math.min(i, 14)};--g:${esc(c.look.hair)}"><div class="chface">${window.makePortrait(c.look)}</div><b>${esc(c.name)}</b><small>${esc(c.tagline)}</small>${c.mood ? `<em class="mood">${esc(c.mood)}</em>` : ''}</button>`;
  $('#modalBody').innerHTML = `<h2>Choose who you talk to</h2>
    <p class="muted">${presets.length} characters. Each one has its own voice, personality and way of replying — the English feedback stays the same.</p>
    <input id="chSearch" class="chsearch" type="search" placeholder="Search — movies, comedy, music, cricket, moody, anime…" autocomplete="off">
    <div class="chcats" id="chCats">${cats.map((c) => `<button data-c="${esc(c)}" class="${c === 'All' ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
    <div class="chgrid" id="chGrid"></div>
    <h3 style="margin-top:14px">Or ask for anyone</h3>
    <form id="chForm" class="typed"><input id="chInput" placeholder="e.g. a grumpy chef, a football commentator…" maxlength="150"><button class="primary">Create</button></form>
    <small class="muted">Custom characters need an AI key. You can also say “talk like a pirate” at any time.</small>
    <div class="row"><button class="ghost" id="chClose">Close</button></div>`;
  const draw = () => {
    const t = q.trim().toLowerCase();
    let list = presets.filter((c) => (cat === 'All' || c.cat === cat) && (!t || (c.name + ' ' + c.tagline + ' ' + (c.mood || '') + ' ' + (c.cat || '') + ' ' + (c.persona || '')).toLowerCase().includes(t)));
    if (char.custom && (!t || char.name.toLowerCase().includes(t)) && (cat === 'All')) list = [char, ...list];
    $('#chGrid').innerHTML = list.length ? list.map(card).join('') : '<p class="muted">No match — try another word, or create one below.</p>';
    $$('#chGrid .chcard').forEach((b) => (b.onclick = () => chooseCharacter(b.dataset.id === char.id && char.custom ? char : presets.find((p) => p.id === b.dataset.id) || char)));
  };
  draw();
  $('#chSearch').oninput = (e) => { q = e.target.value; draw(); };
  $('#chCats').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; $$('#chCats button').forEach((x) => x.classList.toggle('on', x === b)); draw(); };
  $('#chClose').onclick = () => (modal.hidden = true);
  $('#chForm').onsubmit = (e) => { e.preventDefault(); const v = $('#chInput').value.trim(); if (!v) return; modal.hidden = true; setCharacterFromText(v); };
}
/* First thing the learner says/types with no topic chosen: a greeting or sentence just starts a free chat. */
const TOPIC_REQ = /^(?:let'?s|can we|could we|i want to|i'd like to|i would like to|please)?\s*(?:talk|speak|chat|discuss)\s+(?:about|on)\s+(.+)/i;
async function firstMessage(text, meta) {
  { const want = detectCharacter(text); if (want) { showSub('you', esc(text), 'You'); addMsg('you', text); return setCharacterFromText(want); } }
  if (SURPRISE.test(text) && window.VocaModes) { showSub('you', esc(text), 'You'); addMsg('you', text); setStatus('idle'); return window.VocaModes.pick(); }
  const m = TOPIC_REQ.exec(text.trim());
  if (m) { addMsg('you', text); return startConversation(m[1].replace(/[.?!]+$/, ''), false); }
  sess = newSession('Free chat'); sess.topic = 'Free chat';
  $('#topicLabel').textContent = 'Free chat'; $('#endBtn').disabled = false; $('#transcript').innerHTML = ''; $('#feed').innerHTML = '<div class="empty">Your feedback will appear here after each answer.</div>';
  return handleUserText(text, meta || {});
}
async function startConversation(topic, pick, isAva) {
  sess = newSession(topic);
  if (isAva && !topic && !pick) { $('#transcript').innerHTML = ''; $('#topicLabel').textContent = 'Not chosen yet'; $('#endBtn').disabled = true; showSub('', 'Tap the mic and <b>say a topic</b> — or tap <b>Topics</b> for 4 fresh ideas.', 'Subtitles'); setStatus('idle'); return; }
  $('#transcript').innerHTML = ''; $('#feed').innerHTML = '<div class="empty">Your feedback will appear here after each answer.</div>';
  $('#endBtn').disabled = false;
  setStatus('thinking');
  showSub('bot', '<span class="dots"><i></i><i></i><i></i></span>', char.name);
  try {
    const r = await api('/api/turn', { start: true, topic, pick, level: S.level, character: charPayload() });
    sess.topic = r.topic; $('#topicLabel').textContent = r.topic; setAi(r.source === 'ai');
    await botSay(r.reply);
  } catch (e) { setStatus('idle'); toast('Server error: ' + e.message); }
}

async function onMic() {
  if (status === 'listening') { stopListen?.(); return; }
  if (status === 'thinking') return;
  if (status === 'speaking') { cancelAll(); setStatus('idle'); }
  await sleep(350);
  if (!SR) return micError(new Error('unsupported'));
  setStatus('listening');
  const choosingTopic = !sess.topic;
  showSub('you', '<span class="interim">Getting the mic ready…</span>', 'You');
  const readyMsg = () => showSub('you', '<span class="interim">' + (choosingTopic ? 'Say a topic now…' : 'Go ahead, speak now…') + '</span>', 'You');
  let res;
  try { res = await listen({ onReady: readyMsg, onInterim: (f, i) => showSub('you', `${esc(f)} <span class="interim">${esc(i)}</span>`, 'You') }); }
  catch (e) { setStatus('idle'); return micError(e); }
  if (!res.text) { emit('empty'); setStatus('idle'); showSub('', 'I didn\'t catch anything. Tap the mic and try again.', 'Subtitles'); return; }
  if (choosingTopic) {
    showSub('you', esc(res.text), 'You'); addMsg('you', res.text);
    { const want = detectCharacter(res.text); if (want) return setCharacterFromText(want); }
    if (SURPRISE.test(res.text) && window.VocaModes) { setStatus('idle'); return window.VocaModes.pick(); }
    return firstMessage(res.text, res);
  }
  return handleUserText(res.text, res);
}

let turnBusy = false, turnId = 0; const outbox = [];
function drainOutbox() { if (turnBusy || !outbox.length) return; const n = outbox.shift(); $$('#transcript .m.pending').shift()?.remove(); if (!sess.topic) firstMessage(n, {}); else handleUserText(n, {}); }
async function handleUserText(text, meta = {}) {
  const my = ++turnId; turnBusy = true;
  try { await handleUserTextInner(text, meta, my); } catch (e) { console.error(e); toast('Something went wrong — please try again.'); if (status === 'thinking') setStatus('idle'); }
  finally { if (turnId === my) { turnBusy = false; if (status === 'thinking') setStatus('idle'); } setTimeout(drainOutbox, 120); }
}
async function handleUserTextInner(text, meta = {}, my) {
  { const want = detectCharacter(text); if (want && !/\b(you|i) (am|was)\b/i.test(want)) { showSub('you', esc(text), 'You'); addMsg('you', text); return setCharacterFromText(want); } }
  setStatus('thinking');
  showSub('you', esc(text), 'You');
  addMsg('you', text);
  sess.history.push({ role: 'user', text });
  let r;
  try {
    r = await api('/api/turn', { text, topic: sess.topic, history: sess.history.slice(0, -1), level: S.level, character: charPayload(), durationSec: meta.durationSec || 0, confidence: meta.confidence ?? null });
  } catch (e) { setStatus('idle'); return toast('Server error: ' + e.message); }
  setAi(r.source === 'ai');
  if (r.aiError) toast('AI unavailable (' + r.aiError.slice(0, 80) + ') — using offline rules.');
  const rep = await enhance(r.report);
  // highlight mistakes in the subtitle
  showSub('you', highlight(text, rep), 'You');
  recordTurn(rep);
  renderTurn(rep);
  await sleep(window.__typeMode ? 450 : 1400);
  if (turnId === my) turnBusy = false;
  await botSay(r.reply);
}

function recordTurn(rep) {
  sess.turns++; sess.reports.push(rep); sess.words += rep.words || 0;
  if (rep.fluency?.wpm) sess.wpms.push(rep.fluency.wpm);
  if (rep.scores?.overall != null) sess.scores.push(rep.scores.overall);
  const c = sess.counts;
  c.grammar += rep.grammar.length; c.pron += rep.pronunciation.length; c.vocab += rep.vocab.length; c.natural += rep.natural.length;
  c.fillers += (rep.fluency?.fillers || []).reduce((a, f) => a + f.count, 0);
  sess.dirty = true;
  const items = [
    ...rep.grammar.map((g) => ({ type: 'grammar', wrong: g.wrong, right: g.right, why: g.why })),
    ...rep.pronunciation.map((p) => ({ type: 'pron', word: p.word, say: p.say, tip: p.tip })),
    ...rep.natural.map((n) => ({ type: 'natural', wrong: n.said, right: n.better, why: n.why })),
  ];
  if (items.length) api('/api/notebook', { items, date: today() }).catch(() => {});
  saveSession();
  emit('turn', { rep, text: rep.text });
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  $('#liveStats').textContent = `${sess.turns} turns · ${sess.words} words${sess.wpms.length ? ' · ' + avg(sess.wpms) + ' wpm' : ''}`;
}

function wordDiff(a, b) {
  const A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean), norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = norm(A[i]) === norm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const tail = (w) => (w.match(/[.,?!;:]+$/) || [''])[0];
  const same = (x, y) => { const core = y.slice(0, y.length - tail(y).length), t = tail(y), o = tail(x); return esc(core) + (t && t !== o ? '<ins class="p">' + esc(t) + '</ins>' : esc(t)); };
  const ha = [], hb = []; let i = 0, j = 0;
  while (i < n && j < m) { if (norm(A[i]) === norm(B[j])) { ha.push(esc(A[i])); hb.push(same(A[i], B[j])); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { ha.push('<mark>' + esc(A[i]) + '</mark>'); i++; } else { hb.push('<ins>' + esc(B[j]) + '</ins>'); j++; } }
  for (; i < n; i++) ha.push('<mark>' + esc(A[i]) + '</mark>'); for (; j < m; j++) hb.push('<ins>' + esc(B[j]) + '</ins>');
  return { said: ha.join(' '), fixed: hb.join(' ') };
}
window.VocaDiff = wordDiff;

/* ---- punctuation: where to pause (comma) and where to stop (full stop) ---- */
function punctuate(text) {
  let t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return t;
  const CONJ = /^(and|but|that|because|if|when|so|as|while|then|or|which|who|where|than|whether|until|after|before|since|though|although|to|of|the|a|an|my|your|is|was|are|were)$/i;
  const SUBJ = /^(i|we|they|he|she)$/i, SUBJ2 = /^(i|we|they|he|she|it|there)$/i, INTRO = /^(yesterday|today|tomorrow|however|actually|honestly|finally|firstly|secondly|first|second|also|well|anyway|basically|generally|unfortunately|luckily|personally|meanwhile|afterwards|recently|sometimes|usually)$/i;
  const QW = /^(what|where|why|how|when|who|whom|whose|which|do|does|did|can|could|will|would|should|is|are|am|was|were|have|has|shall)$/i;
  let w = t.split(' ');
  if (!/[.,?!;]/.test(t.replace(/\.\.\./g, ''))) {
    const out = []; let n = 0;
    for (let k = 0; k < w.length; k++) {
      if (k > 0 && n >= 5 && SUBJ2.test(w[k]) && !CONJ.test(w[k - 1]) && !/^(then|think|know|say|said|hope|see|saw|knew|believe)$/i.test(w[k - 1])) { out[out.length - 1] += '.'; n = 0; }
      out.push(w[k]); n++;
    }
    const sents = out.join(' ').replace(/([.?!]) /g, '$1\u0001').split('\u0001').map((s) => {
      const x = s.split(' ');
      if (INTRO.test(x[0].replace(/[.,]$/, '')) && x.length > 2) x[0] += ',';
      else if (/^(if|when|although|while|after|before|once)$/i.test(x[0])) { for (let k = 3; k < x.length; k++) if (SUBJ.test(x[k]) && !CONJ.test(x[k - 1])) { x[k - 1] += ','; break; } }
      for (let k = 3; k < x.length; k++) {
        const wd = x[k].toLowerCase();
        if (!/[,.]$/.test(x[k - 1]) && (wd === 'but' || wd === 'which' || (wd === 'and' && /^then$/i.test(x[k + 1] || '')) || (wd === 'so' && SUBJ.test(x[k + 1] || '')) || (wd === 'then' && SUBJ.test(x[k + 1] || '')))) x[k - 1] += ',';
      }
      let last = x[x.length - 1];
      if (!/[.?!]$/.test(last)) x[x.length - 1] = last.replace(/,$/, '') + (QW.test(x[0]) && !/^(if|when)$/i.test(x[0]) ? '?' : '.');
      return x.join(' ');
    });
    t = sents.join(' ');
  } else if (!/[.?!]$/.test(t)) t += '.';
  return t.replace(/\bi\b/g, 'I').replace(/(^|[.?!] )([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

/* ---- Harper grammar engine (open-source, runs in your browser as WebAssembly; loaded on demand) ---- */
let harper = null, harperTried = false;
async function loadHarper() {
  if (harper || harperTried) return harper; harperTried = true;
  try {
    if (localStorage.getItem('voca.harper') === 'off') return null;
  } catch {}
  try {
    const base = 'https://unpkg.com/harper.js@2.4.0/dist/';
    const [{ binaryInlined }, H] = await Promise.all([import(base + 'binaryInlined.js'), import(base + 'index.js')]);
    const lin = new H.LocalLinter({ binary: binaryInlined }); await lin.setup(); harper = lin; window.__harper = 'on';
  } catch (e) { window.__harper = 'failed'; console.warn('[harper] not available — using built-in rules', e && e.message); }
  return harper;
}
async function harperFix(text) {
  if (!harper) return text;
  let t = text;
  try {
    for (let k = 0; k < 8; k++) {
      const lints = await harper.lint(t);
      const L = lints.find((l) => { const s = l.suggestions(); return s && s.length; });
      if (!L) break;
      const nx = await harper.applySuggestion(t, L, L.suggestions()[0]);
      if (!nx || nx === t) break; t = nx;
    }
  } catch (e) { console.warn('[harper]', e && e.message); return text; }
  return t;
}
async function enhance(rep) {
  try { Learner.filter(rep); Learner.apply(rep); } catch {}
  try {
    let base = rep.corrected || rep.text;
    if (harper) base = await Promise.race([harperFix(base), sleep(2500).then(() => base)]);
    let fixed = punctuate(base);
    try { fixed = await Online.improve(fixed, rep, Learner); } catch {}
    const plain = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
    rep.corrected = fixed && fixed !== rep.text ? fixed : null;
    rep.wordsChanged = plain(fixed) !== plain(rep.text);
  } catch {}
  try { if (!rep._obs) { rep._obs = 1; Learner.observe(rep); } } catch {}
  return rep;
}
setTimeout(loadHarper, 1200);
function highlight(text, rep) {
  if (rep.corrected) return wordDiff(text, rep.corrected).said;
  let h = esc(text);
  const bad = [...rep.grammar.map((g) => g.wrong), ...rep.natural.map((n) => n.said), ...rep.pronunciation.map((p) => p.word)];
  for (const b of bad) {
    const e = esc(b).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    h = h.replace(new RegExp(`(^|[^>\\w])(${e})(?![\\w<])`, 'i'), '$1<mark>$2</mark>');
  }
  return h;
}

/* ---------------- coach notes rendering ---------------- */
const cls = (n) => (n == null ? '' : n >= 80 ? 'hi' : n >= 60 ? 'mid' : 'lo');
function renderTurn(rep) {
  const feed = $('#feed');
  feed.querySelector('.empty')?.remove();
  const el = document.createElement('div'); el.className = 'turn';
  const sc = rep.scores || {}, fl = rep.fluency || {};
  const wps = fl.wpm ? (fl.wpm / 60).toFixed(1) : null;
  const nfix = rep.corrected ? (wordDiff(rep.text, rep.corrected).said.match(/<mark/g) || []).length : 0;
  const fv = sc.fluency != null ? sc.fluency : 0;
  let html = `<div class="flrow"><span class="ring ${cls(sc.fluency)}" style="--p:${fv}"><i>${sc.fluency != null ? sc.fluency + '%' : '–'}</i></span><span class="fllab">fluency</span>${wps ? `<span class="flwps"><b>${wps}</b> words / sec</span>` : ''}<span class="fxb ${nfix ? 'nb' : 'ng'}">${nfix ? '✏️ ' + nfix + ' to fix' : '✅ clean'}</span></div>`;
  html += `<div class="said"><b class="lab">🗣 You said</b>${highlight(rep.text, rep)}</div>`;
  if (rep.corrected) html += `<div class="flow">⬇</div>`;
  if (rep.corrected) html += `<div class="fixed"><b>${rep.wordsChanged ? '✨ Say it like this' : '✨ Same words — with the pauses'}</b>${wordDiff(rep.text, rep.corrected).fixed} <button class="ghost say" data-say="${esc(rep.corrected)}" title="Hear it">🔊</button> <button class="ghost say" data-rep="${esc(rep.corrected)}">🎤 Repeat it</button><div class="repres"></div><small class="legend"><span class="r">red</span> = remove / change · <span class="g">green</span> = add · green <em class="pp">,</em> = short pause · green <em class="pp">.</em> = full stop</small></div>`;
  else html += '<div class="allgood">✅ Sounds right — nothing to fix.</div>';
  const up = (rep.vocab || []).slice(0, 3);
  if (up.length) html += `<div class="vocab"><b class="lab">💎 Word upgrades</b>${up.map((v) => `<span class="vchip" data-vw="${esc((v.better || [])[0] || '')}"><s>${esc(v.used)}</s> → <b>${esc((v.better || [])[0] || '')}</b></span>`).join('')}</div>`;
  if (rep.learned) html += `<div class="learned">🧠 Applied ${rep.learned} correction${rep.learned > 1 ? 's' : ''} you taught me.</div>`;
  if (rep.corrected || (rep.grammar || []).length) html += `<div class="fb"><span>Was this right?</span><button class="ghost" data-fb="up">👍 Yes</button><button class="ghost" data-fb="down">👎 Not a mistake</button><button class="ghost" data-fb="edit">✏️ Better fix</button></div>`;
  el.innerHTML = html; el._rep = rep;
  feed.prepend(el);
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('button[data-fb]'); if (!t) return;
  const el = t.closest('.turn'), rep = el && el._rep; if (!rep) return;
  const fb = t.dataset.fb, row = t.closest('.fb');
  if (fb === 'up') { Learner.confirm(rep); row.innerHTML = '<span>👍 Thanks — I trust this fix more now.</span>'; }
  else if (fb === 'down') {
    Learner.reject(rep); Learner.filter(rep);
    const plain = (s) => (s || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
    if (!rep.grammar.length && plain(rep.corrected) !== plain(rep.text)) rep.corrected = punctuate(rep.text);
    rep.wordsChanged = plain(rep.corrected) !== plain(rep.text); rep.learned = 0;
    el.remove(); renderTurn(rep); toast('Got it — I won’t flag that again.');
  } else if (fb === 'edit') {
    const v = prompt('Type the correct sentence:', rep.corrected || rep.text);
    if (v && v.trim()) {
      Learner.teach(rep.text, v.trim());
      rep.corrected = v.trim(); rep.wordsChanged = true; el.remove(); renderTurn(rep); toast('Learned — I’ll fix this next time.');
    }
  }
  if (typeof renderLearn === 'function') renderLearn();
});
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.hear) { await speakRaw(t.dataset.hear, 0.8, null, true); }
  else if (t.dataset.say) { await speakRaw(t.dataset.say, S.rate, null, true); }
  else if (t.dataset.save) { emit('save', t.dataset.save); t.classList.add('saved'); t.textContent = '✓ ' + t.dataset.save; }
  else if (t.dataset.rep) {
    const out = t.parentElement.querySelector('.repres'); out.textContent = 'Listening… say the corrected sentence'; out.style.color = 'var(--muted)';
    try {
      const r = await listen({ silenceMs: 1800, lang: S.lang });
      const d = diffWords(t.dataset.rep, r.text); const pct = Math.round((d.ok.filter(Boolean).length / d.a.length) * 100);
      const orig = t.dataset.rep.split(/\s+/);
      out.innerHTML = (pct === 100 ? '✅ Perfect! ' : pct >= 70 ? '👍 Close — ' : '🔁 Try again — ') + pct + '%<br>' + orig.map((w, i) => `<span style="color:var(--${d.ok[i] ? 'bot' : 'bad'})">${esc(w)}</span>`).join(' ');
      drillSec += Math.max(2, r.durationSec); saveDrill(); if (pct === 100) emit('drill', { pct });
    } catch (er) { out.textContent = ''; micError(er); }
  }
  else if (t.dataset.try) {
    const out = t.parentElement.querySelector('.res'); out.textContent = 'listening…';
    try {
      const r = await listen({ silenceMs: 1400, lang: S.lang });
      const ok = norm(r.text).includes(norm(t.dataset.try));
      out.textContent = ok ? '✅ Clear!' : `❌ I heard “${r.text || '…nothing'}”`; out.style.color = ok ? 'var(--bot)' : 'var(--bad)';
      drillSec += Math.max(2, r.durationSec); saveDrill();
    } catch (er) { out.textContent = ''; micError(er); }
  }
});
const norm = (s) => String(s).toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------------- progress & streaks ---------------- */
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
function saveSession() {
  if (!sess.turns) return;
  api('/api/session', { id: sess.id, kind: 'chat', date: today(), topic: sess.topic, activeSec: sess.activeSec, words: sess.words, turns: sess.turns, wpm: avg(sess.wpms), avgScore: avg(sess.scores), counts: sess.counts })
    .then(setProg).catch(() => {});
}
let drillSec = 0;
const drillId = 'd' + today();
function saveDrill() { if (drillSec) api('/api/session', { id: drillId, kind: 'drill', date: today(), activeSec: Math.round(drillSec), words: 0, turns: 0 }).then(setProg).catch(() => {}); }
async function loadProgress() { try { setProg(await api('/api/progress?today=' + today())); } catch {} }
function setProg(p) { prog = p; emit('progress', p); renderHud(); renderProgress(); }

function renderHud() {
  const goal = prog.goalMin * 60;
  const liveSec = prog.todaySec;
  $('#hudStreakN').textContent = prog.streak + (prog.todaySec >= goal ? '' : '');
  $('#hudStreak').className = 'streak ' + (prog.todaySec >= goal || prog.streak ? 'alive' : 'cold');
  const frac = Math.min(1, liveSec / goal);
  $('#ringFg').style.strokeDashoffset = 94.2 * (1 - frac);
  $('#ringTxt').textContent = Math.floor(liveSec / 60) + 'm';
  $('#hudRing').title = `Today: ${Math.floor(liveSec / 60)} / ${prog.goalMin} min`;
  const left = Math.max(0, Math.ceil((goal - liveSec) / 60));
}

function renderLearn() {
  const box = $('#learnbox'); if (!box) return;
  const st = Learner.stats(), tops = Learner.topTopics(4), max = Math.max(1, ...tops.map((x) => x.n));
  const arrow = { down: '↘ improving', up: '↗ more lately', flat: '→ steady', new: 'new' };
  box.innerHTML = `<h3>🧠 What Voca has learned about you</h3>
  ${tops.length ? tops.map((x) => `<div class="lrow"><span class="lt">${esc(x.topic)}</span><span class="lbar"><i style="width:${Math.round((x.n / max) * 100)}%"></i></span><span class="lc">${x.n}× <small>${arrow[x.trend]}</small></span></div>`).join('') : '<small class="muted">Speak a few turns and I’ll show which kinds of mistakes you repeat.</small>'}
  <div class="lstats"><span><b>${st.turns}</b> turns studied</span><span><b>${st.learned}</b> habits tracked</span><span><b>${st.taught}</b> taught by you</span><span><b>${st.due}</b> due to practise</span></div>
  <div class="row"><button class="primary" id="learnDrill">🧠 Practise weak spots</button><button class="ghost" id="learnReset">Reset learning</button></div>
  <small class="muted">Learning stays on this device. Use 👍 / 👎 / ✏️ under any correction to teach me.</small>`;
  $('#learnDrill').onclick = () => { switchTab('drills'); buildDrill('weak'); };
  $('#learnReset').onclick = () => { if (confirm('Forget everything Voca learned about your mistakes?')) { Learner.reset(); renderLearn(); } };
}
function renderProgress() {
  try { renderLearn(); } catch {}
  $('#pStreak').textContent = prog.streak; $('#pBest').textContent = prog.best; $('#pFreeze').textContent = prog.freezes;
  $('#pMin').textContent = prog.totals.minutes; $('#pSess').textContent = prog.totals.sessions; $('#pWords').textContent = prog.totals.words;
  $('#heat').innerHTML = prog.days.map((d, i) => `<i class="${d.frozen ? 'frozen' : d.met ? 'met' : d.sec > 0 ? 'part' : ''} ${i === prog.days.length - 1 ? 'today' : ''}" title="${d.date}: ${Math.round(d.sec / 60)} min"></i>`).join('');
  const nb = prog.notebook;
  $('#notebook').innerHTML = nb.length ? nb.slice(0, 25).map((n) => `<div><span class="tag ${n.type === 'pron' ? 'pron' : n.type === 'natural' ? 'natural' : 'grammar'}">${n.type === 'pron' ? 'say' : n.type}</span><span>${n.type === 'pron' ? `<b>${esc(n.wrong)}</b> — ${esc(n.right)}` : `<s>${esc(n.wrong)}</s> → <b>${esc(n.right)}</b>`}</span><span class="c">${n.count}×</span></div>`).join('') : '<small class="muted">Nothing yet — start speaking and your repeated mistakes collect here.</small>';
  $('#setGoal').value = prog.goalMin;
}

/* ---------------- end of session report ---------------- */
async function endSession() {
  if (!sess.turns) { sess = newSession(); $('#topicLabel').textContent = 'Not chosen yet'; $('#endBtn').disabled = true; showSub('', 'Tap the mic and <b>say a topic</b> — or tap <b>Topics</b> for 4 fresh ideas.', 'Subtitles'); setStatus('idle'); return; }
  cancelAll(); stopListen?.();
  sess.ended = true; saveSession();
  const modal = $('#modal'); modal.hidden = false;
  $('#modalBody').innerHTML = '<h2>Preparing your report…</h2>';
  let sum; try { sum = await api('/api/summary', { reports: sess.reports }); } catch { sum = { priorities: [], homework: [] }; }
  const sc = avg(sess.scores);
  const cnt = sess.counts;
  $('#modalBody').innerHTML = `
    <h2>Session report</h2><p class="muted">${esc(sess.topic || 'Free talk')} · ${Math.max(1, Math.round(sess.activeSec / 60))} min · ${sess.turns} answers</p>
    <div class="big-scores"><div><b>${sc ?? '–'}</b>score</div><div><b>${avg(sess.wpms) ?? '–'}</b>words/min</div><div><b>${sess.words}</b>words</div></div>
    <div class="big-scores"><div><b>${cnt.grammar}</b>grammar</div><div><b>${cnt.pron}</b>pronunciation</div><div><b>${cnt.vocab + cnt.natural}</b>vocab/natural</div><div><b>${cnt.fillers}</b>fillers</div></div>
    <p>${esc(sum.summary || '')}</p>
    <h3>Focus next</h3><ul>${(sum.priorities || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <h3>Homework</h3><ul>${(sum.homework || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <div class="row"><button class="primary" id="mNew">Start a new topic</button><button class="ghost" id="mDrill">Drill my mistakes</button><button class="ghost" id="mCopy">Copy report</button><button class="ghost" id="mClose">Close</button></div>`;
  $('#mCopy').onclick = () => { const txt = `Ava session report — ${sess.topic || 'Free talk'}\nScore: ${sc ?? '-'} | WPM: ${avg(sess.wpms) ?? '-'} | Words: ${sess.words}\n${sum.summary || ''}\nFocus next:\n${(sum.priorities || []).map((p) => '- ' + p).join('\n')}\nHomework:\n${(sum.homework || []).map((p) => '- ' + p).join('\n')}`; navigator.clipboard?.writeText(txt).then(() => toast('Report copied ✓')); };
  const reset = () => { modal.hidden = true; sess = newSession(); $('#topicLabel').textContent = 'Not chosen yet'; $('#endBtn').disabled = true; $('#feed').innerHTML = '<div class="empty">Your feedback will appear here.</div>'; $('#transcript').innerHTML = ''; showSub('', 'Tap the mic and <b>say a topic</b> — or tap <b>Topics</b> for 4 fresh ideas.', 'Subtitles'); setStatus('idle'); };
  $('#mNew').onclick = reset;
  $('#mClose').onclick = () => { modal.hidden = true; };
  $('#mDrill').onclick = () => { reset(); switchTab('drills'); buildDrill('mine'); };
}

/* ---------------- drills ---------------- */
const DRILLS = window.DRILLDATA;
let drillSet = 'pairs', drillQ = [], drillI = 0, drillBusy = false;
async function buildDrill(set) {
  drillSet = set;
  const card = document.querySelector('.card.drill'); if (card) card.classList.toggle('f10', set === 'find10');
  if (set === 'find10') { $$('#drillSets button').forEach((b) => b.classList.toggle('on', b.dataset.set === set)); $('#drillCount').textContent = ''; return buildFind10(); }
  if (set === 'weak') {
    drillQ = Learner.weakItems(window.FINDBANK, 12);
    if (!drillQ.length) drillQ = [['Keep speaking — I’ll learn your weak spots.', 'After a few turns this set fills with your own repeated mistakes.']];
  } else if (set === 'mine') {
    const mine = (prog?.notebook || []).filter((n) => n.type === 'pron').map((n) => [n.wrong, n.right]);
    const gram = (prog?.notebook || []).filter((n) => n.type === 'grammar' && n.right).slice(0, 8).map((n) => [n.right.replace(/^./, (c) => c.toUpperCase()) + '.', 'Say the corrected phrase — build the habit.']);
    drillQ = [...mine, ...gram];
    if (!drillQ.length) drillQ = DRILLS.tricky.items.slice(0, 6);
  } else if (set === 'bank') {
    let bank = []; try { bank = JSON.parse(localStorage.getItem('ava.bank') || '[]'); } catch {}
    drillQ = bank.map((w) => [w.w, 'Say it, then use it in your own sentence.']);
    if (!drillQ.length) drillQ = [['Tap ＋ next to a word to save it', 'Saved words appear here.']];
  } else drillQ = DRILLS[set].items.slice();
  drillQ.sort(() => Math.random() - 0.5); drillI = 0;
  $$('#drillSets button').forEach((b) => b.classList.toggle('on', b.dataset.set === set));
  showDrill();
}
function showDrill() {
  const [t, tip] = drillQ[drillI] || ['—', ''];
  $('#drillTarget').textContent = t; $('#drillTip').textContent = tip; $('#drillResult').innerHTML = '';
  $('#drillCount').textContent = `${drillI + 1} / ${drillQ.length}`;
  renderWT(t);
}

/* ---------------- Read 10 sentences, then find the mistakes ---------------- */
let f10 = null;
function buildFind10() {
  const bank = (window.FINDBANK || []).slice().sort(() => Math.random() - 0.5).slice(0, 10);
  const nWrong = 5 + Math.floor(Math.random() * 2); // 5 or 6 sentences contain a mistake
  const idx = bank.map((_, i) => i).sort(() => Math.random() - 0.5);
  const wrongSet = new Set(idx.slice(0, nWrong));
  f10 = { phase: 'read', items: bank.map(([w, r, why], i) => ({ shown: wrongSet.has(i) ? w : r, wrong: wrongSet.has(i), right: r, why, flag: false })), read: null, checked: false };
  renderF10();
}
const f10words = (s) => esc(s).split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
function renderF10() {
  const box = $('#find10'); if (!box || !f10) return;
  const it = f10.items;
  if (f10.phase === 'read') {
    box.innerHTML = `<div class="f10h"><b>Step 1 · Read these 10 sentences</b><small>Read them out loud — listen first if you like. Some have mistakes. Then find them in Step 2.</small></div>
    <ol class="f10list">${it.map((x, i) => `<li data-i="${i}"><span class="f10t">${f10.read ? f10.read[i] : f10words(x.shown)}</span> <button class="ghost f10say" data-f10say="${i}" title="Listen">🔊</button></li>`).join('')}</ol>
    ${f10.readMsg ? `<div class="f10msg">${f10.readMsg}</div>` : ''}
    <div class="drill-actions"><button class="ghost" id="f10all">🔊 Listen to all</button><button class="ghost" id="f10mic">🎤 Read all 10</button><button class="primary" id="f10go">Find the mistakes ➜</button></div>`;
  } else {
    box.innerHTML = `<div class="f10h"><b>Step 2 · Find the mistakes</b><small>${f10.checked ? 'Here is how you did.' : 'Tap every sentence that has a mistake, then press Check.'}</small></div>
    <ol class="f10list f10find">${it.map((x, i) => {
      let cls = 'f10row', extra = '';
      if (f10.checked) {
        const hit = x.flag === x.wrong; cls += hit ? ' okk' : ' bad2';
        if (x.wrong) { const d = wordDiff(x.shown, x.right); extra = `<div class="f10fix"><div class="said">${d.said}</div><div class="fixed">${d.fixed} <button class="ghost say" data-say="${esc(x.right)}">🔊</button> <button class="ghost say" data-rep="${esc(x.right)}">🎤 Repeat it</button><div class="repres"></div><small class="legend">${esc(x.why)}</small></div></div>`; }
        else if (x.flag) extra = '<div class="f10fix"><small class="legend">This one was already correct.</small></div>';
      } else if (x.flag) cls += ' flag';
      return `<li class="${cls}" data-i="${i}"><div class="f10line"><span class="f10t">${esc(f10.checked && x.wrong ? '' : x.shown)}${f10.checked && x.wrong ? '<i class="muted">sentence ' + (i + 1) + '</i>' : ''}</span><span class="f10mark">${f10.checked ? (x.flag === x.wrong ? '✅' : '❌') : x.flag ? '⚑' : '○'}</span></div>${extra}</li>`;
    }).join('')}</ol>
    ${f10.checked ? `<div class="f10msg big">${f10score()}</div>` : ''}
    <div class="drill-actions">${f10.checked ? '<button class="primary" id="f10new">🔁 New round</button>' : '<button class="ghost" id="f10back">⬅ Read again</button><button class="primary" id="f10check">Check ✔</button>'}</div>`;
  }
}
function f10score() {
  const it = f10.items, right = it.filter((x) => x.flag === x.wrong).length, wr = it.filter((x) => x.wrong);
  const found = wr.filter((x) => x.flag).length, fp = it.filter((x) => !x.wrong && x.flag).length;
  emit('drill', { pct: Math.round((right / it.length) * 100) });
  return `${right} / ${it.length} correct · found ${found} of ${wr.length} mistakes${fp ? ` · ${fp} false alarm${fp > 1 ? 's' : ''}` : ''}`;
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button, li.f10row'); if (!t || !f10 || !$('#find10')?.contains(t)) return;
  if (t.matches('li.f10row')) { if (!f10.checked) { const x = f10.items[+t.dataset.i]; x.flag = !x.flag; renderF10(); } return; }
  if (t.dataset.f10say != null) { await speakRaw(f10.items[+t.dataset.f10say].shown, S.rate, null, true); return; }
  if (t.id === 'f10all') { for (const x of f10.items) { if (!$('#f10all')) break; await speakRaw(x.shown, S.rate, null, true); } return; }
  if (t.id === 'f10go') { f10.phase = 'find'; renderF10(); return; }
  if (t.id === 'f10back') { f10.phase = 'read'; renderF10(); return; }
  if (t.id === 'f10check') { f10.checked = true; renderF10(); return; }
  if (t.id === 'f10new') { buildFind10(); return; }
  if (t.id === 'f10mic') {
    f10.readMsg = '🎤 Listening… read all 10 in a row, then pause.'; renderF10();
    try {
      const r = await listen({ silenceMs: 4000, lang: S.lang });
      const target = f10.items.map((x) => x.shown).join(' ');
      const d = diffWords(target, r.text || '');
      let pos = 0; const per = [];
      f10.read = f10.items.map((x) => {
        const n = norm(x.shown).split(' ').length, ok = d.ok.slice(pos, pos + n), ws = d.a.slice(pos, pos + n); pos += n;
        per.push(ok.filter(Boolean).length / n);
        return ws.map((w, k) => `<span class="w ${ok[k] ? 'ok' : 'no'}">${esc(w)}</span>`).join(' ');
      });
      const pct = Math.round((d.ok.filter(Boolean).length / d.a.length) * 100);
      f10.readMsg = `You read ${pct}% of the words clearly. Red words didn’t come through — listen with 🔊 and try again.`;
      drillSec += Math.max(3, r.durationSec); saveDrill();
    } catch (er) { f10.readMsg = ''; micError(er); }
    renderF10();
  }
});

/* ---------------- word-by-word pronunciation trainer ---------------- */
let wtHints = null;
function wtHint(w) {
  if (!wtHints) {
    wtHints = {};
    try { for (const [k, r, tip] of (self.AvaAnalyzer?.PRON || [])) wtHints[k.toLowerCase()] = r + (tip ? ' — ' + tip : ''); } catch {}
    for (const set of Object.values(window.DRILLDATA || {})) for (const [t, tip] of set.items) { if (!/\s|,/.test(t) && !wtHints[t.toLowerCase()] && /[A-Z]{2,}|“|”/.test(tip)) wtHints[t.toLowerCase()] = tip; }
  }
  return wtHints[w.toLowerCase()] || '';
}
let wt = { words: [], res: [], cur: -1, busy: false };
function renderWT(text) {
  const box = $('#wordtrain'); if (!box) return;
  if (drillSet === 'find10' || !text || text.length > 120) { box.innerHTML = ''; return; }
  const words = String(text).split(/\s+/).map((w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')).filter(Boolean);
  if (!words.length) { box.innerHTML = ''; return; }
  wt = { words, res: words.map(() => null), cur: -1, busy: false };
  paintWT();
}
async function fillDict(word) {
  const box = $('#wordtrain .wtdict'); if (!box) return;
  const d = await Online.define(word);
  if (!d || !$('#wordtrain .wtdict') || wt.words[wt.cur] !== word) return;
  const m = d.meanings && d.meanings[0];
  $('#wordtrain .wtdict').innerHTML = `${d.phonetic ? `<span class="wtph">${esc(d.phonetic)}</span>` : ''}${d.audio ? `<button class="ghost" data-wtact="native" data-au="${esc(d.audio)}">🔈 Native voice</button>` : ''}${m && m.def ? `<div class="wtdef"><i>${esc(m.pos || '')}</i> ${esc(m.def)}</div>` : ''}`;
}
function paintWT() {
  const box = $('#wordtrain'); if (!box) return;
  const ok = wt.res.filter((r) => r === true).length;
  box.innerHTML = `<div class="wthead"><b>🔤 Train each word</b><small>Tap a word to hear it slowly, then say just that word.</small></div>
  <div class="wtchips">${wt.words.map((w, i) => `<button class="wtchip ${wt.res[i] === true ? 'ok' : wt.res[i] === false ? 'no' : ''} ${wt.cur === i ? 'cur' : ''}" data-wt="${i}">${esc(w)}</button>`).join('')}</div>
  ${wt.cur >= 0 ? `<div class="wtfocus"><span class="wtw">${esc(wt.words[wt.cur])}</span>${wtHint(wt.words[wt.cur]) ? `<small class="wthint">${esc(wtHint(wt.words[wt.cur]))}</small>` : ''}<div class="drill-actions"><button class="ghost" data-wtact="hear">🔊 Slow</button><button class="primary" data-wtact="say">${wt.busy ? '⏺ Listening…' : '🎤 Say this word'}</button></div><div class="wtres">${wt.msg || ''}</div><div class="wtdict"></div></div>` : ''}
  <div class="wtbar"><span>${ok} / ${wt.words.length} words clear</span><button class="ghost" data-wtact="all">▶ Go through all words</button></div>`;
  if (wt.cur >= 0) fillDict(wt.words[wt.cur]);
}
async function wtSay(i) {
  if (wt.busy) return; wt.cur = i; wt.busy = true; wt.msg = ''; paintWT();
  let good = false;
  try {
    const r = await listen({ silenceMs: 1300, lang: S.lang });
    const heard = norm(r.text || ''), want = norm(wt.words[i]);
    good = heard.split(' ').includes(want) || (want.length > 3 && heard.replace(/ /g, '').includes(want.replace(/ /g, '')));
    wt.msg = good ? '✅ Clear!' : `🔁 I heard “${esc(r.text || '…nothing')}”. Listen again and copy the sound.`;
    drillSec += Math.max(2, r.durationSec); saveDrill(); emit('drill', { pct: good ? 100 : 40 });
  } catch (er) { wt.msg = ''; micError(er); }
  wt.res[i] = good; wt.busy = false; paintWT();
  return good;
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('#wordtrain button'); if (!t) return;
  if (t.dataset.wt != null) { const i = +t.dataset.wt; wt.cur = i; wt.msg = ''; paintWT(); await speakRaw(wt.words[i], 0.6, null, true); return; }
  const act = t.dataset.wtact;
  if (act === 'native') { try { await new Audio(String(t.dataset.au).replace(/^\/\//, 'https://')).play(); } catch { toast('Could not play the native voice here.'); } }
  else if (act === 'hear') await speakRaw(wt.words[wt.cur], 0.55, null, true);
  else if (act === 'say') await wtSay(wt.cur);
  else if (act === 'all') {
    wt.res = wt.words.map(() => null);
    for (let i = 0; i < wt.words.length; i++) {
      wt.cur = i; wt.msg = ''; paintWT(); await speakRaw(wt.words[i], 0.6, null, true);
      let tries = 0, ok = false; while (!ok && tries < 2) { ok = await wtSay(i); tries++; if (!$('#wordtrain .wtfocus')) return; }
      await sleep(500);
    }
    wt.cur = -1; paintWT();
  }
});
function diffWords(target, heard) {
  const a = norm(target).split(' '), b = norm(heard).split(' ').filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = Array(a.length).fill(false); let i = 0, j = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { ok[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return { a, ok };
}
async function drillListen() { const [t] = drillQ[drillI]; await speakRaw(t, 0.8, null, true); }
async function drillSpeak() {
  if (drillBusy) { stopListen?.(); return; }
  drillBusy = true; $('#drillSpeak').textContent = '⏺ Listening…';
  const [target] = drillQ[drillI];
  try {
    const r = await listen({ silenceMs: 1500 });
    const d = diffWords(target, r.text);
    const hits = d.ok.filter(Boolean).length, pct = Math.round((hits / d.a.length) * 100);
    const orig = target.split(/\s+/);
    $('#drillTarget').innerHTML = orig.map((w, i) => `<span class="w ${d.ok[i] ? 'ok' : 'no'}">${esc(w)}</span>`).join(' ');
    const conf = r.confidence != null ? ` · clarity ${Math.round(r.confidence * 100)}%` : '';
    $('#drillResult').innerHTML = `<div class="big">${pct === 100 ? '✅ Perfect!' : pct >= 60 ? '👍 Close' : '🔁 Try again'} — ${pct}%${conf}</div><div class="muted">I heard: “${esc(r.text || '…nothing')}”</div>` + (pct < 100 ? '<div class="muted">Red words didn\'t come through clearly. Tap 🔊 Listen, copy the mouth shape, and say it again.</div>' : '');
    drillSec += Math.max(3, r.durationSec); saveDrill(); emit('drill', { pct });
    try { if (drillQ[drillI] && drillQ[drillI][2]) Learner.answer(drillQ[drillI][2], pct === 100); } catch {}
    if (pct === 100) { await sleep(1100); drillBusy = false; $('#drillSpeak').textContent = '🎤 Say it'; drillI = (drillI + 1) % drillQ.length; showDrill(); return; }
  } catch (e) { micError(e); }
  drillBusy = false; $('#drillSpeak').textContent = '🎤 Say it';
}

/* ---------------- tabs, settings, reminders ---------------- */
function switchTab(name) {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $$('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + name));
  if (name === 'progress') loadProgress();
}
function setAi(on) { aiOn = on; const p = $('#aiPill'); p.textContent = on ? 'AI coach on' : 'offline mode'; p.classList.toggle('on', on); }

async function initSettings() {
  $('#setLevel').value = S.level; $('#setLang').value = S.lang; $('#setRate').value = S.rate; $('#setRemind').value = S.remind; $('#setSound').checked = S.sound !== false;
  $('#saveSettings').onclick = async () => {
    S.level = $('#setLevel').value; S.lang = $('#setLang').value; S.rate = +$('#setRate').value; S.voice = $('#setVoice').value; S.remind = $('#setRemind').value; S.sound = $('#setSound').checked; saveS();
    const goal = +$('#setGoal').value; if (goal) await api('/api/settings', { goalMin: goal });
    const key = $('#setKey').value.trim();
    if (key) { const r = await api('/api/key', { apiKey: key }); setAi(r.ai); $('#setKey').value = ''; }
    { const tk = $('#setTtsKey').value.trim(), tp = $('#setTts').value; const r = await api('/api/key', { ttsProvider: tp, ttsUrl: ($('#setTtsUrl').value || '').trim(), ...(tk ? { ttsKey: tk } : {}) }); cloud.on = r.tts; $('#setTtsKey').value = ''; if (tp && !r.tts) toast('Paste the voice service key too, then Save.'); }
    if (S.remind && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    $('#saveMsg').textContent = 'Saved ✓'; setTimeout(() => ($('#saveMsg').textContent = ''), 2500);
    loadProgress();
  };
}
let lastRemind = '';
setInterval(() => {
  if (!S.remind || !prog) return;
  const now = new Date(); const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (hm === S.remind && lastRemind !== today() + hm && prog.todaySec < prog.goalMin * 60) {
    lastRemind = today() + hm;
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Ava: time to speak English! 🔥', { body: prog.streak ? `Keep your ${prog.streak}-day streak alive.` : 'Start your streak today.' });
    toast('⏰ Time for your daily English practice!');
  }
}, 20000);

/* active time tracking (counts while a conversation is in progress, not while waiting idle) */
setInterval(() => {
  if (status !== 'idle' && sess.turns >= 0 && sess.topic) { sess.activeSec++; }
  if (drillBusy) drillSec++;
}, 1000);
setInterval(() => { if (sess.topic && sess.activeSec) { saveSession(); } if (drillSec) saveDrill(); }, 15000);
window.addEventListener('beforeunload', () => {
  if (sess.turns) navigator.sendBeacon?.('/api/session', new Blob([JSON.stringify({ id: sess.id, kind: 'chat', date: today(), topic: sess.topic, activeSec: sess.activeSec, words: sess.words, turns: sess.turns, wpm: avg(sess.wpms), avgScore: avg(sess.scores), counts: sess.counts })], { type: 'application/json' }));
});

/* ---------------- init ---------------- */
window.AvaApp = {
  on: (e, f) => (bus[e] = bus[e] || []).push(f), emit, S, saveS, toast, esc, api, today, pad, speakRaw, listen,
  get status() { return status; }, get sess() { return sess; }, get prog() { return prog; }, get char() { return char; },
  startConversation: (t, p) => startConversation(t, p, false), stopListen: () => stopListen?.(), cancelAll, setAi,
  mic: () => onMic(), switchTab, loadProgress, drill: (set) => { switchTab('drills'); buildDrill(set); },
};
async function init() {
  $$('#tabs button').forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  $('#micBtn').onclick = onMic;
  $('#surpriseBtn').onclick = () => { if (status === 'listening') stopListen?.(); if (window.VocaModes) window.VocaModes.pick(); else startConversation(null, true); };
  $('#skipBtn').onclick = () => { cancelAll(); stopListen?.(); if (status === 'speaking') setStatus('idle'); };
  $('#endBtn').onclick = endSession;
  $('#typedForm').onsubmit = (e) => {
    e.preventDefault(); const v = $('#typedInput').value.trim(); if (!v) return; $('#typedInput').value = '';
    if (turnBusy || status === 'thinking') { outbox.push(v); const d = document.createElement('div'); d.className = 'm you pending'; d.textContent = v; $('#transcript').appendChild(d); $('#transcript').scrollTop = 1e9; return; }
    if (status === 'speaking') cancelAll();
    if (!sess.topic) return firstMessage(v, {});
    handleUserText(v, {});
  };
  $('#drillSets').innerHTML = [...Object.entries(DRILLS).map(([k, v]) => `<button data-set="${k}">${v.label}</button>`), '<button data-set="find10">📖 Read 10 → find mistakes</button>', '<button data-set="weak">🧠 Weak spots</button>', '<button data-set="mine">🎯 My mistakes</button>', '<button data-set="bank">📚 My words</button>'].join('');
  $('#drillSets').onclick = (e) => { const b = e.target.closest('button'); if (b) buildDrill(b.dataset.set); };
  $('#drillListen').onclick = drillListen; $('#drillSpeak').onclick = drillSpeak;
  $('#drillNext').onclick = () => { drillI = (drillI + 1) % drillQ.length; showDrill(); };
  $('#drillMine').onclick = () => { switchTab('drills'); buildDrill('mine'); };
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  $('#charBtn').onclick = openCharacters;
  applyChar();
  try { presets = (await api('/api/characters')).characters; } catch {}
  await initSettings();
  const refreshConfig = async () => { try { const c = await api('/api/config'); setAi(c.ai); cloud.on = c.tts; $('#setTts').value = c.ttsProvider || ''; $('#setTtsUrl').value = c.ttsUrl && c.ttsUrl !== 'http://localhost:3900' ? c.ttsUrl : ''; $('#vsRow').hidden = c.ttsProvider !== 'voicestudio'; } catch {} };
  $('#setTts').addEventListener('change', () => { $('#vsRow').hidden = $('#setTts').value !== 'voicestudio'; });
  window.__refreshConfig = refreshConfig; await refreshConfig();
  $('#ttsTest').onclick = async () => { cancelAll(); try { if (!cloud.on) return toast('Save a voice service + key first.'); toast('Generating voice…'); await cloudSpeak(`Hello! I am ${char.name}. Let's practise English together.`, null); } catch (e) { toast('Voice test failed: ' + String(e.message).slice(0, 120)); } };
  try { const t = await api('/api/topics'); $('#topicChips').innerHTML = t.topics.map((x) => `<button>${esc(x)}</button>`).join(''); $('#topicChips').onclick = (e) => { const b = e.target.closest('button'); if (b && status !== 'thinking') { cancelAll(); startConversation(b.textContent, false); } }; } catch {}
  buildDrill('pairs');
  await loadProgress();
  setStatus('idle');
  if (!SR) toast('Your browser has no speech recognition. Open this page in Chrome or Edge to use the mic (typing works everywhere).');
}
init();
})();

/* ---------------- online helpers: settings + word meanings ---------------- */
document.addEventListener('click', async (e) => {
  const c = e.target.closest('.vchip[data-vw]'); if (!c) return;
  const d = await Online.define((c.dataset.vw || '').split(' ')[0]);
  const m = d && d.meanings && d.meanings[0];
  toast(d && m && m.def ? `${d.word}${d.phonetic ? ' ' + d.phonetic : ''} — ${m.pos}: ${m.def}` : 'No dictionary entry found.');
});
(function initOnline() {
  const cfg = Online.cfg(), $id = (i) => document.getElementById(i);
  const set = (id, v) => { const el = $id(id); if (el) el.checked = !!v; };
  const status = (n) => { const el = $id('neuralStatus'); if (el) el.textContent = n.state === 'idle' ? (Online.cfg().neural ? 'Waiting…' : 'Off') : n.msg; };
  set('setLT', cfg.lt); set('setDict', cfg.dict); set('setNeural', cfg.neural); status(Online.neural);
  Online.onNeural(status);
  $id('setLT')?.addEventListener('change', (e) => Online.setCfg({ lt: e.target.checked }));
  $id('setDict')?.addEventListener('change', (e) => Online.setCfg({ dict: e.target.checked }));
  $id('setNeural')?.addEventListener('change', async (e) => {
    if (e.target.checked) {
      if (!confirm('This downloads a grammar model (roughly 100–250 MB) once and keeps it in your browser. Continue?')) { e.target.checked = false; return; }
      Online.setCfg({ neural: true }); status({ state: 'loading', msg: 'Starting…' }); Online.neuralLoad();
    } else { Online.setCfg({ neural: false }); status({ state: 'idle', msg: '' }); }
  });
  if (cfg.neural) setTimeout(() => Online.neuralLoad(), 2500);
})();
