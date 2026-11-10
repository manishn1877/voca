/* Voca — topic picker (4 current ideas) + Solo practice (read-aloud, line by line) */
(() => {
'use strict';
const A = window.AvaApp; if (!A) return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc, api = A.api;
const CAT = { world: ['●', 'World problem'], ai: ['●', 'AI & tech'], life: ['●', 'Right now'] };
const BANK = [
 ['world','Climate and extreme weather','Heatwaves, floods and storms are changing daily life.',['Extreme weather is becoming more common in many parts of the world.','Heatwaves and floods make life harder for farmers and for families.','Governments and companies need to cut pollution much faster than they do now.','Small habits like saving energy and wasting less food also make a difference.','I believe our generation must act now, because waiting will cost us more later.']],
 ['world','The cost of living','Prices keep rising while salaries grow slowly.',['Many people feel that everything is getting more expensive every year.','Rent, food and fuel take up a big part of a normal monthly salary.','Some families now cook at home and plan their shopping to save money.','Young people often work extra jobs to afford a comfortable life.','I think better wages and smarter budgeting can both help ease the pressure.']],
 ['world','Social media and mental health','Is constant scrolling making us anxious?',['Many of us spend hours on social media without really noticing the time.','Comparing our lives with perfect online photos can make us feel unhappy.','Taking short breaks from our phones helps me feel calmer and more focused.','Parents and schools should teach young people how to use social media wisely.','In my opinion, technology is useful, but balance is the real key.']],
 ['world','Clean water and food security','Millions of people still struggle to get safe food and water.',['Clean water and enough food are basic needs, but not everyone has them.','Droughts, wars and rising prices make the problem worse in many countries.','Wasting food at home and in restaurants is a problem we can all reduce.','Simple tools like water filters and better farming methods can save lives.','I think rich and poor countries should share knowledge and work together.']],
 ['world','Burnout and remote work','Working from home brought freedom and new stress.',['Remote work gave many people more time with their family and less travel.','However, it is hard to switch off when your office is also your living room.','Some employees feel lonely and work longer hours than they did before.','Clear schedules and regular breaks can protect our energy and health.','I believe flexible work is great when companies respect personal time.']],
 ['world','Fake news and misinformation','How do we know what is true online?',['False stories can spread across the internet faster than the real news.','Edited photos and videos make it harder to trust what we see.','Before sharing something, I always check who wrote it and where it came from.','Schools should teach critical thinking as an important life skill.','In my view, everyone is responsible for stopping the spread of false information.']],
 ['ai','Will AI take our jobs?','Some jobs will change, and new ones will appear.',['Artificial intelligence is already helping people write, design and analyse data.','Some routine jobs may disappear, but new kinds of work will be created.','People who learn to use AI tools well will have a big advantage.','Skills like creativity, empathy and clear communication will stay very valuable.','I think the best plan is to keep learning and treat AI as a helpful partner.']],
 ['ai','AI in the classroom','Should students be allowed to use AI for homework?',['Many students now ask AI tools to explain difficult lessons in simple words.','Used well, AI can act like a patient tutor that is available at any time.','The danger is that students may copy answers without really learning anything.','Teachers could ask more speaking tasks and projects that show real understanding.','I believe AI should support learning, not replace thinking.']],
 ['ai','AI-made art and music','Is a song or picture still creative if a machine helped?',['Today AI can create pictures, songs and even short films in a few seconds.','Some artists are excited, while others worry about losing their income.','I think the idea and the feeling behind the work still come from people.','It is important that artists receive credit and fair payment for their work.','In the future, I expect human creators and AI tools to work side by side.']],
 ['ai','Deepfakes and trust','Videos can now be faked so well that we doubt our eyes.',['Deepfake technology can make a person appear to say things they never said.','This can be used for fun, but it can also hurt people and spread lies.','We should check important videos from more than one trusted source.','Companies and governments need clear rules and good tools to detect fakes.','I think a careful and curious mindset is our best protection.']],
 ['ai','AI assistants in daily life','From planning meals to writing emails, AI is everywhere.',['I use digital assistants to set reminders, find directions and answer quick questions.','They save time, but sometimes they give answers that are not completely correct.','It is wise to double-check anything important, like health or money advice.','Privacy also matters, so I try not to share personal details with every app.','Overall, I like AI helpers as long as I stay in control.']],
 ['ai','Self-driving cars and robots','Machines are slowly moving into our streets and workplaces.',['Self-driving cars and delivery robots are being tested in several cities.','They could reduce accidents because machines do not get tired or distracted.','However, people worry about safety, jobs for drivers and who is responsible in a crash.','Clear laws and careful testing are needed before they become common.','I would try a self-driving car, but only after it proves it is safe.']],
 ['life','Digital detox weekends','More people are switching off their phones to relax.',['A digital detox means staying away from screens for a day or a weekend.','Many people say they sleep better and feel less stressed afterwards.','Instead of scrolling, they read, cook, walk or meet friends in person.','It is difficult at first, because we are used to checking our phones constantly.','I would like to try one phone-free day every week.']],
 ['life','Side hustles and freelancing','Lots of people now earn extra income online.',['Many people now have a side hustle in addition to their regular job.','They sell products, teach online or offer services like design and writing.','This can bring extra money and a chance to follow a personal passion.','The challenge is managing time without getting tired or losing focus.','I think starting small and learning step by step is the smartest way.']],
 ['life','Watching sports with friends','Big matches bring whole neighbourhoods together.',['Watching a big match with friends is one of my favourite ways to relax.','The excitement, the snacks and the loud celebrations make it a special experience.','Sports can bring people from different backgrounds together in one place.','Of course, we should respect the other team and enjoy the game peacefully.','Even when my team loses, I still enjoy the time with everyone.']],
 ['life','Travelling on a budget','Smart planning lets you see more for less.',['Travelling does not have to be expensive if you plan it carefully.','Booking early, using local transport and eating street food can save a lot of money.','Staying in simple hostels also helps you meet people from other countries.','The best memories often come from small, unplanned moments rather than luxury.','My dream is to explore a new country every year without spending too much.']],
 ['life','Learning new skills online','Free videos and courses make self-study easier than ever.',['These days you can learn almost anything online, from coding to cooking.','Short videos and free courses make it easy to practise a little every day.','The hardest part is staying motivated when there is no teacher watching.','Setting small goals and tracking progress keeps me going.','I believe consistent practice beats talent, especially when learning a language.']],
 ['life','Cooking at home again','Home-cooked meals are trending for health and savings.',['More people are cooking at home to save money and eat healthier food.','Simple recipes with fresh ingredients can be quick and delicious.','Cooking together with family is also a lovely way to spend an evening.','Sharing photos of our meals has become a popular hobby online.','I am slowly learning new dishes, and every small success makes me proud.']],
].map(([cat, title, blurb, lines]) => ({ cat, title, blurb, lines }));
const custom = (t) => [`Today I would like to talk about ${t}.`, `${t[0].toUpperCase() + t.slice(1)} is something many people think about these days.`, `One thing I notice is that it affects ordinary people in everyday life.`, `In my opinion, there are both good sides and difficult sides to this topic.`, `For example, my friends and I sometimes discuss it together.`, `To sum up, I think this topic is important, and I want to learn more about it.`];

/* ---------- topic picker ---------- */
let shown = [], seen = new Set(), loading = false;
function offlinePick() {
  const by = (c) => BANK.filter((t) => t.cat === c && !seen.has(t.title)), rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const out = [];
  for (const c of ['world', 'ai', 'life']) { let p = by(c); if (!p.length) { BANK.filter((t) => t.cat === c).forEach((t) => seen.delete(t.title)); p = by(c); } const t = rnd(p); out.push(t); seen.add(t.title); }
  const rest = BANK.filter((t) => !out.includes(t)); out.push(rnd(rest));
  return out.sort(() => Math.random() - .5);
}
async function fetchTopics(useAi) {
  if (useAi) { try { const r = await api('/api/ideas', { kind: 'topics', level: A.S.level, date: A.today() }); if (r.topics && r.topics.length >= 3) return { list: r.topics, ai: true }; } catch {} }
  return { list: offlinePick(), ai: false };
}
function renderPick(list, ai) {
  shown = list;
  $('#modalBody').innerHTML = `<h2>What do you want to talk about?</h2>
  <p class="muted">${ai ? 'Fresh ideas from your AI coach.' : 'Pick one of these themes people are discussing right now.'} Choose <b>Talk</b> to chat with ${esc(A.char.name)}, or <b>Solo</b> to just speak line by line.</p>
  <div class="tgrid">${list.map((t, i) => `<div class="tcard cat-${esc(t.cat)}" style="--i:${i}"><span class="tcat">${(CAT[t.cat] || CAT.life)[0]} ${(CAT[t.cat] || CAT.life)[1]}</span><b>${esc(t.title)}</b><small>${esc(t.blurb)}</small>
   <div class="tbtns"><button class="primary" data-a="talk" data-i="${i}">Talk</button><button class="ghost" data-a="solo" data-i="${i}">Solo</button></div></div>`).join('')}</div>
  <form id="tcForm" class="typed"><input id="tcIn" maxlength="100" placeholder="…or type your own topic"><button class="ghost" data-a="ctalk">Talk</button><button class="ghost" type="button" id="tcSolo">Solo</button></form>
  <div class="row"><button class="ghost" id="tcMore">Show 4 new ideas</button>${ai ? '' : '<small class="muted">Add an AI key in Settings for brand-new ideas every time.</small>'}<button class="ghost" id="tcClose">Close</button></div>`;
  $$('#modalBody .tbtns button').forEach((b) => (b.onclick = () => go(shown[+b.dataset.i], b.dataset.a)));
  $('#tcForm').onsubmit = (e) => { e.preventDefault(); const v = $('#tcIn').value.trim(); if (v) go({ title: v, custom: true }, 'talk'); };
  $('#tcSolo').onclick = () => { const v = $('#tcIn').value.trim(); if (v) go({ title: v, custom: true }, 'solo'); };
  $('#tcMore').onclick = () => pick(true);
  $('#tcClose').onclick = () => ($('#modal').hidden = true);
}
async function pick(more) {
  A.cancelAll(); A.stopListen();
  const m = $('#modal'); m.hidden = false;
  $('#modalBody').innerHTML = '<h2>Finding topics…</h2><div class="dots"><i></i><i></i><i></i></div>';
  const ai = !!(await api('/api/config').catch(() => ({}))).ai;
  const r = await fetchTopics(ai); renderPick(r.list, r.ai);
}
function go(t, mode) {
  $('#modal').hidden = true;
  if (solo.on) exitSolo();
  if (mode === 'solo') startSolo(t); else A.startConversation(t.title, false);
}

/* ---------- solo practice ---------- */
const solo = { on: false, topic: '', lines: [], i: 0, res: [], t0: 0, sec: 0, busy: false, id: '' };
const norm = (s) => String(s).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
const same = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1);
function align(target, heard) { // LCS → set of matched target indexes
  const n = target.length, m = heard.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = same(target[i], heard[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hit = new Set(); let i = 0, j = 0;
  while (i < n && j < m) { if (same(target[i], heard[j])) { hit.add(i); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return hit;
}
function ensureSolo() {
  if ($('#solo')) return;
  const d = document.createElement('div'); d.id = 'solo'; d.hidden = true;
  d.innerHTML = `<div class="solo-top"><button class="ghost" id="soBack">Back</button><b id="soTopic"></b><span class="spacer"></span><small id="soCount"></small></div>
  <div class="solo-bar"><i id="soFill"></i></div>
  <div class="solo-line" id="soLine"></div>
  <div class="solo-heard" id="soHeard">Press the mic and read the sentence out loud.</div>
  <div class="solo-ctrl"><button class="side" id="soHear">${(window.VocaIcons||{}).speaker||""}<span>Hear it</span></button><button class="mic" id="soMic" aria-label="Speak"><span class="mic-ico">${(window.VocaIcons||{}).mic||"🎤"}</span><span class="mic-wave"><i></i><i></i><i></i><i></i><i></i></span></button><button class="side" id="soSkip">${(window.VocaIcons||{}).skip||""}<span>Skip</span></button></div>
  <label class="chk solo-auto"><input type="checkbox" id="soAuto" checked> Auto-continue after a good line</label>
  <div class="solo-res" id="soRes"></div>`;
  $('.stage').appendChild(d);
  $('#soBack').onclick = exitSolo; $('#soMic').onclick = soloMic; $('#soSkip').onclick = () => nextLine(true);
  $('#soHear').onclick = () => { A.cancelAll(); A.speakRaw(solo.lines[solo.i], Math.min(A.S.rate, .9)); };
}
async function startSolo(t) {
  ensureSolo(); A.cancelAll(); A.stopListen();
  Object.assign(solo, { on: true, topic: t.title, i: 0, res: [], sec: 0, busy: false, id: 'solo' + Date.now(), lines: [] });
  $('.stage').classList.add('solo-on'); $('#solo').hidden = false;
  $('#topicLabel').textContent = t.title + ' · solo';
  $('#soTopic').textContent = t.title; $('#soLine').innerHTML = '<div class="dots"><i></i><i></i><i></i></div>'; $('#soRes').innerHTML = ''; $('#soHeard').textContent = 'Preparing your lines…';
  let lines = t.lines;
  if (!lines) {
    const ai = !!(await api('/api/config').catch(() => ({}))).ai;
    if (ai) { try { const r = await api('/api/ideas', { kind: 'lines', topic: t.title, level: A.S.level }); if (r.lines) lines = r.lines; } catch {} }
    if (!lines) lines = (BANK.find((b) => b.title === t.title) || {}).lines || custom(t.title.toLowerCase());
  }
  solo.lines = lines; showLine();
}
function exitSolo() {
  A.stopListen(); A.cancelAll(); saveSolo();
  solo.on = false; $('.stage').classList.remove('solo-on'); const s = $('#solo'); if (s) s.hidden = true;
  $('#topicLabel').textContent = 'Not chosen yet';
}
function showLine() {
  const line = solo.lines[solo.i]; if (line == null) return finishSolo();
  $('#soCount').textContent = `Line ${solo.i + 1} of ${solo.lines.length}`; $('#soFill').style.width = (solo.i / solo.lines.length * 100) + '%';
  $('#soLine').innerHTML = line.split(/\s+/).map((w, k) => `<span class="w" data-k="${k}">${esc(w)}</span>`).join(' ');
  $('#soHeard').textContent = 'Press the mic and read the sentence out loud.'; $('#soRes').innerHTML = '';
  $('#soMic').classList.remove('listening'); solo.busy = false; solo.t0 = Date.now();
}
function paint(hit, done) {
  $$('#soLine .w').forEach((el) => { const k = +el.dataset.k; el.classList.toggle('ok', hit.has(k)); el.classList.toggle('miss', done && !hit.has(k)); });
}
async function soloMic() {
  if (solo.busy) { A.stopListen(); return; }
  A.cancelAll(); solo.busy = true; $('#soMic').classList.add('listening'); $('#soRes').innerHTML = '';
  const line = solo.lines[solo.i], target = norm(line); let stopT = 0;
  let res;
  try {
    res = await A.listen({ silenceMs: 2600, onInterim: (f, i) => {
      const heard = norm(f + ' ' + i), hit = align(target, heard); paint(hit, false);
      $('#soHeard').textContent = '“' + (f + ' ' + i).trim() + '”';
      if (hit.size === target.length && !stopT) stopT = setTimeout(() => A.stopListen(), 700);
    } });
  } catch (e) { clearTimeout(stopT); solo.busy = false; $('#soMic').classList.remove('listening'); return A.toast(/not-allowed|denied/i.test(e.message || e.error || '') ? 'Microphone blocked — allow it in the address bar and use Chrome/Edge.' : 'Microphone problem — use Chrome or Edge on https.'); }
  clearTimeout(stopT); solo.busy = false; $('#soMic').classList.remove('listening');
  const heard = norm(res.text || ''), hit = align(target, heard), acc = Math.round(hit.size / target.length * 100);
  const sec = Math.max(1, res.durationSec || (Date.now() - solo.t0) / 1000), wpm = Math.round(hit.size / (sec / 60));
  solo.sec += Math.min(60, sec + 3); paint(hit, true);
  const missed = target.filter((_, k) => !hit.has(k));
  solo.res[solo.i] = { acc, wpm, missed };
  if (!heard.length) { $('#soHeard').textContent = 'I could not hear anything — check your microphone and try again.'; return; }
  const good = acc >= 80, pace = wpm < 90 ? 'a little slow — try to keep the words flowing' : wpm > 190 ? 'quite fast — slow down and pronounce clearly' : 'a natural pace 👌';
  $('#soRes').innerHTML = `<div class="sres ${good ? 'good' : 'try'}"><b>${good ? (acc === 100 ? 'Perfect!' : 'Nice!') : 'Almost — try once more'}</b> <span>${acc}% of the words</span> · <span>${wpm} words/min — ${pace}</span>
   ${missed.length ? `<div class="smiss">Missed or unclear: ${missed.slice(0, 8).map((w) => `<button class="chipw" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
   <div class="sbtns"><button class="ghost" id="soRetry">Retry</button><button class="primary" id="soNext">${solo.i + 1 >= solo.lines.length ? 'Finish ✔' : 'Next line ➜'}</button></div></div>`;
  $$('#soRes .chipw').forEach((b) => (b.onclick = () => A.speakRaw(b.dataset.w, .8)));
  $('#soRetry').onclick = () => { $$('#soLine .w').forEach((e) => e.classList.remove('ok', 'miss')); $('#soRes').innerHTML = ''; soloMic(); };
  $('#soNext').onclick = () => nextLine(false);
  if (good && $('#soAuto').checked) { solo.auto = setTimeout(() => { if (solo.on && solo.res[solo.i] === solo.res[solo.i] && $('#soNext')) nextLine(false); }, 1800); }
}
function nextLine(skip) { clearTimeout(solo.auto); A.stopListen(); if (skip && !solo.res[solo.i]) solo.res[solo.i] = null; solo.i++; showLine(); if (solo.on && solo.i < solo.lines.length && $('#soAuto').checked && !skip) setTimeout(() => solo.on && !solo.busy && soloMic().catch(() => {}), 500); }
function saveSolo() {
  const done = solo.res.filter(Boolean); if (!done.length) return;
  const words = done.reduce((a, r) => a + 0, 0), avg = (k) => Math.round(done.reduce((a, r) => a + r[k], 0) / done.length);
  const wcount = solo.lines.slice(0, solo.i).reduce((a, l) => a + norm(l).length, 0);
  api('/api/session', { id: solo.id, kind: 'solo', date: A.today(), topic: solo.topic, activeSec: Math.round(solo.sec), words: wcount, turns: done.length, wpm: avg('wpm'), avgScore: avg('acc'), counts: { grammar: 0, pron: 0, vocab: 0, natural: 0, fillers: 0 } }).then(() => A.loadProgress && A.loadProgress()).catch(() => {});
  const miss = {}; done.forEach((r) => r.missed.forEach((w) => (miss[w] = 1)));
  const items = Object.keys(miss).slice(0, 15).map((w) => ({ type: 'pron', word: w, tip: 'Missed while reading aloud in Solo practice' }));
  if (items.length) api('/api/notebook', { items, date: A.today() }).catch(() => {});
}
function finishSolo() {
  A.stopListen(); const done = solo.res.filter(Boolean); saveSolo();
  const acc = done.length ? Math.round(done.reduce((a, r) => a + r.acc, 0) / done.length) : 0, wpm = done.length ? Math.round(done.reduce((a, r) => a + r.wpm, 0) / done.length) : 0;
  const miss = {}; done.forEach((r) => r.missed.forEach((w) => (miss[w] = (miss[w] || 0) + 1)));
  $('#soFill').style.width = '100%'; $('#soCount').textContent = 'Done!';
  $('#soLine').innerHTML = `<div class="sumbig">${acc >= 85 ? 'Excellent flow!' : acc >= 60 ? 'Good work!' : 'Nice start — practise again!'}</div>`;
  $('#soHeard').innerHTML = `Accuracy <b>${acc}%</b> · Speed <b>${wpm}</b> words/min · Lines <b>${done.length}/${solo.lines.length}</b>`;
  $('#soRes').innerHTML = `<div class="sres good">${Object.keys(miss).length ? `<div class="smiss">Words to practise: ${Object.keys(miss).slice(0, 10).map((w) => `<button class="chipw" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : '<b>No missed words — fantastic!</b>'}
   <div class="sbtns"><button class="ghost" id="soAgain">Again</button><button class="primary" id="soNew">New topic</button></div></div>`;
  $$('#soRes .chipw').forEach((b) => (b.onclick = () => A.speakRaw(b.dataset.w, .8)));
  $('#soAgain').onclick = () => startSolo({ title: solo.topic, lines: solo.lines });
  $('#soNew').onclick = () => { exitSolo(); pick(); };
  solo.i = solo.lines.length; try { window.confetti && window.confetti(); } catch {}
}

/* ---------- entry points ---------- */
function addButtons() {
  const c = $('.controls'); if (!c || $('#soloBtn')) return;
  const b = document.createElement('button'); b.className = 'side'; b.id = 'soloBtn'; b.title = 'Solo practice: just read and speak, no conversation'; b.innerHTML = '<span>Solo</span>';
  b.onclick = () => pick(); c.insertBefore(b, $('#skipBtn'));
  const s = $('#surpriseBtn'); if (s) s.innerHTML = '<span>Topics</span>';
  const h = $('#hint'); if (h) h.dataset.x = '1';
}
addButtons();
window.VocaModes = { pick, startSolo };
})();
