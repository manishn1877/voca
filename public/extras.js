/* Extras: living background, sounds, confetti, XP/levels, achievements, daily word & challenge,
   word bank, charts, welcome screen, hands-free mode, shortcuts. Talks to app.js via window.AvaApp. */
(() => {
'use strict';
const A = window.AvaApp; if (!A) return;
const $ = (s, p = document) => p.querySelector(s), $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = A.esc;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const dayNum = () => Math.floor(new Date(A.today() + 'T00:00:00Z').getTime() / 864e5);

/* ---------- sound effects ---------- */
let ac = null;
function tone(f, t, l, vol = 0.1) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + l);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + l + 0.03);
}
const SEQ = { start: [[660, 0, .09], [880, .09, .13]], stop: [[880, 0, .08], [587, .08, .13]], ok: [[784, 0, .1], [988, .1, .1], [1175, .2, .25]], level: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .45]], pop: [[1300, 0, .05]] };
function sfx(n) {
  if (A.S.sound === false) return;
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const t = ac.currentTime; SEQ[n].forEach(([f, d, l]) => tone(f, t + d, l)); } catch {}
}

/* ---------- confetti ---------- */
const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf = 0;
function fit() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
fit(); addEventListener('resize', fit);
const COLORS = ['#ff6b3d', '#12b886', '#6f5bff', '#ffd166', '#ff6b9e', '#4dabf7'];
function confetti(n = 140, ox = .5, oy = .35) {
  if (reduce) return;
  for (let i = 0; i < n; i++) parts.push({ x: innerWidth * ox, y: innerHeight * oy, vx: (Math.random() - .5) * 16, vy: -Math.random() * 13 - 4, s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COLORS[i % 6], life: 130 + Math.random() * 70 });
  if (!raf) raf = requestAnimationFrame(loop);
}
function loop() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 30);
  for (const p of parts) {
    p.vy += .36; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; p.life--;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.min(1, p.life / 40); cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); cx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
}
function celebrate(msg, big) {
  confetti(big ? 220 : 120); sfx(big ? 'level' : 'ok');
  const t = document.createElement('div'); t.className = 'toasty'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3800);
}
function floatText(txt, el) {
  const r = (el || $('#avBot')).getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'float'; f.textContent = txt; f.style.left = r.left + r.width / 2 - 24 + 'px'; f.style.top = r.top + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1700);
}

