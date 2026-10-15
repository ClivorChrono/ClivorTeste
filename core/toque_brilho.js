// ══════════════════════════════════════════════════════════════
//  TOQUE COM BRILHO — pequena "frescura" visual: um brilho dourado
//  se expande e algumas faíscas se espalham no ponto exato onde o
//  dedo (ou clique) toca a tela. Puramente cosmético, funciona em
//  qualquer tela do jogo (menu, vilarejo, batalha etc).
//  Bridge file — não mexe em palDinh.js nem em nenhum outro core.
// ══════════════════════════════════════════════════════════════
(function () {
  if (typeof document === 'undefined') return;

  const CSS = `
    .toque-brilho-fx{
      position:fixed; left:0; top:0; width:0; height:0;
      pointer-events:none; z-index:9999;
      transform:translate(-50%,-50%);
    }
    .toque-brilho-anel{
      position:absolute; left:0; top:0; width:14px; height:14px;
      margin:-7px 0 0 -7px; border-radius:50%;
      border:1.5px solid rgba(240,192,64,0.85);
      box-shadow:0 0 10px rgba(240,192,64,0.6), inset 0 0 6px rgba(240,192,64,0.4);
      animation: toqueBrilhoAnel 0.55s cubic-bezier(.2,.7,.3,1) forwards;
    }
    .toque-brilho-nucleo{
      position:absolute; left:0; top:0; width:8px; height:8px;
      margin:-4px 0 0 -4px; border-radius:50%;
      background:radial-gradient(circle, rgba(255,240,200,0.95) 0%, rgba(240,192,64,0.6) 55%, transparent 75%);
      animation: toqueBrilhoNucleo 0.4s ease-out forwards;
    }
    .toque-brilho-faisca{
      position:absolute; left:0; top:0; width:4px; height:4px;
      margin:-2px 0 0 -2px; border-radius:50%;
      background:#f0c040; box-shadow:0 0 5px rgba(240,192,64,0.9);
      animation: toqueBrilhoFaisca 0.55s ease-out forwards;
    }
    @keyframes toqueBrilhoAnel{
      0%{ width:6px; height:6px; margin:-3px 0 0 -3px; opacity:0.9; }
      100%{ width:46px; height:46px; margin:-23px 0 0 -23px; opacity:0; }
    }
    @keyframes toqueBrilhoNucleo{
      0%{ opacity:0.9; transform:scale(1); }
      100%{ opacity:0; transform:scale(2.2); }
    }
    @keyframes toqueBrilhoFaisca{
      0%{ opacity:1; transform:translate(0,0) scale(1); }
      100%{ opacity:0; transform:translate(var(--tbx), var(--tby)) scale(0.3); }
    }
  `;
  const style = document.createElement('style');
  style.id = 'toque-brilho-css';
  style.textContent = CSS;
  document.head.appendChild(style);

  const N_FAISCAS = 5;

  function spawnToqueBrilho(x, y) {
    const wrap = document.createElement('div');
    wrap.className = 'toque-brilho-fx';
    wrap.style.left = x + 'px';
    wrap.style.top = y + 'px';

    const anel = document.createElement('div');
    anel.className = 'toque-brilho-anel';
    wrap.appendChild(anel);

    const nucleo = document.createElement('div');
    nucleo.className = 'toque-brilho-nucleo';
    wrap.appendChild(nucleo);

    for (let i = 0; i < N_FAISCAS; i++) {
      const ang = (Math.PI * 2 * i) / N_FAISCAS + (Math.random() * 0.6 - 0.3);
      const dist = 18 + Math.random() * 16;
      const faisca = document.createElement('div');
      faisca.className = 'toque-brilho-faisca';
      faisca.style.setProperty('--tbx', Math.round(Math.cos(ang) * dist) + 'px');
      faisca.style.setProperty('--tby', Math.round(Math.sin(ang) * dist) + 'px');
      wrap.appendChild(faisca);
    }

    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 600);
  }

  document.addEventListener('pointerdown', (e) => {
    spawnToqueBrilho(e.clientX, e.clientY);
  }, { passive: true });
})();


