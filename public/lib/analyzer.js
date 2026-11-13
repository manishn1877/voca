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
for (const [k, v] of Object.entries({ meet: 'met', send: 'sent', spend: 'spent', build: 'built', lend: 'lent', lose: 'lost', leave: 'left', feel: 'felt', keep: 'kept', sleep: 'slept', hear: 'heard', tell: 'told', teach: 'taught', catch: 'caught', sell: 'sold', pay: 'paid', stand: 'stood', understand: 'understood', sit: 'sat', win: 'won', wake: 'woke', draw: 'drew', wear: 'wore', fly: 'flew', grow: 'grew', throw: 'threw', drive: 'drove', ride: 'rode', swim: 'swam', sing: 'sang', drink: 'drank', begin: 'began', break: 'broke', choose: 'chose', forget: 'forgot', hold: 'held', run: 'ran', speak: 'spoke', write: 'wrote', bring: 'brought', fight: 'fought', hide: 'hid', shake: 'shook', steal: 'stole', cut: 'cut', put: 'put', set: 'set', hit: 'hit', let: 'let', shut: 'shut', read: 'read', ring: 'rang', fall: 'fell', rise: 'rose', get: 'got', do: 'did', go: 'went', mean: 'meant', lead: 'led', learn: 'learned' })) if (!PAST[k]) PAST[k] = v;
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

