/* Voca online helpers — all run directly from the browser (CORS, no secret keys, no backend):
   - LanguageTool public API  (grammar)            https://api.languagetool.org/v2/check
   - Free Dictionary API      (meaning + phonetics) https://api.dictionaryapi.dev
   - Transformers.js          (optional neural grammar model, cached in the browser)
   Every helper fails silently and falls back to the built-in rules. */
(function (root) {
  'use strict';
  const CFG_KEY = 'ava.ext';
  const DEF = { lt: true, dict: true, neural: false };
  let cfg = null;
  function getCfg() {
    if (cfg) return cfg;
    let s = {}; try { s = JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { s = {}; }
    cfg = Object.assign({}, DEF, s); return cfg;
  }
  function setCfg(o) { cfg = Object.assign({}, getCfg(), o); try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* blocked */ } return cfg; }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------------- LanguageTool ---------------- */
  const LT_URL = 'https://api.languagetool.org/v2/check';
  const LT_KEEP = /^(GRAMMAR|CONFUSED_WORDS|NONSTANDARD_PHRASES|COLLOCATIONS)$/;
  const LT_SKIP_RULE = /^(WHITESPACE_RULE|COMMA_PARENTHESIS_WHITESPACE|UPPERCASE_SENTENCE_START|I_LOWERCASE|SENTENCE_WHITESPACE|EN_QUOTES|MORFOLOGIK_RULE.*|PUNCTUATION_PARAGRAPH_END|CONSECUTIVE_SPACES)$/;
  const ltCache = new Map(); let ltFails = 0, ltBlockedUntil = 0;
  async function ltCheck(text) {
    if (ltCache.has(text)) return ltCache.get(text);
    if (Date.now() < ltBlockedUntil) return [];
    const body = new URLSearchParams({ text, language: 'en-US', level: 'default' });
    try {
      const r = await withTimeout(fetch(LT_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body }), 3500);
      if (r.status === 429) { ltBlockedUntil = Date.now() + 60000; return []; }
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json(); ltFails = 0;
      const m = (j.matches || []);
      if (ltCache.size > 50) ltCache.clear(); ltCache.set(text, m); return m;
    } catch (e) { if (++ltFails >= 3) { ltBlockedUntil = Date.now() + 120000; ltFails = 0; } return []; }
  }
  /* returns {text, items} — text with LanguageTool's grammar fixes applied */
  async function ltImprove(text, opt) {
    if (!getCfg().lt || !text || text.length < 6 || text.length > 900) return { text, items: [] };
    const ms = await ltCheck(text); const items = []; let out = text;
    const picked = ms.filter((m) => m.replacements && m.replacements.length && m.rule && !LT_SKIP_RULE.test(m.rule.id) && LT_KEEP.test((m.rule.category && m.rule.category.id) || '')).sort((a, b) => b.offset - a.offset);
    let lastStart = Infinity;
    for (const m of picked) {
      if (m.offset + m.length > lastStart) continue; // overlapping
      const wrong = text.slice(m.offset, m.offset + m.length), right = m.replacements[0].value;
      if (!right || norm(wrong) === norm(right)) continue;
      if (opt && opt.ignored && opt.ignored(wrong, right, m.message)) continue;
      out = out.slice(0, m.offset) + right + out.slice(m.offset + m.length); lastStart = m.offset;
      items.unshift({ type: 'grammar', wrong: wrong.trim(), right: right.trim(), why: (m.shortMessage || m.message || 'Grammar').replace(/<[^>]+>/g, '') + ' · LanguageTool' });
    }
    return { text: out, items };
  }

  /* ---------------- Free Dictionary ---------------- */
  const DK = 'ava.dict'; let dc = null; const inflight = new Map();
  const dload = () => { if (dc) return dc; try { dc = JSON.parse(localStorage.getItem(DK) || '{}') || {}; } catch (e) { dc = {}; } return dc; };
  const dsave = () => { try { const k = Object.keys(dc); if (k.length > 120) k.slice(0, k.length - 120).forEach((x) => delete dc[x]); localStorage.setItem(DK, JSON.stringify(dc)); } catch (e) { /* blocked */ } };
  async function define(word) {
    word = String(word || '').toLowerCase().replace(/[^a-z'-]/g, ''); if (!word || !getCfg().dict) return null;
    const c = dload(); if (c[word] !== undefined) return c[word];
    if (inflight.has(word)) return inflight.get(word);
    const p = (async () => {
      try {
        const r = await withTimeout(fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word)), 4000);
        if (r.status === 404) { c[word] = null; dsave(); return null; }
        if (!r.ok) return null;
        const j = await r.json(); const e = j[0]; if (!e) return null;
        const ph = (e.phonetics || []).find((x) => x.audio && x.text) || (e.phonetics || []).find((x) => x.audio) || (e.phonetics || [])[0] || {};
        const res = { word: e.word || word, phonetic: e.phonetic || ph.text || '', audio: ph.audio || '', meanings: (e.meanings || []).slice(0, 2).map((m) => ({ pos: m.partOfSpeech, def: m.definitions && m.definitions[0] && m.definitions[0].definition, ex: m.definitions && m.definitions[0] && m.definitions[0].example })) };
        c[word] = res; dsave(); return res;
      } catch (e) { return null; } finally { inflight.delete(word); }
    })();
    inflight.set(word, p); return p;
  }

  /* ---------------- Transformers.js (optional, cached by the browser) ---------------- */
  const TJS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2';
  const MODEL = 'Xenova/t5-base-grammar-correction';
  const N = { state: 'idle', pipe: null, msg: '' };
  let nlisten = [];
  const nset = (state, msg) => { N.state = state; N.msg = msg || ''; nlisten.forEach((f) => { try { f(N); } catch (e) { /* ignore */ } }); };
  async function neuralLoad() {
    if (N.pipe) return N.pipe; if (N.state === 'loading') return null;
    nset('loading', 'Starting…');
    try {
      const mod = await import(/* @vite-ignore */ TJS);
      const files = {};
      N.pipe = await mod.pipeline('text2text-generation', MODEL, {
        progress_callback: (p) => {
          if (p && p.file && p.total) { files[p.file] = [p.loaded || 0, p.total]; }
          let l = 0, t = 0; for (const k in files) { l += files[k][0]; t += files[k][1]; }
          nset('loading', t ? 'Downloading… ' + Math.round((l / t) * 100) + '% (' + Math.round(t / 1048576) + ' MB)' : 'Loading…');
        },
      });
      nset('ready', 'Neural model ready'); return N.pipe;
    } catch (e) { N.pipe = null; nset('error', 'Could not load the model (' + (e && e.message ? e.message : e) + ')'); return null; }
  }
  async function neuralFix(text) {
    if (!N.pipe || !getCfg().neural || !text || text.length > 400) return text;
    try {
      const out = await withTimeout(N.pipe(text, { max_new_tokens: 96 }), 7000);
      const s = String((out && out[0] && (out[0].generated_text || out[0].summary_text)) || '').trim();
      if (!s) return text;
      const a = norm(text).split(' '), b = norm(s).split(' ');
      if (Math.abs(a.length - b.length) > Math.max(3, a.length * 0.35)) return text; // wholesale rewrite → reject
      const set = new Set(a); const same = b.filter((w) => set.has(w)).length;
      if (same / Math.max(a.length, b.length) < 0.6) return text;
      return s;
    } catch (e) { return text; }
  }

  /* one entry point for the app: rules text in, improved text (+ new grammar items) out */
  async function improve(text, rep, learner) {
    let cur = text; const items = [];
    const ign = learner && learner.isIgnored ? (w, r, why) => learner.isIgnored(w, r, why) : null;
    try { const r = await ltImprove(cur, { ignored: ign }); cur = r.text; items.push(...r.items); } catch (e) { /* ignore */ }
    try {
      if (getCfg().neural && N.pipe) {
        const n = await neuralFix(cur);
        if (norm(n) !== norm(cur)) { items.push({ type: 'grammar', wrong: cur, right: n, why: 'Neural grammar model (in your browser)' }); cur = n; }
      }
    } catch (e) { /* ignore */ }
    if (rep && items.length) { rep.grammar = (rep.grammar || []).concat(items.filter((i) => i.wrong.length < 60)); rep.online = items.length; }
    return cur;
  }
  const api = { cfg: getCfg, setCfg, ltCheck, ltImprove, define, neuralLoad, neuralFix, improve, neural: N, onNeural: (f) => nlisten.push(f), _reset: () => { cfg = null; dc = null; ltCache.clear(); } };
  root.Online = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
