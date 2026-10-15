// =============================================================
//  DAMA_TAVERNA.JS — Chronicles of Clivor
//  Minigame de dama (damas brasileiras, 8x8) contra o Taberneiro.
//  Regras: peças normais capturam pra frente e pra trás; damas
//  (coroadas) "voam" qualquer distância na diagonal; captura é
//  obrigatória e, ao capturar, a mesma peça deve continuar
//  capturando enquanto puder (lance em cadeia).
//  Depende de: palDinh.js (G, notify, updateHUD, addLog) e,
//              opcionalmente, vilarejo.js (addReputation).
// =============================================================

'use strict';

const DAMA = {
  board: null,       // board[r][c] = null | { owner:'jogador'|'ia', king:bool }
  turno: 'jogador',
  selecionada: null,  // {r,c}
  destinos: [],        // destinos válidos da peça selecionada
  pecaEmCadeia: null,  // trava a seleção numa peça em meio a captura múltipla
  capJogador: 0,
  capIA: 0,
  fim: false,
  travado: false,      // true enquanto a IA "pensa" — bloqueia cliques
};

const DAMA_DIRS_TODAS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function _damaDentro(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// ── Monta o tabuleiro inicial ──
function _damaNovoTabuleiro() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0) continue; // só casas escuras são jogáveis
      if (r <= 2) b[r][c] = { owner: 'ia', king: false };
      else if (r >= 5) b[r][c] = { owner: 'jogador', king: false };
    }
  }
  return b;
}

// ── Movimentos simples (sem captura) de uma peça ──
function _damaMovSimples(board, r, c) {
  const peca = board[r][c];
  if (!peca) return [];
  const out = [];
  if (peca.king) {
    DAMA_DIRS_TODAS.forEach(([dr, dc]) => {
      let nr = r + dr, nc = c + dc;
      while (_damaDentro(nr, nc) && !board[nr][nc]) {
        out.push({ r: nr, c: nc });
        nr += dr; nc += dc;
      }
    });
  } else {
    const dirs = peca.owner === 'jogador' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (_damaDentro(nr, nc) && !board[nr][nc]) out.push({ r: nr, c: nc });
    });
  }
  return out;
}

// ── Capturas possíveis de uma peça (retorna [{r,c,capturada:{r,c}}]) ──
function _damaCapturas(board, r, c) {
  const peca = board[r][c];
  if (!peca) return [];
  const out = [];
  if (peca.king) {
    DAMA_DIRS_TODAS.forEach(([dr, dc]) => {
      let nr = r + dr, nc = c + dc;
      // anda pelas casas vazias até achar uma peça
      while (_damaDentro(nr, nc) && !board[nr][nc]) { nr += dr; nc += dc; }
      if (!_damaDentro(nr, nc)) return;
      const alvo = board[nr][nc];
      if (!alvo || alvo.owner === peca.owner) return; // própria peça ou fora — sem captura nessa direção
      // depois do inimigo, todas as casas vazias seguintes são pousos válidos
      let pr = nr + dr, pc = nc + dc;
      while (_damaDentro(pr, pc) && !board[pr][pc]) {
        out.push({ r: pr, c: pc, capturada: { r: nr, c: nc } });
        pr += dr; pc += dc;
      }
    });
  } else {
    DAMA_DIRS_TODAS.forEach(([dr, dc]) => {
      const mr = r + dr, mc = c + dc;
      const fr = r + dr * 2, fc = c + dc * 2;
      if (!_damaDentro(fr, fc)) return;
      const alvo = board[mr][mc];
      if (alvo && alvo.owner !== peca.owner && !board[fr][fc]) {
        out.push({ r: fr, c: fc, capturada: { r: mr, c: mc } });
      }
    });
  }
  return out;
}

// ── Todos os movimentos legais de um lado, já aplicando a regra de
//    captura obrigatória (se alguma peça pode capturar, só capturas valem) ──
function _damaTodosMovimentos(board, owner) {
  const pecas = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && board[r][c].owner === owner) pecas.push({ r, c });
  }
  const comCaptura = [];
  const semCaptura = [];
  pecas.forEach(({ r, c }) => {
    const caps = _damaCapturas(board, r, c);
    if (caps.length) comCaptura.push({ r, c, movimentos: caps, captura: true });
    else {
      const sim = _damaMovSimples(board, r, c);
      if (sim.length) semCaptura.push({ r, c, movimentos: sim, captura: false });
    }
  });
  return comCaptura.length ? comCaptura : semCaptura;
}

// ── Aplica um movimento no tabuleiro (muta o board recebido) ──
function _damaAplicarMovimento(board, origem, destino, capturada) {
  const peca = board[origem.r][origem.c];
  board[origem.r][origem.c] = null;
  if (capturada) board[capturada.r][capturada.c] = null;
  board[destino.r][destino.c] = peca;
  // Promoção
  if (!peca.king) {
    if ((peca.owner === 'jogador' && destino.r === 0) || (peca.owner === 'ia' && destino.r === 7)) {
      peca.king = true;
    }
  }
  return peca;
}

