// =============================================================
//  INAZAMI_COMPLETO.JS — Chronicles of Clivor
//  Masmorra Inazami — bundle unificado
//  Unifica os arquivos que antes eram separados:
//    - inazami_dungeon.js   (masmorra principal, fases, história)
//    - inazami_mapa.js      (mapa clicável com pins)
//    - alberon_forja_selada.js (puzzle: sincronizar caldeirões)
//    - estatuas_corredor.js (batalha: Corredor das Estátuas)
//    - eir_valkiria.js      (boss Fase 2: Eir, a Incompleta)
//
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD, addItem, ENEMY_AI,
//              startBattle, doBattleAction, battleState,
//              appendBattleLog, showFloatingNumber,
//              updateBattleHUD, calcEnemyDmg, setBattleButtons,
//              buildSkillList, updateBattleTurnIndicator),
//              vilarejo.js (registerDungeon, storyNode_vilarejo)
//
//  Incluir no gat-1.html:
//    <script src="dungeons/inazami_completo.js?v=..."></script>
//  (substitui as 5 tags <script> antigas por essa única)
// =============================================================

'use strict';


// ═══════════════════════════════════════════════════════════
//  INÍCIO: inazami_dungeon.js
// ═══════════════════════════════════════════════════════════

// =============================================================
//  INAZAMI_DUNGEON.JS — Chronicles of Clivor
//  Masmorra Inazami — Terceira masmorra (Oni das Chamas)
//  Nome "Inazami" é o nome da guardiã que tentou salvar o mundo
//  do Oni das Chamas (Hi-no-Kagutsuchi).
//  Arquivo separado, sem opção de voltar.
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD, addItem),
//              vilarejo.js (registerDungeon, storyNode_vilarejo)
// =============================================================


// ─────────────────────────────────────────────────────────────
//  🛡️ Blindagem contra inazami_mapa.js não carregado
//  storyNode_inazami_mapa vem de outro arquivo (inazami_mapa.js).
//  Antes, os botões "Ver mapa da masmorra" referenciavam essa
//  função DIRETO no array de choices — se o arquivo não tivesse
//  carregado (cache antigo, path errado no device, etc.), o
//  ReferenceError acontecia ANTES do setStory() rodar, travando
//  a tela inteira (o botão "Continuar" parava de responder).
//  Agora sempre passamos por essa função segura, que só chama o
//  mapa se ele existir e, se não existir, avisa em vez de travar.
// ─────────────────────────────────────────────────────────────
function _abrirMapaInazamiSeguro() {
  if (typeof storyNode_inazami_mapa === 'function') {
    storyNode_inazami_mapa();
  } else if (typeof notify === 'function') {
    notify('⚠️ Mapa indisponível — recarregue o jogo', 'red');
  }
}
window._abrirMapaInazamiSeguro = _abrirMapaInazamiSeguro;

// ─────────────────────────────────────────────────────────────
//  🔓 DESTRAVE TEMPORÁRIO PRA TESTES — remove/comente esse bloco
//  quando terminar de testar a masmorra, senão ela fica sempre
//  liberada mesmo sem completar o Kappa antes.
// ─────────────────────────────────────────────────────────────
(function _inazamiTestUnlock() {
  function _doUnlock() {
    if (typeof G === 'undefined') { setTimeout(_doUnlock, 200); return; }
    G.dungeonKappaCleared = true;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doUnlock);
  } else {
    _doUnlock();
  }
})();

// ─────────────────────────────────────────────────────────────
//  REGISTRO NA TORRE DAS MASMORRAS
// ─────────────────────────────────────────────────────────────

(function _registerInazami() {
  function _doRegister() {
    if (typeof registerDungeon !== 'function') {
      setTimeout(_doRegister, 200); return;
    }
    registerDungeon({
      id:        'inazami',
      ordem:     3,
      nome:      'Masmorra Inazami',
      bossNome:  'Hi-no-Kagutsuchi, o Oni das Chamas',
      bossIcon:  'Imagens/icones/OniC.png',
      // descricao e status são avaliados dinamicamente no momento de exibir
      get descricao() {
        return (typeof G !== 'undefined' && G.dungeonKappaCleared)
          ? 'Um santuário construído sobre um vulcão sagrado. Uma guardiã presa em seu próprio selo. E uma chama que não deveria despertar.'
          : 'Complete a Masmorra do Kappa para revelar este lugar.';
      },
      get status() {
        return (typeof G !== 'undefined' && G.dungeonKappaCleared)
          ? 'ativa'
          : 'bloqueada';
      },
      stats: [
        { label: 'Dificuldade', value: '★★★★★' },
        { label: 'Recompensa',  value: 'A definir' },
      ],
      entrar: storyNode_inazami_intro,
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegister);
  } else {
    _doRegister();
  }
})();

// ─────────────────────────────────────────────────────────────
//  INTRODUÇÃO — Lenda do Santuário das Cinzas Eternas
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_intro() {
  // Bloqueio: exige masmorra do Kappa concluída
  if (!(typeof G !== 'undefined' && G.dungeonKappaCleared)) {
    notify('🔒 Complete a Masmorra do Kappa primeiro!', 'red');
    if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
    return;
  }

  setScene('inazami-i1');
  hideEnemy();
  inazamiChamaReset();
  setStory(
    'NARRADOR',
    `O calor aumenta a cada degrau. Cinzas finas flutuam no ar, iluminadas por baixo por um brilho vermelho vindo das fendas na rocha.\n\nVocê chegou ao Santuário das Cinzas Eternas.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_intro2 },
    ]
  );
}

function storyNode_inazami_intro2() {
  setScene('inazami-i1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Com o passar dos anos, a chama começou a crescer e consumir tudo ao redor.\n\nPara impedir que o fogo destruísse o mundo, Inazami realizou um ritual proibido e selou Hi-no-Kagutsuchi nas profundezas do santuário. Porém, o selo exigia uma vida como preço.\n\nInazami ficou presa dentro da masmorra, tornando-se parte do próprio selo.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_intro3 },
    ]
  );
}

function storyNode_inazami_intro3() {
  setScene('inazami-i1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Agora, séculos depois, as correntes espirituais estão enfraquecendo. Chamas azuis surgem durante a noite, espíritos de fogo vagam pelos corredores e criaturas antigas despertam para proteger o caminho até o altar final.\n\nA Masmorra Inazami foi aberta novamente.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_intro4 },
    ]
  );
}

function storyNode_inazami_intro4() {
  setScene('inazami-i1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Aqueles que entrarem nela terão de atravessar as chamas perdidas dos Onibi, enfrentar as Kasha que rondam os mortos, sobreviver à força brutal dos Oni das Chamas e chegar ao Santuário das Cinzas Eternas.\n\nNo fim da masmorra, Hi-no-Kagutsuchi aguarda. O amuleto serve para selar de vez o Oni das Chamas.`,
    [
      { icon:'🔥', text:'Entrar no Santuário', action: storyNode_inazami_fala_guardia },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  INAZAMI SE MANIFESTA — Ela explica o amuleto e os selos
// ─────────────────────────────────────────────────────────────

const INAZAMI_RETRATO = 'Imagens/personagens/file_000000001834720ea390f37cc1093a22.png';

function storyNode_inazami_fala_guardia() {
  setScene('inazami-i1');
  hideEnemy();
  setStory(
    'INAZAMI',
    `Uma voz suave, quase um sussurro nas chamas, ecoa dentro da sua mente.\n\n"Viajante... há séculos ninguém atravessa essas portas com vida."\n\n"Eu sou Inazami. O que resta de mim, ao menos. Sou a guardiã que selou Hi-no-Kagutsuchi — e o preço que paguei foi tornar-me parte do próprio selo."\n\n"Sinto sua determinação. Talvez você seja capaz de terminar o que eu comecei."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_explica_amuleto },
    ],
    INAZAMI_RETRATO
  );
}

function storyNode_inazami_explica_amuleto() {
  setScene('inazami-i1');
  hideEnemy();
  setStory(
    'INAZAMI',
    `"Para me ajudar, você precisará reunir os selos e completar o amuleto. Só assim poderemos avançar até o altar final... e selar de vez o Oni das Chamas."\n\n"O amuleto é primordial — foi forjado junto com o próprio ritual, séculos atrás. Mas o Oni permaneceu preso por tempo demais, e sua fúria, com o passar dos anos, acabou rachando o selo. O amuleto se partiu."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_explica_onibi },
    ],
    INAZAMI_RETRATO
  );
}

function storyNode_inazami_explica_onibi() {
  setScene('inazami-i1');
  hideEnemy();
  setStory(
    'INAZAMI',
    `"Os Onibi das Cinzas encontraram os fragmentos espalhados pelos corredores e os tomaram para si. Agora, cada parte do amuleto queima dentro de um deles."\n\n"Você terá que enfrentá-los, um a um, e arrancar de volta o que me pertence. Só quando o amuleto estiver completo novamente, poderemos chegar até Hi-no-Kagutsuchi."\n\nOs olhos de Inazami — ou o que resta deles na chama — brilham com mais intensidade por um instante.\n\n"Vá. Os Onibi já sabem que você chegou."`,
    [
      { icon:'🔥', text:'Seguir em frente', action: storyNode_inazami_visao_selos },
    ],
    INAZAMI_RETRATO
  );
}

// Visão silenciosa do amuleto partido — com transição narrativa
function storyNode_inazami_visao_selos() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A câmara inteira vibra com a voz de Inazami.\n\nNo ar, uma imagem prateada se forma — o amuleto original, inteiro, brilhando sob chamas antigas. Mas logo se fragmenta em três pedaços que desaparecem na escuridão.\n\nVocê sente seu chamado ao longe.`,
    []
  );
  setTimeout(() => {
    if (typeof storyNode_inazami_fase1 === 'function') storyNode_inazami_fase1();
  }, 4000);
}

// ─────────────────────────────────────────────────────────────
//  FASE 1 — A Trilha das Brasas Perdidas
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_fase1() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A entrada da Masmorra Inazami começa em uma escadaria de pedra antiga, coberta por cinzas e marcas de queimadura.\n\nLanternas de pedra apagadas cercam o caminho, mas pequenas chamas azuis começam a surgir no chão conforme você avança.\n\nAo fundo, o som de correntes ecoa vindo das profundezas do santuário.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_fase1_voz },
    ]
  );
}

function storyNode_inazami_fase1_voz() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Uma voz fraca atravessa o corredor:\n\n"Não sigam a chama… ela não ilumina o caminho. Ela chama por vocês."`,
    [
      { icon:'▶', text:'Continuar mesmo assim', action: storyNode_inazami_fase1_onibi },
    ]
  );
}

function storyNode_inazami_fase1_onibi() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Logo depois, três luzes azuis flutuam entre as ruínas.\n\nElas se aproximam devagar, girando ao redor... até revelarem, dentro das próprias chamas, rostos distorcidos voltados para você.\n\nSão espíritos-fogo, nascidos das fagulhas que escapam do selo de Hi-no-Kagutsuchi. Fracos sozinhos... mas eles não pretendem lutar sozinhos.`,
    [
      { icon:'⚔️', text:'Enfrentar os 3 Onibi das Cinzas', action: storyNode_inazami_fase1_batalha },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  3× ONIBI DAS CINZAS — batalha multi-inimigo REAL
//  (usa o motor genérico de multi_enemy_battle.js — cada Onibi é
//  uma entidade separada, com HP e card próprios)
// ─────────────────────────────────────────────────────────────
//  4 ações possíveis por Onibi, escolhidas na hora do turno:
//   • Chama Errante   — ataque simples em você.
//   • Fagulha Maldita — dano + Queimadura por 2 turnos.
//   • Dança das Brasas — só usável com 2+ Onibi vivos: aumenta a
//     DEF de todos os Onibi vivos por 1 turno (em vez de atacar).
//   • Explosão Final  — não é escolhida, dispara sozinha quando um
//     Onibi morre: dano leve automático em você.
//
//  Isso cria o dilema pedido: focar e derrubar um Onibi rápido
//  (e levar a explosão) vs. distribuir dano nos três antes de
//  finalizar qualquer um (evita explosões, mas leva mais turnos
//  de Chama Errante / Fagulha Maldita).
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  CHAMA DO SELO — debuff progressivo e permanente da masmorra
//  Cada Onibi tem 25% de chance (na Fagulha Maldita) de acender
//  a Chama no jogador, se ela ainda não estiver acesa. Uma vez
//  acesa, NUNCA é removida nem reseta durante a masmorra: no
//  turno em que acende ela é Laranja (10%), no turno seguinte
//  evolui pra Azul (15%), no turno seguinte pra Negra (20%) —
//  e trava nesse estágio até o fim da masmorra. A cada turno com
//  a chama ativa: queima % do HP máximo do jogador E amplifica
//  o ataque de TODOS os inimigos da masmorra Inazami (não só os
//  Onibi — genérico pra valer nas próximas fases também).
//  Só a imagem muda entre os 3 estágios.
// ─────────────────────────────────────────────────────────────
const CHAMA_SELO_TIERS = [
  null,
  { nome: 'Chama do Selo (Laranja)', img: 'Imagens/icones/Picsart_26-07-26_23-10-07-242.png', pct: 0.10 },
  { nome: 'Chama do Selo (Azul)',    img: 'Imagens/icones/Picsart_26-07-26_23-16-05-626.png', pct: 0.15 },
  { nome: 'Chama do Selo (Negra)',   img: 'Imagens/icones/Picsart_26-07-26_23-02-54-667.png', pct: 0.20 },
];
window.CHAMA_SELO_TIERS = CHAMA_SELO_TIERS;

// Chama no início de cada visita à masmorra (intro), pra não carregar
// chama de uma tentativa anterior.
function inazamiChamaReset() {
  G.inazami = G.inazami || {};
  G.inazami.chamaTier = 0;
}
window.inazamiChamaReset = inazamiChamaReset;

// Tenta acender a chama (25% de chance). Não faz nada se já estiver acesa.
function inazamiChamaTentarAcender(onibiName) {
  G.inazami = G.inazami || {};
  if ((G.inazami.chamaTier || 0) > 0) return false;
  if (Math.random() < 0.25) {
    G.inazami.chamaTier = 1;
    appendBattleLog(`🔥 ${onibiName} acende a ${CHAMA_SELO_TIERS[1].nome} em você! Ela vai queimar até o fim da masmorra...`, '#ff3010');
    return true;
  }
  return false;
}
window.inazamiChamaTentarAcender = inazamiChamaTentarAcender;

// Queima % do HP máximo no turno atual (se a chama estiver ativa).
function inazamiChamaTick(p) {
  G.inazami = G.inazami || {};
  const tier = G.inazami.chamaTier || 0;
  if (!tier) return;
  const info = CHAMA_SELO_TIERS[tier];
  const dano = Math.max(1, Math.floor((p.maxHp || 1) * info.pct));
  p.hp = Math.max(0, p.hp - dano);
  appendBattleLog(`🔥 ${info.nome} consome sua vida: -${dano} HP (${Math.round(info.pct * 100)}%)!`, '#e08030');
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', dano, 'dmg');
  if (typeof flashDamage === 'function') flashDamage('hero');
}
window.inazamiChamaTick = inazamiChamaTick;

// Evolui um estágio (chamar 1x ao FINAL de cada turno de batalha).
function inazamiChamaEvoluir() {
  G.inazami = G.inazami || {};
  if (G.inazami.chamaTier > 0 && G.inazami.chamaTier < 3) G.inazami.chamaTier++;
}
window.inazamiChamaEvoluir = inazamiChamaEvoluir;

// Multiplicador de ataque pra QUALQUER inimigo da masmorra Inazami.
function inazamiChamaAtkMult() {
  const tier = (G.inazami || {}).chamaTier || 0;
  return tier > 0 ? (1 + CHAMA_SELO_TIERS[tier].pct) : 1;
}
window.inazamiChamaAtkMult = inazamiChamaAtkMult;

// ── Reset de progresso da Masmorra Inazami ──────────────────────
// Os pins do mapa (Onibi, Eir, Alberon, Trono) só valem DENTRO da
// mesma expedição. Se o jogador morrer, fugir de uma batalha ou
// voltar ao Vilarejo antes de derrotar o chefe final
// (Hi-no-Kagutsuchi), a tentativa é considerada perdida e todo o
// progresso volta a zero — assim ele precisa refazer a masmorra do
// zero na próxima entrada, em vez dos pins aparecerem "✅ concluído"
// por causa de uma run anterior.
function inazamiResetPinsProgress() {
  if (typeof G === 'undefined' || !G.inazami) return;
  // Se um dia o chefe final for implementado e vencido, a masmorra
  // fica permanentemente limpa (igual ao Kappa) — não reseta mais nada.
  if (G.inazami.dungeonInazamiCompleta) return;
  G.inazami.onibiDerrotados        = false;
  G.inazami.eirDerrotada            = false;
  G.inazami.buffCaldeiraoObtido     = false;
  G.inazami.corredorEstatuasDerrotado = false;
  G.inazami.hiNoKagutsuchiDerrotado = false;
  G.inazami.tesouroAbertos          = {};
  G.inazami.chamaTier               = 0;
}
window.inazamiResetPinsProgress = inazamiResetPinsProgress;

// ── Saída da Masmorra Inazami (pós-boss) ────────────────────────
// Antes não existia nenhuma opção de sair depois de derrotar o
// Hi-no-Kagutsuchi: só dava pra "Voltar ao mapa". Agora, ao sair, a
// masmorra fica marcada como CONCLUÍDA (dungeonInazamiCompleta) ANTES
// de passar pelo Vilarejo — senão o reset do Vilarejo (ver abaixo)
// apagaria a vitória sobre o chefe.
function inazamiSairDaMasmorra() {
  G.inazami = G.inazami || {};
  if (G.inazami.hiNoKagutsuchiDerrotado) G.inazami.dungeonInazamiCompleta = true;
  G.inazami.chamaTier = 0;
  try { if (typeof _hikTermometroRemover === 'function') _hikTermometroRemover(); } catch (_) {}
  try { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); } catch (_) {}
  const ov = document.getElementById('inazami-mapa-overlay');
  if (ov) ov.remove();
  try { if (typeof notify === 'function') notify('🏠 Você saiu da Masmorra Inazami.', 'gold'); } catch (_) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
  if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
}
window.inazamiSairDaMasmorra = inazamiSairDaMasmorra;

// ── Correção: Chama do Selo vazando pra fora da Masmorra Inazami ──
// A chama só era apagada ao reentrar na masmorra (intro) ou ao morrer
// especificamente na luta dos Onibi. Se o jogador saísse da masmorra por
// qualquer outro caminho com a chama acesa (fugiu, voltou ao vilarejo no
// meio da masmorra, etc.), ela ficava marcada pra sempre em G.inazami —
// e como o badge/ícone é global (ver buildStatusBadges em palDinh.js),
// continuava aparecendo e afetando batalhas de OUTRAS masmorras.
// Agora, toda vez que o jogador retorna ao Vilarejo (o hub central por
// onde se passa pra ir a qualquer outra masmorra), TODO o progresso da
// masmorra Inazami (chama + pins do mapa) é resetado — voltar ao
// Vilarejo conta como "sair da masmorra".
(function() {
  const _origStoryNodeVilarejoChama = window.storyNode_vilarejo;
  window.storyNode_vilarejo = function(...args) {
    inazamiResetPinsProgress();
    if (typeof _origStoryNodeVilarejoChama === 'function') return _origStoryNodeVilarejoChama.apply(this, args);
  };
})();

function _onibiCinzasMembros() {
  return [
    { id: 'onibi_1', name: 'Onibi Errante',      img: 'Imagens/personagens/file_000000009750720e8bf77a669cb77087.png',
      hp: 220, atk: 42, def: 12, spd: 40, elemento: 'fogo' },
    { id: 'onibi_2', name: 'Onibi Sussurrante',  img: 'Imagens/personagens/file_00000000d894720ea8d8368f1eaf7a6f.png',
      hp: 220, atk: 42, def: 12, spd: 40, elemento: 'fogo' },
    { id: 'onibi_3', name: 'Onibi Voraz',        img: 'Imagens/personagens/file_000000000a7471f5b0a811736bcf1f0c.png',
      hp: 220, atk: 42, def: 12, spd: 40, elemento: 'fogo' },
  ];
}

// ── Explosão Final: dispara sozinha quando QUALQUER Onibi morre ──
function _onibiExplosaoFinal(bs, p, deadMember, aliveLeft) {
  const dano = Math.max(1, Math.floor(deadMember.atk * 0.35 + Math.random() * 6));
  p.hp = Math.max(0, p.hp - dano);
  appendBattleLog(`💥 ${deadMember.name} explode ao ser derrotado! Explosão Final causa ${dano} de dano em você!`, '#ff6a2a');
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', dano, 'dmg');
  if (typeof flashDamage === 'function') flashDamage('hero');
}

// ── Turno dos Onibi vivos: cada um age em sequência ──
function _onibiTrioTurnHandler(bs, p, aliveOnibi, done) {
  bs._onibiDancaUsadaNesteTurno = false;

  // Estágio já ativo DESDE O INÍCIO deste turno (antes de qualquer nova
  // ignição). Só ele recebe o tick agora — se acender agora mesmo neste
  // turno, ele só vai queimar a partir do próximo (1 turno cheio por
  // estágio, sem pular o Laranja).
  const _tierAntesDoTurno = (G.inazami || {}).chamaTier || 0;
  if (_tierAntesDoTurno > 0) inazamiChamaTick(p);
  updateHUD();
  buildStatusBadges();
  if (p.hp <= 0) { done(); return; }

  let i = 0;

  function proximaAcao() {
    if (i >= aliveOnibi.length || p.hp <= 0) {
      // Só evolui o estágio que já estava ativo desde o início do turno
      // (se a chama acabou de acender agora, ela ainda não completou o
      // 1º turno dela — evolui só no próximo).
      if (_tierAntesDoTurno > 0) inazamiChamaEvoluir();
      done();
      return;
    }
    const onibi = aliveOnibi[i];
    i++;

    // Card do Onibi que vai agir agora "pula" pra frente da pilha
    if (typeof mebAnimateActing === 'function') mebAnimateActing(onibi.id);

    const podeDanca = aliveOnibi.length >= 2 && !bs._onibiDancaUsadaNesteTurno;
    const roll = Math.random();
    let acao;
    if (podeDanca && roll < 0.20) acao = 'danca';
    else if (roll < 0.60) acao = 'chama';
    else acao = 'fagulha';

    const ampMult = inazamiChamaAtkMult();

    setTimeout(() => {
      if (acao === 'danca') {
        bs._onibiDancaUsadaNesteTurno = true;
        aliveOnibi.forEach(o => { o.def = (o.baseDef || o.def) + 8; });
        bs._onibiDefBuffTurns = 1;
        appendBattleLog(`🔥 ${onibi.name} conjura Dança das Brasas! A DEF dos Onibi aumenta por 1 turno!`, '#ff8040');
      } else if (acao === 'fagulha') {
        const dano = Math.max(1, Math.floor(onibi.atk * 0.5 * ampMult + Math.random() * 6));
        applyDmgToPlayer(dano, bs, p);
        const acendeu = inazamiChamaTentarAcender(onibi.name);
        appendBattleLog(`🔥 ${onibi.name} usa Fagulha Maldita! -${dano} HP${acendeu ? '' : ' (chama não pegou desta vez)'}!`, '#e05020');
        showFloatingNumber('hero', dano, 'dmg');
        flashDamage('hero');
      } else {
        const dano = Math.max(1, Math.floor(onibi.atk * 0.65 * ampMult + Math.random() * 6) - Math.floor((p.def || 0) / 3));
        applyDmgToPlayer(Math.max(1, dano), bs, p);
        appendBattleLog(`${onibi.name} usa Chama Errante! -${dano} HP!`, 'rgba(200,80,20,0.9)');
        showFloatingNumber('hero', dano, 'dmg');
        flashDamage('hero');
      }
      updateHUD();
      updateBattleHUD();
      buildStatusBadges();
      proximaAcao();
    }, 550);
  }

  // Remove o buff de DEF da Dança ao FIM do turno anterior (dura só 1 turno)
  if (bs._onibiDefBuffTurns > 0) {
    bs._onibiDefBuffTurns--;
    if (bs._onibiDefBuffTurns === 0) {
      aliveOnibi.forEach(o => { o.def = o.baseDef || o.def; });
    }
  }

  proximaAcao();
}

function storyNode_inazami_fase1_batalha() {
  if (!G.inazami) G.inazami = {};
  G.location = 'dungeon-inazami';

  G._dungeonBattleCallback = function() {
    storyNode_inazami_fase1_vitoria();
  };

  // Callback para lidar com derrota (se houver)
  const _origOnDefeat = window.onBattleDefeat;
  window.onBattleDefeat = function() {
    // RESET: Limpar Chama do Selo ao morrer
    G.inazami = G.inazami || {};
    G.inazami.chamaTier = 0;
    if (typeof _origOnDefeat === 'function') _origOnDefeat();
  };

  startMultiEnemyBattle({
    groupId:   'onibi_cinzas_trio',
    groupName: '3× Onibi das Cinzas',
    icon:      '🔥',
    elemento:  'fogo',
    isBoss:    false,
    desc:      'Três chamas azuis que giram como uma só, nascidas das fagulhas do selo de Hi-no-Kagutsuchi. Individualmente fracas — juntas, perigosas.',
    xp:   500,
    gold: 120,
    loot: [
      { id:'pedra_esper', name:'Pedra Esper', icon:'🌫️', qty:3,
        imgSrc:'Imagens/icones/materiais/Fespirutu.png', chance: 1.0,
        type:'material', desc:'Resíduo frio de um Onibi extinto. Ainda morno ao toque.' },
      { id:'fragmento_brasa', name:'Fragmento de Brasa', icon:'🔥', qty:1,
        imgSrc:'Imagens/icones/materiais/Brasiuhdh.png', chance: 0.35,
        type:'material', desc:'Um pedaço de brasa que nunca esfria por completo.' },
    ],
    members:       _onibiCinzasMembros(),
    turnHandler:   _onibiTrioTurnHandler,
    onMemberDeath: _onibiExplosaoFinal,
  });
}

function storyNode_inazami_fase1_vitoria() {
  setScene('inazami-f1');
  hideEnemy();
  G.location = 'dungeon-inazami';
  G.inazami = G.inazami || {};
  G.inazami.onibiDerrotados = true; // libera o pin da Sala do Núcleo no mapa

  notify('🌫️ Pedras Esper obtidas!', 'gold');

  setStory(
    'NARRADOR',
    `As três chamas se apagam ao mesmo tempo, como se fossem uma só vontade partida em pedaços.\n\nUm cheiro de cinzas mornas paira no ar por alguns instantes, antes de se dissipar.\n\nA voz de Inazami sussurra novamente, mais próxima desta vez.\n\n"Bem feito... mas isso foi só o começo. Ainda há mais entre você e o amuleto completo."`,
    [
      { icon:'▶', text:'Seguir em frente', action: storyNode_inazami_marca_queimada },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  EVENTO PÓS-BATALHA — marcas queimadas, o amuleto e a visão
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_marca_queimada() {
  setScene('inazami-f1');
  hideEnemy();

  showStoryCutscene('Imagens/masmorra inazami/file_00000000ec44720e82db8870148a5338.png');

  setStory(
    'NARRADOR',
    `As chamas azuis se apagam e deixam três pequenas marcas queimadas no chão.\n\nNo centro delas, há um amuleto rachado com o símbolo de Inazami.`,
    [
      { icon:'✋', text:'Tocar no amuleto', action: storyNode_inazami_visao_amuleto },
    ]
  );
}

function storyNode_inazami_visao_amuleto() {
  setScene('inazami-f1');
  hideEnemy();
  // mantém a imagem do amuleto na tela durante a visão

  setStory(
    'NARRADOR',
    `Ao tocar no amuleto, uma visão surge diante dos seus olhos:\n\nUma mulher de vestes antigas está diante de uma porta enorme, segurando correntes incandescentes enquanto uma sombra gigante se debate atrás dela.\n\nEla sussurra:\n\n"O selo não está quebrado... mas está acordando."\n\nA porta à frente se abre lentamente, revelando uma passagem tomada por fumaça preta.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_recompensa_amuleto },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  EFEITO "ITEM OBTIDO" — usado nos fragmentos do amuleto (e
//  reaproveitável em qualquer outra recompensa da masmorra).
//  Mostra a arte do item ganhando destaque sobre a cena, com um
//  brilho pulsante, antes de sumir — bem mais claro do que só o
//  toast pequeno no canto.
// ─────────────────────────────────────────────────────────────
function inazamiShowItemGetFX(item, qty) {
  qty = qty || 1;
  if (!item) return;

  if (!document.getElementById('iigfx-css')) {
    const st = document.createElement('style');
    st.id = 'iigfx-css';
    st.textContent = `
      #inazami-itemget-fx{
        position:fixed; inset:0; z-index:9995;
        display:flex; align-items:flex-start; justify-content:center;
        padding-top:20vh; pointer-events:none;
      }
      #inazami-itemget-fx .iigfx-card{
        position:relative; display:flex; flex-direction:column; align-items:center; gap:4px;
        opacity:0; transform:scale(0.6) translateY(10px);
        transition:opacity .35s ease, transform .45s cubic-bezier(.34,1.56,.64,1);
      }
      #inazami-itemget-fx.show .iigfx-card{ opacity:1; transform:scale(1) translateY(0); }
      #inazami-itemget-fx.hide .iigfx-card{ opacity:0; transform:scale(0.85) translateY(-14px); transition:opacity .5s ease, transform .5s ease; }
      #inazami-itemget-fx .iigfx-glow{
        position:absolute; inset:-16px; border-radius:50%;
        background:radial-gradient(circle, rgba(255,150,40,0.55) 0%, rgba(255,150,40,0) 70%);
        animation:iigfxPulse 1.6s ease-in-out infinite;
      }
      @keyframes iigfxPulse{ 0%,100%{ opacity:.55; transform:scale(0.9); } 50%{ opacity:1; transform:scale(1.12); } }
      #inazami-itemget-fx .iigfx-art{
        position:relative; width:76px; height:76px; border-radius:50%;
        border:2px solid rgba(255,190,110,0.85);
        background:radial-gradient(circle, rgba(40,20,8,0.9), rgba(10,5,2,0.95));
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 0 22px rgba(255,140,40,0.65), 0 4px 14px rgba(0,0,0,0.6);
        overflow:hidden;
      }
      #inazami-itemget-fx .iigfx-art img{ width:78%; height:78%; object-fit:contain; filter:drop-shadow(0 0 8px rgba(255,150,60,0.8)); }
      #inazami-itemget-fx .iigfx-icon{ font-size:2rem; }
      #inazami-itemget-fx .iigfx-label{
        font-family:'Noto Sans JP',sans-serif; font-size:0.6rem; letter-spacing:3px;
        color:rgba(240,220,190,0.65); text-transform:uppercase; margin-top:2px;
      }
      #inazami-itemget-fx .iigfx-name{
        font-family:'Cinzel',serif; font-size:0.95rem; color:#ffd9a0;
        text-shadow:0 0 10px rgba(255,150,40,0.5); text-align:center; max-width:230px;
      }
    `;
    document.head.appendChild(st);
  }

  let host = document.getElementById('inazami-itemget-fx');
  if (host) host.remove();
  host = document.createElement('div');
  host.id = 'inazami-itemget-fx';
  host.innerHTML = `
    <div class="iigfx-card">
      <div class="iigfx-glow"></div>
      <div class="iigfx-art">
        ${item.imgSrc ? `<img src="${item.imgSrc}" alt="">` : `<span class="iigfx-icon">${item.icon || '✨'}</span>`}
      </div>
      <div class="iigfx-label">Item obtido</div>
      <div class="iigfx-name">${item.name}${qty > 1 ? ` ×${qty}` : ''}</div>
    </div>`;
  document.body.appendChild(host);
  requestAnimationFrame(() => host.classList.add('show'));
  setTimeout(() => host.classList.add('hide'), 1700);
  setTimeout(() => host.remove(), 2200);
}
window.inazamiShowItemGetFX = inazamiShowItemGetFX;

function storyNode_inazami_recompensa_amuleto() {
  setScene('inazami-f1');
  hideEnemy();

  const _itemAmuleto = {
    id:      'amuleto_quebrado_inazami',
    name:    'Amuleto Quebrado de Inazami',
    icon:    '🔥',
    imgSrc:  'Imagens/inazami masmorra/1mulet.png',
    type:    'chave',
    desc:    'Um fragmento rachado do amuleto de Inazami. Ainda emana um calor fraco — como se guardasse uma verdade que ainda não pode ser revelada. Será importante mais adiante.',
    weight:  0.2,
    unique:  true, // só existe 1 fragmento — nunca deve duplicar/somar qty
  };
  if (!window.inazamiAmuletoJaFeito || !window.inazamiAmuletoJaFeito()) {
    addItem(_itemAmuleto, 1);
    inazamiShowItemGetFX(_itemAmuleto, 1);
    notify('🔥 Amuleto Quebrado de Inazami obtido!', 'gold');
  }
  // A cena continua visível por um instante pra o efeito de "item obtido"
  // aparecer sobre ela, em vez de sumir na hora.
  setTimeout(() => { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); }, 650);

  setStory(
    'NARRADOR',
    `A visão se desfaz. Em sua mão, o amuleto rachado pulsa fracamente, como se ainda estivesse ligado a algo distante.\n\nUm calor pesado começa a subir das profundezas da masmorra.`,
    [
      { icon:'▶', text:'Seguir em frente', action: storyNode_inazami_visao_hinokagutsuchi },
      { icon:'🗺️', text:'Ver mapa da masmorra', action: _abrirMapaInazamiSeguro },
    ]
  );
}

