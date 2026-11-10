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
const S = { rate: 0.95, voice: '', lang: 'en-US', level: 'intermediate', remind: '', ...(() => { try { return JSON.parse(localStorage.getItem('ava.settings') || '{}'); } catch { return {}; } })() };
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
function voiceFor(vp) {
  const want = vp.gender === 'm' ? 'm' : 'f', lang = ACC[vp.accent] || 'en-US';
  const byL = voices.filter((v) => v.lang.replace('_', '-').startsWith(lang));
  const v = byL.find((x) => gOf(x) === want) || voices.find((x) => gOf(x) === want) || byL[0] || voices[0] || null;
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
      let v, pitch = 1;
      if (neutral || char.id === 'ava') { v = pickVoice(); } else { const f = voiceFor(char.voice); v = f.v; pitch = f.pitch; rate = rate * (char.voice.rate / 0.95); }
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = Math.max(0.5, Math.min(1.5, rate)); u.pitch = pitch;
      let gotBoundary = false;
      u.onboundary = (e) => { if (e.name && e.name !== 'word') return; gotBoundary = true; onWord?.(off + e.charIndex); };
      u.onstart = () => { onWord?.(off); setTimeout(() => { if (!gotBoundary && my === ttsToken) { /* fallback: timed reveal */ let k = 0; const ws = chunk.split(/\s+/); const per = 60000 / (155 * rate); const iv = setInterval(() => { if (my !== ttsToken || gotBoundary || k >= ws.length) return clearInterval(iv); onWord?.(off + chunk.indexOf(ws[k], k ? 0 : 0)); k++; }, per); } }, 700); };
      u.onend = next; u.onerror = next;
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
  if (cloud.on) { try { await cloudSpeak(text, reveal); spoken = true; } catch (e) { toast('Voice service problem — using browser voice. (' + String(e.message).slice(0, 90) + ')'); } }
  if (!spoken) { if (!synth) await sleep(Math.min(8000, text.length * 55)); else await speakRaw(text, S.rate, reveal); }
  els.forEach((e) => e.classList.add('on'));
  if (status === 'speaking') setStatus('idle');
  emit('botDone');
}

/* ---------------- speech input (you) ---------------- */
function listen({ onInterim, silenceMs = 2200, lang } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('unsupported'));
    const r = new SR();
    r.lang = lang || S.lang; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
    let finals = '', interim = '', confs = [], t0 = null, tLast = null, timer = null, failed = null;
    const stop = () => { clearTimeout(timer); try { r.stop(); } catch {} };
    stopListen = stop;
    r.onresult = (e) => {
      const now = Date.now(); t0 ??= now; tLast = now; interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) { finals += ' ' + res[0].transcript; if (res[0].confidence) confs.push(res[0].confidence); }
        else interim += res[0].transcript;
      }
      onInterim?.(finals.trim(), interim.trim());
      clearTimeout(timer); timer = setTimeout(stop, silenceMs);
    };
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
  await sleep(120);
  if (!SR) return micError(new Error('unsupported'));
  setStatus('listening');
  const choosingTopic = !sess.topic;
  showSub('you', '<span class="interim">' + (choosingTopic ? 'Say a topic…' : 'Speak now…') + '</span>', 'You');
  let res;
  try { res = await listen({ onInterim: (f, i) => showSub('you', `${esc(f)} <span class="interim">${esc(i)}</span>`, 'You') }); }
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
  const rep = r.report;
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

function highlight(text, rep) {
  let h = esc(text);
  const bad = [...rep.grammar.map((g) => g.wrong), ...rep.natural.map((n) => n.said), ...rep.pronunciation.map((p) => p.word)];
  for (const b of bad) {
    const e = esc(b).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    h = h.replace(new RegExp(`(?<![>\\w])(${e})(?![\\w<])`, 'i'), '<mark>$1</mark>');
  }
  return h;
}

