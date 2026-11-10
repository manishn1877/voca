'use strict';
/* Offline English analyzer: works with no API key.
   Detects common grammar errors, fillers, repeats, weak vocabulary, pace and
   hard-to-pronounce words. When an AI key is set, server.js merges AI feedback on top. */

const third = (v) => {
  v = v.toLowerCase();
  const irr = { go: 'goes', do: 'does', have: 'has', "don't": "doesn't" };
  if (irr[v]) return irr[v];
  if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es';
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
  return v + 's';
};
const PAST = { go: 'went', see: 'saw', eat: 'ate', take: 'took', make: 'made', have: 'had', get: 'got', say: 'said', come: 'came', buy: 'bought', think: 'thought', know: 'knew', give: 'gave', find: 'found', tell: 'told', feel: 'felt', leave: 'left', meet: 'met', write: 'wrote', run: 'ran', begin: 'began', speak: 'spoke', do: 'did' };
const BASE = Object.fromEntries(Object.entries(PAST).map(([b, p]) => [p, b]));
const PP = { went: 'gone', saw: 'seen', ate: 'eaten', took: 'taken', came: 'come', wrote: 'written', began: 'begun', spoke: 'spoken', did: 'done', gave: 'given', knew: 'known' };
const VERBS3 = 'go|do|have|don\'t|want|like|need|make|take|think|know|say|come|live|work|play|eat|watch|look|love|study|speak|feel|get|use|try|help|enjoy';
const PASTV = Object.keys(PAST).join('|');
const ED = { boring: 'bored', exciting: 'excited', confusing: 'confused', tiring: 'tired', annoying: 'annoyed', surprising: 'surprised', interesting: 'interested' };
const STATIVE = { knowing: 'know', understanding: 'understand', liking: 'like', wanting: 'want', loving: 'love', believing: 'believe' };
const UNCOUNT = { informations: 'information', advices: 'advice', furnitures: 'furniture', knowledges: 'knowledge', homeworks: 'homework', equipments: 'equipment', luggages: 'luggage', researches: 'research', feedbacks: 'feedback', softwares: 'software', peoples: 'people', childrens: 'children', mans: 'men', womans: 'women' };
const cap = (s) => s;
const prev = (c) => c.before.trim().split(/\s+/).pop() || '';
const AUX = /^(can|could|will|would|should|must|may|might|did|do|does|to|let|let's|make|makes|help|helps|why|how|what|when|where|who|if)$/i;

// each rule: re (global, case-insens), fn(match, ctx) -> replacement string | null, why
const RULES = [
  { re: new RegExp(`\\b(he|she|it) (${VERBS3})\\b`, 'gi'), fn: (m, c) => (AUX.test(prev(c)) ? null : `${m[1]} ${third(m[2])}`), why: 'Subject–verb agreement: after he / she / it, the present-tense verb takes -s / -es.' },
  { re: /\bi (is|has|does)\b/gi, fn: (m) => `I ${{ is: 'am', has: 'have', does: 'do' }[m[1].toLowerCase()]}`, why: 'With "I" use am / have / do.' },
  { re: /\b(they|we|you) (is|was|has|does|doesn't)\b/gi, fn: (m) => `${m[1]} ${({ is: 'are', was: 'were', has: 'have', does: 'do', "doesn't": "don't" })[m[2].toLowerCase()]}`, why: 'With they / we / you use are, were, have, do, don\'t.' },
  { re: new RegExp(`\\b(didn't|did not|don't|doesn't|didnt) (${Object.values(PAST).join('|')})\\b`, 'gi'), fn: (m) => `${m[1]} ${BASE[m[2].toLowerCase()]}`, why: 'After did / didn\'t / don\'t / doesn\'t use the base verb (not the past form).' },
  { re: new RegExp(`\\b(have|has|had|haven't|hasn't) (${Object.keys(PP).join('|')})\\b`, 'gi'), fn: (m) => `${m[1]} ${PP[m[2].toLowerCase()]}`, why: 'Perfect tenses need the past participle (have gone / seen / eaten), not the simple past.' },
  { re: /\ba ([aeiou]\w*)\b/gi, fn: (m) => (/^(uni|use|usu|eu|one|once|ubiq|uti|ura)/i.test(m[1]) ? null : `an ${m[1]}`), why: 'Use "an" before a vowel sound.' },
  { re: /\ban ([bcdfgjklmnpqrstvwxyz]\w*)\b/gi, fn: (m) => (/^(hour|honest|honou?r|heir|mba|fbi|sms|x-?ray|lcd|html|mri)/i.test(m[1]) ? null : `a ${m[1]}`), why: 'Use "a" before a consonant sound.' },
  { re: new RegExp(`\\b(${Object.keys(UNCOUNT).join('|')})\\b`, 'gi'), fn: (m) => UNCOUNT[m[1].toLowerCase()], why: 'This noun is uncountable or irregular — it has no normal -s plural.' },
  { re: /\bdiscuss about\b/gi, fn: () => 'discuss', why: '"Discuss" already includes "about".' },
  { re: /\bexplain me\b/gi, fn: () => 'explain to me', why: 'Say "explain (something) to me".' },
  { re: /\blisten (to )?(music|songs?|radio|podcasts?)\b/gi, fn: (m) => (m[1] ? null : `listen to ${m[2]}`), why: 'Say "listen TO".' },
  { re: /\bdepend(s|ing)? (of|from)\b/gi, fn: (m) => `depend${m[1] || ''} on`, why: 'Say "depend ON".' },
  { re: /\b(return|revert) back\b/gi, fn: (m) => (m[1].toLowerCase() === 'return' ? 'return' : 'reply'), why: '"Return" already means "come back"; "revert back" should be "reply" / "get back to you".' },
  { re: /\bemphasi[sz]e on\b/gi, fn: () => 'emphasize', why: '"Emphasize" has no "on".' },
  { re: /\bmarried with\b/gi, fn: () => 'married to', why: 'Say "married TO".' },
  { re: /\bcope up with\b/gi, fn: () => 'cope with', why: 'Say "cope with".' },
  { re: /\b(good|bad|weak|poor|excellent) in (english|maths?|sports?|cooking|speaking|writing|drawing)\b/gi, fn: (m) => `${m[1]} at ${m[2]}`, why: 'Say "good AT" a skill.' },
  { re: /\b(interested|keen) (on|at|about)\b/gi, fn: (m) => `${m[1]} in`, why: 'Say "interested IN".' },
  { re: /\bafraid from\b/gi, fn: () => 'afraid of', why: 'Say "afraid OF".' },
  { re: /\bangry on\b/gi, fn: () => 'angry with', why: 'Say "angry WITH (a person)" / "angry ABOUT (a thing)".' },
  { re: /\bi am agree\b|\bi'm agree\b/gi, fn: () => 'I agree', why: '"Agree" is a verb — no "am".' },
  { re: new RegExp(`\\bi(?: am|'m) (${Object.keys(STATIVE).join('|')})\\b`, 'gi'), fn: (m) => `I ${STATIVE[m[1].toLowerCase()]}`, why: 'State verbs (know, understand, like, want…) are not used in the continuous form.' },
  { re: /\bsince (\d+|a|one|two|three|four|five|six|seven|ten) (years?|months?|weeks?|days?)\b/gi, fn: (m) => `for ${m[1]} ${m[2]}`, why: 'Use "for" with a length of time, "since" with a starting point (since 2019).' },
  { re: /\b(more|most) (better|best|easier|easiest|bigger|biggest|faster|cheaper|worse|worst|happier)\b/gi, fn: (m) => m[2], why: 'Don\'t double the comparative: "better", not "more better".' },
  { re: new RegExp(`\\b(i am|i was|i feel|i felt|i'm) (${Object.keys(ED).join('|')})\\b`, 'gi'), fn: (m) => `${m[1]} ${ED[m[2].toLowerCase()]}`, why: '-ed describes how YOU feel (bored); -ing describes the thing that causes it (boring).' },
  { re: /\btoday (morning|evening|afternoon)\b/gi, fn: (m) => `this ${m[1]}`, why: 'Say "this morning / this evening".' },
  { re: /\btoday night\b/gi, fn: () => 'tonight', why: 'Say "tonight".' },
  { re: /(^|[.?!]\s*)myself (\w+)/gi, fn: (m) => `${m[1]}I am ${m[2]}`, why: 'Introduce yourself with "I am …" / "My name is …".' },
  { re: /\bcousin (brother|sister)\b/gi, fn: () => 'cousin', why: '"Cousin" is enough — it has no gender.' },
  { re: /\bmuch (people|friends|books|things|times|students|cars|problems)\b/gi, fn: (m) => `many ${m[1]}`, why: 'Use "many" with countable nouns.' },
  { re: /\bmany (water|money|time|traffic|food|work|rain)\b/gi, fn: (m) => `much ${m[1]}`, why: 'Use "much" with uncountable nouns.' },
  { re: /\b(going|go|went|come|came|reach|reached|return|returned) to home\b/gi, fn: (m) => `${m[1]} home`, why: '"Home" doesn\'t need "to" (go home, come home).' },
  { re: /\breach(ed|es|ing)? to\b/gi, fn: (m) => `reach${m[1] || ''}`, why: '"Reach" takes no "to" — "reach the station".' },
  { re: /\bi very (like|love|enjoy)\b/gi, fn: (m) => `I really ${m[1]}`, why: 'Use "really" (or "very much" at the end): "I really like it".' },
  { re: new RegExp(`\\b(yesterday|last (?:night|week|month|year|summer|weekend)|\\d+ (?:days|weeks|months|years) ago)\\b([^.?!]*?)\\b(i|we|they|he|she) (${Object.keys(PAST).join('|')})\\b`, 'gi'), fn: (m) => `${m[1]}${m[2]}${m[3]} ${PAST[m[4].toLowerCase()]}`, why: 'A finished past time (yesterday, last week, ago) needs the past tense.' },
  { re: new RegExp(`\\b(i|we|they|he|she) (${Object.keys(PAST).join('|')})\\b([^.?!]*?)\\b(yesterday|last (?:night|week|month|year|summer|weekend)|\\d+ (?:days|weeks|months|years) ago)\\b`, 'gi'), fn: (m) => `${m[1]} ${PAST[m[2].toLowerCase()]}${m[3]}${m[4]}`, why: 'A finished past time (yesterday, last week, ago) needs the past tense.' },
];

const NATURAL = [
  [/\baccording to me\b/i, 'in my opinion / I think', 'Native speakers say "in my opinion" — "according to" is for other people or sources.'],
  [/\bi have a doubt\b/i, 'I have a question', '"Doubt" means you are unsure something is true; for asking, say "question".'],
  [/\bdo the needful\b/i, 'take care of it / do what\'s needed', 'Sounds outdated and unnatural in everyday English.'],
  [/\bwhat is your good name\b/i, "what's your name?", 'Just "What\'s your name?" is natural.'],
  [/\bprepone\b/i, 'move it earlier / bring it forward', '"Prepone" isn\'t used in standard English.'],
  [/\btimepass\b/i, 'to pass the time / just for fun', 'Not standard English.'],
  [/\bkindly\b/i, 'please', '"Kindly" sounds stiff in conversation; "please" is more natural.'],
  [/\bi will tell you one thing\b/i, 'Here\'s the thing / Let me tell you something', 'More natural openers.'],
  [/\bout of station\b/i, 'out of town', 'Say "out of town" or "away".'],
];

const WEAK = [
  [/\bvery good\b/i, ['excellent', 'fantastic', 'terrific']],
  [/\bvery bad\b/i, ['terrible', 'awful', 'dreadful']],
  [/\bvery big\b/i, ['huge', 'enormous']],
  [/\bvery small\b/i, ['tiny']],
  [/\bvery (happy|glad)\b/i, ['delighted', 'thrilled']],
  [/\bvery (sad|upset)\b/i, ['heartbroken', 'devastated']],
  [/\bvery tired\b/i, ['exhausted']],
  [/\bvery important\b/i, ['essential', 'crucial']],
  [/\bvery interesting\b/i, ['fascinating', 'captivating']],
  [/\ba lot of\b/i, ['plenty of', 'loads of', 'numerous']],
  [/\bthings?\b/i, ['(name it: item, idea, aspect, issue…)']],
  [/\bstuff\b/i, ['things / belongings / material']],
  [/\bnice\b/i, ['pleasant', 'lovely', 'wonderful']],
];
const WEAK_REPEAT = [[/\bgood\b/gi, ['great', 'solid', 'wonderful', 'beneficial']], [/\bbad\b/gi, ['poor', 'harmful', 'unpleasant']], [/\bhappy\b/gi, ['delighted', 'content']], [/\bbig\b/gi, ['huge', 'major', 'significant']]];

// [word, respelling, tip]
const PRON = [
  ['comfortable', 'KUMF-ter-bul', 'Only 3 syllables — skip the "or".'],
  ['vegetable', 'VEJ-tuh-bul', '3 syllables; "VEJ", not "veg-e-ta-ble".'],
  ['wednesday', 'WENZ-day', 'The first "d" is silent.'],
  ['february', 'FEB-roo-air-ee', 'Say the first "r": Feb-ROO.'],
  ['often', 'OFF-en', 'The "t" is usually silent.'],
  ['choir', 'KWY-er', 'Starts with "kw".'],
  ['colonel', 'KUR-nul', 'Sounds like "kernel".'],
  ['enough', 'ih-NUFF', '"ough" = "uff".'],
  ['thorough', 'THUR-oh', '"ough" = "oh" here.'],
  ['through', 'throo', '"ough" = "oo" here.'],
  ['though', 'THOH', '"ough" = "oh"; soft "th".'],
  ['schedule', 'SKED-yool', 'US: "SKED". UK: "SHED".'],
  ['pronunciation', 'pruh-NUN-see-AY-shun', 'Not "pro-NOUN" — the "o" changes to "uh".'],
  ['salmon', 'SAM-un', 'The "l" is silent.'],
  ['queue', 'KYOO', 'Just the letter Q.'],
  ['debt', 'DET', 'The "b" is silent.'],
  ['island', 'EYE-lund', 'The "s" is silent.'],
  ['knowledge', 'NOL-ij', 'The "k" is silent.'],
  ['receipt', 'rih-SEET', 'The "p" is silent.'],
  ['cupboard', 'KUB-erd', 'The "p" is silent.'],
  ['recipe', 'RES-uh-pee', 'Ends with "-pee", not "-pie".'],
  ['clothes', 'KLOHZ', 'Just one syllable; the "th" is often dropped.'],
  ['world', 'WURLD', 'Round your lips, then "url" — avoid "word-l".'],
  ['business', 'BIZ-nis', '2 syllables.'],
  ['interesting', 'IN-trih-sting', '3 syllables; stress the first.'],
  ['different', 'DIF-rent', '2 syllables in fast speech.'],
  ['every', 'EV-ree', '2 syllables.'],
  ['beautiful', 'BYOO-tih-ful', 'Stress the first syllable.'],
  ['police', 'puh-LEESE', 'Stress the second syllable.'],
  ['chocolate', 'CHOK-lit', '2–3 syllables, not "choco-late".'],
  ['iron', 'EYE-urn', 'The "r" comes before the "n".'],
  ['vehicle', 'VEE-uh-kul', 'The "h" is silent-ish.'],
  ['literature', 'LIT-ruh-chur', '3–4 syllables.'],
  ['clothes', 'KLOHZ', 'One syllable.'],
  ['mischievous', 'MIS-chih-vus', '3 syllables, not "mis-CHEE-vee-us".'],
  ['asked', 'ASKT', 'One syllable, ends in "kt".'],
  ['months', 'MUNTHS', 'Hard cluster: practice "nths" slowly.'],
  ['world', 'WURLD', 'Avoid adding a vowel between "r" and "l".'],
  ['focus', 'FOH-kus', 'Long "o".'],
  ['career', 'kuh-REER', 'Stress the second syllable.'],
  ['development', 'dih-VEL-up-ment', 'Stress "VEL".'],
  ['environment', 'en-VY-run-ment', 'Say the "n" before "ment": en-VY-ron-ment.'],
  ['particularly', 'per-TIK-yuh-ler-lee', 'Stress "TIK".'],
  ['probably', 'PROB-uh-blee', '3 syllables.'],
  ['sandwich', 'SAN-wich', 'The "d" is silent.'],
  ['twelfth', 'TWELFTH', 'Hard cluster — say "twelf" + "th".'],
  ['hour', 'OW-er', 'The "h" is silent.'],
  ['honest', 'ON-ist', 'The "h" is silent.'],
  ['subtle', 'SUT-ul', 'The "b" is silent.'],
  ['castle', 'KAS-ul', 'The "t" is silent.'],
  ['half', 'HAF', 'The "l" is silent.'],
  ['walk', 'WAWK', 'The "l" is silent.'],
];

const FILLERS = [['um'], ['uh'], ['erm'], ['hmm'], ['you know', 2], ['i mean', 2], ['basically', 2], ['actually', 2], ['literally', 2], ['kind of', 3], ['sort of', 3], ['so yeah', 1]];

function words(t) { return (t.toLowerCase().match(/[a-z']+/g) || []); }
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(n)));
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function analyze(text, { durationSec = 0, confidence = null } = {}) {
  text = String(text || '').trim();
  const w = words(text);
  const n = w.length;
  const grammar = [];
  let corrected = text;

  for (const r of RULES) {
    corrected = corrected.replace(r.re, (...args) => {
      const hasNamed = typeof args[args.length - 1] === 'object';
      const oi = args.length - (hasNamed ? 3 : 2);
      const m = args.slice(0, oi);
      const offset = args[oi];
      const ctx = { before: corrected.slice(Math.max(0, offset - 25), offset), after: '' };
      const out = r.fn(m, ctx);
      if (out == null || out.toLowerCase() === m[0].toLowerCase()) return m[0];
      grammar.push({ type: 'grammar', wrong: m[0].trim(), right: out.trim(), why: r.why });
      return out;
    });
  }

  const natural = [];
  for (const [re, better, why] of NATURAL) {
    const m = text.match(re);
    if (m) natural.push({ type: 'natural', said: m[0], better, why });
  }

  const vocab = [];
  for (const [re, better] of WEAK) {
    const m = text.match(re);
    if (m && !/^things?$|^stuff$|^nice$/i.test(m[0])) vocab.push({ type: 'vocab', used: m[0], better });
    else if (m && (text.match(new RegExp(re.source, 'gi')) || []).length >= 2) vocab.push({ type: 'vocab', used: m[0], better });
  }
  for (const [re, better] of WEAK_REPEAT) {
    const c = (text.match(re) || []).length;
    if (c >= 2) vocab.push({ type: 'vocab', used: `"${text.match(re)[0].toLowerCase()}" ×${c}`, better });
  }

  const pronunciation = [];
  const seen = new Set();
  for (const [word, say, tip] of PRON) {
    if (w.includes(word) && !seen.has(word)) { seen.add(word); pronunciation.push({ type: 'pron', word, say, tip }); }
  }

  const fillers = [];
  const lower = ' ' + text.toLowerCase().replace(/[^a-z' ]/g, ' ') + ' ';
  for (const [f, min = 1] of FILLERS) {
    const c = (lower.match(new RegExp(`\\s${esc(f)}(?=\\s)`, 'g')) || []).length;
    if (c >= min) fillers.push({ word: f, count: c });
  }
  const repeats = [];
  const rep = text.toLowerCase().match(/\b([a-z']+)( \1\b)+/g) || [];
  for (const r of rep) { const wd = r.split(' ')[0]; if (!['had', 'that', 'very', 'um', 'uh', 'erm', 'hmm'].includes(wd)) repeats.push(r); }

  const wpm = durationSec >= 3 && n >= 5 ? Math.round((n / durationSec) * 60) : null;
  let pace = null;
  if (wpm) pace = wpm < 90 ? 'slow' : wpm > 180 ? 'fast' : wpm < 110 ? 'a little slow' : 'good';
  const tips = [];
  if (pace === 'slow' || pace === 'a little slow') tips.push(`Your pace is ${wpm} words/min. Native conversation is ~120–160. Try linking your ideas with "and then", "because", "so".`);
  if (pace === 'fast') tips.push(`You spoke at ${wpm} words/min — slow down a little and pause between ideas so each word is clear.`);
  if (fillers.length) tips.push('Replace fillers with a silent pause — pausing sounds confident.');
  if (repeats.length) tips.push('You repeated words ("' + repeats[0] + '"). Take a short breath and plan the next phrase.');
  if (confidence != null && confidence < 0.75) tips.push(`The speech recogniser was only ${Math.round(confidence * 100)}% sure about what you said — speak a bit slower and enunciate endings (-ed, -s, -t).`);
  if (n && n < 8) tips.push('Try to say longer answers — 2–3 sentences with a reason ("because…") or an example.');

  const ttr = n ? new Set(w).size / n : 1;
  const gScore = clamp(100 - grammar.length * 14 - (n ? (grammar.length / n) * 100 : 0));
  const vScore = clamp(70 + (ttr - 0.6) * 60 - vocab.length * 6 + Math.min(n, 40) / 4);
  const fScore = clamp(100 - fillers.reduce((a, f) => a + f.count, 0) * 6 - repeats.length * 8 - (pace === 'slow' || pace === 'fast' ? 14 : pace === 'a little slow' ? 6 : 0) - (n < 8 ? 12 : 0));
  const pScore = confidence != null ? clamp(confidence * 100 + 4) : null;
  const parts = [gScore, vScore, fScore].concat(pScore != null ? [pScore] : []);
  const overall = clamp(parts.reduce((a, b) => a + b, 0) / parts.length);

  let praise = '';
  if (!grammar.length && n >= 8) praise = 'No grammar errors spotted — nicely done!';
  else if (n >= 25) praise = 'Great — you spoke at length. Length = practice.';
  else if (gScore >= 85) praise = 'Clear and mostly accurate.';

  return {
    text, corrected: corrected === text ? null : corrected,
    grammar, natural, vocab, pronunciation,
    fluency: { wpm, pace, fillers, repeats, tips },
    words: n,
    scores: { grammar: gScore, vocab: vScore, fluency: fScore, pronunciation: pScore, overall },
    praise,
  };
}

const TOPICS = [
  ['Your dream job', 'If you could do any job in the world, with no limits, what would it be, and why?'],
  ['A perfect weekend', 'Describe your perfect weekend from the moment you wake up.'],
  ['Favourite food', 'What is a dish you could eat every week for the rest of your life? Why?'],
  ['A trip you remember', 'Tell me about a trip that you still think about. Where did you go?'],
  ['Technology and AI', 'Do you think AI will make our lives better or harder in the next ten years?'],
  ['Your hometown', 'What is your hometown like, and what do you miss about it when you are away?'],
  ['Movies and series', 'What is a movie or series you recommend to everyone, and what makes it special?'],
  ['Fitness and health', 'What do you do to stay healthy, and what habit do you wish you had?'],
  ['Money and saving', 'What is the best piece of money advice you have ever received?'],
  ['Social media', 'How does social media change the way people talk to each other?'],
  ['Learning English', 'Why is English important to you, and what is the hardest part about it?'],
  ['Childhood memories', 'What is your happiest childhood memory? Take me back there.'],
  ['Cricket, football or any sport', 'Do you follow a sport? Tell me about your favourite team or player.'],
  ['Work-life balance', 'Is it possible to have real balance between work and life? What is your experience?'],
  ['A person who inspires you', 'Who inspires you the most, and what have you learned from them?'],
  ['Cities vs villages', 'Would you rather live in a big city or a quiet village? Explain your choice.'],
  ['Music', 'What song are you listening to the most these days, and how does it make you feel?'],
  ['Failure and learning', 'Tell me about a time you failed at something. What did it teach you?'],
  ['Future plans', 'Where do you see yourself in five years?'],
  ['Festivals and traditions', 'What is your favourite festival, and how do you celebrate it?'],
  ['Books and reading', 'What is the last book you really enjoyed, or what would you like to read next?'],
  ['Online shopping', 'Do you prefer shopping online or in a shop? What was your last big purchase?'],
  ['Weather and seasons', 'What is your favourite season and what do you love doing in it?'],
  ['Gaming', 'What games do you play, and what do you enjoy about them?'],
  ['Education', 'What would you change about the way students are taught today?'],
  ['Superpowers', 'If you could have one superpower for a day, what would you choose and what would you do?'],
  ['Public speaking', 'How do you feel when you speak in front of a group? How can people get more confident?'],
  ['Starting a business', 'If you started a business tomorrow, what would it be?'],
];

const randomTopic = (exclude = []) => {
  const pool = TOPICS.filter((t) => !exclude.includes(t[0]));
  const t = (pool.length ? pool : TOPICS)[Math.floor(Math.random() * (pool.length || TOPICS.length))];
  return { topic: t[0], opener: t[1] };
};

const FOLLOW = [
  'Why do you feel that way?', 'Can you give me a specific example?', 'How has that changed over the years?',
  'What is the hardest part about it?', 'How would you explain that to a ten year old?', 'What do people around you think about this?',
  'Tell me about a time this really affected you.', 'What would you do differently if you could start again?', 'And what happens next?',
];
function fallbackReply({ topic, text, history = [] }) {
  const STOP = new Set(['yesterday','because','something','everything','actually','probably','sometimes','different','another','anything','nothing','together','thinking']);
  const long = words(text || '').filter((x) => x.length > 6 && !STOP.has(x)).sort((a, b) => b.length - a.length)[0];
  const asked = history.filter((h) => h.role === 'bot').length;
  const react = ['Interesting!', 'I see.', 'That makes sense.', 'Nice, thanks for sharing.', 'Oh, really?'][asked % 5];
  const mention = long ? ` You mentioned "${long}" — I'd love to hear more.` : '';
  return `${react}${mention} ${FOLLOW[asked % FOLLOW.length]}`;
}

function summarize(turns) {
  const agg = { grammar: {}, pron: {}, vocab: {}, natural: {}, fillers: {} };
  let words_ = 0, wpmSum = 0, wpmN = 0; const scores = [];
  for (const r of turns) {
    words_ += r.words || 0;
    if (r.fluency?.wpm) { wpmSum += r.fluency.wpm; wpmN++; }
    if (r.scores?.overall != null) scores.push(r.scores.overall);
    (r.grammar || []).forEach((g) => (agg.grammar[g.why] = (agg.grammar[g.why] || 0) + 1));
    (r.pronunciation || []).forEach((p) => (agg.pron[p.word] = (agg.pron[p.word] || 0) + 1));
    (r.fluency?.fillers || []).forEach((f) => (agg.fillers[f.word] = (agg.fillers[f.word] || 0) + f.count));
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const priorities = [];
  top(agg.grammar).forEach(([why, c]) => priorities.push(`Grammar (${c}×): ${why}`));
  top(agg.pron).forEach(([w, c]) => priorities.push(`Pronunciation: practise "${w}" in the Drills tab.`));
  top(agg.fillers).forEach(([w, c]) => priorities.push(`Cut the filler "${w}" (${c}×).`));
  if (!priorities.length) priorities.push('Keep going — try longer answers with reasons and examples.');
  return {
    words: words_, avgWpm: wpmN ? Math.round(wpmSum / wpmN) : null,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    priorities: priorities.slice(0, 5),
    homework: ['Tomorrow: speak for 2 minutes on the same topic without fillers.', 'Re-record any sentence you got wrong, using the corrected version.'],
  };
}

const __x = { analyze, summarize, fallbackReply, randomTopic, TOPICS, PRON };
if (typeof module === 'object' && module.exports) module.exports = __x; else self.AvaAnalyzer = __x;
