// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — core/tela_cheia_fix.js
//  Em tela cheia (Android), os botões de baixo — batalha e narrador —
//  ficavam colados na borda inferior, onde o gesto do sistema "come"
//  o toque. Aqui reservamos uma faixa livre embaixo e usamos a altura
//  REAL visível (innerHeight), que no Chrome muda ao entrar/sair de
//  tela cheia.
//
//  Se ainda ficar baixo/alto demais, ajuste só o número abaixo.
//  Carregar em qualquer ponto depois do gat-1.html montar a página.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  const FAIXA_BAIXO = 56; // px livres embaixo em tela cheia (gesto do Android)

  const st = document.createElement('style');
  st.textContent = `
html.clv-fs{ --clv-fs-bottom:${FAIXA_BAIXO}px; }
html.clv-fs #battle-overlay{
  height:var(--clv-vh,100dvh) !important; bottom:auto !important;
  padding-bottom:calc(var(--clv-fs-bottom) + env(safe-area-inset-bottom,0px)) !important;
}
html.clv-fs #screen-game.active,
html.clv-fs body:has(#screen-game.active){ height:var(--clv-vh,100dvh) !important; }
html.clv-fs #interaction-panel{
  box-sizing:border-box;
  padding-bottom:calc(var(--clv-fs-bottom) + env(safe-area-inset-bottom,0px)) !important;
}`;
  document.head.appendChild(st);

  const root = document.documentElement;

  function emTelaCheia() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    try { return !!(window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches); } catch (e) { return false; }
  }

  function atualizar() {
    root.style.setProperty('--clv-vh', window.innerHeight + 'px');
    root.classList.toggle('clv-fs', emTelaCheia());
  }

  // O Chrome redimensiona a janela um pouco DEPOIS do evento de tela cheia:
  // mede de novo algumas vezes pra pegar a altura final.
  function atualizarComAtraso() {
    atualizar();
    [150, 400, 900].forEach(function (ms) { setTimeout(atualizar, ms); });
  }

  document.addEventListener('fullscreenchange', atualizarComAtraso);
  document.addEventListener('webkitfullscreenchange', atualizarComAtraso);
  window.addEventListener('resize', atualizar);
  window.addEventListener('orientationchange', atualizarComAtraso);
  atualizar();

  console.log('✓ Ajuste de tela cheia (tela_cheia_fix.js) carregado');
})();