function _damaClonarBoard(board) {
  return board.map(linha => linha.map(p => p ? { owner: p.owner, king: p.king } : null));
}

// =============================================================
//  ABERTURA / RENDER
// =============================================================
function abrirDamaTaverna() {
  const overlay = document.getElementById('dama-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  _damaIniciarPartida();
}
window.abrirDamaTaverna = abrirDamaTaverna;

function _damaFecharOverlay() {
  const overlay = document.getElementById('dama-overlay');
  if (overlay) overlay.classList.remove('active');
}

function _damaIniciarPartida() {
  DAMA.board = _damaNovoTabuleiro();
  DAMA.turno = 'jogador';
  DAMA.selecionada = null;
  DAMA.destinos = [];
  DAMA.pecaEmCadeia = null;
  DAMA.capJogador = 0;
  DAMA.capIA = 0;
  DAMA.fim = false;
  DAMA.travado = false;

  const endEl = document.getElementById('dama-endscreen');
  if (endEl) endEl.classList.remove('active');

  _damaAtualizarPlacar();
  _damaAtualizarStatus('Sua vez — escolha uma peça clara.', 'jogador');
  _damaRenderTabuleiro();
}

function _damaAtualizarPlacar() {
  const cj = document.getElementById('dama-cap-jogador');
  const ci = document.getElementById('dama-cap-ia');
  if (cj) cj.textContent = DAMA.capJogador;
  if (ci) ci.textContent = DAMA.capIA;
}

function _damaAtualizarStatus(texto, modo) {
  const el = document.getElementById('dama-status');
  if (!el) return;
  el.textContent = texto;
  el.classList.remove('turno-ia', 'fim');
  if (modo === 'ia') el.classList.add('turno-ia');
  if (modo === 'fim') el.classList.add('fim');
}

function _damaRenderTabuleiro() {
  const boardEl = document.getElementById('dama-board');
  if (!boardEl) return;
  boardEl.innerHTML = '';

  const destinosMap = {};
  DAMA.destinos.forEach(d => { destinosMap[d.r + '_' + d.c] = d; });

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      const clara = (r + c) % 2 === 0;
      sq.className = 'dama-sq ' + (clara ? 'clara' : 'escura');
      sq.dataset.r = r; sq.dataset.c = c;

      if (DAMA.selecionada && DAMA.selecionada.r === r && DAMA.selecionada.c === c) {
        sq.classList.add('origem-selecionada');
      }
      const destino = destinosMap[r + '_' + c];
      if (destino) {
        sq.classList.add('jogavel', 'destino');
        if (destino.capturada) sq.classList.add('destino-captura');
      }

      const peca = DAMA.board[r][c];
      if (peca) {
        const pEl = document.createElement('div');
        pEl.className = 'dama-peca ' + (peca.owner === 'jogador' ? 'jogador' : 'ia') + (peca.king ? ' coroa' : '');
        if (DAMA.selecionada && DAMA.selecionada.r === r && DAMA.selecionada.c === c) pEl.classList.add('selecionada');
        sq.appendChild(pEl);
      }
      boardEl.appendChild(sq);
    }
  }
}

// ── Clique no tabuleiro (delegação) ──
function _damaOnBoardClick(e) {
  if (DAMA.fim || DAMA.travado || DAMA.turno !== 'jogador') return;
  const sq = e.target.closest('.dama-sq');
  if (!sq) return;
  const r = parseInt(sq.dataset.r, 10), c = parseInt(sq.dataset.c, 10);

  // Clicou num destino válido? executa o movimento.
  const destino = DAMA.destinos.find(d => d.r === r && d.c === c);
  if (destino && DAMA.selecionada) {
    _damaExecutarJogadaJogador(DAMA.selecionada, destino);
    return;
  }

  // Se está em meio a uma captura em cadeia, só pode continuar com a mesma peça.
  if (DAMA.pecaEmCadeia) return;

  const peca = DAMA.board[r][c];
  if (!peca || peca.owner !== 'jogador') { DAMA.selecionada = null; DAMA.destinos = []; _damaRenderTabuleiro(); return; }

  const todos = _damaTodosMovimentos(DAMA.board, 'jogador');
  const entrada = todos.find(m => m.r === r && m.c === c);
  if (!entrada) { // peça sem jogada legal (existe captura obrigatória em outra peça)
    _damaAtualizarStatus('Captura obrigatória em outra peça!', 'jogador');
    return;
  }
  DAMA.selecionada = { r, c };
  DAMA.destinos = entrada.movimentos;
  _damaRenderTabuleiro();
}

