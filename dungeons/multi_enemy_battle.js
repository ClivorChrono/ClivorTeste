// =============================================================
//  MULTI_ENEMY_BATTLE.JS — Chronicles of Clivor
//  Motor genérico de batalha contra um GRUPO de inimigos ao
//  mesmo tempo (ex: 3× Onibi das Cinzas), cada um com HP/ATK/DEF
//  próprios e card individual — SEM modificar palDinh.js.
//
//  COMO FUNCIONA (resumo):
//  O motor de batalha original (palDinh.js) só entende "um
//  inimigo por vez" (battleState.enemyData / battleState.enemyHp).
//  Em vez de reescrever esse motor, este arquivo "engata" nele:
//
//   1) Escolhe um membro do grupo como ALVO ATIVO e o disfarça
//      de inimigo normal (battleState.enemyData/enemyHp/enemyMaxHp
//      apontam pra esse membro). O jogador ataca normalmente —
//      todo o cálculo de dano do jogo já funciona sem alterações.
//
//   2) Sobrescreve (monkey-patch) 3 funções globais do palDinh.js:
//        • updateBattleHUD  → depois de atualizar a barra normal,
//          sincroniza o HP do membro ativo e redesenha os cards.
//        • runEnemyTurn     → em vez da IA de 1 inimigo só, chama
//          o turnHandler do grupo (fornecido pela masmorra), que
//          faz cada Onibi vivo agir em sequência.
//        • endBattle        → quando o alvo ativo morre (won=true),
//          NÃO encerra a luta: troca pro próximo membro vivo e
//          devolve o turno ao jogador. Só chama o endBattle REAL
//          quando o grupo inteiro está morto (ou o jogador perde/
//          foge), somando XP/ouro/loot de todos os membros.
//
//  Isso é 100% aditivo: se não houver batalha em grupo ativa
//  (G._multiBattle == null), tudo se comporta exatamente como
//  antes — batalhas normais (1 inimigo) não são afetadas.
//
//  USO (chamado pela masmorra, ex: inazami_dungeon.js):
//
//    startMultiEnemyBattle({
//      groupId:   'onibi_cinzas_trio',
//      groupName: '3× Onibi das Cinzas',
//      icon:      '🔥',
//      elemento:  'fogo',
//      isBoss:    false,
//      desc:      '...',
//      xp: 500, gold: 120, loot: [ ... ],
//      members: [
//        { id:'onibi_1', name:'Onibi Errante', img:'...', hp:220, atk:42, def:12, spd:40, elemento:'fogo' },
//        ...
//      ],
//      // turnHandler(bs, p, aliveMembers, done) — roda o turno dos
//      // inimigos vivos e chama done() ao terminar.
//      turnHandler:   minhaFuncaoDeTurno,
//      // onMemberDeath(bs, p, deadMember, aliveLeft) — opcional,
//      // dispara quando UM membro específico morre (ex: explosão).
//      onMemberDeath: minhaFuncaoDeMorte,
//    });
//
//  Depende de: palDinh.js já carregado antes deste arquivo.
// =============================================================

'use strict';

