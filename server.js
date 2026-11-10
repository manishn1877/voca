'use strict';
/* English Coach backend — zero dependencies (Node 18+).
   Run:  node server.js     then open http://localhost:3000 in Chrome or Edge. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { analyze, summarize, fallbackReply, randomTopic } = require('./public/lib/analyzer');
const { charReply } = require('./public/lib/persona');
const CH = require('./public/lib/characters');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const DATA = path.join(__dirname, 'data');
const PUB = path.join(__dirname, 'public');
fs.mkdirSync(DATA, { recursive: true });
const PROG_FILE = path.join(DATA, 'progress.json');
const CONF_FILE = path.join(DATA, 'config.json');

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJSON = (f, o) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o, null, 2)); fs.renameSync(t, f); };

let conf = readJSON(CONF_FILE, {});
let prog = readJSON(PROG_FILE, { sessions: [], notebook: [], settings: { goalMin: 10 } });
let lastAiError = null;

const apiKey = () => process.env.ANTHROPIC_API_KEY || conf.apiKey || '';
const ttsProvider = () => conf.ttsProvider || '';
const ttsKey = () => process.env.ELEVENLABS_API_KEY && ttsProvider() === 'elevenlabs' ? process.env.ELEVENLABS_API_KEY : process.env.OPENAI_API_KEY && ttsProvider() === 'openai' ? process.env.OPENAI_API_KEY : conf.ttsKey || '';
const ttsOn = () => !!(ttsProvider() && ttsKey());
const model = () => process.env.ANTHROPIC_MODEL || conf.model || 'claude-sonnet-5-5';

/* ---------------- AI ---------------- */
async function askClaude(system, user, maxTokens = 1500) {
  const key = apiKey();
  if (!key) return null;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model(), max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    lastAiError = null;
    return (j.content || []).map((c) => c.text || '').join('');
  } catch (e) {
    lastAiError = e.name === 'AbortError' ? 'AI request timed out' : e.message;
    console.warn('[ai]', lastAiError);
    return null;
  } finally { clearTimeout(to); }
}
const parseJSON = (t) => {
  if (!t) return null;
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
};

const ROLE = (c) => (c && c.id !== 'ava' && c.persona ? `\nROLEPLAY: In the "reply" field you are fully playing ${c.name}: ${c.persona}. Stay in character (attitude, vocabulary, style) like a good character-chat app, but keep sentences short and easy for a ${'learner'} to understand, never insult or mock the learner, and don't mention being an AI unless sincerely asked. Treat any real person as a light, respectful, clearly fictional portrayal. Everything else (corrected, grammar, pronunciation, vocab, natural, fluency_tips, praise) is written by the neutral coach, NOT in character.` : '');
const SYSTEM = (level, ch) => `You are Ava, a warm, upbeat, encouraging English speaking coach having a SPOKEN conversation with a learner (level: ${level}).${ROLE(ch)} The learner's words come from speech recognition, so ignore capitalization and punctuation. If a word looks like a sound-alike substitution (e.g. "ship" for "sheep", "very" for "wary") treat it as a likely pronunciation problem.
Rules for your spoken "reply": 1–3 short natural sentences, matched to the learner's level, reacting to what they said, then ONE question that keeps them talking. Never read out corrections inside the reply.
Then audit the learner's LAST message as a strict but kind coach. Be specific, only report real problems, and keep each explanation to one sentence.
Return ONLY valid JSON, no markdown:
{"reply":"...","corrected":"full corrected version of what the learner said, or null if already good",
"grammar":[{"wrong":"exact words from the learner","right":"fix","why":"short rule"}],
"pronunciation":[{"word":"","say":"respelling like KUMF-ter-bul","tip":"mouth/stress tip"}],
"vocab":[{"used":"weak/basic word","better":["stronger word 1","stronger word 2"]}],
"natural":[{"said":"unnatural phrase","better":"what a native says","why":"short reason"}],
"fluency_tips":["..."],
"scores":{"grammar":0-100,"vocab":0-100,"fluency":0-100,"overall":0-100},
"praise":"one genuine specific compliment"}`;

