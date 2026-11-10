/* Procedural portrait generator: makePortrait(look) -> SVG string (mouth has class .mo for lip-sync) */
(function () {
  let n = 0;
  const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
  function mix(hex, to, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex), b = p(to);
    return '#' + a.map((v, i) => clamp(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const lighter = (h, t) => mix(h, '#ffffff', t), darker = (h, t) => mix(h, '#000000', t);
  const OK = /^#[0-9a-f]{6}$/i;
  const FX = `<g class="fx fx-happy"><path d="M38 66 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#fff3a0"/><path d="M162 80 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z" fill="#fff3a0"/><path d="M150 38 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff"/></g><path class="fx fx-think" d="M146 62 q9 13 0 22 q-9 -9 0 -22z" fill="#9fe3ff" stroke="#fff" stroke-width="1.5"/><g class="fx fx-love"><path d="M152 34 c-6 -10 -18 0 -8 10 l8 8 8 -8 c10 -10 -2 -20 -8 -10z" fill="#ff5d8f"/><path d="M40 52 c-4 -7 -12 0 -5 7 l5 5 5 -5 c7 -7 -1 -14 -5 -7z" fill="#ff8fb3"/></g>`;

  function anime(L) {
    const ok = (v, d) => (OK.test(v) ? v : d);
    const skin = ok(L.skin, '#ffe3d0'), hair = ok(L.hair, '#19b9a6'), eyes = ok(L.eyes, '#2b7de0'), outfit = ok(L.outfit, '#ffcf33'), lips = ok(L.lips, '#e0707a');
    const bg = Array.isArray(L.bg) && OK.test(L.bg[0]) && OK.test(L.bg[1]) ? L.bg : ['#7fd6ff', '#3a2a8a'];
    const st = L.hairStyle || 'bob', acc = L.acc || [], has = (a) => acc.includes(a), u = 'a' + ++n;
    const hl = lighter(hair, .38), hd = darker(hair, .35), line = darker(hair, .6);
    let s = `<svg viewBox="0 0 200 200" class="pf"><defs>
<linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
<linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hl}"/><stop offset=".45" stop-color="${hair}"/><stop offset="1" stop-color="${hd}"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighter(skin, .25)}"/><stop offset="1" stop-color="${darker(skin, .06)}"/></linearGradient>
<linearGradient id="${u}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${darker(eyes, .45)}"/><stop offset=".55" stop-color="${eyes}"/><stop offset="1" stop-color="${lighter(eyes, .55)}"/></linearGradient></defs>
<rect width="200" height="200" fill="url(#${u}b)"/>
<g fill="#fff" opacity=".55"><circle cx="30" cy="40" r="2.2"/><circle cx="168" cy="30" r="3"/><circle cx="176" cy="92" r="1.8"/><path d="M150 54 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/></g>`;
    // back hair
    s += '<g class="hb">';
    if (st === 'twintails') s += `<path d="M62 74 C14 84 10 154 34 196 C50 166 56 124 66 98Z" fill="url(#${u}h)"/><path d="M138 74 C186 84 190 154 166 196 C150 166 144 124 134 98Z" fill="url(#${u}h)"/>`;
    if (st === 'ponytail') s += `<path d="M130 56 C186 50 196 120 168 176 C160 140 150 118 136 100Z" fill="url(#${u}h)"/>`;
    if (st === 'long') s += `<path d="M48 150 C32 110 36 46 100 32 C164 46 168 110 152 150 L158 200 L42 200Z" fill="url(#${u}h)"/>`;
    if (st === 'bob') s += `<path d="M50 130 C42 50 76 30 100 30 C124 30 158 50 150 130 C130 118 70 118 50 130Z" fill="url(#${u}h)"/>`;
    if (st === 'messy' || st === 'spiky') s += `<path d="M58 96 C50 60 66 36 100 32 C134 36 150 60 142 96Z" fill="url(#${u}h)"/>`;
    s += '</g>';
    if (has('catears')) s += `<path d="M62 56 L52 18 L92 40Z M138 56 L148 18 L108 40Z" fill="${hair}"/><path d="M64 48 L58 28 L82 42Z M136 48 L142 28 L118 42Z" fill="#ff9ab5"/>`;
    // body
    s += `<path d="M22 200 C26 158 60 148 100 148 C140 148 174 158 178 200Z" fill="${outfit}"/><path d="M22 200 C26 158 60 148 100 148 C140 148 174 158 178 200Z" fill="#000" opacity=".12"/>`;
    s += `<path d="M78 150 L100 178 L122 150Z" fill="#fff" opacity=".92"/>`;
    s += `<path d="M86 132 h28 v22 q-14 10 -28 0z" fill="${darker(skin, .1)}"/>`;
    if (has('scarf')) s += `<path d="M64 150 C80 164 120 164 136 150 L140 168 C120 182 80 182 60 168Z" fill="#d6405a"/><path d="M118 164 l12 34 -16 -4z" fill="#b22f48"/><path d="M70 158 q30 12 60 0" stroke="#fff" stroke-opacity=".4" stroke-width="2" fill="none"/>`;
    if (!has('scarf') && st !== 'none') s += `<path d="M94 154 L100 170 L106 154Z" fill="#c0243f"/>`;
    if (has('elfears')) s += `<path d="M66 92 L34 74 L66 108Z M134 92 L166 74 L134 108Z" fill="${skin}"/><path d="M62 94 L42 82 L62 102Z M138 94 L158 82 L138 102Z" fill="#ff9aa0" opacity=".45"/>`;
    // face
    s += `<path d="M100 46 C72 46 64 70 66 98 C68 124 84 142 100 150 C116 142 132 124 134 98 C136 70 128 46 100 46Z" fill="url(#${u}s)"/>`;
    s += `<ellipse cx="76" cy="116" rx="11" ry="6" fill="#ff7b8a" opacity=".32"/><ellipse cx="124" cy="116" rx="11" ry="6" fill="#ff7b8a" opacity=".32"/>`;
    if (has('beard')) s += `<path d="M68 120 C70 162 88 176 100 176 C112 176 130 162 132 120 C122 140 78 140 68 120Z" fill="#f4f4f4"/>`;
    // eyes
    const eye = (cx, m) => `<g class="eye"><ellipse cx="${cx}" cy="97" rx="11" ry="13.5" fill="#fff"/><ellipse cx="${cx}" cy="99" rx="9" ry="12" fill="url(#${u}i)"/><ellipse cx="${cx}" cy="100" rx="4.4" ry="7" fill="#150c20"/><ellipse cx="${cx - 3.5 * m}" cy="93" rx="3.6" ry="4.4" fill="#fff"/><circle cx="${cx + 4.5 * m}" cy="105" r="1.9" fill="#fff" opacity=".9"/><path d="M${cx - 12} 90 Q${cx} 80 ${cx + 12} 90" stroke="${line}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M${cx - 12 * m} 90 l${-4 * m} 3" stroke="${line}" stroke-width="2.6" stroke-linecap="round"/></g>`;
    s += `<g class="eyes">${eye(82, 1)}${eye(118, -1)}</g>`;
    s += `<path d="M70 80 q12 -6 22 -2 M108 78 q10 -4 22 2" stroke="${hd}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M100 114 q-2 3 0 4" stroke="${darker(skin, .3)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    s += `<g class="mouth"><ellipse class="mo" cx="100" cy="129" rx="6.5" ry="4.5" fill="#5a1626"/><path d="M92 127 q8 7 16 0" stroke="${lips}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`;
    // front hair / bangs
    s += '<g class="hf">';
    if (st === 'spiky') s += `<path d="M62 98 L50 58 L74 68 L72 32 L92 52 L106 24 L116 52 L138 36 L132 68 L152 60 L138 100 C132 80 122 66 106 66 C86 66 70 80 62 98Z" fill="url(#${u}h)"/>`;
    else if (st === 'messy') s += `<path d="M62 100 C50 56 78 28 104 30 C134 32 152 60 138 102 C136 84 130 72 120 66 L114 84 L106 62 L98 86 L90 64 C78 72 68 84 62 100Z" fill="url(#${u}h)"/><path d="M76 48 L68 34 L88 42Z M122 42 L134 30 L136 52Z" fill="${hair}"/>`;
    else s += `<path d="M62 106 C50 54 82 28 104 30 C136 32 152 62 138 106 C136 86 130 72 120 66 L113 86 L104 62 L96 86 L88 64 C78 72 68 86 62 106Z" fill="url(#${u}h)"/>`;
    s += `<path d="M72 52 C88 36 116 36 130 50" stroke="#fff" stroke-opacity=".38" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    s += '</g>';
    // accessories
    if (has('bowtie')) s += `<path d="M100 160 l-14 -8 v16z M100 160 l14 -8 v16z" fill="#c0243f"/><circle cx="100" cy="160" r="3.4" fill="#7a1030"/>`;
    if (has('horns')) s += `<path d="M68 50 C58 28 66 12 80 6 C78 22 86 34 94 46Z M132 50 C142 28 134 12 120 6 C122 22 114 34 106 46Z" fill="#2a0f3a" stroke="#ff3b6b" stroke-width="2"/>`;
    if (has('goggles')) s += `<rect x="58" y="46" width="84" height="9" rx="4" fill="#333"/><circle cx="82" cy="51" r="11" fill="#6fe7ff" stroke="#222" stroke-width="3.4"/><circle cx="118" cy="51" r="11" fill="#6fe7ff" stroke="#222" stroke-width="3.4"/><circle cx="78" cy="47" r="3" fill="#fff" opacity=".8"/>`;
    if (has('star')) s += `<path d="M132 48 l3.2 8.4 8.8 .9 -6.6 5.6 2.2 8.7 -7.6 -4.6 -7.6 4.6 2.2 -8.7 -6.6 -5.6 8.8 -.9z" fill="#ffd166" stroke="#fff" stroke-width="1.2"/>`;
    if (has('ribbon')) s += `<g transform="translate(138 52)"><path d="M0 0 L-16 -9 L-16 9Z M0 0 L16 -9 L16 9Z" fill="#ff4d79"/><circle r="4" fill="#d6204f"/></g>`;
    if (has('hairpin')) s += `<g stroke="#ffd166" stroke-width="3.4" stroke-linecap="round"><path d="M118 50 l12 -8"/><path d="M118 42 l12 8"/></g>`;
    if (has('headphones')) s += `<path d="M58 96 C50 22 150 22 142 96" fill="none" stroke="#2a2d3e" stroke-width="6"/><rect x="48" y="86" width="14" height="30" rx="7" fill="#e9548a"/><rect x="138" y="86" width="14" height="30" rx="7" fill="#e9548a"/>`;
    if (has('glasses')) s += `<g fill="rgba(255,255,255,.12)" stroke="#2a2d3e" stroke-width="2.6"><circle cx="82" cy="98" r="15"/><circle cx="118" cy="98" r="15"/></g><path d="M97 97 h6" stroke="#2a2d3e" stroke-width="2.6"/>`;
    s += FX + `</svg>`;
    return s;
  }

  window.makePortrait = function (L) {
    L = L || {};
    if (L.style === 'anime') return anime(L);
    const skin = OK.test(L.skin) ? L.skin : '#f1bd9c', hair = OK.test(L.hair) ? L.hair : '#4a2210';
    const outfit = OK.test(L.outfit) ? L.outfit : '#f4f1ea', eyes = OK.test(L.eyes) ? L.eyes : '#2a8f78', lips = OK.test(L.lips) ? L.lips : '#b34a55';
    const bg = Array.isArray(L.bg) && OK.test(L.bg[0]) && OK.test(L.bg[1]) ? L.bg : ['#1d9d82', '#07322f'];
    const style = L.hairStyle || 'long', acc = L.acc || [], has = (a) => acc.includes(a);
    const u = 'p' + ++n;
    const brow = darker(hair, 0.15);
    let s = `<svg viewBox="0 0 200 200" class="pf"><defs>
<radialGradient id="${u}b" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
<radialGradient id="${u}s" cx=".42" cy=".32" r=".8"><stop offset="0" stop-color="${lighter(skin, .3)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${darker(skin, .18)}"/></radialGradient>
<linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighter(hair, .18)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${darker(hair, .45)}"/></linearGradient>
<radialGradient id="${u}i" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${lighter(eyes, .45)}"/><stop offset=".6" stop-color="${eyes}"/><stop offset="1" stop-color="${darker(eyes, .5)}"/></radialGradient>
<linearGradient id="${u}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighter(outfit, .15)}"/><stop offset="1" stop-color="${darker(outfit, .3)}"/></linearGradient>
<radialGradient id="${u}c" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff8f8f" stop-opacity=".4"/><stop offset="1" stop-color="#ff8f8f" stop-opacity="0"/></radialGradient></defs>
<rect width="200" height="200" fill="url(#${u}b)"/><circle cx="160" cy="40" r="26" fill="#fff" opacity=".1"/><circle cx="36" cy="60" r="14" fill="#fff" opacity=".08"/>`;
    // back hair
    if (style === 'long') s += `<path d="M44 150 C30 110 36 50 100 36 C164 50 170 110 156 150Z" fill="url(#${u}h)"/>`;
    if (style === 'bun') s += `<circle cx="100" cy="30" r="17" fill="url(#${u}h)"/>`;
    if (style === 'curly') s += `<g fill="url(#${u}h)"><circle cx="58" cy="76" r="20"/><circle cx="142" cy="76" r="20"/><circle cx="52" cy="104" r="16"/><circle cx="148" cy="104" r="16"/><circle cx="70" cy="50" r="20"/><circle cx="130" cy="50" r="20"/><circle cx="100" cy="42" r="22"/></g>`;
    // outfit + neck
    s += `<path d="M18 200 C22 152 58 144 100 144 C142 144 178 152 182 200Z" fill="url(#${u}o)"/>`;
    s += `<path d="M82 148 L100 172 L118 148Z" fill="${lighter(outfit, .35)}" opacity=".85"/>`;
    s += `<path d="M84 128 h32 v24 q-16 12 -32 0z" fill="${darker(skin, .08)}"/>`;
    if (has('ruff')) s += `<ellipse cx="100" cy="150" rx="40" ry="11" fill="#f5f1e6"/><ellipse cx="100" cy="150" rx="40" ry="11" fill="none" stroke="#cfc8b5" stroke-width="2" stroke-dasharray="4 3"/>`;
    if (has('tie')) s += `<path d="M96 150 h8 l4 40 l-8 6 l-8 -6z" fill="#b3202a"/>`;
    if (has('stethoscope')) s += `<path d="M70 150 C66 178 90 186 100 168 C110 186 134 178 130 150" fill="none" stroke="#333b44" stroke-width="3.5"/><circle cx="100" cy="170" r="5" fill="#9aa5b1" stroke="#333b44" stroke-width="2"/>`;
    // ears + face
    s += `<ellipse cx="63" cy="96" rx="6" ry="11" fill="${darker(skin, .1)}"/><ellipse cx="137" cy="96" rx="6" ry="11" fill="${darker(skin, .1)}"/>`;
    if (has('earrings')) s += `<circle cx="62" cy="110" r="3.5" fill="#f2c94c"/><circle cx="138" cy="110" r="3.5" fill="#f2c94c"/>`;
    s += `<path d="M100 44 C70 44 62 70 64 98 C66 128 84 144 100 144 C116 144 134 128 136 98 C138 70 130 44 100 44Z" fill="url(#${u}s)"/>`;
    s += `<ellipse cx="76" cy="112" rx="13" ry="9" fill="url(#${u}c)"/><ellipse cx="124" cy="112" rx="13" ry="9" fill="url(#${u}c)"/>`;
    // front hair
    if (style === 'long' || style === 'bun') s += `<path d="M62 100 C54 52 84 36 104 38 C134 40 150 62 138 104 C136 74 124 58 106 56 C86 64 72 66 66 82Z" fill="url(#${u}h)"/>`;
    if (style === 'short') s += `<path d="M62 98 C56 52 84 38 102 38 C132 38 148 60 138 98 C136 72 126 60 100 58 C80 60 68 70 62 98Z" fill="url(#${u}h)"/>`;
    if (style === 'curly') s += `<g fill="url(#${u}h)"><circle cx="76" cy="56" r="14"/><circle cx="96" cy="50" r="15"/><circle cx="118" cy="52" r="15"/><circle cx="134" cy="64" r="12"/><circle cx="68" cy="68" r="12"/></g>`;
    if (style === 'bald') s += `<ellipse cx="90" cy="54" rx="22" ry="8" fill="#fff" opacity=".12" transform="rotate(-18 90 54)"/>`;
    // eyes
    s += `<g class="eyes"><g class="eye"><ellipse cx="83" cy="94" rx="9" ry="5.2" fill="#fff"/><circle cx="83" cy="94" r="4.6" fill="url(#${u}i)"/><circle cx="83" cy="94" r="2" fill="#06100e"/><circle cx="84.8" cy="92.4" r="1.3" fill="#fff"/></g>
<g class="eye"><ellipse cx="117" cy="94" rx="9" ry="5.2" fill="#fff"/><circle cx="117" cy="94" r="4.6" fill="url(#${u}i)"/><circle cx="117" cy="94" r="2" fill="#06100e"/><circle cx="118.8" cy="92.4" r="1.3" fill="#fff"/></g></g>
<path d="M73 93 q10 -9 20 0 M107 93 q10 -9 20 0" stroke="${darker(hair, .5)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M73 83 q10 -6 20 -1 M107 82 q10 -5 20 1" stroke="${brow}" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M100 98 q-3 12 -2 18 q4 3 8 0" stroke="${darker(skin, .22)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`;
    // accessories behind mouth
    if (has('beard')) s += `<path d="M64 104 C66 142 84 154 100 154 C116 154 134 142 136 104 C130 126 116 132 100 132 C84 132 70 126 64 104Z" fill="url(#${u}h)"/>`;
    if (has('mustache')) s += `<path d="M84 121 q16 -9 32 0 q-16 5 -32 0z" fill="${hair}"/>`;
    // mouth
    s += `<g class="mouth"><path d="M88 126 q12 -5 24 0 q-12 3 -24 0z" fill="${lips}"/><ellipse class="mo" cx="100" cy="128" rx="9" ry="6" fill="#3d0d17"/><path d="M89 127 q11 12 22 0 q-11 -3 -22 0z" fill="${lighter(lips, .08)}" opacity=".95"/></g>`;
    // accessories in front
    if (has('glasses')) s += `<g fill="rgba(255,255,255,.08)" stroke="#20242c" stroke-width="2.6"><rect x="68" y="84" width="30" height="21" rx="9"/><rect x="102" y="84" width="30" height="21" rx="9"/></g><path d="M98 93 h4" stroke="#20242c" stroke-width="2.6"/>`;
    if (has('eyepatch')) s += `<path d="M64 80 L136 108" stroke="#111" stroke-width="2.2"/><ellipse cx="83" cy="94" rx="11" ry="9" fill="#101010"/>`;
    if (has('hat')) s += `<path d="M54 74 C54 30 146 30 146 74 C128 62 72 62 54 74Z" fill="#7b6446"/><path d="M54 74 C70 66 130 66 146 74 C130 80 70 80 54 74Z" fill="#5e4a30"/><path d="M66 50 C90 36 112 36 136 52" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none"/>`;
    if (has('cap')) s += `<path d="M58 72 C58 32 142 32 142 72Z" fill="${darker(outfit, .1)}"/><path d="M60 72 L146 72 Q150 80 120 80 L62 80Z" fill="${darker(outfit, .35)}"/><circle cx="100" cy="52" r="6" fill="#d9b44a"/>`;
    if (has('bandana')) s += `<path d="M60 70 C80 38 124 38 142 70 L142 80 C122 64 80 64 60 80Z" fill="#c0392b"/><circle cx="82" cy="58" r="2" fill="#fff" opacity=".7"/><circle cx="104" cy="54" r="2" fill="#fff" opacity=".7"/><circle cx="124" cy="60" r="2" fill="#fff" opacity=".7"/>`;
    if (has('headset')) s += `<path d="M62 90 C58 40 142 40 138 90" fill="none" stroke="#222" stroke-width="5"/><rect x="54" y="86" width="12" height="24" rx="5" fill="#222"/><path d="M60 110 q8 22 36 20" stroke="#222" stroke-width="3" fill="none"/><circle cx="98" cy="130" r="4" fill="#222"/>`;
    s += `<ellipse cx="82" cy="58" rx="24" ry="9" fill="#fff" opacity=".08" transform="rotate(-22 82 58)"/>${FX}</svg>`;
    return s;
  };
})();
