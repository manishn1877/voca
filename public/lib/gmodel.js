/* Voca grammar model — part-of-speech tagger + trained token-level error classifier.
   Data (lexicon, family map, weights) comes from window.AvaGModelData (model/export.py).
   Runs fully in the browser; no network. */
(function (root) {
  'use strict';
  let D = null;
  const NOUNISH = { N_SG: 1, N_PL: 1, N_MASS: 1, N_PROP: 1 };
  const VERBISH = { V_BASE: 1, V_3SG: 1, V_PAST: 1, V_PP: 1, V_ING: 1 };
  const SUBJ_T = { PRON_1: 1, PRON_3: 1, PRON_P: 1, N_SG: 1, N_PL: 1, N_PROP: 1, N_MASS: 1 };
  const FINITE = { BE_AM: 1, BE_IS: 1, BE_ARE: 1, BE_WAS: 1, BE_WERE: 1, HAVE_BASE: 1, HAVE_3: 1, HAVE_PAST: 1, DO_BASE: 1, DO_3: 1, DO_PAST: 1, MODAL: 1, V_BASE: 1, V_3SG: 1, V_PAST: 1 };
  const SUF = [[/ing$/, ['V_ING']], [/ed$/, ['V_PAST', 'V_PP']], [/ly$/, ['ADV']], [/(tion|ment|ness|ity|ship|ance|ence|ism|er|or)$/, ['N_SG']], [/(ful|ous|ive|able|ible|less|ish|ic|al)$/, ['ADJ']], [/(ies|es|s)$/, ['N_PL', 'V_3SG']]];
  const PASTMARK = /^(yesterday|ago|ago\b)$/;

  function norm(w) { return String(w).toLowerCase().replace(/[^a-z0-9']/g, ''); }
  function cands(w) {
    const l = D.lex[w]; if (l) return [l, 0];
    if (/^\d+$/.test(w)) return [['NUM'], 0];
    if (/[a-z]'s$/.test(w)) return [['N_SG'], 0];
    for (const [re, t] of SUF) if (re.test(w)) return [t, 1];
    return [['N_SG'], 1];
  }
  function tagSeq(ws) {
    const n = ws.length, tags = new Array(n), unk = new Array(n);
    const raw = ws.map(cands);
    for (let i = 0; i < n; i++) {
      const c = raw[i][0]; unk[i] = raw[i][1];
      if (c.length === 1) { tags[i] = c[0]; continue; }
      const p = i ? tags[i - 1] : 'BOS', has = (t) => c.indexOf(t) >= 0;
      const nxt = i + 1 < n ? raw[i + 1][0] : [];
      let pick = null;
      if (has('PRON_O') && (VERBISH[p] || p === 'PREP' || p === 'TO')) pick = 'PRON_O';
      else if (has('POSS') && has('PRON_O')) pick = nxt.some((t) => NOUNISH[t] || t === 'ADJ') ? 'POSS' : 'PRON_O';
      else if (has('CONJ_S') && has('DET_SG')) pick = (VERBISH[p] || p.startsWith('BE_')) ? 'CONJ_S' : (nxt.some((t) => NOUNISH[t]) ? 'DET_SG' : 'CONJ_S');
      else if (/^(DET|POSS|ADJ|NUM)/.test(p) && c.some((t) => NOUNISH[t])) pick = c.find((t) => NOUNISH[t]);
      else if ((p === 'MODAL' || p === 'TO' || p.startsWith('DO_') || p === 'HAVE_BASE' && false) && has('V_BASE')) pick = 'V_BASE';
      else if (p.startsWith('BE_') && (has('V_ING') || has('ADJ') || has('V_PP'))) pick = has('V_ING') ? 'V_ING' : has('ADJ') ? 'ADJ' : 'V_PP';
      else if (p.startsWith('HAVE_') && has('V_PP')) pick = 'V_PP';
      else if ((p === 'PRON_3' || p === 'N_SG' || p === 'N_PROP') && has('V_3SG')) pick = 'V_3SG';
      else if ((p === 'PRON_1' || p === 'PRON_P' || p === 'N_PL') && has('V_BASE')) pick = 'V_BASE';
      else if ((p === 'NEG' || p === 'ADV_FREQ' || p === 'ADV') && c.some((t) => VERBISH[t])) pick = c.find((t) => VERBISH[t]);
      else if ((p === 'PREP') && c.some((t) => NOUNISH[t] || t === 'V_ING')) pick = c.find((t) => NOUNISH[t] || t === 'V_ING');
      tags[i] = pick || c[0];
    }
    return { tags, unk };
  }
  const vow = (w) => (w && 'aeiou'.indexOf(w[0]) >= 0 ? 1 : 0);
  function feats(ws, tags, unk, i) {
    const n = ws.length, w = ws[i], t = tags[i];
    const T = (k) => (k < 0 ? 'BOS' : k >= n ? 'EOS' : tags[k]), W = (k) => (k < 0 ? '<s>' : k >= n ? '</s>' : ws[k]);
    const f = [];
    f.push('w=' + w, 't=' + t, 't-1=' + T(i - 1), 't-2=' + T(i - 2), 't+1=' + T(i + 1), 't+2=' + T(i + 2),
      't-1,t=' + T(i - 1) + '|' + t, 't,t+1=' + t + '|' + T(i + 1), 't-2,t-1,t=' + T(i - 2) + '|' + T(i - 1) + '|' + t,
      't-1,t,t+1=' + T(i - 1) + '|' + t + '|' + T(i + 1), 'w-1,t=' + W(i - 1) + '|' + t, 't-1,w=' + T(i - 1) + '|' + w,
      'w-1,w=' + W(i - 1) + '|' + w, 'w,w+1=' + w + '|' + W(i + 1), 'w,t+1=' + w + '|' + T(i + 1),
      'suf2=' + w.slice(-2) + '|' + t, 'suf3=' + w.slice(-3) + '|' + t, 'vow,w=' + vow(W(i + 1)) + '|' + w, 'vow-1,t=' + vow(w) + '|' + t + '|' + T(i - 1));
    if (unk[i]) f.push('unk|' + t);
    // nearest preceding subject (skipping adverbs / negations / fillers)
    let s = 'NONE', k = i - 1, steps = 0;
    while (k >= 0 && steps < 6) { if (SUBJ_T[tags[k]]) { s = tags[k]; break; } if (tags[k] === 'CONJ_C' || tags[k] === 'CONJ_S') break; k--; steps++; }
    f.push('subj,t=' + s + '|' + t, 'subj,w=' + s + '|' + w);
    // clause: any finite verb since clause start?
    let fin = 0; k = i - 1; while (k >= 0 && tags[k] !== 'CONJ_C' && tags[k] !== 'CONJ_S') { if (FINITE[tags[k]]) { fin = 1; break; } k--; }
    f.push('fin,t=' + fin + '|' + t, 'fin,subj,t=' + fin + '|' + s + '|' + t);
    // determiner / number context for nouns
    let d = 'NODET'; k = i - 1; while (k >= 0 && k > i - 4) { if (/^(DET|NUM|POSS)/.test(tags[k])) { d = tags[k] + ':' + (/^(DET|NUM)/.test(tags[k]) ? ws[k] : ''); break; } if (!(tags[k] === 'ADJ' || tags[k] === 'ADV')) break; k--; }
    f.push('det,t=' + d + '|' + t);
    // past-time marker anywhere in the sentence
    let pm = 0; for (let j = 0; j < n; j++) if (ws[j] === 'yesterday' || ws[j] === 'ago' || ws[j] === 'last' || /^(19|20)\d\d$/.test(ws[j])) { pm = 1; break; }
    f.push('pm,t=' + pm + '|' + t, 'pm,subj,t=' + pm + '|' + s + '|' + t);
    // position
    f.push('pos=' + (i === 0 ? 'first' : i === n - 1 ? 'last' : 'mid') + '|' + t);
    return f;
  }
  function scoreTok(fs) {
    const C = D.cls.length, z = D.B.slice();
    for (const f of fs) { const w = D.F[f]; if (w) for (let q = 0; q < w.length; q += 2) z[w[q]] += w[q + 1]; }
    let m = -1e9; for (const v of z) if (v > m) m = v;
    let sum = 0; const e = z.map((v) => { const x = Math.exp(v - m); sum += x; return x; });
    return e.map((v) => v / sum);
  }
  function probs(ws) {
    const { tags, unk } = tagSeq(ws);
    return { tags, P: ws.map((_, i) => scoreTok(feats(ws, tags, unk, i))) };
  }
  const errMass = (P) => { let s = 0; for (const p of P) s += 1 - p[0]; return s; };

  function candidates(ws, tags, i) {
    const out = [], w = ws[i], seen = new Set();
    const push = (arr, tag) => { const k = arr.join(' '); if (!seen.has(k)) { seen.add(k); out.push({ ws: arr, tag }); } };
    for (const f of (D.fam[w] || [])) push(ws.slice(0, i).concat([f], ws.slice(i + 1)), 'swap');
    if (/s$/.test(w) && w.length > 3) { push(ws.slice(0, i).concat([w.replace(/(es|s)$/, '')], ws.slice(i + 1)), 'swap'); push(ws.slice(0, i).concat([w.slice(0, -1)], ws.slice(i + 1)), 'swap'); }
    else if (w.length > 2) push(ws.slice(0, i).concat([w + 's'], ws.slice(i + 1)), 'swap');
    push(ws.slice(0, i).concat(ws.slice(i + 1)), 'delete');
    for (const b of ['is', 'are', 'am', 'was', 'were', 'a', 'an', 'the', 'to', 'for', 'in', 'on', 'at', 'of', 'with']) push(ws.slice(0, i).concat([b], ws.slice(i)), 'insert');
    if (i + 1 < ws.length) push(ws.slice(0, i).concat([ws[i + 1], ws[i]], ws.slice(i + 2)), 'order');
    if (i > 0) push(ws.slice(0, i - 1).concat([ws[i], ws[i - 1]], ws.slice(i + 1)), 'order');
    if (i + 2 < ws.length) push(ws.slice(0, i).concat([ws[i + 1], ws[i + 2], ws[i]], ws.slice(i + 3)), 'order');
    if (/^HAVE_/.test(tags[i]) && tags[i + 1] === 'V_PP') { const nx = ws[i + 1], pastF = (D.fam[nx] || []).filter((x) => (D.lex[x] || []).indexOf('V_PAST') >= 0); for (const p of pastF) push(ws.slice(0, i).concat([p], ws.slice(i + 2)), 'tense'); }
    if (i > 0 && ws[i - 1] === 'more' || ws[i - 1] === 'most') push(ws.slice(0, i - 1).concat(ws.slice(i)), 'delete');
    return out;
  }
  /* correct(rawTokens): tokens = array of original strings (case kept). Returns {tokens, edits} */
  function correct(orig, opt) {
    opt = opt || {}; const thr = opt.threshold || 0.85;
    let ow = orig.slice(), ws = ow.map(norm), edits = [];
    for (let pass = 0; pass < 5 && ws.length > 1; pass++) {
      const { tags, P } = probs(ws);
      if (opt.safe && ws.some((w) => !D.lex[w] && !/^\d+$/.test(w))) break;
      let bi = -1, bp = 0;
      for (let i = 0; i < ws.length; i++) { const e = 1 - P[i][0]; if (e > bp) { bp = e; bi = i; } }
      if (bi < 0 || bp < thr) break;
      const cur = errMass(P); let best = null;
      for (const c of candidates(ws, tags, bi)) {
        if (!c.ws.length) continue;
        if (opt.safe && c.tag !== 'swap' && c.tag !== 'tense') continue;
        const r = probs(c.ws), m = errMass(r.P) + (c.tag === 'swap' ? 0 : 0.08);
        if (!best || m < best.m) best = { m, c };
      }
      if (!best || best.m > cur - 0.55 * bp) break;
      const nw = best.c.ws;
      // keep original casing for unchanged tokens
      const lowOld = ws; const newOrig = nw.map((w) => { const j = lowOld.indexOf(w); return j >= 0 && ow[j] ? ow[j] : w; });
      edits.push({ from: ws[bi], cls: D.cls[P[bi].indexOf(Math.max(...P[bi].slice(1)))] || 'GRAMMAR', p: bp, kind: best.c.tag, before: ws.join(' '), after: nw.join(' ') });
      ow = newOrig; ws = nw;
    }
    return { tokens: ow, edits };
  }
  /* public: fix a sentence string; returns corrected string (or the same) */
  function fixText(text, opt) {
    if (!D || !D.F) return { text, edits: [] };
    const parts = String(text).split(/\s+/).filter(Boolean);
    const toks = [], punct = [];
    for (const p of parts) { const m = p.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/); const core = m ? m[2] : p; if (!core) continue; toks.push(core); }
    if (toks.length < 2) return { text, edits: [] };
    const r = correct(toks, opt);
    return { text: r.tokens.join(' '), edits: r.edits };
  }
  function setData(d) { D = d; }
  const api = { setData, norm, tagSeq, feats, probs, correct, fixText, ready: () => !!(D && D.F) };
  root.AvaGModel = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.AvaGModelData) D = root.AvaGModelData;
})(typeof window !== 'undefined' ? window : globalThis);