function storyNode_inazami_visao_hinokagutsuchi() {
  setScene('inazami-f1');
  hideEnemy();

  // BUG-FIX: antes usava por engano o mesmo arquivo do retrato da Inazami
  // (INAZAMI_RETRATO) aqui — agora usa a arte real da silhueta acorrentada
  // de Hi-no-Kagutsuchi, em destaque como popup grande (proporção 9:16).
  showStoryCutscene('Imagens/inazami masmorra/higoacorrentado.png', { shake: true, vibrate: true, popup: true });

  setStory(
    'NARRADOR',
    `Do fundo da fumaça negra, uma silhueta colossal se revela — acorrentada, mas viva.\n\nHi-no-Kagutsuchi, o Oni das Chamas, se debate contra os selos que ainda o prendem. A terra treme sob seus pés.\n\n"Ainda não é hora..." — a voz de Inazami soa mais fraca agora — "mas ele sabe que você está aqui."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_fase2_intro },
    ],
    INAZAMI_RETRATO // card pequeno da Inazami ao lado da fala — a ênfase visual fica na silhueta do popup acima
  );
}

function storyNode_inazami_fase2_intro() {
  hideStoryCutscene();
  storyNode_inazami_fase2();
}

// ─────────────────────────────────────────────────────────────
//  FASE 2 — EIR, A VALQUÍRIA INCOMPLETA
//
//  Filha de Hi-no-Kagutsuchi, moldada com o núcleo de energia da
//  masmorra + o 2º fragmento do amuleto — a única forma que ele,
//  acorrentado, tem de agir com "mãos próprias" lá fora.
//  Quando o jogador chega, ela ainda está sendo forjada: o núcleo
//  continua alimentando ela em tempo real. Derrotá-la é interromper
//  um nascimento forçado — misericórdia de verdade, não só o nome.
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_fase2() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Depois da visão de Hi-no-Kagutsuchi, o corredor muda.\n\nAs chamas azuis que guiavam seus passos até aqui somem — e no lugar delas, filamentos de luz branco-azulada correm pelas paredes, pulsando como um coração batendo em outro cômodo.\n\nVocê segue o pulso.`,
    [
      { icon:'▶', text:'Seguir os filamentos de luz', action: storyNode_inazami_fase2_camara },
    ]
  );
}

function storyNode_inazami_fase2_camara() {
  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene('Imagens/inazami masmorra/sala_nuo.png', { shake: false, vibrate: false });
  setStory(
    'NARRADOR',
    `A câmara se abre num salão circular. No centro, um núcleo cravado no chão pulsa em branco-azulado — e preso a ele por correntes de luz, um corpo ainda se formando.\n\nAsas de brasa piscam entre existir e não existir. Uma armadura escura se fecha aos poucos sobre um corpo que ainda não decidiu se vai ter forma humana ou não. A cada pulso do núcleo, ela fica um pouco mais... inteira.\n\nEla ainda não te viu. Ou talvez tenha visto e não se importe — ainda não terminou de nascer.`,
    [
      { icon:'▶', text:'Se aproximar', action: storyNode_inazami_fase2_eir_fala },
    ]
  );
}

function storyNode_inazami_fase2_eir_fala() {
  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene('Imagens/inazami masmorra/sala_nuo.png', { shake: false, vibrate: false });
  setStory(
    'EIR',
    `A cabeça dela se vira — devagar, como se cada movimento custasse algo que ainda não tem nome.\n\n"Você chegou antes do tempo." — a voz sai baixa, incompleta, quase dividida em duas. "Ou talvez eu esteja atrasada. Já não sei mais diferenciar."\n\n"Meu pai não pode vir até você. Então ele me fez pra que uma parte dele pudesse."\n\nAs correntes de luz se esticam. O núcleo pulsa mais forte.\n\n"Eu não escolhi isso. Mas também não posso escolher parar."`,
    [
      { icon:'⚔️', text:'Enfrentar Eir', action: storyNode_inazami_fase2_valkiria_batalha },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  BATALHA — placeholder de status
//
//  ⚠️ TODO (Clau): preencher hp / atk / def / spd e o moveset dela.
//  Deixei só o esqueleto rodando pra não travar a progressão da
//  masmorra enquanto você não bota os números.
//
//  Ideia solta pro turnHandler (nada implementado ainda, só pra
//  não esquecer): já que ela "está sendo formada pelo núcleo", dá
//  pra fazer o núcleo pulsar a cada N turnos e dar um buff nela
//  (tipo a Dança das Brasas dos Onibi, mas como um evento próprio
//  dela) — reforça visualmente que ela fica mais forte quanto mais
//  tempo a luta demora, o que também dá um motivo mecânico pra
//  focar dano rápido em vez de enrolar.
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_fase2_valkiria_batalha() {
  if (!G.inazami) G.inazami = {};
  G.location = 'dungeon-inazami';
  hideStoryCutscene();

  G._dungeonBattleCallback = function() {
    storyNode_inazami_fase2_valkiria_vitoria();
  };

  startBattle({
    id:       'eir_incompleta',
    name:     'Eir, a Incompleta',
    img:      'Imagens/personagens/PLACEHOLDER_eir.png', // TODO: trocar pelo PNG real
    elemento: 'fogo', // fogo espiritual/puro — chama branco-azulada, contida
    isBoss:   true,
    desc:     'Uma valquíria ainda em formação, presa por correntes de luz a um núcleo que continua a moldá-la. Filha de Hi-no-Kagutsuchi, feita das próprias mãos que ele não tem.',
    hp:  1,   // TODO
    atk: 1,   // TODO
    def: 1,   // TODO
    spd: 1,   // TODO
    xp:   0,  // TODO
    gold: 0,  // TODO
    loot: [
      // TODO: materiais/drops secundários, se quiser algum
    ],
  });
}

function storyNode_inazami_fase2_valkiria_vitoria() {
  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene('Imagens/inazami masmorra/sala_nucleo.png', { shake: false, vibrate: false });
  G.location = 'dungeon-inazami';
  G.inazami = G.inazami || {};
  G.inazami.eirDerrotada = true; // libera o pin do Salão do Trono no mapa

  setStory(
    'NARRADOR',
    `As correntes de luz se partem uma a uma. O núcleo, que pulsava forte segundos atrás, começa a apagar.\n\nEir cai de joelhos — não derrotada como um inimigo cai, mas como algo que nunca chegou a terminar de existir. As asas de brasa se desfazem em fumaça antes mesmo de tocarem o chão.\n\n"Obrigada..." — a voz sai quase inaudível agora. "Eu não sabia... como parar sozinha."\n\nNo peito dela, onde a armadura ainda não tinha se fechado por completo, algo brilha: um segundo fragmento do amuleto de Inazami.`,
    [
      { icon:'▶', text:'Seguir em frente', action: storyNode_inazami_fase2_marca_eir },
    ]
  );
}

function storyNode_inazami_fase2_marca_eir() {
  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene('Imagens/inazami masmorra/sala_nucleo.png', { shake: false, vibrate: false });
  setStory(
    'NARRADOR',
    `O núcleo termina de apagar com um último pulso fraco. No centro da câmara, onde Eir esteve, resta apenas o fragmento — ainda quente, ainda pulsando de leve, como se se lembrasse de ter sido parte de alguém.`,
    [
      { icon:'✋', text:'Pegar o fragmento', action: storyNode_inazami_fase2_visao_eir },
    ]
  );
}

function storyNode_inazami_fase2_visao_eir() {
  setScene('inazami-f1');
  hideEnemy();

  // Mesmo tratamento visual da visão do 1º fragmento (mantém a imagem
  // do amuleto/fragmento na tela durante o texto)
  showStoryCutscene('Imagens/inazami masmorra/PLACEHOLDER_visao_eir.png', { shake: false, vibrate: false }); // TODO: trocar pela arte real

  setStory(
    'NARRADOR',
    `Ao tocar o fragmento, uma visão breve surge:\n\nO mesmo núcleo, mas anos atrás — ainda inteiro, ainda intacto. Uma silhueta se debruça sobre ele, moldando algo com as próprias mãos em chamas, com um cuidado que não combina com o tamanho da fúria que o cerca.\n\nPor um instante, antes de tudo se apagar, você jura ouvir algo parecido com um nome sendo sussurrado — não com raiva. Com saudade.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_fase2_recompensa_eir },
    ]
  );
}

function storyNode_inazami_fase2_recompensa_eir() {
  setScene('inazami-f1');
  hideEnemy();

  const _itemFragmentoEir = {
    id:      'amuleto_fragmento_eir',
    name:    'Fragmento do Amuleto — Coração da Eir',
    icon:    '🔥',
    imgSrc:  'Imagens/inazami masmorra/2mulet.png',
    type:    'chave',
    desc:    'O segundo fragmento do amuleto de Inazami. Estava sendo usado como núcleo de vida de algo que nunca chegou a nascer por completo. Ainda pulsa, fraco, como uma lembrança de calor.',
    weight:  0.2,
    unique:  true, // só existe 1 fragmento — nunca deve duplicar/somar qty
  };
  if (!window.inazamiAmuletoJaFeito || !window.inazamiAmuletoJaFeito()) {
    addItem(_itemFragmentoEir, 1);
    inazamiShowItemGetFX(_itemFragmentoEir, 1);
    notify('🔥 Fragmento do Amuleto (Eir) obtido!', 'gold');
  }
  setTimeout(() => { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); }, 650);

  setStory(
    'NARRADOR',
    `A câmara fica em silêncio. Só resta o eco distante das correntes que ainda prendem Hi-no-Kagutsuchi — mais fracas agora, mas não quebradas.\n\nFaltam apenas um caminho e um fragmento até o fim.`,
    [
      { icon:'🏆', text:'Explorar o Salão do Trono', action: storyNode_inazami_tesouro_entrada },
      { icon:'🗺️', text:'Ver mapa da masmorra', action: _abrirMapaInazamiSeguro },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  FASE 3 — [PLACEHOLDER: guardião final ainda não definido]
//
//  TODO — assets do amuleto já mapeados (ver imagens reais):
//    • 1mulet.png → fragmento solto (Onibi)   — já em uso ✓
//    • 2mulet.png → fragmento solto (Eir)     — já em uso ✓
//    • 3mulet.png → amuleto montado no cordão mas ainda rachado/
//      incompleto — reservado pra uma etapa intermediária futura,
//      se um 3º fragmento (Fase 3) for adicionado depois.
//    • 4mulet.png → amuleto COMPLETO, sem rachaduras, com cordão —
//      já em uso como resultado da fusão dos 2 fragmentos atuais
//      (ver CRAFT_RECIPES → amuleto_completo_inazami no palDinh.js).
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  FASE 3 — O PORTÃO QUEBRA / HI-NO-KAGUTSUCHI É LIBERTADO
//
//  Disparada automaticamente pelo doCraft() em palDinh.js assim
//  que o jogador craft o Amuleto Completo de Inazami (G.inazami.
//  portaoAberto). Beat 3: Inazami revela que não teve força a
//  tempo. Beat 4: as correntes se partem, o Oni se solta, Inazami
//  tenta e falha em conjurar, e pede ajuda ao jogador em pensamento.
//
//  ⚠️ TODO: a luta contra Hi-no-Kagutsuchi em si (stats, moveset,
//  fases) ainda não foi definida — depois da cena de deboche/selo
//  (storyNode_inazami_hik_liberto_riso → ...→ _pos_selo), o gancho
//  onde a luta de verdade vai entrar é storyNode_inazami_hik_confronto_real_TODO.
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_portao_aberto_intro() {
  G.inazami = G.inazami || {};
  G.location = 'dungeon-inazami';
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Você segue o som até a câmara final. O ar aqui é mais pesado, mais quente — e mais silencioso do que deveria.\n\nNo centro, presa nas correntes que sempre estiveram ali, a chama de Inazami mal se sustenta. O que antes era um brilho firme agora treme, fraco, prestes a se apagar como uma vela no vento.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_portao_aberto_fala },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_portao_aberto_intro = storyNode_inazami_portao_aberto_intro;

function storyNode_inazami_portao_aberto_fala() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'INAZAMI',
    `"Você chegou..." — a voz sai fina, quase se perdendo no próprio ar. "Mas eu... não aguentei o tempo que precisava."\n\n"O amuleto está completo. Isso deveria ter sido o suficiente pra eu selar Hi-no-Kagutsuchi de vez. Mas eu gastei força demais segurando as correntes... força demais esperando por você."\n\n"Não sobrou o bastante. Sinto muito."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_portao_quebra },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_portao_aberto_fala = storyNode_inazami_portao_aberto_fala;

function storyNode_inazami_portao_quebra() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Um estrondo corta o ar antes que ela consiga terminar. As correntes que prendiam o portão — as mesmas que resistiram por séculos — racham, uma a uma, como vidro sob pressão.\n\nA última se parte com um som que não é bem um som: é mais uma ausência, um vazio que a fumaça negra imediatamente enche.\n\nDe dentro dela, uma silhueta colossal se ergue.\n\nHi-no-Kagutsuchi está livre.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_portao_falha_magia },
    ]
  );
}
window.storyNode_inazami_portao_quebra = storyNode_inazami_portao_quebra;

function storyNode_inazami_portao_falha_magia() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'INAZAMI',
    `"Não... ainda não!"\n\nEla tenta reunir o que resta de si — um lampejo de luz se forma entre suas mãos acorrentadas, tremendo, tentando virar magia.\n\nNada acontece. A luz se apaga antes de se tornar algo.\n\n"Eu não consigo... não tenho mais força pra lutar por você."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_portao_pedido_mental },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_portao_falha_magia = storyNode_inazami_portao_falha_magia;

function storyNode_inazami_portao_pedido_mental() {
  setScene('inazami-trono');
  hideEnemy();
  G.inazami = G.inazami || {};
  G.inazami.hiNoKagutsuchiLiberado = true;
  setStory(
    'INAZAMI',
    `Uma voz — a dela, mas agora só dentro da sua mente, como se as últimas forças de Inazami só alcançassem esse lugar — sussurra, urgente:\n\n"Por favor. Você é a única chance que resta. Termine o que eu não consegui."`,
    [
      { icon:'⚔️', text:'Enfrentar Hi-no-Kagutsuchi', action: storyNode_inazami_hik_liberto_riso },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_portao_pedido_mental = storyNode_inazami_portao_pedido_mental;

// ─────────────────────────────────────────────────────────────
//  HI-NO-KAGUTSUCHI LIVRE — o Oni ignora o "confronto" e, com
//  desdém total, vira-se primeiro contra Inazami. Ele sela a
//  guardiã antes mesmo de encarar o jogador, deixando claro o
//  tamanho da distância de poder entre eles. Termina liberando
//  o caminho real até ele (pin "sala_hi_no_kagutsuchi" no mapa
//  passa a levar à luta de verdade, via flag inazamiSelada).
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_hik_liberto_riso() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'HI-NO-KAGUTSUCHI',
    `A silhueta termina de se erguer, e só então você entende que "colossal" era uma palavra pequena demais. Chamas negras escorrem dos ombros dele como sangue vivo, lambendo pedra e derretendo o chão em volta dos pés.\n\nEle olha para as correntes partidas aos seus pés. Depois para Inazami, ainda presa, ainda ardendo fraca dentro do que sobrou dela.\n\nRi. Um som grave, cheio de deboche, que faz o salão inteiro vibrar.\n\n"Ahahahaha... um amuleto." — ele cospe a palavra como se fosse piada. "Sério, sacerdotisa? Você achou que um brinquedo remendado três vezes ia me segurar por mais quanto tempo? Um século? Dois?"\n\n"Eu tenho todo o tempo do mundo. Vocês é que não tinham."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_hik_conjura_selo },
    ]
  );
}
window.storyNode_inazami_hik_liberto_riso = storyNode_inazami_hik_liberto_riso;

function storyNode_inazami_hik_conjura_selo() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'HI-NO-KAGUTSUCHI',
    `Ele estende a mão na direção de Inazami, displicente, como quem afasta um inseto do caminho. O ar ao redor da chama presa começa a se curvar, a ceder, a obedecer.\n\n"Já que você insiste tanto em vigiar o que não te pertence mais... deixa eu te arranjar um lugar de honra. Bem pertinho de mim, dessa vez. Assim não perco você de vista de novo."\n\nSímbolos incandescentes se acendem girando ao redor do punho fechado dele — um selo desenhado não para prender, mas para guardar. Para colecionar.\n\n"Shikai Kuji: Eigō Banshō Fūin."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_hik_sela_inazami },
    ]
  );
}
window.storyNode_inazami_hik_conjura_selo = storyNode_inazami_hik_conjura_selo;

function storyNode_inazami_hik_sela_inazami() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A luz do selo escorre sobre a chama de Inazami como resina quente, endurecendo aos poucos — apagando calor, apagando cor, apagando o que restava de voz. As correntes que ainda a prendiam racham e caem, inúteis agora. Ela não precisa mais delas.\n\nOnde antes ardia uma sacerdotisa, resta apenas uma pequena figura de cerâmica escura — os olhos pintados fechados, presa para sempre numa pose de súplica que já não serve pra nada.\n\nHi-no-Kagutsuchi ergue o boneco entre dois dedos gigantescos e o examina com o desprezo satisfeito de quem admira uma peça rara.\n\n"Perfeita. Vai ficar linda ao lado das outras."\n\nEle guarda a pequena figura junto ao peito, encaixada entre placas de armadura incandescente — mais um troféu, mais uma prova de que nada que já tentou detê-lo saiu inteiro dessa sala.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_hik_pos_selo },
    ]
  );
}
window.storyNode_inazami_hik_sela_inazami = storyNode_inazami_hik_sela_inazami;

function storyNode_inazami_hik_pos_selo() {
  setScene('inazami-trono');
  hideEnemy();
  G.inazami = G.inazami || {};
  G.inazami.inazamiSelada = true;
  setStory(
    'HI-NO-KAGUTSUCHI',
    `Só então ele parece notar você de verdade — como quem repara, enfim, num inseto que insiste em ficar perto demais do fogo.\n\n"Ah. Então é você o motivo de tanto trabalho." — ele ri de novo, mais baixo dessa vez, quase entediado. "Fiquei preso, remendado, sufocado por meia eternidade... e isso" — ele bate de leve no peito, onde o boneco de Inazami agora descansa — "foi tudo que conseguiram fazer contra mim. Um selo. Uma guardiã cansada. Um amuleto de mentirinha."\n\n"Vai. Anda logo. Traz o resto do que você tem aí guardado — prometo não me entediar rápido demais com você."\n\nEle se vira, e o caminho até o verdadeiro salão do trono se abre diante de você: sem selos, sem guardiãs, sem mais nada entre vocês dois além da distância que falta andar.`,
    [
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { notify('🗺️ Um novo caminho foi revelado no mapa!', 'gold'); if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ]
  );
}
window.storyNode_inazami_hik_pos_selo = storyNode_inazami_hik_pos_selo;

// ─────────────────────────────────────────────────────────────
//  STATS BASE DO HI-NO-KAGUTSUCHI (valores passados por você)
//  ⚠️ moveset, cooldowns e fases ainda não foram definidos — só
//  os status crus abaixo. "Dano de Fogo" é mecânica nova: um
//  percentual que varia de 0% a 100%, gatilho ainda não definido.
// ─────────────────────────────────────────────────────────────
const HI_NO_KAGUTSUCHI = {
  id:      'hi_no_kagutsuchi',
  nome:    'Hi-no-Kagutsuchi, o Oni das Chamas',
  sprite:  'Imagens/icones/OniC.png',

  hp:      4300,
  maxHp:   4300,
  atk:     200,
  def:     140,
  acc:     0.25,   // 25%
  dmgMult: 2.00,   // 200%
  elemento: 'fogo',

  // Dano de Fogo — 0% a 100%, valor inicial 67%. Sobe conforme a
  // Elevação de Temperatura é usada (ver skill abaixo).
  // TETO: antes travava em 100% (1.00). Agora continua escalando com a
  // temperatura até 200% (2.00) — ajuste `max` aqui se quiser mais/menos.
  danoFogo: {
    atual: 0.67,
    min:   0,
    max:   2.00,
  },

  // Temperatura da sala — começa em 25°C, só sobe (skill "Elevação
  // de Temperatura"). Acima de 50°C a skill passa a queimar o
  // jogador diretamente, além de deixar o Dano de Fogo dele mais forte.
  temperatura: {
    atual: 25,
    min:   25,
    limiarQueimadura: 50,
  },

  // Regeneração de HP por turno — começa em 0%, só sobe via
  // "Olho de Eir" (skill 3), sempre que o sorteio cair em regen.
  // AJUSTE: sem duração especificada — tratei como permanente pro
  // resto da luta, acumulando se a skill sortear regen mais de uma vez.
  regenPctPorTurno: 0,
};
window.HI_NO_KAGUTSUCHI = HI_NO_KAGUTSUCHI;

// ── Ajustes finos do calor (mexa aqui pra balancear) ──
// Queimadura por turno: acima do limiar (50°C), TODO turno do chefe
// o calor da sala tira essa fração do HP máx. do jogador.
const HIK_QUEIMADURA_PCT_TURNO = 0.035;
// Quanto do Dano de Fogo entra no ATAQUE NORMAL (o Purgatório usa 100%).
// 0.5 = metade do Dano de Fogo vira dano extra nas garras.
const HIK_FOGO_ATAQUE_NORMAL_FATOR = 0.5;

// TODO: chamar isso no início/fim de cada turno do HnK, uma vez que
// o loop de batalha real existir — mesmo espírito do regen "quase
// morte" da Eir, só que sem limiar de HP: aplica sempre que > 0%.
function hikTickRegenPorTurno(hikStats) {
  if (!hikStats || !hikStats.regenPctPorTurno) return null;
  const cura = Math.floor(hikStats.maxHp * hikStats.regenPctPorTurno);
  if (cura <= 0) return null;
  const antes = hikStats.hp;
  hikStats.hp = Math.min(hikStats.maxHp, hikStats.hp + cura);
  const curado = hikStats.hp - antes;
  if (curado <= 0) return null;
  return { msg: `🔥 O Oni se regenera: +${curado} HP (${Math.round(hikStats.regenPctPorTurno * 100)}%/turno).`, curado };
}
window.hikTickRegenPorTurno = hikTickRegenPorTurno;

// ─────────────────────────────────────────────────────────────
//  PASSIVA — EMBER
//  "Aplica Ember no jogador em todos os turnos do chefe."
//  ⚠️ O que a Ember faz de fato ao se acumular (dano por stack?
//  detona em algo? tem limite de stacks?) ainda não foi definido
//  — por enquanto só empilha e loga. Chamar 1x em TODO turno em
//  que o Hi-no-Kagutsuchi agir (incondicional, sem chance — ao
//  contrário da passiva da Eir, que rola %).
//
//  playerRuntime = objeto de runtime do jogador na luta (ainda sem
//  lar definitivo — vai morar no futuro "hikBattleState", no mesmo
//  molde de window._eirBattleState). Precisa só de um campo
//  numérico `emberStacks` pra já funcionar.
// ─────────────────────────────────────────────────────────────
function hikAplicarPassivaEmber(playerRuntime) {
  if (!playerRuntime) return null;
  playerRuntime.emberStacks = (playerRuntime.emberStacks || 0) + 1; // AJUSTE: ganho por turno não especificado — usei 1 stack

  return {
    msg: `🔥 Ember se agarra a você... (${playerRuntime.emberStacks}x acumulado)`,
    stacks: playerRuntime.emberStacks,
  };
}
window.hikAplicarPassivaEmber = hikAplicarPassivaEmber;

// ─────────────────────────────────────────────────────────────
//  TERMÔMETRO — indicador visual da temperatura da sala, criado
//  a primeira vez que a Elevação de Temperatura é usada (ou pode
//  ser chamado antes, pra já aparecer com 25°C assim que a luta
//  começa). Overlay simples, independente da HUD de batalha —
//  não depende de nenhum elemento específico já existir na tela.
// ─────────────────────────────────────────────────────────────
// ── EFEITO DE CALOR NA TELA ──────────────────────────────────
// Overlay leve (só CSS, sem filtros pesados) que esquenta a tela
// conforme a temperatura sobe: tom alaranjado geral, vinheta de
// brasa nas bordas, brilho vindo de baixo e, acima do limiar de
// queimadura, uma ondulação de "ar quente" subindo.
// Intensidade: 25°C = quase nada → 100°C = máximo.
function _hikCalorCriar() {
  if (document.getElementById('hik-calor')) return;

  if (!document.getElementById('hik-calor-css')) {
    const st = document.createElement('style');
    st.id = 'hik-calor-css';
    st.textContent = `
      #hik-calor { position: fixed; inset: 0; z-index: 635; pointer-events: none; overflow: hidden; }
      #hik-calor > div { position: absolute; inset: 0; transition: opacity 1.4s ease; opacity: 0; }

      /* tom geral — leve cor quente sobre tudo */
      #hik-calor .hk-tint  { background: rgba(255, 96, 24, 0.5); mix-blend-mode: soft-light; }
      /* vinheta de brasa nas bordas, pulsando */
      #hik-calor .hk-vig   { background: radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(190,40,10,0.55) 78%, rgba(120,15,0,0.85) 100%);
                             animation: hkPulse 3.2s ease-in-out infinite; }
      /* brilho subindo do chão */
      #hik-calor .hk-glow  { background: linear-gradient(to top, rgba(255,120,30,0.55), rgba(255,80,20,0.18) 28%, transparent 55%);
                             mix-blend-mode: screen; animation: hkPulse 2.4s ease-in-out infinite reverse; }
      /* ar quente ondulando (só aparece acima do limiar) */
      #hik-calor .hk-haze  { background: repeating-linear-gradient(to top, rgba(255,170,90,0.0) 0px, rgba(255,170,90,0.10) 7px, rgba(255,170,90,0.0) 16px);
                             background-size: 100% 160px; mix-blend-mode: screen; animation: hkHaze 2.2s linear infinite; }
      /* clarão rápido a cada Elevação de Temperatura */
      #hik-calor .hk-flash { background: radial-gradient(circle at 50% 55%, rgba(255,190,90,0.55), rgba(255,80,20,0.25) 55%, transparent 80%);
                             mix-blend-mode: screen; transition: opacity 0.9s ease-out; }
      #hik-calor .hk-flash.on { opacity: 1 !important; transition: opacity 0.08s ease-in; }

      @keyframes hkPulse { 0%,100% { filter: brightness(0.85); } 50% { filter: brightness(1.2); } }
      @keyframes hkHaze  { from { background-position-y: 0; } to { background-position-y: -160px; } }
    `;
    document.head.appendChild(st);
  }

  const el = document.createElement('div');
  el.id = 'hik-calor';
  el.innerHTML = `
    <div class="hk-tint"></div>
    <div class="hk-vig"></div>
    <div class="hk-glow"></div>
    <div class="hk-haze"></div>
    <div class="hk-flash"></div>
  `;
  document.body.appendChild(el);
}

function _hikCalorAtualizar(temp, subiu) {
  _hikCalorCriar();
  const el = document.getElementById('hik-calor');
  if (!el) return;

  const lim = (typeof HI_NO_KAGUTSUCHI !== 'undefined') ? HI_NO_KAGUTSUCHI.temperatura.limiarQueimadura : 50;
  const t = Math.max(0, Math.min(1, (temp - 25) / 75)); // 25°C → 0 · 100°C+ → 1

  el.querySelector('.hk-tint').style.opacity = (t * 0.9).toFixed(2);
  el.querySelector('.hk-vig').style.opacity  = (t * 0.85).toFixed(2);
  el.querySelector('.hk-glow').style.opacity = (t * 0.9).toFixed(2);
  // ondulação só depois do limiar de queimadura
  el.querySelector('.hk-haze').style.opacity = temp > lim ? (0.35 + t * 0.5).toFixed(2) : '0';

  // quanto mais quente, mais rápido o pulso
  const dur = Math.max(1.1, 3.2 - t * 2.0).toFixed(2) + 's';
  el.querySelector('.hk-vig').style.animationDuration  = dur;
  el.querySelector('.hk-glow').style.animationDuration = Math.max(0.9, 2.4 - t * 1.5).toFixed(2) + 's';

  if (subiu) {
    const fl = el.querySelector('.hk-flash');
    fl.classList.add('on');
    setTimeout(() => fl.classList.remove('on'), 140);
  }
}

function _hikCalorRemover() {
  const el = document.getElementById('hik-calor');
  if (el) el.remove();
}
window._hikCalorAtualizar = _hikCalorAtualizar;
window._hikCalorRemover   = _hikCalorRemover;

function _hikTermometroCriar() {
  if (document.getElementById('hik-termometro')) return;

  const wrap = document.createElement('div');
  wrap.id = 'hik-termometro';
  wrap.style.cssText = `
    position: fixed; right: 12px; top: 90px; z-index: 640;
    width: 46px; display: flex; flex-direction: column; align-items: center;
    font-family: 'Noto Serif JP', serif; pointer-events: none;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));
  `;
  wrap.innerHTML = `
    <div id="hik-termometro-label" style="color:#ffd9b0;font-size:0.7rem;margin-bottom:3px;">🌡️ 25°C</div>
    <div style="width:16px;height:110px;border-radius:8px;background:rgba(0,0,0,0.45);
                border:1.5px solid rgba(255,150,90,0.5);position:relative;overflow:hidden;">
      <div id="hik-termometro-fill" style="position:absolute;bottom:0;left:0;width:100%;height:20%;
                background:linear-gradient(#ffcf6b,#ff7a2e);transition:height 0.4s ease, background 0.4s ease;"></div>
    </div>
  `;
  document.body.appendChild(wrap);
}

function _hikTermometroAtualizar(temp) {
  _hikTermometroCriar();
  const label = document.getElementById('hik-termometro-label');
  const fill  = document.getElementById('hik-termometro-fill');
  if (!label || !fill) return;

  const _tempAnterior = parseFloat(label.dataset.temp || '25');
  label.dataset.temp = String(temp);
  _hikCalorAtualizar(temp, temp > _tempAnterior);

  label.textContent = `🌡️ ${Math.round(temp)}°C`;

  // Escala visual só pra encher a barra (100°C ≈ topo) — puramente estética.
  const pct = Math.max(6, Math.min(100, (temp / 100) * 100));
  fill.style.height = pct + '%';

  const acimaDoLimiar = temp > HI_NO_KAGUTSUCHI.temperatura.limiarQueimadura;
  fill.style.background = acimaDoLimiar
    ? 'linear-gradient(#ff7a2e,#c81e1e)'
    : 'linear-gradient(#ffcf6b,#ff7a2e)';
  label.style.color = acimaDoLimiar ? '#ff8a6b' : '#ffd9b0';
}

function _hikTermometroRemover() {
  const el = document.getElementById('hik-termometro');
  if (el) el.remove();
  _hikCalorRemover();
}
window._hikTermometroCriar     = _hikTermometroCriar;
window._hikTermometroAtualizar = _hikTermometroAtualizar;
window._hikTermometroRemover   = _hikTermometroRemover;

// ─────────────────────────────────────────────────────────────
//  FX DE SPRITE — Hi-no-Kagutsuchi
//  Overlay autocontido, mesmo espírito do #hik-termometro acima:
//  não depende do sistema de troca de pose do inimigo (que ainda
//  nem existe pra esse boss), só entra por cima da tela de
//  batalha por um instante e some sozinho.
//
//  Motor genérico (_hikPlaySheetFX) + 2 sheets:
//    • HIK_ATAQUE_SHEET      — ataques normais (hik_sheet_b.png)
//    • HIK_PURGATORIO_SHEET  — conjuração da skill ☄️ Purgatório
//  Troca de frame é feita deslocando um <img> com o sheet inteiro
//  dentro de uma janela (overflow:hidden) do tamanho de 1 frame.
// ─────────────────────────────────────────────────────────────

// Sheet dos ATAQUES NORMAIS — 4 frames empilhados na vertical,
// 418×660 cada, já enquadrados/alinhados (garra solta → mãos se
// juntando → mãos juntas → garras erguidas).
const HIK_ATAQUE_SHEET    = 'Imagens/icones/HikDemo/hik_battle_sheet_vertical.png'; // AJUSTE: caminho onde salvar o sheet enquadrado
const HIK_ATAQUE_FRAME_W  = 418;
const HIK_ATAQUE_FRAME_H  = 660;
const HIK_ATAQUE_FRAMES   = 4;
const HIK_ATAQUE_FRAME_MS = 140;

// Sheet do PURGATÓRIO — 4 frames empilhados na vertical, 307×486
// cada, já enquadrados/alinhados.
const HIK_PURGATORIO_SHEET    = 'Imagens/purgatorio_sheet_vertical.png'; // caminho real onde o arquivo foi salvo
const HIK_PURGATORIO_FRAME_W  = 307;
const HIK_PURGATORIO_FRAME_H  = 486;
const HIK_PURGATORIO_FRAMES   = 4;
const HIK_PURGATORIO_FRAME_MS = 160;

if (!document.getElementById('hik-fx-style')) {
  const style = document.createElement('style');
  style.id = 'hik-fx-style';
  style.textContent = `
    @keyframes hikFxGlowPulse {
      0%   { opacity: 0; }
      30%  { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// sheetSrc, frameW/H, frameCount, frameMs: geometria do sheet.
// glowColor: cor do brilho de fundo (rgba). id: pra não empilhar
// duas do mesmo tipo se for chamada de novo rápido.
// Desenha DENTRO do próprio #scene-enemy (no lugar do retrato idle
// dele), não mais como bolha flutuando solta no meio da tela — e
// restaura o retrato normal sozinho (setEnemyAnim('idle')) quando o
// loop de frames termina.
function _hikPlaySheetFX(id, sheetSrc, frameW, frameH, frameCount, frameMs, glowColor) {
  const alvo = document.getElementById('scene-enemy');
  if (!alvo) return; // sem cena de inimigo ativa, não tem onde desenhar

  const antigo = document.getElementById(id);
  if (antigo) antigo.remove();

  // Mesma moldura usada pro retrato normal (buildEnemyVisual chama
  // com size=150 — ver showEnemy()/setEnemyAnim() em palDinh.js).
  const BOX = 150;
  const scale = Math.min(BOX / frameW, BOX / frameH);
  const dispW = Math.round(frameW * scale);
  const dispH = Math.round(frameH * scale);

  const wrap = document.createElement('div');
  wrap.id = id;
  wrap.style.cssText = `
    position: relative; width: ${dispW}px; height: ${dispH}px;
    overflow: hidden; margin: 0 auto;
    filter: drop-shadow(0 0 18px rgba(255,110,40,0.75));
  `;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute; inset: -30%; z-index: 0; border-radius: 50%;
    background: radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%);
    animation: hikFxGlowPulse ${frameMs * frameCount}ms ease-in-out;
  `;

  const img = document.createElement('img');
  img.src = sheetSrc;
  img.style.cssText = `
    position: absolute; left: 0; top: 0; z-index: 1;
    width: ${dispW}px; height: auto;
  `;

  wrap.appendChild(glow);
  wrap.appendChild(img);

  alvo.innerHTML = '';
  alvo.appendChild(wrap);

  let frame = 0;
  const passarFrame = () => {
    img.style.top = (-frame * dispH) + 'px';
    frame++;
    if (frame >= frameCount) {
      setTimeout(() => {
        if (typeof setEnemyAnim === 'function') setEnemyAnim('idle');
      }, frameMs + 80);
      return;
    }
    setTimeout(passarFrame, frameMs);
  };
  passarFrame();
}

function _hikPurgatorioCastFX() {
  _hikPlaySheetFX(
    'hik-purgatorio-fx', HIK_PURGATORIO_SHEET,
    HIK_PURGATORIO_FRAME_W, HIK_PURGATORIO_FRAME_H, HIK_PURGATORIO_FRAMES, HIK_PURGATORIO_FRAME_MS,
    'rgba(255,140,50,0.55)'
  );
}
window._hikPurgatorioCastFX = _hikPurgatorioCastFX;

function _hikAtaqueNormalFX() {
  _hikPlaySheetFX(
    'hik-ataque-fx', HIK_ATAQUE_SHEET,
    HIK_ATAQUE_FRAME_W, HIK_ATAQUE_FRAME_H, HIK_ATAQUE_FRAMES, HIK_ATAQUE_FRAME_MS,
    'rgba(200,40,30,0.35)'
  );
}
window._hikAtaqueNormalFX = _hikAtaqueNormalFX;

// ─────────────────────────────────────────────────────────────
//  SKILLS DO HI-NO-KAGUTSUCHI — mesmo molde do EIR_SKILLS:
//  executar(hikStats, playerRuntime) retorna {sucesso, msg, ...}.
//  Ainda só a Skill 1 foi definida — as próximas entram aqui
//  conforme forem chegando.
// ─────────────────────────────────────────────────────────────
const HIK_SKILLS = {
  // 🌡️ SKILL 1 — ELEVAÇÃO DE TEMPERATURA
  elevacaoTemperatura: {
    nome: '🌡️ Elevação de Temperatura',
    elemento: 'fogo',
    tipo: 'ambiente',
    cooldown: 0, // AJUSTE: cooldown não especificado
    descricao: 'Aquece a sala, aumentando o próprio Dano de Fogo. Acima de 50°C, o calor queima o jogador a cada turno do chefe.',
    executar(hikStats, playerRuntime) {
      // Aumento sorteado entre 10% e 100% — aplicado igual na
      // temperatura (°C, só pra exibição/tema) e no Dano de Fogo
      // (o que de fato importa pro dano dele).
      const aumentoPct = 0.10 + Math.random() * 0.90; // AJUSTE: distribuição exata não especificada — uniforme por enquanto

      const tempAntes = hikStats.temperatura.atual;
      hikStats.temperatura.atual = Math.round(tempAntes * (1 + aumentoPct) * 10) / 10;

      const danoFogoAntes = hikStats.danoFogo.atual;
      hikStats.danoFogo.atual = Math.min(hikStats.danoFogo.max, danoFogoAntes * (1 + aumentoPct));

      _hikTermometroAtualizar(hikStats.temperatura.atual);

      let msg = `🌡️ Elevação de Temperatura! A sala sobe de ${tempAntes}°C para ${hikStats.temperatura.atual}°C — o Dano de Fogo dele vai de ${Math.round(danoFogoAntes * 100)}% para ${Math.round(hikStats.danoFogo.atual * 100)}%.`;

      // A queimadura NÃO acontece mais aqui: agora o calor da sala queima
      // a cada turno do chefe enquanto estiver acima do limiar (ver
      // hikQueimaduraPorTurno + _specialInner no motor de batalha).
      const queimouExtra = false;
      const danoQueimadura = 0;
      if (hikStats.temperatura.atual > hikStats.temperatura.limiarQueimadura) {
        msg += ` A sala passou de ${hikStats.temperatura.limiarQueimadura}°C — agora o calor vai te queimar a cada turno!`;
      }

      return {
        sucesso: true,
        msg,
        tempAntes,
        tempDepois: hikStats.temperatura.atual,
        danoFogoAntes,
        danoFogoDepois: hikStats.danoFogo.atual,
        queimouExtra,
        danoQueimadura,
        efeito: 'elevacao_temperatura',
      };
    },
  },

  // ☄️ SKILL 2 — PURGATÓRIO (bola de fogo: DMG base + 20% de Dano de Fogo extra)
  purgatorio: {
    nome: '☄️ Purgatório',
    elemento: 'fogo',
    tipo: 'ataque',
    cooldown: 0, // AJUSTE: cooldown não especificado
    descricao: 'Lança uma bola de fogo que explode no jogador — dano base normal + 20% de Dano de Fogo adicional.',
    executar(hikStats, playerRuntime) {
      // Toca a animação de conjuração (4 frames) por cima da tela —
      // visual apenas, não trava nem atrasa o cálculo de dano abaixo.
      _hikPurgatorioCastFX();

      // Dano base: mesma lógica de ataque normal usada no resto do
      // jogo (ATK × DMG% − metade da DEF do alvo).
      const danoBase = Math.max(1, Math.floor(hikStats.atk * hikStats.dmgMult) - Math.floor((playerRuntime && playerRuntime.def || 0) / 2));

      // "20% de Dano de Fogo adicional, além do DMG base" — interpretei
      // como +20 pontos percentuais SOMADOS ao Dano de Fogo atual dele
      // (que já sobe com a Elevação de Temperatura), aplicados como
      // multiplicador extra sobre o dano base. AJUSTE: se a intenção
      // era só +20% fixo (sem somar o Dano de Fogo atual), é só trocar
      // a linha abaixo por `const multFogoExtra = 0.20;`.
      const multFogoExtra = 0.20 + (hikStats.danoFogo ? hikStats.danoFogo.atual : 0);
      const danoFogoExtra = Math.floor(danoBase * multFogoExtra);
      const danoTotal = danoBase + danoFogoExtra;

      if (playerRuntime) {
        playerRuntime.hp = Math.max(0, (playerRuntime.hp || 0) - danoTotal);
      }

      return {
        sucesso: true,
        msg: `☄️ Purgatório! Uma bola de fogo explode em cima de você — ${danoBase} de dano base +${danoFogoExtra} de Dano de Fogo extra = ${danoTotal} no total!`,
        danoBase,
        danoFogoExtra,
        danoTotal,
        efeito: 'purgatorio',
      };
    },
  },

  // 👁️ SKILL 3 — OLHO DE EIR (buff aleatório: +20% dano OU +40% regen/turno)
  olhoDeEir: {
    nome: '👁️ Olho de Eir',
    elemento: null,
    tipo: 'buff_aleatorio',
    cooldown: 0, // AJUSTE: cooldown não especificado
    descricao: 'Sorteia um entre dois efeitos: +20% de dano ou +40% de regeneração de HP por turno.',
    executar(hikStats) {
      const sorteio = Math.random() < 0.5 ? 'dano' : 'regen';

      if (sorteio === 'dano') {
        // AJUSTE: sem duração especificada — tratei como permanente
        // pro resto da luta (igual ao "regen" abaixo), acumulando se
        // a skill sortear "dano" mais de uma vez.
        const buff = Math.floor(hikStats.atk * 0.20);
        hikStats.atk += buff;

        return {
          sucesso: true,
          msg: `👁️ Olho de Eir! O olho dela brilha no peito dele — ATK +${buff} (+20%) pelo resto da luta.`,
          tipoSorteado: 'dano',
          valor: buff,
          efeito: 'olho_de_eir_dano',
        };
      }

      hikStats.regenPctPorTurno = (hikStats.regenPctPorTurno || 0) + 0.40;

      return {
        sucesso: true,
        msg: `👁️ Olho de Eir! O olho dela brilha no peito dele — regenera +40% de HP por turno a partir de agora.`,
        tipoSorteado: 'regen',
        valor: 0.40,
        efeito: 'olho_de_eir_regen',
      };
    },
  },

  // TODO: próximas skills entram aqui.
};
window.HIK_SKILLS = HIK_SKILLS;

// ─────────────────────────────────────────────────────────────
//  SALÃO DO TRONO DE VERDADE — o jogador entra, o Oni puxa ele
//  pra dentro da sala rindo, debocha da "façanha" de ter passado
//  pelas Estátuas e pela Eir, e oferece uma vantagem antes da
//  luta começar (escolha do jogador, sem custo pra ele).
//
//  ⚠️ Só a entrada + a escolha da vantagem estão prontas aqui.
//  A luta em si (moveset do Hi-no-Kagutsuchi) ainda falta — ver
//  TODO em storyNode_inazami_hik_batalha_real_TODO mais abaixo.
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_hik_confronto_real_TODO() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'HI-NO-KAGUTSUCHI',
    `Mal você põe os pés na sala, uma mão enorme fecha-se ao seu redor e te puxa pra dentro, sem pedir licença. Ele ri — o mesmo som grave de antes, agora bem mais perto.\n\n"Finalmente você apareceu! Tive que esperar tanto tempo que até fiquei entediado."\n\n"Fico surpreso com sua dedicação. Até mesmo você, fraco desse jeito, conseguiu passar pelas estátuas e pela Eir. Parabéns!"\n\n"Agora vou mostrar um pouco da minha força."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_hik_escolha_vantagem },
    ]
  );
}
window.storyNode_inazami_hik_confronto_real_TODO = storyNode_inazami_hik_confronto_real_TODO;

