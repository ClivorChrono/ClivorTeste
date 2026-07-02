// =============================================================
//  TEMPLO_VAZIO_ECOANTE.JS — Chronicles of Clivor
//  Masmorra 1 de 6 — O Templo do Vazio Ecoante
//  Depende de: palDinh.js (G, setScene, setStory, notify, addLog)
//              vilarejo.js (registerDungeon, storyNode_torre, storyNode_vilarejo)
//
//  Este arquivo cuida apenas desta masmorra. As fases serão
//  adicionadas aqui, uma de cada vez, conforme forem feitas.
//  Por enquanto ainda não é possível entrar — só o card na
//  Torre das Masmorras está implementado.
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. DADOS DA MASMORRA
// ─────────────────────────────────────────────────────────────
const TEMPLO_VAZIO_ECOANTE = {
  id:          'temploVazioEcoante',
  ordem:       1,
  nome:        'O Templo do Vazio Ecoante',
  bossIcon:    'Imagens/icones/garrio.png',
  bossNome:    '???',
  dificuldade: 'A definir',
  descricao:   'Ruínas esquecidas onde o silêncio ganhou voz própria. Dizem que os ecos ali dentro repetem os últimos gritos de quem se perdeu — e que algo, no fundo do templo, ainda escuta.',
  status:      'em_construcao', // em_construcao | disponivel

  // Exibidos no popup da Torre — preencher conforme o design for definido
  stats: [
    { label: 'Dificuldade',  value: 'A definir' },
    { label: 'Fases',        value: '???' },
    { label: 'Chefe',        value: '???' },
    { label: 'Recompensa',   value: '???' },
  ],

  fases: [
    // Fase a fase, conforme forem criadas.
  ],

  // Chamado ao tocar em "Entrar na Masmorra" na Torre.
  // Ainda não implementado — apenas o card existe por enquanto.
  entrar() {
    notify('🕳️ O Templo do Vazio Ecoante ainda está sendo erguido pelas sombras...', 'gold');
  }
};

window.TEMPLO_VAZIO_ECOANTE = TEMPLO_VAZIO_ECOANTE;

// Registra esta masmorra no hub da Torre (vilarejo.js)
if (typeof registerDungeon === 'function') {
  registerDungeon(TEMPLO_VAZIO_ECOANTE);
}

// ─────────────────────────────────────────────────────────────
//  2. FASES DO TEMPLO DO VAZIO ECOANTE
//     (a implementar fase por fase)
// ─────────────────────────────────────────────────────────────

// function temploVazioEcoante_fase1() { ... }
