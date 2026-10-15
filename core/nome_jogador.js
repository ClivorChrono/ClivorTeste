// =============================================================================
//  nome_jogador.js — Chronicles of Clivor
//  Sistema de nome do personagem: tela de escolha (40 nomes + sortear + nome
//  livre), helpers e token {nome} pros diálogos.
//  Carregar DEPOIS do palDinh.js e historia.js (mesmo escopo global).
//
//  API global:
//    nomeDoJogador()                 -> nome atual ('Aventureiro' se não tiver)
//    jogadorTemNome()                -> true se já tem nome de verdade
//    limparNomeJogador(texto)        -> nome tratado ('' se inválido)
//    mostrarTelaNomeJogador(cb)      -> abre a tela; cb(nome) ao confirmar
//    nomeJogadorTokens(texto)        -> troca {nome} pelo nome do jogador
// =============================================================================
(function () {
  'use strict';

  const NOME_PADRAO = 'Aventureiro';
  const MAX = 12;
  const MIN = 2;

  // 20 + 20, inspirados no Japão feudal. Evita nomes de NPCs do jogo
  // (Hiroto, Itsuki, Kumiko, Tsumugi, Kagerō, Tsukumo, Yuki, Tsuiro, Ygirro...).
  const NOMES = {
    masc: ['Haruto','Ren','Daichi','Kaito','Takeru','Souma','Raiden','Kenji','Isamu','Akira',
           'Jiro','Satoru','Ryu','Kazuki','Shiro','Tatsuya','Yoshiro','Kuro','Masaru','Noboru'],
    fem:  ['Sakura','Haruka','Akane','Hanae','Mizuki','Rin','Sayuri','Natsume','Tomoe','Kasumi',
           'Ayame','Chiyo','Midori','Shiori','Nami','Aoi','Hoshi','Tsubaki','Fuyuko','Mei'],
  };

  // Filtro simples de palavrão (normalizado, sem acento). Palavras curtas só
  // bloqueiam se forem o nome inteiro, pra não pegar nomes japoneses por engano.
  const PROIBIDAS_INTEIRAS = ['cu', 'fdp', 'pau', 'pica', 'xxt'];
  const PROIBIDAS_TRECHO = ['merda','porra','caralho','puta','buceta','viado','arrombad','cacete','bosta','foder','foda','punheta','cuzao','otario','vagabund','nazi','hitler'];

  function normalizar(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  }
  function temPalavrao(nome) {
    const n = normalizar(nome);
    if (PROIBIDAS_INTEIRAS.includes(n)) return true;
    return PROIBIDAS_TRECHO.some(p => n.includes(p));
  }

  // Letras (com acento), espaço e hífen. Sem aspas/símbolos — o nome vai parar
  // em innerHTML em vários lugares, então nada de < > & " '.
  function limparNomeJogador(txt) {
    if (typeof txt !== 'string') return '';
    let s = txt.normalize('NFC')
      .replace(/[^\p{L}\s-]/gu, '')
      .replace(/\s+/g, ' ')
      .replace(/-{2,}/g, '-')
      .trim()
      .slice(0, MAX)
      .trim();
    if (s.length < MIN || !/\p{L}/u.test(s)) return '';
    return s;
  }

  function jogadorTemNome() {
    try {
      const n = G && G.player && G.player.name;
      return !!(n && typeof n === 'string' && n.trim() && n !== NOME_PADRAO);
    } catch (e) { return false; }
  }
  function nomeDoJogador() { return jogadorTemNome() ? G.player.name : NOME_PADRAO; }

  function nomeJogadorTokens(txt) {
    if (typeof txt !== 'string' || txt.indexOf('{nome}') === -1) return txt;
    return txt.replace(/\{nome\}/gi, nomeDoJogador());
  }

  // ── CSS (injetado uma vez) ────────────────────────────────────────────────
  function injetarCss() {
    if (document.getElementById('nj-style')) return;
    const st = document.createElement('style');
    st.id = 'nj-style';
    st.textContent = `
#nj-overlay{ position:fixed; inset:0; z-index:9070; display:none; align-items:center; justify-content:center;
  background:rgba(4,4,6,0.72); opacity:0; transition:opacity .28s ease; padding:16px; box-sizing:border-box;
  -webkit-tap-highlight-color:transparent; }
#nj-overlay.nj-on{ opacity:1; }
#nj-panel{ width:100%; max-width:280px; display:flex; flex-direction:column; gap:8px;
  padding:12px 10px 10px; box-sizing:border-box; background:linear-gradient(180deg,rgba(18,16,10,0.94),rgba(8,8,10,0.96));
  border:1px solid #7a6a3f; box-shadow:0 0 30px rgba(201,162,74,0.12), inset 0 0 0 3px rgba(0,0,0,0.5);
  font-family:'Cormorant Garamond','Noto Serif JP',serif; color:#eae4d3; text-align:center; }
#nj-panel *{ box-sizing:border-box; }
#nj-title{ font-family:'Cinzel',serif; letter-spacing:.18em; text-transform:uppercase; font-size:11px; color:#e8c674; }
#nj-sub{ font-size:11px; color:#a89f8a; margin-top:-4px; }
#nj-input-wrap{ position:relative; }
#nj-input{ width:100%; padding:7px 34px 7px 8px; font-size:16px; font-family:'Cinzel','Noto Serif JP',serif;
  letter-spacing:.06em; color:#f3e7c2; background:rgba(0,0,0,0.55); border:1px solid #7a6a3f; border-radius:0;
  outline:none; text-align:center; user-select:text; -webkit-user-select:text; }
#nj-input:focus{ border-color:#e8c674; box-shadow:0 0 12px rgba(232,198,116,0.22); }
#nj-count{ position:absolute; right:6px; top:50%; transform:translateY(-50%); font-size:9px; color:#7a6a3f; font-family:'Cinzel',serif; pointer-events:none; }
#nj-row{ display:flex; gap:6px; }
.nj-btn{ flex:1; padding:7px 4px; white-space:nowrap; font-family:'Cinzel',serif; font-size:10px; letter-spacing:.08em; text-transform:uppercase;
  color:#e8c674; background:rgba(0,0,0,0.5); border:1px solid #7a6a3f; cursor:pointer; }
.nj-btn:active{ background:rgba(201,162,74,0.18); }
#nj-ok{ color:#1a1408; background:linear-gradient(180deg,#e8c674,#b8913a); border-color:#e8c674; }
#nj-ok:disabled{ opacity:.35; cursor:default; }
#nj-err{ min-height:12px; font-size:10px; color:#d9806a; }
`;
    document.head.appendChild(st);
  }

  // ── Tela ──────────────────────────────────────────────────────────────────
  let _aberta = false;

  function mostrarTelaNomeJogador(onConfirm) {
    if (_aberta) return;
    _aberta = true;
    injetarCss();

    const old = document.getElementById('nj-overlay');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'nj-overlay';
    ov.innerHTML = `
      <div id="nj-panel">
        <div id="nj-title">Qual é o seu nome?</div>
        <div id="nj-sub">Em Clivor, é por ele que vão te chamar.</div>
        <div id="nj-input-wrap">
          <input id="nj-input" type="text" maxlength="${MAX}" placeholder="Digite seu nome" autocomplete="off" autocapitalize="words" spellcheck="false">
          <span id="nj-count">0/${MAX}</span>
        </div>
        <div id="nj-err"></div>
        <div id="nj-row">
          <button class="nj-btn" id="nj-dice" type="button">🎲 Sortear</button>
          <button class="nj-btn" id="nj-ok" type="button" disabled>Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const input = ov.querySelector('#nj-input');
    const count = ov.querySelector('#nj-count');
    const err   = ov.querySelector('#nj-err');
    const ok    = ov.querySelector('#nj-ok');
    let sorteando = false;
    let confirmado = false;

    function validar() {
      const limpo = limparNomeJogador(input.value);
      count.textContent = input.value.length + '/' + MAX;
      let msg = '';
      if (input.value.trim() && !limpo) msg = 'Use pelo menos 2 letras.';
      else if (limpo && temPalavrao(limpo)) msg = 'Esse nome não pode. Escolha outro.';
      err.textContent = msg;
      ok.disabled = !limpo || !!msg;
    }

    // Sorteia entre os 40 nomes (a lista não aparece na tela).
    ov.querySelector('#nj-dice').onclick = () => {
      if (sorteando) return;
      sorteando = true;
      const todos = NOMES.masc.concat(NOMES.fem);
      const final = todos[Math.floor(Math.random() * todos.length)];
      let t = 0;
      const iv = setInterval(() => {
        t++;
        if (t >= 7) {
          clearInterval(iv);
          input.value = final;
          validar();
          sorteando = false;
        } else {
          input.value = todos[Math.floor(Math.random() * todos.length)];
          count.textContent = input.value.length + '/' + MAX;
        }
      }, 70);
    };

    input.addEventListener('input', validar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } });

    function confirmar() {
      if (confirmado || ok.disabled) return;
      const nome = limparNomeJogador(input.value);
      if (!nome || temPalavrao(nome)) { validar(); return; }
      confirmado = true;
      ov.classList.remove('nj-on');
      setTimeout(() => { ov.remove(); _aberta = false; }, 280);
      if (typeof onConfirm === 'function') onConfirm(nome);
    }
    ok.onclick = confirmar;

    validar();
    ov.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('nj-on')));
  }

  window.NOMES_JOGADOR = NOMES;
  window.nomeDoJogador = nomeDoJogador;
  window.jogadorTemNome = jogadorTemNome;
  window.limparNomeJogador = limparNomeJogador;
  window.mostrarTelaNomeJogador = mostrarTelaNomeJogador;
  window.nomeJogadorTokens = nomeJogadorTokens;
})();