// ══════════════════════════════════════════════════════════════
//  SELO "NOVO" NA BOLSA — um selinho pequeno no canto de cada item
//  que você acabou de conseguir (item novo ou mais unidades dele).
//  Ao tocar no item o selo some. Depende só do data-item-id que o
//  bag.js coloca em cada slot (modo Lista e modo Grade).
//  O estado fica em G.player._bagNovos (vai junto com o save).
// ══════════════════════════════════════════════════════════════
(function () {
  if (typeof document === 'undefined') return;

  const st = document.createElement('style');
  st.id = 'bag-novo-css';
  st.textContent = `
    .bag-novo-tag{
      position:absolute; top:1px; right:1px; z-index:3; pointer-events:none;
      font:700 0.4rem/1 'Noto Sans JP',sans-serif; letter-spacing:0.5px;
      color:#1a0f00; background:linear-gradient(180deg,#ffe38a,#f0c040);
      padding:1px 3px; border-radius:2px;
      box-shadow:0 0 5px rgba(240,192,64,0.7);
      animation:bagNovoPulse 1.6s ease-in-out infinite;
    }
    @keyframes bagNovoPulse{ 0%,100%{opacity:1} 50%{opacity:0.65} }
  `;
  document.head.appendChild(st);

  function player() {
    try { return (typeof G !== 'undefined' && G && G.player) ? G.player : null; } catch (e) { return null; }
  }
  function estado() {
    const p = player();
    if (!p) return null;
    if (!p._bagNovos) p._bagNovos = { base: null, novos: {} };
    return p._bagNovos;
  }
  function contar(p) {
    const m = {};
    (p.inventory || []).forEach(it => {
      if (it && it.id) m[it.id] = (m[it.id] || 0) + (it.qty || 1);
    });
    return m;
  }

  // Compara a bolsa de agora com a última foto: o que aumentou vira "novo".
  function atualizar() {
    const p = player(), s = estado();
    if (!p || !s) return null;
    const atual = contar(p);
    if (!s.base) {                       // primeira foto: não marca nada
      if (Object.keys(atual).length) s.base = atual;
      return s;
    }
    Object.keys(atual).forEach(id => { if (atual[id] > (s.base[id] || 0)) s.novos[id] = true; });
    Object.keys(s.novos).forEach(id => { if (!atual[id]) delete s.novos[id]; });
    s.base = atual;
    return s;
  }

  function decorar() {
    const s = atualizar();
    const lista = document.getElementById('bag-item-list');
    if (!s || !lista) return;
    lista.querySelectorAll('[data-item-id]').forEach(el => {
      const tag = el.querySelector(':scope > .bag-novo-tag');
      if (s.novos[el.dataset.itemId]) {
        if (!tag) {
          const t = document.createElement('span');
          t.className = 'bag-novo-tag';
          t.textContent = 'NOVO';
          el.appendChild(t);
        }
      } else if (tag) {
        tag.remove();
      }
    });
  }

  // Tocou no item → o "NOVO" some (captura: roda antes do clique do slot)
  document.addEventListener('click', function (e) {
    const el = e.target && e.target.closest ? e.target.closest('#bag-item-list [data-item-id]') : null;
    if (!el) return;
    const s = estado();
    if (s && s.novos[el.dataset.itemId]) {
      delete s.novos[el.dataset.itemId];
      const tag = el.querySelector(':scope > .bag-novo-tag');
      if (tag) tag.remove();
    }
  }, true);

  // Embrulha as funções que desenham a bolsa (Lista e Grade)
  function embrulhar() {
    ['buildBagItems', 'buildBagItemsGrade'].forEach(nome => {
      const o = window[nome];
      if (typeof o !== 'function' || o._novoTag) return;
      const w = function () {
        const r = o.apply(this, arguments);
        try { decorar(); } catch (e) {}
        return r;
      };
      w._novoTag = true;
      window[nome] = w;
    });
  }
  if (document.readyState === 'complete') embrulhar();
  else window.addEventListener('load', embrulhar);

  // Foto periódica: pega itens ganhos mesmo com a bolsa fechada
  setInterval(function () { try { atualizar(); } catch (e) {} }, 1500);
})();
