// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — selos_imgsrc_fix.js
//  Remapeia o imgSrc dos Selos/Runas pros nomes de arquivo
//  organizados (ver tabela abaixo). Não muda nenhum efeito/bônus
//  — só o caminho da imagem.
//
//  Precisa carregar DEPOIS de palDinh.js no gat-1.html (só assim
//  ITEM_DB já existe pra ser sobrescrito).
//
//  ✔ VERIFICADO EM 2026-10-02: este script JÁ está incluído em
//  gat-1.html (<script src="core/selos_imgsrc_fix.js?v=...">, logo
//  depois de bestiario/notificacoes e antes de selos_mago_novos.js),
//  carregando depois do palDinh.js. A nota antiga de que ele "ainda
//  não estava incluído" não vale mais.
//
//  Nome antigo → novo, todos agora em Imagens/icones/selos/:
//    RuneN.png (estava em Imagens/icones/)      → selo_forca.png
//    Picsart_26-07-06_19-13-05-694.png          → runa_yu.png
//    Picsart_26-08-16_03-08-10-918.png          → selo_inn.png
//    Picsart_26-08-16_02-55-04-540.png          → selo_vale.png
//    Picsart_26-08-16_03-08-24-959.png          → selo_ancorado.png
//    Picsart_26-08-16_03-07-53-380.png          → selo_inde.png
//    Picsart_26-08-16_03-42-32-690.png          → selo_limiar.png
//    Picsart_26-08-16_03-43-31-452.png          → selo_bastiao.png
//    (sem imgSrc, só emoji ⚫)                    → runi65.png  (runa_vazio)
//
//  Os 2 novos Selos do Mago (selo_convicao_arcana, selo_fluxo_arcano
//  — ver selos_mago_novos.js) já nascem com o imgSrc final certo,
//  sem nome antigo pra remapear. Estão listados aqui só como
//  referência central de onde os PNGs de Selo moram no projeto.
// ══════════════════════════════════════════════════════════════

'use strict';

const SELOS_IMG_BASE = 'Imagens/icones/selos/';

const _SELOS_IMGSRC_MAP = {
  selo_forca:    'selo_forca.png',
  runa_yu:       'runa_yu.png',
  selo_inn:      'selo_inn.png',
  selo_vale:     'selo_vale.png',
  selo_ancorado: 'selo_ancorado.png',
  selo_inde:     'selo_inde.png',
  selo_limiar:   'selo_limiar.png',
  selo_bastiao:  'selo_bastiao.png',
  runa_vazio:    'runi65.png',
  // ── Novos (referência — já corretos na origem, ver nota acima) ──
  selo_convicao_arcana: 'selo_convicao_arcana.png',
  selo_fluxo_arcano:    'selo_fluxo_arcano.png',
};

Object.keys(_SELOS_IMGSRC_MAP).forEach(id => {
  if (ITEM_DB[id]) {
    ITEM_DB[id].imgSrc = SELOS_IMG_BASE + _SELOS_IMGSRC_MAP[id];
  } else {
    console.warn(`[selos_imgsrc_fix] ITEM_DB.${id} não encontrado — checar se o id mudou.`);
  }
});

// ── Refresh em tempo real dos selos JÁ guardados/equipados ──
// O loadGame só corrige o imgSrc ao carregar o save. Aqui garantimos que,
// toda vez que a Bolsa de Selos é desenhada ou um popup de selo abre, o
// imgSrc venha do ITEM_DB atual (sem precisar recarregar o save).
function _selosRefreshImgSrc() {
  try {
    if (typeof G === 'undefined' || !G || !G.player) return;
    [].concat(G.player.selosGuardados || [], G.player.selosEquipados || []).forEach(s => {
      const base = ITEM_DB[s.id];
      if (base && base.imgSrc && s.imgSrc !== base.imgSrc) s.imgSrc = base.imgSrc;
    });
  } catch (e) { console.warn('[selos_imgsrc_fix] refresh falhou', e); }
}
['buildBolsaSelos', 'showSeloInfo'].forEach(nome => {
  const orig = window[nome];
  if (typeof orig !== 'function') return;
  window[nome] = function () { _selosRefreshImgSrc(); return orig.apply(this, arguments); };
});
_selosRefreshImgSrc();
console.log('[selos_imgsrc_fix] ok — runa_vazio =', ITEM_DB.runa_vazio && ITEM_DB.runa_vazio.imgSrc);

// ── Compensa a margem transparente do runi65.png ──
// O PNG tem espaço vazio em volta do disco, então ele aparece menor que os
// outros selos. Aumenta só essa imagem (slot, bolsa, popup e loot).
// Se um dia você cortar a margem do PNG, é só apagar este bloco.
(function () {
  if (document.getElementById('selos-runi65-scale')) return;
  const st = document.createElement('style');
  st.id = 'selos-runi65-scale';
  st.textContent = 'img[src*="runi65.png"]{transform:scale(1.3);transform-origin:center;}';
  document.head.appendChild(st);
})();