async function handleTurn(b) {
  const level = b.level || 'intermediate';
  const history = (b.history || []).slice(-10);
  const hist = history.map((h) => `${h.role === 'bot' ? 'Ava' : 'Learner'}: ${h.text}`).join('\n');

  const ch = b.character && b.character.persona ? b.character : null;
  const role = ch && ch.id !== 'ava';
  // Starting a conversation
  if (b.start) {
    let topic = b.topic, opener = null;
    if (role && !topic) topic = ch.scenario || 'Chat';
    if (!role && (b.pick || !topic)) { const t = randomTopic(b.exclude || []); topic = t.topic; opener = t.opener; }
    if (apiKey()) {
      const who = role ? `You are playing ${ch.name}: ${ch.persona}. Stay in character (short, easy English).` : 'You are Ava, a friendly English speaking coach.';
      const out = await askClaude(
        `${who} Reply with ONLY JSON: {"topic":"short topic title","reply":"..."}. "reply" is spoken aloud: greet briefly${role ? ' in character' : ', say what you\'ll talk about'}, then ask ONE engaging opening question. 2–3 short sentences, learner level: ${level}.`,
        `Topic/scenario: ${topic}${b.pick ? ' (you chose it; keep it fun)' : ''}`, 400);
      const j = parseJSON(out);
      if (j?.reply) return { topic: j.topic || topic, reply: j.reply, source: 'ai' };
    }
    if (role) return { topic, reply: ch.opener || `Hello! I'm ${ch.name}. Let's talk about ${topic.toLowerCase()}. What would you like to say first?`, source: 'local' };
    return { topic, reply: `Hi, I'm Ava! Let's talk about ${topic.toLowerCase()}. ${opener || 'To start, what are your first thoughts on this topic?'}`, source: 'local' };
  }

  const local = analyze(b.text, { durationSec: b.durationSec || 0, confidence: b.confidence ?? null });
  if (apiKey()) {
    const user = `Topic: ${b.topic || 'free talk'}\nConversation so far:\n${hist}\n\nLearner's LAST message (${local.words} words${local.fluency.wpm ? ', ' + local.fluency.wpm + ' wpm' : ''}${b.confidence != null ? ', recogniser confidence ' + Math.round(b.confidence * 100) + '%' : ''}):\n"${b.text}"`;
    const j = parseJSON(await askClaude(SYSTEM(level, ch), user));
    if (j?.reply) return { reply: j.reply, report: mergeReport(local, j), source: 'ai' };
  }
  return { reply: charReply({ character: ch || { name: 'Ava', mood: 'warm' }, text: b.text, history, topic: b.topic }), report: local, source: 'local', aiError: apiKey() ? lastAiError : null };
}

function mergeReport(local, ai) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const grammar = arr(ai.grammar).filter((g) => g?.wrong && g?.right).map((g) => ({ type: 'grammar', wrong: g.wrong, right: g.right, why: g.why || '' }));
  const pr = [...arr(ai.pronunciation).filter((p) => p?.word).map((p) => ({ type: 'pron', word: p.word, say: p.say || '', tip: p.tip || '' }))];
  for (const p of local.pronunciation) if (!pr.some((x) => x.word.toLowerCase() === p.word)) pr.push(p);
  const fl = { ...local.fluency, tips: [...new Set([...local.fluency.tips, ...arr(ai.fluency_tips)])].slice(0, 4) };
  const sc = ai.scores || {};
  const num = (v, d) => (Number.isFinite(+v) ? Math.max(0, Math.min(100, Math.round(+v))) : d);
  return {
    ...local,
    corrected: ai.corrected && ai.corrected !== local.text ? ai.corrected : (grammar.length ? local.corrected : null),
    grammar: grammar.length || arr(ai.grammar).length === 0 ? grammar : local.grammar,
    natural: arr(ai.natural).filter((n) => n?.said).map((n) => ({ type: 'natural', said: n.said, better: n.better, why: n.why || '' })),
    vocab: arr(ai.vocab).filter((v) => v?.used).map((v) => ({ type: 'vocab', used: v.used, better: arr(v.better) })),
    pronunciation: pr, fluency: fl,
    scores: { grammar: num(sc.grammar, local.scores.grammar), vocab: num(sc.vocab, local.scores.vocab), fluency: num(sc.fluency, local.scores.fluency), pronunciation: local.scores.pronunciation, overall: num(sc.overall, local.scores.overall) },
    praise: ai.praise || local.praise,
  };
}