/* ---- helpers for the extended rule set ---- */
const IRR_PP = { gone: 'went', seen: 'saw', eaten: 'ate', taken: 'took', written: 'wrote', begun: 'began', spoken: 'spoke', done: 'did', given: 'gave', known: 'knew', come: 'came', driven: 'drove', ridden: 'rode', swum: 'swam', run: 'ran', broken: 'broke' };
const pastOf = (v) => { v = v.toLowerCase(); if (PAST[v]) return PAST[v]; if (/e$/.test(v)) return v + 'd'; if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ied'; return v + 'ed'; };
const ingOf = (v) => { v = v.toLowerCase(); if (v === 'be') return 'being'; if (/ie$/.test(v)) return v.slice(0, -2) + 'ying'; if (/[^e]e$/.test(v)) return v.slice(0, -1) + 'ing'; if (/^(run|sit|get|swim|stop|plan|begin|put|cut|hit|chat|shop)$/.test(v)) return v + v.slice(-1) + 'ing'; return v + 'ing'; };
const AN = (w) => (/^[aeiou]/i.test(w) && !/^(uni|use|eu|one)/i.test(w) ? 'an ' : 'a ') + w;
const ACTV = 'go|eat|buy|see|take|make|meet|play|watch|visit|walk|talk|call|cook|clean|study|work|travel|drive|come|get|give|bring|write|run|ride|swim|sleep|wake|leave|start|finish|order|learn|listen|help|stay|wait|pay|sit|stand|speak|ask|use|try|move|open|help|lose|win|find|tell|say|receive|invite|celebrate|decide|arrive|join|attend|book|send|show|share|enjoy|plan|prepare|clean|buy|visit|reach|pick|drop|meet';
const PASTMARK = '(?:yesterday|last (?:night|week|month|year|weekend|summer|winter|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:\\d+|a|an|one|two|three|four|five|six|seven|a few|some) (?:minutes?|hours?|days?|weeks?|months?|years?) ago|in (?:19|20)\\d\\d|when i was (?:a )?(?:child|kid|young|small|little))';
const SUBJ = '(?:i|we|they|you|he|she)';
const PASTFORMS = Object.values(PAST).join('|');
const LIST3 = ['speak','go','do','have','want','like','need','make','take','think','know','say','come','live','work','play','eat','watch','look','love','study','feel','get','use','try','help','enjoy'].map(third).join('|');
const MASS = 'information|advice|furniture|knowledge|homework|equipment|luggage|software|feedback|news|money|traffic|music|weather|progress|research|work';
const GER = 'play|meet|see|hear|talk|speak|work|visit|go|come|get|read|learn|do|start|try|watch|help|travel|study|write|call|have|eat|live|stay';


/* ============ parts-of-speech rule pack ============ */
const MAP = (o) => (w) => o[w.toLowerCase()];
const IRR_PL = { child: 'children', man: 'men', woman: 'women', foot: 'feet', tooth: 'teeth', mouse: 'mice', person: 'people', knife: 'knives', wife: 'wives', life: 'lives', leaf: 'leaves', half: 'halves', shelf: 'shelves', thief: 'thieves' };
const PL_NOUN = 'sister|brother|friend|student|teacher|book|pen|car|house|day|week|month|year|hour|minute|dog|cat|apple|orange|banana|mistake|problem|question|answer|thing|idea|word|place|city|country|language|movie|song|story|picture|room|bag|phone|class|lesson|exam|test|job|doctor|player|team|game|boy|girl|kid|cousin|neighbour|neighbor|colleague|classmate|member|reason|example|hobby|habit|plan|dream|goal|photo|message|email|letter|ticket|shirt|shoe|chair|table|window|door|bike|bus|train|flight|meal|egg|cup|glass|bottle|coin|rupee|dollar|minute|second|time|visit|trip|party|exercise|sentence|paragraph|chapter|page|rule|topic|subject|skill|point|step|way|kind|type|part|piece|slice|pair|friend';
const NOUN_PL_NUM = '(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|hundred|\\d+|many|several|few|both|a lot of|lots of|a few|so many|too many|a number of|these|those)';
const MASS_N = 'water|money|time|food|rice|milk|sugar|information|advice|work|help|traffic|luck|homework|music|knowledge|furniture|equipment|luggage|weather|news|research|software|feedback|progress|air|bread|butter|oil|salt|tea|coffee|paper|energy|fun|love|happiness';
const ADJ_ADV = { quick: 'quickly', slow: 'slowly', easy: 'easily', careful: 'carefully', beautiful: 'beautifully', good: 'well', bad: 'badly', clear: 'clearly', perfect: 'perfectly', proper: 'properly', nice: 'nicely', smooth: 'smoothly', safe: 'safely', polite: 'politely', angry: 'angrily', happy: 'happily', quiet: 'quietly', sweet: 'sweetly', terrible: 'terribly', awful: 'awfully', soft: 'softly', loud: 'loudly' };
const ADV_ADJ = { happily: 'happy', sadly: 'sad', badly: 'bad', angrily: 'angry', beautifully: 'beautiful', nicely: 'nice', quickly: 'quick', slowly: 'slow', terribly: 'terrible', wonderfully: 'wonderful', sweetly: 'sweet', strangely: 'strange' };
const EDADJ = { bore: 'bored', tire: 'tired', excite: 'excited', interest: 'interested', confuse: 'confused', surprise: 'surprised', annoy: 'annoyed', worry: 'worried', depress: 'depressed', disappoint: 'disappointed', embarrass: 'embarrassed', frighten: 'frightened', exhaust: 'exhausted', amaze: 'amazed', satisfy: 'satisfied', relax: 'relaxed' };
const ED2ING = { bored: 'boring', tired: 'tiring', excited: 'exciting', interested: 'interesting', confused: 'confusing', surprised: 'surprising', annoyed: 'annoying', exhausted: 'exhausting', disappointed: 'disappointing', depressed: 'depressing', frightened: 'frightening', embarrassed: 'embarrassing' };
const COMP = { tall: ['taller', 'tallest'], big: ['bigger', 'biggest'], small: ['smaller', 'smallest'], fast: ['faster', 'fastest'], slow: ['slower', 'slowest'], old: ['older', 'oldest'], young: ['younger', 'youngest'], long: ['longer', 'longest'], short: ['shorter', 'shortest'], hard: ['harder', 'hardest'], cheap: ['cheaper', 'cheapest'], large: ['larger', 'largest'], easy: ['easier', 'easiest'], hot: ['hotter', 'hottest'], cold: ['colder', 'coldest'], strong: ['stronger', 'strongest'], smart: ['smarter', 'smartest'], good: ['better', 'best'], bad: ['worse', 'worst'] };
const SG = { students: 'student', children: 'child', people: 'person', men: 'man', women: 'woman', friends: 'friend', boys: 'boy', girls: 'girl', teachers: 'teacher', days: 'day', things: 'thing', books: 'book', members: 'member', ones: 'one' };
const IRR_PAST_BAD = (w) => { const l = w.toLowerCase(); if (/eed$/.test(l) || l.length < 4) return null; for (const b of [l.slice(0, -2), l.slice(0, -1), l.slice(0, -3)]) { const bb = b.length > 2 && b[b.length - 1] === b[b.length - 2] ? b.slice(0, -1) : b; for (const c of [b, bb]) if (PAST[c] && PAST[c] !== l && !/ed$/.test(PAST[c])) return c; } return null; };
const PRON_SUBJ = { me: 'I', him: 'he', us: 'we', them: 'they' };
const PRON_POSS = { me: 'my', him: 'his', us: 'our', them: 'their', you: 'your' };
const PRON_OBJ = { she: 'her', he: 'him', they: 'them', we: 'us', i: 'me' };
const PLACES = 'india|pakistan|china|japan|usa|america|england|uk|london|delhi|mumbai|chennai|bangalore|kolkata|hyderabad|new york|paris|canada|australia|germany|france|dubai|nepal|bangladesh|sri lanka|singapore|kerala|punjab|goa|pune|italy|spain|brazil|russia|turkey|egypt|texas|california';
const AUXV = 'do|does|did|don\'t|doesn\'t|didn\'t|can|could|will|would|should|must|may|might|shall|won\'t|can\'t';
const VERBS_L = 'speak|go|do|have|want|like|need|make|take|think|know|say|come|live|work|play|eat|watch|look|love|study|feel|get|use|try|help|enjoy|write|read|buy|find|give|tell|call|ask|drink|drive|sleep|run|walk|talk|sing|dance|visit|stay|wait|meet|leave|start|begin|finish|teach|learn|understand|remember|forget|hear|see|swim|cook|clean|open|close|show|bring|send|pay|sit|stand|pass|teach';
const toBase3 = (w) => { w = w.toLowerCase(); if (w === 'goes') return 'go'; if (w === 'does') return 'do'; if (w === 'has') return 'have'; if (/ies$/.test(w)) return w.slice(0, -3) + 'y'; if (/(sh|ch|x|z|ss)es$/.test(w)) return w.slice(0, -2); return w.replace(/s$/, ''); };
const V3 = VERBS_L.split('|').map((v) => third(v)).join('|');
const REGV = 'want need like love live play work study watch visit walk talk call ask help start finish enjoy use try move open decide order travel learn listen cook clean stay wait remember invite receive arrive plan prepare share show hope pass change believe appear happen follow agree answer laugh smile miss reach join attend book'.split(' ');
const RULES_POS = [
  /* ---- pronouns ---- */
  { re: new RegExp(`(^|[.?!] |\\b(?:and|but|so|because|if|when|then) )(me|him|us|them)\\b(?= (?:am|is|are|was|were|go|goes|went|have|has|had|like|likes|want|wants|need|needs|do|does|did|can|will|would|should|live|lives|work|works|think|know|see|saw|play|study|come|came)\\b)`, 'gi'), fn: (m) => `${m[1]}${PRON_SUBJ[m[2].toLowerCase()]}`, why: 'A subject needs I / he / we / they (not me / him / us / them).' },
  { re: /(^|[.?!] |\band |\bbut |\bso )(her)\b(?= (?:is|was|has|goes|went|likes|wants|needs|lives|works|can|will)\b)/gi, fn: (m) => `${m[1]}she`, why: 'A subject needs "she", not "her".' },
  { re: /\b(me|him|us|them) and (i|he|she|they|we)\b/gi, fn: (m) => `${m[2]} and ${m[1].toLowerCase() === 'me' ? 'I' : PRON_SUBJ[m[1].toLowerCase()]}`.replace(/^i and/, 'I and'), why: 'Use subject pronouns: "he and I".' },
  { re: /\b(me|him|us|them|you) (book|books|friend|friends|mother|father|name|house|car|family|brother|sister|phone|school|teacher|job|life|room|bag|pen|work|country|city|dog|cat|parents|home|wife|husband|son|daughter)\b/gi, nlb: /\b(give|tell|show|bring|send|made|make|let|call|help|teach|ask|gave|told|showed|brought|sent|offer|offered|get|got|buy|bought|owe|lend|lent|read|write|wrote|cook|cooked|save|saved|pass|passed|hand|handed|find|found|promise|promised|call|called)\s$/i, fn: (m) => `${PRON_POSS[m[1].toLowerCase()]} ${m[2]}`, why: 'Use my / his / our / their / your before a noun (not me / him / us / them / you).' },
  { re: /\b(like|love|hate|see|know|meet|tell|call|help|want|miss|need) (she|he|they|we|i)\b(?= (?:very|so|too|a lot|much|more|because|and|but|also|as|when|if|since)\b|\s*[.,?!]|\s*$)/gi, fn: (m) => `${m[1]} ${PRON_OBJ[m[2].toLowerCase()]}`, why: 'After a verb use the object form: him / her / them / us / me.' },
  { re: /\b(to|for|with|about|at|from) (i|he|she|we|they)\b(?! (?:am|is|are|was|were|will|have|has|do|did|can|go|went|said|think|know|want|had|would|could|should|like|need)\b)/gi, fn: (m) => `${m[1]} ${PRON_OBJ[m[2].toLowerCase()]}`, why: 'After a preposition use me / him / her / us / them.' },
  { re: /(^|[.?!] )myself (?:is |am )?(?:a |an )?([a-z]+)\b/gi, fn: (m) => `${m[1]}I am ${m[2]}`, why: 'Say "I am …", not "myself …".' },
  { re: /\btheir (going|coming|doing|working|playing|here|there|late|very|not|so|too|always|happy|ready|waiting|looking|trying|being)\b/gi, fn: (m) => `they're ${m[1]}`, why: '"They\'re" = they are; "their" shows ownership.' },
  { re: /\byour (welcome|going|coming|doing|late|right|wrong|not|very|so|too|always|a (?:good|great|nice|bad)|the (?:best|worst)|being|working)\b/gi, fn: (m) => `you're ${m[1]}`, why: '"You\'re" = you are; "your" shows ownership.' },
  { re: /\bits (a|an|the|very|not|so|too|raining|going|been|true|good|bad|nice|fine|late|early|important|okay|ok|hot|cold|difficult|easy|time to)\b/gi, fn: (m) => `it's ${m[1]}`, why: '"It\'s" = it is; "its" shows ownership.' },
  { re: /\b(i)m\b/gi, fn: () => "I'm", why: 'Apostrophe: I\'m.' },
  { re: /\b(dont|doesnt|didnt|cant|wont|isnt|arent|wasnt|werent|havent|hasnt|couldnt|wouldnt|shouldnt|whats|thats|ive|youre|theyre|hes|shes) (?=\w)/gi, fn: (m) => ({ dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", wont: "won't", isnt: "isn't", arent: "aren't", wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't", couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't", whats: "what's", thats: "that's", ive: "I've", youre: "you're", theyre: "they're", hes: "he's", shes: "she's" })[m[1].toLowerCase()] + ' ', why: 'Missing apostrophe.' },
  { re: /\bsince long\b/gi, fn: () => 'for a long time', why: 'Say "for a long time".' },
  /* ---- verbs ---- */
  { re: /\b(have|has|had) (went|saw|ate|took|wrote|gave|knew|began|broke|spoke|came|did|drove|rode|flew|grew|threw|drew|wore|tore|swam|sang|rang|drank|stole|chose|forgot|froze|rose|woke)\b/gi, fn: (m) => { const pp = { went: 'gone', saw: 'seen', ate: 'eaten', took: 'taken', wrote: 'written', gave: 'given', knew: 'known', began: 'begun', broke: 'broken', spoke: 'spoken', came: 'come', did: 'done', drove: 'driven', rode: 'ridden', flew: 'flown', grew: 'grown', threw: 'thrown', drew: 'drawn', wore: 'worn', tore: 'torn', swam: 'swum', sang: 'sung', rang: 'rung', drank: 'drunk', stole: 'stolen', chose: 'chosen', forgot: 'forgotten', froze: 'frozen', rose: 'risen', woke: 'woken' }[m[2].toLowerCase()]; return `${m[1]} ${pp}`; }, why: 'After have / has / had use the past participle (have gone, have seen).' },
  { re: /\b(i|we|they|you|he|she|it) (seen|done|gone|eaten|taken|written|given|known|begun|broken|spoken)\b/gi, fn: (m) => `${m[1]} ${{ seen: 'saw', done: 'did', gone: 'went', eaten: 'ate', taken: 'took', written: 'wrote', given: 'gave', known: 'knew', begun: 'began', broken: 'broke', spoken: 'spoke' }[m[2].toLowerCase()]}`, why: 'Without "have", use the simple past (I saw, I did, I went).' },
  { re: /\b([a-z]{3,}ed)\b/gi, fn: (m, ctx) => { const b = IRR_PAST_BAD(m[1]); if (!b) return null; const part = /\b(have|has|had|is|are|was|were|been|be|'ve)\s$/i.test(ctx.before); const PPX = { go: 'gone', see: 'seen', eat: 'eaten', take: 'taken', write: 'written', give: 'given', know: 'known', begin: 'begun', break: 'broken', speak: 'spoken', do: 'done', drive: 'driven', ride: 'ridden', fly: 'flown', grow: 'grown', throw: 'thrown', draw: 'drawn', wear: 'worn', swim: 'swum', sing: 'sung', drink: 'drunk', steal: 'stolen', choose: 'chosen', forget: 'forgotten' }; return part && PPX[b] ? PPX[b] : PAST[b]; }, why: 'This verb is irregular — its past form is not made with -ed.' },
  { re: new RegExp(`\\b(${AUXV}) ((?:i|you|he|she|we|they|it) )?(${REGV.map(pastOf).join('|')})\\b`, 'gi'), fn: (m) => { const b = REGV.find((v) => pastOf(v) === m[3].toLowerCase()); return b ? `${m[1]} ${m[2] || ''}${b}` : null; }, why: 'After do / did / can / will use the base verb, not the past tense.' },
  { re: /\b(i) be\b/gi, fn: () => 'I am', why: 'Use "am" with I.' },
  { re: /\b(he|she|it) be\b(?= (?:very|so|too|happy|sad|late|tired|busy|ok|fine|a|an|the|here|there|going|my|your|not)\b)/gi, fn: (m) => `${m[1]} is`, why: 'Use "is" with he / she / it.' },
  { re: /\b(we|they|you) be\b(?= (?:very|so|too|happy|sad|late|tired|busy|ok|fine|a|an|the|here|there|going|my|your|not)\b)/gi, fn: (m) => `${m[1]} are`, why: 'Use "are" with we / they / you.' },
  { re: new RegExp(`\\b(${AUXV}) ((?:i|you|he|she|we|they|it) )?(${PASTFORMS})\\b`, 'gi'), nlb: /\b(?:the|a|an|my|his|her|their|our)\s$/i, fn: (m) => { const w = m[3].toLowerCase(); if (/^(saw|left|found|lay|bound|wound|read|put|cut|set|hit|let|hurt|shut|cost|quit|spread|rid|bet)$/.test(w) || !BASE[w]) return null; return `${m[1]} ${m[2] || ''}${BASE[w]}`; }, why: 'After do / did / can / will use the base verb, not the past tense.' },
  { re: new RegExp(`\\b(${AUXV}) ((?:i|you|he|she|we|they|it) )?(${V3})\\b`, 'gi'), fn: (m) => `${m[1]} ${m[2] || ''}${toBase3(m[3])}`, why: 'After do / does / can / will use the base verb (no -s).' },
  { re: /\b(i|we|they|you) (study|work|live|stay|wait|learn|play|teach|use|know)\b((?:\W+\w+){0,6}?\W+since\b)/gi, fn: (m) => `${m[1]} have been ${ingOf(m[2])}${m[3]}`.replace('have been knowing', 'have known'), why: 'With "since", use the present perfect (have been studying).' },
  { re: /\b(he|she) (study|work|live|stay|wait|learn|play|teach|use)\b((?:\W+\w+){0,6}?\W+since\b)/gi, fn: (m) => `${m[1]} has been ${ingOf(m[2])}${m[3]}`, why: 'With "since", use the present perfect (has been studying).' },
  { re: /\b(i am|am) liking\b/gi, fn: () => 'like', why: '"Like" is a state verb — not used with -ing.' },
  { re: /\bi am (liking|loving|wanting|needing|hating|believing)\b/gi, fn: (m) => 'I ' + m[1].replace(/ing$/, '').replace(/^lov$/, 'love').replace(/^lik$/, 'like').replace(/^hat$/, 'hate').replace(/^believ$/, 'believe'), why: 'State verbs (like, love, want, need, hate, believe) are not used with -ing.' },
  /* ---- nouns ---- */
  { re: new RegExp(`\\b(two|three|four|five|six|seven|eight|nine|ten|many|several|few|both|\\d+|these|those) (${Object.keys(IRR_PL).join('|')})\\b`, 'gi'), fn: (m) => `${m[1]} ${IRR_PL[m[2].toLowerCase()]}`, why: 'Irregular plural (child → children, man → men…).' },
  { re: /\b(knifes|mans|womans|foots|teeths|mouses|childs|persons|leafs|wifes|lifes|halfs|shelfs)\b/gi, fn: (m) => ({ knifes: 'knives', mans: 'men', womans: 'women', foots: 'feet', teeths: 'teeth', mouses: 'mice', childs: 'children', persons: 'people', leafs: 'leaves', wifes: 'wives', lifes: 'lives', halfs: 'halves', shelfs: 'shelves' })[m[1].toLowerCase()], why: 'Irregular plural.' },
  { re: new RegExp(`\\b${NOUN_PL_NUM} (${PL_NOUN})\\b(?!s|\\w)(?! (?:is|was|has|does)\\b)`, 'gi'), fn: (m) => { const [n, noun] = [m[0].slice(0, m[0].lastIndexOf(' ')), m[0].slice(m[0].lastIndexOf(' ') + 1)]; return `${n} ${/(s|x|ch|sh)$/.test(noun) ? noun + 'es' : /[^aeiou]y$/.test(noun) ? noun.slice(0, -1) + 'ies' : noun + 's'}`; }, why: 'After a number or "many / several / a lot of", use the plural noun.' },
  { re: /\b(a lots of|a lot of mistake)\b/gi, fn: (m) => (/lots/i.test(m[1]) ? 'a lot of' : 'a lot of mistakes'), why: 'Say "a lot of" (never "a lots of").' },
  { re: /\b(my|his|her|our|their|your) (brother|sister|friend|father|mother|teacher|boss|wife|husband|son|daughter|cousin|uncle|aunt) (house|car|name|phone|room|school|book|work|job|bag|dog|family|office|life|age|birthday|wife|friend|bike|laptop|shop|business)\b/gi, fn: (m) => `${m[1]} ${m[2]}'s ${m[3]}`, why: 'Add \'s to show ownership: my brother\'s house.' },
  { re: /\b(long|black|brown|short|white|my|her|his|curly|straight) hairs\b/gi, fn: (m) => `${m[1]} hair`, why: '"Hair" is uncountable.' },
  { re: /\ba news\b/gi, fn: () => 'some news', why: '"News" is uncountable.' },
  { re: /\bi (like|love|enjoy) to eat (vegetable|fruit|egg|apple)\b/gi, fn: (m) => `I ${m[1]} to eat ${m[2]}s`, why: 'Use the plural for things in general.' },
  /* ---- adjectives ---- */
  { re: /\bgooder\b/gi, fn: () => 'better', why: 'The comparative of "good" is "better".' },
  { re: /\b(the )?(most|more) (best|better|worst|worse)\b/gi, fn: (m) => `${m[1] || ''}${m[3]}`, why: '"Best / better / worst" are already comparative or superlative.' },
  { re: /\b(the )?(more|most) (good|bad)\b/gi, fn: (m) => `${m[1] || ''}${COMP[m[3].toLowerCase()][/^more$/i.test(m[2]) ? 0 : 1]}`, why: 'Use better / best and worse / worst.' },
  { re: new RegExp(`\\b(the )?(more|most) (${Object.keys(COMP).join('|')})\\b`, 'gi'), fn: (m) => `${m[1] || ''}${COMP[m[3].toLowerCase()][/^more$/i.test(m[2]) ? 0 : 1]}`, why: 'Short adjectives take -er / -est (taller, tallest).' },
  { re: /\bthe more (intelligent|beautiful|important|interesting|difficult|expensive|famous|popular|useful|dangerous|comfortable) (in|of)\b/gi, fn: (m) => `the most ${m[1]} ${m[2]}`, why: 'Use "the most" for the highest degree in a group.' },
  { re: /\b(am|is|are|was|were|feel|feels|felt|get|gets|got|become|became) (very |so |really |too )?(bore|tire|excite|interest|confuse|surprise|annoy|worry|depress|disappoint|embarrass|frighten|exhaust|amaze|satisfy|relax)\b(?!d|s|ing)/gi, fn: (m) => `${m[1]} ${m[2] || ''}${EDADJ[m[3].toLowerCase()]}`, why: 'Use the -ed form for how a person feels (I am bored).' },
  { re: /\b(movie|film|book|class|lecture|story|game|party|trip|show|speech|lesson|journey|match|concert|result|news|it|this|that) (is|was|seems|seemed) (very |so |really |too )?(bored|tired|excited|interested|confused|surprised|annoyed|exhausted|disappointed|depressed|frightened|embarrassed)\b/gi, fn: (m) => `${m[1]} ${m[2]} ${m[3] || ''}${ED2ING[m[4].toLowerCase()]}`, why: 'Use the -ing form for what causes the feeling (the movie was boring).' },
  { re: /\b(feel|feels|felt|feeling) (very |so |really )?(tireding|boreding|tireing)\b/gi, fn: (m) => `${m[1]} ${m[2] || ''}tired`, why: 'Say "tired".' },
  { re: /\b(beautiful|important|good|bad|big|small|nice|great|happy|sad|tall|short|long|new|old|young|hot|cold|difficult|easy|useful|interesting|famous|different|expensive|cheap|delicious|favorite|special)s (boy|girl|man|woman|house|car|day|place|book|city|person|friend|movie|food|song|time|thing|idea|job|school|teacher|story|picture)\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: 'Adjectives never take -s.' },
  { re: /\b(a|an|one|every|each|another) (?:((?:tall|big|small|good|bad|nice|new|old|young|beautiful|smart) ))?(boys|girls|men|women|books|cars|friends|houses|students|teachers|days|things)\b(?! (?:are|were|have)\b)/gi, fn: (m) => `${m[1]} ${m[2] || ''}${{ boys: 'boy', girls: 'girl', men: 'man', women: 'woman', books: 'book', cars: 'car', friends: 'friend', houses: 'house', students: 'student', teachers: 'teacher', days: 'day', things: 'thing' }[m[3].toLowerCase()]}`, why: 'After "a / an / one / every" use a singular noun.' },
  { re: /\b(a|an|the|my|his|her|our|their|your) (car|house|bag|book|shirt|dress|pen|bike|phone|dog|cat|flower|hat) (red|blue|green|black|white|yellow|big|small|old|new|beautiful|nice|good|bad|long|short)\b(?! (?:and|but|or)\b)/gi, fn: (m) => `${m[1]} ${m[3]} ${m[2]}`, why: 'In English the adjective comes BEFORE the noun (a red car).' },
  { re: /\b(delicious|good|nice|big|beautiful|tasty|happy|tired|hot|cold|difficult|easy|expensive) very\b(?! (?:much|well|good|nice))/gi, fn: (m) => `very ${m[1]}`, why: '"Very" comes before the adjective.' },
  /* ---- adverbs ---- */
  { re: /\b(looks?|looked|looking|feels?|felt|feeling|smells?|smelled|tastes?|tasted|sounds?|sounded|seems?|seemed|becomes?|became) (very |so |really )?(happily|sadly|badly|angrily|beautifully|nicely|quickly|slowly|terribly|wonderfully|sweetly|strangely)\b/gi, fn: (m) => `${m[1]} ${m[2] || ''}${ADV_ADJ[m[3].toLowerCase()]}`, why: 'After look / feel / smell / taste / sound use an adjective, not an adverb.' },
  { re: /\b(am|is|are|was|were) (very |so |really |too )?(beautifully|happily|sadly|angrily|nicely)\b(?=\s*[.,?!]|\s*$)/gi, fn: (m) => `${m[1]} ${m[2] || ''}${ADV_ADJ[m[3].toLowerCase()]}`, why: 'After "be" use an adjective (she is beautiful).' },
  { re: new RegExp(`\\b(runs?|ran|running|speaks?|spoke|speaking|drives?|drove|driving|sings?|sang|singing|works?|worked|working|walks?|walked|walking|talks?|talked|talking|writes?|wrote|writing|eats?|ate|eating|plays?|played|playing|learns?|learned|dances?|danced|sleeps?|slept|study|studies|studied|do|does|did|doing|swims?|swam|cooks?|cooked|am doing|is doing|are doing) ((?:english|it|that|this|them|everything|hindi|spanish|french) )?((?:very |so |really |too )?)(${Object.keys(ADJ_ADV).join('|')})\\b(?!ly)`, 'gi'), fn: (m) => `${m[1]} ${m[2] || ''}${m[3]}${ADJ_ADV[m[4].toLowerCase()]}`, why: 'Describe HOW you do something with an adverb (quickly, well, carefully).' },
  { re: /\b(work|works|worked|working|study|studies|studied|studying|try|tries|tried|trying|practice|practise|practices|practiced|practicing|train|trains|trained|training) hardly\b/gi, fn: (m) => `${m[1]} hard`, why: '"Hardly" means "almost not". For effort say "hard".' },
  { re: /\bfastly\b/gi, fn: () => 'fast', why: '"Fast" is both adjective and adverb — no "-ly".' },
  { re: /\b(he|she|it|i|we|they|you) (always|never|usually|often|sometimes|rarely|seldom|generally|already|just|still|also|really|probably) (is|are|am|was|were|has|have|had|will|can|should|would|could|must)\b/gi, fn: (m) => `${m[1]} ${m[3]} ${m[2]}`, why: 'Put the adverb AFTER "be / have / modal" (he is always late).' },
  { re: /\b(i|we|they|you|he|she|it) (go|goes|went|come|comes|came|eat|eats|do|does|play|plays|work|works|live|lives|see|sees|watch|watches|visit|visits|study|studies|speak|speaks) (never|always|usually|often|sometimes|rarely|seldom) /gi, fn: (m) => `${m[1]} ${m[3]} ${m[2]} `, why: 'Frequency adverbs go BEFORE the main verb (I never go there).' },
  { re: /\benough (tall|big|small|old|young|strong|good|fast|smart|rich|cheap|hot|cold|early|late|loud|clean|clever)\b/gi, fn: (m) => `${m[1]} enough`, why: '"Enough" comes AFTER an adjective (tall enough).' },
  { re: /\b(not|n't|don't|doesn't|didn't|can't|won't|isn't|aren't|wasn't) ((?:\w+ )?)never\b/gi, fn: (m) => `${m[1]} ${m[2]}ever`, why: 'Avoid a double negative — use "ever".' },
  /* ---- prepositions ---- */
  { re: /\b(wait|waits|waited|waiting) (you|him|her|them|me|us|my|your|his|our|their)\b/gi, fn: (m) => `${m[1]} for ${m[2]}`, why: 'Say "wait FOR someone".' },
  { re: /\b(listen|listens|listened|listening) (me|him|her|them|us|you|the|my|your|his|our|their|music|songs?|radio)\b/gi, fn: (m) => `${m[1]} to ${m[2]}`, why: 'Say "listen TO".' },
  { re: /\barrive(d|s)? to (the |my |his |her )?(airport|station|office|school|hotel|hospital|party|meeting|college|bus stop|home)\b/gi, fn: (m) => `arrive${m[1] || ''} at ${m[2] || ''}${m[3]}`.replace('at home', 'home'), why: 'Say "arrive AT a place" / "arrive IN a city".' },
  { re: /\barrive(d|s)? to (india|delhi|mumbai|london|america|canada|japan|china|paris|dubai|the city|the country)\b/gi, fn: (m) => `arrive${m[1] || ''} in ${m[2]}`, why: 'Say "arrive IN a city or country".' },
  { re: /\b(on|at) (the )?(morning|afternoon|evening)\b/gi, fn: (m) => `in the ${m[3]}`, why: 'Say "in the morning / afternoon / evening".' },
  { re: /\b(on|at) ((?:19|20)\d\d)\b/gi, fn: (m) => `in ${m[2]}`, why: 'Use "in" with a year.' },
  { re: /\b(in|at) (monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi, fn: (m) => `on ${m[2]}`, why: 'Use "on" with days.' },
  { re: /\b(in|on) (\d{1,2}(?::\d\d)? ?(?:am|pm|o'clock))\b/gi, fn: (m) => `at ${m[2]}`, why: 'Use "at" with a clock time.' },
  { re: new RegExp(`\\b(live|lives|lived|living|stay|stays|stayed|staying|work|works|worked|working|born) at (${PLACES})\\b`, 'gi'), fn: (m) => `${m[1]} in ${m[2]}`, why: 'Use "in" for a country or city.' },
  { re: /\bin the (india|japan|china|france|germany|nepal|pakistan|canada|australia|england|italy|spain|brazil|russia|singapore|dubai|london|delhi|mumbai)\b/gi, fn: (m) => `in ${m[1]}`, why: 'No "the" before most country and city names.' },
  { re: /\bdifferent than\b/gi, fn: () => 'different from', why: 'Say "different FROM".' },
  { re: /\bto by (bus|car|train|bike|taxi|walk|flight|plane|metro|auto)\b/gi, fn: (m) => `by ${m[1]}`, why: 'Say "go by bus" (no "to").' },
  { re: /\b(go|goes|went|going|come|comes|came|travel|travels|travelled|traveled) (in|with) (bus|train|taxi|metro|plane|flight|bike|auto)\b/gi, fn: (m) => `${m[1]} by ${m[3]}`, why: 'Say "by bus / by train".' },
  { re: /\b(good|bad|great|poor|excellent|brilliant|talented) on\b/gi, fn: (m) => `${m[1]} at`, why: 'Say "good AT".' },
  { re: /\bcomplain(s|ed|ing)? (for|on)\b/gi, fn: (m) => `complain${m[1] || ''} about`, why: 'Say "complain ABOUT".' },
  { re: /\b(return|returned|returning|repeat|repeated|revert) back\b/gi, fn: (m) => m[1], why: '"Back" is already inside "return".' },
  { re: /\bsame like\b/gi, fn: () => 'same as', why: 'Say "the same AS".' },
  { re: /\bthe reason (is|was) because\b/gi, fn: (m) => `the reason ${m[1]} that`, why: 'Say "the reason is THAT…" (not "because").' },
  /* ---- conjunctions ---- */
  { re: /\b(although|though|even though)\b((?:\W+\w+){2,8}?)\W+but\b/gi, fn: (m) => `${m[1]}${m[2]},`, why: 'Use only one: "although … , …" or "… but …" — not both.' },
  { re: /\b(because)\b((?:\W+\w+){2,8}?)\W+so\b(?= (?:i|we|they|he|she|it|you)\b)/gi, fn: (m) => `${m[1]}${m[2]},`, why: 'Use only one: "because …" or "so …" — not both.' },
  { re: /\bboth (\w+) and (\w+) (is|was|has|does)\b/gi, fn: (m) => `both ${m[1]} and ${m[2]} ${{ is: 'are', was: 'were', has: 'have', does: 'do' }[m[3].toLowerCase()]}`, why: '"Both … and …" is plural.' },
  { re: /\bnor (i) (are|is)\b/gi, fn: () => 'nor I am', why: 'Match the verb to the nearest subject: "nor I am".' },
  { re: /\bunless (\w+) (doesn't|don't|didn't) (\w+)\b/gi, fn: (m) => `unless ${m[1]} ${/^doesn't$/i.test(m[2]) ? third(m[3]) : m[3]}`, why: '"Unless" already means "if not" — use a positive verb.' },
  { re: /\b(know|knows|knew|ask|asked|asks|tell|told|wonder|understand|remember) that (where|what|when|why|how|who|which)\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: 'Don\'t add "that" before a question word.' },
  /* ---- articles ---- */
  { re: /\b(go|goes|went|going|come|comes|came|coming|back|return|returned) to the (school|college|university|work|bed)\b/gi, fn: (m) => `${m[1]} to ${m[2]}`, why: 'No "the" in "go to school / work / bed / college".' },
  { re: /\b(is|am|are|was|were) the (teacher|doctor|engineer|nurse|lawyer|student|manager|developer|driver|cook|farmer|banker|accountant|designer|writer|singer|dancer|artist|scientist|professor|dentist|pilot)\b(?! (?:of|in|at|who|that|whose|i|we|you|he|she|they|here|there|from|for|to)\b)/gi, fn: (m) => `${m[1]} ${AN(m[2])}`, why: 'Say "a / an" when you name your job or role.' },
  { re: /\b(play|plays|played|playing) the (football|cricket|tennis|basketball|badminton|chess|hockey|volleyball|baseball|golf|rugby)\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: 'No "the" before a sport.' },
  { re: /\b(play|plays|played|playing) (a|an) (piano|guitar|violin|drums|flute|tabla|keyboard|trumpet|saxophone|harmonium|sitar)\b/gi, fn: (m) => `${m[1]} the ${m[3]}`, why: 'Say "play THE guitar / piano".' },
  { re: /\bwhat an? (nice|good|bad|great|lovely|terrible|awful|beautiful|wonderful) (weather|news|advice|music|food|traffic|information|furniture|luck|help|work|progress|homework)\b/gi, fn: (m) => `what ${m[1]} ${m[2]}`, why: 'Uncountable nouns take no "a / an".' },
  { re: /\bin the (japan|india|china|france|germany|nepal|pakistan|canada|australia|england|italy|spain|brazil|russia|singapore)\b/gi, fn: (m) => `in ${m[1]}`, why: 'No "the" before most country names.' },
  /* ---- determiners ---- */
  { re: new RegExp(`\\b(those|these) (${PL_NOUN}) (is|was|has|does)\\b`, 'gi'), fn: (m) => `${/^those$/i.test(m[1]) ? 'that' : 'this'} ${m[2]} ${m[3]}`, why: 'Singular noun: this / that. Plural noun: these / those.' },
  { re: /\bthis (books|friends|people|things|students|cars|children|days|boys|girls|men|women|persons|questions|problems|mistakes|words|ideas|places|houses|shoes|pens)\b/gi, fn: (m) => `these ${m[1]}`, why: 'Plural noun → "these".' },
  { re: /\bthat (books|friends|things|students|cars|children|days|boys|girls|men|women|questions|problems|mistakes|words|ideas|places|houses|shoes|pens)\b/gi, fn: (m) => `those ${m[1]}`, why: 'Plural noun → "those".' },
  { re: new RegExp(`\\bmuch (friends|people|books|things|students|cars|children|persons|questions|problems|mistakes|times|days|years|ideas|words)\\b`, 'gi'), fn: (m) => `many ${m[1]}`, why: 'Use "many" with countable nouns.' },
  { re: new RegExp(`\\bmany (${MASS_N})s?\\b`, 'gi'), fn: (m) => `much ${m[1]}`, why: 'Use "much" with uncountable nouns.' },
  { re: new RegExp(`\\b(a )?few (${MASS_N})\\b`, 'gi'), fn: (m) => `${m[1] ? 'a little' : 'little'} ${m[2]}`, why: 'Use "little" with uncountable nouns ("few" is for countable ones).' },
  { re: /\b(every|each) (students|children|people|persons|men|women|friends|boys|girls|teachers|days|things|books|members) (are|were|have)\b/gi, fn: (m) => `${m[1]} ${SG[m[2].toLowerCase()]} ${{ are: 'is', were: 'was', have: 'has' }[m[3].toLowerCase()]}`, why: '"Every / each" is followed by a singular noun and verb.' },
  { re: /\b(every|each) (students|children|people|persons|men|women|friends|boys|girls|teachers|days|things|books|members)\b/gi, fn: (m) => `${m[1]} ${SG[m[2].toLowerCase()]}`, why: '"Every / each" is followed by a singular noun.' },
  { re: /\b(each|every one|either|neither) of (the|my|his|her|our|their|your) (\w+s) (have|are|were|do)\b/gi, fn: (m) => `${m[1]} of ${m[2]} ${m[3]} ${{ have: 'has', are: 'is', were: 'was', do: 'does' }[m[4].toLowerCase()]}`, why: '"Each of …" takes a singular verb.' },
  { re: /\bless (people|students|friends|books|cars|things|children|mistakes|problems|questions|days|apples|hours|calories)\b/gi, fn: (m) => `fewer ${m[1]}`, why: 'Use "fewer" with countable nouns.' },
  { re: new RegExp(`\\ba few (${MASS_N})\\b`, 'gi'), fn: (m) => `a little ${m[1]}`, why: 'Use "a little" with uncountable nouns.' },
  { re: /\b(another) (peoples|people|friends|things|books)\b/gi, fn: (m) => `other ${m[2]}`, why: 'Use "other" before a plural noun ("another" = one more).' },

];


const NOUN_SUBJ_VERBS = 'give|cook|live|work|play|like|love|want|need|go|come|eat|drink|speak|study|teach|help|make|take|get|see|know|think|run|walk|talk|watch|read|write|sleep|start|open|close|arrive|leave|bring|send|buy|sell|call|ask|tell|show|look|feel|sing|drive|wear|visit|use|try|stay|wait|enjoy|hate|prefer|believe|understand|finish|begin|keep|meet|pay|win|lose|travel|laugh|smile|cry'.split('|');
const RULES_EXTRA = [
  { re: new RegExp(`\\b(the|my|his|her|your|our|their|this|that|every|each) ([a-z]+) (${NOUN_SUBJ_VERBS.join('|')})\\b(?! (?:and|or) )`, 'gi'), fn: (m) => { const n = m[2].toLowerCase(); if (/s$/.test(n) || /^(people|children|men|women|police|staff|family|team|class|group|government|company|fish|sheep|first|last|next|other|same|only|best|new|old|good|bad|big|small|young|long|little|own|few|many|most|more|much|only|very|really|also|always|never|often|usually|just|still|already|not|all|both|can|will|would|should|could|must|may|might|do|does|did|have|has|had|am|is|are|was|were|be|been|to|and|but|or|if|when|that|which|who|where|why|how|what)$/.test(n)) return null; if (/ed$|ing$|ly$/.test(n)) return null; return `${m[1]} ${m[2]} ${third(m[3].toLowerCase())}`; }, nlb: /\b(?:to|can|will|would|should|could|must|may|might|do|does|did|let|make|made|help|saw|see|watch|watched|hear|heard|if) $|\b(?:to|and|or|but) (?:the|my|his|her|your|our|their) \w+ $/i, why: 'A singular subject (the teacher, my mother) takes a verb with -s (gives, cooks).' },
  { re: /\b(when|if|because|while|since|that|before|after|until) (it|he|she) (start|stop|begin|rain|come|go|work|look|seem|become|happen|take|make|get|need|want|like|love|know|think|say|use|run|ring|snow|help|keep|feel|cost|matter|depend|sound|arrive|leave|open|close|end|finish|fall|rise|change|become)\b/gi, fn: (m) => `${m[1]} ${m[2]} ${third(m[3].toLowerCase())}`, why: 'With he / she / it add -s to the verb (it starts).' },
  { re: /\ba (two|three|four|five|six|seven|eight|nine|ten|many|several|few|couple of)\b/gi, nlb: /\b(?:once|twice) $/i, fn: (m) => /^few$/i.test(m[1]) ? null : /^couple of$/i.test(m[1]) ? null : m[1], why: 'Do not use "a" before a number or "many".' },
  { re: /\b(where|what|when|why|how|who) (is|are) ((?:the|my|his|her|a|an|your|their|our|this|that) [a-z]+)\b/gi, lb: /\b(?:know|tell me|wonder|asks? me|asked me|understand|explain|remember|forget|see)\s+$/i, fn: (m) => `${m[1]} ${m[3]} ${m[2]}`, why: 'In a indirect question keep normal order: "where the station is".' },
  { re: /\b(am|is|are|was|were|be|feel|felt|get|got) (very |so |really |quite |not )?interesting (in|about)\b/gi, fn: (m) => `${m[1]} ${m[2] || ''}interested ${m[3]}`, why: 'You are interested in something; the thing is interesting.' },
  { re: /\b(want|wants|wanted|need|needs|needed|like|likes|liked|love|loves|hate|hates|try|tries|tried|plan|plans|planned|decide|decides|decided|hope|hopes|hoped|learn|learns|going|have|has|had|able|ought|used|how|where|what) to ([a-z]{3,}?)(ed)\b/gi, fn: (m) => { const st = m[2]; if (/^(need|want|embarrass|succe|exce|proce|ne)$/.test(st)) return null; const b = /(v|c|z|u|g)$/.test(st) || /^(lik|danc|hop|decid|us|mov|liv|arriv|improv|practic|invit|writ|shar|chang|leav|receiv|believ|continu|creat|describ|explain|enjoy)$/.test(st) ? st + 'e' : st.replace(/i$/, 'y'); return `${m[1]} to ${b}`; }, why: 'After "to" use the base verb (to learn), not the past tense.' },
];

const OVERREG = { goed: 'went', buyed: 'bought', teached: 'taught', runned: 'ran', eated: 'ate', drinked: 'drank', writed: 'wrote', speaked: 'spoke', taked: 'took', maked: 'made', gived: 'gave', getted: 'got', comed: 'came', thinked: 'thought', bringed: 'brought', catched: 'caught', falled: 'fell', forgetted: 'forgot', knowed: 'knew', leaved: 'left', losed: 'lost', sended: 'sent', spended: 'spent', telled: 'told', winned: 'won', swimmed: 'swam', singed: 'sang', drived: 'drove', sleeped: 'slept', feeled: 'felt', keeped: 'kept', builded: 'built', standed: 'stood', understanded: 'understood', childs: 'children', childrens: 'children', mans: 'men', womans: 'women', foots: 'feet', tooths: 'teeth', mouses: 'mice', peoples: 'people', informations: 'information', advices: 'advice', homeworks: 'homework', furnitures: 'furniture', equipments: 'equipment', luggages: 'luggage', knowledges: 'knowledge' };
const SUBJHAVE = (s) => (/^(he|she|it|is)$/i.test(s) ? 'has' : 'have');
const OBJ2SUBJ = { me: 'I', him: 'he', her: 'she', us: 'we', them: 'they', you: 'you' };
const STATEV = { knowing: ['know', 'known'], having: ['have', 'had'], wanting: ['want', 'wanted'], liking: ['like', 'liked'], loving: ['love', 'loved'], needing: ['need', 'needed'], believing: ['believe', 'believed'], understanding: ['understand', 'understood'], preferring: ['prefer', 'preferred'], hating: ['hate', 'hated'], remembering: ['remember', 'remembered'], owning: ['own', 'owned'] };
const DUR = '(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|\\d+|an?|several|many|a few|half an?) (?:hours?|minutes?|days?|weeks?|months?|years?)';
const SINCE = '(?:\\d{4}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|last \\w+|january|february|march|april|may|june|july|august|september|october|november|december|childhood|morning)';
const RULES_EXTRA2 = [
  { re: new RegExp('\\b(' + Object.keys(OVERREG).join('|') + ')\\b', 'gi'), fn: (m) => OVERREG[m[1].toLowerCase()], why: 'That word is irregular — use the correct form.' },
  { re: /\b(news|series|means|physics|mathematics|economics|politics|athletics) (are|were|have)\b/gi, fn: (m) => `${m[1]} ${{ are: 'is', were: 'was', have: 'has' }[m[2].toLowerCase()]}`, why: '“News” is singular: the news is…' },
  { re: /\b(everybody|everyone|somebody|someone|nobody|everything|something|nothing|anybody|anyone) (are|were|have|do)\b/gi, fn: (m) => `${m[1]} ${{ are: 'is', were: 'was', have: 'has', do: 'does' }[m[2].toLowerCase()]}`, why: 'Everybody / someone / nothing take a singular verb.' },
  { re: /\b(i|we|they|you|he|she) (have|has) (?:been|gone) to ([a-z ]+?) (yesterday|last (?:week|month|year|night|summer|winter|weekend|monday|tuesday|friday|saturday|sunday)|\w+ (?:days?|weeks?|months?|years?) ago)\b/gi, fn: (m) => `${m[1]} went to ${m[3]} ${m[4]}`, why: 'With a finished past time (last year, yesterday) use the past simple.' },
  { re: new RegExp('\\b(i am|i\'m|we are|we\'re|they are|they\'re|you are|you\'re|he is|he\'s|she is|she\'s) ([a-z]+ing)\\b([^.?!,]*?) (for|since) (' + DUR + '|' + SINCE + ')\\b', 'gi'), fn: (m) => { const w = m[2].toLowerCase(); if (STATEV[w]) return null; const sub = m[1].split(/[ ']/)[0]; return `${sub === 'I' || sub === 'i' ? 'I' : sub} ${SUBJHAVE(sub)} been ${m[2]}${m[3]} for ${m[5]}`.replace(/ for (\d{4}|monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|last \w+|january|february|march|april|may|june|july|august|september|october|november|december|childhood|morning)$/i, ' since $1'); }, why: 'Use the present perfect continuous (have been + -ing) with for / since.' },
  { re: /\b(i|we|they|you|he|she) (?:am|are|is) (knowing|having|wanting|liking|loving|needing|believing|understanding|preferring|hating|remembering|owning)\b([^.?!,]*?) (for|since) ([a-z0-9 ]+)/gi, fn: (m) => `${m[1]} ${SUBJHAVE(m[1])} ${STATEV[m[2].toLowerCase()][1]}${m[3]} ${m[4]} ${m[5]}`, why: 'State verbs (know, have, want) are not used in the continuous.' },
  { re: /\b(i|we|they|you|he|she|it) (?:am|are|is|was|were) (knowing|having|wanting|liking|loving|needing|believing|understanding|preferring|hating|remembering|owning)\b/gi, fn: (m) => { const v = STATEV[m[2].toLowerCase()][0], s = m[1].toLowerCase(); return `${m[1]} ${/^(he|she|it)$/.test(s) ? third(v) : v}`; }, why: 'State verbs (know, have, want) are not used in the continuous.' },
  { re: /\bsince (one|two|three|four|five|six|ten|an?|\d+|several|a few) (hours?|minutes?|days?|weeks?|months?|years?)\b/gi, fn: (m) => `for ${m[1]} ${m[2]}`, why: 'For + length of time; since + starting point.' },
  { re: /\b(i'm|i am|we're|we are|they're|they are) (waiting|working|studying|living|learning|staying|playing|teaching) (for [a-z0-9 ]+)/gi, fn: (m) => /\b(for (?:one|two|three|four|five|six|ten|an?|\d+|several|a few|half an?) (?:hours?|minutes?|days?|weeks?|months?|years?))\b/i.test(m[3]) ? `${/^i/i.test(m[1]) ? "I've" : /^we/i.test(m[1]) ? "we've" : "they've"} been ${m[2]} ${m[3]}` : null, why: 'For a length of time up to now, use have been + -ing.' },
  { re: /\b(explained|described|suggested|mentioned|announced|reported) (me|him|her|us|them|you) (the|a|an|my|his|her|our|their|your|this|that) ([a-z]+)\b/gi, fn: (m) => `${m[1]} ${m[3]} ${m[4]} to ${m[2]}`, why: '“Explain” takes the thing first: explain the problem to me.' },
  { re: /\bexplained to (me|him|her|us|them|you) (the|a|an|my|his|her|our|their|your|this|that) ([a-z]+)\b/gi, fn: (m) => `explained ${m[2]} ${m[3]} to ${m[1]}`, why: '“Explain” takes the thing first: explain the problem to me.' },
  { re: /\b(suggest|suggests|suggested|suggesting) to ([a-z]+)\b/gi, fn: (m) => `${m[1]} ${ingOf(m[2])}`, why: 'After “suggest” use -ing.' },
  { re: /\b(told|tell|tells|telling) to (me|him|her|us|them|you)\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: 'You tell someone — no “to”.' },
  { re: /\b(me|him|her|them) and (i|me|him|her|them|you|us)\b(?: (are|am|is|were|was|have|has|do|did))?/gi, fn: (m) => { const a = OBJ2SUBJ[m[1].toLowerCase()], b = OBJ2SUBJ[m[2].toLowerCase()] || m[2]; if (!a) return null; const first = /^(i)$/i.test(b) ? a : b; const v = m[3] ? ({ am: 'are', is: 'are', was: 'were', has: 'have' }[m[3].toLowerCase()] || m[3]) : ''; if (/^me$/i.test(m[1])) { const other = /^(you|him|her|them)$/i.test(m[2]) ? OBJ2SUBJ[m[2].toLowerCase()] : m[2]; return `${other} and I${v ? ' ' + v : ''}`; } return `${a} and ${/^(me)$/i.test(m[2]) ? 'I' : b}${v ? ' ' + v : ''}`; }, why: 'Use subject pronouns before the verb: “He and I”.' },
  { re: /\b(don't|doesn't|didn't|can't|won't|haven't|hasn't|hadn't|couldn't|wouldn't|never) ([a-z]+) no ([a-z]+)/gi, fn: (m) => `${m[1]} ${m[2]} any ${m[3]}`, why: 'Avoid double negatives: “don’t have any”.' },
  { re: /\b(does|did) ((?:the|my|his|her|your|their|our|this|that) [a-z]+|he|she|it|you|they|we|i) ([a-z]{3,})\b/gi, fn: (m) => { const v = m[3].toLowerCase(); let b = null; if (BASE[v]) b = BASE[v]; else { const c = [/ies$/.test(v) ? v.slice(0, -3) + 'y' : null, v.replace(/es$/, ''), v.replace(/s$/, ''), v.replace(/ed$/, ''), v.replace(/d$/, '')].filter(Boolean); b = c.find((x) => x !== v && NOUN_SUBJ_VERBS.indexOf(x) >= 0) || null; } return b && b !== v ? `${m[1]} ${m[2]} ${b}` : null; }, why: 'After do / does / did the verb stays in its base form.' },
  { re: /\b(asked|wondered|asks|ask) (me |him |her |us |them )?(what time|what|where|when|why|how|who) (is|are) (it|he|she|they|that|this|there|you|we|i)\b/gi, fn: (m) => `${m[1]} ${m[2] || ''}${m[3]} ${m[5]} ${/^(asks|ask)$/i.test(m[1]) ? m[4] : (m[4].toLowerCase() === 'are' ? 'were' : 'was')}`, why: 'In a reported question use statement order: “what time it was”.' },
  { re: /\bif (i|you|he|she|we|they|it) would have (?!been\b|had\b|gone\b|done\b|seen\b|known\b|made\b|taken\b|given\b|said\b|told\b|thought\b|brought\b|bought\b|found\b|left\b|kept\b|come\b|become\b|run\b|won\b|lost\b|heard\b|met\b|paid\b|sold\b|sent\b|spent\b|stood\b|written\b|\w+ed\b)/gi, fn: (m) => `if ${m[1]} had `, why: 'In an “if” clause use the past (if I had money), not “would have”.' },
  { re: /\bwish (i|we|you|he|she|they|it) (have|has|am|are|is|can|will|do|know|go|live|could)\b/gi, fn: (m) => `wish ${m[1]} ${{ have: 'had', has: 'had', am: 'were', are: 'were', is: 'were', can: 'could', will: 'would', do: 'did', know: 'knew', go: 'went', live: 'lived', could: 'could' }[m[2].toLowerCase()]}`, why: 'After “wish” use the past: I wish I had more time.' },
  { re: /\bthe (tall|short|big|small|fast|old|young|smart|long|high|large|fat|thin|cheap|rich|strong|weak|cold|hot|nic|eas|happi|heavi|light|clean|saf|slow|wis|new)er (in|of) /gi, fn: (m) => `the ${m[1]}est ${m[2]} `, why: 'Use the superlative (-est) with “the”.' },
  { re: /\bfew (time|money|water|milk|rice|sugar|advice|information|homework|work|luck|traffic|food|help|patience|space|energy)\b/gi, fn: (m) => `little ${m[1]}`, why: 'Use “little” with uncountable nouns.' },
  { re: /\b(a|an|many|much) (information|advice|furniture|equipment|luggage|knowledge|homework|news)\b/gi, fn: (m) => `${/^(a|an)$/i.test(m[1]) ? 'some' : 'a lot of'} ${m[2]}`, why: 'This noun is uncountable — no “a”, no plural.' },
  { re: /\b(my|your|his|her|our|their|the) (friend|brother|sister|mother|father|teacher|boss|neighbour|neighbor|student|doctor|manager|wife|husband|dog|cat|girl|boy)s (house|car|bag|book|phone|room|name|job|office|school|bike|family|life|idea|opinion|birthday|garden|laptop|home|bed|dress)\b/gi, fn: (m) => `${m[1]} ${m[2]}'s ${m[3]}`, why: 'Possessive: add ’s (my friend’s house).' },
  { re: /\bin home\b/gi, fn: () => 'at home', why: 'We say “at home”.' },
  { re: /\b(i am|i'm|we are|we're|they are|they're|you are|you're|he is|he's|she is|she's) (live|work|like|love|want|need|speak|teach|know)\b/gi, fn: (m) => { const s = m[1].split(/ |'/)[0], v = m[2].toLowerCase(); return `${/^i$/i.test(s) ? 'I' : s} ${/^(he|she)$/i.test(s) ? third(v) : v}`; }, why: 'Don’t add “am / is / are” before a normal verb.' },
  { re: /\b(asked|told|wanted|allowed|helped|forced|invited|advised|expected|ask|tell|want|allow|invite|advise|expect) (me|him|her|us|them|you) to ([a-z]{3,}?)(ed)\b/gi, fn: (m) => { const st = m[3]; const b = /(v|c|z|u|g)$/.test(st) ? st + 'e' : st.replace(/i$/, 'y'); return `${m[1]} ${m[2]} to ${b}`; }, why: 'After “to” use the base verb.' },
  { re: /\b(want|wants|wanted) (?:that )?(you|he|she|they|we|i) ([a-z]+?)(s|es)?\b(?= *[.?!,]|$)/gi, fn: (m) => { const o = { you: 'you', he: 'him', she: 'her', they: 'them', we: 'us', i: 'me' }[m[2].toLowerCase()]; return NOUN_SUBJ_VERBS.indexOf(m[3].toLowerCase()) >= 0 || m[4] ? `${m[1]} ${o} to ${m[3].toLowerCase() + ''}` : null; }, nlb: /\bto $/i, why: 'Say “want someone to do something”.' },
  { re: /\b(made|make|makes|making|let|lets) (me|him|her|us|them|you) to ([a-z]+)\b/gi, fn: (m) => `${m[1]} ${m[2]} ${m[3]}`, why: 'After make / let + person, use the base verb without “to”.' },
];

const COMPS = 'taller|shorter|bigger|smaller|faster|older|younger|smarter|longer|higher|larger|fatter|thinner|cheaper|richer|stronger|weaker|colder|hotter|nicer|easier|happier|heavier|lighter|cleaner|safer|slower|wiser|newer|better|worse|farther|further';
const SUPS = 'tallest|shortest|biggest|smallest|fastest|oldest|youngest|smartest|longest|highest|largest|fattest|thinnest|cheapest|richest|strongest|weakest|coldest|hottest|nicest|easiest|happiest|heaviest|lightest|cleanest|safest|slowest|wisest|newest|best|worst|finest|greatest|latest';
const NOTPLURAL = /^(people|children|men|women|police|staff|family|team|class|group|government|company|rich|poor|young|old|elderly|best|worst|other|others|rest|public|following|sheep|fish|deer|feet|teeth|mice|geese|data|media|criteria|phenomena|crowd|audience|committee|couple|number|majority|variety|lot|bunch|whole|same|first|last|next|only|both|all|many|few|most|more|several|some|any|these|those|two|three|four|five|six|ten|you|they|we|i|he|she|it|that|this|there|here|what|who|which|where|when|how|why|and|but|or|if|not|so|then|than|as|to|of|in|on|at|by|for|with|from|about)$/;
const SING_S = /^(news|series|species|means|physics|mathematics|economics|politics|athletics|lens|gas|chess|christmas|always|sometimes|perhaps|yes|bus|plus|thus|status|campus|virus|focus|bonus|circus|census|bias|canvas|atlas|alias|basis|crisis|analysis|diabetes|measles|billiards|darts|pants|jeans|scissors|glasses|trousers|shorts|clothes|goods|savings|belongings|surroundings|earnings|outskirts|premises|headquarters|species|bacteria)$/i;
const RULES_EXTRA3 = [
  { re: new RegExp('\\bfrom (' + DUR + ')\\b', 'gi'), lb: /\b(?:have|has|had) (?:been|lived|worked|studied|known|had|learned|learnt|stayed|taught)\b[^.?!]*$/i, fn: (m) => `for ${m[1]}`, why: 'Use “for” + a length of time.' },
  { re: /\belder than\b/gi, fn: () => 'older than', why: '“Elder” is not used with “than”: older than.' },
  { re: /\bgoing to (market|bank|office|station|park|library|temple|airport|mall|shop|store|cinema|gym|doctor|dentist|bazaar|supermarket|beach|zoo|museum)\b/gi, fn: (m) => `going to the ${m[1]}`, why: 'Add “the” before a specific place.' },
  { re: /\b(don't|doesn't|didn't|haven't|hasn't|hadn't|can't|won't|no) (?:have |has |had )?any (brother|sister|friend|book|child|question|idea|problem|car|pen|apple|sibling|cousin|pet|plan|reason|option|choice|dog|cat|bike|phone|ticket|job|class|exam|rule|message)\b/gi, fn: (m) => m[0] + 's', why: 'Use the plural after “any” for countable nouns.' },
  { re: /\b(the|these|those|my|your|his|her|our|their|all the|some) ([a-z]{4,}s) (is|was|has|does)\b/gi, fn: (m) => { const n = m[2].toLowerCase(); if (SING_S.test(n) || /(ss|us|is|ics|ous|ness)$/.test(n) || NOTPLURAL.test(n)) return null; return `${m[1]} ${m[2]} ${{ is: 'are', was: 'were', has: 'have', does: 'do' }[m[3].toLowerCase()]}`; }, nlb: /\b(?:of|one|each|every|either|neither|this|that|a|an) $/i, why: 'Plural subject — use are / were / have.' },
  { re: /\b(my|your|his|her|our|their|the|this|that) ([a-z]{3,}) (are|were)\b/gi, fn: (m) => { const n = m[2].toLowerCase(); if (/s$/.test(n) || NOTPLURAL.test(n) || /(ed|ing|ly|ful|ous|ive|al|ic|ish|ent|ant)$/.test(n)) return null; return `${m[1]} ${m[2]} ${m[3].toLowerCase() === 'are' ? 'is' : 'was'}`; }, nlb: /\b(?:all|both|these|those|of|some|many|few|several|two|three|four|five|six|ten|and|or|between|among|including|plus|with|by|from|to|for|than|as|like) $/i, why: 'Singular subject — use is / was.' },
  { re: /\b(like|love|enjoy|hate|want|need|miss|prefer|appreciate) very much ((?:the|this|that|these|those|my|his|her|our|their|your|a|an) [a-z]+(?: [a-z]+)?)(?=[.,!?]|$| (?:and|but|because|so)\b)/gi, fn: (m) => `${m[1]} ${m[2]} very much`, why: '“Very much” goes after the object: I like this film very much.' },
  { re: new RegExp('\\b(more [a-z]+|' + COMPS + ') that (him|her|me|us|them|you|he|she|they|we|i|my|his|their|our|your|the|a|an)\\b', 'gi'), fn: (m) => `${m[1]} than ${m[2]}`, why: 'Use “than” to compare.' },
  { re: new RegExp('\\b(?:most|more) (' + SUPS + ')\\b', 'gi'), fn: (m) => m[1], why: 'Don’t add “most” to an -est word.' },
  { re: new RegExp('\\b(?:most|more) (' + COMPS + ')\\b', 'gi'), fn: (m) => m[1], why: 'Don’t add “more” to an -er word.' },
  { re: /\b(good|bad|excellent|brilliant|poor|terrible|great|clever|weak|strong|useless|hopeless|best|worst) in (math|maths|mathematics|english|science|sports?|cooking|singing|drawing|football|cricket|speaking|writing|reading|physics|chemistry|history|biology|languages?|painting|swimming|dancing|[a-z]+ing)\b/gi, fn: (m) => `${m[1]} at ${m[2]}`, why: 'We say “good at” a skill or subject.' },
  { re: /\b(asked|ask|asks|wondered|wonder|wonders|know|knew|tell|told|don't know|didn't know|explain|explained) (me |him |her |us |them )?(what time|where|what|when|why|how|who) (do|does|did) (i|you|he|she|it|we|they) ([a-z]+)\b/gi, fn: (m) => { const aux = m[4].toLowerCase(), s = m[5].toLowerCase(), v = m[6].toLowerCase(); const f = aux === 'did' ? pastOf(v) : (aux === 'does' || /^(he|she|it)$/.test(s) ? third(v) : v); return `${m[1]} ${m[2] || ''}${m[3]} ${m[5]} ${f}`; }, why: 'In a reported question use statement order: “where I live”.' },
  { re: new RegExp('\\b(is|are) ((?:[a-z]+ed|stolen|broken|written|taken|given|chosen|forgotten|hidden|driven|eaten|known|seen|done|made|built|sold|bought|sent|lost|found|held|kept|left|paid|put|said|told|won|caught|taught|thought|brought|born)) (yesterday|last (?:night|week|month|year|summer|winter|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\\w+ (?:days?|weeks?|months?|years?|hours?|minutes?) ago)\\b', 'gi'), fn: (m) => `${m[1].toLowerCase() === 'is' ? 'was' : 'were'} ${m[2]} ${m[3]}`, why: 'A finished past time needs the past tense: was stolen.' },
  { re: /\bsuggest(?:ed|s)? (me|him|her|us|them) to ([a-z]+)\b/gi, fn: (m) => `suggested that ${OBJ2SUBJ[m[1].toLowerCase()]} should ${m[2]}`, why: 'Say “suggested that I see…”, not “suggested me to”.' },
  { re: /\b(what|where|when|why|how|who) (you|they|we|he|she|i) (want|need|like|think|mean|have|know|see|eat|drink|say|play|study|work|live|go|buy|take|make|get|read|watch|speak|call|do)\b(?! to be)/gi, lb: /(?:^|[.?!]\s*)$/, fn: (m) => `${m[1]} ${/^(he|she)$/i.test(m[2]) ? 'does' : 'do'} ${m[2]} ${m[3]}`, why: 'Questions need do / does: “What do you want?”' },
  { re: /\b(fond|jealous|capable) (to|from|for|with|about|in)\b/gi, fn: (m) => `${m[1]} of`, why: 'The right word: fond of / jealous of / capable of.' },
  { re: new RegExp('\\b(he|she|it) (' + NOUN_SUBJ_VERBS.join('|') + ')\\b(?!ing)(?![^.?!]*\\b(?:yesterday|ago|last (?:night|week|month|year|summer|winter|weekend))\\b)', 'gi'), nlb: /\b(?:to|can|could|will|would|shall|should|may|might|must|do|does|did|let|lets|make|makes|made|help|helps|saw|see|watch|watched|hear|heard|rather|than|dare|that|not|never) $|\b(?:yesterday|last (?:night|week|month|year|summer|winter|weekend))\b[^.?!]*$/i, fn: (m) => `${m[1]} ${third(m[2].toLowerCase())}`, why: 'With he / she / it add -s to the verb.' },
];

const RULES_EXTRA4 = [
  { re: new RegExp('\\b(' + COMPS + '|more [a-z]+|less [a-z]+|as [a-z]+) then ((?:him|her|me|us|them|you|he|she|they|we|i|my|his|their|our|your|the|a|an|before|ever)\\b)', 'gi'), fn: (m) => /^as /i.test(m[1]) ? null : `${m[1]} than ${m[2]}`, why: '“Than” compares; “then” is about time.' },
  { re: /\bby foot\b/gi, fn: () => 'on foot', why: 'We say “on foot”.' },
  { re: /\b(i am|i'm|we are|we're|they are|they're|you are|you're|he is|he's|she is|she's) ([a-z]+ing)\b([^.?!,]*?) since\b/gi, fn: (m) => { const w = m[2].toLowerCase(); if (STATEV[w]) return null; const sub = m[1].split(/[ ']/)[0]; return `${/^i$/i.test(sub) ? 'I' : sub} ${SUBJHAVE(sub)} been ${m[2]}${m[3]} since`; }, nlb: /\b(?:had|have|has) $/i, why: 'Use the present perfect continuous (have been + -ing) with since.' },
  { re: /\b(there) (is|was) (a lot of|lots of|plenty of|a number of|many|several|a few|a couple of) ([a-z]+)\b/gi, fn: (m) => { const n = m[4].toLowerCase(); if (/s$/.test(n) === false && !/^(people|children|men|women|police|feet|teeth|mice|geese)$/.test(n)) return null; if (/^(a lot of|lots of|plenty of)$/i.test(m[3]) && !/s$|^(people|children|men|women|police|feet|teeth|mice|geese)$/.test(n)) return null; return `${m[1]} ${m[2].toLowerCase() === 'is' ? 'are' : 'were'} ${m[3]} ${m[4]}`; }, why: 'Plural things → there are.' },
  { re: /\b(i|we|you|they) (?:'m|am|are|is) depends? on\b/gi, fn: (m) => `${m[1]} depend on`, why: '“Depend” is a normal verb: it depends on…' },
  { re: /\b(he|she|it) (?:is|'s) depends on\b/gi, fn: (m) => `${m[1]} depends on`, why: '“Depend” is a normal verb: it depends on…' },
  { re: /\b(it|he|she)'s (depend|work|live|like|want|need|know|come|go|look|seem|mean|matter|cost|belong|happen|sound)\b(?! (?:to|ing))/gi, fn: (m) => `${m[1]} ${third(m[2].toLowerCase())}`, why: '“It’s” = it is. For the verb use depends / works / lives.' },
  { re: /\b(i)'m (live|work|study|like|love|want|need|know|speak|teach|play|eat|drink|read|write|go)\b(?! (?:to|ing))/gi, fn: (m) => ['play', 'eat', 'drink', 'read', 'write', 'go'].indexOf(m[2].toLowerCase()) >= 0 ? `I'm ${ingOf(m[2])}` : `I ${m[2].toLowerCase()}`, why: 'Don’t add “am” before a normal verb.' },
  { re: /\b(children|people|men|women|police|feet|teeth|mice|geese) (is|was|has|does|plays|goes|likes|wants|comes|works|lives|eats|runs|speaks|studies|loves)\b/gi, fn: (m) => { const v = m[2].toLowerCase(); const map = { is: 'are', was: 'were', has: 'have', does: 'do' }; const b = map[v] || (/ies$/.test(v) ? v.slice(0, -3) + 'y' : /(oes|ches|shes|sses|xes)$/.test(v) ? v.slice(0, -2) : v.slice(0, -1)); return `${m[1]} ${b}`; }, nlb: /\b(?:a|an|one|each|every) (?:[a-z]+ )?(?:of )?$/i, why: 'Plural subject — no -s on the verb.' },
  { re: /\b(enjoyed|enjoy|enjoys|liked|loved|hated|appreciated|missed|preferred) very much ((?:the|this|that|these|those|my|his|her|our|their|your|a|an) [a-z]+(?: [a-z]+)?)(?=[.,!?]|$| (?:and|but|because|so)\b)/gi, fn: (m) => `${m[1]} ${m[2]} very much`, why: '“Very much” goes after the object.' },
  { re: /\b(said|says|told me|tells me|thought|knew|hoped|believed|felt|promised|decided|replied) (?:that )?(he|she|they|i|we|you|it) will\b/gi, fn: (m) => m[0].replace(/ will$/i, ' would'), why: 'After a past verb (said, thought) use would instead of will.' },
  { re: /\b(best|worst|tallest|fastest|oldest|youngest|smartest|strongest|greatest) (player|member|student|one|person|boy|girl|worker|player|speaker|writer|singer) of the (team|class|group|school|club|company|office)\b/gi, fn: (m) => `${m[1]} ${m[2]} ${m[3] === 'class' || m[3] === 'school' ? 'in' : 'on'} the ${m[3]}`, why: 'We say “in the class / on the team”.' },
];

const RULES = [
  ...RULES_EXTRA2,
  ...RULES_EXTRA4,
  ...RULES_EXTRA3,
  ...RULES_POS,
  ...RULES_EXTRA,
  /* ---------- extended rules ---------- */
  { re: new RegExp(`\\b(${SUBJ}) (${ACTV})\\b(?! been\\b)`, 'gi'), nlb: /\b(?:did|didn't|do|does|would|will|can|could|should|must|may|might|to|not|wouldn't|won't|couldn't) $/i, lb: new RegExp(`\\b${PASTMARK}\\b(?:\\W+\\w+){0,10}?\\W+$`, 'i'), fn: (m) => `${m[1]} ${pastOf(m[2])}`, why: 'The time word (yesterday / last week / ago) shows this happened in the past, so use the past tense.' },
  { re: new RegExp(`\\b(${SUBJ}) (${ACTV})\\b(?! been\\b)(?=(?:\\W+\\w+){0,8}?\\W+${PASTMARK})`, 'gi'), nlb: /\b(?:did|didn't|do|does|would|will|can|could|should|must|may|might|to|not|wouldn't|won't|couldn't) $/i, fn: (m) => `${m[1]} ${pastOf(m[2])}`, why: 'The time word (yesterday / last week / ago) shows this happened in the past, so use the past tense.' },
  { re: new RegExp(`\\b(${ACTV}|have)\\b`, 'gi'), lb: new RegExp(`\\b(?:${PASTFORMS}|[a-z]{2,}[^e]ed)\\b(?:\\W+\\w+){0,6}?\\W+(?:and|then|and then)\\W+(?:(?:${SUBJ})\\W+)?$`, 'i'), fn: (m) => pastOf(m[1]), why: 'Keep the same past tense for actions in the same story.' },
  { re: new RegExp(`\\b(${SUBJ}) (have|has) (${PASTFORMS}|gone|seen|eaten|taken|written|begun|spoken|done|given|known|driven|[a-z]+ed)\\b(?=(?:\\W+\\w+){0,8}?\\W+${PASTMARK})`, 'gi'), fn: (m) => `${m[1]} ${IRR_PP[m[3].toLowerCase()] || m[3]}`, why: 'With a finished time (yesterday, last year, ago) use the simple past, not have + past participle.' },
  { re: /\bthere (is|was) (many|several|two|three|four|five|six|seven|eight|nine|ten|so many|too many|a few|few|\d+)\b(?! (?:water|money|time|food|rice|milk|sugar|information|advice|work|help|traffic|luck|homework|music)\b)/gi, fn: (m) => `there ${m[1].toLowerCase() === 'is' ? 'are' : 'were'} ${m[2]}`, why: 'Plural things need "there are / there were".' },
  { re: /\b(people|children|men|women|police|others) (is|was|has)\b/gi, fn: (m) => `${m[1]} ${{ is: 'are', was: 'were', has: 'have' }[m[2].toLowerCase()]}`, why: 'Plural subjects (people, students, friends…) take are / were / have.' },
  { re: new RegExp(`\\b(${MASS.replace('|work','')})(?:s)? (are|were)\\b`, 'gi'), fn: (m) => `${m[1].replace(/s$/i, '')} ${m[2].toLowerCase() === 'are' ? 'is' : 'was'}`, why: 'This word is uncountable, so it takes is / was.' },
  { re: /\b(he|she|it) (are|were)\b/gi, nlb: /\b(?:if|wish|as) $|\b(?:both|either|neither) \w+ (?:and|or|nor) $/i, fn: (m) => `${m[1]} ${m[2].toLowerCase() === 'are' ? 'is' : 'was'}`, why: 'With he / she / it use is / was.' },
  { re: /\b(he|she|it) have\b(?! to)/gi, fn: (m) => `${m[1]} has`, why: 'With he / she / it use "has".' },
  { re: /\b(i) (are|were)\b/gi, nlb: /\b(?:and|or|nor|if|wish|as|though) $/i, fn: (m) => `I ${m[2].toLowerCase() === 'are' ? 'am' : 'was'}`, why: 'With "I" use am / was.' },
  { re: /\b(we|they|you|people) (was)\b/gi, fn: (m) => `${m[1]} were`, why: 'With we / they / you use "were".' },
  { re: /\b(i am|he is|she is|we are|they are|you are|i'm|he's|she's) (agree|disagree)\b/gi, fn: (m) => m[2].toLowerCase() === 'agree' ? (/^(i)/i.test(m[1]) ? 'I agree' : m[1].replace(/ (is|are)$/i, '').replace(/'s$/, '') + ' agrees') : 'I disagree', why: '"Agree" is a verb — no "am / is / are".' },
  { re: /\b(i|he|she|we|they|you) (am|is|are|was|were) (go|come|eat|play|work|study|do|read|write|live|watch|talk|walk|run|sleep|cook|drive|learn|make|take|get|help|try|stay|wait)\b/gi, fn: (m) => `${m[1]} ${m[2]} ${ingOf(m[3])}`, why: 'After am / is / are / was / were, a verb needs -ing (I am going).' },
  { nlb: new RegExp(`\\b(?:saw|see|watch|watched|hear|heard|made|make|let|keep|kept|found|find|catch|caught|had|have|get|got|help|helped|are|is|am|was|were|do|does|did|can|will|would|should|could|why|how|what|where|when|who|and|but|if|that|because)\\s$`, 'i'), re: new RegExp(`\\b(i|he|she|we|they|you) (going|doing|working|studying|playing|living|coming|eating|reading|watching|talking|waiting|learning|trying)\\b`, 'gi'), fn: (m) => `${m[1]} ${/^i$/i.test(m[1]) ? 'am' : /^(he|she)$/i.test(m[1]) ? 'is' : 'are'} ${m[2]}`, why: 'The -ing form needs am / is / are before it (I am going).' },
  { re: /\b(i) am not (understand|know|like|want|have|need|think|speak|see|hear|remember|believe)\b/gi, fn: (m) => `I don't ${m[2]}`, why: 'Use "don\'t + verb", not "am not + verb".' },
  { re: /\b(he|she) is not (understand|know|like|want|have|need|think|speak|see|hear|remember|believe)\b/gi, fn: (m) => `${m[1]} doesn't ${m[2]}`, why: 'Use "doesn\'t + verb", not "is not + verb".' },
  { re: /\b(he|she|it|this|that) (very|so|really|too) (beautiful|nice|good|happy|tall|smart|kind|busy|tired|angry|sad|big|small|pretty|funny|clever|important|difficult|easy|hard|expensive|cheap|interesting)\b/gi, fn: (m) => `${m[1]} is ${m[2]} ${m[3]}`, why: 'You need the verb "is" before the adjective.' },
  { re: /\b(i) (very|so|really|too) (happy|tired|busy|sad|glad|excited|angry|hungry|good|fine|nervous)\b/gi, fn: (m) => `I am ${m[2]} ${m[3]}`, why: 'You need "am" before the adjective.' },
  { re: /\b(we|they|you) (very|so|really|too) (happy|tired|busy|sad|glad|excited|angry|hungry|good|fine|nervous)\b/gi, fn: (m) => `${m[1]} are ${m[2]} ${m[3]}`, why: 'You need "are" before the adjective.' },
  { re: /\b(should|must|can|could|will|would|may|might|shall) to (\w+)\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: 'After can / should / must / will, use the bare verb — no "to".' },
  { re: /\b(can|could) able to\b/gi, fn: (m) => m[1], why: '"Can" already means "be able to" — use one of them.' },
  { re: /\b(will|would|must|should) can\b/gi, fn: (m) => `${m[1]} be able to`, why: 'Two modal verbs cannot go together: use "will be able to".' },
  { re: new RegExp(`\\b(can|could|will|would|should|must|may|might|shall|didn't|don't|did not|do not) (${LIST3})\\b`, 'gi'), fn: (m) => { const b = Object.entries({ speaks: 'speak', goes: 'go', does: 'do', has: 'have', wants: 'want', likes: 'like', needs: 'need', makes: 'make', takes: 'take', thinks: 'think', knows: 'know', says: 'say', comes: 'come', lives: 'live', works: 'work', plays: 'play', eats: 'eat', watches: 'watch', looks: 'look', loves: 'love', studies: 'study', feels: 'feel', gets: 'get', uses: 'use', tries: 'try', helps: 'help', enjoys: 'enjoy' }).find(([k]) => k === m[2].toLowerCase()); return b ? `${m[1]} ${b[1]}` : null; }, why: 'After can / will / did / don\'t use the base verb — no -s or -ed.' },
  { re: new RegExp(`\\b(want|wants|wanted|need|needs|like|likes|love|loves|hope|plan|decide|decided|try|tried|how|going|have|has|had|able|ready|used|supposed) to (became|went|saw|ate|took|came|made|said|began|spoke|wrote|bought|gave|got|knew|did|ran|drove|brought|thought)\\b`, 'gi'), fn: (m) => { const b = BASE[m[2].toLowerCase()] || ({ became: 'become', began: 'begin', ran: 'run', came: 'come' })[m[2].toLowerCase()]; return b ? `${m[1]} to ${b}` : null; }, why: 'After "to" use the base verb, not the past tense.' },
  { re: /\b(enjoy|enjoys|enjoyed|avoid|finish|finished|mind|keep|kept|consider|practice|practise|miss) to (\w+)\b/gi, fn: (m) => `${m[1]} ${ingOf(m[2])}`, why: 'After enjoy / avoid / finish / mind / keep use the -ing form.' },
  { re: new RegExp(`\\blook(ing|s|ed)? forward to (${GER})\\b`, 'gi'), fn: (m) => `look${m[1] || ''} forward to ${ingOf(m[2])}`, why: 'In "look forward to", "to" is a preposition, so use -ing (meeting).' },
  { re: /\b(married|marry) with\b/gi, fn: (m) => (m[1].toLowerCase() === 'married' ? 'married to' : 'marry'), why: 'Say "married TO" / "marry someone" (no preposition).' },
  { re: /\b(interested|interesting) (on|about|for)\b/gi, fn: () => 'interested in', why: 'Say "interested IN".' },
  { re: /\b(good|bad) in (\w+ing|english|maths?|math|sports?|cooking|singing|drawing|science|speaking|writing|reading|football|cricket)\b/gi, fn: (m) => `${m[1]} at ${m[2]}`, why: 'Say "good AT" a skill.' },
  { re: /\b(angry|upset|annoyed|mad) (on|at) (me|him|her|them|us|you|my \w+)\b/gi, fn: (m) => (/^(on)$/i.test(m[2]) ? `${m[1]} with ${m[3]}` : null), why: 'Say "angry WITH someone".' },
  { re: /\b(afraid|scared|proud|jealous|fond|tired) (from|off) (\w+)\b/gi, fn: (m) => (/^tired$/i.test(m[1]) ? null : `${m[1]} of ${m[3]}`), why: 'Say "afraid OF / proud OF / jealous OF".' },
  { re: /\b(similar|equal) with\b/gi, fn: (m) => `${m[1]} to`, why: 'Say "similar TO".' },
  { re: /\bresponsible of\b/gi, fn: () => 'responsible for', why: 'Say "responsible FOR".' },
  { re: /\b(satisfied|pleased|happy) from\b/gi, fn: (m) => `${m[1]} with`, why: 'Say "satisfied WITH".' },
  { re: /\b(reach|reached|reaches|reaching) to\b/gi, fn: (m) => m[1], why: '"Reach" needs no "to": reached the station.' },
  { re: /\b(enter|entered|enters|entering) into (the|a|an|my|his|her)\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: '"Enter" needs no "into".' },
  { re: /\bpay(ing)? attention (on|at|for)\b/gi, fn: (m) => `pay${m[1] || ''} attention to`, why: 'Say "pay attention TO".' },
  { re: /\blook(ing)? forward (for|at)\b/gi, fn: (m) => `look${m[1] || ''} forward to`, why: 'Say "look forward TO".' },
  { re: /\b(go|went|come|came|going|coming|goes|return|returned|returning) to home\b/gi, fn: (m) => `${m[1]} home`, why: '"Home" needs no "to": go home.' },
  { re: /\b(discussed|discussing|discusses) about\b/gi, fn: (m) => m[1], why: '"Discuss" already includes "about".' },
  { re: /\bsince ((?:\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|few|several|many|half) (?:an |a )?(?:hours?|days?|weeks?|months?|years?|minutes?))\b/gi, fn: (m) => `for ${m[1]}`, why: 'Use "for" with a length of time (for two hours); "since" is for a starting point (since 9 am).' },
  { re: /\bfrom (the )?past (\d+|few|two|three|four|five|six|seven|many|several) (years|months|days|weeks|hours)\b/gi, fn: (m) => `for the past ${m[2]} ${m[3]}`, why: 'Say "for the past two years".' },
  { re: /\b(am|is|are|was|were|been|stay|stayed|living|working|studying|waiting|staying|learning|stay) ((?:\w+ ){0,3})from (last (?:year|month|week|night)|yesterday|this morning|morning)\b(?! to\b)/gi, fn: (m) => `${m[1]} ${m[2]}since ${m[3]}`, why: 'Use "since" for a starting point in time, not "from".' },
  { re: /\bi (very|too) (like|love|enjoy|hate|want|need)\b/gi, fn: (m) => `I really ${m[2]}`, why: '"Very" cannot go before a verb — say "really like" or "like … very much".' },
  { re: /\b(like|love|enjoy|hate|want|need)s? very much (?!to\b|the\b|a\b|an\b|my\b|your\b|you\b|him\b|her\b|it\b|them\b|that\b|this\b|his\b|our\b)(\w+)\b/gi, fn: (m) => `${m[1]} ${m[2]} very much`, why: 'Put the object before "very much": I like music very much.' },
  { re: /\btoo much (tired|good|nice|happy|beautiful|hot|cold|busy|sad|bad|hungry|angry|big|small|late|early|difficult|easy|expensive|tasty)\b/gi, fn: (m) => `very ${m[1]}`, why: 'Use "very" (not "too much") before an adjective.' },
  { re: /\bprefer (\w+) than (\w+)\b/gi, fn: (m) => `prefer ${m[1]} to ${m[2]}`, why: 'Say "prefer X TO Y".' },
  { re: /\bsaid me\b/gi, fn: () => 'told me', why: 'Use "told me" (said + to me).' },
  { re: /\b(he|she|they|i|we) told that\b/gi, fn: (m) => `${m[1]} said that`, why: '"Tell" needs a person: told me that / said that.' },
  { re: /\bborrow me\b/gi, fn: () => 'lend me', why: 'You borrow FROM someone; to give something to me is "lend me".' },
  { re: /\bexplain(s|ed|ing)? me\b/gi, fn: (m) => `explain${m[1] || ''} to me`, why: 'Say "explain (something) TO me".' },
  { re: /\bdon'?t (know|have|see|want|like|need|understand|think)( \w+)? nothing\b/gi, fn: (m) => m[0].replace(/nothing$/i, 'anything'), why: 'Avoid a double negative — use "anything" after don\'t.' },
  { re: /\b(doesn't|didn't|don't|can't|won't) ((?:\w+ ){0,2})nothing\b/gi, fn: (m) => `${m[1]} ${m[2]}anything`, why: 'Avoid a double negative — use "anything".' },
  { re: /\bhe (don't|do not)\b/gi, fn: () => "he doesn't", why: 'With he / she / it use "doesn\'t".' },
  { re: /\bif (i|you|we|they) will (\w+)\b/gi, fn: (m) => `if ${m[1]} ${m[2]}`, why: 'After "if", use the present tense — not "will".' },
  { re: /\bif (he|she|it) will (\w+)\b/gi, fn: (m) => `if ${m[1]} ${third(m[2])}`, why: 'After "if", use the present tense — not "will".' },
  { re: /^(what|where|why|how)( you| he| she| they| we) (are|is|was|were)\b/gim, fn: (m) => { const s = m[2].trim().toLowerCase(), v = m[3].toLowerCase(); return `${m[1]} ${v === 'is' && s === 'i' ? 'am' : v} ${s}`; }, why: 'In a question, the verb comes first: "What are you doing?"' },
  { re: /(^|[.?!] )me and (my \w+|him|her|them)\b/gi, fn: (m) => `${m[1]}${m[2]} and I`, why: 'As the subject, say "my friend and I" (not "me and my friend").' },
  { re: /\b(i am|he is|she is|we are|they are|you are|i'm|when i was|when he was|when she was) (child|kid|student|teacher|doctor|engineer|boy|girl|fan|manager|developer|nurse|lawyer|baby|teenager|beginner|engineer)\b/gi, fn: (m) => `${m[1]} ${AN(m[2])}`, why: 'Add "a / an" before a job or role.' },
  { re: /\bmore (taller|bigger|easier|harder|faster|slower|older|younger|cheaper|smarter|stronger|nicer|happier|better|worse)\b/gi, fn: (m) => m[1], why: 'Don\'t use "more" with a word that already ends in -er.' },
  { re: /\bevery (days|weeks|months|years|mornings|nights|times|weekends)\b/gi, fn: (m) => `every ${m[1].slice(0, -1)}`, why: 'After "every" use the singular: every day.' },
  { re: /\b(one|some|many|most|two|three|each|all) of (my|the|his|her|their|our|your) (friend|student|teacher|brother|sister|colleague|classmate|book|movie|film|song|neighbour|neighbor|cousin|relative|reason|problem|thing)(?!\w)/gi, fn: (m) => `${m[1]} of ${m[2]} ${m[3]}s`, why: 'After "one of / some of / many of the…" use the plural noun.' },
  { re: /\b(many|few|several|these|those) (time|day|year|week|month|hour|minute|person|friend|thing|problem|book)(?!\w)/gi, fn: (m) => `${m[1]} ${m[2]}s`, why: 'After many / few / several / these / those use a plural noun.' },
  { re: /\bmany works\b/gi, fn: () => 'a lot of work', why: '"Work" (jobs to do) is uncountable — say "a lot of work".' },
  { re: /\ba (honest|hour|honour|honor|heir)\b/gi, fn: (m) => `an ${m[1]}`, why: 'The "h" is silent, so use "an".' },
  { re: /\ban (university|user|uniform|unit|european|one|useful|usual|unique)\b/gi, fn: (m) => `a ${m[1]}`, why: 'It starts with a "y/w" sound, so use "a".' },
  { re: /\b(i|you|we|they|he|she) (have|has) (\d{1,3}) years?(?! old)\b/gi, fn: (m) => `${/^i$/i.test(m[1]) ? 'I am' : /^(he|she)$/i.test(m[1]) ? m[1] + ' is' : m[1] + ' are'} ${m[3]} years old`, why: 'Say "I am 20 years old" — age uses "be", not "have".' },
  { re: /\b(i am|i'm) (very much|so much|much) (interesting|interested)( in)?\b/gi, fn: () => 'I am very interested in', why: 'Say "I am very interested IN".' },
  { re: /\bi am having (a|an) (car|house|bike|phone|laptop|brother|sister|dog|cat|job|friend|doubt|question|idea|sister|computer)\b/gi, fn: (m) => `I have ${m[1]} ${m[2]}`, why: '"Have" (owning) is a state verb — not used with -ing.' },
  { re: /(^|[.?!] )(my \w+) and me (go|goes|went|are|were|have|like|play|live|work|study|want)\b/gi, fn: (m) => `${m[1]}${m[2]} and I ${({ goes: 'go' })[m[3].toLowerCase()] || m[3]}`, why: 'As the subject, say "my friend and I".' },
  { re: /\b(i|we|they|you) (is)\b/gi, fn: (m) => `${m[1]} ${/^i$/i.test(m[1]) ? 'am' : 'are'}`, why: 'Use am / are with I / we / they / you.' },
  { re: /\b(go|went|goes) (to )?(the )?(market|shop|school|college|office|park|temple|gym|mall|hospital|station) (and )?(buy|eat|play)\b(?!ing)/gi, fn: () => null, why: '' },

  { re: /\b(very|so|too|quite|really|extremely|most) (important|good|big|difficult|useful|easy|hard|interesting|beautiful|expensive|happy|helpful|necessary|popular|different|small|large|nice|great|bad|cheap|tired|busy|hungry|sad|strong|simple)s\b/gi, fn: (m) => `${m[1]} ${m[2]}`, why: 'Adjectives never take -s, even with a plural noun.' },
  { re: /\b(more|most) (better|easier|bigger|harder|worse|cheaper|faster|smaller|taller|older)\b/gi, fn: (m) => m[2], why: 'Don\'t use "more" with a word that is already comparative.' },
  { re: /\bi am agree\b/gi, fn: () => 'I agree', why: '"Agree" is a verb — no "am".' },
  { re: /\b(he|she|it) don't\b/gi, fn: (m) => `${m[1]} doesn't`, why: 'With he / she / it use "doesn\'t".' },
  { re: /\b(i|you|we|they) doesn't\b/gi, fn: (m) => `${m[1]} don't`, why: 'With I / you / we / they use "don\'t".' },
  { re: /\bmuch (people|friends|books|things|students|cars)\b/gi, fn: (m) => `many ${m[1]}`, why: 'Use "many" with countable nouns.' },
  { re: new RegExp(`\\b(he|she|it) (${VERBS3})\\b`, 'gi'), fn: (m, c) => (AUX.test(prev(c)) ? null : `${m[1]} ${third(m[2])}`), why: 'Subject–verb agreement: after he / she / it, the present-tense verb takes -s / -es.' },
  { re: /\bi (is|has|does)\b/gi, nlb: /\b(?:and|or|nor) $/i, fn: (m) => `I ${{ is: 'am', has: 'have', does: 'do' }[m[1].toLowerCase()]}`, why: 'With "I" use am / have / do.' },
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
];
const WEAK2 = [
  [/\b(?:very|really|so|extremely) good\b/i, ['excellent', 'superb', 'outstanding']],
  [/\b(?:very|really|so|extremely) bad\b/i, ['terrible', 'awful', 'dreadful']],
  [/\b(?:very|really|so|extremely) big\b/i, ['huge', 'enormous', 'massive']],
  [/\b(?:very|really|so|extremely) small\b/i, ['tiny', 'minuscule']],
  [/\b(?:very|really|so|extremely) happy\b/i, ['delighted', 'thrilled', 'overjoyed']],
  [/\b(?:very|really|so|extremely) sad\b/i, ['heartbroken', 'devastated']],
  [/\b(?:very|really|so|extremely) tired\b/i, ['exhausted', 'worn out']],
  [/\b(?:very|really|so|extremely) important\b/i, ['essential', 'crucial', 'vital']],
  [/\b(?:very|really|so|extremely) interesting\b/i, ['fascinating', 'captivating']],
  [/\b(?:very|really|so|extremely) hungry\b/i, ['starving', 'ravenous']],
  [/\b(?:very|really|so|extremely) angry\b/i, ['furious', 'livid']],
  [/\b(?:very|really|so|extremely) scared\b/i, ['terrified', 'petrified']],
  [/\b(?:very|really|so|extremely) funny\b/i, ['hilarious']],
  [/\b(?:very|really|so|extremely) pretty\b/i, ['gorgeous', 'stunning']],
  [/\b(?:very|really|so|extremely) beautiful\b/i, ['gorgeous', 'breathtaking']],
  [/\b(?:very|really|so|extremely) cold\b/i, ['freezing', 'icy']],
  [/\b(?:very|really|so|extremely) hot\b/i, ['scorching', 'boiling']],
  [/\b(?:very|really|so|extremely) hard\b/i, ['challenging', 'demanding']],
  [/\b(?:very|really|so|extremely) difficult\b/i, ['daunting', 'formidable']],
  [/\b(?:very|really|so|extremely) easy\b/i, ['effortless', 'straightforward']],
  [/\b(?:very|really|so|extremely) old\b/i, ['ancient', 'elderly']],
  [/\b(?:very|really|so|extremely) new\b/i, ['brand-new', 'innovative']],
  [/\b(?:very|really|so|extremely) fast\b/i, ['rapid', 'lightning-fast']],
  [/\b(?:very|really|so|extremely) slow\b/i, ['sluggish']],
  [/\b(?:very|really|so|extremely) smart\b/i, ['brilliant', 'ingenious']],
  [/\b(?:very|really|so|extremely) clean\b/i, ['spotless', 'immaculate']],
  [/\b(?:very|really|so|extremely) dirty\b/i, ['filthy']],
  [/\b(?:very|really|so|extremely) surprised\b/i, ['astonished', 'stunned']],
  [/\b(?:very|really|so|extremely) surprising\b/i, ['astonishing', 'startling']],
  [/\b(?:very|really|so|extremely) nice\b/i, ['lovely', 'delightful']],
  [/\b(?:very|really|so|extremely) wet\b/i, ['soaked', 'drenched']],
  [/\b(?:very|really|so|extremely) dark\b/i, ['pitch-black']],
  [/\b(?:very|really|so|extremely) quiet\b/i, ['silent', 'hushed']],
  [/\b(?:very|really|so|extremely) loud\b/i, ['deafening']],
  [/\b(?:very|really|so|extremely) rich\b/i, ['wealthy', 'affluent']],
  [/\b(?:very|really|so|extremely) poor\b/i, ['impoverished']],
  [/\b(?:very|really|so|extremely) strong\b/i, ['powerful', 'robust']],
  [/\b(?:very|really|so|extremely) weak\b/i, ['feeble', 'fragile']],
  [/\b(?:very|really|so|extremely) busy\b/i, ['swamped', 'snowed under']],
  [/\b(?:very|really|so|extremely) boring\b/i, ['tedious', 'dull']],
  [/\b(?:very|really|so|extremely) excited\b/i, ['thrilled', 'ecstatic']],
  [/\b(?:very|really|so|extremely) worried\b/i, ['anxious', 'distressed']],
  [/\b(?:very|really|so|extremely) confused\b/i, ['baffled', 'bewildered']],
  [/\b(?:very|really|so|extremely) sure\b/i, ['certain', 'convinced']],
  [/\b(?:very|really|so|extremely) different\b/i, ['distinct', 'unique']],
  [/\b(?:very|really|so|extremely) famous\b/i, ['renowned', 'legendary']],
  [/\b(?:very|really|so|extremely) useful\b/i, ['invaluable', 'indispensable']],
  [/\b(?:very|really|so|extremely) expensive\b/i, ['pricey', 'costly', 'exorbitant']],
  [/\b(?:very|really|so|extremely) cheap\b/i, ['inexpensive', 'affordable']],
  [/\b(?:very|really|so|extremely) long\b/i, ['lengthy', 'extensive']],
  [/\b(?:very|really|so|extremely) delicious\b/i, ['mouth-watering', 'scrumptious']],
  [/\b(?:very|really|so|extremely) tasty\b/i, ['delectable']],
];
const UPGRADE = [
  [/\b(?:i|we|you|they|he|she|to) get\b/i, ['obtain', 'receive', 'acquire']],
  [/\b(?:i|we|you|they|he|she|to) got\b/i, ['obtained', 'received', 'acquired']],
  [/\bmake sure\b/i, ['ensure', 'verify']],
  [/\btalk about\b/i, ['discuss', 'address']],
  [/\blook at\b/i, ['examine', 'inspect']],
  [/\blook for\b/i, ['search for', 'seek']],
  [/\bfind out\b/i, ['discover', 'determine']],
  [/\b(?:i|we|you|they|he|she|to) buy\b/i, ['purchase']],
  [/\blots of\b/i, ['plenty of', 'numerous']],
  [/\bbecause of\b/i, ['due to', 'owing to']],
  [/\bstuff\b/i, ['things', 'belongings', 'items']],
  [/\bidea\b/i, ['concept', 'notion', 'suggestion']],
  [/\bproblem\b/i, ['issue', 'challenge', 'obstacle']],
  [/\bchance\b/i, ['opportunity']],
  [/\bmistake\b/i, ['error', 'slip']],
  [/\bboss\b/i, ['manager', 'supervisor']],
  [/\b(?:i|we|you|they|he|she|to) fix\b/i, ['repair', 'resolve']],
  [/\b(?:i|we|you|they|he|she|to) enjoy\b/i, ['relish', 'appreciate']],
  [/\b(?:i|we|you|they|he|she|to) hate\b/i, ['detest', 'despise']],
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

  for (let pass = 0; pass < 2; pass++) for (const r of RULES) {
    corrected = corrected.replace(r.re, (...args) => {
      const hasNamed = typeof args[args.length - 1] === 'object';
      const oi = args.length - (hasNamed ? 3 : 2);
      const m = args.slice(0, oi);
      const offset = args[oi];
      if (r.lb && !r.lb.test(corrected.slice(0, offset))) return m[0];
      if (r.nlb && r.nlb.test(corrected.slice(0, offset))) return m[0];
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
  { const seenU = new Set(vocab.map((v) => v.used.toLowerCase()));
    for (const [re, better] of [...WEAK2, ...UPGRADE]) {
      if (vocab.length >= 4) break;
      const m = text.match(re);
      if (m && !seenU.has(m[0].toLowerCase())) { seenU.add(m[0].toLowerCase()); vocab.push({ type: 'vocab', used: m[0].replace(/^(?:i|we|you|they|he|she|to) /i, ''), better }); }
    } }
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
    text, corrected: corrected === text ? null : corrected.replace(/\bi\b/g, 'I').replace(/^\s*([a-z])/, (x) => x.toUpperCase()).replace(/\bI'm\b/g, "I'm"),
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
