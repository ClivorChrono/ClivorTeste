// ─────────────────────────────────────────────────────────────
//  inazami_aviso_fusao.js
//  Avisa o jogador quando os 3 fragmentos do amuleto de Inazami
//  estão completos:
//    1) badge pulsante no botão da Bolsa (some ao fundir)
//    2) uma fala única da Inazami (toast), disparada só 1x
//
//  Não mexe em nada existente — só observa updateHUD().
//  Carregar DEPOIS de palDinh.js e inazami_completo.js.
// ─────────────────────────────────────────────────────────────

(function () {
  const FRAGMENTOS = ['amuleto_quebrado_inazami', 'amuleto_fragmento_eir', 'fragmento_amuleto_final'];
  const AMULETO_PRONTO = 'amuleto_completo_inazami';

  function _injectCSS() {
    if (document.getElementById('inazami-fusao-badge-css')) return;
    const st = document.createElement('style');
    st.id = 'inazami-fusao-badge-css';
    st.textContent = `
      #tut-target-bolsa.fusao-pendente {
        position: relative;
        animation: fusao-pendente-pulse 1.8s ease-in-out infinite;
      }
      #tut-target-bolsa.fusao-pendente::after {
        content: '🔥';
        position: absolute; top: -6px; right: -6px;
        font-size: 0.7rem; line-height: 1;
      }
      @keyframes fusao-pendente-pulse {
        0%,100% { box-shadow: 0 0 8px rgba(255,110,40,0.55); }
        50%     { box-shadow: 0 0 18px rgba(255,110,40,0.95); }
      }
    `;
    document.head.appendChild(st);
  }

  function _checarFusaoAmuleto() {
    const btn = document.getElementById('tut-target-bolsa');
    if (!btn || typeof _getItemQty !== 'function') return;

    const temTodos  = FRAGMENTOS.every(id => _getItemQty(id) >= 1);
    const jaFundiu  = _getItemQty(AMULETO_PRONTO) >= 1;
    const pendente  = temTodos && !jaFundiu;

    btn.classList.toggle('fusao-pendente', pendente);

    if (!window.G) return;
    G.inazami = G.inazami || {};

    if (pendente && !G.inazami.avisoFusaoDado) {
      G.inazami.avisoFusaoDado = true;
      if (typeof notify === 'function') {
        notify('🔥 Inazami: "Os três fragmentos estão com você agora... leve-os à bolsa e funda-os."', 'gold');
      }
    }

    // Se o jogador perder os fragmentos de algum jeito antes de fundir
    // (ex.: rollback de save), permite o aviso disparar de novo depois.
    if (!temTodos) G.inazami.avisoFusaoDado = false;
  }

  function _instalarHook() {
    if (typeof updateHUD !== 'function') { setTimeout(_instalarHook, 200); return; }
    _injectCSS();
    const _original = window.updateHUD;
    window.updateHUD = function (...args) {
      const r = _original.apply(this, args);
      _checarFusaoAmuleto();
      return r;
    };
    // roda uma vez já de cara, caso o jogador já tenha tudo ao carregar o save
    _checarFusaoAmuleto();
  }

  _instalarHook();
})();
