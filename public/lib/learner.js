/* Voca Learner — on-device learning from the user's own mistakes and feedback.
   Stores everything in localStorage ('ava.learn.v1'); nothing leaves the device. */
(function (root) {
  'use strict';
  const KEY = 'ava.learn.v1';
  const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
  const TOPICS = [
    ['agreement', /he \/ she \/ it|add -s|-s \/ -es|singular|plural subject|doesn.t|does.t|am \/ is \/ are|are \/ were|is \/ was|plural.*(verb|are)|everybody|news|take a singular/i],
    ['tense', /tense|past|present perfect|since|for \+|for \/ since|yesterday|have been|ago|finished|would instead|reported/i],
    ['articles', /\ban?\b before|“a”|"a"|\bthe\b before|article|an before|before a number/i],
    ['prepositions', /preposition|good at|afraid of|interested in|fond of|married to|arrive|\bon foot|at home|in the class|on the team|discuss|\bto\b.*(tell|explain)|no “to”|explain/i],
    ['plurals & uncountable', /uncountable|plural noun|plural for|irregular plural|children|information|advice|homework|countable|little|many \+|much/i],
    ['word order', /order|indirect|reported question|very much goes|goes after|goes between|goes before/i],
    ['pronouns', /pronoun|subject|object|my before|his\/her|they.re|you.re|it.s/i],
    ['comparisons', /comparative|superlative|than|-er|-est|more \+|most/i],
    ['adverbs & adjectives', /adverb|adjective|well|carefully|feelings take|-ed|interested|bored/i],
    ['verb forms', /base verb|after “?to”?|-ing|infinitive|must|should|can \+|will \+|make \/ let|irregular|past participle|state verb|double negative|do \/ does/i],
  ];
  const topicOf = (why) => { const w = String(why || ''); for (const [t, re] of TOPICS) if (re.test(w)) return t; return 'other'; };
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const pkey = (w, r) => norm(w) + '>' + norm(r);
  let D = null;
  function load() {
    if (D) return D;
    try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { D = null; }
    if (!D || typeof D !== 'object') D = { pairs: {}, ignore: {}, whyOff: {}, whyNo: {}, topics: {}, turns: 0, up: 0, down: 0, taught: 0 };
    return D;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* storage blocked */ } }
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function observe(rep) {
    const d = load(); d.turns++;
    const day = today();
    for (const g of rep.grammar || []) {
      if (!g.wrong || !g.right) continue;
      const k = pkey(g.wrong, g.right);
      const p = d.pairs[k] || (d.pairs[k] = { w: g.wrong, r: g.right, why: g.why || '', n: 0, trust: 0, box: 0, due: day, src: 'auto' });
      p.n++; p.last = day;
      const t = topicOf(g.why); const tt = d.topics[t] || (d.topics[t] = { n: 0, days: {} });
      tt.n++; tt.days[day] = (tt.days[day] || 0) + 1;
      const ds = Object.keys(tt.days).sort(); while (ds.length > 21) delete tt.days[ds.shift()];
    }
    const keys = Object.keys(d.pairs); if (keys.length > 400) { keys.sort((a, b) => (d.pairs[a].n + d.pairs[a].trust) - (d.pairs[b].n + d.pairs[b].trust)).slice(0, keys.length - 400).forEach((k) => delete d.pairs[k]); }
    save();
  }
  /* remove corrections the user has rejected (or whose rule they rejected 3+ times) */
  function filter(rep) {
    const d = load(); let removed = 0;
    if (!rep.grammar) return 0;
    rep.grammar = rep.grammar.filter((g) => {
      const bad = d.ignore[pkey(g.wrong, g.right)] || (g.why && d.whyOff[g.why]);
      if (bad) {
        removed++;
        if (rep.corrected && g.right && g.wrong) rep.corrected = rep.corrected.replace(new RegExp(esc(g.right.trim()), 'i'), g.wrong.trim());
      }
      return !bad;
    });
    return removed;
  }
  /* apply corrections the user taught us (or confirmed 2+ times) that the rules missed */
  function apply(rep) {
    const d = load(); let n = 0; if (!rep.text) return 0;
    let c = rep.corrected || rep.text;
    for (const p of Object.values(d.pairs)) {
      if (!(p.src === 'user' || p.trust >= 2) || !p.w || !p.r) continue;
      const re = new RegExp('(^|[^A-Za-z\'])(' + esc(p.w.trim()) + ')(?![A-Za-z\'])', 'i');
      if (re.test(c)) { c = c.replace(re, (m, a) => a + p.r.trim()); n++; p.used = (p.used || 0) + 1; }
    }
    if (n) { rep.corrected = c; rep.learned = n; save(); }
    return n;
  }
  const isIgnored = (w, r, why) => { const d = load(); return !!(d.ignore[pkey(w, r)] || (why && d.whyOff[why])); };
  function confirm(rep) {
    const d = load();
    for (const g of rep.grammar || []) { const p = d.pairs[pkey(g.wrong, g.right)]; if (p) p.trust = (p.trust || 0) + 1; if (g.why && d.whyNo[g.why]) d.whyNo[g.why] = Math.max(0, d.whyNo[g.why] - 1); }
    d.up++; save();
  }
  function reject(rep) {
    const d = load();
    for (const g of rep.grammar || []) {
      d.ignore[pkey(g.wrong, g.right)] = 1;
      if (g.why) { d.whyNo[g.why] = (d.whyNo[g.why] || 0) + 1; if (d.whyNo[g.why] >= 3) d.whyOff[g.why] = 1; }
      const p = d.pairs[pkey(g.wrong, g.right)]; if (p) { p.trust = 0; delete d.pairs[pkey(g.wrong, g.right)]; }
    }
    d.down++; save();
  }
  /* learn from a sentence the user corrected by hand: diff -> small phrase pairs */
  function teach(wrongText, rightText, diffFn) {
    const d = load(); let n = 0;
    const a = wrongText.split(/\s+/).filter(Boolean), b = rightText.split(/\s+/).filter(Boolean);
    // simple LCS alignment on normalised words
    const A = a.map(norm), B = b.map(norm), m = A.length, k = B.length;
    const L = Array.from({ length: m + 1 }, () => new Array(k + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = k - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0; const spans = [];
    while (i < m || j < k) {
      if (i < m && j < k && A[i] === B[j]) { i++; j++; continue; }
      const si = i, sj = j;
      while ((i < m || j < k) && !(i < m && j < k && A[i] === B[j])) {
        if (i < m && (j >= k || L[i + 1][j] >= L[i][j + 1])) i++; else j++;
      }
      spans.push([si, i, sj, j]);
    }
    for (const [si, ei, sj, ej] of spans) {
      if (ei - si > 4 || ej - sj > 4) continue;
      const lo = Math.max(0, si - 1), hi = Math.min(m, ei + 1), lo2 = Math.max(0, sj - 1), hi2 = Math.min(k, ej + 1);
      const w = a.slice(lo, hi).join(' ').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, ''), r = b.slice(lo2, hi2).join(' ').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
      if (!w || !r || norm(w) === norm(r)) continue;
      const key = pkey(w, r); delete d.ignore[key];
      d.pairs[key] = Object.assign(d.pairs[key] || { n: 0, box: 0, due: today() }, { w, r, why: 'You taught me this', src: 'user', trust: 3, last: today() });
      d.pairs[key].n++; n++;
    }
    if (n) { d.taught += n; save(); }
    return n;
  }
  /* spaced repetition */
  function answer(key, ok) {
    const d = load(), p = d.pairs[key]; if (!p) return;
    p.box = ok ? Math.min((p.box || 0) + 1, INTERVALS.length - 1) : 0;
    p.due = addDays(today(), INTERVALS[p.box]); save();
  }
  function topTopics(n) {
    const d = load();
    return Object.entries(d.topics).filter(([t]) => t !== 'other').sort((a, b) => b[1].n - a[1].n).slice(0, n || 3).map(([t, v]) => {
      const days = Object.keys(v.days).sort(); const last7 = days.filter((x) => x > addDays(today(), -7)).reduce((s, x) => s + v.days[x], 0);
      const prev7 = days.filter((x) => x <= addDays(today(), -7) && x > addDays(today(), -14)).reduce((s, x) => s + v.days[x], 0);
      return { topic: t, n: v.n, last7, prev7, trend: prev7 ? (last7 < prev7 ? 'down' : last7 > prev7 ? 'up' : 'flat') : 'new' };
    });
  }
  /* weak-spot drill: own pairs that are due + bank sentences about the user's top topics */
  function weakItems(bank, max) {
    const d = load(), day = today(), out = [];
    const mine = Object.entries(d.pairs).filter(([, p]) => (p.due || day) <= day && (p.n >= 2 || p.src === 'user')).sort((a, b) => (a[1].box || 0) - (b[1].box || 0));
    for (const [k, p] of mine.slice(0, 8)) out.push([p.r.replace(/^./, (c) => c.toUpperCase()) + '.', `You said “${p.w}” — say the correct phrase (${p.n}×)`, k]);
    const tops = topTopics(3).map((x) => x.topic);
    const pool = (bank || []).filter(([w, r, why]) => tops.indexOf(topicOf(why)) >= 0).sort(() => Math.random() - 0.5).slice(0, Math.max(4, (max || 12) - out.length));
    for (const [w, r, why] of pool) out.push([r, `${why} (not “${w}”)`, null]);
    return out;
  }
  function stats() { const d = load(); return { turns: d.turns, learned: Object.keys(d.pairs).length, taught: d.taught, ignored: Object.keys(d.ignore).length, up: d.up, down: d.down, due: Object.values(d.pairs).filter((p) => (p.due || today()) <= today() && (p.n >= 2 || p.src === 'user')).length, off: Object.keys(d.whyOff).length }; }
  function reset() { D = null; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } load(); }
  const api = { isIgnored, observe, filter, apply, confirm, reject, teach, answer, topTopics, weakItems, stats, reset, topicOf, _load: load, _reset: () => { D = null; } };
  root.Learner = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
