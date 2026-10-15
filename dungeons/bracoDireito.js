// ══════════════════════════════════════════════════════════════
//  BRACODIREITO.JS — Chronicles of Clivor
//  Sistema "Braço Direito": a Hiroto luta em paralelo contra o filho
//  da Tsumugi (Kagerō) durante o boss da Masmorra 4.
//
//  Baseado na demo aprovada (Demo — Braço Direito, Hiroto em tempo real):
//   • A luta dela roda SOZINHA, em tempo real: 1 rodada a cada RODADA_MS,
//     sem esperar o turno do jogador.
//   • 100% aleatória (8 eventos). A Hiroto vence ~8 em cada 10 lutas.
//   • Mini-card "AO VIVO" no canto da batalha (toque = abre a aba da Hiroto,
//     "–" = minimiza em bolinha).
//   • Aba "🗡 Hiroto": HP/ATQ/DEF/Crít dela e do filho, status, log da luta e
//     3 ajudas (Curar / Fortalecer / Distrair). Ajudar GASTA o seu turno.
//   • Enquanto o filho estiver de pé, a Rainha não morre (terra_aranhas.js
//     consulta bloqueiaVitoria()).
//   • Se a Hiroto cair, o filho passa a atacar VOCÊ também a cada turno.
//   • Se a Hiroto vencer: a Rainha fica exposta e ela cobre você por 3
//     turnos (dano da Rainha × PROTECAO_MULT).
//
//  API (chamada pelo terra_aranhas.js):
//    bracoDireito.iniciar({ filho:{ nome } })  → começa a luta paralela
//    bracoDireito.pausar(true|false)           → congela (cenas/transição)
//    bracoDireito.protecaoMult()               → multiplicador do dano do boss
//    bracoDireito.fimTurnoBoss()               → chamado no fim de cada turno do boss
//    bracoDireito.bloqueiaVitoria()            → true = a Rainha não pode morrer
//    bracoDireito.encerrar()                   → limpa tudo (vitória/fuga/derrota)
//    bracoDireito.desbloquear()                → libera o sistema (G.bracoDireito)
//
//  Depende de (palDinh.js): G, battleState, applyDmgToPlayer, runEnemyTurn,
//    setBattleButtons, battleDelay, appendBattleLog, updateHUD, updateBattleHUD,
//    showFloatingNumber, notify.
//  Ordem de load no gat-1.html: depois do palDinh.js (pode ficar logo
//  depois do terra_aranhas.js).
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ───────────────────────── CONFIG (mexa só aqui) ─────────────────────────
  var C = {
    hiroto: { nome: 'Hiroto', icon: '🗡️', hp: 1700, atk: 150, def: 70, crit: 0.20, cm: 1.8 },
    filho:  { nome: 'Filho de Tsumugi', icon: '🕷️', hp: 2000, atk: 165, def: 65, crit: 0.15, cm: 1.8 },
    // pesos dos eventos da rodada da Hiroto
    ev: { golpe: 28, critico: 10, esquiva: 12, troca: 20, presa: 9, veneno: 7, furia: 6, skill: 10 },
    skillCd: 4,          // recarga do Itokiri (rodadas)
    acerto: 0.85,        // chance do filho acertar
    ajuda: { curar: 2, fortalecer: 2, distrair: 2 },   // recarga das ajudas (turnos)
    RODADA_MS: 3000,     // 1 rodada da Hiroto a cada 3 s
    PROTECAO_MULT: 0.75, // dano da Rainha depois que a Hiroto vence
    PROTECAO_TURNOS: 3,
    RETRATO: 'Imagens/personagens/CHiroto.png'
  };

  var R = Math.random;
  var S = null;          // estado da luta (não vai pro save)
  var _timer = null, _uiTimer = null;
  var MIN = false;       // mini-card minimizado?

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bs() { return (typeof battleState !== 'undefined') ? battleState : null; }   // 'let' no palDinh.js
  function emLuta() {
    var b = bs();
    return !!(S && S.ativo && typeof G !== 'undefined' && G && G.inBattle && b && !b._battleEnded &&
      b.enemyData && b.enemyData.id === 'tsumugi');
  }
  function logBat(txt, cor) { try { if (typeof appendBattleLog === 'function') appendBattleLog(txt, cor || '#e0a64a'); } catch (_) {} }

  // ───────────────────────── LÓGICA DA LUTA ─────────────────────────
  function dano(a, d, m) { return Math.max(1, Math.round(a * m * (100 / (100 + d)) * (0.9 + R() * 0.2))); }

  function novo(cfg) {
    var h = Object.assign({}, C.hiroto), f = Object.assign({}, C.filho);
    if (cfg && cfg.filho && cfg.filho.nome) f.nome = cfg.filho.nome;
    h.max = h.hp; f.max = f.hp;
    h.presa = 0; h.veneno = 0; h.buff = 0; h.cdS = 0;
    f.furia = 0; f.red = 0;
    S = { ativo: true, pausado: false, h: h, f: f, fim: null, cd: { curar: 0, fortalecer: 0, distrair: 0 },
          plog: [], tick: '', prot: 0, painel: false };
  }

  function pl(t) { S.plog.push(t); if (S.plog.length > 40) S.plog.shift(); }

  // Uma rodada da Hiroto. Devolve as linhas de texto.
  function rodada() {
    var h = S.h, f = S.f, L = [];
    if (h.veneno > 0) { var v = Math.round(h.max * 0.03); h.hp -= v; h.veneno--; L.push('☠ O veneno corrói a Hiroto: -' + v + '.'); }
    if (h.cdS > 0) h.cdS--;
    var atk = Math.round(h.atk * (1 + (h.buff > 0 ? 0.3 : 0))); if (h.buff > 0) h.buff--;
    var red = f.red > 0 ? 0.6 : 1; if (f.red > 0) f.red--;
    var fu = f.furia > 0 ? 1.5 : 1; if (f.furia > 0) f.furia--;
    function gH(m, fc) { var d = dano(atk, f.def, m), c = fc || R() < h.crit; if (c) d = Math.round(d * h.cm); f.hp -= d; return { d: d, c: c }; }
    function gF(m) { if (R() > C.acerto) return 0; var d = dano(f.atk, h.def, m * fu * red); if (R() < f.crit) d = Math.round(d * f.cm); h.hp -= d; return d; }
    var ev, g, d;
    if (h.presa > 0) {
      h.presa--; d = gF(1);
      L.push('🕸️ Presa na teia, a Hiroto não reage' + (d ? ': -' + d + '.' : '.'));
    } else {
      var w = Object.assign({}, C.ev); if (h.cdS > 0) delete w.skill;
      var t = 0, k; for (k in w) t += w[k];
      var r = R() * t; ev = 'golpe';
      for (k in w) { r -= w[k]; if (r <= 0) { ev = k; break; } }
      if (ev === 'golpe') { g = gH(1); L.push('⚔️ Golpe limpo da Hiroto: -' + g.d + (g.c ? ' (crítico!)' : '') + ' no filho.'); }
      else if (ev === 'critico') { g = gH(1, 1); L.push('💥 CRÍTICO da Hiroto: -' + g.d + ' no filho!'); }
      else if (ev === 'esquiva') { g = gH(0.9); L.push('💨 A Hiroto esquiva e contra-ataca: -' + g.d + ' no filho.'); }
      else if (ev === 'troca') { g = gH(1); d = gF(1); L.push('⚔️ Troca de golpes: -' + g.d + ' no filho' + (d ? ', -' + d + ' na Hiroto.' : '.')); }
      else if (ev === 'presa') { h.presa = 1; d = gF(1.1); L.push('🕸️ A Hiroto é presa numa teia' + (d ? ': -' + d + '.' : '.')); }
      else if (ev === 'veneno') { h.veneno = 3; d = gF(0.7); L.push('☠ A Hiroto é envenenada' + (d ? ': -' + d + '.' : '.')); }
      else if (ev === 'furia') { f.furia = 2; d = gF(1.2); L.push('😡 O filho enfurece! Dano dele sobe por 2 rodadas' + (d ? ' (-' + d + ').' : '.')); }
      else { h.cdS = C.skillCd; h.presa = 0; h.veneno = 0; f.furia = 0; g = gH(1.8); L.push('🗡️ ITOKIRI — Corte de Fios! Ela se livra de tudo e causa -' + g.d + ' no filho.'); }
    }
    if (f.hp <= 0) { f.hp = 0; S.fim = 'vit'; }
    else if (h.hp <= 0) { h.hp = 0; S.fim = 'cai'; }
    return L;
  }

  // Tempo real: 1 rodada a cada RODADA_MS enquanto a batalha com a Tsumugi estiver rolando
  function tempoReal() {
    if (!S || !S.ativo || S.pausado || S.fim || document.hidden) return;
    if (!emLuta()) return;
    var L = rodada();
    L.forEach(pl);
    S.tick = L[L.length - 1];
    logBat('🗡️ Hiroto: ' + S.tick, '#e0a64a');
    var c = $('bd-card');
    if (c) { c.classList.add('hit'); setTimeout(function () { var x = $('bd-card'); if (x) x.classList.remove('hit'); }, 450); }
    if (S.fim === 'vit') {
      pl('A Hiroto derrubou o filho!'); S.tick = 'A Hiroto derrubou o filho!';
      S.prot = C.PROTECAO_TURNOS;
      logBat('🗡️ A HIROTO DERRUBOU O FILHO! A Rainha está exposta — ataque! (dano da Rainha −25% por ' + C.PROTECAO_TURNOS + ' turnos)', '#7be07b');
      try { if (typeof notify === 'function') notify('🗡️ A Hiroto derrubou o filho! Agora a Rainha está exposta.', 'gold'); } catch (_) {}
    } else if (S.fim === 'cai') {
      pl('A Hiroto caiu! O filho vem pra cima de você.'); S.tick = 'A Hiroto caiu!';
      logBat('🗡️ A Hiroto caiu! O filho vem pra cima de você!', '#ff5a40');
      try { if (typeof notify === 'function') notify('💀 A Hiroto caiu! O filho vem atrás de você.', 'red'); } catch (_) {}
    }
    ui();
  }

  // ───────────────────────── AJUDA (gasta o turno do jogador) ─────────────────────────
  function podeAjudar(t) {
    var b = bs();
    return !!(S && S.ativo && !S.pausado && !S.fim && S.cd[t] === 0 && emLuta() && b.phase === 'player');
  }

  function ajudar(t) {
    if (!podeAjudar(t)) return;
    var b = bs(), p = G.player, e = b.enemyData;
    if (t === 'curar') {
      var q = Math.round(S.h.max * 0.25); S.h.hp = Math.min(S.h.max, S.h.hp + q);
      logBat('🤝 Você cura a Hiroto: +' + q + ' HP.', '#8fe3a0'); pl('Você curou a Hiroto: +' + q + '.');
    } else if (t === 'fortalecer') {
      S.h.buff = 3;
      logBat('🤝 Você fortalece a Hiroto: ATQ +30% por 3 rodadas.', '#8fe3a0'); pl('Você fortaleceu a Hiroto (ATQ +30%).');
    } else if (t === 'distrair') {
      S.f.red = 2;
      logBat('🤝 Você distrai o filho: dano dele −40% por 2 rodadas.', '#8fe3a0'); pl('Você distraiu o filho (dano −40%).');
    }
    S.cd[t] = C.ajuda[t] + 1;
    // gasta o turno: passa a vez pro boss (mesmo caminho de "esperar" do motor)
    try { if (typeof fecharBattleItemMenu === 'function') fecharBattleItemMenu(); } catch (_) {}
    b.defending = false;
    b.phase = 'resolving';
    if (typeof setBattleButtons === 'function') setBattleButtons(false);
    b.turnCount = (b.turnCount || 1) + 1;
    var dl = (typeof battleDelay === 'function') ? battleDelay(650) : 650;
    setTimeout(function () { if (G.inBattle && !b._battleEnded && typeof runEnemyTurn === 'function') runEnemyTurn(b, p, e, false); }, dl);
    ui();
  }

  // ───────────────────────── INTERFACE ─────────────────────────
  function pct(a, b) { return Math.max(0, Math.min(100, a / b * 100)); }

  function injetaCss() {
    if ($('bd-css')) return;
    var st = document.createElement('style'); st.id = 'bd-css';
    st.textContent =
      '#bd-card{position:fixed;left:8px;top:calc(env(safe-area-inset-top,0px) + 8px);width:140px;padding:7px 9px;border-radius:10px;' +
      'background:rgba(11,15,29,.92);border:1px solid #e0b24a;cursor:pointer;font:.7rem/1.35 "Noto Serif JP",serif;color:#e9e4d6;z-index:9500;' +
      'transition:box-shadow .3s;display:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
      '#bd-card.on{display:block}#bd-card.min.on{display:flex}' +
      '#bd-card .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}' +
      '#bd-card .t{font-size:.58rem;color:#e0b24a;letter-spacing:.1em}' +
      '#bd-card .mn{background:none;border:1px solid #6d5522;color:#e0b24a;border-radius:6px;width:22px;height:20px;line-height:15px;padding:0;cursor:pointer}' +
      '#bd-card .tk{margin-top:4px;font-size:.62rem;color:#d8cbb0;min-height:26px}' +
      '#bd-card.min{width:46px;height:46px;padding:0;border-radius:50%;flex-direction:column;align-items:center;justify-content:center;gap:2px}' +
      '#bd-card.min .ic{font-size:17px;line-height:1}' +
      '#bd-card.min .mb{width:28px;height:3px;border-radius:2px;background:rgba(0,0,0,.65);overflow:hidden}' +
      '#bd-card.min .mb i{display:block;height:100%}' +
      '#bd-card.hit{box-shadow:0 0 12px rgba(224,166,74,.7)}' +
      '#bd-card .live{display:inline-block;width:6px;height:6px;border-radius:50%;background:#5fd88a;margin-right:4px;animation:bdLv 1.2s infinite}' +
      '@keyframes bdLv{50%{opacity:.25}}' +
      '#bd-card .r{display:flex;justify-content:space-between}' +
      '.bd-bar{height:6px;border-radius:5px;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.08);overflow:hidden;margin:1px 0 4px}' +
      '.bd-bar i{display:block;height:100%;transition:width .4s}' +
      '#bd-panel{position:fixed;inset:0;z-index:9600;display:none;flex-direction:column;box-sizing:border-box;' +
      'padding:calc(10px + env(safe-area-inset-top,0px)) 12px calc(12px + env(safe-area-inset-bottom,0px));' +
      'background:radial-gradient(ellipse at 50% 10%,#241709,#08060b 80%);color:#e9e4d6;font:14px/1.4 "Noto Serif JP",serif}' +
      '#bd-panel.on{display:flex}' +
      '#bd-panel .tabs{display:flex;gap:8px;margin-bottom:10px}' +
      '#bd-panel .tabs button{flex:1;padding:10px;border-radius:8px;border:1px solid #6d5522;background:#1d1409;color:#e9e4d6;font:inherit;font-size:.85rem;cursor:pointer}' +
      '#bd-panel .tabs .sel{background:#6d5522;color:#fff}' +
      '#bd-panel .blk{background:rgba(255,255,255,.04);border:1px solid rgba(217,176,112,.27);border-radius:10px;padding:8px 10px;margin-bottom:8px}' +
      '#bd-panel .nm{display:flex;justify-content:space-between;align-items:center;font-size:.85rem;color:#e0b24a}' +
      '#bd-panel .nm img{width:30px;height:40px;object-fit:cover;border-radius:4px;margin-right:8px;border:1px solid #6d5522}' +
      '#bd-panel .nm .l{display:flex;align-items:center}' +
      '#bd-panel .st{font-size:.68rem;color:#b9a888;margin-top:3px}' +
      '#bd-panel .chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;min-height:18px}' +
      '#bd-panel .chip{font-size:.64rem;padding:1px 7px;border-radius:8px;background:rgba(255,255,255,.11)}' +
      '#bd-plog{flex:1;min-height:70px;overflow-y:auto;font-size:.74rem;line-height:1.5;color:#d8cbb0;background:rgba(0,0,0,.4);border-radius:8px;padding:6px 8px;margin-bottom:8px}' +
      '#bd-help{display:flex;gap:6px}' +
      '#bd-help button{flex:1;padding:11px 4px;border-radius:8px;border:1px solid #6d5522;background:#1d1409;color:#e9e4d6;font:inherit;font-size:.76rem;cursor:pointer}' +
      '#bd-help button:disabled{opacity:.4;cursor:default}' +
      '#bd-panel .dica{font-size:.66rem;color:#9a8a68;text-align:center;margin:5px 0 0}' +
      '@media (prefers-reduced-motion:reduce){#bd-card .live{animation:none}.bd-bar i{transition:none}}';
    document.head.appendChild(st);
  }

  function montaDom() {
    injetaCss();
    if (!$('bd-card')) {
      var c = document.createElement('div');
      c.id = 'bd-card'; c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.setAttribute('aria-label', 'Abrir luta da Hiroto');
      c.addEventListener('click', function () { if (MIN) { MIN = false; ui(); } else abrir(true); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter') c.click(); });
      document.body.appendChild(c);
    }
    if (!$('bd-panel')) {
      var p = document.createElement('div');
      p.id = 'bd-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Luta da Hiroto');
      p.innerHTML =
        '<div class="tabs"><button type="button" id="bd-tbat">⚔ BATALHA</button><button type="button" class="sel">🗡 HIROTO</button></div>' +
        '<div class="blk" id="bd-bh"></div><div class="blk" id="bd-bf"></div><div id="bd-plog"></div>' +
        '<div id="bd-help"><button type="button" data-a="curar">💚 Curar</button><button type="button" data-a="fortalecer">⚡ Fortalecer</button><button type="button" data-a="distrair">🎯 Distrair</button></div>' +
        '<p class="dica">Ajudar gasta o seu turno. A luta do chefe continua.</p>';
      document.body.appendChild(p);
      $('bd-tbat').addEventListener('click', function () { abrir(false); });
      Array.prototype.forEach.call($('bd-help').children, function (b) {
        b.addEventListener('click', function () { ajudar(b.getAttribute('data-a')); });
      });
    }
  }

  function blk(c, cor, chips, retrato) {
    return '<div class="nm"><span class="l">' + (retrato ? '<img src="' + retrato + '" alt="" onerror="this.style.display=\'none\'">' : '') + c.icon + ' ' + esc(c.nome) + '</span>' +
      '<span>' + Math.max(0, c.hp) + ' / ' + c.max + '</span></div>' +
      '<div class="bd-bar" style="height:10px"><i style="width:' + pct(c.hp, c.max) + '%;background:' + cor + '"></i></div>' +
      '<div class="st">ATQ ' + c.atk + ' · DEF ' + c.def + ' · Crít ' + Math.round(c.crit * 100) + '% (x' + c.cm + ')</div>' +
      '<div class="chips">' + chips.map(function (x) { return '<span class="chip">' + x + '</span>'; }).join('') + '</div>';
  }

  function painel() {
    if (!S) return;
    var h = S.h, f = S.f, a = [], b = [];
    if (h.presa > 0) a.push('🕸️ Presa');
    if (h.veneno > 0) a.push('☠ Envenenada (' + h.veneno + ')');
    if (h.buff > 0) a.push('⚡ ATQ+30% (' + h.buff + ')');
    if (h.cdS > 0) a.push('Itokiri: ' + h.cdS);
    if (S.fim === 'cai') a.push('💀 Caída');
    if (f.furia > 0) b.push('😡 Enfurecido (' + f.furia + ')');
    if (f.red > 0) b.push('🎯 Distraído (' + f.red + ')');
    if (S.fim === 'vit') b.push('💀 Derrubado');
    $('bd-bh').innerHTML = blk(h, '#e0a64a', a, C.RETRATO);
    $('bd-bf').innerHTML = blk(f, '#8a5ad0', b, '');
    var pl_ = $('bd-plog');
    pl_.innerHTML = S.plog.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('');
    pl_.scrollTop = 1e9;
    var rot = { curar: '💚 Curar', fortalecer: '⚡ Fortalecer', distrair: '🎯 Distrair' };
    Array.prototype.forEach.call($('bd-help').children, function (x) {
      var t = x.getAttribute('data-a');
      x.disabled = !podeAjudar(t);
      x.textContent = S.cd[t] > 0 ? rot[t] + ' (' + S.cd[t] + ')' : rot[t];
    });
  }

  function ui() {
    if (!S) return;
    var cd = $('bd-card'), pn = $('bd-panel');
    if (!cd || !pn) return;
    var vis = emLuta();
    cd.classList.toggle('on', vis);
    if (!vis) { pn.classList.remove('on'); return; }
    var h = S.h, f = S.f;
    cd.classList.toggle('min', MIN);
    if (MIN) {
      cd.innerHTML = '<div class="ic">🗡️</div><div class="mb"><i style="width:' + pct(h.hp, h.max) + '%;background:#e0a64a"></i></div><div class="mb"><i style="width:' + pct(f.hp, f.max) + '%;background:#8a5ad0"></i></div>';
    } else {
      cd.innerHTML =
        '<div class="top"><span class="t"><span class="live"></span>AO VIVO</span><button type="button" class="mn" title="Minimizar" id="bd-mn">–</button></div>' +
        '<div class="r"><span>Hiroto</span><span>' + Math.max(0, h.hp) + '</span></div><div class="bd-bar"><i style="width:' + pct(h.hp, h.max) + '%;background:#e0a64a"></i></div>' +
        '<div class="r"><span>' + esc(String(f.nome).split(' ')[0] === 'Filho' ? 'Filho' : f.nome) + '</span><span>' + Math.max(0, f.hp) + '</span></div><div class="bd-bar"><i style="width:' + pct(f.hp, f.max) + '%;background:#8a5ad0"></i></div>' +
        '<div class="tk">' + esc(S.tick) + '</div>';
      var mn = $('bd-mn');
      if (mn) mn.addEventListener('click', function (ev) { ev.stopPropagation(); MIN = true; ui(); });
    }
    if (pn.classList.contains('on')) painel();
  }

  function abrir(v) {
    var pn = $('bd-panel'); if (!pn) return;
    pn.classList.toggle('on', !!v);
    if (v) painel();
  }

  // ───────────────────────── API ─────────────────────────
  function limparTimers() {
    if (_timer) { clearInterval(_timer); _timer = null; }
    if (_uiTimer) { clearInterval(_uiTimer); _uiTimer = null; }
  }

  function iniciar(cfg) {
    limparTimers();
    novo(cfg);
    MIN = false;
    montaDom();
    pl('A Hiroto parte pra cima do ' + S.f.nome + '.');
    S.tick = 'A Hiroto parte pra cima!';
    _timer = setInterval(tempoReal, C.RODADA_MS);
    _uiTimer = setInterval(ui, 500);   // mantém card/aba em dia (fase do turno, recargas, visibilidade)
    ui();
  }

  function encerrar() {
    limparTimers();
    if (S) S.ativo = false;
    var cd = $('bd-card'), pn = $('bd-panel');
    if (cd) cd.remove();
    if (pn) pn.remove();
    S = null;
  }

  function pausar(v) { if (S) S.pausado = !!v; }

  function protecaoMult() { return (S && S.ativo && S.prot > 0) ? C.PROTECAO_MULT : 1; }

  function bloqueiaVitoria() { return !!(S && S.ativo && S.fim !== 'vit'); }

  // Fim de cada turno do boss: recargas das ajudas, proteção e (se a Hiroto caiu) ataque do filho em você
  function fimTurnoBoss() {
    if (!S || !S.ativo) return;
    for (var k in S.cd) if (S.cd[k] > 0) S.cd[k]--;
    if (S.prot > 0) S.prot--;
    if (S.fim === 'cai') {
      var b = bs(), p = (typeof G !== 'undefined' && G) ? G.player : null;
      if (b && p && p.hp > 0) {
        var d = dano(S.f.atk, p.def || 0, 1);
        try { if (typeof applyDmgToPlayer === 'function') applyDmgToPlayer(d, b, p); else p.hp = Math.max(0, p.hp - d); } catch (_) { p.hp = Math.max(0, p.hp - d); }
        pl('O filho ataca você: -' + d + '.');
        logBat('🕷️ ' + S.f.nome + ' avança sobre você: -' + d + ' HP!', '#ff6a40');
        try { if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', d, 'dmg'); } catch (_) {}
        try { if (typeof flashDamage === 'function') flashDamage('hero'); } catch (_) {}
      }
    }
    ui();
  }

  function desbloquear() {
    try {
      if (typeof G === 'undefined' || !G) return;
      if (!G.bracoDireito) G.bracoDireito = {};
      G.bracoDireito.desbloqueado = true;
    } catch (_) {}
  }

  window.bracoDireito = {
    iniciar: iniciar, encerrar: encerrar, pausar: pausar,
    protecaoMult: protecaoMult, fimTurnoBoss: fimTurnoBoss,
    bloqueiaVitoria: bloqueiaVitoria, desbloquear: desbloquear,
    desbloqueado: function () { return !!(typeof G !== 'undefined' && G && G.bracoDireito && G.bracoDireito.desbloqueado); },
    CONFIG: C,
    // teste headless (sem DOM): taxa de vitória da Hiroto em n lutas
    _simular: function (n) {
      var v = 0, rod = 0;
      for (var i = 0; i < n; i++) {
        novo(null); var g = 0;
        while (!S.fim && g++ < 500) { rodada(); rod++; }
        if (S.fim === 'vit') v++;
      }
      S = null;
      return { vitorias: v, de: n, taxa: v / n, rodadasMedias: rod / n };
    }
  };
})();