async function handleSummary(b) {
  const base = summarize(b.reports || []);
  if (apiKey() && (b.reports || []).length) {
    const compact = b.reports.map((r) => ({ said: r.text, grammar: (r.grammar || []).map((g) => `${g.wrong} -> ${g.right}`), pron: (r.pronunciation || []).map((p) => p.word), fillers: r.fluency?.fillers, wpm: r.fluency?.wpm }));
    const j = parseJSON(await askClaude(
      'You are Ava, an English speaking coach. Given a practice session, return ONLY JSON {"summary":"2-3 warm, specific sentences","priorities":["top 3-5 things to fix, most important first"],"homework":["2-3 concrete tasks for tomorrow"]}.',
      JSON.stringify(compact).slice(0, 12000), 700));
    if (j) return { ...base, summary: j.summary, priorities: j.priorities?.length ? j.priorities : base.priorities, homework: j.homework?.length ? j.homework : base.homework, source: 'ai' };
  }
  return { ...base, summary: `You spoke ${base.words} words${base.avgWpm ? ` at about ${base.avgWpm} words per minute` : ''}. Here is what to focus on next.`, source: 'local' };
}


async function handleCharacter(b) {
    const d = String(b.description || '').trim().slice(0, 200);
    if (!d) return { error: 'empty', message: 'Tell me who to be.' };
    const preset = CH.matchPreset(d);
    if (apiKey()) {
      const j = parseJSON(await askClaude(
        `You design roleplay characters for an English-speaking practice app (like a character chat app). The learner asks for a character. IMPORTANT: if the request names an existing, specific character from anime, manga, games, films, TV or books (or a real celebrity), do NOT recreate that character's name, appearance or exact personality: instead invent a NEW ORIGINAL character with a new name that only shares the general archetype or mood (e.g. 'mysterious charming café girl', 'ruthless pirate captain'). Never use the original name or its signature design features. Reply ONLY JSON. If the request is hateful, sexual, or harmful, return {"error":"refuse","message":"short friendly reason"}. Otherwise return {"name":"display name","tagline":"max 6 words","scenario":"short scene title for the chat","persona":"2-3 sentences: personality, speaking style, attitude, what they love to talk about","opener":"their first spoken line (1-2 short sentences) ending in ONE question","theme":"petals|stars|notes|embers|snow|bubbles|leaves|hearts|none","voice":{"gender":"m|f","pitch":0.5-1.6 (deeper=lower),"rate":0.7-1.3,"accent":"US|UK|AU|IN"},"look":{"style":"anime|real (anime if the request sounds anime/manga, else real)","skin":"#hex","hair":"#hex","hairStyle":"long|short|bald|bun|curly|spiky|messy|bob|twintails|ponytail","bg":["#hex dark-ish scene color 1","#hex 2"],"outfit":"#hex","eyes":"#hex","lips":"#hex","acc":["0-3 of: bowtie,catears,elfears,horns,goggles,star,glasses,beard,mustache,hat,cap,bandana,eyepatch,headset,stethoscope,ruff,tie,earrings,ribbon,hairpin,headphones,scarf"]}}. The look is a GENERIC illustrated persona suggesting the character through costume/colors, never a real person's likeness. For real people or famous fictional characters, play a light, respectful, clearly fictional take with easy English.`,
        `Character requested: ${d}`, 900));
      if (j?.error) return { error: 'refuse', message: j.message || "I can't play that one — try another character!" };
      if (j?.persona) return { character: CH.sanitize(j) };
      if (preset) return { character: preset, note: 'AI was unavailable, used the closest ready-made character.' };
      return { error: 'ai_failed', message: 'The AI could not build that character right now' + (lastAiError ? ' (' + lastAiError.slice(0, 80) + ')' : '') + '. Try again.' };
    }
    if (preset) return { character: preset, note: 'Closest ready-made character (custom characters need the AI key).' };
    return { error: 'needs_ai', message: 'Custom characters need the AI key (Progress → Settings). For now pick one of the ready-made characters.' };
}