function _damaExecutarJogadaJogador(origem, destino) {
  const peca = _damaAplicarMovimento(DAMA.board, origem, destino, destino.capturada);
  if (destino.capturada) {
    DAMA.capJogador++;
    _damaAtualizarPlacar();
  }

  const novasCapturas = _damaCapturas(DAMA.board, destino.r, destino.c);
  if (destino.capturada && novasCapturas.length) {
    // Cadeia: continua com a mesma peça
    DAMA.selecionada = { r: destino.r, c: destino.c };
    DAMA.destinos = novasCapturas;
    DAMA.pecaEmCadeia = DAMA.selecionada;
    _damaAtualizarStatus('Continue a captura com a mesma peça!', 'jogador');
    _damaRenderTabuleiro();
    return;
  }

  DAMA.selecionada = null;
  DAMA.destinos = [];
  DAMA.pecaEmCadeia = null;
  _damaRenderTabuleiro();
  _damaChecarFimOuPassarTurno('ia');
}

// ── Verifica fim de jogo; senão passa a vez ──
function _damaChecarFimOuPassarTurno(proximo) {
  const movimentos = _damaTodosMovimentos(DAMA.board, proximo);
  const aindaTemPeca = DAMA.board.flat().some(p => p && p.owner === proximo);
  if (!aindaTemPeca || movimentos.length === 0) {
    _damaTerminar(proximo === 'ia' ? 'jogador' : 'ia');
    return;
  }
  DAMA.turno = proximo;
  if (proximo === 'ia') {
    _damaAtualizarStatus('O taberneiro pensa...', 'ia');
    DAMA.travado = true;
    setTimeout(_damaJogadaIA, 650 + Math.random() * 500);
  } else {
    _damaAtualizarStatus('Sua vez — escolha uma peça clara.', 'jogador');
  }
}

// =============================================================
//  IA DO TABERNEIRO
// =============================================================
function _damaJogadaIA() {
  if (DAMA.fim) return;
  const movimentos = _damaTodosMovimentos(DAMA.board, 'ia');
  if (!movimentos.length) { _damaTerminar('jogador'); return; }

  const captura = movimentos[0].captura;
  let escolhida;

  if (captura) {
    // Escolhe a peça+destino que resulta na maior cadeia total de capturas.
    let melhor = null, melhorValor = -1;
    movimentos.forEach(entrada => {
      entrada.movimentos.forEach(mov => {
        const valor = 1 + _damaMaxCadeiaRestante(DAMA.board, entrada.r, entrada.c, mov);
        if (valor > melhorValor || (valor === melhorValor && Math.random() < 0.4)) {
          melhorValor = valor;
          melhor = { origem: { r: entrada.r, c: entrada.c }, destino: mov };
        }
      });
    });
    escolhida = melhor;
  } else {
    // Sem capturas: heurística simples com uma pitada de aleatoriedade.
    let melhor = null, melhorScore = -Infinity;
    movimentos.forEach(entrada => {
      entrada.movimentos.forEach(mov => {
        const clone = _damaClonarBoard(DAMA.board);
        _damaAplicarMovimento(clone, { r: entrada.r, c: entrada.c }, mov, null);
        const peca = clone[mov.r][mov.c];
        let score = Math.random() * 0.8;
        if (peca.king) score += 1.5;
        if (!DAMA.board[entrada.r][entrada.c].king && mov.r === 7) score += 2; // vai coroar
        // Penaliza se deixa a peça capturável pelo jogador no próximo lance
        const capturasJogadorDepois = _damaTodosMovimentos(clone, 'jogador').some(m => m.captura &&
          m.movimentos.some(cm => cm.capturada && cm.capturada.r === mov.r && cm.capturada.c === mov.c));
        if (capturasJogadorDepois) score -= 2.2;
        if (score > melhorScore) { melhorScore = score; melhor = { origem: { r: entrada.r, c: entrada.c }, destino: mov }; }
      });
    });
    escolhida = melhor;
  }

  if (!escolhida) { _damaTerminar('jogador'); return; }
  _damaExecutarCadeiaIA(escolhida.origem, escolhida.destino);
}

// Simula, só pra decisão da IA, o quanto ainda dá pra capturar a partir de
// um pouso — sem mutar o tabuleiro real (usa clone).
function _damaMaxCadeiaRestante(boardReal, r, c, primeiroDestino) {
  const clone = _damaClonarBoard(boardReal);
  _damaAplicarMovimento(clone, { r, c }, primeiroDestino, primeiroDestino.capturada);
  return _damaMaxCadeiaRec(clone, primeiroDestino.r, primeiroDestino.c);
}
function _damaMaxCadeiaRec(board, r, c) {
  const caps = _damaCapturas(board, r, c);
  if (!caps.length) return 0;
  let melhor = 0;
  caps.forEach(mov => {
    const clone = _damaClonarBoard(board);
    _damaAplicarMovimento(clone, { r, c }, mov, mov.capturada);
    const resto = 1 + _damaMaxCadeiaRec(clone, mov.r, mov.c);
    if (resto > melhor) melhor = resto;
  });
  return melhor;
}