(function () {

  // ── Espera palDinh.js estar pronto antes de fazer os patches ──
  function _mebBoot() {
    if (typeof window.startBattle !== 'function' ||
        typeof window.endBattle !== 'function' ||
        typeof window.updateBattleHUD !== 'function' ||
        typeof window.runEnemyTurn !== 'function') {
      setTimeout(_mebBoot, 150);
      return;
    }
    _mebInstall();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mebBoot);
  } else {
    _mebBoot();
  }

  // Ícones/nomes de elemento (mesma tabela usada em startBattle, duplicada
  // aqui de propósito pra não depender de nada interno do palDinh.js)
  const _MEB_ELEM_ICONS = { fogo:'🔥', agua:'💧', eletrico:'⚡', gelo:'❄️', planta:'🌿', terra:'🪨',
    energia:'✨', magia_negra:'🌑', vento:'🌪️', caos:'🌀', veneno:'☠️', luz:'☀️', sombra:'👤', cristal:'💎' };
  const _MEB_ELEM_NOMES  = { fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta',
    terra:'Terra', energia:'Energia', magia_negra:'Magia Negra', vento:'Vento', caos:'Caos',
    veneno:'Veneno', luz:'Luz', sombra:'Sombra', cristal:'Cristal' };

  // Campos de status "do inimigo" no battleState que precisam trocar de
  // dono quando o alvo ativo muda (senão um Onibi "herda" o veneno/
  // atordoamento/enraivecimento de outro só por virar o alvo).
  const _MEB_STATUS_KEYS = [
    'enemyPoisoned', 'enemyPoisonTurns',
    'enemyBurning',  'enemyBurnTurns',
    'enemySlowed',   'enemySlowTurns',
    'enemyStunned',  'enemyStunTurns',
    'enemyBleeding', 'enemyBleedTurns',
    'enemyEnraged',  'enemyTurnAI',
    '_enemy_cursed', '_enemy_cursed_turns',
  ];

  function _mebSaveStatus(m) {
    if (!m) return;
    m._status = m._status || {};
    _MEB_STATUS_KEYS.forEach(k => { m._status[k] = battleState[k]; });
  }
  function _mebLoadStatus(m) {
    const st = (m && m._status) || {};
    _MEB_STATUS_KEYS.forEach(k => {
      battleState[k] = st.hasOwnProperty(k) ? st[k]
        : (k === 'enemyEnraged' ? false : (k.indexOf('Turns') >= 0 || k === 'enemyTurnAI') ? 0 : false);
    });
  }

  // ── Cria a cópia "disfarçada de inimigo normal" de um membro ──
  function _mebSyntheticEnemy(m) {
    return {
      id: m.id, name: m.name, icon: m.icon, img: m.img, sprite: m.sprite,
      hp: m.hp, maxHp: m.maxHp, atk: m.atk, def: m.def, spd: m.spd,
      elemento: m.elemento, isBoss: false, desc: '', xp: 0, gold: 0, loot: [],
      critChance: m.critChance, critMult: m.critMult,
      tintFilter: m.tintFilter,
    };
  }

  // ── Atualiza só a "identidade visual" do card grande (nome/arte/badge),
  //    com uma animação de troca. Usado tanto pra troca real de alvo quanto
  //    pra "prévia" de quem está atacando durante o turno inimigo — por
  //    isso NÃO mexe em battleState aqui, só no que é puramente visual.
  function _mebFlashBigIdentity(m) {
    const nameEl = document.getElementById('bat-enemy-name');
    if (nameEl) {
      nameEl.classList.remove('meb-big-swap');
      void nameEl.offsetWidth;
      nameEl.textContent = m.name;
      nameEl.classList.add('meb-big-swap');
    }

    const batIcon = document.getElementById('bat-enemy-icon');
    if (batIcon && typeof buildEnemyVisual === 'function') {
      batIcon.classList.remove('meb-big-swap');
      void batIcon.offsetWidth;
      batIcon.innerHTML = buildEnemyVisual(_mebSyntheticEnemy(m), 112, 'idle');
      batIcon.style.display = 'flex';
      batIcon.style.alignItems = 'center';
      batIcon.style.justifyContent = 'center';
      batIcon.style.background = 'transparent';
      batIcon.style.border = 'none';
      batIcon.classList.add('meb-big-swap');
    }

    const elemBadge = document.getElementById('bat-enemy-elem-badge');
    if (elemBadge) {
      const el = m.elemento;
      if (el && el !== 'neutro') {
        elemBadge.textContent = `${_MEB_ELEM_ICONS[el] || ''} ${_MEB_ELEM_NOMES[el] || el}`;
        elemBadge.style.display = 'inline-block';
      } else {
        elemBadge.textContent = '';
        elemBadge.style.display = 'none';
      }
    }
  }

  // ── Troca o alvo ativo (o membro que recebe os ataques do jogador) ──
  function _mebSetActive(id) {
    const mb = G._multiBattle;
    if (!mb) return;
    const newM = mb.members.find(x => x.id === id);
    if (!newM) return;

    // Salva o progresso/estado do membro que estava ativo antes de trocar
    const oldM = mb.members.find(x => x.id === mb.activeId);
    if (oldM && battleState.enemyData) {
      oldM.hp  = Math.max(0, battleState.enemyHp);
      oldM.def = battleState.enemyData.def;
      oldM.atk = battleState.enemyData.atk;
      _mebSaveStatus(oldM);
    }

    mb.activeId = id;
    battleState.enemyData   = _mebSyntheticEnemy(newM);
    battleState.enemyHp     = newM.hp;
    battleState.enemyMaxHp  = newM.maxHp;
    _mebLoadStatus(newM);

    _mebFlashBigIdentity(newM);

    if (typeof updateBattleHUD === 'function') updateBattleHUD();
    _mebRenderRow(); _mebRenderQueuePanel();
  }

  // Clique no card de um Onibi vivo → vira o novo alvo do jogador
  window.mebSelectTarget = function (id) {
    const mb = G._multiBattle;
    if (!mb || !mb.active) return;
    if (battleState.phase !== 'player') return; // não pode trocar em pleno turno inimigo/resolução
    const m = mb.members.find(x => x.id === id);
    if (!m || !m.alive || id === mb.activeId) return;
    _mebSetActive(id);
    // Dá o mesmo "pulo" visual usado no turno inimigo, só que na troca de
    // alvo do jogador — garante que a troca de card sempre seja animada.
    window.mebAnimateActing(id);
    if (typeof appendBattleLog === 'function') {
      appendBattleLog(`🎯 Você mira em ${m.name}!`, '#e8c060');
    }
  };

  // Anima o "pulo pra frente" do card de quem está agindo (chamado pelo
  // turnHandler da masmorra, um por membro/ação) — e também mostra esse
  // membro no CARD GRANDE por um instante, pra ficar claro visualmente
  // "quem está batendo agora", mesmo que não seja o alvo que o jogador
  // escolheu atacar. Ao final, volta a mostrar o alvo real.
  window.mebAnimateActing = function (id) {
    const mb = G._multiBattle;
    const row = document.getElementById('bat-multi-enemy-row');
    if (row) {
      row.querySelectorAll('.meb-card').forEach(c => c.classList.remove('meb-acting'));
      const card = row.querySelector(`[data-meb-id="${id}"]`);
      if (card) {
        // força reflow pra reiniciar a animação mesmo se já tinha a classe
        void card.offsetWidth;
        card.classList.add('meb-acting');
        setTimeout(() => card.classList.remove('meb-acting'), 900);
      }
    }

    if (!mb) return;
    const acting = mb.members.find(x => x.id === id);
    if (!acting) return;

    _mebFlashBigIdentity(acting);

    // Se quem agiu não é o alvo real do jogador, volta a mostrar o alvo
    // real depois que o destaque passar.
    if (id !== mb.activeId) {
      setTimeout(() => {
        const real = mb.members.find(x => x.id === mb.activeId);
        if (real && G._multiBattle === mb) _mebFlashBigIdentity(real);
      }, 900);
    }
  };

  // ── Desenha a "mão de cartas" com os N inimigos do grupo ──
  //
  // IMPORTANTE: isto atualiza os cards que já existem no DOM em vez de
  // destruir tudo com innerHTML a cada chamada. Antes, cada updateBattleHUD
  // recriava os nós do zero — e como o navegador não tem "estado anterior"
  // pra animar quando o elemento é recriado, a transição de troca de alvo
  // (transform/box-shadow no CSS) nunca aparecia. Mantendo os mesmos nós
  // e só trocando as classes/conteúdo, o CSS anima normalmente.
  function _mebRenderRow() {
    const row = document.getElementById('bat-multi-enemy-row');
    if (!row) return;
    const mb = G._multiBattle;
    if (!mb || !mb.active) {
      row.style.display = 'none';
      row.innerHTML = '';
      return;
    }
    row.style.display = 'flex';
    row.classList.toggle('meb-many', mb.members.length >= 5);

    mb.members.forEach((m) => {
      const isActive = m.id === mb.activeId;
      const hp    = isActive ? Math.max(0, battleState.enemyHp)    : m.hp;
      const maxHp = isActive ? Math.max(1, battleState.enemyMaxHp) : Math.max(1, m.maxHp);
      const pct   = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      const isDying = m._dyingUntil && Date.now() < m._dyingUntil;
      const cls   = 'meb-card'
        + (isActive && m.alive ? ' meb-active' : '')
        + (!m.alive ? ' meb-dead' : '')
        + (isDying ? ' meb-dying' : '');

      let card = row.querySelector(`[data-meb-id="${m.id}"]`);
      if (!card) {
        // Cria o card só na primeira vez — depois disso ele nunca mais
        // é removido/recriado enquanto a batalha em grupo durar.
        card = document.createElement('div');
        card.dataset.mebId = m.id;
        card.innerHTML = `
          <div class="meb-card-portrait"></div>
          <div class="meb-card-name"></div>
          <div class="meb-card-hpbar"><div class="meb-card-hpfill"></div></div>
          <div class="meb-card-hptxt"></div>`;
        row.appendChild(card);
      }

      card.className = cls;
      card.onclick = m.alive ? () => window.mebSelectTarget(m.id) : null;

      const portrait = card.querySelector('.meb-card-portrait');
      if (portrait && !portrait.dataset.filled) {
        portrait.innerHTML = m.img
          ? `<img src="${m.img}" alt="${m.name}" draggable="false" onerror="this.style.display='none'">`
          : `<span style="font-size:1.5rem;">${m.icon || '👹'}</span>`;
        portrait.dataset.filled = '1';
      }
      card.querySelector('.meb-card-name').textContent = m.name;
      card.querySelector('.meb-card-hpfill').style.width = pct + '%';
      card.querySelector('.meb-card-hptxt').textContent =
        m.alive ? `${Math.max(0, Math.round(hp))}/${Math.round(maxHp)}` : '💀';
    });

    // ── Reordena: vivos primeiro (na ordem original), mortos vão pro
    //    final da fila (na ordem em que morreram). Usa a técnica FLIP
    //    pra animar o "deslize" em vez de simplesmente pular de posição.
    const desired = [...mb.members].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      if (!a.alive && !b.alive) return (a.deathSeq || 0) - (b.deathSeq || 0);
      return 0;
    });
    const cards = desired
      .map(m => row.querySelector(`[data-meb-id="${m.id}"]`))
      .filter(Boolean);

    const before = new Map();
    cards.forEach(c => before.set(c, c.getBoundingClientRect()));

    cards.forEach(c => row.appendChild(c)); // aplica a nova ordem no DOM

    cards.forEach(c => {
      const b = before.get(c);
      const a = c.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (dx || dy) {
        // Leve rotação no meio do trajeto — em vez de um slide reto, o
        // card "sai" da pilha, gira de leve e reencaixa, como se fosse
        // puxado e reinserido num baralho.
        const tilt = dx > 0 ? -7 : 7;
        c.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) rotate(0deg)` },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 5}px) rotate(${tilt}deg)`, offset: 0.55 },
            { transform: 'translate(0,0) rotate(0deg)' },
          ],
          { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }
        );
      }
    });
  }

  // ── CSS da "mão de cartas" (injetado uma única vez) ──
  function _mebInjectCSS() {
    if (document.getElementById('meb-css')) return;
    const st = document.createElement('style');
    st.id = 'meb-css';
    st.textContent = `
      /* A fileira de cards não é o único culpado do "arrastar pro lado" —
         a PÁGINA inteira estava rolando horizontalmente quando a fileira
         encostava na borda da tela. Trava o scroll horizontal do app
         inteiro (mantém o scroll vertical normal). */
      html, body {
        overflow-x: hidden !important;
        touch-action: pan-y !important;
        max-width: 100vw;
      }
      /* Pilha lateral: ancorada no canto superior direito da arena
         (.battle-arena tem position:relative), sobrepondo o lado do
         inimigo em vez de ocupar uma faixa embaixo. */
      #bat-multi-enemy-row {
        display: none;
        flex-direction: column;
        align-items: flex-end;
        gap: 0;
        position: absolute;
        top: 4px;
        right: max(3px, env(safe-area-inset-right, 0px));   /* inteira dentro da tela, sem corte na borda */
        z-index: 5;
        max-height: calc(100% - 20px);
        overflow: visible;
        touch-action: none;    /* bloqueia o gesto de arrastar/swipe */
        -webkit-user-select: none;
        user-select: none;
        perspective: 400px;    /* dá profundidade ao "flip" de troca de card */
      }
      .meb-card {
        position: relative;
        width: 56px;
        flex-shrink: 0;
        cursor: pointer;
        margin-top: -12px;     /* pilha vertical bem fechada — só uma "lasca" aparece */
        transition: transform 0.35s cubic-bezier(.34,1.56,.64,1),
                    box-shadow 0.3s ease, filter 0.3s ease, opacity 0.3s ease;
        background: linear-gradient(180deg, rgba(24,16,8,0.94), rgba(8,5,3,0.97));
        border: 1.5px solid rgba(200,150,10,0.32);
        border-radius: 8px;
        padding: 4px 3px 5px;
        text-align: center;
        box-shadow: -3px 3px 8px rgba(0,0,0,0.65);
        touch-action: none;
        -webkit-user-drag: none;
        transform: none;   /* em repouso fica totalmente visível */
      }
      .meb-card:first-child { margin-top: 0; }
      .meb-card.meb-active {
        border-color: #ffcc40;
        box-shadow: 0 0 14px rgba(255,180,40,0.75), -4px 4px 10px rgba(0,0,0,0.7);
        transform: translateX(-6px) scale(1.1) !important;
        z-index: 6 !important;
      }
      .meb-card.meb-acting {
        transform: translateX(-12px) scale(1.15) !important;
        z-index: 20 !important;
        box-shadow: 0 0 24px rgba(255,120,40,0.95), -6px 6px 16px rgba(0,0,0,0.8);
        border-color: #ff8c30 !important;
      }
      .meb-card.meb-dead {
        filter: grayscale(1) brightness(0.5);
        opacity: 0.42;
        cursor: default;
        pointer-events: none;
        transform: scale(0.85) !important;
        z-index: 0 !important;
      }

      /* ── Morte em brasa: o card queima por um instante antes de virar
         cinza/morto — flash quente + rescaldo, e umas brasas subindo. ── */
      @keyframes mebEmberBurn {
        0%   { filter: brightness(1) saturate(1) grayscale(0); }
        12%  { filter: brightness(1.7) saturate(1.9) grayscale(0) drop-shadow(0 0 10px rgba(255,140,30,0.9)); box-shadow: 0 0 22px 4px rgba(255,120,30,0.6), -3px 3px 8px rgba(0,0,0,0.65); border-color: #ff9a40; }
        50%  { filter: brightness(1.35) saturate(1.5) grayscale(0.3) drop-shadow(0 0 14px rgba(255,80,20,0.75)); box-shadow: 0 0 14px 2px rgba(255,90,20,0.4), -3px 3px 8px rgba(0,0,0,0.65); }
        100% { filter: brightness(0.5) saturate(0.8) grayscale(1); box-shadow: -3px 3px 8px rgba(0,0,0,0.65); border-color: rgba(200,150,10,0.32); }
      }
      .meb-card.meb-dying {
        animation: mebEmberBurn 0.9s ease-out forwards;
        pointer-events: none;
      }
      .meb-card.meb-dying::before,
      .meb-card.meb-dying::after {
        content: '';
        position: absolute;
        width: 4px; height: 4px;
        border-radius: 50%;
        background: radial-gradient(circle, #ffe0a0 0%, #ff8020 55%, transparent 100%);
        left: 46%; bottom: 34%;
        opacity: 0;
        pointer-events: none;
        animation: mebEmberRise 0.9s ease-out forwards;
      }
      .meb-card.meb-dying::after {
        left: 62%; bottom: 40%;
        width: 3px; height: 3px;
        animation-delay: 0.16s;
      }
      @keyframes mebEmberRise {
        0%   { opacity: 0; transform: translate(0,0) scale(1); }
        18%  { opacity: 1; }
        100% { opacity: 0; transform: translate(5px,-32px) scale(0.25); }
      }
      .meb-card-portrait {
        width: 100%; height: 38px;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      }
      .meb-card-portrait img {
        max-width: 100%; max-height: 100%; object-fit: contain;
        mix-blend-mode: screen;
        filter: drop-shadow(0 0 6px rgba(255,120,40,0.7));
      }
      .meb-card-name {
        font-family: 'Noto Sans JP', sans-serif;
        font-size: 0.48rem; color: #e8d8b0; margin-top: 2px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .meb-card-hpbar {
        width: 100%; height: 4px; margin-top: 3px;
        background: rgba(255,255,255,0.12); border-radius: 2px; overflow: hidden;
      }
      .meb-card-hpfill {
        height: 100%; background: linear-gradient(90deg,#8b1a18,#c43020);
        transition: width 0.3s ease;
      }
      .meb-card-hptxt { font-size: 0.4rem; color: #c8a880; margin-top: 1px; }

      /* ── Grupo grande (5+ inimigos, ex.: 6 Guardas do Rei): cards menores
         e mais sobrepostos pra pilha inteira caber ao lado, sem cortar. ── */
      #bat-multi-enemy-row.meb-many .meb-card { width: 46px; margin-top: -16px; padding: 3px 2px 4px; }
      #bat-multi-enemy-row.meb-many .meb-card:first-child { margin-top: 0; }
      #bat-multi-enemy-row.meb-many .meb-card-portrait { height: 26px; }
      #bat-multi-enemy-row.meb-many .meb-card-name { font-size: 0.4rem; }
      #bat-multi-enemy-row.meb-many .meb-card-hpbar { height: 3px; margin-top: 2px; }
      #bat-multi-enemy-row.meb-many .meb-card-hptxt { display: none; }

      /* Troca de identidade do card GRANDE (nome/arte/badge) — dispara
         sempre que o alvo real muda (morte, troca manual) ou quando um
         Onibi diferente está atacando o jogador. */
      @keyframes mebBigSwap {
        0%   { opacity: 0.15; transform: scale(0.82) translateY(8px) rotateY(30deg); filter: brightness(1.8) saturate(1.4); }
        55%  { opacity: 1;    transform: scale(1.06) translateY(-3px) rotateY(-10deg); }
        100% { opacity: 1;    transform: scale(1)    translateY(0)   rotateY(0deg);   filter: none; }
      }
      .meb-big-swap { animation: mebBigSwap 0.4s cubic-bezier(.34,1.56,.64,1); backface-visibility: hidden; }
      #bat-enemy-icon, #bat-enemy-name { perspective: 500px; }
    `;
    document.head.appendChild(st);
  }

  // =============================================================
  //  PAINEL "FILA DE TURNOS" — recolhido por padrão, com um "pin"
  //  fixo no canto pra abrir/fechar. Como o painel é `position:fixed`
  //  (flutua por cima da tela em vez de empurrar o conteúdo), ele
  //  NUNCA aumenta a altura da página nem esconde o botão ATACAR —
  //  só aparece quando o jogador toca no pin.
  // =============================================================
  function _mebInjectQueuePanelCSS() {
    if (document.getElementById('meb-queue-css')) return;
    const st = document.createElement('style');
    st.id = 'meb-queue-css';
    st.textContent = `
      /* Tira compacta "Próximos turnos" — sempre visível, pequena */
      #meb-queue-strip-inline {
        display: none;
        margin: 4px 4px 6px;
        padding: 5px 7px;
        border-radius: 8px;
        background: rgba(10,8,14,0.75);
        border: 1px solid rgba(150,110,255,0.15);
        font-family: 'Noto Sans JP', sans-serif;
      }
      .mqp-strip-inline-title {
        font-size: 0.46rem; letter-spacing: 0.06em; text-transform: uppercase;
        color: #8892ad; font-weight: 700; margin-bottom: 3px;
      }
      .mqp-strip-mini { display: flex; align-items: center; gap: 3px; overflow-x: auto; }
      .mqp-slot-mini { flex-shrink: 0; }
      .mqp-slot-mini .mqp-icon-mini {
        width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
        font-size: 11px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14);
      }
      .mqp-slot-mini.now .mqp-icon-mini { border-color: #ffcc40; box-shadow: 0 0 0 1px #ffcc40; }
      .mqp-arrow-mini { color: #6b7490; font-size: 8px; flex-shrink: 0; }
    `;
    document.head.appendChild(st);
  }

  // Tira compacta "Próximos turnos" — SEMPRE visível durante a batalha
  // em grupo, inserida no fluxo normal da tela logo acima dos botões
  // de ação, mas pequena o suficiente pra não empurrar o ATACAR pra
  // fora da tela.
  function _mebQueueStripInlineEl() {
    let el = document.getElementById('meb-queue-strip-inline');
    if (!el) {
      el = document.createElement('div');
      el.id = 'meb-queue-strip-inline';
      const actions = document.querySelector('.battle-actions, #bat-actions');
      if (actions && actions.parentNode) {
        actions.parentNode.insertBefore(el, actions);
      } else {
        const arena = document.querySelector('.battle-arena');
        if (arena) arena.appendChild(el); else document.body.appendChild(el);
      }
    }
    return el;
  }

  // Simula (sem alterar os medidores reais) quem agiria nos próximos
  // passos, só pra desenhar a tira "PRÓXIMOS TURNOS" com antecedência.
  function _mebPeekFuture(mb, howMany) {
    const p = G.player;
    const out = [];
    if (howMany <= 0) return out;
    const gaugeCopy = Object.assign({}, mb.gauges);
    let pending = mb._pendingQueue ? mb._pendingQueue.slice() : mb.members.filter(x => x.alive).map(x => x.id);
    for (let i = 0; i < howMany; i++) {
      if (!pending.length) {
        pending = mb.members.filter(x => x.alive).map(x => x.id);
        if (!pending.length) break;
      }
      const candidatos = ['player', ...pending].map(id => {
        if (id === 'player') return { id, spd: Math.max(1, p.spd || 1) };
        const m = mb.members.find(x => x.id === id);
        return { id, spd: Math.max(1, (m && m.spd) || 1) };
      });
      candidatos.forEach(c => { gaugeCopy[c.id] = (gaugeCopy[c.id] || 0) + c.spd; });
      const maxVal = Math.max(...candidatos.map(c => gaugeCopy[c.id]));
      const empatados = candidatos.filter(c => gaugeCopy[c.id] === maxVal);
      const vencedor = empatados[0]; // preview não precisa sortear de verdade
      gaugeCopy[vencedor.id] = 0;
      out.push(vencedor.id);
      if (vencedor.id !== 'player') pending = pending.filter(id => id !== vencedor.id);
    }
    return out;
  }

  function _mebRenderQueuePanel() {
    try {
      _mebRenderQueuePanelInner();
    } catch (err) {
      console.error('[meb] erro ao renderizar o painel de fila de turnos:', err);
    }
    // Garante atualização "em tempo real": mesmo que algum evento do jogo
    // (cura de aliado, status, etc.) mude o estado sem chamar o render
    // explicitamente, esse relógio força a tira a se atualizar.
    const mb = G._multiBattle;
    if (mb && mb.active && !window._mebQueueRefreshTimer) {
      window._mebQueueRefreshTimer = setInterval(() => {
        const cur = G._multiBattle;
        if (!cur || !cur.active) {
          clearInterval(window._mebQueueRefreshTimer);
          window._mebQueueRefreshTimer = null;
          return;
        }
        try { _mebRenderQueuePanelInner(); } catch (err) { /* silencioso no timer */ }
      }, 400);
    } else if ((!mb || !mb.active) && window._mebQueueRefreshTimer) {
      clearInterval(window._mebQueueRefreshTimer);
      window._mebQueueRefreshTimer = null;
    }
  }

  function _mebRenderQueuePanelInner() {
    const mb = G._multiBattle;
    _mebInjectQueuePanelCSS();
    const stripEl = _mebQueueStripInlineEl();

    if (!mb || !mb.active) {
      stripEl.innerHTML = '';
      stripEl.style.display = 'none';
      return;
    }

    const currentId = mb._queuePeekId === 'player-duel' ? 'player' : mb._queuePeekId;

    // ── Tira "Próximos turnos" — SEMPRE visível na batalha, versão
    //    compacta (ícones pequenos), só informativa (não trava nada). ──
    const future = currentId ? [currentId, ..._mebPeekFuture(mb, 5)] : ['player', ..._mebPeekFuture(mb, 5)];
    let stripHtml = '<div class="mqp-strip-inline-title">Próximos turnos</div><div class="mqp-strip-mini">';
    future.slice(0, 6).forEach((id, idx) => {
      const isPlayer = id === 'player';
      const icon = isPlayer ? '🗡️' : ((mb.members.find(x => x.id === id) || {}).icon || '👹');
      stripHtml += `<div class="mqp-slot-mini ${idx === 0 ? 'now' : ''}"><div class="mqp-icon-mini">${icon}</div></div>`;
      if (idx < future.length - 1 && idx < 5) stripHtml += '<div class="mqp-arrow-mini">→</div>';
    });
    stripHtml += '</div>';
    stripEl.style.display = 'block';
    stripEl.innerHTML = stripHtml;
  }

  // ── Processa a morte do membro ativo (chamado a partir do patch de endBattle) ──
  function _mebProcessActiveDeath() {
    const mb = G._multiBattle;
    if (!mb) return;
    const m = mb.members.find(x => x.id === mb.activeId);
    if (!m || !m.alive) return;
    m.hp = Math.max(0, battleState.enemyHp);
    if (m.hp > 0) return; // ainda vivo, nada a fazer
    m.alive = false;
    m.hp = 0;
    mb._deathSeq = (mb._deathSeq || 0) + 1;
    m.deathSeq = mb._deathSeq;
    // Marca a janela de "queimando em brasa" — o card mostra o efeito
    // enquanto isDying for verdadeiro (ver _mebRenderRow), depois se
    // assenta sozinho no visual cinza/morto de sempre.
    m._dyingUntil = Date.now() + 900;
    if (typeof appendBattleLog === 'function') {
      appendBattleLog(`💀 ${m.name} foi derrotado!`, '#ffaa40');
    }
    const aliveLeft = mb.members.filter(x => x.alive).length;
    if (typeof mb.onMemberDeath === 'function') {
      try { mb.onMemberDeath(battleState, G.player, m, aliveLeft); }
      catch (err) { console.error('[multi_enemy_battle] erro em onMemberDeath:', err); }
    }
    if (typeof updateHUD === 'function') updateHUD();
    if (typeof updateBattleHUD === 'function') updateBattleHUD();
    setTimeout(() => { if (G._multiBattle === mb) { _mebRenderRow(); _mebRenderQueuePanel(); } }, 950);
  }

  function _mebHideRow() {
    const row = document.getElementById('bat-multi-enemy-row');
    if (row) { row.style.display = 'none'; row.innerHTML = ''; }
    const strip = document.getElementById('meb-queue-strip-inline');
    if (strip) { strip.style.display = 'none'; strip.innerHTML = ''; }
    if (window._mebQueueRefreshTimer) {
      clearInterval(window._mebQueueRefreshTimer);
      window._mebQueueRefreshTimer = null;
    }
  }

  // =============================================================
  //  FILA DE TURNOS POR VELOCIDADE
  // =============================================================
  //  Substitui o antigo "jogador ataca → TODOS os inimigos vivos
  //  agem em sequência fixa/sorteada". Agora cada combatente (você
  //  + cada inimigo vivo) tem um medidor que avança pela SPD dele
  //  a cada "passo" simulado (sem tempo real, sem QTE obrigatório —
  //  tudo calculado na hora, igual à demo). Quem estoura o medidor
  //  primeiro age; empate de SPD é decidido por sorteio.
  //
  //  Isso é o que faz o jogador poder "furar a fila" e aparecer nela
  //  antes de um ou mais inimigos quando a SPD empata ou supera —
  //  nesse momento a fila NÃO age sozinha por você: ela oferece a
  //  aposta opcional (barrinha), e só dá o turno extra de verdade se
  //  você acertar o timing. Se recusar/errar, esse "furo" é descartado
  //  e a fila segue pros inimigos normalmente.
  // =============================================================

  // Garante os medidores (gauges) de todo mundo que precisa deles.
  function _mebEnsureGauges(mb) {
    if (!mb.gauges) mb.gauges = {};
    if (typeof mb.gauges.player !== 'number') mb.gauges.player = 0;
    mb.members.forEach(m => {
      if (typeof mb.gauges[m.id] !== 'number') mb.gauges[m.id] = 0;
    });
  }

  // Avança os medidores até alguém estourar; retorna o id vencedor
  // ('player' ou id de um membro) e ZERA o medidor dele. Empate = sorte.
  function _mebRollNext(candidatosIds) {
    const mb = G._multiBattle;
    const p = G.player;
    const candidatos = candidatosIds.map(id => {
      if (id === 'player') return { id, spd: Math.max(1, p.spd || 1) };
      const m = mb.members.find(x => x.id === id);
      return { id, spd: Math.max(1, (m && m.spd) || 1) };
    });
    let guarda = 0;
    while (guarda < 5000) {
      guarda++;
      candidatos.forEach(c => { mb.gauges[c.id] = (mb.gauges[c.id] || 0) + c.spd; });
      const maxVal = Math.max(...candidatos.map(c => mb.gauges[c.id]));
      const empatados = candidatos.filter(c => mb.gauges[c.id] === maxVal);
      const vencedor = empatados[Math.floor(Math.random() * empatados.length)];
      if (empatados.length > 1 && typeof appendBattleLog === 'function' && vencedor.id !== 'player') {
        // só loga empate quando vale a pena explicar (evita spam a cada passo)
      }
      mb.gauges[vencedor.id] = 0;
      return vencedor.id;
    }
    return candidatosIds[0]; // fallback de segurança, nunca deve chegar aqui
  }

  // ── Botão pequeno + barrinha de aposta (enche de baixo pra cima) ──
  function _mebInjectApostaCSS() {
    if (document.getElementById('meb-aposta-css')) return;
    const st = document.createElement('style');
    st.id = 'meb-aposta-css';
    st.textContent = `
      .meb-aposta-btn {
        position: absolute; z-index: 30;
        bottom: 86px; right: 10px;
        padding: 6px 10px; border-radius: 20px;
        background: linear-gradient(180deg, rgba(80,190,255,0.95), rgba(30,110,190,0.95));
        border: 1.5px solid rgba(220,245,255,0.85);
        color: #fff; font-size: 0.62rem; font-weight: bold;
        box-shadow: 0 0 14px rgba(80,190,255,0.7);
        cursor: pointer; animation: mebApostaPulse 0.9s ease-in-out infinite;
        touch-action: manipulation;
      }
      @keyframes mebApostaPulse {
        0%,100% { transform: scale(1); } 50% { transform: scale(1.08); }
      }
      .meb-aposta-overlay {
        position: absolute; inset: 0; z-index: 40;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 10px; background: rgba(6,4,2,0.72);
      }
      .meb-aposta-track {
        width: 26px; height: 140px; border-radius: 13px;
        background: rgba(255,255,255,0.10); border: 1.5px solid rgba(200,150,10,0.4);
        position: relative; overflow: hidden;
      }
      .meb-aposta-zone {
        position: absolute; left: 0; right: 0;
        background: rgba(90,220,120,0.55); border-top: 1px solid #8cffab; border-bottom: 1px solid #8cffab;
      }
      .meb-aposta-marker {
        position: absolute; left: -3px; right: -3px; height: 4px;
        background: #fff; box-shadow: 0 0 8px 2px rgba(255,255,255,0.9);
      }
      .meb-aposta-label {
        font-family: 'Noto Sans JP', sans-serif; color: #ffd97a; font-size: 0.72rem; text-align: center;
      }
      .meb-aposta-go {
        padding: 8px 22px; border-radius: 20px; border: none;
        background: linear-gradient(180deg,#7fd7ff,#2f8fd6); color: #fff; font-weight: bold;
        font-size: 0.75rem; touch-action: manipulation;
      }
    `;
    document.head.appendChild(st);
  }

  function _mebArenaEl() {
    return document.querySelector('.battle-arena') || document.body;
  }

  // Aparece por ~1.8s; se não tocar, a chance passa sozinha (onResolved(false)).
  function _mebOfereceAposta(onResolved) {
    _mebInjectApostaCSS();
    const arena = _mebArenaEl();
    const btn = document.createElement('div');
    btn.className = 'meb-aposta-btn';
    btn.textContent = '⚡ Apostar';
    arena.appendChild(btn);

    let done = false;
    const auto = setTimeout(() => {
      if (done) return;
      done = true;
      btn.remove();
      onResolved(false);
    }, 1800);

    btn.onclick = () => {
      if (done) return;
      done = true;
      clearTimeout(auto);
      btn.remove();
      _mebRodarBarraAposta(onResolved);
    };
  }

  function _mebRodarBarraAposta(onResolved) {
    const arena = _mebArenaEl();
    const overlay = document.createElement('div');
    overlay.className = 'meb-aposta-overlay';
    overlay.innerHTML = `
      <div class="meb-aposta-label">Toque em "Apostar"<br>quando o marcador estiver na zona verde!</div>
      <div class="meb-aposta-track">
        <div class="meb-aposta-zone" style="bottom:60%; height:22%;"></div>
        <div class="meb-aposta-marker" style="bottom:0;"></div>
      </div>
      <button class="meb-aposta-go">Apostar</button>
    `;
    arena.appendChild(overlay);

    const marker = overlay.querySelector('.meb-aposta-marker');
    const goBtn  = overlay.querySelector('.meb-aposta-go');
    const zoneBottom = 60, zoneTop = 82; // % da trilha (bate com a .meb-aposta-zone acima)

    let pos = 0, dir = 1, resolved = false;
    const speed = 2.6; // %/frame — sobe e desce em loop
    let raf;
    function tick() {
      pos += dir * speed;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0)   { pos = 0;   dir = 1; }
      marker.style.bottom = pos + '%';
      if (!resolved) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    const safety = setTimeout(() => finish(false), 3000);

    function finish(ganhou) {
      if (resolved) return;
      resolved = true;
      clearTimeout(safety);
      cancelAnimationFrame(raf);
      overlay.remove();
      onResolved(ganhou);
    }

    goBtn.onclick = () => finish(pos >= zoneBottom && pos <= zoneTop);
  }

  // ── Processa a fila de ação do round atual (pode ser retomada após
  //    o jogador vencer uma aposta e atacar de novo). ──
  //
  //  AUTOMÁTICO: o inimigo age sozinho (como sempre foi). A tira e o
  //  pin no canto são só informativos — mostram quem vai agir a
  //  seguir, mas não travam esperando toque nenhum.
  function _mebProcessarFila(bs, p, voltarParaJogador) {
    const mb = G._multiBattle;
    _mebEnsureGauges(mb);

    function passo() {
      if (p.hp <= 0) { p.hp = 0; setTimeout(() => endBattle(false, false), battleDelay(500)); return; }

      // fila esvaziada — round acabou, devolve o controle
      if (!mb._pendingQueue.length) {
        if (typeof mb.onRoundEnd === 'function') mb.onRoundEnd(bs, p);
        mb._pendingQueue = null;
        mb._queuePeekId = null;
        _mebRenderQueuePanel();
        voltarParaJogador();
        return;
      }

      const candidatos = ['player', ...mb._pendingQueue];
      const vencedorId = _mebRollNext(candidatos);

      if (vencedorId === 'player') {
        if (mb._apostaUsadaNesteRound) {
          // já tentou a sorte uma vez neste round — não oferece de novo,
          // só descarta esse "furo" e segue a fila normalmente.
          passo();
          return;
        }
        mb._apostaUsadaNesteRound = true;
        mb._queuePeekId = 'player-duel';
        _mebRenderQueuePanel();
        _mebOfereceAposta((ganhou) => {
          if (ganhou) {
            if (typeof appendBattleLog === 'function') {
              appendBattleLog('⚡ Você acertou o timing e ataca antes da fila!', '#8fe0ff');
            }
            mb._queuePeekId = null;
            _mebRenderQueuePanel();
            voltarParaJogador();
          } else {
            if (typeof appendBattleLog === 'function') {
              appendBattleLog('A aposta não deu certo dessa vez...', '#a0a0a0');
            }
            passo();
          }
        });
        return;
      }

      // é um inimigo — remove da fila, atualiza a tira mostrando quem
      // é a vez ("agora") e o faz agir sozinho, sem esperar toque.
      mb._pendingQueue = mb._pendingQueue.filter(id => id !== vencedorId);
      const membro = mb.members.find(x => x.id === vencedorId);
      if (!membro || !membro.alive) { passo(); return; }

      mb._queuePeekId = vencedorId;
      _mebRenderQueuePanel();

      if (typeof mebAnimateActing === 'function') mebAnimateActing(membro.id);

      setTimeout(() => {
        if (typeof mb.actHandler === 'function') {
          mb.actHandler(bs, p, membro, () => {
            if (typeof updateHUD === 'function') updateHUD();
            if (typeof updateBattleHUD === 'function') updateBattleHUD();
            if (typeof buildStatusBadges === 'function') buildStatusBadges();
            passo();
          });
        } else if (typeof mb.turnHandler === 'function') {
          // compatibilidade com grupos antigos que ainda usam turnHandler
          // (age com TODOS os pendentes de uma vez, formato antigo).
          const restante = mb.members.filter(x => mb._pendingQueue.includes(x.id) || x.id === membro.id);
          mb._pendingQueue = [];
          mb.turnHandler(bs, p, restante, () => passo());
        } else {
          passo();
        }
      }, 550);
    }

    passo();
  }

  // ── Instala os 3 monkey-patches sobre o motor original ──
  function _mebInstall() {
    if (window._mebInstalled) return;
    window._mebInstalled = true;

    const _origStartBattle     = window.startBattle;
    const _origUpdateBattleHUD = window.updateBattleHUD;
    const _origRunEnemyTurn    = window.runEnemyTurn;
    const _origEndBattle       = window.endBattle;

    // 1) updateBattleHUD — mantém o HP do membro ativo sincronizado e
    //    redesenha a "mão de cartas" a cada atualização de HUD.
    window.updateBattleHUD = function () {
      _origUpdateBattleHUD.apply(this, arguments);
      const mb = G._multiBattle;
      if (mb && mb.active) {
        const m = mb.members.find(x => x.id === mb.activeId);
        if (m && m.alive) m.hp = Math.max(0, battleState.enemyHp);
        _mebRenderRow(); _mebRenderQueuePanel();
      }
    };

    // 2) runEnemyTurn — se houver batalha em grupo ativa, ignora a IA de
    //    inimigo único e delega para o turnHandler do grupo.
    window.runEnemyTurn = function (bs, p, e, skipTurn) {
      const mb = G._multiBattle;
      if (!mb || !mb.active) {
        return _origRunEnemyTurn(bs, p, e, skipTurn);
      }

      if (typeof updateBattleTurnIndicator === 'function') updateBattleTurnIndicator('enemy');

      let acting = mb.members.filter(x => x.alive);

      // Atordoamento afeta só o membro que estava sendo o alvo (é nele
      // que o jogador aplicou o atordoamento).
      if ((bs.enemyStunned || skipTurn) && acting.length) {
        const activeM = mb.members.find(x => x.id === mb.activeId);
        if (activeM && activeM.alive) {
          if (typeof appendBattleLog === 'function') {
            appendBattleLog(`⚡ ${activeM.name} está atordoado e perde o turno!`, '#ffee40');
          }
          acting = acting.filter(x => x.id !== activeM.id);
        }
        bs.enemyStunned = false;
      }

      if (typeof tickPlayerStatusEffects === 'function') tickPlayerStatusEffects(bs, p, e);
      if (typeof updateHUD === 'function') updateHUD();
      if (typeof updateBattleHUD === 'function') updateBattleHUD();

      if (p.hp <= 0) {
        p.hp = 0;
        setTimeout(() => endBattle(false, false), battleDelay(500));
        return;
      }

      function _voltarParaJogador() {
        if (p.hp <= 0) {
          p.hp = 0;
          setTimeout(() => endBattle(false, false), battleDelay(500));
          return;
        }
        // Reaplica o alvo ativo pra "puxar" quaisquer mudanças que o
        // turnHandler tenha feito nele (ex: buff de DEF em grupo).
        _mebSetActive(mb.activeId);
        bs.phase = 'player';
        if (typeof applyTalentTurnStart === 'function') applyTalentTurnStart(bs);
        if (typeof setBattleButtons === 'function') setBattleButtons(true);
        if (typeof buildSkillList === 'function') buildSkillList();
        if (typeof updateBattleTurnIndicator === 'function') updateBattleTurnIndicator('player');
        if (typeof setHeroAnim === 'function') setHeroAnim('idle');
        _mebRenderRow(); _mebRenderQueuePanel();
      }

      if (!acting.length) {
        // Só havia 1 vivo e ele estava atordoado — ninguém age este turno.
        _voltarParaJogador();
        return;
      }

      if (typeof mb.actHandler !== 'function' && typeof mb.turnHandler !== 'function') {
        console.error('[multi_enemy_battle] grupo sem actHandler/turnHandler definido!');
        _voltarParaJogador();
        return;
      }

      // Se já existe uma fila pendente (ex: o jogador acabou de vencer uma
      // aposta e atacou de novo), retoma ela em vez de começar um round novo.
      if (!mb._pendingQueue) {
        mb._pendingQueue = acting.map(x => x.id);
        mb._apostaUsadaNesteRound = false;
        if (typeof mb.onRoundStart === 'function') mb.onRoundStart(bs, p);
      }

      _mebProcessarFila(bs, p, _voltarParaJogador);
    };

    // 3) endBattle — quando o alvo ativo morre e ainda há membros vivos,
    //    a luta CONTINUA (troca de alvo, devolve o turno ao jogador) em
    //    vez de encerrar. Só finaliza de verdade quando o grupo inteiro
    //    está morto, ou em derrota/fuga.
    window.endBattle = function (won, fled) {
      const mb = G._multiBattle;

      if (!mb || !mb.active) {
        return _origEndBattle(won, fled);
      }

      if (won) {
        _mebProcessActiveDeath();
        const stillAlive = mb.members.filter(x => x.alive);

        if (stillAlive.length > 0) {
          // A luta continua — outros Onibi ainda de pé.
          const next = stillAlive[0];
          _mebSetActive(next.id);
          if (typeof window.mebAnimateActing === 'function') window.mebAnimateActing(next.id);
          battleState._battleEnded = false; // garante que o próximo membro possa acionar endBattle normalmente
          battleState.phase = 'player';
          if (typeof setBattleButtons === 'function') setBattleButtons(true);
          if (typeof buildSkillList === 'function') buildSkillList();
          if (typeof updateBattleHUD === 'function') updateBattleHUD();
          if (typeof updateBattleTurnIndicator === 'function') updateBattleTurnIndicator('player');
          if (typeof setHeroAnim === 'function') setHeroAnim('idle');
          if (typeof appendBattleLog === 'function') {
            appendBattleLog(`⚔️ ${next.name} continua a luta em nome do grupo!`, '#ff8040');
          }
          _mebRenderRow(); _mebRenderQueuePanel();
          return; // NÃO finaliza a batalha de verdade ainda
        }

        // Grupo inteiro derrotado — monta um "inimigo" combinado com a
        // soma das recompensas e deixa o endBattle real cuidar do resto
        // (XP, ouro, loot, mérito, callback da masmorra etc.)
        battleState.enemyData = {
          id: mb.groupId, name: mb.groupName, icon: mb.icon,
          elemento: mb.elemento, isBoss: mb.isBoss, desc: mb.desc,
          xp: mb.xp, gold: mb.gold, loot: mb.loot,
        };
        mb.active = false;
        G._multiBattle = null;
        _mebHideRow();
        return _origEndBattle(true, fled);
      }

      // Derrota ou fuga — encerra normalmente e limpa o estado do grupo.
      mb.active = false;
      G._multiBattle = null;
      _mebHideRow();
      return _origEndBattle(won, fled);
    };

    window._mebRealStartBattle = _origStartBattle;
  }

  // ── Ponto de entrada usado pelas masmorras ──
  window.startMultiEnemyBattle = function (config) {
    if (!window._mebInstalled) {
      // Segurança: se por algum motivo o boot ainda não rodou, tenta de novo em breve.
      setTimeout(() => window.startMultiEnemyBattle(config), 150);
      return;
    }
    if (!config || !Array.isArray(config.members) || !config.members.length) {
      console.error('[multi_enemy_battle] startMultiEnemyBattle chamado sem members válidos.');
      return;
    }

    _mebInjectCSS();

    const members = config.members.map(m => ({
      id: m.id, name: m.name, img: m.img || null, sprite: m.sprite || null,
      icon: m.icon || config.icon || '👹',
      hp: m.hp, maxHp: m.hp,
      atk: m.atk || 0, def: m.def || 0, baseDef: m.def || 0,
      spd: m.spd || 10, elemento: m.elemento || config.elemento || 'neutro',
      critChance: m.critChance, critMult: m.critMult,
      tintFilter: m.tintFilter,
      alive: true, deathSeq: null, _status: {},
    }));

    G._multiBattle = {
      groupId:   config.groupId   || 'grupo_inimigos',
      groupName: config.groupName || 'Grupo de Inimigos',
      icon:      config.icon      || '👹',
      elemento:  config.elemento  || 'neutro',
      isBoss:    !!config.isBoss,
      desc:      config.desc || '',
      xp:        config.xp   || 0,
      gold:      (typeof config.gold === 'number') ? config.gold : undefined,
      loot:      config.loot || [],
      members:   members,
      activeId:  members[0].id,
      // actHandler(bs, p, membro, done) — resolve a ação de UM membro
      // por vez; a ORDEM entre eles é decidida pela fila de velocidade
      // do motor (não mais escolhida pelo grupo). turnHandler antigo
      // (age com todos de uma vez) ainda funciona como fallback.
      actHandler:    config.actHandler,
      turnHandler:   config.turnHandler,
      onRoundStart:  config.onRoundStart,   // opcional: roda 1x no início do round dos inimigos
      onRoundEnd:    config.onRoundEnd,     // opcional: roda 1x quando a fila do round esvazia
      onMemberDeath: config.onMemberDeath,
      gauges: {},
      _pendingQueue: null,
      _apostaUsadaNesteRound: false,
      active: true,
    };
    _mebEnsureGauges(G._multiBattle);

    const first = _mebSyntheticEnemy(members[0]);
    // Chama o motor de batalha ORIGINAL, sem alterá-lo — ele acha que é
    // uma luta contra 1 inimigo normal (o primeiro membro do grupo).
    startBattle(first);

    // Garante que os dados (nome/ícone/badge) fiquem 100% sincronizados
    // com o membro ativo (cobre qualquer diferença de campos entre o
    // "enemy" que o startBattle recebeu e o objeto completo do membro).
    _mebSetActive(members[0].id);

    if (typeof appendBattleLog === 'function') {
      appendBattleLog(`🔥 ${G._multiBattle.groupName} entram em batalha, todos ao mesmo tempo!`, '#ff8040');
    }

    _mebRenderRow(); _mebRenderQueuePanel();
  };

})();