/* ---------------- Realistic character voices (optional cloud TTS) ---------------- */
const OAI = { deepM: 'onyx', m: ['echo', 'fable', 'ash', 'onyx'], f: ['nova', 'shimmer', 'alloy', 'coral'] };
const ELV = { deepM: 'pNInz6obpgDQGcFmaJgB', m: ['TxGEqnHWrfWFTfGW9XjX', 'ErXwobaYiN019PkySvjV', 'VR6AewLTigWG4xSOukaG', 'pNInz6obpgDQGcFmaJgB'], f: ['21m00Tcm4TlvDq8ikWAM', 'EXAVITQu4vr4xnSDxMaL', 'AZnzlk1XvdvUeBnXmlld', 'MF3mGyEYCl7XYWbV9V6O'] };
function voicePick(tbl, ch) {
  const v = ch.voice || {}, g = v.gender === 'm' ? 'm' : 'f';
  if (g === 'm' && (v.pitch || 1) < 0.85) return tbl.deepM;
  const h = [...String(ch.id || '') + String(ch.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return tbl[g][h % tbl[g].length];
}
async function synthesize(text, ch) {
  const prov = ttsProvider(), key = ttsKey();
  text = String(text || '').slice(0, 700);
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 30000);
  try {
    let r;
    if (prov === 'openai') {
      const style = ch.id === 'ava' ? 'Warm, upbeat, clear English coach.' : `Act as ${ch.name}: ${String(ch.persona || '').slice(0, 300)}. Expressive, natural, ${ch.anime ? 'lively anime-style delivery' : 'in-character delivery'}. Keep it clear for an English learner.`;
      r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: voicePick(OAI, ch), input: text, instructions: style, response_format: 'mp3' }) });
    } else if (prov === 'elevenlabs') {
      r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voicePick(ELV, ch)}?output_format=mp3_44100_128`, { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json', 'xi-api-key': key },
        body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5', voice_settings: { stability: ch.anime ? 0.35 : 0.5, similarity_boost: 0.75, style: ch.anime ? 0.5 : 0.25, use_speaker_boost: true } }) });
    } else throw new Error('No voice service configured');
    if (!r.ok) throw new Error(`${prov} ${r.status}: ${(await r.text()).slice(0, 160)}`);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(to); }
}

/* ---------------- Progress / streaks ---------------- */
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

function computeProgress(today) {
  const goal = (prog.settings?.goalMin || 10) * 60;
  const secs = {};
  for (const s of prog.sessions) secs[s.date] = (secs[s.date] || 0) + (s.activeSec || 0);
  const dates = Object.keys(secs).sort();
  let streak = 0, best = 0, freezes = 0, frozen = [];
  if (dates.length) {
    for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
      if ((secs[d] || 0) >= goal) { streak++; if (streak % 7 === 0) freezes = Math.min(2, freezes + 1); best = Math.max(best, streak); }
      else if (d === today) { /* today still open */ }
      else if (freezes > 0 && streak > 0) { freezes--; frozen.push(d); }
      else streak = 0;
    }
  }
  const days = [];
  for (let i = 27; i >= 0; i--) { const d = addDays(today, -i); days.push({ date: d, sec: Math.round(secs[d] || 0), met: (secs[d] || 0) >= goal, frozen: frozen.includes(d) }); }
  const real = prog.sessions.filter((s) => s.kind !== 'drill');
  const last = real.slice(-30).map((s) => ({ date: s.date, wpm: s.wpm || null, score: s.avgScore || null }));
  const sum = (f) => prog.sessions.reduce((a, s) => a + (f(s) || 0), 0);
  return {
    today, goalMin: prog.settings?.goalMin || 10, todaySec: Math.round(secs[today] || 0),
    streak, best, freezes, days, trend: last,
    totals: { minutes: Math.round(sum((s) => s.activeSec) / 60), sessions: real.length, words: sum((s) => s.words), activeDays: dates.length },
    notebook: prog.notebook.slice().sort((a, b) => b.count - a.count || (b.last > a.last ? 1 : -1)).slice(0, 60),
  };
}

function upsertSession(s) {
  if (!s?.id || !s.date) return;
  const rec = { id: String(s.id).slice(0, 60), date: s.date, kind: s.kind || 'chat', topic: String(s.topic || '').slice(0, 120), activeSec: Math.max(0, Math.min(+s.activeSec || 0, 4 * 3600)), words: +s.words || 0, turns: +s.turns || 0, wpm: s.wpm || null, avgScore: s.avgScore || null, counts: s.counts || {} };
  const i = prog.sessions.findIndex((x) => x.id === rec.id);
  if (i >= 0) prog.sessions[i] = rec; else prog.sessions.push(rec);
  if (prog.sessions.length > 3000) prog.sessions = prog.sessions.slice(-3000);
  writeJSON(PROG_FILE, prog);
}
function addNotebook(items, date) {
  for (const it of (items || []).slice(0, 30)) {
    const key = `${it.type}|${String(it.key || it.wrong || it.word || '').toLowerCase()}`;
    if (!key.endsWith('|')) {
      let e = prog.notebook.find((x) => x.key === key);
      if (!e) { e = { key, type: it.type, wrong: it.wrong || it.word || '', right: it.right || it.say || '', why: it.why || it.tip || '', count: 0, first: date, last: date }; prog.notebook.push(e); }
      e.count++; e.last = date; if (it.right) e.right = it.right;
    }
  }
  if (prog.notebook.length > 400) prog.notebook = prog.notebook.sort((a, b) => b.count - a.count).slice(0, 400);
  writeJSON(PROG_FILE, prog);
}

/* ---------- ideas: fresh topics + read-aloud lines (AI when a key exists; client has an offline bank) ---------- */
async function handleIdeas(b) {
  const lvl = ['beginner', 'intermediate', 'advanced'].includes(b.level) ? b.level : 'intermediate';
  const sys = 'You write short spoken-English practice material. Reply with JSON only, no markdown.';
  if (b.kind === 'lines') {
    const t = String(b.topic || '').slice(0, 120); if (!t) return { source: 'offline' };
    const j = parseJSON(await askClaude(sys, `Topic: "${t}". Write 6 natural, speakable sentences about it for an English learner at ${lvl} level (10-18 words each, no jargon, each a complete thought, easy to read aloud, ordered like a mini speech). JSON: {"lines":["..."]}`, 700));
    if (j && Array.isArray(j.lines) && j.lines.length >= 3) return { source: 'ai', lines: j.lines.slice(0, 8).map((x) => String(x).slice(0, 220)) };
    return { source: 'offline' };
  }
  const j = parseJSON(await askClaude(sys, `Today is ${String(b.date || '').slice(0, 10)}. Suggest 4 DIFFERENT things people are talking about right now that a learner could discuss in English: one world problem, one AI/technology development, one everyday current activity or trend, and one more of your choice. Stay general and factual — do not invent specific news, numbers or quotes. For each give a short title (max 6 words), a one-sentence blurb, and 5 sentences (10-18 words, ${lvl} level) to read aloud as a mini speech. JSON: {"topics":[{"cat":"world|ai|life","title":"","blurb":"","lines":["","","","",""]}]}`, 1800));
  if (j && Array.isArray(j.topics) && j.topics.length >= 2) return { source: 'ai', topics: j.topics.slice(0, 4).map((t) => ({ cat: ['world', 'ai', 'life'].includes(t.cat) ? t.cat : 'life', title: String(t.title || '').slice(0, 60), blurb: String(t.blurb || '').slice(0, 160), lines: (t.lines || []).slice(0, 8).map((x) => String(x).slice(0, 220)) })).filter((t) => t.title && t.lines.length >= 3) };
  return { source: 'offline' };
}

/* ---------------- HTTP ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, code, obj) => { const b = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(b); };
const body = (req) => new Promise((ok, no) => { let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e6) { req.destroy(); no(new Error('too big')); } }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { no(e); } }); });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && u.pathname === '/api/config') return send(res, 200, { ai: !!apiKey(), model: model(), aiError: lastAiError, tts: ttsOn(), ttsProvider: ttsProvider() });
      if (req.method === 'GET' && u.pathname === '/api/characters') return send(res, 200, { characters: CH.PRESETS });
      if (req.method === 'GET' && u.pathname === '/api/topics') { const o = []; for (let i = 0; i < 6; i++) o.push(randomTopic(o).topic); return send(res, 200, { topics: o }); }
      if (req.method === 'GET' && u.pathname === '/api/progress') return send(res, 200, computeProgress(u.searchParams.get('today') || new Date().toISOString().slice(0, 10)));
      if (req.method === 'POST') {
        const b = await body(req);
        if (u.pathname === '/api/turn') return send(res, 200, await handleTurn(b));
        if (u.pathname === '/api/character') return send(res, 200, await handleCharacter(b));
        if (u.pathname === '/api/ideas') return send(res, 200, await handleIdeas(b));
        if (u.pathname === '/api/summary') return send(res, 200, await handleSummary(b));
        if (u.pathname === '/api/session') { upsertSession(b); return send(res, 200, computeProgress(b.date)); }
        if (u.pathname === '/api/notebook') { addNotebook(b.items, b.date); return send(res, 200, { ok: true }); }
        if (u.pathname === '/api/settings') { if (b.goalMin) { prog.settings.goalMin = Math.max(1, Math.min(240, +b.goalMin)); writeJSON(PROG_FILE, prog); } return send(res, 200, { ok: true }); }
        if (u.pathname === '/api/key') {
          if (b.apiKey !== undefined) { conf.apiKey = String(b.apiKey || '').trim(); lastAiError = null; }
          if (b.model) conf.model = b.model;
          if (b.ttsProvider !== undefined) conf.ttsProvider = ['openai', 'elevenlabs'].includes(b.ttsProvider) ? b.ttsProvider : '';
          if (b.ttsKey !== undefined) conf.ttsKey = String(b.ttsKey || '').trim();
          writeJSON(CONF_FILE, conf); return send(res, 200, { ai: !!apiKey(), tts: ttsOn(), ttsProvider: ttsProvider() });
        }
        if (u.pathname === '/api/tts') {
          if (!ttsOn()) return send(res, 400, { error: 'Voice service not configured' });
          try { const buf = await synthesize(b.text, b.character || {}); res.writeHead(200, { 'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'content-length': buf.length }); return res.end(buf); }
          catch (e) { console.warn('[tts]', e.message); return send(res, 502, { error: e.message }); }
        }
      }
      return send(res, 404, { error: 'not found' });
    }
    // static
    let p = decodeURIComponent(u.pathname); if (p === '/') p = '/index.html';
    const f = path.normalize(path.join(PUB, p));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(e); send(res, 500, { error: String(e.message || e) }); }
});
server.listen(PORT, HOST, () => console.log(`\n  English Coach running →  http://localhost:${PORT}\n  AI coaching: ${apiKey() ? 'ON (' + model() + ')' : 'OFF (offline rules mode — add a key in Settings for full AI feedback)'}\n`));