/* ---------- living background ---------- */
const bg = $('#bg'), bx = bg.getContext('2d'); let W = 0, H = 0;
const rs = () => { W = bg.width = innerWidth; H = bg.height = innerHeight; }; rs(); addEventListener('resize', rs);
const dots = Array.from({ length: 48 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .6, s: Math.random() * .00035 + .0001, a: Math.random() * .5 + .15, p: Math.random() * 6.28 }));
const blobs = [{ c: '111,91,255', x: .12, y: .1, r: .55, sp: .00012 }, { c: '18,184,134', x: .92, y: .2, r: .5, sp: .00009 }, { c: '255,107,61', x: .5, y: 1.05, r: .55, sp: .00011 }];
window.__blobs = blobs;
function frame(t) {
  bx.clearRect(0, 0, W, H);
  blobs.forEach((b, i) => {
    const x = (b.x + Math.sin(t * b.sp + i * 2) * .1) * W, y = (b.y + Math.cos(t * b.sp * 1.3 + i) * .1) * H, r = b.r * Math.max(W, H);
    const g = bx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${b.c},.2)`); g.addColorStop(1, `rgba(${b.c},0)`); bx.fillStyle = g; bx.fillRect(0, 0, W, H);
  });
  for (const d of ((self.AvaTheme && self.AvaTheme.kind) || 'stars') === 'stars' ? dots : []) {
    d.y -= d.s * 14 * 0.05; if (d.y < -.02) d.y = 1.02;
    bx.globalAlpha = d.a * (.55 + .45 * Math.sin(t * .001 + d.p)); bx.fillStyle = '#fff'; bx.beginPath(); bx.arc((d.x + Math.sin(t * .0003 + d.p) * .012) * W, d.y * H, d.r, 0, 6.28); bx.fill();
  }
  bx.globalAlpha = 1;
  if (!reduce) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- equalizer + status effects ---------- */
const eq = $('#eq');
for (let i = 0; i < 30; i++) { const b = document.createElement('i'); b.style.animationDelay = (-Math.random() * 1).toFixed(2) + 's'; b.style.animationDuration = (0.55 + Math.random() * .7).toFixed(2) + 's'; eq.appendChild(b); }
A.on('micReady', () => sfx('start'));
A.on('status', ({ s, prev }) => {
  $('#sub').classList.toggle('live', s === 'listening' || s === 'speaking');
  if (s === 'listening') {} else if (prev === 'listening' && s === 'thinking') sfx('stop');
});

/* ---------- XP & levels ---------- */
const xpOf = (p) => Math.round(p.totals.minutes * 10 + p.totals.words * .4 + p.best * 30 + p.totals.sessions * 15 + ls.get('ava.bonus', 0));
const lvlOf = (xp) => Math.floor(Math.sqrt(xp / 40)) + 1;
const startOf = (L) => 40 * (L - 1) ** 2;
let lastLvl = ls.get('ava.lvl', 0);
function renderXP(p) {
  const xp = xpOf(p), L = lvlOf(xp), a = startOf(L), b = startOf(L + 1);
  $('#hudLvl').textContent = 'Lv ' + L; $('#xpLvl').textContent = 'Level ' + L;
  $('#xpTxt').textContent = `${xp} XP · ${b - xp} to Level ${L + 1}`;
  $('#xpFill').style.width = Math.max(3, ((xp - a) / (b - a)) * 100) + '%';
  if (lastLvl && L > lastLvl) { $('#hudLvl').classList.remove('up'); void $('#hudLvl').offsetWidth; $('#hudLvl').classList.add('up'); celebrate(`⬆️ Level ${L}! Keep going`, true); }
  if (L !== lastLvl) { lastLvl = L; ls.set('ava.lvl', L); }
  return { xp, L, a, b };
}
function addBonus(n) { ls.set('ava.bonus', ls.get('ava.bonus', 0) + n); if (A.prog) renderXP(A.prog); }

/* ---------- day stats, word of the day, challenge ---------- */
const WORDS = [
  ['resilient', 'able to recover quickly from difficulties', 'She stayed resilient after the setback.'], ['ambitious', 'having a strong desire to succeed', 'He is ambitious and works very hard.'],
  ['reliable', 'can be trusted to do what is expected', 'My brother is a reliable friend.'], ['curious', 'eager to know or learn', 'Kids are naturally curious about everything.'],
  ['grateful', 'feeling thankful', 'I am grateful for your help.'], ['overwhelmed', 'having too much to deal with', 'I felt overwhelmed by all the homework.'],
  ['convenient', 'easy to use or suitable for your needs', 'The new bus stop is very convenient.'], ['reluctant', 'unwilling and hesitant', 'She was reluctant to speak in public.'],
  ['achieve', 'to succeed in reaching a goal', 'I want to achieve fluent English this year.'], ['improve', 'to become or make better', 'My speaking has improved a lot.'],
  ['struggle', 'to try hard against difficulty', 'Many people struggle with pronunciation.'], ['confident', 'sure of yourself', 'I feel more confident every day.'],
  ['hesitate', 'to pause before doing something', "Don't hesitate to ask questions."], ['genuine', 'real and sincere', 'He gave me a genuine smile.'],
  ['opportunity', 'a chance to do something good', 'This job is a great opportunity.'], ['priority', 'something more important than others', 'Health is my top priority.'],
  ['effortless', 'done without visible effort', 'She makes cooking look effortless.'], ['fascinating', 'extremely interesting', 'The history of this city is fascinating.'],
  ['unpredictable', 'impossible to know in advance', 'The weather here is unpredictable.'], ['thrilled', 'extremely pleased', 'I was thrilled to get the offer.'],
  ['demanding', 'needing a lot of effort or attention', 'My job is demanding but rewarding.'], ['flexible', 'able to change easily', 'My schedule is quite flexible.'],
  ['mindset', 'a way of thinking', 'A positive mindset helps you learn.'], ['habit', 'something you do regularly', 'Reading daily is a good habit.'],
  ['curiosity', 'a strong wish to learn', 'Curiosity is the key to learning.'], ['determined', 'firmly decided to do something', 'I am determined to speak fluently.'],
  ['compromise', 'an agreement where each side gives up something', 'We reached a compromise about the budget.'], ['inspire', 'to make someone want to do something', 'Her story inspires me.'],
  ['accomplish', 'to finish something successfully', 'I accomplished everything on my list.'], ['frustrating', 'causing annoyance because of lack of progress', 'Slow internet is so frustrating.'],
  ['spontaneous', 'done without planning', 'We took a spontaneous trip to the beach.'], ['dependable', 'trustworthy and steady', 'He is a dependable colleague.'],
  ['nervous', 'a bit afraid or worried', 'I get nervous before presentations.'], ['exhausted', 'extremely tired', 'I was exhausted after the long trip.'],
  ['significant', 'important or large enough to matter', 'There was a significant improvement.'], ['beneficial', 'having a good effect', 'Exercise is beneficial for your mind.'],
  ['approach', 'a way of dealing with something', 'I like your approach to this problem.'], ['eager', 'very keen to do something', 'She is eager to learn English.'],
  ['adapt', 'to change to suit a new situation', 'It took me a while to adapt to the city.'], ['impressive', 'causing admiration', 'Her English is really impressive.'],
  ['sincerely', 'in a genuine way', 'I sincerely thank you.'], ['persistent', 'continuing despite difficulty', 'Be persistent and you will improve.'],
];
const CHALL = [
  ['Take 3 turns in a conversation today', 'turns', 3], ['Speak 60 words in total today', 'words', 60], ['Give one answer with 25+ words', 'long', 25],
  ['Get 2 answers with zero mistakes', 'clean', 2], ['Say 4 answers with no filler words', 'nofill', 4], ['Use today’s word in a sentence', 'wotd', 1],
  ['Take 5 turns in a conversation today', 'turns', 5], ['Speak 100 words in total today', 'words', 100],
];
const todayWord = () => WORDS[dayNum() % WORDS.length];
const todayChall = () => CHALL[(dayNum() * 3 + 1) % CHALL.length];
function dstats() { const d = ls.get('ava.day', null); return d && d.date === A.today() ? d : { date: A.today(), turns: 0, words: 0, long: 0, clean: 0, nofill: 0, wotd: 0, wotdPaid: 0, chPaid: 0 }; }
const bank = () => ls.get('ava.bank', []);
function saveWord(w) { const b = bank(); if (!b.some((x) => x.w.toLowerCase() === w.toLowerCase())) { b.unshift({ w, d: A.today() }); ls.set('ava.bank', b); sfx('pop'); A.toast('Saved “' + w + '” to 📚 My words (Drills tab)'); } renderDaily(); }
function renderDaily() {
  const box = $('#daily'); if (!box) return;
  const [w, mean, ex] = todayWord(), [ct, ck, cn] = todayChall(), d = dstats(), have = bank().some((x) => x.w.toLowerCase() === w);
  const val = Math.min(cn, d[ck] || 0), ok = val >= cn, wok = d.wotd > 0;
  const lv = A.prog ? renderXP(A.prog) : { xp: 0, L: 1, a: 0, b: 40 };
  box.innerHTML = `
  <div class="card dcard ${wok ? 'ok' : ''}"><small class="lab">Word of the day</small>${wok ? '<span class="done">✓ used +20 XP</span>' : ''}
    <div class="big">${esc(w)}</div><p><i>${esc(mean)}.</i> “${esc(ex)}”</p>
    <button class="ghost mini" id="wHear">🔊 Hear</button> <button class="ghost mini" id="wSave">${have ? '✓ Saved' : '＋ Save'}</button></div>
  <div class="card dcard ${ok ? 'ok' : ''}"><small class="lab">Daily challenge</small>${ok ? '<span class="done">✓ done +50 XP</span>' : ''}
    <div class="big" style="font-size:1.1rem">${esc(ct)}</div><div class="xpbar" style="margin:10px 0 4px"><i style="width:${(val / cn) * 100}%"></i></div><p>${val} / ${cn}</p></div>
  <div class="card dcard"><small class="lab">Your level</small><div class="big">Level ${lv.L}</div><div class="xpbar" style="margin:8px 0 4px"><i style="width:${Math.max(3, ((lv.xp - lv.a) / (lv.b - lv.a)) * 100)}%"></i></div><p>${lv.xp} XP · ${lv.b - lv.xp} to next level</p></div>`;
  $('#wHear').onclick = () => A.speakRaw(w, .85, null, true);
  $('#wSave').onclick = () => saveWord(w);
}
const wordRe = (w) => new RegExp('\\b' + w + '(s|es|ed|d|ing)?\\b', 'i');
const flags = ls.get('ava.flags', {});
const setFlag = (k) => { if (!flags[k]) { flags[k] = 1; ls.set('ava.flags', flags); } };
A.on('turn', ({ rep, text }) => {
  const d = dstats(), fill = (rep.fluency?.fillers || []).length;
  d.turns++; d.words += rep.words || 0; d.long = Math.max(d.long, rep.words || 0);
  const isClean = !rep.grammar.length && !rep.natural.length && (rep.words || 0) >= 8;
  if (isClean) { d.clean++; setFlag('clean'); }
  if (!fill && (rep.words || 0) >= 6) d.nofill++;
  if (wordRe(todayWord()[0]).test(text)) { d.wotd = 1; setFlag('word'); }
  if (A.char.id !== 'ava') setFlag('char');
  const [ct, ck, cn] = todayChall();
  if (d.wotd && !d.wotdPaid) { d.wotdPaid = 1; addBonus(20); celebrate('📚 You used the word of the day! +20 XP'); }
  if ((d[ck] || 0) >= cn && !d.chPaid) { d.chPaid = 1; addBonus(50); celebrate('🎯 Daily challenge complete! +50 XP', true); }
  ls.set('ava.day', d);
  floatText('+' + Math.max(1, Math.round((rep.words || 0) * .4)) + ' XP');
  if (isClean) floatText('✨ Spotless!', $('#avYou'));
  renderDaily(); checkAch();
});
A.on('save', saveWord);
A.on('drill', ({ pct }) => { if (pct === 100) { setFlag('drill'); sfx('ok'); confetti(50, .5, .3); checkAch(); } });

/* ---------- achievements ---------- */
const ACH = [
  ['first', '🎙️', 'First words', 'Speak your first answer', (p) => p.totals.words > 0],
  ['s3', '🔥', 'On fire', '3-day streak', (p) => p.best >= 3], ['s7', '⚡', 'Week warrior', '7-day streak', (p) => p.best >= 7], ['s30', '👑', 'Unstoppable', '30-day streak', (p) => p.best >= 30],
  ['w100', '💬', 'Chatterbox', 'Speak 100 words', (p) => p.totals.words >= 100], ['w1000', '📣', 'Orator', 'Speak 1,000 words', (p) => p.totals.words >= 1000],
  ['m60', '⏱️', 'One hour in', '60 minutes of practice', (p) => p.totals.minutes >= 60], ['ss10', '🗂️', 'Regular', '10 conversations', (p) => p.totals.sessions >= 10],
  ['clean', '✨', 'Spotless', 'An 8+ word answer with no mistakes', () => flags.clean], ['char', '🎭', 'Method actor', 'Chat with a character', () => flags.char],
  ['drill', '🎯', 'Sharp tongue', 'Score 100% in a drill', () => flags.drill], ['word', '📚', 'Word nerd', 'Use the word of the day', () => flags.word],
];
let achInit = ls.get('ava.ach', null);
function checkAch(silent) {
  const p = A.prog; if (!p) return;
  const got = new Set(achInit || []); let fresh = [];
  for (const a of ACH) if (a[4](p) && !got.has(a[0])) { got.add(a[0]); fresh.push(a); }
  if (fresh.length) { const first = achInit === null; achInit = [...got]; ls.set('ava.ach', achInit); if (!first && !silent) celebrate(`🏆 ${fresh[0][2]} unlocked${fresh.length > 1 ? ' (+' + (fresh.length - 1) + ' more)' : ''}`, true); }
  else if (achInit === null) { achInit = []; ls.set('ava.ach', achInit); }
  $('#badges').innerHTML = ACH.map((a) => `<div class="badge ${got.has(a[0]) ? 'on' : ''}"><span class="ic">${a[1]}</span><b>${a[2]}</b><small>${a[3]}</small></div>`).join('');
  $('#badgeCount').textContent = `${got.size} / ${ACH.length}`;
}

/* ---------- charts ---------- */
function lineChart(vals, color) {
  if (vals.length < 2) return '<div class="muted" style="font-size:.85rem;padding:14px 0">Do a few sessions and your trend line appears here.</div>';
  const w = 300, h = 100, pad = 10, mx = Math.max(...vals), mn = Math.min(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (w - pad * 2), h - pad - ((v - mn) / rg) * (h - pad * 2)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${w} ${h + 14}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".4"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
  <path d="${path} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h}Z" fill="url(#${id})"/><path class="ln" d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${color}"/>`).join('')}
  <text x="${pad}" y="${h + 12}" fill="currentColor" opacity=".55" font-size="10">${mn}</text><text x="${w - pad}" y="${h + 12}" fill="currentColor" opacity=".55" font-size="10" text-anchor="end">now ${vals[vals.length - 1]}</text></svg>`;
}
function barChart(days, goal) {
  const w = 300, h = 100, n = days.length, bw = (w - 20) / n, mx = Math.max(goal, ...days.map((d) => d.sec / 60), 1);
  const gy = h - (goal / mx) * (h - 8);
  return `<svg viewBox="0 0 ${w} ${h + 14}">${days.map((d, i) => { const bh = Math.max(2, (d.sec / 60 / mx) * (h - 8)); return `<rect class="bar" style="animation-delay:${i * 40}ms" x="${10 + i * bw + 2}" y="${h - bh}" width="${bw - 4}" height="${bh}" rx="3" fill="${d.met ? '#12b886' : d.sec ? '#6f5bff' : 'rgba(255,255,255,.12)'}"/>`; }).join('')}
  <line x1="6" x2="${w - 6}" y1="${gy}" y2="${gy}" stroke="#ff6b3d" stroke-dasharray="4 4" stroke-width="1.5"/><text x="${w - 6}" y="${gy - 4}" fill="#ff6b3d" font-size="10" text-anchor="end">goal ${goal}m</text></svg>`;
}
function countTo(el, n) {
  if (!el) return; const from = +el.textContent || 0; if (from === n || reduce) { el.textContent = n; return; }
  const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(from + (n - from) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(f); })(t0);
}
let goalCelebrated = ls.get('ava.goalDay', '');
A.on('progress', (p) => {
  const sc = p.trend.map((t) => t.score).filter((x) => x != null), wp = p.trend.map((t) => t.wpm).filter((x) => x != null);
  $('#chScore').className = $('#chWpm').className = $('#chMin').className = 'chart';
  $('#chScore').innerHTML = lineChart(sc.slice(-14), '#12b886'); $('#chWpm').innerHTML = lineChart(wp.slice(-14), '#6f5bff'); $('#chMin').innerHTML = barChart(p.days.slice(-14), p.goalMin);
  ['pStreak', 'pBest', 'pFreeze', 'pMin', 'pSess', 'pWords'].forEach((id) => { const map = { pStreak: p.streak, pBest: p.best, pFreeze: p.freezes, pMin: p.totals.minutes, pSess: p.totals.sessions, pWords: p.totals.words }; countTo($('#' + id), map[id]); });
  renderXP(p); renderDaily(); checkAch();
  if (p.todaySec >= p.goalMin * 60 && goalCelebrated !== A.today() && p.totals.words > 0) { goalCelebrated = A.today(); ls.set('ava.goalDay', goalCelebrated); setTimeout(() => celebrate(`🔥 Daily goal reached! ${p.streak}-day streak`, true), 600); }
});

/* ---------- hands-free + shortcuts ---------- */
const hb = $('#handsBtn');
const setHands = (on) => { A.S.handsfree = on; A.saveS(); hb.classList.toggle('on', on); hb.querySelector('span').textContent = on ? 'On' : 'Hands-free'; };
hb.onclick = () => { setHands(!A.S.handsfree); if (A.S.handsfree) { A.toast('📞 Hands-free: I will listen automatically after each reply.'); if (A.status === 'idle' && A.sess.topic) A.mic(); } };
setHands(false);
A.on('botDone', () => { if (A.S.handsfree && A.sess.topic && !A.sess.ended) setTimeout(() => { if (A.status === 'idle' && A.S.handsfree && !$('#modal').hidden === false) A.mic(); }, 650); });
A.on('empty', () => { if (A.S.handsfree) { setHands(false); A.toast('No speech heard — hands-free paused.'); } });
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) || !$('#tab-practice').classList.contains('on') || !$('#modal').hidden || !$('#welcome').hidden) return;
  e.preventDefault(); A.mic();
});

/* ---------- welcome ---------- */
function welcome() {
  if (ls.get('ava.welcomed', false)) return;
  const w = $('#welcome'); w.hidden = false;
  let level = A.S.level || 'intermediate', goal = 10;
  const chip = (arr, cur, key) => arr.map((v) => `<button data-${key}="${v}" class="${v == cur ? 'on' : ''}">${key === 'goal' ? v + ' min' : v}</button>`).join('');
  w.innerHTML = `<div class="wcard"><div class="wface"><div id="wf"></div></div>
    <h1>Welcome to Voca</h1><p style="margin:0 0 6px"><b>I’m Ava, your first coach.</b></p><p>Talk to me every day and I’ll listen like a coach — I’ll catch your grammar, pronunciation and word choice, and keep your streak alive.</p>
    <p style="margin:6px 0">Your level</p><div class="wopts" id="wLevel">${chip(['beginner', 'intermediate', 'advanced'], level, 'level')}</div>
    <p style="margin:6px 0">Daily practice goal</p><div class="wopts" id="wGoal">${chip([5, 10, 15, 20], goal, 'goal')}</div>
    <button class="primary" id="wGo">Let’s start</button><p style="font-size:.78rem;margin-top:14px">Use Chrome or Edge for the microphone. Tip: press <b>Space</b> to talk.</p></div>`;
  $('#wf').innerHTML = window.makePortrait(A.char.look);
  $('#wLevel').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; level = b.dataset.level; $$('#wLevel button').forEach((x) => x.classList.toggle('on', x === b)); };
  $('#wGoal').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; goal = +b.dataset.goal; $$('#wGoal button').forEach((x) => x.classList.toggle('on', x === b)); };
  $('#wGo').onclick = async () => {
    A.S.level = level; A.saveS(); $('#setLevel').value = level; ls.set('ava.welcomed', true);
    try { await A.api('/api/settings', { goalMin: goal }); A.loadProgress(); } catch {}
    sfx('ok'); confetti(90, .5, .6); w.hidden = true;
  };
}


/* ---------- character stage: themed particles, accent colour, intro card, emotes, tilt ---------- */
const THEME_BY_ID = { ava: 'stars', friend: 'hearts', interviewer: 'none', barista: 'bubbles', doctor: 'none', officer: 'none', holmes: 'embers', pirate: 'bubbles', shakespeare: 'embers', sora: 'petals', kaito: 'snow', hana: 'petals', rin: 'petals', mika: 'notes', ryo: 'embers' };
const arena = $('.arena'), sf = document.createElement('canvas'); sf.id = 'stagefx'; arena.prepend(sf);
const sx = sf.getContext('2d'); let theme = 'stars', accent = '#12b886', SW = 0, SH = 0, sp = [];
function sfit() { const r = arena.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); SW = r.width; SH = r.height; sf.width = SW * d; sf.height = SH * d; sx.setTransform(d, 0, 0, d, 0, 0); }
new ResizeObserver(sfit).observe(arena); sfit();
const mk = () => ({ x: Math.random() * SW, y: Math.random() * SH, s: Math.random() * .8 + .5, r: Math.random() * 6.28, vr: (Math.random() - .5) * .04, p: Math.random() * 6.28, v: Math.random() * .6 + .3 });
function reseed() { sp = Array.from({ length: theme === 'none' ? 0 : theme === 'snow' ? 45 : 26 }, mk); }
const NOTES = ['♪', '♫', '♬'];
function stageFrame(t) {
  sx.clearRect(0, 0, SW, SH);
  for (const o of sp) {
    o.r += o.vr; o.p += .02;
    let dx = Math.sin(o.p) * .5, dy = o.v;
    if (theme === 'embers' || theme === 'bubbles' || theme === 'notes' || theme === 'hearts') dy = -o.v * .7;
    if (theme === 'stars') { dy = 0; dx = 0; }
    o.x += dx + (theme === 'petals' || theme === 'leaves' ? .35 : 0); o.y += dy;
    if (o.y > SH + 20) o.y = -20; if (o.y < -20) o.y = SH + 20; if (o.x > SW + 20) o.x = -20;
    sx.save(); sx.translate(o.x, o.y); sx.rotate(o.r);
    const k = o.s;
    if (theme === 'petals') { sx.fillStyle = 'rgba(255,170,200,.75)'; sx.beginPath(); sx.ellipse(0, 0, 7 * k, 4 * k, 0, 0, 6.28); sx.fill(); }
    else if (theme === 'leaves') { sx.fillStyle = 'rgba(160,220,120,.6)'; sx.beginPath(); sx.ellipse(0, 0, 8 * k, 3.5 * k, 0, 0, 6.28); sx.fill(); }
    else if (theme === 'snow') { sx.fillStyle = 'rgba(255,255,255,.7)'; sx.beginPath(); sx.arc(0, 0, 2.2 * k, 0, 6.28); sx.fill(); }
    else if (theme === 'embers') { sx.fillStyle = `rgba(255,${140 + (o.p * 20) % 80},60,.8)`; sx.shadowColor = '#ff7a3d'; sx.shadowBlur = 8; sx.beginPath(); sx.arc(0, 0, 2 * k, 0, 6.28); sx.fill(); }
    else if (theme === 'bubbles') { sx.strokeStyle = 'rgba(255,255,255,.55)'; sx.lineWidth = 1.4; sx.beginPath(); sx.arc(0, 0, 5 * k + 2, 0, 6.28); sx.stroke(); sx.fillStyle = 'rgba(255,255,255,.12)'; sx.fill(); }
    else if (theme === 'stars') { const a = .35 + .65 * Math.abs(Math.sin(t * .002 + o.p * 3)); sx.fillStyle = `rgba(255,255,255,${a})`; sx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? 1.2 * k : 4.5 * k, an = i * Math.PI / 4; sx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } sx.closePath(); sx.fill(); }
    else if (theme === 'notes') { sx.rotate(-o.r); sx.fillStyle = accent; sx.globalAlpha = .75; sx.font = `${14 * k + 6}px sans-serif`; sx.fillText(NOTES[Math.floor(o.p) % 3], 0, 0); }
    else if (theme === 'hearts') { sx.fillStyle = 'rgba(255,120,160,.7)'; sx.rotate(-o.r); sx.font = `${12 * k + 6}px sans-serif`; sx.fillText('♥', 0, 0); }
    sx.restore();
  }
  if (!reduce) requestAnimationFrame(stageFrame);
}
requestAnimationFrame(stageFrame);

const lighten = (h, t) => { const n = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return '#' + n.map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join(''); };
let introTimer = 0;
function onChar(c, announce) {
  theme = c.theme || THEME_BY_ID[c.id] || 'stars'; reseed();
  const hair = c.look?.hair || '#12b886'; accent = lighten(/^#[0-9a-f]{6}$/i.test(hair) ? hair : '#12b886', .25);
  const R = document.documentElement.style; R.setProperty('--ca', accent);
  const bgc = c.look?.bg || ['#1d9d82', '#07322f']; R.setProperty('--c1', bgc[0]); R.setProperty('--c2', bgc[1]);
  $('#avBot').classList.remove('swap'); void $('#avBot').offsetWidth; $('#avBot').classList.add('swap');
  if (announce) intro(c);
}
function intro(c) {
  if (reduce) return; document.querySelector('.intro')?.remove(); clearTimeout(introTimer);
  const d = document.createElement('div'); d.className = 'intro'; d.style.setProperty('--ic', accent);
  d.innerHTML = `<i class="b1"></i><i class="b2"></i><div class="itx"><small>NOW TALKING WITH</small><b>${esc(c.name)}</b><span>${esc(c.tagline || '')}</span></div><div class="iface">${window.makePortrait(c.look)}</div>`;
  document.body.appendChild(d); sfx('pop'); introTimer = setTimeout(() => d.remove(), 2300);
}
let lastCharId = null;
A.on('char', (c) => { const changed = lastCharId !== null && lastCharId !== (c.id + c.name); lastCharId = c.id + c.name; onChar(c, changed); });
onChar(A.char, false); lastCharId = A.char.id + A.char.name;

/* emotes: happy / thinking / love after each answer */
let emoteT = 0;
function emote(kind) { const el = $('#avBot'); el.classList.remove('emote-happy', 'emote-think', 'emote-love'); void el.offsetWidth; el.classList.add('emote-' + kind); clearTimeout(emoteT); emoteT = setTimeout(() => el.classList.remove('emote-' + kind), 2600); }
A.on('turn', ({ rep }) => {
  const errs = rep.grammar.length + rep.natural.length;
  if (!errs && (rep.words || 0) >= 8) emote(rep.words >= 20 ? 'love' : 'happy'); else if (errs >= 2) emote('think'); else if ((rep.scores?.overall || 0) >= 85) emote('happy');
});

/* 3D tilt toward the mouse */
if (!reduce && matchMedia('(pointer:fine)').matches) {
  const face = $('#botFace'), pf = face.parentElement; let tx = 0, ty = 0, pend = false;
  document.addEventListener('mousemove', (e) => {
    const r = pf.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 500)); ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 400));
    if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; face.style.transform = `perspective(500px) rotateY(${tx * 14}deg) rotateX(${-ty * 10}deg)`; }); }
  });
}

/* ---------- boot ---------- */
const strip = document.createElement('div'); strip.className = 'daily'; strip.id = 'daily';
$('#tab-progress').prepend(strip);
renderDaily(); checkAch(true);
welcome();
})();
