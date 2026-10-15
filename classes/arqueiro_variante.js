// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — classes/arqueiro_variante.js
//  Ponte (bridge): depois de escolher a classe Arqueiro, o jogador
//  escolhe entre ARQUEIRO e ARQUEIRA. Cada um usa o seu sprite sheet
//  (3 quadros lado a lado: parado, preparo, ataque).
//
//  Não mexe em palDinh.js: embrulha selectClass, confirmClass,
//  mostrarTelaNomeJogador e buildHeroVisual.
//  Carregar DEPOIS de palDinh.js, historia.js e nome_jogador.js
//  (pode ficar junto do classes/totens.js).
//
//  A escolha fica em G.player.arqueiroVariante ('arqueiro'|'arqueira')
//  e vai junto no save. Saves antigos sem o campo = Arqueiro.
//
//  Pra trocar qual imagem é de quem, edite só VARIANTES abaixo.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  const VARIANTES = {
    arqueiro: { nome: 'Arqueiro', src: 'Imagens/personagens/Arqueiro/arqueiro.png' },
    arqueira: { nome: 'Arqueira', src: 'Imagens/personagens/Arqueiro/7.png' },
  };
  const COLS = 3, ROWS = 1;     // 3 quadros lado a lado
  const ALPHA = 24;             // pixel com alpha acima disso conta como "desenho"
  const PROVISORIO = { W: 1536, H: 1024, posY: 200, dispH: 560 }; // medidas do sheet antigo, só até medir o novo

  const temG = () => (typeof G !== 'undefined' && G && G.player);

  // ── Mede o sheet: onde o personagem começa/termina (nos 3 quadros) ──
  // Assim o enquadramento fica certo sem depender de números chutados,
  // e nada do quadro vizinho entra no recorte.
  // INICIO-analisar
  function analisar(data, W, H, cols) {
    const fw = Math.floor(W / cols);
    let top = H, bottom = -1, opacos = 0;
    const quadros = [];
    for (let c = 0; c < cols; c++) {
      let minX = fw, maxX = -1, minY = H, maxY = -1;
      for (let y = 0; y < H; y++) {
        let n = 0, xa = -1, xb = -1;
        for (let x = 0; x < fw; x++) {
          if (data[(y * W + c * fw + x) * 4 + 3] > ALPHA) { n++; if (xa < 0) xa = x; xb = x; }
        }
        if (n >= 2) {
          opacos += n;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (xa < minX) minX = xa; if (xb > maxX) maxX = xb;
        }
      }
      quadros.push({ minX, maxX, minY, maxY });
      if (maxY >= 0) { if (minY < top) top = minY; if (maxY > bottom) bottom = maxY; }
    }
    // imagem sem transparência (ou vazia): não dá pra medir → quadro inteiro
    if (bottom < 0 || opacos > W * H * 0.9) return { posY: 0, dispH: H, quadros: null };
    top = Math.max(0, top - 2); bottom = Math.min(H - 1, bottom + 2);
    return { posY: top, dispH: bottom - top + 1, quadros };
  }
  // FIM-analisar

  const _medidas = {};   // id -> {im,W,H,fw,posY,dispH,quadros}
  const _promessas = {};
  function medir(id) {
    if (_promessas[id]) return _promessas[id];
    _promessas[id] = new Promise(function (resolve) {
      const v = VARIANTES[id];
      const im = new Image();
      im.onload = function () {
        const W = im.naturalWidth, H = im.naturalHeight;
        let r = { posY: 0, dispH: H, quadros: null };
        try {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(im, 0, 0);
          r = analisar(x.getImageData(0, 0, W, H).data, W, H, COLS);
        } catch (e) { /* canvas bloqueado: segue com o quadro inteiro */ }
        _medidas[id] = { im: im, W: W, H: H, fw: Math.floor(W / COLS), posY: r.posY, dispH: r.dispH, quadros: r.quadros };
        console.log('[arqueiro_variante] ' + id + ' ' + W + 'x' + H + ' posY=' + r.posY + ' altura=' + r.dispH);
        resolve(_medidas[id]);
      };
      im.onerror = function () { console.warn('[arqueiro_variante] não achei ' + v.src); resolve(null); };
      im.src = v.src;
    });
    return _promessas[id];
  }

  function spriteDe(id, m) {
    return {
      src: VARIANTES[id].src,
      totalW: m.W, bgH: m.H, posY: m.posY, cols: COLS, rows: ROWS, displayH: m.dispH,
      anims: {
        idle:    { row: 0, startCol: 0, frames: 1, fps: 2 },
        prepare: { row: 0, startCol: 1, frames: 1, fps: 4 },
        attack:  { row: 0, startCol: 2, frames: 1, fps: 4 },
        defend:  { row: 0, startCol: 0, frames: 1, fps: 2 },
        hit:     { row: 0, startCol: 0, frames: 1, fps: 2 },
        hit2:    { row: 0, startCol: 0, frames: 1, fps: 2 },
        recover: { row: 0, startCol: 0, frames: 1, fps: 2 },
      },
    };
  }

  function entradasArqueiro() {
    const alvos = [];
    (window.CLASSES || []).forEach(function (c) { if (c && c.id === 'arqueiro') alvos.push(c); });
    if (temG() && G.player.classData && G.player.classData.id === 'arqueiro' && alvos.indexOf(G.player.classData) < 0) alvos.push(G.player.classData);
    if (typeof CLASS_ARQUEIRO !== 'undefined' && alvos.indexOf(CLASS_ARQUEIRO) < 0) alvos.push(CLASS_ARQUEIRO);
    return alvos;
  }

  function varianteAtual() {
    if (!temG() || G.player.class !== 'arqueiro') return null;
    return G.player.arqueiroVariante === 'arqueira' ? 'arqueira' : 'arqueiro';
  }

  function redesenharHeroi() {
    const ov = document.getElementById('battle-overlay');
    const el = document.getElementById('bat-hero-icon');
    if (ov && ov.classList.contains('active') && el && typeof buildHeroVisual === 'function') el.innerHTML = buildHeroVisual(90, 'idle');
  }

  // Aplica o sprite/nome da variante do jogador na classe Arqueiro
  function aplicar() {
    const id = varianteAtual();
    const alvos = entradasArqueiro();
    if (!id) { alvos.forEach(function (c) { c.name = VARIANTES.arqueiro.nome; }); return; } // jogando outra classe: nome padrão no anel
    const m = _medidas[id];
    const sp = spriteDe(id, m || PROVISORIO);
    alvos.forEach(function (c) { c.sprite = sp; c.name = VARIANTES[id].nome; });
    if (!m) medir(id).then(function (mm) { if (mm && varianteAtual() === id) { aplicar(); redesenharHeroi(); } });
  }

  // ── Tela de escolha (layout "Portal dividido": metade da tela pra cada um) ──
  let _estilo = false;
  function injetarEstilo() {
    if (_estilo) return; _estilo = true;
    const st = document.createElement('style');
    st.textContent = `
#arq-var-overlay{position:fixed;inset:0;z-index:100001;display:flex;background:#0a0f1e;opacity:0;transition:opacity .25s ease;
  font-family:'Noto Serif JP',serif;color:#e9edf7;overflow:hidden;}
#arq-var-overlay.on{opacity:1;}
.arq-half{flex:1 1 0;min-width:0;border:0;color:inherit;font-family:inherit;opacity:.5;cursor:pointer;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:40px 0 0;
  transition:flex .35s ease,opacity .35s ease;-webkit-tap-highlight-color:transparent;}
.arq-half.a{border-right:1px solid rgba(226,207,154,.5);background:radial-gradient(ellipse at 50% 70%,rgba(110,150,230,.26),transparent 70%);}
.arq-half.b{background:radial-gradient(ellipse at 50% 70%,rgba(230,190,120,.26),transparent 70%);}
.arq-half.sel{flex:1.55 1 0;opacity:1;}
.arq-half canvas,.arq-half .arq-var-emoji{height:min(44vh,320px);width:auto;max-width:92%;object-fit:contain;transform:scale(.92);
  transition:transform .35s ease;filter:drop-shadow(0 0 10px rgba(200,160,10,.5));}
.arq-half.sel canvas,.arq-half.sel .arq-var-emoji{transform:scale(1.08);}
.arq-half .arq-var-emoji{font-size:4rem;display:flex;align-items:center;}
.arq-half .nm{font-size:1rem;letter-spacing:5px;color:#f3e6bd;}
#arq-var-title{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 44px);text-align:center;pointer-events:none;
  font-size:.78rem;letter-spacing:6px;color:#e2cf9a;}
#arq-var-title i{display:block;width:9px;height:9px;background:#e2cf9a;transform:rotate(45deg);margin:14px auto 0;}
#arq-var-mid{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;background:#0a0f1e;
  border:1px solid #e2cf9a;transform:rotate(45deg);pointer-events:none;}
#arq-var-ok{position:absolute;left:50%;margin-left:-110px;width:220px;height:54px;bottom:calc(env(safe-area-inset-bottom,0px) + var(--clv-fs-bottom,0px) + 40px);
  background:#0a0f1e;border:1px solid #e2cf9a;color:#f3e6bd;font-family:inherit;font-size:.95rem;letter-spacing:6px;cursor:pointer;}
#arq-var-ok:active{background:rgba(226,207,154,.2);}
.arq-half:focus-visible,#arq-var-ok:focus-visible{outline:2px solid #e2cf9a;outline-offset:-4px;}`;
    document.head.appendChild(st);
  }

  function criarPreview(id) {
    const m = _medidas[id];
    if (!m) { const d = document.createElement('div'); d.className = 'arq-var-emoji'; d.textContent = '🏹'; return d; }
    const q = m.quadros && m.quadros[0];
    const sx = q ? q.minX : 0, sw = q ? (q.maxX - q.minX + 1) : m.fw;
    const cv = document.createElement('canvas');
    cv.width = sw; cv.height = m.dispH;
    cv.getContext('2d').drawImage(m.im, sx, m.posY, sw, m.dispH, 0, 0, sw, m.dispH);
    return cv;
  }

  function abrirEscolha(aoEscolher) {
    injetarEstilo();
    const antigo = document.getElementById('arq-var-overlay'); if (antigo) antigo.remove();
    const ov = document.createElement('div');
    ov.id = 'arq-var-overlay';
    document.body.appendChild(ov);

    const espera = Promise.all([medir('arqueiro'), medir('arqueira')]);
    const limite = new Promise(function (r) { setTimeout(r, 3000); });
    Promise.race([espera, limite]).then(function () {
      try {
      let sel = 'arqueiro';
      const metades = {};
      ['arqueiro', 'arqueira'].forEach(function (id, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', VARIANTES[id].nome);
        b.appendChild(criarPreview(id));
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = VARIANTES[id].nome.toUpperCase();
        b.appendChild(nm);
        b.addEventListener('click', function () { sel = id; atualizar(); });
        metades[id] = { el: b, lado: i === 0 ? 'a' : 'b' };
        ov.appendChild(b);
      });
      function atualizar() {
        Object.keys(metades).forEach(function (id) {
          metades[id].el.className = 'arq-half ' + metades[id].lado + (id === sel ? ' sel' : '');
          metades[id].el.setAttribute('aria-pressed', id === sel ? 'true' : 'false');
        });
      }
      atualizar();

      const titulo = document.createElement('div'); titulo.id = 'arq-var-title';
      titulo.textContent = 'QUEM EMPUNHA O ARCO?';
      titulo.appendChild(document.createElement('i'));
      ov.appendChild(titulo);
      const mid = document.createElement('div'); mid.id = 'arq-var-mid'; ov.appendChild(mid);

      const ok = document.createElement('button');
      ok.id = 'arq-var-ok'; ok.type = 'button'; ok.textContent = 'CONFIRMAR';
      ok.addEventListener('click', function () {
        if (ok._ok) return; ok._ok = true;
        ov.style.opacity = '0';
        setTimeout(function () { ov.remove(); }, 260);
        aoEscolher(sel);
      });
      ov.appendChild(ok);
      requestAnimationFrame(function () { ov.className = 'on'; ov.setAttribute('id', 'arq-var-overlay'); });
      } catch (err) {
        console.warn('[arqueiro_variante] falha ao montar a tela de escolha:', err);
        ov.remove(); aoEscolher('arqueiro');
      }
    });
  }

  // ── Fluxo: classe → (Arqueiro/Arqueira) → nome → entrar ──
  let _emSelecao = false, _escolhido = false, _abrindo = false, _pendente = null;

  function garantir(cb) {
    console.log('[arqueiro_variante] garantir:', { emSelecao: _emSelecao, classe: temG() ? G.selectedClass : null, escolhido: _escolhido });
    if (!_emSelecao || !temG() || G.selectedClass !== 'arqueiro' || _escolhido) { cb(); return; }
    if (_abrindo) return;
    _abrindo = true;
    abrirEscolha(function (id) { _pendente = id; _escolhido = true; _abrindo = false; cb(); });
  }

  function embrulhar() {
    const selOrig = window.selectClass;
    if (typeof selOrig === 'function') {
      window.selectClass = function (id) {
        _emSelecao = true; _escolhido = false; _abrindo = false; _pendente = null;
        return selOrig.apply(this, arguments);
      };
    }
    const nomeOrig = window.mostrarTelaNomeJogador;
    if (typeof nomeOrig === 'function') {
      window.mostrarTelaNomeJogador = function () {
        const self = this, args = arguments;
        garantir(function () { nomeOrig.apply(self, args); });
      };
    }
    const confOrig = window.confirmClass;
    if (typeof confOrig === 'function') {
      window.confirmClass = function () {
        const self = this, args = arguments;
        garantir(function () {
          const r = confOrig.apply(self, args);
          if (temG() && G.player.class === 'arqueiro') {
            G.player.arqueiroVariante = _pendente || 'arqueiro';
            aplicar();
          }
          _emSelecao = false; _escolhido = false; _pendente = null;
          return r;
        });
      };
    }
    const bhvOrig = window.buildHeroVisual;
    if (typeof bhvOrig === 'function') {
      window.buildHeroVisual = function () {
        if (varianteAtual()) aplicar();
        return bhvOrig.apply(this, arguments);
      };
    }
  }
  embrulhar();
  console.log('[arqueiro_variante] ganchos:', { selectClass: typeof window.selectClass, nome: typeof window.mostrarTelaNomeJogador, confirmClass: typeof window.confirmClass, buildHeroVisual: typeof window.buildHeroVisual });

  // Rede de segurança: arqueiro sem escolha feita (save antigo, ou o fluxo da
  // criação não passou pelos ganchos) escolhe uma vez, já dentro do jogo.
  function verificarPendente() {
    if (_abrindo || !temG() || G.player.class !== 'arqueiro' || G.player.arqueiroVariante) return;
    if (G.inBattle) return;
    const tela = document.getElementById('screen-game');
    if (!tela || !tela.classList.contains('active')) return;
    if (document.getElementById('arq-var-overlay')) return;
    _abrindo = true;
    abrirEscolha(function (id) {
      _abrindo = false;
      G.player.arqueiroVariante = id;
      aplicar(); redesenharHeroi();
    });
  }

  // Saves carregados: mantém sprite/nome certos (e mede o sheet antes da 1ª batalha)
  setInterval(function () { aplicar(); verificarPendente(); }, 1500);
  aplicar();

  window.ArqueiroVariante = { aplicar: aplicar, VARIANTES: VARIANTES };
  console.log('✓ Arqueiro/Arqueira (arqueiro_variante.js) carregado');
})();