// Executa de fato (no tabuleiro real) o lance da IA, seguindo a cadeia de
// capturas obrigatórias com pequenas pausas visuais entre cada pulo.
function _damaExecutarCadeiaIA(origem, destino) {
  _damaAplicarMovimento(DAMA.board, origem, destino, destino.capturada);
  if (destino.capturada) { DAMA.capIA++; _damaAtualizarPlacar(); }
  _damaRenderTabuleiro();

  const continuar = _damaCapturas(DAMA.board, destino.r, destino.c);
  if (destino.capturada && continuar.length) {
    setTimeout(() => {
      // Escolhe, entre as continuações, a de maior cadeia restante (mesma lógica do primeiro passo)
      let melhor = null, melhorValor = -1;
      continuar.forEach(mov => {
        const valor = 1 + _damaMaxCadeiaRestante(DAMA.board, destino.r, destino.c, mov);
        if (valor > melhorValor) { melhorValor = valor; melhor = mov; }
      });
      _damaExecutarCadeiaIA({ r: destino.r, c: destino.c }, melhor);
    }, 450);
    return;
  }

  DAMA.travado = false;
  _damaChecarFimOuPassarTurno('jogador');
}

// =============================================================
//  FIM DE JOGO
// =============================================================
function _damaTerminar(vencedor) {
  DAMA.fim = true;
  DAMA.travado = true;
  DAMA.selecionada = null;
  DAMA.destinos = [];

  const endEl = document.getElementById('dama-endscreen');
  const iconEl = document.getElementById('dama-end-icon');
  const titleEl = document.getElementById('dama-end-title');
  const msgEl = document.getElementById('dama-end-msg');

  if (vencedor === 'jogador') {
    _damaAtualizarStatus('Você venceu a partida!', 'fim');
    const recompensa = 40 + Math.floor(Math.random() * 41); // 40–80
    if (typeof G !== 'undefined' && G.player) {
      G.player.gold = (G.player.gold || 0) + recompensa;
      if (typeof updateHUD === 'function') updateHUD();
    }
    if (typeof addReputation === 'function') addReputation(3, 'Venceu o taberneiro na dama');
    if (typeof notify === 'function') notify(`🎲 Vitória na dama! +${recompensa}◈`, 'gold');
    if (typeof addLog === 'function') addLog(`Venceu o taberneiro numa partida de dama. +${recompensa}◈.`, 'gold');

    if (iconEl) iconEl.textContent = '🏆';
    if (titleEl) titleEl.textContent = 'VOCÊ VENCEU!';
    if (msgEl) msgEl.textContent = `O taberneiro derruba a última peça com um suspiro.\n\n"Bem jogado, aventureiro." Ele empurra ◈${recompensa} sobre a mesa.`;
  } else {
    _damaAtualizarStatus('O taberneiro venceu.', 'fim');
    if (typeof notify === 'function') notify('🎲 O taberneiro venceu a partida.', 'red');
    if (typeof addLog === 'function') addLog('Perdeu uma partida de dama para o taberneiro.', 'dmg');

    if (iconEl) iconEl.textContent = '🍶';
    if (titleEl) titleEl.textContent = 'VOCÊ PERDEU';
    if (msgEl) msgEl.textContent = `O taberneiro varre suas peças da mesa com um sorriso torto.\n\n"Mais sorte na próxima, viajante."`;
  }

  if (endEl) endEl.classList.add('active');
}

function _damaDesistir() {
  if (DAMA.fim) return;
  _damaTerminar('ia');
}

// =============================================================
//  LIGAÇÕES DE EVENTOS (uma vez, quando o DOM estiver pronto)
// =============================================================
(function _damaAttachEvents() {
  function attach() {
    const board = document.getElementById('dama-board');
    if (board) board.addEventListener('click', _damaOnBoardClick);

    const closeBtn = document.getElementById('dama-overlay-close');
    if (closeBtn) closeBtn.addEventListener('click', _damaFecharOverlay);

    const desistirBtn = document.getElementById('dama-btn-desistir');
    if (desistirBtn) desistirBtn.addEventListener('click', _damaDesistir);

    const novaBtn = document.getElementById('dama-btn-nova');
    if (novaBtn) novaBtn.addEventListener('click', _damaIniciarPartida);

    const endBtn = document.getElementById('dama-end-btn');
    if (endBtn) endBtn.addEventListener('click', () => {
      document.getElementById('dama-endscreen').classList.remove('active');
      _damaFecharOverlay();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
