// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — save_shim.js
//  Bridge file: o palDinh.js chama saveGame() em vários pontos
//  (equipar skill, etc.) mas essa função nunca foi definida —
//  só existe manualSave(). Este shim cria o alias que falta,
//  sem tocar no palDinh.js.
//  Carregar DEPOIS de core/palDinh.js no gat-1.html.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  if (typeof window.saveGame === 'function') return; // já existe — não sobrescreve
  window.saveGame = function () {
    if (typeof window.manualSave === 'function') {
      window.manualSave();
    } else {
      console.warn('[save_shim] manualSave() não encontrado — não foi possível salvar.');
    }
  };
})();