function storyNode_inazami_hik_escolha_vantagem() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'HI-NO-KAGUTSUCHI',
    `Ele te solta, dando um passo pra trás — como quem abre espaço de propósito, sem pressa nenhuma.\n\n"Escolha uma vantagem: quer receber um pouco de ataque para tentar me derrotar, ou prefere que minha defesa seja enfraquecida?"`,
    [
      { icon:'⚔️', text:'Bônus de ATK', action: storyNode_inazami_hik_vantagem_ataque },
      { icon:'🛡️', text:'Redução da DEF do chefe', action: storyNode_inazami_hik_vantagem_defesa },
      { icon:'🚫', text:'Recusar a ajuda', action: storyNode_inazami_hik_vantagem_recusar },
    ]
  );
}
window.storyNode_inazami_hik_escolha_vantagem = storyNode_inazami_hik_escolha_vantagem;

// TODO: aplicar o bônus de fato (buff de ATK do jogador, valor exato
// ainda não definido) quando a luta real for montada — por enquanto
// só guarda a escolha e mostra a reação de deboche dele.
function storyNode_inazami_hik_vantagem_ataque() {
  G.inazami = G.inazami || {};
  G.inazami.hikVantagemEscolhida = 'ataque';
  setStory(
    'HI-NO-KAGUTSUCHI',
    `"Ataque, então." — ele sorri, como quem já esperava essa resposta. "Ambição bonita de ver. Só espero que você saiba usar isso antes que seja tarde demais pra você."`,
    [
      { icon:'⚔️', text:'Continuar', action: storyNode_inazami_hik_batalha_real_TODO },
    ]
  );
}
window.storyNode_inazami_hik_vantagem_ataque = storyNode_inazami_hik_vantagem_ataque;

// TODO: aplicar o debuff de fato (redução de DEF do boss, valor exato
// ainda não definido) quando a luta real for montada — por enquanto
// só guarda a escolha e mostra a reação de deboche dele.
function storyNode_inazami_hik_vantagem_defesa() {
  G.inazami = G.inazami || {};
  G.inazami.hikVantagemEscolhida = 'defesa';
  setStory(
    'HI-NO-KAGUTSUCHI',
    `"Minha defesa? Interessante." — ele estala o pescoço, sem se abalar nem um pouco. "Vai por aí, então. Só não reclama depois que meu ataque continua exatamente do mesmo tamanho."`,
    [
      { icon:'⚔️', text:'Continuar', action: storyNode_inazami_hik_batalha_real_TODO },
    ]
  );
}
window.storyNode_inazami_hik_vantagem_defesa = storyNode_inazami_hik_vantagem_defesa;

// Recusar a ajuda: nenhum bônus/debuff é guardado — a luta acontece
// nos stats crus do HI_NO_KAGUTSUCHI, sem vantagem nenhuma pro jogador.
function storyNode_inazami_hik_vantagem_recusar() {
  G.inazami = G.inazami || {};
  G.inazami.hikVantagemEscolhida = 'recusada';
  setStory(
    'HI-NO-KAGUTSUCHI',
    `Ele ergue as sobrancelhas — a primeira reação genuína desde que a chama de Inazami se apagou.\n\n"Recusar? Orgulhoso até o fim, hm?" — a risada volta, mais cheia dessa vez. "Gosto disso. Vai deixar tudo bem mais rápido."`,
    [
      { icon:'⚔️', text:'Continuar', action: storyNode_inazami_hik_batalha_real_TODO },
    ]
  );
}
window.storyNode_inazami_hik_vantagem_recusar = storyNode_inazami_hik_vantagem_recusar;

// Enemy object usado por showEnemy()/startBattle(). O hook em
// _hookHikStartBattle (seção "MOTOR DE BATALHA — HI-NO-KAGUTSUCHI"
// mais abaixo) detecta id==='hi_no_kagutsuchi' e sobrescreve hp/atk/
// def com os valores reais de HI_NO_KAGUTSUCHI — aqui só precisamos
// dos campos visuais/de recompensa que esse hook não mexe (mesmo
// padrão de _inazamiMontarEirBoss()).
function _inazamiMontarHikBoss() {
  const base = (typeof HI_NO_KAGUTSUCHI !== 'undefined') ? HI_NO_KAGUTSUCHI : {};
  return {
    id:       'hi_no_kagutsuchi',
    ai:       'hi_no_kagutsuchi',
    name:     base.nome || 'Hi-no-Kagutsuchi, o Oni das Chamas',
    icon:     '👹',
    img:      base.sprite || 'Imagens/icones/OniC.png',
    elemento: 'fogo',
    hp:       base.hp    || 4300,
    maxHp:    base.maxHp || 4300,
    atk:      base.atk   || 200,
    def:      base.def   || 140,
    isBoss: true,
    // Força o motor a sempre passar pelo caminho "especial" (é ali que
    // os FX de sprite disparam — ver patch em palDinh.js). Sem isso,
    // boa parte dos turnos dele caía num ataque genérico sem frame
    // nenhum. AJUSTE: 1.0 = todo turno mostra frame; pode baixar se
    // quiser ataques "silenciosos" de vez em quando.
    forceSpecialChance: 1,
    atkNome: 'ataca com as garras em chamas',
    desc: 'O Oni das Chamas — o verdadeiro dono do Salão do Trono, guardado até agora por selos, estátuas e pela própria Eir.',
    loot: [],
  };
}
window._inazamiMontarHikBoss = _inazamiMontarHikBoss;

// Dispara a luta real contra o Hi-no-Kagutsuchi — mesmo padrão da
// Eir (storyNode_inazami_fase2_batalha): monta o enemy visual, guarda
// o callback de vitória (chamado por endBattle() em palDinh.js quando
// o HP dele chega a 0) e entrega pro motor de batalha real. O
// moveset/IA de verdade dele mora na seção "MOTOR DE BATALHA —
// HI-NO-KAGUTSUCHI" mais abaixo neste mesmo arquivo.
function storyNode_inazami_hik_batalha_real_TODO() {
  const hik = _inazamiMontarHikBoss();
  G._dungeonBattleCallback = () => {
    storyNode_inazami_hik_vitoria();
  };
  showEnemy(hik);
  startBattle(hik);
}
window.storyNode_inazami_hik_batalha_real_TODO = storyNode_inazami_hik_batalha_real_TODO;

// ─────────────────────────────────────────────────────────────
//  VITÓRIA / RECOMPENSAS — derrotar o Hi-no-Kagutsuchi dá, na
//  ordem: 1 Selo, 1 Baú (com loots dropáveis por chance) e a
//  Alma das Chamas (garantida). Depois disso, a Inazami — que
//  passou a luta toda como boneco no peito dele — é libertada.
//
//  ⚠️ Status/stats do Selo: ainda não definidos, aguardando.
//  ⚠️ Loots do baú: tabela ainda vazia (HI_NO_KAGUTSUCHI.lootBau),
//  preencher quando os itens dropáveis forem definidos.
//  ⚠️ Forma final da Inazami (continua boneco ou volta ao normal):
//  ainda não definida — a cena abaixo deixa isso em aberto de
//  propósito, sem resolver.
// ─────────────────────────────────────────────────────────────

const ITEM_SELO_HI_NO_KAGUTSUCHI = {
  id:   'selo_hi_no_kagutsuchi',
  name: 'Selo de Hi-no-Kagutsuchi',
  icon: '🔥',
  imgSrc: 'Imagens/icones/materiais/selohinoga.png',
  type: 'chave', // AJUSTE: pode virar 'equipamento' dependendo dos status que ainda faltam
  unique: true,
  weight: 0,
  desc: 'Um selo arrancado do próprio Oni, ainda pulsando calor. TODO: status/efeitos ainda não definidos.',
};

const ITEM_ALMA_DAS_CHAMAS = {
  id:   'alma_das_chamas',
  name: 'Alma das Chamas',
  icon: '👻',
  type: 'chave', // AJUSTE: tipo exato (chave/material/consumível) ainda não especificado
  unique: true,
  weight: 0,
  desc: 'O que restou de Hi-no-Kagutsuchi depois da queda — uma chama pequena, contida, mas viva.',
};

// ─────────────────────────────────────────────────────────────
//  AMULETO DO OLHO DE EIR — acessório único, drop garantido do
//  baú do Hi-no-Kagutsuchi. +HP Máx passivo (hpPct, ver suporte
//  novo em palDinh.js/_applyAccBonus) + a mecânica de proc em
//  combate (ver seção "AMULETO DO OLHO DE EIR — MECÂNICA DE
//  COMBATE" mais abaixo neste arquivo).
// ─────────────────────────────────────────────────────────────
const ITEM_AMULETO_OLHO_DE_EIR = {
  id:        'amuleto_hik_olho_de_eir',
  name:      'Amuleto do Olho de Eir',
  icon:      '👁️',
  imgSrc:    'Imagens/Amuleto/Muletrs.png',
  type:      'equipamento',
  equipSlot: 'acessorio',
  unique:    true,
  weight:    0.5,
  hpPct:     0.20, // +20% HP Máx ao equipar — AJUSTE: livre pra recalibrar
  desc:      'Um fragmento do olho que Hi-no-Kagutsuchi arrancou de Eir, agora preso num cordão. De vez em quando ele se abre sozinho em combate — e por um instante, o ponto fraco do inimigo fica exposto.',
};
window.ITEM_AMULETO_OLHO_DE_EIR = ITEM_AMULETO_OLHO_DE_EIR;

// TODO: valores de chance/qty dos materiais abaixo são um primeiro
// palpite — ajuste livremente depois de testar a sensação do drop.
HI_NO_KAGUTSUCHI.lootBau = [
  { ...ITEM_AMULETO_OLHO_DE_EIR, chance: 1.0 },
  { id:'hematoide',      name:'Hematóide',      icon:'🔥', imgSrc:'Imagens/icones/materiais/hematoidFogg.png',
    type:'material', chance:1.0, qty:3, weight:0.4,
    desc:'Cristal de fogo denso, ainda quente ao toque. Material de craft.' },
  { id:'escama_ignea',   name:'Escama Ígnea',   icon:'🔥', imgSrc:'Imagens/icones/ignea463.png',
    type:'material', chance:1.0, qty:3, weight:0.3,
    desc:'Escama arrancada do próprio Oni das Chamas. Usada em itens de fogo.' },
  { id:'nucleo_hik',     name:'Núcleo de Hi-no-Kagutsuchi', icon:'💠', imgSrc:'Imagens/icones/materiais/nucleohi-no.png',
    type:'material', chance:0.35, qty:1, weight:0.5, unique:false,
    desc:'O que restou do núcleo de poder do Oni. Material raro de Ascensão de Armas.' },
];
window.ITEM_SELO_HI_NO_KAGUTSUCHI = ITEM_SELO_HI_NO_KAGUTSUCHI;
window.ITEM_ALMA_DAS_CHAMAS       = ITEM_ALMA_DAS_CHAMAS;

function storyNode_inazami_hik_vitoria() {
  setScene('inazami-trono');
  hideEnemy();
  G.inazami = G.inazami || {};
  G.inazami.hiNoKagutsuchiDerrotado = true;
  G.inazami.dungeonInazamiCompleta  = true; // masmorra limpa de vez — o reset de pins não apaga mais essa vitória
  _hikTermometroRemover();
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}

  setStory(
    'NARRADOR',
    `O rugido dele se quebra a meio caminho de virar mais uma risada. Pela primeira vez, o fogo negro em volta do corpo de Hi-no-Kagutsuchi vacila — e não volta a se firmar.\n\nEle cai de joelhos, depois de vez, o peso colossal afundando a pedra do trono. As chamas que sustentavam sua forma se apagam de dentro pra fora, deixando só brasa e fumaça onde antes havia um Oni inteiro.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_hik_recompensas },
    ]
  );
}
window.storyNode_inazami_hik_vitoria = storyNode_inazami_hik_vitoria;

function storyNode_inazami_hik_recompensas() {
  setScene('inazami-trono');
  hideEnemy();

  addItem({ ...ITEM_SELO_HI_NO_KAGUTSUCHI });
  addItem({ ...ITEM_ALMA_DAS_CHAMAS });
  notify('🔥 Selo de Hi-no-Kagutsuchi obtido!', 'gold');
  notify('👻 Alma das Chamas obtida!', 'gold');
  updateHUD();

  setStory(
    'NARRADOR',
    `Entre as brasas, um selo se solta do que sobrou dele — ainda quente, ainda pesado de poder. Perto dali, uma chama pequena flutua sozinha, contida, esperando por alguém que a recolha: a Alma das Chamas.\n\nUm baú de guerra, meio enterrado nas cinzas, sobrevive intacto ao colapso.`,
    [
      { icon:'🔓', text:'Abrir o baú de recompensas', action: storyNode_inazami_hik_bau_abrir },
    ]
  );
}
window.storyNode_inazami_hik_recompensas = storyNode_inazami_hik_recompensas;

function storyNode_inazami_hik_bau_abrir() {
  setScene('inazami-trono');
  hideEnemy();

  const obtidos = [];
  (HI_NO_KAGUTSUCHI.lootBau || []).forEach(l => {
    // Amuleto/armadura que já tem não é entregue de novo (masmorra repetida).
    if (typeof equipDeMasmorraJaTem === 'function' && equipDeMasmorraJaTem(l)) return;
    const chance = (l.chance != null) ? l.chance : 1.0;
    if (Math.random() < chance) {
      // Spread de TODOS os campos do item de loot (não só os básicos) —
      // essencial pro Amuleto do Olho de Eir, que carrega equipSlot/hpPct/
      // imgSrc próprios que o mapeamento antigo (campo a campo) descartava.
      // (exclui "chance", que é só metadado do sorteio, não do item em si)
      const { chance: _omit, ...itemFinal } = l;
      addItem({ imgSrc:null, weight:0.5, qty:1, desc:'', type:'material', unique:false, ...itemFinal });
      notify(`🎁 ${l.icon} ${l.name} obtido!`, 'gold');
      obtidos.push(l.name);
    }
  });
  updateHUD();

  setStory(
    'NARRADOR',
    obtidos.length > 0
      ? `O baú se abre sem resistência. Dentro dele: ${obtidos.join(', ')}.`
      : `O baú se abre sem resistência... mas está vazio. TODO: a tabela de loot ainda não foi preenchida.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_hik_liberta_inazami },
    ]
  );
}
window.storyNode_inazami_hik_bau_abrir = storyNode_inazami_hik_bau_abrir;

function storyNode_inazami_hik_liberta_inazami() {
  setScene('inazami-trono');
  hideEnemy();
  G.inazami = G.inazami || {};
  G.inazami.inazamiLibertada = true;

  // TODO: forma final da Inazami ainda não definida (continua
  // boneco de cerâmica ou volta ao normal) — a cena abaixo é
  // escrita de propósito pra funcionar dos dois jeitos, até essa
  // decisão vir.
  setStory(
    'NARRADOR',
    `É então que você vê: junto ao peito dele, ainda preso entre placas de armadura que já não tem mais dono, o pequeno boneco de cerâmica continua intacto.\n\nVocê o recolhe com cuidado. O calor que vinha dele — fraco, quase imperceptível até agora — parece reagir ao toque, como se ainda houvesse alguém ali dentro, esperando.`,
    [
      (typeof storyNode_inazami_selamento_inicio === 'function' && !G.inazami.acompanhando)
        ? { icon:'🔥', text:'Continuar', action: () => storyNode_inazami_selamento_inicio() }
        : { icon:'🏠', text:'Sair da masmorra', action: () => inazamiSairDaMasmorra() },
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ]
  );
}
window.storyNode_inazami_hik_liberta_inazami = storyNode_inazami_hik_liberta_inazami;

// Salão do Trono depois que o Hi-no-Kagutsuchi já caiu: sala vazia +
// saída. (Antes, tocar no pin reabria a cena/luta do chefe de novo.)
function storyNode_inazami_salao_vazio() {
  setScene('inazami-trono');
  hideEnemy();
  try { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); } catch (_) {}
  setStory(
    'NARRADOR',
    `O Salão do Trono está em silêncio. Onde o Oni rugia, só restam brasas frias e o eco das correntes soltas.\n\nNada mais bloqueia o caminho de volta.`,
    [
      ...((G.inazami && !G.inazami.acompanhando && typeof storyNode_inazami_selamento_inicio === 'function')
        ? [{ icon:'🔥', text:'Falar com Inazami', action: () => storyNode_inazami_selamento_inicio() }]
        : []),
      { icon:'🏠', text:'Sair da masmorra', action: () => inazamiSairDaMasmorra() },
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ]
  );
}
window.storyNode_inazami_salao_vazio = storyNode_inazami_salao_vazio;

