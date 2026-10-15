/* ═══════════════════════════════════════════════════════════════════════
 *  core/talent_constelacao.js — Árvore de talentos "Constelação do Caçador"
 *  (somente ARQUEIRO). Só troca o DESENHO da árvore: compra, pontos, saves,
 *  flags (_talent_*) e skills continuam 100% em talent_system.js
 *  (canBuyTalent / buyTalent / buyLeveledTalent / getAvailablePT).
 *
 *  Segurança:
 *   - não altera talent_system.js nem palDinh.js; só embrulha buildTalentTreeUI
 *     e switchOverlayTab;
 *   - qualquer erro aqui cai automaticamente na árvore clássica;
 *   - botão "usar árvore clássica" dentro da própria tela (fica salvo).
 *  Carregar DEPOIS de talent_system.js e palDinh.js.
 * ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // ▼▼ NOMES — mude aqui (só nesta linha) o título que aparece na tela ▼▼
  const NOMES = { titulo: 'Constelação do Caçador' };
  const NS = 'http://www.w3.org/2000/svg';
  const KEY = 'clivor_talent_classico';
  const classico = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const setClassico = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} };

  // cor das bolinhas por tier: I ouro · II jade (floresta) · III vermelhão
  const TCOL = [0,
    { c: '231,199,119', l2: '255,236,170', h: '#e7c777' },
    { c: '95,227,161',  l2: '217,255,233', h: '#5fe3a1' },
    { c: '255,106,85',  l2: '255,225,218', h: '#ff6a55' }];
  const ANG = [-90, 30, 150].map(a => a * Math.PI / 180);   // 3 braços
  const RR = [0, 62, 118, 172];                             // órbitas dos tiers
  const ROMAN = ['', 'I', 'II', 'III'];
  const STAR = 'M0-26L4-4 26 0 4 4 0 26-4 4-26 0-4-4Z';

  let tree = null, pathIdx = 0, sel = null, nodes = [];
  let cv, c, W = 0, H = 0, S = 1, DPR = 1, running = false, listenersOn = false;
  let ST = [], P = [], SW = [], PL = [], SS = [];
  let Q = 1, fAcc = 0, fN = 0, lastMs = 0, spawnT = 0, base = 0, amp = 0;
  let tx = 0, ty = 0, gx = 0, gy = 0, bowA = -1.5708, bowPull = 0, fireAt = null, fireUntil = 0;
  let holdTimer = 0;

  const $ = s => document.querySelector(s);
  const R = (a, b) => a + Math.random() * (b - a);

  // ───────────────────────── CSS ─────────────────────────
  function addCSS() {
    if (document.getElementById('tc-style')) return;
    const st = document.createElement('style');
    st.id = 'tc-style';
    st.textContent = `
#tc-root{--gold:#e7c777;--ice:#bfeaff;--cy:#5ee6ff;font-family:'Noto Serif JP',Georgia,serif;color:#efe8d4;max-width:520px;margin:0 auto;padding:4px 2px 12px}
#tc-root *{box-sizing:border-box}
.tc-top{display:flex;justify-content:space-between;align-items:flex-end;padding:6px 4px 8px}
.tc-top small{display:block;font-size:.62rem;color:#8e9ab8;margin-bottom:3px;letter-spacing:.06em}
.tc-top h1{font-size:1.05rem;font-weight:900;letter-spacing:.14em;color:var(--gold);text-shadow:0 0 14px #e7c77755;margin:0}
.tc-pt{text-align:right;font-size:.58rem;color:#8e9ab8;line-height:1.4}
.tc-pt b{display:block;font-size:1.5rem;color:var(--ice);text-shadow:0 0 12px #5ee6ff88;font-weight:900}
.tc-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
.tc-tabs button{font:inherit;font-size:.62rem;letter-spacing:.05em;line-height:1.3;color:#9aa4c4;background:#0b1024;border:1px solid #2a3150;border-radius:4px;padding:10px 4px;min-height:46px;cursor:pointer}
.tc-tabs button.tc-cur{color:#fff;border-color:var(--gold);box-shadow:0 0 12px #e7c77733}
#tc-stage{position:relative;width:100%;aspect-ratio:400/430;border-radius:10px;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#0e1a3a,#04060f 70%);border:1px solid #2a3150}
#tc-bg,#tc-sv{position:absolute;inset:0;width:100%;height:100%}
#tc-sv{touch-action:manipulation}
.tc-ring{fill:none;stroke:var(--gold);stroke-width:1.1;opacity:.85}
.tc-orbit{fill:none;stroke:#8fb4ff;stroke-width:.7;stroke-dasharray:2 5;opacity:.28}
.tc-lab{font-size:7px;fill:#8e9ab8;text-anchor:middle;letter-spacing:.1em}
.tc-ln{fill:none;stroke:#2c3658;stroke-width:1.6;stroke-linecap:round}
.tc-ln.tc-lit{stroke-width:2.2;stroke-dasharray:5 7;animation:tcflow .9s linear infinite;filter:url(#tc-glow)}
@keyframes tcflow{to{stroke-dashoffset:-12}}
.tc-nd{cursor:pointer}
.tc-core{fill:#090d24;stroke:#3a4570;stroke-width:1.6;transition:fill .4s,stroke .4s}
.tc-halo{fill:none;stroke:transparent;stroke-width:1.4}
.tc-gl{font-size:17px;text-anchor:middle;fill:#5b668e;pointer-events:none}
.tc-lv{font-size:7.5px;text-anchor:middle;fill:#d9ffe9;pointer-events:none;letter-spacing:.05em}
.tc-star{fill:#e7c777;opacity:0;transition:opacity .5s;pointer-events:none}
.tc-t2 .tc-star{fill:#5fe3a1}.tc-t3 .tc-star{fill:#ff6a55}
.tc-nd image{filter:grayscale(1) brightness(.45);transition:filter .5s;pointer-events:none}
.tc-av .tc-core{stroke:var(--cy)}.tc-t2.tc-av .tc-core{stroke:#5fe3a1}.tc-t3.tc-av .tc-core{stroke:#ff8a75}
.tc-av .tc-gl{fill:var(--ice)}.tc-av image{filter:grayscale(.5) brightness(.85)}
.tc-av .tc-halo{stroke:var(--cy);animation:tcpulse 1.7s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.tc-t2.tc-av .tc-halo{stroke:#5fe3a1}.tc-t3.tc-av .tc-halo{stroke:#ff8a75}
@keyframes tcpulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
.tc-blk{opacity:.3}.tc-blk image{filter:grayscale(1) brightness(.3)}
.tc-on .tc-core{fill:url(#tc-g1);stroke:#fff3c9;filter:url(#tc-glow)}
.tc-t2.tc-on .tc-core{fill:url(#tc-g2);stroke:#d9ffe9}.tc-t3.tc-on .tc-core{fill:url(#tc-g3);stroke:#ffe1da}
.tc-on .tc-gl{fill:#2a1c05}.tc-t2.tc-on .tc-gl{fill:#06281a}.tc-t3.tc-on .tc-gl{fill:#2c0803}
.tc-on .tc-star{opacity:.95}.tc-on image{filter:none}
.tc-selr{fill:none;stroke:#fff;stroke-width:1.2;stroke-dasharray:3 4;opacity:0;transform-box:fill-box;transform-origin:center;animation:tcspin 6s linear infinite}
.tc-sel .tc-selr{opacity:1}
@keyframes tcspin{to{transform:rotate(360deg)}}
@keyframes tcinn{from{opacity:0}}
#tc-sheet{margin-top:10px;border:1px solid #2a3150;border-radius:10px;padding:14px;background:linear-gradient(#0c1228,#080b1a)}
#tc-sheet .tc-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#tc-sheet h2{font-size:1rem;font-weight:900;color:var(--gold);letter-spacing:.06em;margin:0}
#tc-sheet .tc-m{font-size:.6rem;color:#8e9ab8;white-space:nowrap}
#tc-sheet p{font-size:.78rem;line-height:1.55;margin:8px 0 6px;color:#d9d3c2;font-family:inherit}
#tc-sheet .tc-note{font-size:.62rem;line-height:1.5;color:#ff9a85;margin:0 0 10px}
#tc-go{position:relative;overflow:hidden;width:100%;min-height:52px;font:inherit;font-size:.8rem;letter-spacing:.06em;color:#fff6d8;background:#141a36;border:1px solid #8a7a45;border-radius:6px;-webkit-user-select:none;user-select:none;touch-action:manipulation;cursor:pointer;margin-top:6px}
#tc-go i{position:absolute;inset:0;background:linear-gradient(90deg,#8a6a1f,#e7c777);transform:scaleX(0);transform-origin:left}
#tc-go span{position:relative}
#tc-go:disabled{opacity:.5;border-color:#3a4570;cursor:default}
#tc-classic{display:block;margin:10px auto 0;font:inherit;font-size:.58rem;color:#8e9ab8;background:none;border:0;text-decoration:underline;padding:8px;cursor:pointer}
.tc-back{display:block;margin:6px auto 10px;font:inherit;font-size:.65rem;letter-spacing:.08em;color:#e7c777;background:#0b1024;border:1px solid #8a7a45;border-radius:4px;padding:10px 16px;cursor:pointer}
@media (prefers-reduced-motion:reduce){#tc-root *{animation:none!important}}`;
    document.head.appendChild(st);
  }

  const SHELL = `
<div id="tc-root">
 <div class="tc-top"><div><small id="tc-sub"></small><h1>${NOMES.titulo}</h1></div>
  <div class="tc-pt"><b id="tc-pts">0</b>pontos<br>ressonância <span id="tc-res">0</span>%</div></div>
 <div class="tc-tabs" id="tc-tabs"></div>
 <div id="tc-stage"><canvas id="tc-bg"></canvas>
 <svg id="tc-sv" viewBox="-200 -215 400 430">
  <defs>
   <radialGradient id="tc-g1" cx="35%" cy="30%"><stop offset="0" stop-color="#fff3c9"/><stop offset=".6" stop-color="#e7c777"/><stop offset="1" stop-color="#a77a22"/></radialGradient>
   <radialGradient id="tc-g2" cx="35%" cy="30%"><stop offset="0" stop-color="#d9ffe9"/><stop offset=".6" stop-color="#5fe3a1"/><stop offset="1" stop-color="#168a5a"/></radialGradient>
   <radialGradient id="tc-g3" cx="35%" cy="30%"><stop offset="0" stop-color="#ffe1da"/><stop offset=".6" stop-color="#ff6a55"/><stop offset="1" stop-color="#a5281c"/></radialGradient>
   <radialGradient id="tc-moon" cx="40%" cy="35%"><stop offset="0" stop-color="#f6f1ff"/><stop offset=".7" stop-color="#a9b7e8"/><stop offset="1" stop-color="#46528c"/></radialGradient>
   <filter id="tc-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <clipPath id="tc-clip"><circle r="15"/></clipPath>
  </defs>
  <g id="tc-frame">
   <circle class="tc-ring" r="197"/><circle class="tc-ring" r="192" style="opacity:.4"/>
   <g><circle r="186" fill="none" stroke="#e7c777" stroke-width="3" stroke-dasharray="1 7.2" opacity=".55"/><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="240s" repeatCount="indefinite"/></g>
   <g fill="#e7c777" filter="url(#tc-glow)"><path d="M0-205l4 8-4 8-4-8z"/><path d="M0 205l4-8-4-8-4 8z"/><path d="M-205 0l8-4 8 4-8 4z"/><path d="M205 0l-8-4-8 4 8 4z"/></g>
   <circle class="tc-orbit" r="62"/><circle class="tc-orbit" r="118"/><circle class="tc-orbit" r="172"/>
   <text class="tc-lab" y="64">I · LV 1</text><text class="tc-lab" y="120">II · LV 7</text><text class="tc-lab" y="174">III · LV 14</text>
  </g>
  <g id="tc-lines"></g><g id="tc-nodes"></g>
  <g id="tc-core"><circle r="40" fill="none" stroke="#5ee6ff" stroke-width=".8" opacity=".5"><animate attributeName="r" values="34;44;34" dur="3.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0;.6" dur="3.4s" repeatCount="indefinite"/></circle>
   <circle r="26" fill="url(#tc-moon)" filter="url(#tc-glow)"/>
   <g id="tc-bow"><path d="M5-22Q-15 0 5 22" fill="none" stroke="#2a1c05" stroke-width="3.6" stroke-linecap="round"/><path d="M5-22Q-15 0 5 22" fill="none" stroke="#e7c777" stroke-width="1.9" stroke-linecap="round"/><path id="tc-bowstr" d="M5-22Q5 0 5 22" fill="none" stroke="#fff" stroke-width=".8"/>
    <g id="tc-bowarrow"><path d="M-6 0H24" stroke="#2a1c05" stroke-width="3" stroke-linecap="round"/><path d="M-6 0H24" stroke="#bfeaff" stroke-width="1.5" stroke-linecap="round"/><path d="M24-3.4L31 0 24 3.4z" fill="#bfeaff"/><path d="M-6 0l-3-3M-6 0l-3 3" stroke="#bfeaff" stroke-width="1.2"/></g></g></g>
  <g id="tc-fx"></g>
 </svg></div>
 <div id="tc-sheet"><div class="tc-row"><h2 id="tc-in"></h2><span class="tc-m" id="tc-im"></span></div>
  <p id="tc-id"></p><div class="tc-note" id="tc-nt"></div>
  <button id="tc-go" type="button"><i></i><span id="tc-gt"></span></button></div>
 <button id="tc-classic" type="button">usar árvore clássica</button>
</div>`;

  // ───────────────────────── dados do jogo → nós ─────────────────────────
  const curPath = () => tree.paths[pathIdx];
  function layout(path) {
    const out = [];
    path.tiers.forEach((tier, ti) => tier.forEach((t, k) => {
      const a = ANG[k % 3], r = RR[ti + 1];
      out.push({ id: t.id, t, leveled: false, tier: t.tier || ti + 1, x: Math.cos(a) * r, y: Math.sin(a) * r,
                 pre: ti > 0 && path.tiers[ti - 1][k] ? path.tiers[ti - 1][k].id : null });
    }));
    // talento de níveis (Aljava Reforçada): ocupa o braço que sobra no tier III
    (path.leveled || []).forEach(t => {
      const a = ANG[2], r = RR[3];
      out.push({ id: t.id, t, leveled: true, tier: 2, x: Math.cos(a) * r, y: Math.sin(a) * r,
                 pre: path.tiers[1] && path.tiers[1][2] ? path.tiers[1][2].id : null });
    });
    return out;
  }
  const byId = id => nodes.find(n => n.id === id);
  const lvOf = n => getTalentLevel(n.id);
  const isOwned = n => n.leveled ? lvOf(n) > 0 : getPlayerTalents().includes(n.id);
  function stateOf(n) {
    if (n.leveled) {
      const lv = lvOf(n), max = n.t.levels.length, can = canBuyLeveledTalent(n.id).ok;
      return lv >= max ? 'on' : lv > 0 ? (can ? 'on av' : 'on') : (can ? 'av' : 'lock');
    }
    if (getPlayerTalents().includes(n.id)) return 'on';
    if (n.t.exclusive && getPlayerTalents().includes(n.t.exclusive)) return 'blk';
    return canBuyTalent(n.id).ok ? 'av' : 'lock';
  }

  // ───────────────────────── desenho (SVG + painel) ─────────────────────────
  function render() {
    if (!$('#tc-root')) return;
    const path = curPath();
    nodes.forEach(n => { n.st = stateOf(n); n.own = isOwned(n); });
    let L = '', N = '';
    nodes.forEach(n => {
      const p = n.pre ? byId(n.pre) : { x: 0, y: 0, own: true };
      const lit = n.own && (p.own || !n.pre);
      L += `<path class="tc-ln${lit ? ' tc-lit' : ''}" ${lit ? `style="stroke:${TCOL[n.tier].h}"` : ''} d="M${p.x} ${p.y}L${n.x} ${n.y}"/>`;
    });
    nodes.forEach(n => {
      const t = n.t, img = t.iconImg;
      const cls = n.st.split(' ').map(x => 'tc-' + x).join(' ');
      const badge = n.leveled ? `<text class="tc-lv" y="31">${lvOf(n)}/${t.levels.length}</text>` : '';
      N += `<g class="tc-nd tc-t${n.tier} ${cls}${sel === n.id ? ' tc-sel' : ''}" data-id="${n.id}" transform="translate(${n.x} ${n.y})">
  <path class="tc-star" d="${STAR}"/><circle class="tc-halo" r="22"/><circle class="tc-selr" r="26"/>
  <circle class="tc-core" r="17"/><text class="tc-gl" y="6">${t.icon || '✦'}</text>
  ${img ? `<image href="${img}" x="-15" y="-15" width="30" height="30" clip-path="url(#tc-clip)" preserveAspectRatio="xMidYMid slice" onload="this.previousElementSibling.style.display='none'" onerror="this.style.display='none'"/>` : ''}
  ${badge}<circle r="28" fill="transparent"/></g>`;
    });
    $('#tc-lines').innerHTML = L;
    const nd = $('#tc-nodes'); nd.innerHTML = N;
    if (render.first) { nd.querySelectorAll('.tc-nd').forEach((g, i) => { g.style.animation = `tcinn .9s ${.15 + i * .12}s both`; }); render.first = false; }

    // cabeçalho
    const total = nodes.length, got = nodes.filter(n => n.own).length;
    base = got / total;
    $('#tc-pts').textContent = getAvailablePT();
    $('#tc-res').textContent = Math.round(base * 100);
    $('#tc-sub').textContent = `${path.name} · LV ${G.player.level}`;
    $('#tc-tabs').innerHTML = tree.paths.map((pa, i) => {
      const all = layout(pa), n = all.filter(isOwned).length;
      return `<button type="button" data-i="${i}" class="${i === pathIdx ? 'tc-cur' : ''}">${pa.icon || ''} ${pa.name}<br><span style="opacity:.6">${n}/${all.length}</span></button>`;
    }).join('');
    renderSheet();
  }

  function renderSheet() {
    const n = byId(sel) || nodes[0]; if (!n) return;
    const t = n.t, go = $('#tc-go');
    let meta, note = '', label, mode = 'none';
    if (n.leveled) {
      const lv = lvOf(n), max = t.levels.length, chk = canBuyLeveledTalent(n.id);
      meta = `Nv ${lv}/${max}` + (lv < max ? ` · ${t.levels[lv].cost} PT` : '');
      if (lv >= max) label = 'Nível máximo';
      else if (chk.ok) { label = `Segure para evoluir (${chk.cost} PT)`; mode = 'hold'; note = `Próximo nível: +${t.levels[lv].bonus} flechas.`; }
      else { label = 'Indisponível'; note = chk.reason || ''; }
    } else {
      const cost = (typeof TIER_COST !== 'undefined' && TIER_COST[n.tier]) || n.tier;
      meta = `Tier ${ROMAN[n.tier]} · ${cost} PT`;
      const chk = canBuyTalent(n.id);
      if (n.st.indexOf('on') >= 0) {
        if (talentHasSkill(n.id)) { label = '⚡ Equipar no slot'; mode = 'equip'; } else label = 'Aprendido';
      } else if (n.st === 'blk') {
        const b = findTalentById(t.exclusive); label = 'Bloqueado'; note = `Exclusivo: bloqueado por "${b ? b.name : t.exclusive}".`;
      } else if (chk.ok) { label = `Segure para aprender (${chk.cost} PT)`; mode = 'hold'; }
      else { label = 'Bloqueado'; note = chk.reason || ''; }
    }
    $('#tc-in').textContent = t.name; $('#tc-im').textContent = meta;
    $('#tc-id').textContent = t.desc; $('#tc-nt').textContent = note; $('#tc-gt').textContent = label;
    go.disabled = mode === 'none'; go.dataset.mode = mode;
  }

  // ───────────────────────── interação ─────────────────────────
  function stopHold() {
    clearTimeout(holdTimer);
    const i = $('#tc-go i'); if (i) { i.style.transition = 'transform .15s'; i.style.transform = 'scaleX(0)'; }
  }
  function doBuy(n) {
    let ok = false;
    try { ok = n.leveled ? buyLeveledTalent(n.id) : buyTalent(n.id); } catch (e) { console.error('[constelacao]', e); }
    if (!ok) { render(); return; }
    fxLearn(n); render();
    if (!n.leveled && typeof talentHasSkill === 'function' && talentHasSkill(n.id)) {
      setTimeout(() => { const k = getTalentSkillKey(n.id); if (k && typeof openSlotPickerForSkill === 'function') openSlotPickerForSkill(k); }, 900);
    }
  }
  function bind() {
    $('#tc-nodes').addEventListener('click', e => {
      const g = e.target.closest('.tc-nd'); if (!g) return;
      sel = g.dataset.id; const n = byId(sel); if (n) { fireAt = n; fireUntil = performance.now() / 1000 + .35; } render();
    });
    $('#tc-tabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      pathIdx = +b.dataset.i; nodes = layout(curPath()); sel = nodes[0].id; PL.length = 0; render.first = true; render();
    });
    const go = $('#tc-go');
    go.addEventListener('pointerdown', () => {
      if (go.disabled) return;
      if (go.dataset.mode === 'hold') {
        const i = go.querySelector('i'); i.style.transition = 'transform .65s linear'; i.style.transform = 'scaleX(1)';
        holdTimer = setTimeout(() => { stopHold(); const n = byId(sel); if (n) doBuy(n); }, 650);
      }
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => go.addEventListener(ev, stopHold));
    go.addEventListener('click', e => {
      const n = byId(sel); if (!n || go.disabled) return;
      if (go.dataset.mode === 'equip') { const k = getTalentSkillKey(n.id); if (k && typeof openSlotPickerForSkill === 'function') openSlotPickerForSkill(k); }
      else if (go.dataset.mode === 'hold' && e.detail === 0) doBuy(n);   // teclado
    });
    $('#tc-classic').addEventListener('click', () => { setClassico(true); stop(); window.buildTalentTreeUI(tree); });
    $('#tc-stage').addEventListener('pointermove', e => {
      const r = $('#tc-stage').getBoundingClientRect(); tx = (e.clientX - r.left) / r.width * 2 - 1; ty = (e.clientY - r.top) / r.height * 2 - 1;
    });
  }

  // ───────────────────────── efeitos ao aprender ─────────────────────────
  const nodeXY = n => ({ x: W / 2 + n.x * S, y: H / 2 + n.y * S });
  function fxLearn(n) {
    const col = TCOL[n.tier], p = nodeXY(n);
    amp = 1; bowPull = 1; fireAt = n; fireUntil = performance.now() / 1000 + .5;
    SW.push({ ...p, r: 0, l: 1, c: col.l2 });
    const pa = n.pre ? byId(n.pre) : { x: 0, y: 0 };
    for (let i = 0; i < 3; i++) PL.push({ a: pa, b: n, u: -i * .14, big: 1 });
    for (let i = 0; i < 46; i++) { const a = R(0, 6.283), v = 1 + R(0, 3.4); P.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c: Math.random() < .3 ? '255,255,255' : col.c }); }
    const fx = $('#tc-fx');
    [[20, col.h, 900], [12, '#ffffff', 620]].forEach(([r, cc, d]) => {
      const w = document.createElementNS(NS, 'circle'); w.setAttribute('r', r); w.setAttribute('cx', n.x); w.setAttribute('cy', n.y);
      w.style.cssText = `fill:none;stroke:${cc};stroke-width:2;transform-box:fill-box;transform-origin:center`; fx.append(w);
      w.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(8)', opacity: 0 }], { duration: d, easing: 'ease-out' }).onfinish = () => w.remove();
    });
    const fl = document.createElementNS(NS, 'path'); fl.setAttribute('d', STAR); fl.setAttribute('transform', `translate(${n.x} ${n.y})`);
    fl.style.cssText = 'fill:#fff;transform-box:fill-box;transform-origin:center'; fx.append(fl);
    fl.animate([{ transform: 'scale(.2) rotate(0)', opacity: 1 }, { transform: 'scale(3.2) rotate(90deg)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => fl.remove();
    $('#tc-stage').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.025)', offset: .2 }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' });
    try { if (navigator.vibrate && !(typeof CONFIG !== 'undefined' && CONFIG.vibration === false)) navigator.vibrate([20, 30, 20]); } catch (e) {}
  }

  // ───────────────────────── motor de fundo (canvas) ─────────────────────────
  function size() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight;
    if (!W) return false;
    cv.width = W * DPR; cv.height = H * DPR; c.setTransform(DPR, 0, 0, DPR, 0, 0); S = W / 400;
    ST.length = 0; for (let i = 0; i < 110; i++) ST.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5, z: Math.random() });
    return true;
  }
  function glowDot(x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function ring(r, t, col, ph) {
    const n = 200, k = 7 + Math.round(r / 20); c.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i / n * 6.2832, rad = r * S + Math.sin(a * k + t * ph) * (1.2 + base * 4 + amp * 9) + Math.sin(a * (k * 2 + 3) - t * ph * 1.7) * (.6 + amp * 4);
      const x = W / 2 + Math.cos(a) * rad, y = H / 2 + Math.sin(a) * rad; i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = col; c.lineWidth = 1.1; c.stroke();
  }
  const alive = () => cv && cv.isConnected && cv.offsetParent !== null && !document.hidden;
  const GR = () => ['#tc-frame', '#tc-lines', '#tc-nodes', '#tc-core', '#tc-fx'].map($);
  const DEP = [-7, 2, 3, 1, 3];
  function tick(ms) {
    if (!alive()) return false;
    if (cv.clientWidth !== W && !size()) return false;
    const t = ms / 1000, dt = lastMs ? Math.min(.05, (ms - lastMs) / 1000) : .016; lastMs = ms;
    fAcc += dt; if (++fN === 90) { if (fN / fAcc < 42 && Q > .45) Q -= .2; fAcc = 0; fN = 0; }   // qualidade adaptativa
    gx += (tx - gx) * .06; gy += (ty - gy) * .06; amp *= .955;
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
    glowDot(W * (.3 + Math.sin(t * .13) * .12 + gx * .05), H * (.25 + Math.cos(t * .1) * .06), W * .62, '94,230,255', .11 + base * .12);
    glowDot(W * (.75 + Math.cos(t * .11) * .1 - gx * .05), H * (.8 + Math.sin(t * .09) * .05), W * .55, '167,120,255', .11 + base * .1);
    glowDot(W / 2, H / 2, W * .38, '231,199,119', .05 + base * .14 + amp * .12);
    const ns = ST.length * Q | 0;
    for (let i = 0; i < ns; i++) { const s = ST[i], a = .35 + .65 * Math.abs(Math.sin(t * s.s + s.p)); c.fillStyle = `rgba(220,235,255,${a * (.4 + s.z * .6)})`; c.beginPath(); c.arc((s.x + gx * 16 * s.z + W) % W, (s.y + gy * 16 * s.z + H) % H, s.r * (.6 + s.z * .6), 0, 6.2832); c.fill(); }
    if (Math.random() < .004 * Q) SS.push({ x: Math.random() * W, y: Math.random() * H * .5, vx: 6 + Math.random() * 4, vy: 2 + Math.random() * 2, l: 1 });
    for (let i = SS.length - 1; i >= 0; i--) {
      const s = SS[i]; s.x += s.vx; s.y += s.vy; s.l -= .02; if (s.l <= 0) { SS.splice(i, 1); continue; }
      const g = c.createLinearGradient(s.x, s.y, s.x - s.vx * 7, s.y - s.vy * 7); g.addColorStop(0, `rgba(255,255,255,${s.l})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 1.4; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 7, s.y - s.vy * 7); c.stroke();
    }
    ring(90, t, `rgba(94,230,255,${.22 + base * .3 + amp * .4})`, 1.4); ring(145, t, `rgba(231,199,119,${.2 + base * .3 + amp * .4})`, -1.1);
    // arco dispara nos talentos aprendidos; fagulhas orbitam; pulsos viram flechas
    if (t - spawnT > .6) {
      spawnT = t;
      nodes.forEach(n => { if (n.own && Math.random() < .8) { PL.push({ a: n.pre ? byId(n.pre) || { x: 0, y: 0 } : { x: 0, y: 0 }, b: n, u: 0 }); if (!n.pre) { bowPull = 1; fireAt = n; fireUntil = t + .4; } } });
    }
    nodes.forEach(n => {
      if (!n.own) return; const p = nodeXY(n), col = TCOL[n.tier];
      for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * 2.094; glowDot(p.x + Math.cos(a) * 25 * S, p.y + Math.sin(a) * 25 * S, 5 * S, col.l2, .9); }
      glowDot(p.x, p.y, 34 * S, col.c, .16 + .08 * Math.sin(t * 2 + n.x));
    });
    for (let i = PL.length - 1; i >= 0; i--) {
      const q = PL[i]; q.u += dt * (q.big ? .9 : .75);
      if (q.u > 1) { amp = Math.min(1, amp + (q.big ? .12 : .04)); PL.splice(i, 1); continue; }
      if (q.u < 0) continue;
      const l2 = TCOL[q.b.tier].l2;
      for (let k = 0; k < 6; k++) { const u = Math.max(0, q.u - k * .025), x = W / 2 + (q.a.x + (q.b.x - q.a.x) * u) * S, y = H / 2 + (q.a.y + (q.b.y - q.a.y) * u) * S; glowDot(x, y, (q.big ? 10 : 7) * S * (1 - k * .13), l2, (1 - k * .16) * .95); }
      const hx = W / 2 + (q.a.x + (q.b.x - q.a.x) * q.u) * S, hy = H / 2 + (q.a.y + (q.b.y - q.a.y) * q.u) * S, an = Math.atan2(q.b.y - q.a.y, q.b.x - q.a.x), sz = (q.big ? 9 : 6) * S;
      c.fillStyle = `rgba(${l2},.95)`; c.beginPath(); c.moveTo(hx + Math.cos(an) * sz, hy + Math.sin(an) * sz); c.lineTo(hx + Math.cos(an + 2.5) * sz * .8, hy + Math.sin(an + 2.5) * sz * .8); c.lineTo(hx + Math.cos(an - 2.5) * sz * .8, hy + Math.sin(an - 2.5) * sz * .8); c.fill();
    }
    for (let i = SW.length - 1; i >= 0; i--) { const w = SW[i]; w.r += 7 * S; w.l -= .018; if (w.l <= 0) { SW.splice(i, 1); continue; } c.strokeStyle = `rgba(${w.c},${w.l})`; c.lineWidth = 2.4 * w.l + .4; c.beginPath(); c.arc(w.x, w.y, w.r, 0, 6.2832); c.stroke(); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx; p.y += p.vy; p.vx *= .96; p.vy *= .96; p.l -= .016; if (p.l <= 0) { P.splice(i, 1); continue; } glowDot(p.x, p.y, (2 + p.l * 5) * Q + 2, p.c, p.l); }
    // arco gira até a mira (talento selecionado ou o que está disparando)
    const tgn = (t < fireUntil && fireAt) ? fireAt : (byId(sel) || { x: 0, y: -1 }), ta = Math.atan2(tgn.y, tgn.x);
    bowA += ((((ta - bowA) % 6.2832) + 9.4248) % 6.2832 - 3.1416) * .1; bowPull = Math.max(0, bowPull - dt * 2.4);
    const bw = $('#tc-bow'); if (bw) { bw.setAttribute('transform', `rotate(${bowA * 57.2958})`); $('#tc-bowarrow').setAttribute('transform', `translate(${-bowPull * 8} 0)`); $('#tc-bowstr').setAttribute('d', `M5-22Q${5 - bowPull * 9} 0 5 22`); }
    GR().forEach((g, i) => { if (g) g.style.transform = `translate(${gx * DEP[i]}px,${gy * DEP[i]}px)`; });
    return true;
  }
  // um único laço por vez (loopId invalida laços antigos ao remontar a árvore)
  let loopId = 0;
  function resume() {
    if (running || !cv || !alive()) return;
    const id = ++loopId; running = true; lastMs = 0;
    (function step(ms) { if (id !== loopId) return; if (!tick(ms)) { running = false; return; } requestAnimationFrame(step); })(performance.now());
  }
  function stop() { loopId++; running = false; }

  // ───────────────────────── montagem ─────────────────────────
  function mount(tr) {
    tree = tr;
    const cont = document.getElementById('talent-tree-content'); if (!cont) throw new Error('sem container');
    const sh = document.getElementById('talent-tree-static-header'); if (sh) sh.style.display = 'none';
    addCSS(); stop();
    cont.innerHTML = SHELL;
    cv = $('#tc-bg'); c = cv.getContext('2d');
    P = []; SW = []; PL = []; SS = []; Q = 1; amp = 0;
    if (pathIdx >= tree.paths.length) pathIdx = 0;
    nodes = layout(curPath()); if (!byId(sel)) sel = nodes[0].id;
    bind(); render.first = true; render();
    size();
    if (!listenersOn) {
      listenersOn = true;
      window.addEventListener('deviceorientation', e => { if (e.gamma == null) return; tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, (e.beta - 50) / 25)); });
      window.addEventListener('resize', () => { if (cv && cv.isConnected) size(); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
    }
    setTimeout(() => { size(); resume(); }, 60);
  }

  // ───────────────────────── ganchos (não substitui nada, só embrulha) ─────────────────────────
  const orig = window.buildTalentTreeUI;
  const origSwitch = window.switchOverlayTab;
  if (typeof orig !== 'function') { console.warn('[constelacao] buildTalentTreeUI não encontrado — este script precisa carregar DEPOIS de talent_system.js. Árvore clássica mantida.'); return; }
  console.info('[constelacao] script carregado ✔ (aparece só pro Arqueiro)');

  function addBackBtn() {
    const cont = document.getElementById('talent-tree-content'); if (!cont) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tc-back'; b.textContent = '✦ Usar ' + NOMES.titulo;
    b.onclick = () => { setClassico(false); window.buildTalentTreeUI(getTalentTree()); };
    addCSS(); cont.insertBefore(b, cont.firstChild);
  }
  window.buildTalentTreeUI = function (tr) {
    const isArc = typeof G !== 'undefined' && G.player && G.player.class === 'arqueiro';
    if (isArc) {
      if (!classico()) {
        try { mount(tr); return; }
        catch (e) {
          console.error('[constelacao] caiu pra árvore clássica:', e);
          try { if (typeof notify === 'function') notify('⚠ Constelação falhou: ' + (e && e.message || e), 'red'); } catch (e2) {}
        }
      }
      const r = orig.apply(this, arguments); addBackBtn(); return r;
    }
    stop();
    return orig.apply(this, arguments);
  };
  if (typeof origSwitch === 'function') {
    window.switchOverlayTab = function (aba) {
      const r = origSwitch.apply(this, arguments);
      if (aba === 'talentos') setTimeout(() => { if (cv && cv.isConnected) { size(); resume(); } }, 40);
      return r;
    };
  }
})();