/* ---------------- coach notes rendering ---------------- */
const cls = (n) => (n == null ? '' : n >= 80 ? 'hi' : n >= 60 ? 'mid' : 'lo');
function renderTurn(rep) {
  const feed = $('#feed');
  feed.querySelector('.empty')?.remove();
  const el = document.createElement('div'); el.className = 'turn';
  const sc = rep.scores || {};
  const chip = (l, v) => (v == null ? '' : `<span class="score ${cls(v)}">${l} ${v}</span>`);
  let html = `<div class="said">“${highlight(rep.text, rep)}”</div>`;
  if (rep.corrected) html += `<div class="fixed"><b>Say it like this</b>${esc(rep.corrected)} <button class="ghost say" data-say="${esc(rep.corrected)}" style="padding:1px 10px;font-size:.75rem">🔊</button> <button class="ghost say" data-rep="${esc(rep.corrected)}" style="padding:1px 10px;font-size:.75rem">🎤 Repeat it</button><div class="repres"></div></div>`;
  html += `<div class="scores">${chip('Overall', sc.overall)}${chip('Grammar', sc.grammar)}${chip('Vocab', sc.vocab)}${chip('Fluency', sc.fluency)}${chip('Clarity', sc.pronunciation)}${rep.fluency?.wpm ? `<span class="score">${rep.fluency.wpm} wpm</span>` : ''}</div>`;
  let items = '';
  rep.grammar.forEach((g) => items += `<div class="item"><span class="tag grammar">Grammar</span><div><s>${esc(g.wrong)}</s> → <span class="ok">${esc(g.right)}</span></div><div class="why">${esc(g.why)}</div></div>`);
  rep.pronunciation.forEach((p) => items += `<div class="item"><span class="tag pron">Pronounce</span><div><b>${esc(p.word)}</b> → say <span class="ok">${esc(p.say)}</span></div><div class="why">${esc(p.tip)}</div><div class="try"><button data-hear="${esc(p.word)}">🔊 Hear</button><button data-try="${esc(p.word)}">🎤 Try it</button><span class="res"></span></div></div>`);
  rep.natural.forEach((n) => items += `<div class="item"><span class="tag natural">Natural</span><div><s>${esc(n.said)}</s> → <span class="ok">${esc(n.better)}</span></div><div class="why">${esc(n.why)}</div></div>`);
  rep.vocab.forEach((v) => items += `<div class="item"><span class="tag vocab">Vocab</span><div><b>${esc(v.used)}</b> → try ${(v.better || []).map((b) => `<button class="chip" data-save="${esc(b)}" title="Save to My words">＋ ${esc(b)}</button>`).join(' ')}</div></div>`);
  const fl = rep.fluency || {};
  (fl.fillers || []).forEach((f) => items += `<div class="item"><span class="tag fluency">Fluency</span><div>Filler “${esc(f.word)}” ×${f.count}</div></div>`);
  (fl.tips || []).forEach((t) => items += `<div class="item"><span class="tag fluency">Fluency</span><div>${esc(t)}</div></div>`);
  html += items || '<div class="allgood">✅ No mistakes found in this answer — great!</div>';
  if (rep.praise) html += `<div class="praise">⭐ ${esc(rep.praise)}</div>`;
  el.innerHTML = html;
  feed.prepend(el);
}
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
function renderProgress() {
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
const DRILLS = {
  pairs: { label: 'Sound pairs', items: [['ship', 'Short “i” — lips relaxed, not “sheep”.'], ['sheep', 'Long “ee” — smile and hold it.'], ['very', 'Top teeth touch the lower lip: “v”.'], ['west', 'Round lips for “w”: not “vest”.'], ['think', 'Tongue tip between teeth for “th”.'], ['this', 'Voiced “th” — vibrate your tongue.'], ['full', 'Short “u”.'], ['fool', 'Long “oo”.'], ['bat', 'Open “a”.'], ['bet', 'Mouth half open “e”.'], ['light', 'Clear “l” at the tongue tip.'], ['right', 'Curl the tongue for “r”, no contact.'], ['bird', '“er” sound with no separate “r”.'], ['world', 'One syllable: “wurld”.']] },
  tricky: { label: 'Tricky words', items: [['comfortable', 'KUMF-ter-bul — 3 syllables'], ['vegetable', 'VEJ-tuh-bul'], ['Wednesday', 'WENZ-day'], ['February', 'FEB-roo-air-ee'], ['pronunciation', 'pruh-NUN-see-AY-shun'], ['schedule', 'SKED-yool'], ['thoroughly', 'THUR-oh-lee'], ['particularly', 'per-TIK-yuh-ler-lee'], ['environment', 'en-VY-run-ment'], ['development', 'dih-VEL-up-ment'], ['literature', 'LIT-ruh-chur'], ['mischievous', 'MIS-chih-vus']] },
  sentences: { label: 'Sentences', items: [['She sells seashells by the seashore.', 'Keep “s” and “sh” distinct.'], ['I think the weather is rather nice this Thursday.', 'Practise “th” (voiced and unvoiced).'], ['Very few people want to work on Wednesday.', 'v / w contrast.'], ['Could you tell me where the nearest station is?', 'Rising polite intonation.'], ['I would have gone if I had known about it.', 'Weak forms: “would’ve”, “had”.'], ['The red lorry rolled round the railway road.', 'Light vs. dark “r” and “l”.']] },
  twisters: { label: 'Tongue twisters', items: [['Red lorry, yellow lorry.', 'Say it 3× faster each time.'], ['Peter Piper picked a peck of pickled peppers.', 'Crisp “p” bursts.'], ['How much wood would a woodchuck chuck?', 'Keep “w” rounded.'], ['Three free throws.', '“thr” vs. “fr”.']] },
};
let drillSet = 'pairs', drillQ = [], drillI = 0, drillBusy = false;
async function buildDrill(set) {
  drillSet = set;
  if (set === 'mine') {
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
}
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
    if (pct === 100) { await sleep(900); }
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
    { const tk = $('#setTtsKey').value.trim(), tp = $('#setTts').value; const r = await api('/api/key', { ttsProvider: tp, ...(tk ? { ttsKey: tk } : {}) }); cloud.on = r.tts; $('#setTtsKey').value = ''; if (tp && !r.tts) toast('Paste the voice service key too, then Save.'); }
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
  $('#drillSets').innerHTML = [...Object.entries(DRILLS).map(([k, v]) => `<button data-set="${k}">${v.label}</button>`), '<button data-set="mine">🎯 My mistakes</button>', '<button data-set="bank">📚 My words</button>'].join('');
  $('#drillSets').onclick = (e) => { const b = e.target.closest('button'); if (b) buildDrill(b.dataset.set); };
  $('#drillListen').onclick = drillListen; $('#drillSpeak').onclick = drillSpeak;
  $('#drillNext').onclick = () => { drillI = (drillI + 1) % drillQ.length; showDrill(); };
  $('#drillMine').onclick = () => { switchTab('drills'); buildDrill('mine'); };
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }
  $('#charBtn').onclick = openCharacters;
  applyChar();
  try { presets = (await api('/api/characters')).characters; } catch {}
  await initSettings();
  const refreshConfig = async () => { try { const c = await api('/api/config'); setAi(c.ai); cloud.on = c.tts; $('#setTts').value = c.ttsProvider || ''; } catch {} };
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