function storyNode_inazami_fase3_placeholder() {
  setScene('inazami-f1');
  hideEnemy();
  G.inazami = G.inazami || {};

  // Chefe já derrotado → nunca reabre a luta/cena dele.
  if (G.inazami.hiNoKagutsuchiDerrotado) {
    storyNode_inazami_salao_vazio();
    return;
  }

  // Se o portão já foi aberto (amuleto craftado), retoma direto no
  // ponto da cena/batalha em vez de reoferecer o Salão do Trono.
  if (G.inazami.portaoAberto) {
    if (G.inazami.inazamiSelada) {
      storyNode_inazami_hik_confronto_real_TODO();
    } else if (G.inazami.hiNoKagutsuchiLiberado) {
      storyNode_inazami_hik_liberto_riso();
    } else {
      storyNode_inazami_portao_aberto_intro();
    }
    return;
  }

  setStory(
    'NARRADOR',
    `Faltam apenas um caminho e um fragmento até o fim.\n\nÀ frente, você nota uma passagem lateral que não estava visível antes. Talvez o poder de Inazami, agora que Eir foi vencida, tenha tornado caminhos esquecidos acessíveis novamente.\n\nOu talvez este seja apenas um descanso — uma sala de tesouros perdidos, deixada por guardiões que já não estão.`,
    [
      { icon:'🏆', text:'Entrar no Salão do Trono', action: storyNode_inazami_tesouro_entrada },
      { icon:'▶', text:'Continuar sem explorar', action: () => { notify('O amuleto ainda não está completo.', 'gold'); } },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  SALA DE TESOUROS — Salão do Trono
// ─────────────────────────────────────────────────────────────

function storyNode_inazami_tesouro_entrada() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Você entra no Salão do Trono.\n\nA câmara é vasta e antiga — as paredes cintilam com brasas eternas que não fazem calor, apenas iluminam. Baús de ouro e ferro enferrujado estão espalhados pela sala, alguns ainda pulsando levemente com o calor de séculos.`,
    [
      { icon:'💎', text:'Explorar a sala', action: storyNode_inazami_tesouro_mapa },
    ]
  );
}

// Posições (xPct/yPct) medidas em cima da própria arte tronoPrem.png —
// 4 delas vieram dos pontos que o Chri marcou no print, as outras 3
// (baú-2, baú-4, baú-6) foram encaixadas em outras caixas/baús visíveis
// na imagem que não tinham sido marcados.
const INAZAMI_TESOURO_BAUS = {
  // ID, posição, conteúdo
  'baú-1': {
    nome: 'Baú de Ouro Antigo',
    desc: 'Um baú coberto de poeira, mas ainda brilhando sob as brasas.',
    xPct: 12.7, yPct: 45.2, // prateleira esquerda, alta
    loot: [
      { id: 'ouro', amount: 340 },
    ],
  },
  'baú-2': {
    nome: 'Baú de Ferro',
    desc: 'Um baú pesado, quase negro de ferrugem. Ainda assim, intacto.',
    xPct: 9.4, yPct: 74.6, // cofre pequeno junto à estátua do leão, esquerda
    loot: [
      { id: 'ouro', amount: 380 },
    ],
  },
  'baú-3': {
    nome: 'Cofre Gravado',
    desc: 'Um cofre com símbolos gravados, ainda pulsando levemente.',
    xPct: 81.7, yPct: 39.8, // prateleira direita, alta
    loot: [
      { id: 'ouro', amount: 360 },
    ],
  },
  'baú-4': {
    nome: 'Baú Descolorido',
    desc: 'Um baú que perdeu a cor há muito tempo, consumido pelas brasas.',
    xPct: 78.9, yPct: 69.7, // baú aberto na prateleira direita, mais baixo
    loot: [
      { id: 'ouro', amount: 220 },
    ],
  },
  'baú-5': {
    nome: 'Baú de Cedro',
    desc: 'Um baú feito de madeira que deveria ter apodrecido há séculos, mas persiste.',
    xPct: 45.3, yPct: 59.5, // sobre o altar central
    loot: [
      { id: 'ouro', amount: 350 },
    ],
  },
  'baú-6': {
    nome: 'Cofre de Cristal',
    desc: 'Um cofre transparente que brilha sob as brasas. Contém algo valioso.',
    xPct: 70.9, yPct: 76.6, // banco/caixa de madeira ao lado do baú grande
    loot: [
      { id: 'ouro', amount: 310 },
    ],
  },
  'baú-7': {
    nome: 'Baú Final',
    desc: 'O maior baú da sala, posicionado no centro. Contém... algo especial.',
    xPct: 71.8, yPct: 91.9, // o grande baú ornamentado no chão, direita/frente
    loot: [
      { id: 'ouro', amount: 300 },
    ],
  },
};

// ── Overlay com pins clicáveis sobre a arte do Salão do Trono ──
// Mesmo padrão visual do mapa da masmorra (inazami_mapa.js): imagem +
// pins posicionados em % sobre ela, cada um abrindo o baú correspondente.
function _tesouroInjectCSS() {
  if (document.getElementById('inazami-tesouro-css')) return;
  const st = document.createElement('style');
  st.id = 'inazami-tesouro-css';
  st.textContent = `
    #inazami-tesouro-overlay {
      position: fixed; inset: 0; z-index: 9000;
      background: rgba(5,3,2,0.94);
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 12px 24px;
      overflow-y: auto;
    }
    #inazami-tesouro-close {
      position: absolute; top: 14px; right: 14px;
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(120,20,10,0.55); border: 1.5px solid rgba(255,150,90,0.5);
      color: #ffd9b0; font-size: 1.1rem; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 2;
    }
    #inazami-tesouro-title {
      color: #e8b070; font-size: 1.05rem; letter-spacing: 0.04em;
      text-transform: uppercase; margin: 6px 0 14px; text-align: center;
    }
    #inazami-tesouro-frame {
      position: relative;
      width: 100%; max-width: 420px;
      margin: 0 auto;
    }
    #inazami-tesouro-frame img {
      width: 100%; height: auto; display: block;
      border-radius: 6px;
      filter: drop-shadow(0 0 18px rgba(0,0,0,0.6));
    }
    .inazami-tesouro-pin {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 38px; height: 38px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
      cursor: pointer;
      background: radial-gradient(circle, rgba(255,200,60,0.35), rgba(60,40,8,0.85));
      border: 2px solid rgba(255,210,90,0.85);
      box-shadow: 0 0 12px rgba(255,180,40,0.55);
      animation: inazamiTesouroPinPulse 1.8s ease-in-out infinite;
    }
    .inazami-tesouro-pin.aberto {
      cursor: default;
      border-color: rgba(150,150,150,0.5);
      box-shadow: none;
      background: rgba(40,40,40,0.7);
      animation: none;
      filter: grayscale(1);
      opacity: 0.6;
    }
    @keyframes inazamiTesouroPinPulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50%      { transform: translate(-50%, -50%) scale(1.12); }
    }
    #inazami-tesouro-info {
      max-width: 420px; width: 100%;
      margin-top: 16px;
      background: rgba(20,12,8,0.85);
      border: 1px solid rgba(200,140,80,0.35);
      border-radius: 8px;
      padding: 12px 14px;
      color: #e8d8c0;
      font-size: 0.85rem;
      min-height: 20px;
    }
    #inazami-tesouro-info b { color: #f0b070; }
    #inazami-tesouro-sair {
      max-width: 420px; width: 100%;
      margin-top: 10px;
      background: rgba(40,10,8,0.85);
      border: 1px solid rgba(220,90,60,0.4);
      border-radius: 8px;
      padding: 10px 14px;
      color: #ffb090;
      font-size: 0.85rem;
      text-align: center;
      cursor: pointer;
    }
  `;
  document.head.appendChild(st);
}

function storyNode_inazami_tesouro_mapa() {
  setScene('inazami-trono');
  hideEnemy();
  hideStoryCutscene();
  _tesouroInjectCSS();

  G.inazami = G.inazami || {};
  G.inazami.tesouroAbertos = G.inazami.tesouroAbertos || {};

  let overlay = document.getElementById('inazami-tesouro-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'inazami-tesouro-overlay';
  overlay.innerHTML = `
    <div id="inazami-tesouro-close">✕</div>
    <div id="inazami-tesouro-title">Salão do Trono</div>
    <div id="inazami-tesouro-frame">
      <img src="imagens/inazami masmorra/tronoPrem.png" alt="Salão do Trono">
    </div>
    <div id="inazami-tesouro-info">Toque em um baú pra abrir.</div>
    <div id="inazami-tesouro-sair">▶ Sair da sala</div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('inazami-tesouro-close').onclick = () => overlay.remove();
  document.getElementById('inazami-tesouro-sair').onclick = () => {
    overlay.remove();
    if (typeof storyNode_inazami_fase3_placeholder === 'function') storyNode_inazami_fase3_placeholder();
  };

  const frame = document.getElementById('inazami-tesouro-frame');
  const info  = document.getElementById('inazami-tesouro-info');

  Object.keys(INAZAMI_TESOURO_BAUS).forEach(id => {
    const bau    = INAZAMI_TESOURO_BAUS[id];
    const aberto = !!G.inazami.tesouroAbertos[id];

    const el = document.createElement('div');
    el.className = 'inazami-tesouro-pin' + (aberto ? ' aberto' : '');
    el.style.left = bau.xPct + '%';
    el.style.top  = bau.yPct + '%';
    el.textContent = aberto ? '📭' : '💎';

    el.onclick = () => {
      if (aberto) {
        info.innerHTML = `<b>${bau.nome}</b><br>Já aberto.`;
        return;
      }
      storyNode_inazami_tesouro_abrir(id, el, info);
    };

    frame.appendChild(el);
  });
}

// Abre um baú SEM sair do overlay do Salão do Trono: dá o ouro de
// verdade (G.player.gold, que é o campo que o HUD e o resto do jogo
// realmente leem — G.ouro não existia em lugar nenhum do jogo, por
// isso o ouro nunca aparecia), atualiza o HUD, marca o baú como
// aberto e só troca o texto do painel de info + o ícone do pin.
function storyNode_inazami_tesouro_abrir(bauId, pinEl, infoEl) {
  const bau = INAZAMI_TESOURO_BAUS[bauId];
  G.inazami = G.inazami || {};
  G.inazami.tesouroAbertos = G.inazami.tesouroAbertos || {};

  if (G.inazami.tesouroAbertos[bauId]) {
    if (infoEl) infoEl.innerHTML = `<b>${bau.nome}</b><br>Já aberto.`;
    return;
  }

  let descricaoLoot = `<b>${bau.nome}</b><br>Você encontra:<br>`;
  let ouroGanho = 0;
  bau.loot.forEach(item => {
    if (item.id === 'ouro') {
      descricaoLoot += `• ${item.amount}x Ouro<br>`;
      addLog(`+${item.amount} ouro`);
      if (G.player.gold === undefined) G.player.gold = 0;
      G.player.gold += item.amount;
      ouroGanho = item.amount;
    }
  });

  G.inazami.tesouroAbertos[bauId] = true;

  if (infoEl) infoEl.innerHTML = descricaoLoot;
  if (pinEl) {
    pinEl.classList.add('aberto');
    pinEl.textContent = '📭';
    pinEl.onclick = () => {
      infoEl.innerHTML = `<b>${bau.nome}</b><br>Já aberto.`;
    };
    // ── Número flutuante do ouro ganho — mesmo efeito visual (.float-num
    // + @keyframes floatUp) usado nos números de dano da batalha, só que
    // aqui reaproveitado em cima do próprio pin do baú.
    if (ouroGanho > 0) _tesouroFloatOuro(pinEl, ouroGanho);
  }

  notify(`+${ouroGanho} ouro`, 'gold');
  updateHUD();
}

// Mostra "+N" em dourado subindo e sumindo, ancorado na posição do pin
// que acabou de ser clicado (usa o mesmo .float-num/@keyframes floatUp
// já definidos globalmente pra números de dano/cura da batalha).
function _tesouroFloatOuro(pinEl, valor) {
  const frame = pinEl.parentElement;
  if (!frame) return;
  const div = document.createElement('div');
  div.className = 'float-num';
  div.style.cssText = `
    position:absolute;
    left:${pinEl.style.left}; top:${pinEl.style.top};
    transform:translate(-50%, -50%);
    color:#ffd400;
    font-size:1.1rem;
    pointer-events:none; z-index:9500;
  `;
  div.textContent = `+${valor}`;
  frame.appendChild(div);
  setTimeout(() => div.remove(), 1300);
}

// ─────────────────────────────────────────────────────────────
//  Re-registro dinâmico: chamado ao abrir a Torre para refletir
//  status atual (bloqueada/ativa)
// ─────────────────────────────────────────────────────────────

(function _setupInazamiReregister() {
  function _doReregister() {
    if (typeof registerDungeon !== 'function') return;
    const _inazamiBloqueada = !(typeof G !== 'undefined' && G.dungeonKappaCleared);
    registerDungeon({
      id:        'inazami',
      ordem:     3,
      nome:      'Masmorra Inazami',
      bossNome:  'Hi-no-Kagutsuchi, o Oni das Chamas',
      bossIcon:  'Imagens/icones/OniC.png',
      descricao: _inazamiBloqueada
        ? 'Complete a Masmorra do Kappa para revelar este lugar.'
        : 'Um santuário construído sobre um vulcão sagrado. Uma guardiã presa em seu próprio selo. E uma chama que não deveria despertar.',
      status:    _inazamiBloqueada ? 'bloqueada' : 'ativa',
      stats: [
        { label: 'Dificuldade', value: '★★★★★' },
        { label: 'Recompensa',  value: 'A definir' },
      ],
      entrar: storyNode_inazami_intro,
    });
  }
  const _prev = window._reregisterDungeons;
  window._reregisterDungeons = function() {
    if (typeof _prev === 'function') _prev();
    _doReregister();
  };
})();

// ─────────────────────────────────────────────────────────────
//  SETUP DO PIN DO MAPA — Sala de Tesouros
// ─────────────────────────────────────────────────────────────

(function _setupTesouroPin() {
  function _doSetup() {
    if (typeof G === 'undefined' || !G.inazami || !G.inazami.eirDerrotada) {
      setTimeout(_doSetup, 200);
      return;
    }

    // Coordenadas: base da sala (onde você marcou em verde na imagem)
    const TESOURO_PIN = {
      id:       'inazami-tesouro',
      nome:     'Salão do Trono',
      descricao: '🏆 Sala de Tesouros — Brasas e Ouro',
      icon:     '💎',
      x:        50,   // Porcentagem horizontal (0-100)
      y:        85,   // Porcentagem vertical (0-100) [base da sala]
      acao:     storyNode_inazami_tesouro_entrada,
    };

    // Registrar o pin no sistema de mapa (se existir)
    if (typeof registerMapPin === 'function') {
      registerMapPin(TESOURO_PIN);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doSetup);
  } else {
    _doSetup();
  }
})();

window.storyNode_inazami_intro           = storyNode_inazami_intro;
window.storyNode_inazami_intro2          = storyNode_inazami_intro2;
window.storyNode_inazami_intro3          = storyNode_inazami_intro3;
window.storyNode_inazami_intro4          = storyNode_inazami_intro4;
window.storyNode_inazami_fala_guardia    = storyNode_inazami_fala_guardia;
window.storyNode_inazami_explica_amuleto = storyNode_inazami_explica_amuleto;
window.storyNode_inazami_explica_onibi   = storyNode_inazami_explica_onibi;
window.storyNode_inazami_visao_selos     = storyNode_inazami_visao_selos;
window.storyNode_inazami_fase1           = storyNode_inazami_fase1;
window.storyNode_inazami_fase1_voz       = storyNode_inazami_fase1_voz;
window.storyNode_inazami_fase1_onibi     = storyNode_inazami_fase1_onibi;
window.storyNode_inazami_fase1_batalha   = storyNode_inazami_fase1_batalha;
window.storyNode_inazami_fase1_vitoria   = storyNode_inazami_fase1_vitoria;
window.storyNode_inazami_marca_queimada       = storyNode_inazami_marca_queimada;
window.storyNode_inazami_visao_amuleto        = storyNode_inazami_visao_amuleto;
window.storyNode_inazami_recompensa_amuleto   = storyNode_inazami_recompensa_amuleto;
window.storyNode_inazami_visao_hinokagutsuchi = storyNode_inazami_visao_hinokagutsuchi;
window.storyNode_inazami_fase2_intro          = storyNode_inazami_fase2_intro;
window.storyNode_inazami_fase2                = storyNode_inazami_fase2;
window.storyNode_inazami_fase2_camara         = storyNode_inazami_fase2_camara;
window.storyNode_inazami_fase2_eir_fala       = storyNode_inazami_fase2_eir_fala;
window.storyNode_inazami_fase2_valkiria_batalha = storyNode_inazami_fase2_valkiria_batalha;
window.storyNode_inazami_fase2_valkiria_vitoria = storyNode_inazami_fase2_valkiria_vitoria;
window.storyNode_inazami_fase2_marca_eir      = storyNode_inazami_fase2_marca_eir;
window.storyNode_inazami_fase2_visao_eir      = storyNode_inazami_fase2_visao_eir;
window.storyNode_inazami_fase2_recompensa_eir = storyNode_inazami_fase2_recompensa_eir;
window.storyNode_inazami_fase3_placeholder    = storyNode_inazami_fase3_placeholder;
window.storyNode_inazami_tesouro_entrada      = storyNode_inazami_tesouro_entrada;
window.storyNode_inazami_tesouro_mapa         = storyNode_inazami_tesouro_mapa;
window.storyNode_inazami_tesouro_abrir        = storyNode_inazami_tesouro_abrir;
// As funções de mapa (storyNode_inazami_mapa, storyNode_inazami_mapa_torii)
// já se exportam sozinhas dentro de inazami_mapa.js — não precisa repetir aqui.
// Só lembre de incluir o <script src="inazami_mapa.js?v=..."> no gat-1.html
// DEPOIS deste arquivo (ele usa storyNode_inazami_fase2_camara e
// storyNode_inazami_fase3_placeholder, que precisam existir antes).

// ─────────────────────────────────────────────────────────────
//  PIN DO MAPA — SALÃO DO TRONO (Sala de Tesouros)
//  Integrado direto neste arquivo (antes separado em inazami_mapa_tesouro.js)
// ─────────────────────────────────────────────────────────────

(function _setupTesouroPin() {
  function _doSetup() {
    if (typeof G === 'undefined' || !G.inazami || !G.inazami.eirDerrotada) {
      setTimeout(_doSetup, 200);
      return;
    }

    const TESOURO_PIN = {
      id:       'inazami-tesouro',
      nome:     'Salão do Trono',
      descricao: '🏆 Sala de Tesouros — Brasas e Ouro',
      icon:     '💎',
      x:        50,  // Porcentagem horizontal (0-100)
      y:        85,  // Porcentagem vertical (0-100)  [base da sala]
      acao:     storyNode_inazami_tesouro_entrada,
    };

    if (typeof registerMapPin === 'function') {
      registerMapPin(TESOURO_PIN);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doSetup);
  } else {
    _doSetup();
  }
})();

window._tesouroPin = {
  id: 'inazami-tesouro',
  nome: 'Salão do Trono',
  coordsX: 50,
  coordsY: 85,
};

// ═══════════════════════════════════════════════════════════
//  FIM: inazami_dungeon.js
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  INÍCIO: inazami_mapa.js
// ═══════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════
//  inazami_mapa.js
//  Mapa clicável da Masmorra Inazami — mostra a arte do mapa com
//  pins nas salas importantes. Cada pin abre o story node certo,
//  e fica travado/disponível/concluído de acordo com o progresso
//  salvo em G.inazami.
//
//  Arquivo da arte do mapa (mesma imagem usada nas 3 fotos que
//  você mandou, só uma vez — os pins são todos coordenadas sobre
//  ela, não precisa de PNG por sala):
//    imagens/inazami masmorra/mapa_inazami.png
// ═════════════════════════════════════════════════════════════

