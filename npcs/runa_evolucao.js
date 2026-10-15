// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — npcs/runa_evolucao.js
//  Tela "Evoluir runa" do Gozen, estilo Ragnarok: materiais de um lado,
//  encaixe da runa do outro, chance de sucesso por grau e efeito visual
//  de sucesso/falha. A imagem da runa se TRANSFORMA na do próximo grau.
//
//  Só substitui storyNode_encantamentos() e usa o enchantSelect()
//  existente pra aplicar a runa. Carregar DEPOIS de vilarejo.js.
//
//  Falha: perde só o material (moedas ou a runa guardada); a runa
//  atual não cai de grau.
// ══════════════════════════════════════════════════════════════
'use strict';
(function () {
  if (typeof storyNode_encantamentos !== 'function' || typeof enchantSelect !== 'function') {
    console.warn('[runa_evolucao] carregue depois de vilarejo.js'); return;
  }

  const DIR = 'Imagens/icones/';
  // "RumeS+.png" é o nome real do arquivo (com o typo); "+" precisa ir codificado na URL
  const IMG = { N: 'RuneN.png', D: 'RuneD.png', C: 'RuneC.png', B: 'RuneB.png', A: 'RuneA.png',
                S: 'RuneS.png', 'S+': 'RumeS%2B.png', SS: 'RuneSS.png' };
  const CHANCE = { D: 100, C: 95, B: 85, A: 70, S: 55, 'S+': 40, SS: 25 };

  // ── Quebra e reparo ──
  // Chance (%) da runa QUEBRAR quando a evolução falha, por grau tentado
  const BREAK = { C: 5, B: 8, A: 12, S: 18, 'S+': 25, SS: 35 };
  // Pedra Esper (item que já existe no jogo): protege a runa de QUEBRAR (a evolução ainda pode falhar).
  // Cada pedra dá 20 tentativas (sucesso ou falha) e some depois; usa uma por vez, não acumula.
  // Reconhece pelo id OU pelo nome "Pedra Esper" — se o id for outro, ajuste PROT_IDS.
  const PROT_ID = 'pedra_esper', PROT_CARGAS = 20;
  const PROT_IDS = ['pedra_esper'];
  const PROT_NOME = /pedra\s*esper/i;
  function isProt(it) {
    if (PROT_IDS.includes(it.id)) return true;
    const nm = it.name || (typeof ITEM_DB !== 'undefined' && ITEM_DB[it.id] && ITEM_DB[it.id].name) || '';
    return PROT_NOME.test(nm);
  }
  function casa(id) { return id === PROT_ID ? isProt : (i => i.id === id); }
  // Reparos. desce = quantos graus a runa perde ao voltar
  const REP = {
    eco: { id: 'eco_cristalizado', qty: 1,  gold: 700, desce: 0 },   // restaura totalmente
    po:  { id: 'po_cristal',       qty: 15, gold: 0,   desce: 1 },   // conserto simples (runa volta 1 grau)
  };
  function qtyOf(id) { return (G.player.inventory || []).filter(casa(id)).reduce((a, i) => a + (i.qty || 1), 0); }
  function takeItem(id, n) {
    const inv = G.player.inventory; let left = n;
    for (let k = inv.length - 1; k >= 0 && left > 0; k--) {
      const it = inv[k]; if (!casa(id)(it)) continue;
      const q = it.qty || 1, t = Math.min(q, left); it.qty = q - t; left -= t;
      if (it.qty <= 0) inv.splice(k, 1);
    }
  }

  const PALETAS = {
    pergaminho: { win:'#f1e7cf', tb:'#1f3a73', pn:'#fffaf0', bd:'#1f3a73', ink:'#1f2a44', mu:'#6b6552', ac:'#c9921a', btn:'#1f3a73', bt:'#ffffff' },
    classico:   { win:'#e9eef7', tb:'#3d62a8', pn:'#ffffff', bd:'#2a3f7a', ink:'#1c2b55', mu:'#5b6b95', ac:'#e8a317', btn:'#3b6fd0', bt:'#ffffff' },
    royal:      { win:'#1d3f8f', tb:'#0f2a6b', pn:'#15327a', bd:'#0a1d4d', ink:'#f2f6ff', mu:'#a8bdf0', ac:'#ffd36b', btn:'#e8a317', bt:'#1c1500' },
  };
  window.RUNA_PALETA = window.RUNA_PALETA || 'pergaminho';

  window._runaImgErr = function (el, id) {
    const d = document.createElement('div');
    d.className = el.className + ' rv-fb'; d.textContent = id;
    el.replaceWith(d);
  };
  function rImg(id, cls) {
    return `<img class="rv-img ${cls || ''}" src="${DIR}${IMG[id] || IMG.N}" alt="${id}" onerror="_runaImgErr(this,'${id}')">`;
  }

  (function injectCSS() {
    if (document.getElementById('runa-evo-style')) return;
    const s = document.createElement('style'); s.id = 'runa-evo-style';
    s.textContent = `
    .rv{position:relative;background:var(--win);border:2px solid var(--bd);color:var(--ink);overflow:hidden;max-width:520px;margin:10px auto}
    .rv-tb{display:flex;justify-content:space-between;background:var(--tb);color:#fff;padding:7px 10px;font-size:.85em}
    .rv-bd{display:grid;grid-template-columns:118px minmax(0,1fr);gap:8px;padding:8px}
    .rv-pn{background:var(--pn);border:2px solid var(--bd);padding:8px}
    .rv-lb{font-size:.72em;color:var(--mu);margin-bottom:6px}
    .rv-sl{display:flex;flex-direction:column;gap:2px;padding:6px;margin-bottom:6px;border:2px solid var(--bd);background:var(--win);font-size:.78em;line-height:1.3}
    .rv-sl.on{border-color:var(--ac);background:var(--pn)}
    .rv-sl small{color:var(--mu)}
    .rv-rt{display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
    .rv-sk{position:relative;width:112px;height:112px;border:2px solid var(--bd);background:var(--win);display:flex;align-items:center;justify-content:center}
    .rv-img{position:absolute;width:92px;height:92px;object-fit:contain}
    .rv-fb{display:flex;align-items:center;justify-content:center;font-size:1.6em}
    .rv-nm{font-size:.95em;font-weight:bold}.rv-ar{font-size:.78em;color:var(--mu)}
    .rv-br{width:100%;height:10px;background:var(--win);border:2px solid var(--bd)}.rv-br div{height:100%;background:var(--ac)}
    .rv-ch{width:100%;display:flex;justify-content:space-between;font-size:.78em;color:var(--mu)}
    .rv-bt{width:100%;padding:9px;background:var(--btn);color:var(--bt);border:2px solid var(--bd);font-weight:bold;cursor:pointer}
    .rv-lg{margin:0 8px 8px;background:#0e1a3d;color:#dce6ff;font-size:.78em;padding:6px 8px;min-height:52px;line-height:1.5;border:2px solid var(--bd)}
    .rv-back{display:block;margin:0 auto 10px;background:none;border:1px solid var(--bd);color:var(--ink);padding:6px 14px;cursor:pointer}
    .rv-bn{position:absolute;left:50%;top:36%;transform:translate(-50%,-50%);font-size:1.5em;font-weight:bold;opacity:0;pointer-events:none;white-space:nowrap}
    .rv-rg{position:absolute;left:50%;top:50%;width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;border:3px solid var(--ac);opacity:0;pointer-events:none}
    .rv-fl{position:absolute;inset:0;background:var(--ac);opacity:0;pointer-events:none}
    .rv-x{position:absolute;font-style:normal;font-size:3em;color:#d6283a;opacity:0}
    .rv-pt{position:absolute;left:50%;top:50%;width:6px;height:6px;animation:rvFly 1s ease-out forwards}
    .rv-sk.chg .rv-new{animation:rvShk .12s linear infinite}
    .rv.anim .rv-new{opacity:0}
    .rv.ok .rv-old{animation:rvOut .7s ease-in forwards}
    .rv.ok .rv-new{animation:rvIn .9s cubic-bezier(.2,1.4,.4,1) .35s both}
    .rv.ok .rv-rg{animation:rvRg 1s ease-out .3s}.rv.ok .rv-rg.b{animation-delay:.55s}
    .rv.ok .rv-fl{animation:rvFl .8s .3s}
    .rv.ok .rv-bn{color:var(--ac);animation:rvPop 1.4s .4s}
    .rv.bad .rv-fl{background:#d6283a;animation:rvFl .8s}
    .rv.bad .rv-new{filter:grayscale(.8);animation:rvShk .08s 6}
    .rv.bad .rv-x{animation:rvX 1.2s}
    .rv.bad .rv-bn{color:#d6283a;animation:rvPop 1.4s}
    @keyframes rvShk{0%,100%{transform:translate(0)}25%{transform:translate(-3px,1px)}50%{transform:translate(3px,-2px)}75%{transform:translate(-2px,2px)}}
    @keyframes rvOut{0%{transform:scale(1);opacity:1;filter:brightness(1)}100%{transform:scale(1.5);opacity:0;filter:brightness(3)}}
    @keyframes rvIn{0%{transform:scale(.2) rotate(-120deg);opacity:0;filter:brightness(3)}100%{transform:scale(1) rotate(0);opacity:1;filter:brightness(1)}}
    @keyframes rvRg{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(2.8)}}
    @keyframes rvFl{0%{opacity:0}15%{opacity:.55}100%{opacity:0}}
    @keyframes rvFly{to{transform:translate(var(--x),var(--y));opacity:0}}
    .rv-sl.clk{cursor:pointer}
    .rv-brk{filter:grayscale(.9) brightness(.7)}
    .rv-sk.broken:after{content:"";position:absolute;inset:8px;pointer-events:none;background:linear-gradient(135deg,transparent 47%,#d6283a 48%,#d6283a 52%,transparent 53%),linear-gradient(45deg,transparent 47%,#2a0a10 48%,#2a0a10 52%,transparent 53%)}
    .rv-bt.sec{background:var(--win);color:var(--ink)}
    @keyframes rvX{0%{opacity:0}20%,70%{opacity:1}100%{opacity:0}}
    @keyframes rvPop{0%{opacity:0;transform:translate(-50%,-30%) scale(.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-85%) scale(1)}}`;
    document.head.appendChild(s);
  })();

  window._runaLog = window._runaLog || [];
  function say(t) { window._runaLog.push(t); if (window._runaLog.length > 3) window._runaLog.shift(); }

  function burst(ok) {
    const host = document.getElementById('rv-sk'); if (!host) return;
    const cs = ok ? ['#ffd36b', '#ffffff', '#c9921a'] : ['#d6283a', '#6b7aa0'];
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span'); p.className = 'rv-pt';
      const a = Math.random() * 6.28, d = 36 + Math.random() * 50;
      p.style.setProperty('--x', Math.cos(a) * d + 'px');
      p.style.setProperty('--y', (ok ? Math.sin(a) * d : Math.abs(Math.sin(a)) * d + 16) + 'px');
      p.style.background = cs[i % cs.length];
      host.appendChild(p); setTimeout(() => p.remove(), 1100);
    }
  }

  function playFx(a) {
    const root = document.getElementById('rv-root'); if (!root) return;
    const bn = document.getElementById('rv-bn'); if (bn) bn.textContent = a.ok ? (a.reparo ? 'REPARADA' : 'SUCESSO') : (a.quebrou ? 'QUEBROU' : 'FALHOU');
    root.classList.add(a.ok ? 'ok' : 'bad');
    burst(a.ok);
    setTimeout(() => root.classList.remove('ok', 'bad', 'anim'), 2200);
  }

  window.storyNode_encantamentos = function () {
    const p = G.player;
    ensureRunaMateriais();
    const cur  = p._weaponEnchant || null;
    const qb   = p._runaQuebrada || null;
    const next = qb ? null : getNextEnchantTier(cur);
    const anim = window._runaAnim || null; window._runaAnim = null;

    const pal  = PALETAS[window.RUNA_PALETA] || PALETAS.pergaminho;
    const vars = Object.keys(pal).map(k => `--${k}:${pal[k]}`).join(';');

    let matsHTML = '', slotHTML, btnHTML;
    if (qb) {
      const eco = qtyOf(REP.eco.id), po = qtyOf(REP.po.id);
      const gDesce = ENCHANT_ORDER[Math.max(0, ENCHANT_ORDER.indexOf(qb) - REP.po.desce)];
      matsHTML = `
        <div class="rv-sl">Eco Cristalizado<small>${eco}/${REP.eco.qty}</small></div>
        <div class="rv-sl">Pó de Cristal<small>${po}/${REP.po.qty}</small></div>
        <div class="rv-sl">◈ Moedas<small>${REP.eco.gold} / ${p.gold}</small></div>`;
      btnHTML = `
        <button class="rv-bt" onclick="runaReparar('eco')">Restaurar Runa ${qb} · 1 Eco + ${REP.eco.gold}◈</button>
        <button class="rv-bt sec" onclick="runaReparar('po')">Consertar (volta ${gDesce}) · ${REP.po.qty} Pó</button>`;
    } else if (next) {
      const estoque = p.runasMateriais[next.id] || 0;
      const req = checkEnchantReq(next);
      matsHTML = `
        <div class="rv-sl ${estoque > 0 ? '' : 'on'}">◈ Moedas<small>${next.cost} / ${p.gold}</small></div>
        <div class="rv-sl ${estoque > 0 ? 'on' : ''}">Runa ${next.id} guardada<small>${estoque}/1 · grátis</small></div>
        <div class="rv-sl clk ${p._runaProtOn ? 'on' : ''}" onclick="runaProtToggle()">🛡 Pedra Esper ${p._runaProtOn ? 'ligada' : 'desligada'}<small>cargas ${p._runaProtCargas || 0} · pedras ${qtyOf(PROT_ID)}</small></div>`;
      if (!req.ok && !anim) say('⚠ ' + req.reason);
      btnHTML = `<button class="rv-bt" onclick="runaEvoluir('${next.id}')">Evoluir para ${next.id}</button>`;
    } else {
      matsHTML = `<div class="rv-sl">Sem próximo grau</div>`;
      btnHTML = `<button class="rv-bt" style="opacity:.6;cursor:default">Grau máximo</button>`;
    }
    const chance = next ? (CHANCE[next.id] || 100) : 100;
    const risco  = next && cur ? (BREAK[next.id] || 0) : 0;
    const chanceHTML = qb ? '<div class="rv-ch"><span>A runa está quebrada</span></div>' : `
      <div style="width:100%"><div class="rv-ch"><span>Chance de sucesso</span><span>${chance}%</span></div>
      <div class="rv-br"><div style="width:${chance}%"></div></div>
      <div class="rv-ch" style="margin-top:3px"><span>Risco de quebrar se falhar</span><span>${p._runaProtOn && (p._runaProtCargas || qtyOf(PROT_ID)) ? 'protegido' : risco + '%'}</span></div></div>`;
    const curId  = qb || cur || 'N';
    slotHTML = `
      <div class="rv-sk${qb ? ' broken' : ''}" id="rv-sk">
        ${anim && anim.ok ? rImg(anim.from || 'N', 'rv-old') : ''}
        ${rImg(curId, 'rv-new' + (qb ? ' rv-brk' : ''))}
        <span class="rv-rg"></span><span class="rv-rg b"></span><span class="rv-fl"></span><i class="rv-x">✖</i>
      </div>
      <span class="rv-bn" id="rv-bn"></span>`;

    openFerreiroOverlay('✨ EVOLUIR RUNA', `
      <div class="rv${anim && anim.ok ? ' anim' : ''}" id="rv-root" style="${vars}">
        <div class="rv-tb"><span>Gozen · Evoluir runa</span><span>${p.gold} ◈</span></div>
        <div class="rv-bd">
          <div class="rv-pn"><div class="rv-lb">Materiais</div>${matsHTML}</div>
          <div class="rv-pn rv-rt"><div class="rv-lb" style="align-self:flex-start">Runa</div>
            ${slotHTML}
            <div class="rv-nm">${qb ? 'Runa ' + qb + ' quebrada' : cur ? 'Runa ' + cur : 'Sem runa'}</div>
            <div class="rv-ar">${qb ? 'Repare pra voltar a usar' : next ? 'Próxima: Runa ' + next.id : 'Grau máximo'}</div>
            ${chanceHTML}
            ${btnHTML}
          </div>
        </div>
        <div class="rv-lg">${window._runaLog.join('<br>') || 'Gozen: escolha o material e encaixe a runa.'}</div>
      </div>
      <button class="rv-back" onclick="closeFerreiroOverlay();openGozenPopup()">↩ Voltar à ferraria</button>`);

    if (anim) setTimeout(() => playFx(anim), 30);
    setTimeout(() => applyWeaponEnchantVisual(cur), 100);
  };

  window.runaProtToggle = function () {
    const p = G.player;
    if (!p._runaProtOn && !(p._runaProtCargas > 0) && qtyOf(PROT_ID) < 1) { notify('Você não tem Pedra Esper.', 'red'); return; }
    p._runaProtOn = !p._runaProtOn;
    window.storyNode_encantamentos();
  };

  window.runaReparar = function (modo) {
    const p = G.player, r = REP[modo], qb = p._runaQuebrada;
    if (!r || !qb) return;
    if (qtyOf(r.id) < r.qty) { notify(`Faltam materiais: precisa de ${r.qty}× ${(ITEM_DB[r.id] && ITEM_DB[r.id].name) || r.id}.`, 'red'); return; }
    if (p.gold < r.gold) { notify('◈ Sem moedas suficientes!', 'red'); return; }
    takeItem(r.id, r.qty); p.gold -= r.gold;
    const novo = ENCHANT_ORDER[ENCHANT_ORDER.indexOf(qb) - r.desce] || null;
    p._runaQuebrada = null;
    if (novo) { p._weaponEnchant = novo; _enchantApplyToPlayer(p, getEnchantTier(novo)); }
    window._runaAnim = { ok: true, from: qb, to: novo, reparo: true };
    say(novo ? `Runa reparada: Runa ${novo} restaurada.` : 'Reparo concluído, mas a runa se desfez.');
    notify(novo ? `🔨 Runa ${novo} reparada!` : 'Reparo concluído.', 'gold');
    if (typeof addLog === 'function') addLog(`Reparou a runa quebrada (${qb} → ${novo || 'nenhuma'}).`, 'loot');
    updateHUD(); applyWeaponEnchantVisual(novo);
    window.storyNode_encantamentos();
  };

  window.runaEvoluir = function (id) {
    if (window._runaBusy) return;
    if (G.player._runaQuebrada) { notify('🔨 A runa está quebrada — repare antes de evoluir.', 'red'); return; }
    const p = G.player, tier = getEnchantTier(id);
    const next = getNextEnchantTier(p._weaponEnchant || null);
    if (!tier || !next || next.id !== id) { notify('⚠ A runa evolui em ordem — um grau por vez.', 'red'); return; }
    const req = checkEnchantReq(tier);
    if (!req.ok) { notify(`⚠ ${req.reason}`, 'red'); return; }
    ensureRunaMateriais();
    const estoque = (p.runasMateriais[id] || 0) > 0;
    if (!estoque && p.gold < tier.cost) { notify('◈ Sem moedas suficientes!', 'red'); return; }

    let protegida = false;
    if (p._runaProtOn) {
      if ((p._runaProtCargas || 0) <= 0 && qtyOf(PROT_ID) > 0) { takeItem(PROT_ID, 1); p._runaProtCargas = PROT_CARGAS; say(`Pedra Esper consumida: ${PROT_CARGAS} tentativas protegidas.`); }
      if ((p._runaProtCargas || 0) > 0) { p._runaProtCargas--; protegida = true; if (p._runaProtCargas <= 0) { p._runaProtOn = false; say('A Pedra Esper se desfez — ligue de novo pra usar outra.'); } }
    }
    window._runaBusy = true;
    const sk = document.getElementById('rv-sk'); if (sk) sk.classList.add('chg');
    say('Gozen martela a runa...');
    setTimeout(() => {
      window._runaBusy = false;
      const from = p._weaponEnchant || null;
      const ok = Math.random() * 100 < (CHANCE[id] || 100);
      window._runaAnim = { ok, from, to: id };
      if (ok) {
        say(`Sucesso! Runa ${id} forjada.`);
        enchantSelect(id);                 // paga, aplica bônus, conquistas e redesenha a tela
      } else {
        if (estoque) p.runasMateriais[id] -= 1; else p.gold -= tier.cost;
        const quebrou = !protegida && !!from && Math.random() * 100 < (BREAK[id] || 0);
        if (quebrou) {
          const tCur = getEnchantTier(from);
          if (tCur) _enchantRemoveFromPlayer(p, tCur);
          p._runaQuebrada = from; p._weaponEnchant = null;
          window._runaAnim = { ok: false, from, to: id, quebrou: true };
          say(`💥 A Runa ${from} QUEBROU! Repare pra voltar a usar.`);
          notify(`💥 A Runa ${from} quebrou!`, 'red');
          applyWeaponEnchantVisual(null);
        } else {
          say(`Falhou! O material se perdeu (${estoque ? 'runa guardada' : tier.cost + '◈'})${protegida ? ' — a Pedra Esper protegeu a runa.' : '.'}`);
          notify(`A evolução para ${tier.label} falhou — material perdido.`, 'red');
        }
        if (typeof addLog === 'function') addLog(`Falha ao evoluir a runa para ${tier.label}${quebrou ? ' — a runa quebrou' : ''}.`, 'dmg');
        updateHUD();
        window.storyNode_encantamentos();
      }
    }, 1200);
  };
})();
