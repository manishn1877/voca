/* Voca — site-wide visual themes with animated ambient scenes */
(() => {
'use strict';
const T = {
  ink:{n:'Studio Ink',e:'',bg:'#0e1014',g:['rgba(255,181,71,.10)','rgba(79,209,197,.08)','rgba(255,181,71,.04)'],you:'#ffb547',bot:'#4fd1c5',p:'waves'},
  nebula:{n:'Nebula',e:'🌌',bg:'#0b0d1a',g:['rgba(111,91,255,.30)','rgba(18,184,134,.22)','rgba(255,107,61,.14)'],you:'#6f5bff',bot:'#12b886',p:'stars'},
  sakura:{n:'Sakura Dream',e:'🌸',bg:'#1c0f1d',g:['rgba(255,120,170,.32)','rgba(190,120,255,.22)','rgba(255,190,120,.14)'],you:'#ff6fa5',bot:'#b983ff',p:'petals'},
  neon:{n:'Neon City',e:'🌆',bg:'#07061a',g:['rgba(0,240,255,.26)','rgba(255,0,200,.26)','rgba(120,0,255,.18)'],you:'#00e5ff',bot:'#ff2bd6',p:'grid'},
  sunset:{n:'Sunset Beach',e:'🌅',bg:'#1d0f14',g:['rgba(255,110,70,.34)','rgba(255,190,90,.22)','rgba(190,60,140,.22)'],you:'#ff7a45',bot:'#ffc15e',p:'embers'},
  forest:{n:'Enchanted Forest',e:'🌲',bg:'#06140f',g:['rgba(40,200,120,.28)','rgba(170,255,120,.16)','rgba(40,120,160,.2)'],you:'#2fd18b',bot:'#b6f35c',p:'fireflies'},
  ocean:{n:'Deep Ocean',e:'🌊',bg:'#04101c',g:['rgba(30,140,255,.30)','rgba(0,220,200,.2)','rgba(80,60,200,.2)'],you:'#2e9bff',bot:'#19e3c8',p:'bubbles'},
  winter:{n:'Winter Aurora',e:'❄️',bg:'#0a1220',g:['rgba(120,200,255,.26)','rgba(140,255,200,.2)','rgba(190,150,255,.2)'],you:'#7cc8ff',bot:'#9bffd0',p:'snow'},
  paper:{n:'Paper Light',e:'📄',bg:'#f6f4ef',g:['rgba(111,91,255,.10)','rgba(18,184,134,.10)','rgba(255,107,61,.08)'],you:'#6f5bff',bot:'#12b886',p:'none',light:1},
};
const root = document.documentElement;
let cur = 'ink'; try { cur = localStorage.getItem('voca.theme') || cur; } catch {}
if (!T[cur]) cur = 'ink';
const cv = document.createElement('canvas'); cv.id = 'ambient'; cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
document.body.prepend(cv);
const x = cv.getContext('2d'); let W = 0, H = 0, P = [], kind = 'stars', raf = 0, t0 = 0;
const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; seed(); }; addEventListener('resize', rs);
const R = (a, b) => a + Math.random() * (b - a);
function seed() {
  const n = Math.min(70, Math.floor(W / 20)); P = [];
  for (let i = 0; i < n; i++) P.push({ x: R(0, W), y: R(0, H), s: R(.5, 1), r: R(0, 6.28), v: R(.2, 1), ph: R(0, 6.28) });
}
function frame(t) {
  raf = requestAnimationFrame(frame); x.clearRect(0, 0, W, H); const s = t / 1000;
  if (kind === 'waves') {
    const cs = getComputedStyle(root), c1 = cs.getPropertyValue('--you').trim(), c2 = cs.getPropertyValue('--bot').trim();
    [[c1, .5, 26, 1], [c2, .8, 18, 1.6], [c1, 1.2, 12, .7]].forEach(([c, sp, am, fq], k) => { x.beginPath(); x.strokeStyle = c; x.globalAlpha = .13; x.lineWidth = 1.5; for (let px = 0; px <= W; px += 8) { const y = H * (.86 + k * .045) + Math.sin(px * .006 * fq + s * sp + k) * am * Math.sin(px / W * Math.PI); px ? x.lineTo(px, y) : x.moveTo(px, y); } x.stroke(); }); x.globalAlpha = 1; return;
  }
  if (kind === 'grid') {
    const hz = H * .72; x.strokeStyle = 'rgba(0,229,255,.16)'; x.lineWidth = 1;
    for (let i = -20; i <= 20; i++) { x.beginPath(); x.moveTo(W / 2 + i * 14, hz); x.lineTo(W / 2 + i * 120, H); x.stroke(); }
    for (let j = 0; j < 10; j++) { const y = hz + Math.pow(((j + s * .4) % 10) / 10, 2.2) * (H - hz); x.strokeStyle = 'rgba(255,43,214,.18)'; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
    return;
  }
  for (const p of P) {
    if (kind === 'stars') { const a = .3 + .7 * Math.abs(Math.sin(s * p.v + p.ph)); x.fillStyle = `rgba(255,255,255,${a * .8})`; x.beginPath(); x.arc(p.x, p.y, p.s * 1.4, 0, 6.28); x.fill(); p.x -= p.v * .08; if (p.x < 0) p.x = W; }
    else if (kind === 'petals') { p.y += p.v * .9; p.x += Math.sin(s + p.ph) * .6; p.r += .01; if (p.y > H + 10) { p.y = -10; p.x = R(0, W); } x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = 'rgba(255,170,200,.65)'; x.beginPath(); x.ellipse(0, 0, 7 * p.s, 3.5 * p.s, 0, 0, 6.28); x.fill(); x.restore(); }
    else if (kind === 'embers') { p.y -= p.v * .8; p.x += Math.sin(s + p.ph) * .4; if (p.y < -10) { p.y = H + 10; p.x = R(0, W); } x.fillStyle = `rgba(255,${150 + p.s * 80 | 0},80,${.3 + .4 * p.s})`; x.beginPath(); x.arc(p.x, p.y, p.s * 2.4, 0, 6.28); x.fill(); }
    else if (kind === 'fireflies') { const a = .2 + .8 * Math.abs(Math.sin(s * p.v + p.ph)); p.x += Math.sin(s * .5 + p.ph) * .5; p.y += Math.cos(s * .4 + p.ph) * .4; x.shadowColor = '#c8ff6a'; x.shadowBlur = 14; x.fillStyle = `rgba(200,255,110,${a})`; x.beginPath(); x.arc(p.x, p.y, 2.2 * p.s, 0, 6.28); x.fill(); x.shadowBlur = 0; }
    else if (kind === 'bubbles') { p.y -= p.v * .7; p.x += Math.sin(s + p.ph) * .3; if (p.y < -20) { p.y = H + 20; p.x = R(0, W); } x.strokeStyle = 'rgba(150,230,255,.4)'; x.beginPath(); x.arc(p.x, p.y, 4 + p.s * 9, 0, 6.28); x.stroke(); }
    else if (kind === 'snow') { p.y += p.v * .7; p.x += Math.sin(s + p.ph) * .5; if (p.y > H + 5) { p.y = -5; p.x = R(0, W); } x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(p.x, p.y, p.s * 2.2, 0, 6.28); x.fill(); }
  }
}
function apply(k) {
  const o = T[k]; cur = k; try { localStorage.setItem('voca.theme', k); } catch {}
  root.dataset.site = k;
  const st = root.style;
  st.setProperty('--you', o.you); st.setProperty('--bot', o.bot);
  { const n = parseInt(o.you.slice(1), 16), l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; st.setProperty('--on', l > .55 ? '#15110a' : '#ffffff'); }
  st.setProperty('--tg0', o.g[0]); st.setProperty('--tg1', o.g[1]); st.setProperty('--tg2', o.g[2]);
  document.body.style.backgroundAttachment = 'fixed';
  const L = !!o.light; st.setProperty('--bg', o.bg); st.setProperty('--ink', L ? '#1d1b2e' : '#f1effa'); st.setProperty('--muted', L ? '#6b6880' : '#a6a4c2');
  st.setProperty('--panel', L ? 'rgba(255,255,255,.85)' : 'rgba(16,18,24,.78)'); st.setProperty('--line', L ? '#e6e2d8' : 'rgba(255,255,255,.1)');
  const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.content = o.bg;
  kind = o.p; cancelAnimationFrame(raf); rs(); if (kind !== 'none' && !matchMedia('(prefers-reduced-motion:reduce)').matches) raf = requestAnimationFrame(frame);
  document.querySelectorAll('#themeRow button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
}
function ui() {
  const card = document.createElement('div'); card.className = 'card'; card.innerHTML = '<h3>🎨 Voca themes</h3><div id="themeRow" class="themerow"></div>';
  const row = card.querySelector('#themeRow');
  Object.entries(T).forEach(([k, o]) => { const b = document.createElement('button'); b.dataset.k = k; b.type = 'button'; b.innerHTML = `<i style="background:linear-gradient(135deg,${o.you},${o.bot})"></i><span>${o.e ? o.e + ' ' : ''}${o.n}</span>`; b.onclick = () => apply(k); row.appendChild(b); });
  const tab = document.getElementById('tab-progress'); if (tab) tab.prepend(card);
  // quick cycle button in header
  const hud = document.querySelector('.hud'); if (hud) { const b = document.createElement('button'); b.className = 'ghost'; b.id = 'themeBtn'; b.title = 'Change theme'; b.textContent = '🎨'; b.onclick = () => { const ks = Object.keys(T); apply(ks[(ks.indexOf(cur) + 1) % ks.length]); }; hud.prepend(b); }
}
ui(); apply(cur);
})();