(function () {

  // ── Coordenadas dos pins (extraídas por análise de pixel da arte
  //    original 1024×1536 — % da largura/altura da imagem) ──
  const INAZAMI_MAPA_PINS = [
    {
      id:     'torii_entrada',
      label:  'Portão Selado',
      desc:   'Inazami guarda o selo de Hi-no-Kagutsuchi aqui.',
      xPct:   45.4,
      yPct:   83.1,
      icon:   '⛩️',
      always: true, // sempre disponível, não trava nem marca "concluído"
      action: () => {
        if (typeof storyNode_inazami_mapa_torii === 'function') storyNode_inazami_mapa_torii();
      },
    },
    {
      id:      'onibi_trio',
      label:   'Chamas Perdidas',
      desc:    'Três luzes azuis flutuam entre as ruínas — os Onibi das Cinzas guardam fragmentos do amuleto.',
      xPct:    58.0,
      yPct:    80.0,
      icon:    '🔥',
      always:  true, // liberado desde o início, perto da entrada
      // já concluído se a flag onibiDerrotados existir (evita repetir a luta)
      doneFlag: 'onibiDerrotados',
      action: () => {
        if (typeof storyNode_inazami_fase1_onibi === 'function') storyNode_inazami_fase1_onibi();
      },
    },
    {
      id:      'sala_nucleo',
      label:   'Sala do Núcleo',
      desc:    'Onde a Eir está sendo forjada pelo núcleo.',
      xPct:    29.7,
      yPct:    60.4,
      icon:    '⚡',
      // só libera depois que os 3 Onibi caírem
      requiresFlag: 'onibiDerrotados',
      doneFlag:     'eirDerrotada',
      action: () => {
        if (typeof storyNode_inazami_fase2_camara === 'function') storyNode_inazami_fase2_camara();
      },
    },
    {
      id:      'alberon_caldeirao',
      label:   'O Caldeirão de Alberon',
      desc:    'Um vulto estranho cuida de um caldeirão fervente bem no centro dos caminhos.',
      xPct:    50.1,
      yPct:    53.6,
      icon:    '⚗️',
      // só libera depois de derrotar a Eir — nesse ponto já são 2 fragmentos guardados
      requiresFlag: 'eirDerrotada',
      doneFlag:     'buffCaldeiraoObtido',
      action: () => {
        if (typeof storyNode_inazami_alberon_intro === 'function') storyNode_inazami_alberon_intro();
      },
    },
    {
      id:      'corredor_estatuas',
      label:   'Corredor das Estátuas',
      desc:    'Três estátuas do Oni das Chamas guardam a escadaria antes do salão do trono.',
      // ⚠️ Posição provisória — estimada a partir da captura de tela que você
      // marcou (escadaria entre o portão selado e a sala octogonal). Ajuste
      // xPct/yPct aqui depois de conferir ao vivo no mapa, se não bater certinho.
      xPct:    47.5,
      yPct:    44.0,
      icon:    '🗿',
      // só libera depois do buff do Caldeirão de Alberon
      requiresFlag: 'buffCaldeiraoObtido',
      doneFlag:     'corredorEstatuasDerrotado',
      action: () => {
        if (typeof storyNode_inazami_corredor_estatuas_intro === 'function') storyNode_inazami_corredor_estatuas_intro();
      },
    },
    {
      id:      'sala_hi_no_kagutsuchi',
      label:   'Salão do Trono',
      desc:    'O calor que vem lá de dentro já não é o de um selo. É o de algo que acordou.',
      // ⚠️ Posição estimada a partir do print do portão no topo do mapa
      // (Santuário das Cinzas Eternas). Ajuste fino ao vivo se não bater certinho.
      xPct:    50,
      yPct:    10,
      icon:    '👹',
      // agora só libera depois do Corredor das Estátuas (antessala real do Oni)
      requiresFlag: 'corredorEstatuasDerrotado',
      doneFlag:     'hiNoKagutsuchiDerrotado',
      action: () => {
        if (typeof storyNode_inazami_fase3_placeholder === 'function') storyNode_inazami_fase3_placeholder();
      },
    },
  ];
  window.INAZAMI_MAPA_PINS = INAZAMI_MAPA_PINS;

  // ── CSS (injetado uma única vez) ──
  function _mapaInjectCSS() {
    if (document.getElementById('inazami-mapa-css')) return;
    const st = document.createElement('style');
    st.id = 'inazami-mapa-css';
    st.textContent = `
      #inazami-mapa-overlay {
        position: fixed; inset: 0; z-index: 9000;
        background: rgba(5,3,2,0.94);
        display: flex; flex-direction: column; align-items: center;
        padding: 16px 12px 24px;
        overflow-y: auto;
      }
      #inazami-mapa-close {
        position: absolute; top: 14px; right: 14px;
        width: 38px; height: 38px; border-radius: 50%;
        background: rgba(120,20,10,0.55); border: 1.5px solid rgba(255,150,90,0.5);
        color: #ffd9b0; font-size: 1.1rem; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; z-index: 2;
      }
      #inazami-mapa-title {
        color: #e8b070; font-size: 1.05rem; letter-spacing: 0.04em;
        text-transform: uppercase; margin: 6px 0 14px; text-align: center;
      }
      #inazami-mapa-frame {
        position: relative;
        width: 100%; max-width: 420px;
        margin: 0 auto;
      }
      #inazami-mapa-frame img {
        width: 100%; height: auto; display: block;
        border-radius: 6px;
        filter: drop-shadow(0 0 18px rgba(0,0,0,0.6));
      }
      .inazami-pin {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 40px; height: 40px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.2rem;
        cursor: pointer;
        background: radial-gradient(circle, rgba(255,140,60,0.35), rgba(60,20,8,0.85));
        border: 2px solid rgba(255,170,90,0.85);
        box-shadow: 0 0 12px rgba(255,120,40,0.55);
        animation: inazamiPinPulse 1.8s ease-in-out infinite;
      }
      .inazami-pin.locked {
        cursor: not-allowed;
        opacity: 0.45;
        border-color: rgba(150,150,150,0.5);
        box-shadow: none;
        background: rgba(40,40,40,0.7);
        animation: none;
        filter: grayscale(1);
      }
      .inazami-pin.done {
        border-color: rgba(120,220,140,0.85);
        box-shadow: 0 0 12px rgba(90,220,120,0.55);
        background: radial-gradient(circle, rgba(90,220,120,0.30), rgba(10,40,15,0.85));
        animation: none;
      }
      @keyframes inazamiPinPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50%      { transform: translate(-50%, -50%) scale(1.12); }
      }
      #inazami-mapa-info {
        max-width: 420px; width: 100%;
        margin-top: 16px;
        background: rgba(20,12,8,0.85);
        border: 1px solid rgba(200,140,80,0.35);
        border-radius: 8px;
        padding: 12px 14px;
        color: #e8d8c0;
        font-size: 0.85rem;
        min-height: 20px;
      }
      #inazami-mapa-info b { color: #f0b070; }
      #inazami-mapa-sair {
        max-width: 420px; width: 100%; box-sizing: border-box;
        margin-top: 12px; padding: 12px 14px; text-align: center;
        background: rgba(90,50,10,0.75);
        border: 1.5px solid rgba(255,190,110,0.7);
        border-radius: 8px; color: #ffe2b8; font-size: 0.95rem;
        letter-spacing: 0.04em; cursor: pointer;
      }
    `;
    document.head.appendChild(st);
  }

  // Usado para checar requiresFlag: sem flag = sempre desbloqueado
  function _mapaCheckUnlock(flagName) {
    if (!flagName) return true;
    G.inazami = G.inazami || {};
    return !!G.inazami[flagName];
  }

  // Usado para checar doneFlag: sem flag = nunca "concluído"
  // (bug antigo: reaproveitava a mesma função de unlock, então um
  // pin sem doneFlag definido aparecia sempre como ✅ concluído)
  function _mapaCheckDone(flagName) {
    if (!flagName) return false;
    G.inazami = G.inazami || {};
    return !!G.inazami[flagName];
  }

  // ── Renderiza a tela do mapa ──
  function storyNode_inazami_mapa() {
    _mapaInjectCSS();
    G.inazami = G.inazami || {};
    // Fecha qualquer imagem de cutscene que tenha ficado aberta (ex.: a
    // faixa do Caldeirão de Alberon, que continuava aparecendo embaixo
    // da cena nos nós seguintes, como o Portão Selado).
    try { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); } catch (_) {}

    let overlay = document.getElementById('inazami-mapa-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'inazami-mapa-overlay';
    overlay.innerHTML = `
      <div id="inazami-mapa-close">✕</div>
      <div id="inazami-mapa-title">Masmorra Inazami</div>
      <div id="inazami-mapa-frame">
        <img src="imagens/inazami masmorra/mapa_inazami.png" alt="Mapa da Masmorra Inazami">
      </div>
      <div id="inazami-mapa-info">Toque em um ponto do mapa pra ver do que se trata.</div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('inazami-mapa-close').onclick = () => overlay.remove();

    // Boss final derrotado → botão de sair da masmorra no próprio mapa.
    if (G.inazami.hiNoKagutsuchiDerrotado) {
      const sair = document.createElement('div');
      sair.id = 'inazami-mapa-sair';
      sair.textContent = '🏠 Sair da masmorra';
      sair.onclick = () => { overlay.remove(); inazamiSairDaMasmorra(); };
      overlay.appendChild(sair);
    }

    const frame = document.getElementById('inazami-mapa-frame');
    const info  = document.getElementById('inazami-mapa-info');

    INAZAMI_MAPA_PINS.forEach(pin => {
      const unlocked = pin.always || _mapaCheckUnlock(pin.requiresFlag);
      const done     = _mapaCheckDone(pin.doneFlag);

      const el = document.createElement('div');
      el.className = 'inazami-pin' + (unlocked ? '' : ' locked') + (done ? ' done' : '');
      el.style.left = pin.xPct + '%';
      el.style.top  = pin.yPct + '%';
      el.textContent = done ? '✅' : (unlocked ? pin.icon : '🔒');

      el.onclick = () => {
        if (!unlocked) {
          info.innerHTML = `<b>${pin.label}</b><br>Ainda não disponível — continue avançando na masmorra.`;
          return;
        }
        overlay.remove();
        pin.action();
      };

      // toque curto só mostra a descrição; a ação real dispara no clique
      // (mantido simples de propósito — sem long-press por enquanto)
      frame.appendChild(el);
    });
  }
  window.storyNode_inazami_mapa = storyNode_inazami_mapa;

  // ── Flavor node do Portão Selado (Inazami) ──
  function storyNode_inazami_mapa_torii() {
    setScene('inazami-f1');
    hideEnemy();
    try { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); } catch (_) {}
    G.inazami = G.inazami || {};

    // Boss final já derrotado: o selo não prende mais nada — oferece a saída.
    if (G.inazami.hiNoKagutsuchiDerrotado) {
      const botoes = [];
      if (!G.inazami.acompanhando && typeof storyNode_inazami_selamento_inicio === 'function') {
        botoes.push({ icon:'🔥', text:'Falar com Inazami', action: () => storyNode_inazami_selamento_inicio() });
      }
      botoes.push({ icon:'🏠', text:'Sair da masmorra', action: () => inazamiSairDaMasmorra() });
      botoes.push({ icon:'▶', text:'Voltar ao mapa', action: storyNode_inazami_mapa });
      setStory(
        'NARRADOR',
        `A chama do portão não treme mais. Onde havia um selo, só restam cinzas frias — Hi-no-Kagutsuchi caiu, e nada mais prende esta masmorra.\n\nO caminho de volta está livre.`,
        botoes
      );
      return;
    }

    setStory(
      'INAZAMI',
      `A chama do portão treme quando você se aproxima.\n\n"O selo segue firme aqui — por enquanto." — a voz de Inazami sai cansada, mas constante. "Cada fragmento que você recupera me dá um pouco mais de força pra segurar as correntes."\n\n"Vá. Ainda há caminho pela frente."`,
      [
        { icon:'▶', text:'Voltar ao mapa', action: storyNode_inazami_mapa },
      ]
    );
  }
  window.storyNode_inazami_mapa_torii = storyNode_inazami_mapa_torii;

  // ═════════════════════════════════════════════════════════════
  //  FASE 2 — SALA DO NÚCLEO: encontro com Eir, a Valkiria
  //  Cutscene em 4 beats terminando na luta contra a Eir
  //  (stats/skills/IA completos em eir_valkiria.js).
  // ═════════════════════════════════════════════════════════════

  // Enemy object usado por showEnemy()/startBattle(). O hook em
  // eir_valkiria.js detecta id==='eir_valkiria' e sobrescreve hp/atk/
  // def/spd/crit com os valores reais de EIR_VALKIRIA — aqui só
  // precisamos dos campos visuais/de recompensa que esse hook não mexe.
  function _inazamiMontarEirBoss() {
    const base = (typeof EIR_VALKIRIA !== 'undefined') ? EIR_VALKIRIA : {};
    return {
      id:       'eir_valkiria',
      ai:       'eir_valkiria',
      name:     base.nome || 'Eir, a Valkiria',
      icon:     '⚡',
      img:      'Imagens/personagens/eir_valkiria.png',
      elemento: 'raio',
      hp:       base.hp    || 2000,
      maxHp:    base.maxHp || 2000,
      atk:      base.atk   || 120,
      def:      base.def   || 100,
      critChance: base.critRate || 0.70,
      critMult:   base.critDmg  || 2.05,
      xp:   base.xp   || 2500,
      gold: base.gold || 1500,
      isBoss: true,
      atkNome: 'ataca com sua lança relampejante',
      desc: 'Uma valkiria guardiã, despertada para proteger o núcleo da câmara. Fala numa língua antiga e não hesita em atacar quem tenta levar o fragmento.',
      loot: base.loot || [],
    };
  }

  // ── Beat 1 (Eir3ys.png): entrar na câmara e pegar o fragmento ──
  function storyNode_inazami_fase2_camara() {
    setScene('inazami-nucleo1');
    hideEnemy();
    setStory(
      'NARRADOR',
      `A câmara do núcleo pulsa com um brilho fraco, quase apagado. No centro, sobre um pilar de pedra escura, repousa o fragmento que você veio buscar.\n\nVocê se aproxima e o pega. Está mais quente do que esperava — como se algo, em algum momento, tivesse vivido ali dentro.`,
      [
        { icon:'▶', text:'Sair da câmara com o fragmento', action: storyNode_inazami_fase2_travamento },
      ]
    );
  }
  window.storyNode_inazami_fase2_camara = storyNode_inazami_fase2_camara;

  // ── Beat 2 (Eir3ys.png): energia trava o ambiente, guerreira aparece no alto ──
  function storyNode_inazami_fase2_travamento() {
    setStory(
      'NARRADOR',
      `Você dá as costas ao pilar, pronto pra levar o fragmento até o portão. Mas antes do segundo passo, uma presença enorme toma conta do ar — e o ambiente trava, como se a própria sala tivesse prendido a respiração.\n\nVocê olha para trás. Bem no alto, parada sobre uma das vigas de pedra, uma guerreira observa você em silêncio.\n\n"...O que é aquilo?" — a pergunta fica só no ar. Você não consegue fazer nada além de observar, tentando entender a situação.`,
      [
        { icon:'▶', text:'Continuar observando', action: storyNode_inazami_fase2_descida },
      ]
    );
  }
  window.storyNode_inazami_fase2_travamento = storyNode_inazami_fase2_travamento;

  // ── Beat 3 (Emcn.png): ela desce em sua direção ──
  function storyNode_inazami_fase2_descida() {
    setScene('inazami-nucleo2');
    setStory(
      'NARRADOR',
      `Na velocidade do som, ela desce. O impacto contra o chão estremece a câmara inteira, levantando poeira e cacos de pedra.\n\nA guerreira fala com você — numa língua difícil de descrever, quase impossível de acompanhar.`,
      [
        { icon:'▶', text:'Continuar', action: storyNode_inazami_fase2_lanca },
      ]
    );
  }
  window.storyNode_inazami_fase2_descida = storyNode_inazami_fase2_descida;

  // ── Beat 4 (Eirut.png): ela toma o fragmento de volta e joga a lança ──
  function storyNode_inazami_fase2_lanca() {
    setScene('inazami-nucleo3');
    setStory(
      'NARRADOR',
      `Ela aponta para o fragmento em suas mãos e o toma de volta com um único movimento. Num instante, já ergue a lança na sua direção — e a arremessa.`,
      [
        { icon:'▶', text:'Continuar', action: storyNode_inazami_fase2_desvio },
      ]
    );
  }
  window.storyNode_inazami_fase2_lanca = storyNode_inazami_fase2_lanca;

  // ── Beat 5 (Adriwn.png): a lança finca no chão — HuBi te salva ──
  function storyNode_inazami_fase2_desvio() {
    setScene('inazami-nucleo4');
    setStory(
      'NARRADOR',
      `Você não teria tempo de reagir sozinho. É a voz da HuBi que corta o transe — e é só por causa dela que você consegue desviar a tempo. A lança finca no chão de pedra, ainda vibrando, a centímetros de onde você estava.`,
      [
        { icon:'▶', text:'Continuar', action: storyNode_inazami_fase2_confronto },
      ]
    );
  }
  window.storyNode_inazami_fase2_desvio = storyNode_inazami_fase2_desvio;

  // ── Beat 6 (Eirtehs.png): ela recupera a lança e se vira pra lutar ──
  function storyNode_inazami_fase2_confronto() {
    setScene('inazami-nucleo5');
    setStory(
      'NARRADOR',
      `Ela caminha até a lança, arranca-a do chão num só puxão e se vira de costas por um instante — como se avaliasse se você ainda merece ficar de pé.\n\nQuando se vira de novo pra encará-lo, não sobra mais espaço pra palavras.`,
      [
        { icon:'⚔️', text:'Enfrentar Eir', action: storyNode_inazami_fase2_batalha },
      ]
    );
  }
  window.storyNode_inazami_fase2_confronto = storyNode_inazami_fase2_confronto;

  // ── Dispara a luta ──
  function storyNode_inazami_fase2_batalha() {
    const eir = _inazamiMontarEirBoss();
    G._dungeonBattleCallback = () => {
      G.inazami = G.inazami || {};
      G.inazami.eirDerrotada = true;
      storyNode_inazami_fase2_vitoria();
    };
    showEnemy(eir);
    startBattle(eir);
  }
  window.storyNode_inazami_fase2_batalha = storyNode_inazami_fase2_batalha;

  // ── Pós-batalha (Eirt3ey.png): fragmento recuperado (via loot da Eir) ──
  function storyNode_inazami_fase2_vitoria() {
    setScene('inazami-nucleo6');
    hideEnemy();
    setStory(
      'NARRADOR',
      `A guerreira recua um passo, ajoelha-se e desaparece num rastro de luz — deixando o fragmento cair suavemente no chão, intacto.\n\nVocê o recolhe de volta. Dessa vez, ninguém vem tomá-lo.`,
      [
        { icon:'▶', text:'Voltar ao mapa', action: storyNode_inazami_mapa },
      ]
    );
  }
  window.storyNode_inazami_fase2_vitoria = storyNode_inazami_fase2_vitoria;

})();

// ─────────────────────────────────────────────────────────────
//  REGISTRO NA TORRE DAS MASMORRAS (masmorra 3 de 6)
//  TESTE: liberada direto, sem checar flag de conclusão da
//  masmorra 2. Trocar o `status`/`descricao` fixos pela checagem
//  de progresso (ex.: G.dungeonKappaCleared) quando sair de teste.
// ─────────────────────────────────────────────────────────────
(function _registerInazami() {
  function _doRegister() {
    if (typeof registerDungeon !== 'function') {
      setTimeout(_doRegister, 200); return;
    }
    registerDungeon({
      id:        'inazami',
      ordem:     3,
      nome:      'O Selo de Inazami',
      bossNome:  'Eir',
      bossIcon:  'imagens/inazami masmorra/Eir3ys.png',
      descricao: 'Um portão selado guarda o fragmento do amuleto de Inazami. [MODO TESTE — liberada manualmente]',
      status:    'ativa',
      stats: [
        { label: 'Dificuldade', value: '★★★★★' },
        { label: 'Recompensa',  value: 'Fragmento do Amuleto' },
      ],
      entrar: window.storyNode_inazami_mapa,
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegister);
  } else {
    _doRegister();
  }
})();

// ═══════════════════════════════════════════════════════════
//  FIM: inazami_mapa.js
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  INÍCIO: alberon_forja_selada.js
// ═══════════════════════════════════════════════════════════

// =============================================================
//  ALBERON_FORJA_SELADA.JS — Chronicles of Clivor
//  Masmorra Inazami — Puzzle 1: Forja Selada
//
//  Objetivo: sincronizar dois caldeirões (foles) e manter os
//  medidores de temperatura na zona-alvo até que o tempo de
//  têmpera passe. Quando há apenas um caldeirão, a "trava de
//  calor" o congela na faixa dourada até o tempo passar.
//
//  Depende de: palDinh.js (G, setScene, hideEnemy, notify, 
//              addLog, updateHUD)
//
//  Incluir no gat-1.html DEPOIS de alberon_caldeirao.js:
//    <script src="dungeons/alberon_forja_selada.js?v=..."></script>
//
//  Integração com setScene e setStory via callback:
//    action: storyNode_inazami_alberon_forja_selada
// =============================================================


// ─────────────────────────────────────────────────────────────
//  ALBERON DRUMM — retrato e cenário
//  Retrato: anão ancião de robes e joias, braços cruzados.
//  Cenário: câmara octogonal central do santuário, caldeirão
//  aceso no meio (marcada em laranja no mapa da masmorra).
//  PLACEHOLDER_caldeirao.png é arte provisória — troque o path
//  quando a arte final da sala estiver pronta.
// ─────────────────────────────────────────────────────────────
const ALBERON_RETRATO = 'Imagens/personagens/aberonDrumm.png';
const ALBERON_CENARIO  = 'Imagens/inazami masmorra/PLACEHOLDER_caldeirao.png';

// ─────────────────────────────────────────────────────────────
//  PONTO DE ENTRADA — chamado pelo pin "O Caldeirão de Alberon"
//  no mapa (inazami_mapa.js). Decide qual conversa mostrar de
//  acordo com o progresso salvo em G.inazami.
// ─────────────────────────────────────────────────────────────
function storyNode_inazami_alberon_intro() {
  setScene('inazami-f1');
  hideEnemy();
  G.inazami = G.inazami || {};

  if (G.inazami.buffCaldeiraoObtido) {
    // Já fez tudo: puzzle completo + buff escolhido
    storyNode_inazami_alberon_revisita();
    return;
  }

  if (G.inazami.forjaSeladaCompleta) {
    // Já temperou o caldeirão, falta só escolher o buff
    storyNode_inazami_alberon_pos_puzzle();
    return;
  }

  // Primeiro encontro
  showStoryCutscene(ALBERON_CENARIO, { shake:false, vibrate:false });
  setStory(
    'ALBERON',
    `Um vulto encurvado se vira devagar quando você entra na câmara. Não é um espírito, nem um Onibi — é algo mais velho, mais sólido. Um anão de barba branca trançada, robes gastos e amuletos que tilintam a cada movimento.\n\n"Hmpf. Mais um. Faz tempo que ninguém entra aqui vivo, e olha que eu não tinha reclamado."\n\n"Alberon Drumm. Cuido deste caldeirão desde antes de Inazami virar parede lá em cima. E não encosta em nada."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_alberon_fala2 },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_intro = storyNode_inazami_alberon_intro;

function storyNode_inazami_alberon_fala2() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'ALBERON',
    `"Esse caldeirão não é só fogo, viajante. Guarda memória. Se você souber acordar ele direito, ele mostra como o Oni das Chamas era antes de virar essa coisa presa lá embaixo."\n\n"Posso te dar essa chance. Mas ele não abre pra qualquer um. Só pra quem vai terminar o que Inazami começou. E eu não gasto fogo com turista."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_alberon_fala3 },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_fala2 = storyNode_inazami_alberon_fala2;

function storyNode_inazami_alberon_fala3() {
  setScene('inazami-f1');
  hideEnemy();
  setStory(
    'ALBERON',
    `"Você já sabe, eu sei. Repito assim mesmo, porque aqui embaixo a gente esquece as coisas. É o tempo, ou a umidade. Prefiro culpar a umidade."\n\n"Só você pode selar Hi-no-Kagutsuchi de vez. Inazami deu o corpo dela pro selo, mas sozinha não basta, nunca bastou. Ela precisa de alguém de fora, de sangue quente e teimoso."\n\n"Então? Arrisca o caldeirão ou vai ficar aí me olhando?"`,
    [
      { icon:'🔥', text:'Aceitar o caldeirão', action: storyNode_inazami_alberon_forja_selada },
      { icon:'🗺️', text:'Voltar mais tarde', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_fala3 = storyNode_inazami_alberon_fala3;

// ─────────────────────────────────────────────────────────────
//  Entrar no Puzzle 1: Forja Selada
// ─────────────────────────────────────────────────────────────
function storyNode_inazami_alberon_forja_selada() {
  setScene('inazami-f1');
  hideEnemy();
  G.inazami = G.inazami || {};

  // Verificar se já passou por este puzzle
  if (G.inazami.forjaSeladaCompleta) {
    // Revisita: caldeirão já foi tempeado
    setStory(
      'ALBERON',
      `"A lâmina já está pronta. Não vou refazer só porque você gostou."`,
      [
        { icon:'🗺️', text:'Voltar ao mapa', action: storyNode_inazami_mapa },
      ],
      ALBERON_RETRATO
    );
    return;
  }

  // Primeira vez: apresenta o puzzle
  setStory(
    'ALBERON',
    `"Vou te mostrar como o caldeirão funciona, mas vou precisar de ajuda. Segura os dois foles em sincronia perfeita enquanto a temperatura assenta.\n\nQuando tem dois, cada um puxa pro seu lado. Quando tem só um, ele trava e a gente espera. Entendeu? Se não entendeu, finge que sim e erra com dignidade."`,
    [
      { icon:'🔥', text:'Começar o puzzle', action: openPuzzleForjaSelada },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_forja_selada = storyNode_inazami_alberon_forja_selada;

// ─────────────────────────────────────────────────────────────
//  Criar e abrir o Puzzle 1: Forja Selada
// ─────────────────────────────────────────────────────────────
function openPuzzleForjaSelada() {
  // Verificar se o container já existe
  let container = document.getElementById('puzzle-forja-selada-container');
  if (container) {
    container.remove();
  }

  // Criar container principal
  container = document.createElement('div');
  container.id = 'puzzle-forja-selada-container';
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: auto;
    font-family: 'Zen Old Mincho', Georgia, serif;
    color: #ffd9b0;
  `;

  // Estilo compartilhado
  const style = document.createElement('style');
  style.textContent = `
    #puzzle-forja-selada-container * {
      box-sizing: border-box;
    }

    .puzzle-forja-main {
      background: linear-gradient(180deg, #171009, #1f1710);
      border: 1px solid rgba(232, 176, 112, 0.18);
      border-radius: 8px;
      padding: 32px 24px;
      max-width: 480px;
      width: 100%;
      animation: slideUp 0.35s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: none; }
    }

    .puzzle-forja-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .puzzle-forja-header h2 {
      font-family: 'Cinzel', serif;
      color: #e8b070;
      font-size: 1.3rem;
      margin: 0 0 8px;
      letter-spacing: 0.05em;
    }

    .puzzle-forja-header p {
      color: #cfa985;
      font-size: 0.85rem;
      margin: 0;
      line-height: 1.5;
    }

    .puzzle-forja-level {
      display: flex;
      gap: 4px;
      justify-content: center;
      margin-top: 12px;
    }

    .puzzle-forja-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a97b47;
      transition: background 0.3s ease;
    }

    .puzzle-forja-dot.filled {
      background: #e8b070;
    }

    .puzzle-forja-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 20px;
    }

    .puzzle-forja-gauges {
      display: flex;
      gap: 32px;
      align-items: flex-end;
      justify-content: center;
      flex-wrap: wrap;
      min-height: 240px;
    }

    .gauge-unit {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .gauge-label {
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #cfa985;
      font-weight: 500;
    }

    .gauge-shell {
      width: 48px;
      height: 200px;
      border: 1px solid rgba(232, 176, 112, 0.18);
      border-radius: 24px;
      position: relative;
      background: rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    .gauge-target {
      position: absolute;
      left: 0;
      right: 0;
      background: rgba(127, 191, 106, 0.18);
      border-top: 1px dashed rgba(127, 191, 106, 0.6);
      border-bottom: 1px dashed rgba(127, 191, 106, 0.6);
    }

    .gauge-fill {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(180deg, #ff7a3d, #b3401a);
      transition: height 0.15s ease;
    }

    .gauge-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.06) 0 2px, transparent 2px 6px);
    }

    .gauge-shell.locked {
      border-color: #7fbf6a;
      box-shadow: 0 0 14px rgba(127, 191, 106, 0.45);
    }

    .gauge-shell.locked .gauge-target {
      background: rgba(127, 191, 106, 0.28);
      border-color: rgba(127, 191, 106, 0.7);
    }

    .gauge-shell.locked .gauge-fill {
      background: linear-gradient(180deg, rgba(127, 191, 106, 0.8), rgba(127, 191, 106, 0.5));
    }

    .lock-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 0.7rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .gauge-shell.locked .lock-badge {
      opacity: 1;
    }

    .puzzle-forja-status {
      padding: 12px 14px;
      border-radius: 4px;
      border: 1px solid rgba(232, 176, 112, 0.18);
      background: rgba(0, 0, 0, 0.25);
      font-size: 0.8rem;
      min-height: 1.8em;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #ffd9b0;
    }

    .puzzle-forja-status.ok {
      color: #7fbf6a;
      border-color: rgba(127, 191, 106, 0.4);
      background: rgba(127, 191, 106, 0.08);
    }

    .puzzle-forja-status.fail {
      color: #d4553f;
      border-color: rgba(212, 85, 63, 0.4);
      background: rgba(212, 85, 63, 0.08);
    }

    .puzzle-forja-controls {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .puzzle-forja-btn {
      font-family: 'Cinzel', serif;
      background: rgba(179, 64, 26, 0.22);
      border: 1px solid #ff7a3d;
      color: #ffd9b0;
      padding: 9px 18px;
      border-radius: 3px;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 120px;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
    }

    .puzzle-forja-btn:hover {
      background: rgba(179, 64, 26, 0.4);
    }

    .puzzle-forja-btn:active {
      transform: scale(0.97);
    }

    .puzzle-forja-btn.ghost {
      background: transparent;
      border-color: rgba(232, 176, 112, 0.18);
      color: #cfa985;
    }

    .puzzle-forja-btn.ghost:hover {
      border-color: #a97b47;
      color: #e8b070;
    }

    .puzzle-forja-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .hold-ring {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid rgba(232, 176, 112, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: #cfa985;
      position: relative;
      background: rgba(0, 0, 0, 0.25);
    }

    .hold-ring svg {
      position: absolute;
      inset: -3px;
      transform: rotate(-90deg);
    }

    .hold-ring circle {
      fill: none;
      stroke: #7fbf6a;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 180;
      stroke-dashoffset: 180;
      transition: stroke-dashoffset 0.15s linear;
    }

    .puzzle-forja-alberon {
      font-style: italic;
      color: #a97b47;
      font-size: 0.75rem;
      text-align: center;
      min-height: 2em;
      line-height: 1.4;
      margin-bottom: 0;
    }

    .puzzle-forja-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: transparent;
      border: none;
      color: #cfa985;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      transition: all 0.2s ease;
    }

    .puzzle-forja-close-btn:hover {
      color: #e8b070;
      background: rgba(232, 176, 112, 0.1);
    }
  `;
  document.head.appendChild(style);

  // HTML do puzzle
  const html = `
    <div class="puzzle-forja-main" style="position: relative;">
      <button class="puzzle-forja-close-btn" data-action="close">✕</button>
      
      <div class="puzzle-forja-header">
        <h2>⚔️ Forja Selada</h2>
        <p>Sincronize os caldeirões até que o calor se estabilize.</p>
        <div class="puzzle-forja-level" id="forjaLevelDots"></div>
      </div>

      <div class="puzzle-forja-content">
        <div class="puzzle-forja-gauges" id="forjaGauges"></div>
        <div class="puzzle-forja-status" id="forjaStatus">Nível 1 de 4 — pressione o botão para soprar.</div>
      </div>

      <div class="puzzle-forja-controls">
        <button class="puzzle-forja-btn" id="forjaSoprarBtn">Soprar o Fole</button>
        <div class="hold-ring">
          <svg width="60" height="60"><circle cx="30" cy="30" r="27"></circle></svg>
          <span id="forjaHoldText">—</span>
        </div>
      </div>

      <div class="puzzle-forja-controls">
        <button class="puzzle-forja-btn ghost" id="forjaResetBtn">Reiniciar Tudo</button>
        <button class="puzzle-forja-btn ghost" id="forjaCloseBtn">Sair</button>
      </div>

      <p class="puzzle-forja-alberon" id="forjaAlberon">
        "Presta atenção. Com dois, cada um leva o seu calor. Quando sobra um, ele trava sozinho até a têmpera passar."
      </p>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  // Inicializar lógica do puzzle
  initForjaSeladaPuzzle(container);

  // Fechar ao clicar no fundo
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      closeForjaPuzzle();
    }
  });
}
window.openPuzzleForjaSelada = openPuzzleForjaSelada;

// ─────────────────────────────────────────────────────────────
//  Lógica do Puzzle 1: Forja Selada
// ─────────────────────────────────────────────────────────────
function initForjaSeladaPuzzle(container) {
  const CONFIG = {
    LEVELS: 4,
    TARGET_RANGE: [0.45, 0.65],  // 45% até 65% do medidor
    HEAT_RISE:  0.006,   // Sobe ~37,5% por segundo SEGURANDO o botão
    HEAT_DECAY: 0.0015,  // Esfria ~9% por segundo quando SOLTO
    LEVEL_DURATION: [2500, 3500, 4500, 5500], // ms por nível
  };

  const gaugesEl = container.querySelector('#forjaGauges');
  const statusEl = container.querySelector('#forjaStatus');
  const alberonEl = container.querySelector('#forjaAlberon');
  const levelDotsEl = container.querySelector('#forjaLevelDots');
  const soprarBtn = container.querySelector('#forjaSoprarBtn');
  const holdText = container.querySelector('#forjaHoldText');
  const resetBtn = container.querySelector('#forjaResetBtn');
  const closeBtn = container.querySelector('#forjaCloseBtn');
  const closeXBtn = container.querySelector('[data-action="close"]');

  let currentLevel = 1;
  let heat = [0, 0];
  let holding = false;
  let holdStart = 0;
  let levelTimer = null;
  let gameRunning = true;
  let levelStartTime = 0;

  const linesIdle = [
    "Presta atenção. Com dois, cada um leva o seu calor. Quando sobra um, ele trava sozinho até a têmpera passar.",
    "Sincronia é tudo. Perdeu o ritmo, o calor vai embora, e eu não acendo de novo.",
    "Tá perto. Não estraga agora, rapaz.",
    "Pronto. O fogo obedeceu. Raro.",
  ];

  const linesSuccess = [
    "Hmpf. Você entende mais do que aparenta.",
    "Isso. Assim mesmo.",
    "Bem feito. Não vou repetir o elogio.",
    "Conseguiu. Agora vai, o caldeirão está pronto.",
  ];

  const linesFail = [
    "Errou. De novo.",
    "Assim não. Concentra.",
    "O calor escapou. Eu avisei.",
  ];

  // Criar medidores para cada nível
  function createGauges() {
    gaugesEl.innerHTML = '';
    const numGauges = currentLevel === 1 ? 1 : 2;

    for (let i = 0; i < numGauges; i++) {
      const unit = document.createElement('div');
      unit.className = 'gauge-unit';
      unit.innerHTML = `
        <div class="gauge-label">${i === 0 ? 'FOLE PRINCIPAL' : 'FOLE GÊMEO'}</div>
        <div class="gauge-shell" data-gauge="${i}">
          <div class="gauge-target" id="target-${i}"></div>
          <div class="gauge-fill" id="fill-${i}"></div>
          <span class="lock-badge">🔒</span>
        </div>
      `;
      gaugesEl.appendChild(unit);
    }

    // Posicionar os target ranges
    const targetStart = CONFIG.TARGET_RANGE[0] * 200;
    const targetHeight = (CONFIG.TARGET_RANGE[1] - CONFIG.TARGET_RANGE[0]) * 200;
    document.querySelectorAll('.gauge-target').forEach((el) => {
      el.style.top = (200 - targetStart - targetHeight) + 'px';
      el.style.height = targetHeight + 'px';
    });

    heat = new Array(numGauges).fill(0);
  }

  // Atualizar dots do nível
  function updateLevelDots() {
    levelDotsEl.innerHTML = '';
    for (let i = 0; i < CONFIG.LEVELS; i++) {
      const dot = document.createElement('div');
      dot.className = 'puzzle-forja-dot' + (i < currentLevel ? ' filled' : '');
      levelDotsEl.appendChild(dot);
    }
  }

  // Loop de atualização dos medidores
  function updateGauges() {
    if (!gameRunning) return;

    const numGauges = heat.length;

    for (let i = 0; i < numGauges; i++) {
      if (holding) {
        heat[i] = Math.min(1, heat[i] + CONFIG.HEAT_RISE);
      } else {
        heat[i] = Math.max(0, heat[i] - CONFIG.HEAT_DECAY);
      }
      const fill = document.querySelector(`#fill-${i}`);
      if (fill) {
        fill.style.height = (heat[i] * 200) + 'px';
      }
    }

    checkStatus();
  }

  // Verificar estado do puzzle
  function checkStatus() {
    const elapsed = Date.now() - levelStartTime;
    const targetDuration = CONFIG.LEVEL_DURATION[currentLevel - 1];
    const numGauges = heat.length;
    let allInTarget = true;

    for (let i = 0; i < numGauges; i++) {
      const inTarget = heat[i] >= CONFIG.TARGET_RANGE[0] && heat[i] <= CONFIG.TARGET_RANGE[1];
      const shell = document.querySelector(`[data-gauge="${i}"]`);
      if (!inTarget) allInTarget = false;

      if (inTarget && shell) {
        shell.classList.add('locked');
      } else if (shell) {
        shell.classList.remove('locked');
      }
    }

    if (allInTarget && elapsed >= targetDuration) {
      completeLevel();
    } else if (allInTarget) {
      const remaining = Math.ceil((targetDuration - elapsed) / 1000);
      statusEl.textContent = `Segurando... ${remaining}s para concluir este nível.`;
      statusEl.className = 'puzzle-forja-status ok';
    } else {
      statusEl.textContent = 'Mantenha os caldeirões na faixa dourada.';
      statusEl.className = 'puzzle-forja-status';
    }
  }

  // Completar um nível
  function completeLevel() {
    gameRunning = false;
    soprarBtn.disabled = true;
    alberonEl.textContent = linesSuccess[Math.floor(Math.random() * linesSuccess.length)];
    statusEl.textContent = `✓ Nível ${currentLevel} completo!`;
    statusEl.className = 'puzzle-forja-status ok';

    setTimeout(() => {
      if (currentLevel >= CONFIG.LEVELS) {
        // Puzzle completo
        G.inazami = G.inazami || {};
        G.inazami.forjaSeladaCompleta = true;
        notify('🔥 Caldeirão Tempeado!', 'gold');
        addLog('Você completou o Puzzle 1: Forja Selada.');
        updateHUD();
        closeForjaPuzzle();
        // Retornar à história
        storyNode_inazami_alberon_intro();
      } else {
        // Próximo nível
        currentLevel++;
        gameRunning = true;
        soprarBtn.disabled = false;
        createGauges();
        updateLevelDots();
        levelStartTime = Date.now();
        alberonEl.textContent = linesIdle[currentLevel - 1];
        statusEl.textContent = `Nível ${currentLevel} de ${CONFIG.LEVELS} — pressione o botão para soprar.`;
        statusEl.className = 'puzzle-forja-status';
      }
    }, 1800);
  }

  // Pressionar o botão de soprar — usa touch+mouse (não Pointer Events).
  // Todo o resto do jogo usa touchstart/mousedown porque este WebView
  // Android não dispara pointerdown/pointerup de forma confiável — por
  // isso o botão não reagia nem no toque nem segurando.
  let _lastRealPress = 0;

  function startHold(e) {
    if (!gameRunning || holding) return;
    if (e && e.cancelable) e.preventDefault();
    _lastRealPress = Date.now();
    holding = true;
    holdStart = Date.now();

    // Feedback visual: anel cheio e texto aceso enquanto o fole está sendo soprado.
    // O aquecimento em si acontece no loop principal (updateGauges), em tempo real.
    holdText.textContent = '🔥';
    const circle = container.querySelector('.hold-ring circle');
    if (circle) circle.style.strokeDashoffset = '0';
  }

  function endHold() {
    if (!holding) return;
    holding = false;

    // Resetar visual
    holdText.textContent = '—';
    const circle = container.querySelector('.hold-ring circle');
    if (circle) {
      circle.style.strokeDashoffset = '180';
    }
  }

  soprarBtn.addEventListener('touchstart', startHold, { passive: false });
  soprarBtn.addEventListener('mousedown', startHold);
  ['touchend', 'touchcancel'].forEach(ev => soprarBtn.addEventListener(ev, endHold));
  ['mouseup', 'mouseleave'].forEach(ev => soprarBtn.addEventListener(ev, endHold));

  // Rede de segurança: em alguns WebViews nem touchstart nem mousedown
  // disparam de forma confiável, mas o "click" sintético quase sempre
  // dispara depois de um toque. Se nenhum press "de verdade" tiver
  // acontecido há pouco, trata o clique como um sopro cheio — assim o
  // botão nunca fica sem reagir a lugar nenhum.
  soprarBtn.addEventListener('click', () => {
    if (Date.now() - _lastRealPress < 400) return; // já tratado pelo touch/mouse
    if (!gameRunning || holding) return;
    // Sem touchstart/mousedown confiável: simula uma segurada curta de 400ms,
    // aquecendo pelo tempo normal do loop em vez de um "sopro cheio" instantâneo.
    startHold();
    setTimeout(() => { if (holding) endHold(); }, 400);
  });


  resetBtn.addEventListener('click', () => {
    currentLevel = 1;
    holding = false;
    gameRunning = true;
    soprarBtn.disabled = false;
    levelStartTime = Date.now();
    createGauges();
    updateLevelDots();
    alberonEl.textContent = linesIdle[0];
    statusEl.textContent = 'Nível 1 de 4 — pressione o botão para soprar.';
    statusEl.className = 'puzzle-forja-status';
  });

  const closeFn = () => closeForjaPuzzle();
  closeBtn.addEventListener('click', closeFn);
  closeXBtn.addEventListener('click', closeFn);

  // Inicializar
  createGauges();
  updateLevelDots();
  levelStartTime = Date.now();

  // Loop de atualização
  const updateInterval = setInterval(() => {
    if (!document.getElementById('puzzle-forja-selada-container')) {
      clearInterval(updateInterval);
      return;
    }
    updateGauges();
  }, 16); // ~60 FPS
}

