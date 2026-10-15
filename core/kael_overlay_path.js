// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — kael_overlay_path.js
//  Bridge file: move a imagem do overlay do Kael de Imagens/ pra
//  Imagens/personagens/, sem tocar no palDinh.js.
//  Carregar DEPOIS de core/palDinh.js no gat-1.html.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  if (typeof window._kaelShowOverlay !== 'function') {
    console.warn('[kael_overlay_path] _kaelShowOverlay não encontrado — bridge não aplicado.');
    return;
  }

  const KAEL_IMG = 'Imagens/personagens/file_00000000b900720eb63880e1dc69a359.png';

  window._kaelShowOverlay = function () {
    let ov = document.getElementById('kael-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'kael-overlay';
      ov.style.cssText = `
        position:absolute; inset:0; z-index:5; pointer-events:none;
        background-image:url('${KAEL_IMG}');
        background-size:cover; background-position:center top;
        opacity:0; transition:opacity 0.8s ease;
      `;
      document.getElementById('scene-panel')?.appendChild(ov)
        || document.querySelector('.scene-panel')?.appendChild(ov);
    }
    requestAnimationFrame(() => { ov.style.opacity = '1'; });
  };
})();
