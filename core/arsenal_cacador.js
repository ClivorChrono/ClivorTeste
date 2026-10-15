/* ═══════════════════════════════════════════════════════════════════════
 *  core/arsenal_cacador.js — "Arsenal do Caçador" (somente ARQUEIRO)
 *  Troca o painel "⚡ HABILIDADES EM BATALHA" por um painel no estilo da
 *  Constelação e o move para DEPOIS da árvore de talentos.
 *
 *  As regras continuam 100% do jogo: quem equipa/solta é
 *  assignSkillToSlot() / unequipSkillSlot() do palDinh.js, e os slots vivem
 *  em G.player.equippedSkills. Aqui só muda o desenho e o fluxo.
 *
 *  Segurança:
 *   - não altera palDinh.js nem talent_system.js (só embrulha
 *     buildCharacterScreen e openSlotPickerForSkill);
 *   - qualquer erro → volta sozinho ao painel antigo (com aviso);
 *   - usa o mesmo botão "usar árvore clássica" da Constelação
 *     (chave clivor_talent_classico): clássico = tudo como era antes.
 *  Carregar DEPOIS de palDinh.js, talent_system.js e talent_constelacao.js.
 * ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // ▼▼ NOME — mude aqui (só nesta linha) o título que aparece na tela ▼▼
  const NOMES = { arsenal: 'Arsenal do Caçador' };
  const KEY = 'clivor_talent_classico';
  const classico = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const NS = 'http://www.w3.org/2000/svg';
  const ROM = ['I', 'II', 'III'];
  const CX = 200, CY = 190, ANG = [-90, 30, 150].map(a => a * Math.PI / 180);
  const SP = ANG.map(a => ({ x: CX + Math.cos(a) * 112, y: CY + Math.sin(a) * 112 }));
  const PAL = ['#5fe3a1', '#ffd36b', '#c58bff', '#5ee6ff', '#ff9ad5'];
  const FIXED = { flecha_precisa: '#ffb340', chuva_flechas: '#6fb6ff', marca_cacador: '#ff6a55' };
  const R = (a, b) => a + Math.random() * (b - a);
  const $ = (s, r) => (r || document).querySelector(s);
  const isArc = () => typeof G !== 'undefined' && G.player && G.player.class === 'arqueiro';
  const inOverlay = () => { const o = document.getElementById('talent-overlay'); return !!o && o.style.display === 'flex'; };

  let armed = null, selS = 0, pendingFx = null, warned = false;
  let cv, c, W = 0, H = 0, S = 1, loopId = 0, running = false;
  let ST = [], AR = [], P = [], bowA = -1.5708, pull = 0, last = 0, aimIdx = 0, aimUntil = 0, obs = null;

  // ───────────────────────── CSS ─────────────────────────
  function addCSS() {
    if (document.getElementById('ars-style')) return;
    const st = document.createElement('style'); st.id = 'ars-style';
    st.textContent = `
#ars-root{--gold:#e7c777;--ice:#bfeaff;--cy:#5ee6ff;font-family:'Noto Serif JP',Georgia,serif;color:#efe8d4;max-width:520px;margin:0 auto;padding:4px 2px 12px}
#ars-root *{box-sizing:border-box}
.ars-sec{display:flex;align-items:center;gap:10px;margin:2px 2px 10px}
.ars-sec h1{font-size:1rem;font-weight:900;letter-spacing:.14em;color:var(--gold);text-shadow:0 0 14px #e7c77755;margin:0;white-space:nowrap}
.ars-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,#e7c77777,transparent)}
.ars-sec small{font-size:.58rem;color:#8e9ab8;letter-spacing:.06em;white-space:nowrap}
#ars-stage{position:relative;width:100%;aspect-ratio:400/380;border-radius:10px;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#0e1a3a,#04060f 70%);border:1px solid #2a3150}
#ars-bg,#ars-sv{position:absolute;inset:0;width:100%;height:100%}
.ars-fr{fill:none;stroke:var(--gold);stroke-width:1.1;opacity:.85}
.ars-orb{fill:none;stroke:#8fb4ff;stroke-width:.7;stroke-dasharray:2 5;opacity:.28}
.ars-cn{fill:none;stroke:#2c3658;stroke-width:1.6;stroke-linecap:round}
.ars-cn.lit{stroke-width:2.2;stroke-dasharray:5 7;animation:arsflow .9s linear infinite;filter:url(#ars-gl)}
@keyframes arsflow{to{stroke-dashoffset:-12}}
.ars-sl{cursor:pointer}
.ars-core{fill:#090d24;stroke:var(--ac);stroke-width:1.6;opacity:.75}
.ars-halo{fill:none;stroke:transparent;stroke-width:1.4}
.ars-gl{font-size:20px;text-anchor:middle;fill:#e7c77799;pointer-events:none}
.ars-pl{font-size:24px;text-anchor:middle;fill:#e7c77799;pointer-events:none}
.ars-lb{font-size:8px;letter-spacing:.12em;text-anchor:middle;fill:#9aa4c4;pointer-events:none}
.ars-sl.on .ars-core{fill:url(#ars-g);stroke:#fff3c9;opacity:1;filter:url(#ars-gl)}
.ars-sl.on .ars-lb{fill:var(--ac)}
.ars-sl image{pointer-events:none}
.ars-star{opacity:0;fill:var(--ac);pointer-events:none;transition:opacity .5s}
.ars-sl.on .ars-star{opacity:.95}
.ars-sl.tg .ars-halo{stroke:var(--cy);animation:arspulse 1.3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes arspulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.14)}}
.ars-selr{fill:none;stroke:#fff;stroke-width:1.2;stroke-dasharray:3 4;opacity:0;transform-box:fill-box;transform-origin:center;animation:arsspin 6s linear infinite}
.ars-sl.sel .ars-selr{opacity:1}
@keyframes arsspin{to{transform:rotate(360deg)}}
#ars-info{margin:10px 0 12px;padding:14px;border:1px solid #2a3150;border-left:3px solid var(--cy);border-radius:10px;background:linear-gradient(#0c1228,#080b1a);min-height:120px}
.ars-ih{display:flex;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap}
.ars-ih h2{font-size:1rem;font-weight:900;letter-spacing:.06em;color:var(--gold);margin:0}
.ars-tag{font-size:.55rem;letter-spacing:.14em;color:#04101a;background:var(--cy);padding:2px 7px;border-radius:2px}
.ars-ms{display:flex;gap:12px;flex-wrap:wrap;font-size:.6rem;color:#9fb3d9;letter-spacing:.06em}
#ars-info p{font-size:.78rem;line-height:1.55;color:#d9d3c2;margin:8px 0 10px}
.ars-act{display:flex;gap:10px;align-items:center}
.ars-hp{font-size:.68rem;letter-spacing:.05em;color:var(--cy);animation:arspulse 1.3s ease-in-out infinite}
.ars-act button{margin-left:auto;font:inherit;font-size:.68rem;letter-spacing:.12em;color:#ff9a85;background:#150a10;border:1px solid #6a3038;border-radius:4px;min-height:44px;padding:0 16px;cursor:pointer}
.ars-lh{font-size:.62rem;letter-spacing:.2em;color:#7f8fb8;margin:4px 2px 8px;display:flex;align-items:center;gap:10px}
.ars-lh::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,#2a3866,transparent)}
.ars-card{position:relative;display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;border:1px solid #2a3150;border-radius:10px;background:linear-gradient(#0d1330,#080b1a);cursor:pointer;min-height:66px}
.ars-card.eq{border-color:color-mix(in srgb,var(--ac) 55%,#2a3150)}
.ars-card.arm{border-color:var(--ac);box-shadow:0 0 18px color-mix(in srgb,var(--ac) 35%,transparent);animation:arspulse 1.3s ease-in-out infinite}
.ars-ic{width:52px;height:52px;flex:none;border-radius:50%;border:2px solid var(--ac);background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--ac) 40%,#05081a),#05081a 80%);display:grid;place-items:center;overflow:hidden;box-shadow:0 0 12px color-mix(in srgb,var(--ac) 45%,transparent);font-size:1.4rem}
.ars-ic img{width:100%;height:100%;object-fit:cover}
.ars-tx{flex:1;min-width:0}
.ars-tx h3{font-size:.8rem;font-weight:900;letter-spacing:.04em;color:#f3e6bd;margin:0 0 5px}
.ars-ch{display:flex;gap:6px;flex-wrap:wrap}
.ars-ch span{font-size:.55rem;color:#aeb8d6;background:#0a0f26;border:1px solid #2a3150;border-radius:3px;padding:2px 6px}
.ars-ch .ap{color:var(--cy);border-color:#1d5560}
.ars-bd{font-size:.58rem;letter-spacing:.1em;color:#1a1204;background:var(--ac);padding:4px 9px;border-radius:3px;white-space:nowrap}
.ars-bd.free{color:#6d7698;background:none;border:1px solid #2a3150}
#ars-dock{position:sticky;bottom:0;z-index:20;display:none;align-items:center;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,#03050df2 40%);cursor:pointer}
#ars-dock.show{display:flex}
#ars-dock .dk{flex:1;display:flex;align-items:center;gap:8px;border:1px solid #6b5a2e;border-radius:10px;background:#0a0f24ee;padding:6px 10px;max-width:520px;margin:0 auto;min-height:52px}
#ars-dock .dk b{font-size:.6rem;letter-spacing:.16em;color:var(--gold,#e7c777);font-weight:700;margin-right:auto}
#ars-dock .dk i{width:34px;height:34px;border-radius:50%;border:2px solid var(--ac,#3a4570);background:#05081a;display:grid;place-items:center;overflow:hidden;font-style:normal;font-size:.9rem;color:#6d7698}
#ars-dock .dk i img{width:100%;height:100%;object-fit:cover}
#ars-dock .dk em{font-style:normal;color:#8e9ab8;font-size:.9rem}
@media (prefers-reduced-motion:reduce){#ars-root *{animation:none!important}}`;
    document.head.appendChild(st);
  }

  // ───────────────────────── dados do jogo ─────────────────────────
  const clean = d => String(d || '').replace(/\s*\([^()]*🏹[^()]*\)\s*$/u, '');
  function mkSkill(sk, key, tal) {
    const usesAp = sk.ap !== undefined;
    const cost = (!tal && typeof getSkillCost === 'function') ? getSkillCost(sk, G.player) : (usesAp ? sk.ap : (sk.mp || 0));
    let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return { key, name: sk.name, icon: sk.icon || '✦', img: sk.iconImg || '', cost, unit: (usesAp || !tal) ? 'AP' : 'MP',
             arr: sk.arrowCost || 0, cd: sk.cooldownTurns || 0, desc: clean(sk.desc), tal,
             acc: FIXED[sk.key] || PAL[h % PAL.length] };
  }
  function getSkills() {
    const p = G.player, cls = p.classData, out = [];
    ((cls && cls.skills) || []).forEach((sk, i) => {
      if (sk.lv5Choice || sk.despertarSkill) return;
      if (typeof isElementoDesbloqueado === 'function' && !isElementoDesbloqueado(sk)) return;
      out.push(mkSkill(sk, 'b' + i, false));
    });
    ((typeof getTalentSkills === 'function') ? getTalentSkills() : []).forEach((sk, i) => out.push(mkSkill(sk, 't' + i, true)));
    return out;
  }
  const hex = r => [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 3 * i - Math.PI / 2; return (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1); }).join(' ');
  const STAR = 'M0-26L4-4 26 0 4 4 0 26-4 4-26 0-4-4Z';
  const icon = k => k.img ? `<img src="${k.img}" alt="" onerror="this.outerHTML='${k.icon}'">` : k.icon;
  const stats = k => `<div class="ars-ms"><span>${k.unit} ${k.cost}</span>${k.arr ? `<span>FLECHAS ${k.arr}</span>` : ''}${k.cd ? `<span>RECARGA ${k.cd}T</span>` : ''}${k.tal ? '<span>✦ TALENTO</span>' : ''}</div>`;

  // ───────────────────────── desenho ─────────────────────────
  function build() {
    const skills = getSkills(), by = {}; skills.forEach(s => { by[s.key] = s; });
    const eq = (G.player.equippedSkills || []).slice(0, 3); while (eq.length < 3) eq.push(null);
    if (armed && !by[armed]) armed = null;
    let L = '', N = '';
    SP.forEach((p, i) => {
      const k = eq[i] && by[eq[i]];
      L += `<path class="ars-cn${k ? ' lit' : ''}" ${k ? `style="stroke:${k.acc}"` : ''} d="M${CX} ${CY}L${p.x} ${p.y}"/>`;
      N += `<g class="ars-sl${k ? ' on' : ''}${armed ? ' tg' : ''}${selS === i && !armed ? ' sel' : ''}" data-i="${i}" style="--ac:${k ? k.acc : '#e7c777'}" transform="translate(${p.x} ${p.y})">
 <path class="ars-star" d="${STAR}"/><circle class="ars-halo" r="38"/><circle class="ars-selr" r="42"/><circle class="ars-core" r="31"/>
 ${k ? (k.img ? `<text class="ars-gl" y="7">${k.icon}</text><image href="${k.img}" x="-27" y="-27" width="54" height="54" clip-path="url(#ars-clip)" preserveAspectRatio="xMidYMid slice" onload="this.previousElementSibling.style.display='none'" onerror="this.style.display='none'"/>` : `<text class="ars-gl" y="7">${k.icon}</text>`) : '<text class="ars-pl" y="8">+</text>'}
 <text class="ars-lb" y="${i === 0 ? -48 : 56}">${ROM[i]} · ${k ? k.name.toUpperCase() : 'VAZIO'}</text><circle r="44" fill="transparent"/></g>`;
    });
    // painel de info
    let info;
    if (armed) {
      const k = by[armed];
      info = `<div class="ars-ih"><span class="ars-tag" style="background:${k.acc}">ARMADA</span><h2>${k.name}</h2></div>${stats(k)}<p>${k.desc}</p><div class="ars-act"><span class="ars-hp">▸ Toque num slot do arco para equipar</span><button data-a="cancel">Cancelar</button></div>`;
    } else {
      const k = eq[selS] && by[eq[selS]];
      info = k ? `<div class="ars-ih"><span class="ars-tag" style="background:${k.acc}">SLOT ${ROM[selS]}</span><h2>${k.name}</h2></div>${stats(k)}<p>${k.desc}</p><div class="ars-act"><button data-a="unequip">Soltar</button></div>`
               : `<div class="ars-ih"><span class="ars-tag">SLOT ${ROM[selS]}</span><h2>Vazio</h2></div><p>Escolha uma habilidade abaixo e toque neste slot para encaixar.</p>`;
    }
    const cards = skills.map(k => {
      const si = eq.indexOf(k.key);
      return `<div class="ars-card${si >= 0 ? ' eq' : ''}${armed === k.key ? ' arm' : ''}" data-k="${k.key}" style="--ac:${k.acc}"><span class="ars-ic">${icon(k)}</span>
 <div class="ars-tx"><h3>${k.name}</h3><div class="ars-ch"><span class="ap">${k.unit} ${k.cost}</span>${k.arr ? `<span>➳ ${k.arr}</span>` : ''}${k.cd ? `<span>⟳ ${k.cd}T</span>` : ''}${k.tal ? '<span>✦ talento</span>' : ''}</div></div>
 <span class="ars-bd${si >= 0 ? '' : ' free'}">${si >= 0 ? 'SLOT ' + ROM[si] : 'LIVRE'}</span></div>`;
    }).join('');
    const ap = eq.reduce((a, id) => a + (id && by[id] ? by[id].cost : 0), 0), n = eq.filter(Boolean).length;
    const html = `<div id="ars-root">
 <div class="ars-sec"><h1>${NOMES.arsenal}</h1><small>${n}/3 slots · ${ap} AP</small></div>
 <div id="ars-stage"><canvas id="ars-bg"></canvas>
 <svg id="ars-sv" viewBox="0 0 400 380"><defs>
  <radialGradient id="ars-g" cx="35%" cy="30%"><stop offset="0" stop-color="#2b3a78"/><stop offset="1" stop-color="#0a1030"/></radialGradient>
  <radialGradient id="ars-mn" cx="40%" cy="35%"><stop offset="0" stop-color="#f6f1ff"/><stop offset=".7" stop-color="#a9b7e8"/><stop offset="1" stop-color="#46528c"/></radialGradient>
  <filter id="ars-gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="ars-clip"><circle r="27"/></clipPath></defs>
  <circle class="ars-fr" cx="200" cy="190" r="176"/><circle class="ars-fr" cx="200" cy="190" r="171" style="opacity:.35"/>
  <g><circle cx="200" cy="190" r="165" fill="none" stroke="#e7c777" stroke-width="2.4" stroke-dasharray="1 6.1" opacity=".5"/><animateTransform attributeName="transform" type="rotate" from="0 200 190" to="360 200 190" dur="200s" repeatCount="indefinite"/></g>
  <circle class="ars-orb" cx="200" cy="190" r="112"/><circle class="ars-orb" cx="200" cy="190" r="62" style="stroke:#5ee6ff"/>
  <g id="ars-cn">${L}</g>
  <g><circle cx="200" cy="190" r="42" fill="none" stroke="#5ee6ff" stroke-width=".7" opacity=".5"><animate attributeName="r" values="36;46;36" dur="3.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0;.6" dur="3.4s" repeatCount="indefinite"/></circle>
   <circle cx="200" cy="190" r="27" fill="url(#ars-mn)" filter="url(#ars-gl)"/>
   <g transform="translate(200 190)"><g id="ars-bow"><path d="M5-21Q-14 0 5 21" fill="none" stroke="#2a1c05" stroke-width="3.4" stroke-linecap="round"/><path d="M5-21Q-14 0 5 21" fill="none" stroke="#e7c777" stroke-width="1.8" stroke-linecap="round"/><path id="ars-str" d="M5-21Q5 0 5 21" fill="none" stroke="#fff" stroke-width=".8"/>
    <g id="ars-arw"><path d="M-6 0H24" stroke="#2a1c05" stroke-width="2.8" stroke-linecap="round"/><path d="M-6 0H24" stroke="#bfeaff" stroke-width="1.4" stroke-linecap="round"/><path d="M24-3.2L30 0 24 3.2z" fill="#bfeaff"/></g></g></g></g>
  <g id="ars-nodes">${N}</g><g id="ars-fx"></g></svg></div>
 <div id="ars-info" style="border-left-color:${armed ? by[armed].acc : (eq[selS] && by[eq[selS]] ? by[eq[selS]].acc : '#5ee6ff')}">${info}</div>
 <div class="ars-lh">MÓDULOS DE HABILIDADE</div>${cards}
</div>`;
    return { html, eq, by };
  }

  // ───────────────────────── ações (usam as funções do jogo) ─────────────────────────
  function equipFx(key, i) {
    const k = getSkills().find(s => s.key === key); if (!k || typeof assignSkillToSlot !== 'function') return;
    pull = 1; aimIdx = i; aimUntil = performance.now() / 1000 + .8;
    AR.push({ b: SP[i], u: 0, c: k.acc });
    pendingFx = { i, acc: k.acc };
    armed = null; selS = i;
    setTimeout(() => assignSkillToSlot(key, i), 470);   // o jogo equipa, salva e redesenha
  }
  function bind(root) {
    root.addEventListener('click', e => {
      const sl = e.target.closest('.ars-sl');
      if (sl) { const i = +sl.dataset.i; if (armed) equipFx(armed, i); else { selS = i; rerender(); } return; }
      const cd = e.target.closest('.ars-card');
      if (cd) { armed = armed === cd.dataset.k ? null : cd.dataset.k; rerender(); if (armed) $('#ars-stage').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'cancel') { armed = null; rerender(); }
      if (b.dataset.a === 'unequip') { if (typeof unequipSkillSlot === 'function') unequipSkillSlot(selS); }
    });
  }

  // ───────────────────────── efeitos (canvas) ─────────────────────────
  function size() {
    if (!cv) return false; const d = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight; if (!W) return false;
    cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); S = W / 400;
    ST = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .3, p: Math.random() * 6.28, s: .5 + Math.random() * 1.5 }));
    return true;
  }
  function dot(x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');
  const alive = () => cv && cv.isConnected && cv.offsetParent !== null && !document.hidden;
  function tick(ms) {
    if (!alive()) return false;
    if (cv.clientWidth !== W && !size()) return false;
    const t = ms / 1000, dt = last ? Math.min(.05, (ms - last) / 1000) : .016; last = ms;
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
    dot(W * .5, H * .5, W * .5, '94,230,255', .07); dot(W * .3, H * .25, W * .6, '94,230,255', .08); dot(W * .75, H * .8, W * .55, '167,120,255', .08);
    ST.forEach(s => { c.fillStyle = `rgba(220,235,255,${(.3 + .7 * Math.abs(Math.sin(t * s.s + s.p))) * .8})`; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.2832); c.fill(); });
    for (let i = AR.length - 1; i >= 0; i--) {
      const q = AR[i]; q.u += dt * 2.2;
      if (q.u >= 1) { for (let n = 0; n < 22; n++) { const a = R(0, 6.283), v = R(1, 3.4); P.push({ x: q.b.x * S, y: q.b.y * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c: rgb(q.c) }); } AR.splice(i, 1); continue; }
      const col = rgb(q.c), an = Math.atan2(q.b.y - CY, q.b.x - CX);
      for (let k = 0; k < 8; k++) { const u = Math.max(0, q.u - k * .02), x = (CX + (q.b.x - CX) * u) * S, y = (CY + (q.b.y - CY) * u) * S; dot(x, y, (12 - k) * S, '255,255,255', (1 - k * .11) * .8); dot(x, y, (18 - k) * S, col, (1 - k * .11) * .5); }
      const hx = (CX + (q.b.x - CX) * q.u) * S, hy = (CY + (q.b.y - CY) * q.u) * S, sz = 11 * S;
      c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.moveTo(hx + Math.cos(an) * sz, hy + Math.sin(an) * sz); c.lineTo(hx + Math.cos(an + 2.5) * sz * .8, hy + Math.sin(an + 2.5) * sz * .8); c.lineTo(hx + Math.cos(an - 2.5) * sz * .8, hy + Math.sin(an - 2.5) * sz * .8); c.fill();
    }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx; p.y += p.vy; p.vx *= .96; p.vy *= .96; p.l -= .02; if (p.l <= 0) { P.splice(i, 1); continue; } dot(p.x, p.y, 2 + p.l * 5, p.c, p.l); }
    const eqNow = (G.player.equippedSkills || []).slice(0, 3);
    const ti = (t < aimUntil) ? aimIdx : (armed ? Math.max(0, [0, 1, 2].find(i => !eqNow[i]) ?? selS) : selS);
    bowA += ((((ANG[ti] - bowA) % 6.2832) + 9.4248) % 6.2832 - 3.1416) * .1; pull = Math.max(0, pull - dt * 2.4);
    const bw = $('#ars-bow'); if (bw) { bw.setAttribute('transform', `rotate(${bowA * 57.2958})`); $('#ars-arw').setAttribute('transform', `translate(${-pull * 8} 0)`); $('#ars-str').setAttribute('d', `M5-21Q${5 - pull * 9} 0 5 21`); }
    return true;
  }
  function resume() {
    if (running || !cv || !alive()) return;
    const id = ++loopId; running = true; last = 0;
    (function step(ms) { if (id !== loopId) return; if (!tick(ms)) { running = false; return; } requestAnimationFrame(step); })(performance.now());
  }
  function stopLoop() { loopId++; running = false; }
  function burstAt(i, acc) {
    const p = SP[i], f = $('#ars-fx'); if (!f) return;
    [[34, acc, 800], [20, '#fff', 520]].forEach(([r, cc, d]) => {
      const w = document.createElementNS(NS, 'circle'); w.setAttribute('r', r); w.setAttribute('cx', p.x); w.setAttribute('cy', p.y);
      w.style.cssText = `fill:none;stroke:${cc};stroke-width:2;transform-box:fill-box;transform-origin:center`; f.append(w);
      w.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(3.6)', opacity: 0 }], { duration: d, easing: 'ease-out' }).onfinish = () => w.remove();
    });
    for (let n = 0; n < 26; n++) { const a = R(0, 6.283), v = R(1, 3.6); P.push({ x: p.x * S, y: p.y * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c: rgb(acc) }); }
    const st = $('#ars-stage'); if (st) st.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.02)', offset: .2 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
    try { if (navigator.vibrate && !(typeof CONFIG !== 'undefined' && CONFIG.vibration === false)) navigator.vibrate([15, 25, 15]); } catch (e) {}
  }

  // ───────────────────────── atalho fixo no pé da aba ─────────────────────────
  function updateDock(eq, by) {
    const pane = document.querySelector('#talent-overlay .ov-tab-pane[data-aba="talentos"]'); if (!pane) return;
    let dock = document.getElementById('ars-dock');
    if (!dock) { dock = document.createElement('div'); dock.id = 'ars-dock'; pane.appendChild(dock); dock.addEventListener('click', () => { const r = document.getElementById('ars-root'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }
    else if (dock.parentElement !== pane || pane.lastElementChild !== dock) pane.appendChild(dock);
    dock.innerHTML = `<div class="dk"><b>ARSENAL</b>${eq.map(id => { const k = id && by[id]; return `<i style="${k ? '--ac:' + k.acc : ''}">${k ? icon(k) : '+'}</i>`; }).join('')}<em>▾</em></div>`;
    if (obs) obs.disconnect();
    const root = document.getElementById('ars-root');
    if ('IntersectionObserver' in window && root) {
      obs = new IntersectionObserver(es => { dock.classList.toggle('show', !es[0].isIntersecting && pane.classList.contains('active')); }, { root: pane, threshold: 0.12 });
      obs.observe(root);
    } else dock.classList.add('show');
  }
  function removeDock() { const d = document.getElementById('ars-dock'); if (d) d.remove(); if (obs) { obs.disconnect(); obs = null; } }

  // ───────────────────────── montagem ─────────────────────────
  function rerender() { enhance(); }
  function enhance() {
    const tt = document.getElementById('char-content-tt'); if (!tt) return;
    const wrap = tt.parentElement, section = document.getElementById('talentos-section');
    if (!isArc() || classico()) { stopLoop(); removeDock(); if (section && wrap && section.nextElementSibling === wrap) section.before(wrap); return; }
    const box = tt.querySelector('.char-section'); if (!box) return;
    addCSS();
    const { html, eq, by } = build();
    const old = document.getElementById('ars-root'); if (old) old.remove();
    box.insertAdjacentHTML('afterbegin', html);
    ['.char-section-title', '.char-skill-slots', '.char-section-sub', '.char-skills-list'].forEach(s => { const e = box.querySelector(':scope > ' + s); if (e) e.style.display = 'none'; });
    if (section && wrap) section.after(wrap);               // Arsenal passa a ficar DEPOIS da Constelação
    cv = $('#ars-bg'); c = cv.getContext('2d'); AR = []; P = P.slice(0, 0);
    bind($('#ars-root')); size(); updateDock(eq, by);
    if (pendingFx) { const fx = pendingFx; pendingFx = null; setTimeout(() => burstAt(fx.i, fx.acc), 30); }
    stopLoop(); setTimeout(() => { size(); resume(); }, 50);
  }

  // ───────────────────────── ganchos ─────────────────────────
  const origBCS = window.buildCharacterScreen, origPick = window.openSlotPickerForSkill, origSwitch = window.switchOverlayTab;
  if (typeof origBCS !== 'function') { console.warn('[arsenal] buildCharacterScreen não encontrado — painel antigo mantido.'); return; }
  console.info('[arsenal] script carregado ✔ (só pro Arqueiro)');
  window.buildCharacterScreen = function (targetId) {
    const r = origBCS.apply(this, arguments);
    if (targetId === 'char-content-tt') {
      try { enhance(); }
      catch (e) {
        console.error('[arsenal] caiu pro painel antigo:', e);
        const root = document.getElementById('ars-root'); if (root) root.remove();
        const tt = document.getElementById('char-content-tt'); if (tt) tt.querySelectorAll('.char-section > *').forEach(el => { el.style.display = ''; });
        removeDock(); stopLoop();
        if (!warned) { warned = true; try { if (typeof notify === 'function') notify('⚠ Arsenal falhou: ' + (e && e.message || e), 'red'); } catch (e2) {} }
      }
    }
    return r;
  };
  // ao desbloquear uma skill (ou quando os 3 slots estão cheios) o jogo abria um popup: agora a skill já vem ARMADA no Arsenal
  if (typeof origPick === 'function') {
    window.openSlotPickerForSkill = function (key) {
      if (isArc() && !classico() && inOverlay() && document.getElementById('ars-root')) {
        armed = key; rerender();
        const st = $('#ars-stage'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      return origPick.apply(this, arguments);
    };
  }
  if (typeof origSwitch === 'function') {
    window.switchOverlayTab = function (aba) {
      const r = origSwitch.apply(this, arguments);
      setTimeout(() => { const d = document.getElementById('ars-dock'); if (aba !== 'talentos' && d) d.classList.remove('show'); if (aba === 'talentos' && cv && cv.isConnected) { size(); resume(); } }, 40);
      return r;
    };
  }
})();