// ─────────────────────────────────────────────────────────────
//  PÓS-PUZZLE — Alberon oferece o buff de amplificação de dano
// ─────────────────────────────────────────────────────────────
function storyNode_inazami_alberon_pos_puzzle() {
  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene(ALBERON_CENARIO, { shake:false, vibrate:false });
  setStory(
    'ALBERON',
    `O caldeirão crepita baixo, satisfeito, como se tivesse acabado de comer.\n\n"Bem feito. Agora ele reconhece a sua mão. Não se acostuma, ele é seletivo."\n\nAlberon mergulha os dedos na brasa sem se queimar e tira de dentro dela algo que parece calor puro, ainda tomando forma.\n\n"Isso não é arma nem armadura. É foco, só. Escolhe uma habilidade sua, a que quiser, e o caldeirão gruda essa chama nela. Enquanto você estiver nesta masmorra, ela bate mais forte. Escolhe com cuidado, que eu não faço reembolso."`,
    [
      { icon:'🔥', text:'Escolher habilidade', action: openPuzzleAlberonEscolhaBuff },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_pos_puzzle = storyNode_inazami_alberon_pos_puzzle;

// ─────────────────────────────────────────────────────────────
//  REVISITA — depois que tudo já foi feito
// ─────────────────────────────────────────────────────────────
function storyNode_inazami_alberon_revisita() {
  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene(ALBERON_CENARIO, { shake:false, vibrate:false });
  const nomeEscolhido = (G.inazami && G.inazami.buffCaldeiraoSkillNome) || '???';
  setStory(
    'ALBERON',
    `"A chama continua grudada em '${nomeEscolhido}'. Não tenho mais nada pra te dar aqui. O resto é entre você e o Oni, e eu fico fora dessa."`,
    [
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_revisita = storyNode_inazami_alberon_revisita;

// ─────────────────────────────────────────────────────────────
//  UI DE ESCOLHA DO BUFF — LV 1
//
//  ✅ Resolvido o TODO anterior: palDinh.js expõe window.CLASSES
//  (injetado por classes.js) e cada classe tem `cls.skills[]`,
//  onde `cls.skills[0]` é a habilidade inicial/básica (é o que
//  vira o slot 'b0' em G.player.equippedSkills — ver palDinh.js
//  linha ~1645). Não precisamos mais de texto livre pra classes
//  normais.
//
//  REGRA LV1: o bônus só pode ser aplicado na HABILIDADE INICIAL
//  da classe (a primeira skill que causa dano de verdade — pula
//  skills de suporte como o Escudo Divino do Paladino) — e o bônus
//  quase dobra o dano dela (+90%) dentro da Masmorra Inazami.
//
//  EXCEÇÃO — Assassino: ele escolhe entre suas 3 habilidades básicas
//  (Golpe Sombrio / Veneno Rápido / Kuroen — confirmado em
//  class_assassino.js, todas roteadas por executeClassSkill, nada de
//  TALENT_). O sistema de lua (assassino_lunar.js) é um talento à
//  parte que NÃO substitui essas 3 básicas, então não precisa de
//  tratamento especial no hook de dano — só a escolha é diferente
//  (múltipla em vez de travada).
//
//  Efeito aplicado: SÓ dentro da Masmorra Inazami
//  (G.location === 'dungeon-inazami'). Ver getInazamiCaldeiraoBonus()
//  no fim do arquivo — chamada em palDinh.js dentro de executeSkill(),
//  logo depois de window.executeClassSkill(), no mesmo padrão que
//  o bônus do Prato do Kappa já usa (result.dmgDealt). O hook extra
//  que eu tinha adicionado pro branch TALENT_ continua no palDinh.js
//  (inofensivo, não é mais necessário mas não atrapalha nada).
// ─────────────────────────────────────────────────────────────
const ALBERON_BUFF_LV1_BONUS = 0.90;      // +90% ≈ quase dobrando — ajuste aqui p/ rebalancear
const ALBERON_BUFF_FALLBACK_BONUS = 0.25; // usado só se window.CLASSES não estiver disponível (modo texto livre, sem restrição de skill)

// Descobre a(s) opção(ões) de habilidade básica da classe atual do jogador.
//
// ⚠️ HISTÓRICO DE CORREÇÕES (depois de ver os arquivos de classe de verdade):
// 1) O Assassino TEM sim `cls.skills` com 3 habilidades básicas de verdade
//    (Golpe Sombrio, Veneno Rápido, Kuroen — todas roteadas por
//    executeClassSkill, dmg:'assassino:...', nada de TALENT_). O sistema
//    de lua (assassino_lunar.js) é um talento À PARTE, não substitui essas
//    3 básicas. Voltei ele a escolher entre as 3, como no design original.
// 2) O Paladino tem `cls.skills[0]` = "Escudo Divino" — uma skill de
//    SUPORTE (isSupport:true) que não causa dano nenhum. Travar o buff
//    de dano nela seria inútil. Por isso agora pulo skills marcadas
//    isSupport e uso a primeira skill que realmente causa dano.
function _getAlberonBuffOptions() {
  try {
    const p = G.player;
    const cls = p.classData || (window.CLASSES || []).find(c => c.id === p.class);
    if (!cls || !cls.skills || !cls.skills.length) return null;

    if (cls.id === 'assassino') {
      // Trocas de lua são talento à parte — as 3 básicas dele são normais.
      return { multi: true, skills: cls.skills.slice(0, 3) };
    }

    // Toda outra classe: trava na primeira skill que realmente causa dano
    // (pula skills de suporte, ex.: Escudo Divino do Paladino).
    const skillAlvo = cls.skills.find(s => !s.isSupport) || cls.skills[0];
    return { multi: false, skill: skillAlvo };
  } catch (err) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  CSS próprio do modal "Chama do Caldeirão".
//  (Antes ele dependia do <style> injetado pelo puzzle da Forja —
//   se a Forja não tivesse sido aberta, o modal aparecia sem estilo.)
// ─────────────────────────────────────────────────────────────
function _injectAlberonBuffCSS() {
  if (document.getElementById('alberon-buff-css')) return;
  const st = document.createElement('style');
  st.id = 'alberon-buff-css';
  st.textContent = `
    #alberon-buff-container, #alberon-buff-container * { box-sizing: border-box; }
    #alberon-buff-container { backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }

    #alberon-buff-container .puzzle-forja-main {
      position: relative;
      width: 100%; max-width: 420px;
      padding: 28px 22px 22px;
      background: radial-gradient(120% 80% at 50% 0%, rgba(179,64,26,0.20), transparent 60%),
                  linear-gradient(180deg, #1a110a, #120c07);
      border: 1px solid rgba(232,176,112,0.28);
      border-radius: 10px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.7), 0 0 28px rgba(255,122,61,0.12);
      animation: alberonBuffIn 0.3s ease;
    }
    #alberon-buff-container .puzzle-forja-main::before {
      content: ''; position: absolute; top: 0; left: 18%; right: 18%; height: 2px;
      background: linear-gradient(90deg, transparent, #ff7a3d, transparent);
      border-radius: 2px;
    }
    @keyframes alberonBuffIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }

    #alberon-buff-container .puzzle-forja-header { text-align: center; margin-bottom: 18px; }
    #alberon-buff-container .puzzle-forja-header h2 {
      font-family: 'Cinzel', 'Zen Old Mincho', Georgia, serif;
      color: #f0b676; font-size: 1.25rem; font-weight: 700;
      letter-spacing: 0.05em; margin: 0 0 10px;
      text-shadow: 0 0 14px rgba(255,122,61,0.35);
    }
    #alberon-buff-container .puzzle-forja-header p {
      color: #cfa985; font-size: 0.85rem; line-height: 1.55; margin: 0;
    }

    #alberon-buff-container .puzzle-forja-content {
      display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px;
    }

    /* cartão da habilidade escolhida */
    #alberon-buff-container .alberon-skill-card {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 16px 14px;
      background: rgba(0,0,0,0.32);
      border: 1px solid rgba(255,122,61,0.45);
      border-radius: 8px;
      box-shadow: inset 0 0 22px rgba(179,64,26,0.18);
    }
    #alberon-buff-container .alberon-skill-icon { font-size: 2rem; line-height: 1; filter: drop-shadow(0 0 8px rgba(255,200,80,0.55)); }
    #alberon-buff-container .alberon-skill-name { font-family: 'Cinzel', Georgia, serif; font-size: 1.05rem; color: #ffd9b0; letter-spacing: 0.04em; }
    #alberon-buff-container .alberon-skill-bonus {
      font-size: 0.78rem; color: #ffb36b; background: rgba(255,122,61,0.12);
      border: 1px solid rgba(255,122,61,0.3); border-radius: 999px; padding: 3px 10px;
    }

    #alberon-buff-container .puzzle-forja-status {
      padding: 10px 12px; border-radius: 4px;
      border: 1px solid rgba(232,176,112,0.18); background: rgba(0,0,0,0.25);
      font-size: 0.8rem; line-height: 1.45; text-align: center; color: #ffd9b0;
    }
    #alberon-buff-container .puzzle-forja-status.fail { color: #d4553f; border-color: rgba(212,85,63,0.4); background: rgba(212,85,63,0.08); }
    #alberon-buff-container .puzzle-forja-status.ok { color: #7fbf6a; border-color: rgba(127,191,106,0.4); background: rgba(127,191,106,0.08); }

    #alberon-buff-container input[type="text"] { outline: none; }
    #alberon-buff-container input[type="text"]:focus { border-color: #ff7a3d !important; }

    #alberon-buff-container .puzzle-forja-controls { display: flex; gap: 10px; flex-wrap: wrap; }
    #alberon-buff-container .puzzle-forja-btn {
      flex: 1; min-width: 110px;
      font-family: 'Cinzel', 'Zen Old Mincho', Georgia, serif;
      font-size: 0.82rem; font-weight: 600; letter-spacing: 0.05em;
      padding: 12px 16px; border-radius: 6px;
      background: linear-gradient(180deg, rgba(255,122,61,0.38), rgba(179,64,26,0.38));
      border: 1px solid #ff7a3d; color: #ffe6c8;
      cursor: pointer; transition: all 0.2s ease;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      -webkit-appearance: none; appearance: none;
    }
    #alberon-buff-container .puzzle-forja-btn:hover { filter: brightness(1.15); box-shadow: 0 0 14px rgba(255,122,61,0.35); }
    #alberon-buff-container .puzzle-forja-btn:active { transform: scale(0.97); }
    #alberon-buff-container .puzzle-forja-btn.ghost {
      background: transparent; border-color: rgba(232,176,112,0.25); color: #cfa985;
    }
    #alberon-buff-container .puzzle-forja-btn.ghost:hover { border-color: #a97b47; color: #e8b070; box-shadow: none; }

    /* lista de habilidades (Assassino) */
    #alberon-buff-container .alberon-skill-choice {
      display: flex !important; align-items: center; gap: 12px;
      width: 100%; text-align: left; margin: 0 !important;
      background: rgba(0,0,0,0.32); border-color: rgba(255,122,61,0.35);
      font-size: 0.9rem; padding: 12px 14px;
    }
    #alberon-buff-container .alberon-skill-choice span:first-child { font-size: 1.4rem; }
  `;
  document.head.appendChild(st);
}

function openPuzzleAlberonEscolhaBuff() {
  let container = document.getElementById('alberon-buff-container');
  if (container) container.remove();

  _injectAlberonBuffCSS();
  const info = _getAlberonBuffOptions();

  container = document.createElement('div');
  container.id = 'alberon-buff-container';
  container.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 20px; overflow: auto; font-family: 'Zen Old Mincho', Georgia, serif;
    color: #ffd9b0;
  `;

  if (!info) {
    // Fallback de segurança — classes.js não carregou ainda / window.CLASSES ausente.
    // Volta pro texto livre, mas com o bônus reduzido (sem restrição de skill validada).
    container.innerHTML = `
      <div class="puzzle-forja-main" style="position:relative;">
        <div class="puzzle-forja-header">
          <h2>🔥 Chama do Caldeirão</h2>
          <p>Digite o nome da habilidade que vai receber o bônus de dano (+${Math.round(ALBERON_BUFF_FALLBACK_BONUS*100)}%) dentro desta masmorra.</p>
        </div>
        <div class="puzzle-forja-content">
          <input id="alberonBuffInput" type="text" placeholder="Nome da habilidade..." maxlength="40"
            style="width:100%;padding:10px 12px;background:rgba(0,0,0,0.35);border:1px solid rgba(232,176,112,0.3);
            border-radius:4px;color:#ffd9b0;font-size:0.9rem;font-family:inherit;text-align:center;">
          <div class="puzzle-forja-status" id="alberonBuffStatus">Escolha com cuidado — dá pra trocar depois, mas o caldeirão vai reclamar.</div>
        </div>
        <div class="puzzle-forja-controls">
          <button class="puzzle-forja-btn" id="alberonBuffConfirmar">Confirmar</button>
          <button class="puzzle-forja-btn ghost" id="alberonBuffCancelar">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    const input = container.querySelector('#alberonBuffInput');
    const status = container.querySelector('#alberonBuffStatus');
    input.focus();
    container.querySelector('#alberonBuffConfirmar').onclick = () => {
      const nome = input.value.trim();
      if (!nome) {
        status.textContent = 'Precisa dar um nome pra chama pegar em algo.';
        status.className = 'puzzle-forja-status fail';
        return;
      }
      container.remove();
      storyNode_inazami_alberon_buff_confirmar(nome, null, ALBERON_BUFF_FALLBACK_BONUS);
    };
    container.querySelector('#alberonBuffCancelar').onclick = () => container.remove();
  } else if (info.multi) {
    // Assassino — escolhe entre as habilidades básicas (luas não entram aqui).
    const btnsHtml = info.skills.map((sk, i) => `
      <button class="puzzle-forja-btn alberon-skill-choice" data-idx="${i}"
        style="display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin-bottom:8px;">
        <span style="font-size:1.2rem;">${sk.icon || '🔥'}</span> <span>${sk.name}</span>
      </button>
    `).join('');
    container.innerHTML = `
      <div class="puzzle-forja-main" style="position:relative;">
        <div class="puzzle-forja-header">
          <h2>🔥 Chama do Caldeirão</h2>
          <p>Suas luas trocam sua forma de lutar, mas suas 3 habilidades básicas continuam as mesmas por baixo delas. Escolha qual vai guardar a chama (+${Math.round(ALBERON_BUFF_LV1_BONUS*100)}% de dano).</p>
        </div>
        <div class="puzzle-forja-content">${btnsHtml}</div>
        <div class="puzzle-forja-controls">
          <button class="puzzle-forja-btn ghost" id="alberonBuffCancelar">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    container.querySelectorAll('.alberon-skill-choice').forEach(btn => {
      btn.onclick = () => {
        const sk = info.skills[parseInt(btn.dataset.idx, 10)];
        container.remove();
        storyNode_inazami_alberon_buff_confirmar(sk.name, sk.id || sk.dmg || null, ALBERON_BUFF_LV1_BONUS);
      };
    });
    container.querySelector('#alberonBuffCancelar').onclick = () => container.remove();
  } else {
    // Classes normais — travado direto na habilidade inicial, sem escolha livre.
    const sk = info.skill;
    container.innerHTML = `
      <div class="puzzle-forja-main" style="position:relative;">
        <div class="puzzle-forja-header">
          <h2>🔥 Chama do Caldeirão</h2>
          <p>O caldeirão só reconhece o que veio primeiro — sua habilidade inicial.</p>
        </div>
        <div class="puzzle-forja-content">
          <div class="alberon-skill-card">
            <div class="alberon-skill-icon">${sk.icon || '🔥'}</div>
            <div class="alberon-skill-name">${sk.name}</div>
            <div class="alberon-skill-bonus">+${Math.round(ALBERON_BUFF_LV1_BONUS*100)}% de dano</div>
          </div>
          <div class="puzzle-forja-status">Ela vai bater quase o dobro dentro desta masmorra.</div>
        </div>
        <div class="puzzle-forja-controls">
          <button class="puzzle-forja-btn" id="alberonBuffConfirmar">Confirmar</button>
          <button class="puzzle-forja-btn ghost" id="alberonBuffCancelar">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    container.querySelector('#alberonBuffConfirmar').onclick = () => {
      container.remove();
      storyNode_inazami_alberon_buff_confirmar(sk.name, sk.id || sk.dmg || null, ALBERON_BUFF_LV1_BONUS);
    };
    container.querySelector('#alberonBuffCancelar').onclick = () => container.remove();
  }

  container.addEventListener('click', (e) => { if (e.target === container) container.remove(); });
}
window.openPuzzleAlberonEscolhaBuff = openPuzzleAlberonEscolhaBuff;

function storyNode_inazami_alberon_buff_confirmar(nomeHabilidade, skillId, bonusDano) {
  G.inazami = G.inazami || {};
  G.inazami.buffCaldeiraoObtido = true;
  G.inazami.buffCaldeiraoSkillNome = nomeHabilidade;
  G.inazami.buffCaldeiraoSkillId = skillId || null; // id/dmg da skill — comparação robusta (evita erro de nome digitado)
  G.inazami.buffCaldeiraoNivel = 1; // LV1 — abre espaço pra LV2/LV3 futuros
  G.inazami.buffCaldeiraoBonusDano = (typeof bonusDano === 'number') ? bonusDano : ALBERON_BUFF_LV1_BONUS;

  notify(`🔥 "${nomeHabilidade}" agora queima quase o dobro nesta masmorra!`, 'gold');
  addLog(`Buff do Caldeirão de Alberon (LV1) aplicado em "${nomeHabilidade}".`);
  updateHUD();

  setScene('inazami-f1');
  hideEnemy();
  showStoryCutscene(ALBERON_CENARIO, { shake:false, vibrate:false });
  setStory(
    'ALBERON',
    `A chama do caldeirão salta e se prende em você por um instante — um calor rápido, quase carinhoso.\n\n"Pronto. '${nomeHabilidade}' vai lembrar desse fogo enquanto você estiver aqui dentro. Bate quase o dobro."\n\n"Agora anda. Inazami está esperando, e o Oni não espera pra sempre. Eu, menos ainda."`,
    [
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ],
    ALBERON_RETRATO
  );
}
window.storyNode_inazami_alberon_buff_confirmar = storyNode_inazami_alberon_buff_confirmar;

// ─────────────────────────────────────────────────────────────
//  Helper pra checar o bônus na hora de calcular dano.
//  Aceita tanto o objeto da skill (recomendado — compara por id)
//  quanto uma string com o nome (compatibilidade com o modo
//  fallback de texto livre). Chamado em palDinh.js dentro de
//  executeSkill(), logo após window.executeClassSkill():
//    const mult = getInazamiCaldeiraoBonus(sk);
//    if (mult > 1) { ...aplica bônus sobre result.dmgDealt... }
// ─────────────────────────────────────────────────────────────
function getInazamiCaldeiraoBonus(skOrNome) {
  if (typeof G === 'undefined' || !G.inazami || !G.inazami.buffCaldeiraoObtido) return 1;
  if (G.location !== 'dungeon-inazami') return 1; // só vale dentro da masmorra

  const alvoId   = (G.inazami.buffCaldeiraoSkillId || '').toString().trim().toLowerCase();
  const alvoNome = (G.inazami.buffCaldeiraoSkillNome || '').trim().toLowerCase();

  let usadaId = '', usadaNome = '';
  if (skOrNome && typeof skOrNome === 'object') {
    usadaId   = (skOrNome.id || skOrNome.dmg || '').toString().trim().toLowerCase();
    usadaNome = (skOrNome.name || '').trim().toLowerCase();
  } else {
    usadaNome = (skOrNome || '').trim().toLowerCase();
  }

  const bateId   = alvoId && usadaId && alvoId === usadaId;
  const bateNome = alvoNome && usadaNome && alvoNome === usadaNome;

  if (bateId || bateNome) {
    return 1 + (G.inazami.buffCaldeiraoBonusDano || 0);
  }
  return 1;
}
window.getInazamiCaldeiraoBonus = getInazamiCaldeiraoBonus;

// ─────────────────────────────────────────────────────────────
//  Fechar o Puzzle
// ─────────────────────────────────────────────────────────────
function closeForjaPuzzle() {
  const container = document.getElementById('puzzle-forja-selada-container');
  if (container) {
    container.remove();
  }
}
window.closeForjaPuzzle = closeForjaPuzzle;

// Exportar pra global scope se necessário
if (typeof window !== 'undefined') {
  window.storyNode_inazami_alberon_intro = storyNode_inazami_alberon_intro;
  window.storyNode_inazami_alberon_fala2 = storyNode_inazami_alberon_fala2;
  window.storyNode_inazami_alberon_fala3 = storyNode_inazami_alberon_fala3;
  window.storyNode_inazami_alberon_forja_selada = storyNode_inazami_alberon_forja_selada;
  window.storyNode_inazami_alberon_pos_puzzle = storyNode_inazami_alberon_pos_puzzle;
  window.storyNode_inazami_alberon_revisita = storyNode_inazami_alberon_revisita;
  window.storyNode_inazami_alberon_buff_confirmar = storyNode_inazami_alberon_buff_confirmar;
  window.openPuzzleForjaSelada = openPuzzleForjaSelada;
  window.openPuzzleAlberonEscolhaBuff = openPuzzleAlberonEscolhaBuff;
  window.closeForjaPuzzle = closeForjaPuzzle;
  window.getInazamiCaldeiraoBonus = getInazamiCaldeiraoBonus;
}

// ═══════════════════════════════════════════════════════════
//  FIM: alberon_forja_selada.js
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  INÍCIO: estatuas_corredor.js
// ═══════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════
//  estatuas_corredor.js
//  Corredor das Estátuas — Masmorra Inazami
//  Última parada antes do Salão do Trono / Hi-no-Kagutsuchi.
//  Libera no mapa depois do buff do Caldeirão de Alberon
//  (G.inazami.buffCaldeiraoObtido). Batalha única com as 3
//  estátuas juntas (mesmo motor multi-inimigo do trio de Onibi).
//
//  ⚠️ Calibrado a partir da proporção HP:ATK já validada na Regra
//  (1600:160 ≈ 10:1). Sonho e Ordem ajustadas pra manter essa
//  mesma lógica, reduzindo HP conforme o ATK/mecânica de cada
//  uma fica mais agressiva.
// ─────────────────────────────────────────────────────────────
//  ESTÁTUA DA REGRA — ATK 160 / HP 1600 / DEF 130 / ACC 20% /
//  DMG 197% / velocidade ilimitada (ordem de ação embaralhada a
//  cada rodada — ela pode agir antes ou depois das outras duas).
//  Regra: cada ataque dela que ACERTA o jogador grava uma letra
//  de "LEI" (L → E → I). Ao completar a palavra, o HP do jogador
//  cai pra 1 na hora — inevitável, não pode ser bloqueado, curado
//  no mesmo instante nem evitado pela HuBi. A contagem reseta e
//  recomeça do zero depois de disparar.
//
//  ESTÁTUA DO SONHO — ATK 170 / HP 1550 / DEF 110 /
//  ACC 25% / DMG 200% / velocidade ilimitada.
//  A cada 3 ações dela, em vez de atacar, aplica Sleep no jogador
//  (pula a próxima ação dele). Cooldown de 2 ações entre uma
//  aplicação e outra (proteção extra, já que o ciclo de 3 em 3
//  naturalmente respeita isso).
//
//  ESTÁTUA DA ORDEM — ATK 185 / HP 1350 / DEF 115 /
//  ACC 27% / DMG 190% / velocidade ilimitada.
//  Alterna entre duas fases:
//    • Primeira Ordem (3 ações): copia a skill mais recente que o
//      jogador usou e ataca com ela por 3 ações seguidas.
//    • Segunda Ordem (1 ação, dispara ao fim da Primeira): aplica
//      de uma vez só os 3 debuffs — Sangramento (3 turnos),
//      HuBi dormindo/cura bloqueada (3 turnos) e Reflexo de 10%
//      do dano que o jogador causar (3 turnos).
//  Depois da Segunda Ordem, volta pra Primeira Ordem com uma nova
//  skill copiada, e o ciclo se repete.
// ═════════════════════════════════════════════════════════════

// ── Intro: chegada ao corredor (via pin do mapa) ──
function storyNode_inazami_corredor_estatuas_intro() {
  try { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); } catch (_) {}
  setScene('inazami-f1');
  hideEnemy();
  G.location = 'dungeon-inazami';
  setStory(
    'NARRADOR',
    `A escadaria segue além do caldeirão de Alberon, subindo em silêncio até um corredor estreito.\n\nTrês estátuas de pedra negra flanqueiam o caminho — talhadas com o mesmo rosto grotesco do Oni das Chamas. Uma traz gravada a palavra "Regra". Outra, "Sonho". A última, "Ordem".\n\nAo se aproximar, os olhos das três acendem ao mesmo tempo, como brasas despertando.`,
    [
      { icon:'⚔️', text:'Enfrentar as 3 Estátuas', action: storyNode_inazami_corredor_estatuas_batalha },
    ]
  );
}
window.storyNode_inazami_corredor_estatuas_intro = storyNode_inazami_corredor_estatuas_intro;

// ── Membros da batalha ──
function _estatuasCorredorMembros() {
  return [
    { id: 'estatua_regra', name: 'Estátua da Regra', img: 'Imagens/personagens/regrEst.png',
      hp: 1600, atk: 160, def: 130, acc: 0.20, dmgMult: 1.97, elemento: 'fogo' },
    { id: 'estatua_sonho', name: 'Estátua do Sonho', img: 'Imagens/personagens/sonhest.png',
      hp: 1550, atk: 170, def: 110, acc: 0.25, dmgMult: 2.00, elemento: 'fogo' },
    { id: 'estatua_ordem', name: 'Estátua da Ordem', img: 'Imagens/personagens/ordemest.png',
      hp: 1350, atk: 185, def: 115, acc: 0.27, dmgMult: 1.90, elemento: 'fogo' },
  ];
}

// Embaralha um array (Fisher-Yates) — usado pra dar a "velocidade
// ilimitada e variável" das 3 estátuas (ordem de ação sorteada a
// cada rodada, ninguém tem prioridade fixa).
function _shuffleArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ataque básico genérico de uma estátua (usado pela Regra, Sonho fora do
// turno de Sleep, e Ordem fora dos turnos de skill copiada).
function _estatuaAtaqueBasico(statue, bs, p, rotuloAcao) {
  const ampMult = (typeof inazamiChamaAtkMult === 'function') ? inazamiChamaAtkMult() : 1;
  const acertou = Math.random() < statue.acc;
  if (!acertou) {
    appendBattleLog(`${statue.name} ataca, mas erra o golpe!`, '#a0a0a0');
    return false;
  }
  const dano = Math.max(1, Math.floor(statue.atk * statue.dmgMult * ampMult) - Math.floor((p.def || 0) / 2));
  applyDmgToPlayer(dano, bs, p);
  appendBattleLog(`${statue.name} usa ${rotuloAcao || 'um golpe de pedra'}! -${dano} HP!`, '#e05020');
  showFloatingNumber('hero', dano, 'dmg');
  flashDamage('hero');
  return true;
}

// ── Regra: empilha letras de "LEI" a cada acerto ──
const _REGRA_PALAVRA = ['L', 'E', 'I'];
function _regraAge(bs, p) {
  const acertou = _estatuaAtaqueBasico(_ESTATUA_STATS.estatua_regra, bs, p, 'Golpe da Regra');
  if (!acertou || p.hp <= 0) return;

  bs._regraLetraIdx = (bs._regraLetraIdx || 0);
  const letra = _REGRA_PALAVRA[bs._regraLetraIdx];
  bs._regraLetraIdx++;
  const progresso = _REGRA_PALAVRA.map((l, i) => i < bs._regraLetraIdx ? l : '_').join('');
  appendBattleLog(`🗿 A Estátua da Regra grava a letra "${letra}" em você! (${progresso})`, '#ffaa40');
  showFloatingNumber('hero', letra, 'status');

  if (bs._regraLetraIdx >= _REGRA_PALAVRA.length) {
    bs._regraLetraIdx = 0;
    p.hp = Math.max(1, Math.min(p.hp, 1)); // trava em 1 — não cura nem mata, só força pra 1
    appendBattleLog('⚖️ A palavra "LEI" se completa! Seu HP despenca pra 1 — nada pode impedir isso!', '#ff2020');
    showFloatingNumber('hero', '⚖ LEI!', 'crit');
    flashDamage('hero');
    updateHUD();
  }
}

// ── Sonho: Sleep a cada 3 ações, cooldown de 2 ──
function _sonhoAge(bs, p) {
  bs._sonhoContador = (bs._sonhoContador || 0) + 1;
  bs._sonhoCooldown = Math.max(0, (bs._sonhoCooldown || 0) - 1);

  if (bs._sonhoContador % 3 === 0 && bs._sonhoCooldown <= 0) {
    bs.playerSleeping = true;
    bs.playerSleepTurns = (bs.playerSleepTurns || 0) + 1;
    bs._sonhoCooldown = 2;
    appendBattleLog('💤 A Estátua do Sonho sussurra... você sente as pálpebras pesarem! SONO aplicado!', '#8090c0');
    showFloatingNumber('hero', '💤 SONO', 'status');
    updateHUD();
    buildStatusBadges();
    return;
  }
  _estatuaAtaqueBasico(_ESTATUA_STATS.estatua_sonho, bs, p, 'um golpe onírico');
}

// ── Ordem: alterna Primeira Ordem (copia skill, 3 ações) e Segunda
//    Ordem (aplica os 3 debuffs de uma vez, 1 ação) ──
function _ordemAge(bs, p) {
  bs._ordemFase = bs._ordemFase || 'copia';

  if (bs._ordemFase === 'segunda') {
    // Segunda Ordem: dispara os 3 debuffs juntos, depois volta a copiar.
    if (!p._talent_steel_soul && !p._talent_dark_immune_bleed) {
      bs.playerBleeding = true;
      bs.playerBleedTurns = 3;
    }
    bs._hubiSleeping = true;
    bs._hubiSleepingTurns = 3;
    bs._reflexoDano = 0.10;
    bs._reflexoDanoTurns = 3;
    appendBattleLog('⚖️ SEGUNDA ORDEM! A Estátua da Ordem decreta: Sangramento, HuBi adormecida e Reflexo de 10% do seu próprio dano — tudo por 3 turnos!', '#c060ff');
    showFloatingNumber('hero', '⚖ ORDEM', 'status');
    updateHUD();
    buildStatusBadges();
    bs._ordemFase = 'copia';
    bs._ordemSkillCopiada = null;
    bs._ordemTurnosRestantes = 0;
    return;
  }

  // Fase "copia" (Primeira Ordem)
  if (!bs._ordemSkillCopiada) {
    const hist = (bs.playerActionHistory || []).slice().reverse();
    const ultimaSkill = hist.find(a => a.type === 'skill');
    bs._ordemSkillCopiada = ultimaSkill ? ultimaSkill.name : 'um golpe qualquer';
    bs._ordemTurnosRestantes = 3;
    appendBattleLog(`🗿 PRIMEIRA ORDEM! A Estátua da Ordem copia "${bs._ordemSkillCopiada}"!`, '#c060ff');
  }

  _estatuaAtaqueBasico(_ESTATUA_STATS.estatua_ordem, bs, p, `"${bs._ordemSkillCopiada}" (copiada)`);
  bs._ordemTurnosRestantes--;
  if (bs._ordemTurnosRestantes <= 0) {
    bs._ordemFase = 'segunda';
  }
}

// Mapa rápido id → stats (usado pelos helpers acima)
const _ESTATUA_STATS = {};
_estatuasCorredorMembros().forEach(m => { _ESTATUA_STATS[m.id] = m; });

// ── Turno das 3 estátuas: ordem embaralhada a cada rodada ──
function _estatuasCorredorTurnHandler(bs, p, aliveMembers, done) {
  const ordem = _shuffleArr(aliveMembers);
  let i = 0;

  function proximaAcao() {
    if (i >= ordem.length || p.hp <= 0) { done(); return; }
    const membro = ordem[i];
    i++;

    if (typeof mebAnimateActing === 'function') mebAnimateActing(membro.id);

    setTimeout(() => {
      if (membro.id === 'estatua_regra') _regraAge(bs, p);
      else if (membro.id === 'estatua_sonho') _sonhoAge(bs, p);
      else if (membro.id === 'estatua_ordem') _ordemAge(bs, p);

      updateHUD();
      updateBattleHUD();
      buildStatusBadges();
      proximaAcao();
    }, 550);
  }

  proximaAcao();
}

function storyNode_inazami_corredor_estatuas_batalha() {
  if (!G.inazami) G.inazami = {};
  G.location = 'dungeon-inazami';

  G._dungeonBattleCallback = function() {
    storyNode_inazami_corredor_estatuas_vitoria();
  };

  startMultiEnemyBattle({
    groupId:   'corredor_estatuas',
    groupName: '3× Estátua do Oni das Chamas',
    icon:      '🗿',
    elemento:  'fogo',
    isBoss:    true,
    desc:      'Regra, Sonho e Ordem — três guardiãs de pedra do Oni das Chamas, cada uma com sua própria punição.',
    xp:   1200,
    gold: 400,
    loot: [
      { id:'fragmento_amuleto_final', name:'Fragmento Final do Amuleto', icon:'🔶', qty:1,
        imgSrc:'Imagens/inazami masmorra/3mulet.png', chance: 1.0, weight: 0.2, unique: true,
        type:'chave', desc:'O último pedaço que faltava. O amuleto de Inazami está prestes a se completar.' },
    ],
    members:       _estatuasCorredorMembros(),
    turnHandler:   _estatuasCorredorTurnHandler,
  });
}
window.storyNode_inazami_corredor_estatuas_batalha = storyNode_inazami_corredor_estatuas_batalha;

function storyNode_inazami_corredor_estatuas_vitoria() {
  setScene('inazami-f1');
  hideEnemy();
  G.location = 'dungeon-inazami';
  G.inazami = G.inazami || {};
  G.inazami.corredorEstatuasDerrotado = true; // libera o pin do Salão do Trono

  if (!window.inazamiAmuletoJaFeito || !window.inazamiAmuletoJaFeito()) {
    notify('🔶 Fragmento Final do Amuleto obtido!', 'gold');
  }

  setStory(
    'NARRADOR',
    `As três estátuas racham ao mesmo tempo, e o fogo em seus olhos se apaga junto com elas.\n\nNo meio dos cacos de pedra, o último fragmento do amuleto pulsa fracamente, ainda quente.\n\nA voz de Inazami sussurra, agora quase inteira: "É isso... o amuleto está completo. Só falta uma coisa entre nós e o fim disso tudo."`,
    [
      { icon:'➡️', text:'Continuar', action: storyNode_inazami_estatuas_bau_intro },
    ]
  );
}
window.storyNode_inazami_corredor_estatuas_vitoria = storyNode_inazami_corredor_estatuas_vitoria;

// ─────────────────────────────────────────────────────────────
//  BAÚ DO CORREDOR DAS ESTÁTUAS
//  600 Gold + 3 miniaturas (uma por estátua) + Brasa Fragmentada.
//  Exige 2 Chaves da Câmara das Estátuas pra abrir — as chaves
//  ficam soltas ao lado do baú (não vêm dentro dele).
// ─────────────────────────────────────────────────────────────

const _ITEM_CHAVE_CAMARA_ESTATUAS = {
  id: 'chave_camara_estatuas', name: 'Chave da Câmara das Estátuas', icon: '🗝️',
  type: 'chave', weight: 0,
  desc: 'Uma chave de ferro enegrecido, ainda quente. Havia duas, largadas ao lado do baú — como se esperassem por alguém disposto a usar as duas ao mesmo tempo.',
};

function storyNode_inazami_estatuas_bau_intro() {
  setScene('inazami-f1');
  hideEnemy();
  G.inazami = G.inazami || {};

  // Concede as 2 chaves automaticamente, se ainda não tiver pego
  if (!G.inazami.chavesCamaraEstatuasObtidas) {
    addItem({ ..._ITEM_CHAVE_CAMARA_ESTATUAS }, 2);
    G.inazami.chavesCamaraEstatuasObtidas = true;
    notify('🗝️ 2× Chave da Câmara das Estátuas obtidas!', 'gold');
  }

  setStory(
    'NARRADOR',
    `Entre os cacos de pedra, um baú de ferro enegrecido resiste ao tempo — ainda quente ao toque, como se tivesse sido forjado pelo próprio calor que acabou de morrer ali.\n\nAo lado dele, duas chaves de ferro brilham fracamente sob a poeira. Óbvio demais pra ser coincidência.`,
    [
      { icon:'🔓', text:'Abrir o baú com as 2 chaves', action: storyNode_inazami_estatuas_bau_abrir },
    ]
  );
}
window.storyNode_inazami_estatuas_bau_intro = storyNode_inazami_estatuas_bau_intro;

function storyNode_inazami_estatuas_bau_abrir() {
  if (_getItemQty('chave_camara_estatuas') < 2) {
    notify('Você precisa das 2 chaves pra abrir este baú!', 'red');
    return;
  }

  // Consome as 2 chaves
  let restante = 2;
  G.player.inventory = G.player.inventory.map(item => {
    if (item.id === 'chave_camara_estatuas' && restante > 0) {
      const consumir = Math.min(item.qty || 1, restante);
      restante -= consumir;
      const novaQtd = (item.qty || 1) - consumir;
      return novaQtd <= 0 ? null : { ...item, qty: novaQtd };
    }
    return item;
  }).filter(Boolean);

  G.player.gold = (G.player.gold || 0) + 600;

  const _loot = [
    { id: 'miniatura_regra', name: 'Miniatura da Regra', icon: '🗿', qty: 1,
      type: 'material', desc: 'Uma réplica em miniatura da Estátua da Regra. Pesada demais pra ser só um enfeite.' },
    { id: 'miniatura_sonho', name: 'Miniatura do Sonho', icon: '🗿', qty: 1,
      type: 'material', desc: 'Uma réplica em miniatura da Estátua do Sonho. Parece observar de volta, mesmo pequena.' },
    { id: 'miniatura_ordem', name: 'Miniatura da Ordem', icon: '🗿', qty: 1,
      type: 'material', desc: 'Uma réplica em miniatura da Estátua da Ordem. Ainda emana um calor residual.' },
    { id: 'brasa_fragmentada_estatuas', name: 'Brasa Fragmentada', icon: '🔥', qty: 1,
      imgSrc: 'Imagens/icones/brsafragke.png',
      type: 'material', desc: 'Fragmentos de brasa que restaram das três estátuas — mais densos e quentes que os fragmentos comuns dos Onibi.' },
  ];
  _loot.forEach(it => addItem({ ...it }, it.qty));

  notify('💰 600 Gold, 3 Miniaturas e Brasa Fragmentada obtidos!', 'gold');
  updateHUD();

  setStory(
    'NARRADOR',
    `O baú se abre com um estalo seco. Dentro, moedas antigas, três pequenas réplicas de pedra das estátuas derrotadas e um punhado de brasas fragmentadas, ainda quentes ao toque.`,
    [
      { icon:'➡️', text:'Continuar', action: storyNode_inazami_confronto_hinokagutsuchi },
    ]
  );
}
window.storyNode_inazami_estatuas_bau_abrir = storyNode_inazami_estatuas_bau_abrir;

// ── Depois das estátuas: Hi-no-Kagutsuchi "escuta" o resultado através do
//    selo e comenta, e Inazami responde — revelando que essa vitória fazia
//    parte do plano dela o tempo todo. Ainda sem a luta real (Salão do
//    Trono continua sendo o placeholder) — essa cena é só a virada
//    narrativa antes dela.
function storyNode_inazami_confronto_hinokagutsuchi() {
  setStory(
    'HI-NO-KAGUTSUCHI',
    `Uma risada rouca ecoa vinda de além do salão do trono, como se atravessasse pedra e selo ao mesmo tempo.\n\n"Impressionante... atravessar as três estátuas não é pouca coisa. Isso mostra o quanto você se tornou forte."\n\nA risada esfria, e vira quase uma promessa.\n\n"Se eu me soltar, farei questão de te entregar um presente. Pessoalmente."`,
    [
      { icon:'…', text:'...', action: storyNode_inazami_confronto_resposta },
    ]
  );
}
window.storyNode_inazami_confronto_hinokagutsuchi = storyNode_inazami_confronto_hinokagutsuchi;

function storyNode_inazami_confronto_resposta() {
  setStory(
    'INAZAMI',
    `A voz de Inazami responde, firme — sem um traço de dúvida.\n\n"Você não vai sair daqui. Enquanto eu resistir, o selo resiste — e sua força vai alimentar essa resistência, queira você ou não."\n\nO silêncio que sobra depois soa como uma sentença.`,
    [
      { icon:'➡️', text:'...', action: storyNode_inazami_confronto_final },
    ]
  );
}
window.storyNode_inazami_confronto_resposta = storyNode_inazami_confronto_resposta;

// Fecho da cena: não afirma nada abertamente, só planta a dúvida — o
// jogador deve sair achando que aquilo era exatamente o que o
// Hi-no-Kagutsuchi queria provocar. Inazami segue como guardiã genuína,
// mas manipulada sem saber.
function storyNode_inazami_confronto_final() {
  setStory(
    'NARRADOR',
    `Nas sombras além do selo, alguma coisa sorri — como se aquilo fosse exatamente o que ele queria ouvir.`,
    [
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ]
  );
}
window.storyNode_inazami_confronto_final = storyNode_inazami_confronto_final;
window.storyNode_inazami_corredor_estatuas_intro = storyNode_inazami_corredor_estatuas_intro;

// ═══════════════════════════════════════════════════════════
//  FIM: estatuas_corredor.js
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  INÍCIO: eir_valkiria.js
// ═══════════════════════════════════════════════════════════

// =============================================================
//  EIR_VALKIRIA.JS — Chronicles of Clivor
//  Sistema Completo da Valkiria Eir (arquivo único) — REDESIGN
//  - Stats base novos (HP 2500 / ATK 150 / DEF 160 / Crit 20% / CritDmg 100%)
//  - Skill 1: Trovão Imperial (dano = ATK x2, raio)
//  - Skill 2: Ave de Rapina (2 turnos de dano verdadeiro + buff de ATK)
//  - Skill 3: Grito Eiridiano (buff de DEF + resistência a dano crítico)
//  - Passiva (20%/turno): 3 turnos de ataque duplo → depois Modo Sono
//    (imune a skill, vulnerável a ataque normal)
//  - Regeneração de "quase morte", quebrável por golpe bruto pesado
//  Depende de: palDinh.js (ENEMY_AI, startBattle, doBattleAction,
//              battleState, appendBattleLog, showFloatingNumber,
//              updateHUD, updateBattleHUD, calcEnemyDmg, setBattleButtons,
//              buildSkillList, updateBattleTurnIndicator)
// =============================================================


// ─────────────────────────────────────────────────────────────
//  1. STATS BASE DA EIR
// ─────────────────────────────────────────────────────────────

const EIR_VALKIRIA = {
  id: 'eir_valkiria',
  nome: 'Eir, a Valkiria',
  sprite: 'Imagens/personagens/eir_valkiria.png', // TODO: arte da Eir

  // ─────── STATS BASE (valores passados por você) ────────
  hp:      2500,
  maxHp:   2500,
  atk:     150,
  def:     50,    // AJUSTE 2: era 115 — com ATQ real do jogador em 45, DEF acima de ~90 trava o dano no mínimo de 1
  spd:     85,      // AJUSTE: não especificado — mantive o valor anterior
  critRate: 0.20,   // 20% de chance de crítico
  critDmg:  2.00,   // 100% de dano crítico ADICIONAL = 2.00x no total

  elemento: 'raio',

  // ─────── COOLDOWNS DAS SKILLS ────────
  // AJUSTE: cooldowns não especificados — usei 3~4 turnos, mesmo padrão do resto do jogo
  cooldowns: {
    trovaoImperial: 0,
    aveRapina:      0,
    gritoEiridiano: 0,
  },

  // ─────── PASSIVA: ATAQUE DUPLO (20%/turno) → MODO SONO ────────
  passivaDupla: {
    ativo: false,
    turnosRestantes: 0,
    duracaoTurnos: 3,     // "por 3 turnos todo ataque é duplo"
    chancePorTurno: 0.20, // "ativando com 20% de chance"
  },
  modoSono: {
    ativo: false,
    turnosRestantes: 0,
    duracaoTurnos: 2,               // AJUSTE: duração do sono não especificada
    multDanoAtaqueNormal: 1.6,      // AJUSTE: quanto ela sofre A MAIS de ataques normais dormindo (+60%)
  },

  // ─────── SKILL 2: AVE DE RAPINA (2 turnos, dano verdadeiro + buff ATK) ────────
  aveRapina: {
    ativo: false,
    turnosRestantes: 0,
    duracaoTurnos: 2,
    atkBuffPct: 0.25,     // AJUSTE: +25% ATK durante o modo — não especificado
    atkBuffAplicado: 0,   // valor real somado ao atk, pra reverter depois
  },

  // ─────── SKILL 3: GRITO EIRIDIANO (buff DEF + resistência a crítico) ────────
  gritoBuff: {
    ativo: false,
    turnosRestantes: 0,
    duracaoTurnos: 3,          // AJUSTE: não especificado
    defBuffPct: 0.30,          // AJUSTE: +30% DEF — não especificado
    defBuffAplicado: 0,
    reducaoDanoCritico: 0.40,  // AJUSTE: -40% no dano crítico recebido — não especificado
  },

  // ─────── REGENERAÇÃO DE "QUASE MORTE" ────────
  regen: {
    quebrada: false,       // uma vez quebrada, nunca mais regenera nessa luta
    limiarPct: 0.25,        // AJUSTE: "quase morrendo" = 25% HP ou menos — não especificado
    curaPctPorTurno: 0.08,  // AJUSTE: cura 8% do HP máx. por turno enquanto ativa
    quebraPctHitUnico: 0.12, // AJUSTE: era 0.35 (875 dano num golpe só, inatingível) — agora ~12% do HP máx.
  },

  // ─────── LOOT (mantido) ────────
  loot: [
    {
      id: 'amuleto_fragmento_eir',
      name: 'Fragmento do Amuleto — Coração da Eir',
      icon: '🔥',
      imgSrc: 'imagens/inazami masmorra/2mulet.png',
      type: 'chave',
      desc: 'O segundo fragmento do amuleto de Inazami. Estava sendo usado como núcleo de vida de algo que nunca chegou a nascer por completo.',
      weight: 0.2,
      qty: 1,
      unique: true, // só existe 1 fragmento — nunca deve duplicar/somar qty
    },
  ],

  xp: 2500,
  gold: 1500,
};

// ─────────────────────────────────────────────────────────────
//  2. SKILLS
// ─────────────────────────────────────────────────────────────

const EIR_SKILLS = {

  // ⚡ SKILL 1 — TROVÃO IMPERIAL (soma o próprio ATK x2 + descarga de raio)
  trovaoImperial: {
    nome: '⚡ Trovão Imperial',
    elemento: 'raio',
    tipo: 'ataque',
    cooldown: 3,
    descricao: 'Eir soma seu próprio ataque em dobro e solta uma descarga de raio.',
    executar(eirStats, playerStats) {
      if (eirStats.cooldowns.trovaoImperial > 0) {
        return { sucesso: false, msg: '⏳ Trovão Imperial em cooldown...' };
      }

      let dano = Math.floor(eirStats.atk * 2);
      dano += Math.floor(Math.random() * 15 - 7);
      dano = Math.max(1, dano);

      const isCrit = Math.random() < eirStats.critRate;
      if (isCrit) dano = Math.floor(dano * eirStats.critDmg);

      // Se o ataque duplo da passiva estiver ativo, a skill também dobra.
      if (eirStats.passivaDupla.ativo) dano = Math.floor(dano * 2);

      playerStats.hp = Math.max(0, playerStats.hp - dano);
      eirStats.cooldowns.trovaoImperial = 3;

      return {
        sucesso: true,
        msg: `⚡ Trovão Imperial! Eir dobra o próprio ataque e descarrega um raio! ${isCrit ? '✨ CRÍTICO! ' : ''}${dano} de dano!`,
        dano, isCrit,
        efeito: 'trovao_imperial',
      };
    },
  },

  // 🦅 SKILL 2 — AVE DE RAPINA (2 turnos: dano verdadeiro + buff de ATK)
  aveRapina: {
    nome: '🦅 Ave de Rapina',
    elemento: null,
    tipo: 'modo',
    cooldown: 4,
    descricao: 'Por 2 turnos, Eir perfura o HP do oponente (dano verdadeiro) e tem o ataque ampliado.',
    executar(eirStats, playerStats) {
      if (eirStats.cooldowns.aveRapina > 0) {
        return { sucesso: false, msg: '⏳ Ave de Rapina em cooldown...' };
      }

      eirStats.aveRapina.ativo = true;
      eirStats.aveRapina.turnosRestantes = eirStats.aveRapina.duracaoTurnos;

      const buff = Math.floor(eirStats.atk * eirStats.aveRapina.atkBuffPct);
      eirStats.atk += buff;
      eirStats.aveRapina.atkBuffAplicado = buff;

      // Primeiro golpe perfurante já sai nesse turno de ativação.
      let dano = Math.floor(eirStats.atk * 0.5);
      dano += Math.floor(Math.random() * 10 - 5);
      dano = Math.max(1, dano);

      const isCrit = Math.random() < eirStats.critRate;
      if (isCrit) dano = Math.floor(dano * eirStats.critDmg);
      if (eirStats.passivaDupla.ativo) dano = Math.floor(dano * 2);

      playerStats.hp = Math.max(0, playerStats.hp - dano);
      eirStats.cooldowns.aveRapina = 4;

      return {
        sucesso: true,
        msg: `🦅 Ave de Rapina! Eir entra em voo de caça — ataque ampliado em +${buff} por 2 turnos! ${isCrit ? '✨ CRÍTICO! ' : ''}${dano} de dano verdadeiro (ignora defesa)!`,
        dano, isCrit,
        efeito: 'ave_rapina_ativa',
      };
    },
  },

  // 🛡️ SKILL 3 — GRITO EIRIDIANO (buff de DEF + resistência a dano crítico)
  gritoEiridiano: {
    nome: '🛡️ Grito Eiridiano',
    elemento: null,
    tipo: 'buff',
    cooldown: 4,
    descricao: 'Eir solta um grito que aumenta sua DEF e sua resistência a dano crítico por alguns turnos.',
    executar(eirStats) {
      if (eirStats.cooldowns.gritoEiridiano > 0) {
        return { sucesso: false, msg: '⏳ Grito Eiridiano em cooldown...' };
      }

      eirStats.gritoBuff.ativo = true;
      eirStats.gritoBuff.turnosRestantes = eirStats.gritoBuff.duracaoTurnos;

      const buff = Math.floor(eirStats.def * eirStats.gritoBuff.defBuffPct);
      eirStats.def += buff;
      eirStats.gritoBuff.defBuffAplicado = buff;

      eirStats.cooldowns.gritoEiridiano = 4;

      return {
        sucesso: true,
        msg: `🛡️✨ Grito Eiridiano! Eir ruge — DEF +${buff} e resistência a dano crítico por ${eirStats.gritoBuff.duracaoTurnos} turnos!`,
        efeito: 'grito_eiridiano',
      };
    },
  },
};

// ─────────────────────────────────────────────────────────────
//  3. PASSIVA — ATAQUE DUPLO (20%/turno) → MODO SONO
// ─────────────────────────────────────────────────────────────

// Chamada no início do turno da Eir. Só tenta ativar se não estiver
// já em ataque duplo, em modo sono, ou em Ave de Rapina (não acumula
// com o modo da skill 2 pra não empilhar dano verdadeiro + dobro).
function tentarAtivarPassivaEir(eirStats) {
  if (eirStats.passivaDupla.ativo || eirStats.modoSono.ativo || eirStats.aveRapina.ativo) {
    return false;
  }
  if (Math.random() > eirStats.passivaDupla.chancePorTurno) return false;

  eirStats.passivaDupla.ativo = true;
  eirStats.passivaDupla.turnosRestantes = eirStats.passivaDupla.duracaoTurnos;

  return {
    msg: `⚡⚡ Passiva Ativada! Eir entra em frenesi — todo ataque sai em dobro por ${eirStats.passivaDupla.duracaoTurnos} turnos!`,
  };
}

// Processa um turno de ataque duplo (2 golpes básicos).
function processarAtaqueDuploEir(eirStats, playerStats) {
  const numAtaques = 2;
  let danoTotal = 0;
  let criticosLandados = 0;
  const ataques = [];

  for (let i = 0; i < numAtaques; i++) {
    let dano = Math.floor(eirStats.atk * 0.55) + Math.floor(Math.random() * 12 - 6);
    const isCrit = Math.random() < eirStats.critRate;
    if (isCrit) {
      dano = Math.floor(dano * eirStats.critDmg);
      criticosLandados++;
    }
    dano = Math.max(1, dano);
    danoTotal += dano;
    ataques.push({ numero: i + 1, dano, isCrit });
  }

  playerStats.hp = Math.max(0, playerStats.hp - danoTotal);

  eirStats.passivaDupla.turnosRestantes--;
  let entrouEmSono = false;
  if (eirStats.passivaDupla.turnosRestantes <= 0) {
    eirStats.passivaDupla.ativo = false;
    eirStats.modoSono.ativo = true;
    eirStats.modoSono.turnosRestantes = eirStats.modoSono.duracaoTurnos;
    entrouEmSono = true;
  }

  return {
    ataques, danoTotal, criticosLandados, entrouEmSono,
    msg: `⚡⚡ ATAQUE DUPLO! 2× golpes! ${danoTotal} dano total!${criticosLandados > 0 ? ` ${criticosLandados}× CRÍTICO!` : ''}`,
  };
}

// Processa um turno de continuação da Ave de Rapina (2º turno do modo).
function processarAveRapinaContinuacao(eirStats, playerStats) {
  let dano = Math.floor(eirStats.atk * 0.5) + Math.floor(Math.random() * 10 - 5);
  dano = Math.max(1, dano);
  const isCrit = Math.random() < eirStats.critRate;
  if (isCrit) dano = Math.floor(dano * eirStats.critDmg);
  if (eirStats.passivaDupla.ativo) dano = Math.floor(dano * 2);

  playerStats.hp = Math.max(0, playerStats.hp - dano);

  eirStats.aveRapina.turnosRestantes--;
  let desativou = false;
  if (eirStats.aveRapina.turnosRestantes <= 0) {
    eirStats.aveRapina.ativo = false;
    // Reverte o buff de ATK concedido na ativação.
    eirStats.atk = Math.max(0, eirStats.atk - eirStats.aveRapina.atkBuffAplicado);
    eirStats.aveRapina.atkBuffAplicado = 0;
    desativou = true;
  }

  return {
    dano, isCrit, desativou,
    msg: `🦅 Ave de Rapina continua! ${isCrit ? '✨ CRÍTICO! ' : ''}${dano} de dano verdadeiro!`,
  };
}

// Reverte o buff do Grito Eiridiano quando o tempo acaba.
function tickGritoEiridianoEir(eirStats) {
  if (!eirStats.gritoBuff.ativo) return;
  eirStats.gritoBuff.turnosRestantes--;
  if (eirStats.gritoBuff.turnosRestantes <= 0) {
    eirStats.gritoBuff.ativo = false;
    eirStats.def = Math.max(0, eirStats.def - eirStats.gritoBuff.defBuffAplicado);
    eirStats.gritoBuff.defBuffAplicado = 0;
    eirStats.gritoBuff.reducaoDanoCritico = 0;
  }
}

// Conta os turnos do Modo Sono; ao acabar, ela acorda normalmente.
function tickModoSonoEir(eirStats) {
  if (!eirStats.modoSono.ativo) return;
  eirStats.modoSono.turnosRestantes--;
  if (eirStats.modoSono.turnosRestantes <= 0) {
    eirStats.modoSono.ativo = false;
  }
}

// ─────────────────────────────────────────────────────────────
//  4. REGENERAÇÃO DE "QUASE MORTE"
// ─────────────────────────────────────────────────────────────

function tickRegenEir(eirStats) {
  if (eirStats.regen.quebrada) return null;
  const pctAtual = eirStats.hp / eirStats.maxHp;
  if (pctAtual > eirStats.regen.limiarPct) return null;
  if (eirStats.hp <= 0) return null;

  const cura = Math.floor(eirStats.maxHp * eirStats.regen.curaPctPorTurno);
  eirStats.hp = Math.min(eirStats.maxHp, eirStats.hp + cura);

  return {
    cura,
    msg: `🩸 Eir está prestes a cair — seu corpo regenera ${cura} HP!`,
  };
}

// ─────────────────────────────────────────────────────────────
//  5. COOLDOWNS
// ─────────────────────────────────────────────────────────────

function reduzirCooldownsEir(eirStats) {
  if (eirStats.cooldowns.trovaoImperial > 0) eirStats.cooldowns.trovaoImperial--;
  if (eirStats.cooldowns.aveRapina > 0)      eirStats.cooldowns.aveRapina--;
  if (eirStats.cooldowns.gritoEiridiano > 0) eirStats.cooldowns.gritoEiridiano--;
}

// ─────────────────────────────────────────────────────────────
//  6. IA DE COMBATE
// ─────────────────────────────────────────────────────────────

function iaCombateEir(eirStats, playerStats) {
  // Dormindo: sem ação nesse turno (vulnerável, indefesa).
  if (eirStats.modoSono.ativo) {
    return { tipo: 'dormindo' };
  }

  // Continuação automática do ataque duplo da passiva.
  if (eirStats.passivaDupla.ativo) {
    return { tipo: 'ataque_duplo_automatico' };
  }

  // Continuação automática da Ave de Rapina (2º turno).
  if (eirStats.aveRapina.ativo) {
    return { tipo: 'ave_rapina_automatico' };
  }

  const hpPercentual = (eirStats.hp / eirStats.maxHp) * 100;
  const cooldownAtivos =
    eirStats.cooldowns.trovaoImperial > 0 &&
    eirStats.cooldowns.aveRapina > 0 &&
    eirStats.cooldowns.gritoEiridiano > 0;

  if (cooldownAtivos) return { tipo: 'ataque_normal' };

  // HP baixo e Grito disponível: prioriza se defender.
  if (hpPercentual < 40 && eirStats.cooldowns.gritoEiridiano === 0) {
    return { tipo: 'skill', skill: 'gritoEiridiano' };
  }

  const rand = Math.random();
  if (rand < 0.35 && eirStats.cooldowns.trovaoImperial === 0) {
    return { tipo: 'skill', skill: 'trovaoImperial' };
  } else if (rand < 0.65 && eirStats.cooldowns.aveRapina === 0) {
    return { tipo: 'skill', skill: 'aveRapina' };
  } else if (eirStats.cooldowns.gritoEiridiano === 0) {
    return { tipo: 'skill', skill: 'gritoEiridiano' };
  }

  return { tipo: 'ataque_normal' };
}

// ─────────────────────────────────────────────────────────────
//  7. INTEGRAÇÃO COM O SISTEMA DE BATALHA (ENEMY_AI + startBattle)
// ─────────────────────────────────────────────────────────────

(function _registerEirAI() {
  function _doRegisterAI() {
    if (typeof ENEMY_AI === 'undefined') {
      setTimeout(_doRegisterAI, 200);
      return;
    }

    const eirBattleState = {
      stats: JSON.parse(JSON.stringify(EIR_VALKIRIA)),
      usedSkills: [],
    };
    window._eirBattleState = eirBattleState; // exposto pro hook de doBattleAction (seção 8)

    ENEMY_AI['eir_valkiria'] = {
      name: 'Trovão Imperial',
      specialName: 'Habilidade de Eir',
      specialIcon: '⚡🦅',
      specialDesc: 'A Valkiria executa suas habilidades especiais.',

      init(e) {
        eirBattleState.stats = JSON.parse(JSON.stringify(EIR_VALKIRIA));
        eirBattleState.usedSkills = [];
        e.maxHp    = eirBattleState.stats.maxHp;
        e.hp       = eirBattleState.stats.hp;
        e.atk      = eirBattleState.stats.atk;
        e.def      = eirBattleState.stats.def;
        e.spd      = eirBattleState.stats.spd;
        e.critRate = eirBattleState.stats.critRate;
        e.critDmg  = eirBattleState.stats.critDmg;
      },

      special(bs, p, e) {
        if (!eirBattleState.stats.cooldowns) this.init(e);
        const st = eirBattleState.stats;

        reduzirCooldownsEir(st);
        tickGritoEiridianoEir(st);
        tickModoSonoEir(st);

        // Regeneração de quase-morte (some antes de decidir a ação).
        const regenResult = tickRegenEir(st);
        if (regenResult) {
          appendBattleLog(regenResult.msg, '#40ff80');
          showFloatingNumber('enemy', regenResult.cura, 'heal');
          e.hp = st.hp;
        }

        // Tentativa de ativar a passiva (só quando não está em nenhum modo especial).
        const passivaResult = tentarAtivarPassivaEir(st);
        if (passivaResult) {
          appendBattleLog(passivaResult.msg, '#ffcc00');
        }

        const decisao = iaCombateEir(st, p);

        if (decisao.tipo === 'dormindo') {
          appendBattleLog('😴 Eir está no Modo Sono — indefesa, mas sem atacar neste turno.', '#8080a0');
        } else if (decisao.tipo === 'ataque_duplo_automatico') {
          const r = processarAtaqueDuploEir(st, p);
          appendBattleLog(r.msg, '#ffcc00');
          r.ataques.forEach((atk) => {
            appendBattleLog(`  ⚔️ Golpe ${atk.numero}: ${atk.dano} dano${atk.isCrit ? ' ✨ CRÍTICO!' : ''}`, atk.isCrit ? '#ffff00' : '#ff8060');
            showFloatingNumber('hero', atk.dano, 'dmg');
          });
          if (r.entrouEmSono) appendBattleLog('😴 O frenesi acaba — Eir entra em Modo Sono!', '#8080a0');
        } else if (decisao.tipo === 'ave_rapina_automatico') {
          const r = processarAveRapinaContinuacao(st, p);
          appendBattleLog(r.msg, '#ff6ec7');
          showFloatingNumber('hero', r.dano, 'dmg');
          if (r.desativou) appendBattleLog('🦅 Ave de Rapina termina — ataque volta ao normal.', '#ff6ec7');
        } else if (decisao.tipo === 'skill') {
          const skill = EIR_SKILLS[decisao.skill];
          if (skill) {
            const resultado = skill.executar(st, p, bs);
            if (resultado.sucesso) {
              appendBattleLog(resultado.msg, '#ff8040');
              if (resultado.dano) showFloatingNumber('hero', resultado.dano, 'dmg');
              e.atk = st.atk;
              e.def = st.def;
              eirBattleState.usedSkills.push({ skill: decisao.skill, turno: bs.turnCount, dano: resultado.dano });
            } else {
              appendBattleLog(resultado.msg, '#ffaa00');
            }
          }
        } else if (decisao.tipo === 'ataque_normal') {
          const dmg = calcEnemyDmg(e, p, bs);
          appendBattleLog(`⚔️ ${e.name} ataca!`, '#ff6060');
          showFloatingNumber('hero', Math.floor(dmg), 'dmg');
        }

        e.hp = st.hp;
        updateHUD();
        updateBattleHUD();
      },
    };

    console.log('✨ EIR IA (redesign) registrada em ENEMY_AI');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegisterAI);
  } else {
    _doRegisterAI();
  }
})();

// Hook em startBattle: garante inicialização automática quando Eir entra em cena
(function _hookBattleStart() {
  function _doHook() {
    if (typeof startBattle !== 'function') {
      setTimeout(_doHook, 200);
      return;
    }

    const _originalStartBattle = window.startBattle;

    window.startBattle = function(enemy) {
      if (enemy && (enemy.id === 'eir_valkiria' || enemy.ai === 'eir_valkiria')) {
        Object.assign(enemy, {
          id: 'eir_valkiria',
          hp: EIR_VALKIRIA.hp,
          maxHp: EIR_VALKIRIA.maxHp,
          atk: EIR_VALKIRIA.atk,
          def: EIR_VALKIRIA.def,
          spd: EIR_VALKIRIA.spd,
          critRate: EIR_VALKIRIA.critRate,
          critDmg: EIR_VALKIRIA.critDmg,
        });
        if (typeof ENEMY_AI !== 'undefined' && ENEMY_AI['eir_valkiria']) {
          ENEMY_AI['eir_valkiria'].init(enemy);
        }
        console.log('🔥⚡ Eir inicializada para a batalha (redesign)!');
      }
      return _originalStartBattle.call(this, enemy);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doHook);
  } else {
    _doHook();
  }
})();

// ─────────────────────────────────────────────────────────────
//  8. HOOK EM doBattleAction — Modo Sono (imune a skill / vulnerável
//     a ataque normal) e quebra da Regeneração por golpe bruto pesado.
//
//  Por que isso é feito aqui, e não no palDinh.js: o resto do jogo
//  não tem um "multiplicador de dano recebido" configurável por
//  inimigo, então em vez de mexer no arquivo central (arriscado e
//  usado por todas as outras lutas), a gente deixa o golpe do
//  jogador acontecer normalmente e AJUSTA o HP da Eir logo depois,
//  comparando o HP dela antes/depois da ação — mesmo padrão que já
//  existe em palDinh.js pra outros efeitos (ex.: Selo do Limiar).
// ─────────────────────────────────────────────────────────────

(function _hookDoBattleAction() {
  function _doHook() {
    if (typeof doBattleAction !== 'function') {
      setTimeout(_doHook, 200);
      return;
    }

    const _originalDoBattleAction = window.doBattleAction;

    window.doBattleAction = function(action, skillIdx) {
      const bs = window.battleState;
      const isEirBattle = bs && bs.enemyData && bs.enemyData.id === 'eir_valkiria';
      const st = window._eirBattleState && window._eirBattleState.stats;

      if (!isEirBattle || !st) {
        return _originalDoBattleAction.call(this, action, skillIdx);
      }

      const hpAntes = bs.enemyHp;
      const result  = _originalDoBattleAction.call(this, action, skillIdx);
      const hpDepois = bs.enemyHp;
      const dmgCausado = hpAntes - hpDepois; // positivo = ela perdeu HP nesse golpe

      if (dmgCausado > 0 && (action === 'attack' || action === 'skill')) {

        // ── MODO SONO ──
        if (st.modoSono.ativo) {
          if (action === 'skill') {
            // Imune a skill: devolve o dano de skill inteiro.
            bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + dmgCausado);
            st.hp = bs.enemyHp;
            appendBattleLog('😴🛡️ Eir está em Modo Sono — imune a habilidades!', '#8080a0');
            updateHUD(); updateBattleHUD();
          } else if (action === 'attack') {
            // Vulnerável a ataque normal: aplica dano extra.
            const extra = Math.floor(dmgCausado * (st.modoSono.multDanoAtaqueNormal - 1));
            if (extra > 0) {
              bs.enemyHp = Math.max(0, bs.enemyHp - extra);
              st.hp = bs.enemyHp;
              appendBattleLog(`😴💥 Eir dormindo é vulnerável a ataques normais! +${extra} de dano extra!`, '#ff4040');
              showFloatingNumber('enemy', extra, 'crit');
              updateHUD(); updateBattleHUD();
            }
          }
        }

        // ── GRITO EIRIDIANO: reduz dano crítico recebido ──
        else if (st.gritoBuff.ativo && action === 'attack') {
          const hist = bs.playerActionHistory && bs.playerActionHistory[bs.playerActionHistory.length - 1];
          if (hist && hist.isCrit) {
            const reducao = Math.floor(dmgCausado * st.gritoBuff.reducaoDanoCritico);
            if (reducao > 0) {
              bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + reducao);
              st.hp = bs.enemyHp;
              appendBattleLog(`🛡️✨ Grito Eiridiano absorve parte do dano crítico! -${reducao} de dano sofrido!`, '#a0c0ff');
              updateHUD(); updateBattleHUD();
            }
          }
        }

        // ── QUEBRA DA REGENERAÇÃO: golpe bruto (ataque normal) pesado ──
        if (action === 'attack' && !st.regen.quebrada) {
          const hpRestanteAposAjustes = bs.enemyHp;
          const golpeReal = hpAntes - hpRestanteAposAjustes;
          if (golpeReal >= st.regen.quebraPctHitUnico * st.maxHp) {
            st.regen.quebrada = true;
            appendBattleLog('💢 Golpe brutal! A regeneração de Eir foi quebrada — ela não vai mais se curar sozinha nesta luta.', '#ff2020');
          }
        }

        st.hp = bs.enemyHp;
      }

      return result;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doHook);
  } else {
    _doHook();
  }
})();

// ─────────────────────────────────────────────────────────────
//  9. EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────

window.EIR_VALKIRIA              = EIR_VALKIRIA;
window.EIR_SKILLS                = EIR_SKILLS;
window.tentarAtivarPassivaEir    = tentarAtivarPassivaEir;
window.processarAtaqueDuploEir   = processarAtaqueDuploEir;
window.processarAveRapinaContinuacao = processarAveRapinaContinuacao;
window.tickGritoEiridianoEir     = tickGritoEiridianoEir;
window.tickModoSonoEir           = tickModoSonoEir;
window.tickRegenEir              = tickRegenEir;
window.reduzirCooldownsEir       = reduzirCooldownsEir;
window.iaCombateEir              = iaCombateEir;

console.log('✨ EIR_VALKIRIA.JS (redesign) carregado com sucesso!');

// ═══════════════════════════════════════════════════════════
//  FIM: eir_valkiria.js
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  MOTOR DE BATALHA — HI-NO-KAGUTSUCHI
//  Mesmo molde do motor da Eir acima: 1 IA de decisão, 1 registro
//  em ENEMY_AI, 1 hook em startBattle (pra reiniciar os stats toda
//  vez que a luta começa) e 1 hook em runEnemyTurn (pra aplicar a
//  passiva Ember + a regeneração por turno em TODO turno dele, e
//  não só nos turnos em que ele usa uma skill — diferente da Eir,
//  cuja passiva só é checada dentro de special()).
// ═══════════════════════════════════════════════════════════

// ── QUEIMADURA POR TURNO ──
// Enquanto a temperatura estiver acima do limiar (50°C), todo turno do
// chefe o calor da sala queima o jogador (% do HP máx., ignora DEF).
// Retorna { dano, msg } ou null se a sala ainda não está quente o bastante.
function hikQueimaduraPorTurno(hikStats, playerRuntime) {
  if (!hikStats || !playerRuntime) return null;
  const temp = hikStats.temperatura.atual;
  if (temp <= hikStats.temperatura.limiarQueimadura) return null;
  const dano = Math.max(1, Math.floor((playerRuntime.maxHp || 100) * HIK_QUEIMADURA_PCT_TURNO));
  playerRuntime.hp = Math.max(0, (playerRuntime.hp || 0) - dano);
  return { dano, msg: `🌡️ O calor da sala (${Math.round(temp)}°C) te queima: -${dano} HP!` };
}
window.hikQueimaduraPorTurno = hikQueimaduraPorTurno;

// ── IA DE DECISÃO ──
// AJUSTE: pesos não especificados — usei o mesmo espírito do teste
// de sprites que veio antes (45% de chance pro Purgatório), com
// Elevação de Temperatura como segunda prioridade e Olho de Eir
// (buff, não dano direto) mais raro. O resto cai em ataque normal.
function hikCombateIA(hikStats) {
  const rand = Math.random();
  if (rand < 0.45) return 'purgatorio';
  if (rand < 0.75) return 'elevacaoTemperatura';
  if (rand < 0.90) return 'olhoDeEir';
  return 'ataque_normal';
}
window.hikCombateIA = hikCombateIA;

(function _registerHikAI() {
  function _doRegisterAI() {
    if (typeof ENEMY_AI === 'undefined') {
      setTimeout(_doRegisterAI, 200);
      return;
    }

    const hikBattleState = {
      stats: JSON.parse(JSON.stringify(HI_NO_KAGUTSUCHI)),
      emberStacks: 0,
    };
    window._hikBattleState = hikBattleState; // exposto pros hooks de startBattle/runEnemyTurn/doBattleAction abaixo

    ENEMY_AI['hi_no_kagutsuchi'] = {
      name: 'Hi-no-Kagutsuchi',
      specialName: 'Fúria do Oni',
      specialIcon: '🔥👹',
      specialDesc: 'O Oni das Chamas desencadeia uma de suas habilidades de fogo.',

      init(e) {
        hikBattleState.stats = JSON.parse(JSON.stringify(HI_NO_KAGUTSUCHI));
        hikBattleState.emberStacks = 0;

        // ── Vantagem escolhida na cena da escolha (storyNode_inazami_hik_escolha_vantagem) ──
        // 'defesa'  → reduz a DEF crua dele em 15% pra luta inteira (aplicado
        //             direto nos stats de batalha, então não precisa reverter nada).
        // 'ataque'  → guardado aqui e aplicado como dano extra em cada golpe
        //             seu no hook de doBattleAction mais abaixo (não mexe no
        //             G.player.atk, então também não precisa reverter nada).
        // AJUSTE: valores (15%) não especificados.
        const vantagem = G.inazami && G.inazami.hikVantagemEscolhida;
        hikBattleState.vantagemAtaque = (vantagem === 'ataque');
        if (vantagem === 'defesa') {
          hikBattleState.stats.def = Math.floor(hikBattleState.stats.def * 0.85);
        }

        e.maxHp = hikBattleState.stats.maxHp;
        e.hp    = hikBattleState.stats.hp;
        e.atk   = hikBattleState.stats.atk;
        e.def   = hikBattleState.stats.def;

        if (typeof _hikTermometroCriar === 'function') _hikTermometroCriar();
        if (typeof _hikTermometroAtualizar === 'function') _hikTermometroAtualizar(hikBattleState.stats.temperatura.atual);
      },

      // Rede de segurança: o motor (palDinh.js) chama special() dentro de um
      // setTimeout e só devolve o turno ao jogador DEPOIS dele. Qualquer erro
      // lançado aqui deixava a luta parada em "INIMIGO AGE!" pra sempre.
      // Agora o erro vai pro console e o turno termina normalmente.
      special(bs, p, e) {
        try {
          this._specialInner(bs, p, e);
        } catch (err) {
          console.error('[HIK] erro no turno do chefe:', err);
          try { appendBattleLog(`🔥 ${e.name} hesita por um instante...`, '#ff8040'); } catch (_) {}
          try { updateHUD(); updateBattleHUD(); } catch (_) {}
        }
      },

      _specialInner(bs, p, e) {
        if (!hikBattleState.stats || !hikBattleState.stats.temperatura) this.init(e);
        const st = hikBattleState.stats;

        // ── Queimadura do calor da sala: todo turno dele, acima de 50°C ──
        const queimadura = hikQueimaduraPorTurno(st, p);
        if (queimadura) {
          appendBattleLog(queimadura.msg, '#ff6b40');
          showFloatingNumber('hero', queimadura.dano, 'dmg');
          if (p.hp <= 0) {
            // Morreu pelo calor — o motor (runEnemyTurn) fecha a derrota após special().
            e.hp = st.hp;
            updateHUD();
            updateBattleHUD();
            return;
          }
        }

        const decisao = hikCombateIA(st);

        if (decisao === 'ataque_normal') {
          if (typeof _hikAtaqueNormalFX === 'function') _hikAtaqueNormalFX();
          const danoBase = Math.floor(calcEnemyDmg(e, p, bs));
          // Dano de Fogo também reforça o ataque normal (fração configurável).
          const danoFogoExtra = Math.floor(danoBase * st.danoFogo.atual * HIK_FOGO_ATAQUE_NORMAL_FATOR);
          const dmg = danoBase + danoFogoExtra;
          appendBattleLog(`🔥 ${e.name} ataca com as garras em chamas! ${danoBase} de dano +${danoFogoExtra} de Dano de Fogo.`, '#ff6b40');
          showFloatingNumber('hero', dmg, 'dmg');
          applyDmgToPlayer(dmg, bs, p);
        } else {
          // Purgatório já toca a própria animação de conjuração dentro do
          // skill.executar() (via _hikPurgatorioCastFX); Elevação de
          // Temperatura e Olho de Eir usam a pose de ataque genérica.
          if (decisao !== 'purgatorio' && typeof _hikAtaqueNormalFX === 'function') {
            _hikAtaqueNormalFX();
          }
          const skill = HIK_SKILLS[decisao];
          if (skill) {
            const resultado = skill.executar(st, p);
            if (resultado && resultado.sucesso) {
              appendBattleLog(resultado.msg, '#ff8040');
              if (resultado.danoTotal)      showFloatingNumber('hero', resultado.danoTotal, 'dmg');
              if (resultado.danoQueimadura) showFloatingNumber('hero', resultado.danoQueimadura, 'dmg');
              e.atk = st.atk;
              e.def = st.def;
            }
          }
        }

        e.hp = st.hp;
        updateHUD();
        updateBattleHUD();
      },
    };

    console.log('🔥 HI-NO-KAGUTSUCHI IA registrada em ENEMY_AI');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegisterAI);
  } else {
    _doRegisterAI();
  }
})();

// Hook em startBattle: garante inicialização automática quando o
// Hi-no-Kagutsuchi entra em cena (mesmo padrão do hook da Eir acima).
(function _hookHikStartBattle() {
  function _doHook() {
    if (typeof startBattle !== 'function') {
      setTimeout(_doHook, 200);
      return;
    }

    const _originalStartBattle = window.startBattle;

    window.startBattle = function(enemy) {
      if (enemy && (enemy.id === 'hi_no_kagutsuchi' || enemy.ai === 'hi_no_kagutsuchi')) {
        if (typeof ENEMY_AI !== 'undefined' && ENEMY_AI['hi_no_kagutsuchi']) {
          ENEMY_AI['hi_no_kagutsuchi'].init(enemy);
        }
        Object.assign(enemy, { id: 'hi_no_kagutsuchi' });
        console.log('🔥👹 Hi-no-Kagutsuchi inicializado para a batalha real!');
      }
      return _originalStartBattle.call(this, enemy);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doHook);
  } else {
    _doHook();
  }
})();

// ── Anti-travamento do turno do Hi-no-Kagutsuchi ──────────────────
// Se o turno do chefe começou e, depois de ~8s, a fase continua não
// sendo a do jogador E nenhuma linha nova apareceu no log da batalha
// (ou seja, nada está acontecendo de fato), devolve o turno ao jogador
// em vez de deixar a luta presa em "INIMIGO AGE!".
(function _hikRastrearLog() {
  function _inst() {
    if (typeof appendBattleLog !== 'function') { setTimeout(_inst, 200); return; }
    if (window._hikOrigAppendBattleLog) return;
    window._hikOrigAppendBattleLog = window.appendBattleLog;
    window.appendBattleLog = function () {
      window._hikUltimoLog = Date.now();
      return window._hikOrigAppendBattleLog.apply(this, arguments);
    };
  }
  _inst();
})();

function _hikArmarWatchdogTurno(bs) {
  const token = (bs._hikWatchToken = (bs._hikWatchToken || 0) + 1);
  const checar = () => {
    try {
      if (bs._hikWatchToken !== token) return;                 // começou outro turno do chefe
      if (bs._battleEnded || window.battleState !== bs) return; // batalha acabou
      if (bs.phase === 'player') return;                       // turno voltou ao jogador normalmente
      if (!G.player || G.player.hp <= 0 || bs.enemyHp <= 0) return;
      if (Date.now() - (window._hikUltimoLog || 0) < 6000) {   // ainda há atividade — confere de novo daqui a pouco
        setTimeout(checar, 3000);
        return;
      }
      console.warn('[HIK] turno do chefe travado — devolvendo a vez ao jogador');
      appendBattleLog('🔥 O Oni hesita — a vez volta pra você.', '#ff9e6b');
      bs.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      updateBattleTurnIndicator('player');
      updateHUD();
      updateBattleHUD();
    } catch (err) {
      console.error('[HIK watchdog]', err);
    }
  };
  setTimeout(checar, 8000);
}

// Hook em runEnemyTurn: aplica a passiva Ember + a regeneração por
// turno em TODO turno em que o Hi-no-Kagutsuchi age — inclusive nos
// turnos de ataque normal, que não passam por ai.special(). Por isso
// não dá pra colocar essa lógica dentro de special() como foi feito
// com a Eir (a passiva dela só é checada por chance, dentro dali).
(function _hookHikRunEnemyTurn() {
  function _doHook() {
    if (typeof runEnemyTurn !== 'function') {
      setTimeout(_doHook, 200);
      return;
    }

    const _originalRunEnemyTurn = window.runEnemyTurn;

    window.runEnemyTurn = function(bs, p, e, skipTurn) {
      if (e && e.id === 'hi_no_kagutsuchi') {
        // Batalha já encerrada → o chefe não age mais (evita dano pós-vitória).
        if (bs._battleEnded) return;
        // Chefe já está em 0 HP (ex.: morreu pelo dano extra do bônus de ATK,
        // que é aplicado depois da checagem de morte do motor) → fecha a vitória.
        if (bs.enemyHp <= 0) {
          setTimeout(() => endBattle(true, false), battleDelay(200));
          return;
        }
        _hikArmarWatchdogTurno(bs);
      }
      if (e && e.id === 'hi_no_kagutsuchi' && !bs.enemyStunned && !skipTurn) {
        const st = window._hikBattleState && window._hikBattleState.stats;
        if (st) {
          const regenResult = hikTickRegenPorTurno(st);
          if (regenResult) {
            appendBattleLog(regenResult.msg, '#ff9e6b');
            showFloatingNumber('enemy', regenResult.curado, 'heal');
            e.hp = st.hp;
            bs.enemyHp = st.hp;
          }

          const emberResult = hikAplicarPassivaEmber(window._hikBattleState);
          if (emberResult) {
            appendBattleLog(emberResult.msg, '#ff7a2e');
          }

          updateHUD();
          updateBattleHUD();
        }
      }
      return _originalRunEnemyTurn.apply(this, arguments);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doHook);
  } else {
    _doHook();
  }
})();

// Hook em doBattleAction: aplica os +15% de dano extra da vantagem
// "Bônus de ATK" (ver escolha_vantagem/init acima) — mesma técnica
// de comparar o HP do inimigo antes/depois usada no hook da Eir.
(function _hookHikDoBattleAction() {
  function _doHook() {
    if (typeof doBattleAction !== 'function') {
      setTimeout(_doHook, 200);
      return;
    }

    const _originalDoBattleAction = window.doBattleAction;

    window.doBattleAction = function(action, skillIdx) {
      const bs = window.battleState;
      const isHikBattle = bs && bs.enemyData && bs.enemyData.id === 'hi_no_kagutsuchi';
      const hikSt = window._hikBattleState;

      if (!isHikBattle || !hikSt || !hikSt.vantagemAtaque) {
        return _originalDoBattleAction.call(this, action, skillIdx);
      }

      const hpAntes = bs.enemyHp;
      const result  = _originalDoBattleAction.call(this, action, skillIdx);
      const hpDepois = bs.enemyHp;
      const dmgCausado = hpAntes - hpDepois;

      if (dmgCausado > 0 && (action === 'attack' || action === 'skill')) {
        const extra = Math.floor(dmgCausado * 0.15); // AJUSTE: valor não especificado
        if (extra > 0) {
          bs.enemyHp = Math.max(0, bs.enemyHp - extra);
          if (hikSt.stats) hikSt.stats.hp = bs.enemyHp;
          appendBattleLog(`⚔️✨ O bônus de ATK que você aceitou rende +${extra} de dano extra!`, '#ffcc60');
          updateHUD(); updateBattleHUD();
          // O motor já checou a morte ANTES deste dano extra — se ele zerou o HP
          // do chefe, é aqui que a vitória precisa ser disparada (endBattle tem
          // guarda interna contra chamada dupla).
          if (bs.enemyHp <= 0) {
            setTimeout(() => { try { endBattle(true, false); } catch (err) { console.error('[HIK] endBattle:', err); } }, battleDelay(300));
          }
        }
      }

      return result;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doHook);
  } else {
    _doHook();
  }
})();

// ═══════════════════════════════════════════════════════════
//  AMULETO DO OLHO DE EIR — MECÂNICA DE COMBATE
//
//  Funciona em QUALQUER luta (não só contra o Hi-no-Kagutsuchi),
//  desde que o jogador tenha o item 'amuleto_hik_olho_de_eir'
//  equipado (equipSlot 'acessorio'). Por turno, X% de chance do
//  olho "abrir": sorteia um valor único de 0% a 35% e aplica os
//  dois efeitos juntos, por 2 turnos:
//    • Reduz a DEF do inimigo nesse %
//    • Aumenta o dano do jogador nesse % — implementado como bônus
//      TEMPORÁRIO em p.atk E p.mag ao mesmo tempo (e não como um
//      multiplicador de dano à parte), pra funcionar igual pra
//      qualquer classe sem precisar mexer em cada fórmula de dano
//      espalhada pelo jogo (físico usa atk, Mago usa mag — reforçar
//      os dois de uma vez cobre ambos, e a stat que a classe não usa
//      simplesmente fica parada sem efeito nenhum).
//  Enquanto já estiver aberto, novos procs não fazem nada (evita
//  empilhar). Reverte sozinho ao fim dos 2 turnos, com log próprio.
//
//  Hook: tickEnemyStatusEffects(bs, e) — mesma função que já processa
//  os outros status de turno do inimigo (veneno, queimadura, etc.),
//  então o proc é checado exatamente 1x por rodada, no mesmo ponto.
// ═══════════════════════════════════════════════════════════
(function _setupAmuletoOlhoDeEir() {
  const CHANCE_PROC_POR_TURNO = 0.20; // AJUSTE: 20% por turno
  const VALOR_MIN = 0.0;
  const VALOR_MAX = 0.35;
  const DURACAO_TURNOS = 2;

  function _temAmuletoEquipado() {
    const p = (typeof G !== 'undefined') ? G.player : null;
    return !!(p && Array.isArray(p.inventory) && p.inventory.some(
      i => i.id === 'amuleto_hik_olho_de_eir' && i.equipped
    ));
  }

  function _olhoEirRemoverFX() {
    if (window._olhoEirObs) { window._olhoEirObs.disconnect(); window._olhoEirObs = null; }
    const el    = document.getElementById('amuleto-olho-eir-fx');
    const label = document.getElementById('amuleto-olho-eir-label');
    if (el)    el.remove();
    if (label) label.remove();
  }

  function _olhoEirMostrarFX(valorPct) {
    const host = document.getElementById('bat-enemy-icon');
    if (!host) return;
    _olhoEirRemoverFX();

    const prevPosition = host.style.position;
    if (!prevPosition || prevPosition === 'static') host.style.position = 'relative';

    const el = document.createElement('div');
    el.id = 'amuleto-olho-eir-fx';
    el.style.cssText = `
      position:absolute; top:-6%; right:-8%; width:15%; min-width:32px; max-width:48px;
      aspect-ratio:1/1;
      background-image:url('Imagens/teste/OlhoEir.png');
      background-size:200% 200%; background-position:100% 100%;
      background-repeat:no-repeat;
      filter:drop-shadow(0 0 8px rgba(255,140,60,0.85));
      pointer-events:none; z-index:23;
    `;
    const label = document.createElement('div');
    label.id = 'amuleto-olho-eir-label';
    label.textContent = `👁️ -${Math.round(valorPct * 100)}%`;
    label.style.cssText = `
      position:absolute; top:-18%; right:-10%; color:#ffcf8a; font-size:0.65rem;
      font-weight:bold; text-shadow:0 0 4px #000, 0 0 2px #000;
      pointer-events:none; z-index:24; white-space:nowrap;
    `;
    host.appendChild(el);
    host.appendChild(label);

    // FIX: o palDinh.js (_swapEnemyPoseFade) faz el.innerHTML = ... no
    // #bat-enemy-icon ~150ms depois de cada hit/ataque, o que APAGAVA o
    // olho e o texto. Este observer recoloca os dois enquanto o olho
    // estiver aberto.
    if (window._olhoEirObs) { window._olhoEirObs.disconnect(); window._olhoEirObs = null; }
    window._olhoEirObs = new MutationObserver(() => {
      if (!host.contains(el))    host.appendChild(el);
      if (!host.contains(label)) host.appendChild(label);
    });
    window._olhoEirObs.observe(host, { childList: true });
  }

  function _processarAmuletoOlhoDeEir(bs, e) {
    if (!bs || !e) return;
    const p = G.player;

    if (bs._olhoEirAtivo) {
      bs._olhoEirTurnos--;
      if (bs._olhoEirTurnos <= 0) {
        // Fecha o olho — reverte exatamente os deltas aplicados na abertura.
        e.def = Math.max(0, (e.def || 0) + (bs._olhoEirDefDelta || 0));
        p.atk = Math.max(0, (p.atk || 0) - (bs._olhoEirAtkDelta || 0));
        p.mag = Math.max(0, (p.mag || 0) - (bs._olhoEirMagDelta || 0));
        bs._olhoEirAtivo    = false;
        bs._olhoEirDefDelta = 0;
        bs._olhoEirAtkDelta = 0;
        bs._olhoEirMagDelta = 0;
        _olhoEirRemoverFX();
        if (typeof appendBattleLog === 'function') {
          appendBattleLog('👁️ O Olho de Eir se fecha. Efeitos encerrados.', '#c08040');
        }
        if (typeof updateHUD === 'function') updateHUD();
      }
      return; // já processou este turno — não tenta abrir de novo enquanto ativo
    }

    if (!_temAmuletoEquipado()) return;

    if (Math.random() < CHANCE_PROC_POR_TURNO) {
      const valor = VALOR_MIN + Math.random() * (VALOR_MAX - VALOR_MIN);

      const defDelta = Math.round((e.def || 0) * valor);
      const atkDelta = Math.round((p.atk || 0) * valor);
      const magDelta = Math.round((p.mag || 0) * valor);

      e.def = Math.max(0, (e.def || 0) - defDelta);
      p.atk = (p.atk || 0) + atkDelta;
      p.mag = (p.mag || 0) + magDelta;

      bs._olhoEirAtivo    = true;
      bs._olhoEirTurnos   = DURACAO_TURNOS;
      bs._olhoEirDefDelta = defDelta;
      bs._olhoEirAtkDelta = atkDelta;
      bs._olhoEirMagDelta = magDelta;

      const pct = Math.round(valor * 100);
      if (typeof appendBattleLog === 'function') {
        appendBattleLog(`👁️ O Olho de Eir se abre! DEF do inimigo -${pct}% e seu dano +${pct}% por ${DURACAO_TURNOS} turnos!`, '#ffb060');
      }
      if (typeof showFloatingNumber === 'function') {
        showFloatingNumber('enemy', `👁️ -${pct}%`, 'status');
      }
      _olhoEirMostrarFX(valor);
      if (typeof updateHUD === 'function') updateHUD();
    }
  }

  // ── Hook em tickEnemyStatusEffects (já roda 1x por rodada) ──
  (function _hookTick() {
    if (typeof window.tickEnemyStatusEffects !== 'function') {
      setTimeout(_hookTick, 200);
      return;
    }
    const _tickOriginal = window.tickEnemyStatusEffects;
    window.tickEnemyStatusEffects = function (bs, e) {
      _tickOriginal.apply(this, arguments);
      _processarAmuletoOlhoDeEir(bs, e);
    };
  })();

  // FIX: se a luta terminar (vitória, fuga ou derrota) com o olho aberto, o
  // bônus de ATK/MAG ficava no jogador pra sempre e acumulava a cada luta
  // (o battleState é descartado e os deltas se perdiam). Reverte antes do
  // endBattle original rodar.
  function _olhoEirReverterNoFim() {
    try {
      const bs = (typeof battleState !== 'undefined') ? battleState : null;
      if (!bs || !bs._olhoEirAtivo) return;
      const p = G.player;
      p.atk = Math.max(0, (p.atk || 0) - (bs._olhoEirAtkDelta || 0));
      p.mag = Math.max(0, (p.mag || 0) - (bs._olhoEirMagDelta || 0));
      bs._olhoEirAtivo    = false;
      bs._olhoEirDefDelta = 0;
      bs._olhoEirAtkDelta = 0;
      bs._olhoEirMagDelta = 0;
      _olhoEirRemoverFX();
    } catch (_) {}
  }
  (function _hookEndBattle() {
    if (typeof window.endBattle !== 'function') {
      setTimeout(_hookEndBattle, 200);
      return;
    }
    const _endBattleOriginal = window.endBattle;
    window.endBattle = function () {
      _olhoEirReverterNoFim();
      return _endBattleOriginal.apply(this, arguments);
    };
  })();

  // ── Limpeza defensiva do FX se a luta terminar com o olho aberto ──
  (function _hookHideEnemy() {
    if (typeof window.hideEnemy !== 'function') {
      setTimeout(_hookHideEnemy, 200);
      return;
    }
    const _hideEnemyOriginal = window.hideEnemy;
    window.hideEnemy = function () {
      _olhoEirRemoverFX();
      return _hideEnemyOriginal.apply(this, arguments);
    };
  })();
})();

console.log('🔥 HI-NO-KAGUTSUCHI battle engine carregado com sucesso!');

// ═══════════════════════════════════════════════════════════
//  AMULETO COMPLETO DE INAZAMI — ÚNICO
//
//  Problema: morrer no chefe (Hi-no-Kagutsuchi) reseta o progresso da
//  masmorra (ver inazamiResetPinsProgress), e cada nova rodada entregava
//  os 3 fragmentos de novo → o jogador fundia outro Amuleto Completo, e
//  outro, e outro (Qtd: 3, 4...).
//
//  Agora, depois que o jogador JÁ TEM o Amuleto Completo:
//    • os fragmentos não entram mais no inventário (nem os que sobraram);
//    • o Amuleto Completo nunca passa de 1 (também corrige saves antigos
//      com Qtd > 1);
//    • a masmorra segue pelo fluxo "portão já aberto" (portaoAberto).
//  Não mexe no palDinh.js: embrulha addItem() e updateHUD().
// ═══════════════════════════════════════════════════════════
(function _inazamiAmuletoUnico() {
  const COMPLETO = 'amuleto_completo_inazami';
  const FRAGS    = ['amuleto_quebrado_inazami', 'amuleto_fragmento_eir', 'fragmento_amuleto_final'];

  function _inv() { return (window.G && G.player && G.player.inventory) || []; }

  // true quando o Hi-no-Kagutsuchi já foi derrotado em algum momento.
  // Usa sinais que NÃO são apagados pelo reset de progresso da masmorra
  // (inazamiLibertada, acompanhando) e os itens únicos que só a vitória
  // entrega — assim funciona também em saves que já saíram da masmorra
  // antes de a conclusão ser gravada.
  window.inazamiBossDerrotado = function () {
    try {
      const gi = (window.G && G.inazami) || {};
      if (gi.hiNoKagutsuchiDerrotado || gi.dungeonInazamiCompleta || gi.inazamiLibertada || gi.acompanhando) return true;
      return _inv().some(i => i && (i.id === 'alma_das_chamas' || i.id === 'selo_hi_no_kagutsuchi' || i.id === 'bencao_inazami'));
    } catch (_) { return false; }
  };

  // true quando o jogador já fundiu o amuleto OU já venceu o boss final
  // (nos dois casos os fragmentos não devem mais cair).
  window.inazamiAmuletoJaFeito = function () {
    try {
      if (_inv().some(i => i && i.id === COMPLETO)) return true;
      if (window.G && G.inazami && G.inazami.amuletoFundido) return true;
      return window.inazamiBossDerrotado();
    } catch (_) { return false; }
  };

  function _qtdCampo(i) {
    for (const k of ['qty', 'count', 'quantity']) {
      if (typeof i[k] === 'number') return k;
    }
    return null;
  }

  // Arruma o inventário: 1 amuleto só, sem fragmentos sobrando
  function _varrer() {
    try {
      const inv = _inv();
      if (!inv.length) return;
      const temCompleto = inv.some(i => i && i.id === COMPLETO);
      const bossFeito   = window.inazamiBossDerrotado();
      if (!temCompleto && !bossFeito) return;

      G.inazami = G.inazami || {};
      if (temCompleto) G.inazami.amuletoFundido = true;
      if (bossFeito) {
        // Grava a conclusão (corrige saves que já resetaram): o mapa mostra o
        // chefe como derrotado e o reset de progresso para de apagar a vitória.
        G.inazami.hiNoKagutsuchiDerrotado = true;
        G.inazami.dungeonInazamiCompleta  = true;
        G.inazami.amuletoFundido          = true;
      }

      if (typeof ITEM_DB !== 'undefined' && ITEM_DB[COMPLETO]) ITEM_DB[COMPLETO].unique = true;

      let visto = false;
      for (let n = inv.length - 1; n >= 0; n--) {
        const it = inv[n];
        if (!it) continue;
        if (FRAGS.includes(it.id)) { inv.splice(n, 1); continue; }   // fragmento sobrando
      }
      for (let n = 0; n < inv.length; n++) {
        const it = inv[n];
        if (!it || it.id !== COMPLETO) continue;
        if (visto) { inv.splice(n, 1); n--; continue; }               // entrada duplicada
        visto = true;
        const k = _qtdCampo(it);
        if (k && it[k] > 1) it[k] = 1;                                // Qtd: 2, 3... → 1
      }
    } catch (e) { console.error('[amuleto_unico]', e); }
  }
  window.inazamiAmuletoVarrer = _varrer;

  function _hookAddItem() {
    if (typeof window.addItem !== 'function') { setTimeout(_hookAddItem, 200); return; }
    if (window.addItem._amuletoUnico) return;
    const _orig = window.addItem;
    window.addItem = function (item) {
      try {
        const id = (typeof item === 'string') ? item : (item && item.id);
        if ((FRAGS.includes(id) || id === COMPLETO) && window.inazamiAmuletoJaFeito()) {
          return false; // já tem o amuleto: não entra de novo
        }
      } catch (_) {}
      const r = _orig.apply(this, arguments);
      try { if (item && (item.id === COMPLETO || item === COMPLETO)) _varrer(); } catch (_) {}
      return r;
    };
    window.addItem._amuletoUnico = true;
  }

  function _hookUpdateHUD() {
    if (typeof window.updateHUD !== 'function') { setTimeout(_hookUpdateHUD, 200); return; }
    if (window.updateHUD._amuletoUnico) return;
    const _orig = window.updateHUD;
    window.updateHUD = function () {
      _varrer();
      return _orig.apply(this, arguments);
    };
    window.updateHUD._amuletoUnico = true;
    _varrer(); // corrige o save atual já ao carregar
  }

  _hookAddItem();
  _hookUpdateHUD();
})();

// ═══════════════════════════════════════════════════════════
//  ÍCONES DOS ITENS DAS MASMORRAS (Inazami / Kappa)
//  O imgSrc fica gravado no item (e portanto no save), então itens que já
//  estavam na bolsa/armazém com o caminho antigo (ou sem imagem) são
//  corrigidos por id toda vez que a grade da bolsa é redesenhada.
// ═══════════════════════════════════════════════════════════
(function _inazamiIconesItens() {
  const DIR = 'Imagens/icones/materiais/';
  const ICONES = {
    hematoide:             DIR + 'hematoidFogg.png',
    nucleo_hik:            DIR + 'nucleohi-no.png',
    selo_hi_no_kagutsuchi: DIR + 'selohinoga.png',
    bencao_inazami:        DIR + 'bencainzami.png',
    fragmento_de_sombra:   DIR + 'fragsombr.png',   // drop do Kappa (id diferente do 'fragmento_sombra' do ITEM_DB)
    escama_sereia:         DIR + 'serei342.png',
    miniatura_regra:       'Imagens/icones/regra.png',
    escama_ignea:               'Imagens/icones/ignea463.png',
    brasa_fragmentada_estatuas: 'Imagens/icones/brsafragke.png',
    miniatura_sonho:       'Imagens/icones/sonh.png',
    miniatura_ordem:       'Imagens/icones/ordn.png',
  };
  // Fallback por NOME (caso o id do item seja diferente do esperado, ex: drops do Kappa)
  const _norm = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const POR_NOME = {
    'fragmento de sombra':          DIR + 'fragsombr.png',
    'escama da sereia':             DIR + 'serei342.png',
    'escama de sereia':             DIR + 'serei342.png',
    'hematoide':                    DIR + 'hematoidFogg.png',
    'nucleo de hi-no-kagutsuchi':   DIR + 'nucleohi-no.png',
    'bencao de inazami':            DIR + 'bencainzami.png',
    'miniatura da regra':           'Imagens/icones/regra.png',
    'escama ignea':                 'Imagens/icones/ignea463.png',
    'brasa fragmentada':            'Imagens/icones/brsafragke.png',
  };
  function _aplicar() {
    try {
      const listas = [];
      if (typeof G !== 'undefined' && G && G.player && Array.isArray(G.player.inventory)) listas.push(G.player.inventory);
      if (typeof G !== 'undefined' && G && G.armazem && Array.isArray(G.armazem.itens))  listas.push(G.armazem.itens);
      listas.forEach(l => l.forEach(it => { if (!it) return; const src = ICONES[it.id] || POR_NOME[_norm(it.name)]; if (src) it.imgSrc = src; }));
    } catch (_) {}
  }
  // A bolsa de verdade é desenhada por buildBagItems()/buildBagItemsGrade() (bag.js);
  // buildInventoryGrid() é a grade antiga. Embrulha todas (e a abertura do armazém)
  // pra corrigir o imgSrc ANTES de qualquer tela de itens ser desenhada.
  ['buildInventoryGrid', 'buildBagItems', 'buildBagItemsGrade', 'armazemAbrir', 'armazemUsarBolsa'].forEach(function (nome) {
    (function _hook() {
      if (typeof window[nome] !== 'function') { setTimeout(_hook, 200); return; }
      const orig = window[nome];
      if (orig._inazamiIcones) return;
      const novo = function () { _aplicar(); return orig.apply(this, arguments); };
      novo._inazamiIcones = true;
      window[nome] = novo;
      _aplicar();
    })();
  });
})();
