// ─────────────────────────────────────────────────────────────
//  FINAL DE INAZAMI — entrega do amuleto, selamento e despedida
//
//  Fluxo (depois de derrotar o Hi-no-Kagutsuchi e recolher o boneco):
//    1) o jogador ENTREGA o Amuleto Completo → Inazami agradece
//    2) cutscene h1 → h5 (Imagens/inazami masmorra/): ela sela o Oni
//       enfraquecido; sem corpo físico, vira energia (h5)
//    3) despedida: ela se oferece pra acompanhar → Bênção de Inazami
//       (redução de dano passiva)
//
//  Cada etapa grava uma flag em G.inazami (amuletoEntregue,
//  selamentoConcluido, acompanhando), então repetir a conversa
//  ("Falar com Inazami") retoma de onde parou — nunca refaz a
//  entrega nem entrega a Bênção duas vezes.
//
//  Carregar DEPOIS de palDinh.js e inazami_completo.js.
// ─────────────────────────────────────────────────────────────

const ITEM_BENCAO_INAZAMI = {
  id:      'bencao_inazami',
  name:    'Bênção de Inazami',
  icon:    '🔥',
  type:    'chave', // efeito passivo, não é equipável — igual pedra_sacerdotisa_negra, ativo mesmo fora do slot
  unique:  true,
  weight:  0,
  desc:    'O que restou do selo, agora ligado a você. Reduz uma pequena parte de todo dano recebido — crítico ou não.',
};
window.ITEM_BENCAO_INAZAMI = ITEM_BENCAO_INAZAMI;

// Chance de redução de dano concedida pela Bênção de Inazami (0 a 0.10)
function getReducaoInazami() {
  const tem = (G.player.inventory || []).some(i => i.id === 'bencao_inazami');
  if (!tem) return 0;
  return Math.random() * 0.10; // rola um valor entre 0% e 10% a cada instância de dano
}
window.getReducaoInazami = getReducaoInazami;

// Hook: chamar isso no ponto onde o dano do inimigo é aplicado ao jogador,
// tanto pra dano normal quanto crítico. Exemplo de uso em battle.js:
//   dano = aplicarBencaoInazami(dano);
function aplicarBencaoInazami(dano) {
  const reducao = getReducaoInazami();
  if (reducao <= 0) return dano;
  return Math.max(1, Math.floor(dano * (1 - reducao)));
}
window.aplicarBencaoInazami = aplicarBencaoInazami;

// ── Auxiliares ───────────────────────────────────────────────
const INAZAMI_AMULETO_COMPLETO_ID = 'amuleto_completo_inazami';

// Imagens da cutscene: Imagens/inazami masmorra/h1.png … h5.png
function _inazamiSeloImg(n) { return 'Imagens/inazami masmorra/h' + n + '.png'; }

function _inazamiSeloCena(n, opts) {
  try {
    if (typeof showStoryCutscene === 'function') showStoryCutscene(_inazamiSeloImg(n), opts || {});
  } catch (e) { console.error('[inazami_selo_final] cutscene h' + n, e); }
}

function _inazamiSeloFecharCena() {
  try { if (typeof hideStoryCutscene === 'function') hideStoryCutscene(); } catch (_) {}
}

function _inazamiSeloSalvar() {
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
}

function _inazamiSairOuMapa() {
  return [
    { icon:'🏠', text:'Sair da masmorra', action: () => { if (typeof inazamiSairDaMasmorra === 'function') inazamiSairDaMasmorra(); else if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo(); } },
    { icon:'🗺️', text:'Voltar ao mapa',   action: () => { _inazamiSeloFecharCena(); if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
  ];
}

// Tira o Amuleto Completo do inventário (entregue à Inazami).
// Devolve true se havia um pra tirar.
function _inazamiConsumirAmuleto() {
  const inv = (window.G && G.player && G.player.inventory) || [];
  let tirou = false;
  for (let n = inv.length - 1; n >= 0; n--) {
    if (inv[n] && inv[n].id === INAZAMI_AMULETO_COMPLETO_ID) { inv.splice(n, 1); tirou = true; }
  }
  return tirou;
}

// ── Ponto de entrada: decide em que etapa o jogador está ─────
//  (usado pelo fim da cena de libertação e pelo botão
//   "Falar com Inazami" no torii / Salão do Trono)
function storyNode_inazami_selamento_inicio() {
  G.inazami = G.inazami || {};
  const gi = G.inazami;

  if (gi.acompanhando) {                       // já terminou tudo
    if (typeof storyNode_inazami_salao_vazio === 'function') storyNode_inazami_salao_vazio();
    return;
  }
  if (gi.selamentoConcluido) {                 // selou, mas não aceitou a Bênção
    _inazamiSeloCena(5);
    storyNode_inazami_despedida();
    return;
  }
  if (gi.amuletoEntregue) {                    // entregou, cutscene não terminou
    storyNode_inazami_selamento_1();
    return;
  }
  storyNode_inazami_entrega();
}
window.storyNode_inazami_selamento_inicio = storyNode_inazami_selamento_inicio;

// ── 1) Entrega do amuleto ────────────────────────────────────
function storyNode_inazami_entrega() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloFecharCena();

  setStory(
    'NARRADOR',
    `O boneco de cerâmica esquenta na sua mão, mais forte a cada segundo — como se reconhecesse o peso do Amuleto Completo na sua bolsa.\n\nA poucos passos, o Oni das Chamas jaz de joelhos entre brasas moribundas. O fogo negro dele quase se apagou de vez. Nunca esteve tão fraco.\n\nSe existe um momento pra terminar o que Inazami começou séculos atrás, é este.`,
    [
      { icon:'🔥', text:'Entregar o Amuleto Completo', action: storyNode_inazami_entrega_confirma },
      { icon:'🗺️', text:'Voltar ao mapa', action: () => { if (typeof storyNode_inazami_mapa === 'function') storyNode_inazami_mapa(); } },
    ]
  );
}
window.storyNode_inazami_entrega = storyNode_inazami_entrega;

function storyNode_inazami_entrega_confirma() {
  G.inazami = G.inazami || {};
  if (!G.inazami.amuletoEntregue) {            // só entrega uma vez, mesmo se a cena for repetida
    G.inazami.amuletoEntregue = true;
    const tirou = _inazamiConsumirAmuleto();
    if (tirou && typeof notify === 'function') notify('🔥 Amuleto Completo de Inazami entregue.', 'gold');
    try { if (typeof updateHUD === 'function') updateHUD(); } catch (_) {}
    _inazamiSeloSalvar();
  }
  storyNode_inazami_agradece();
}
window.storyNode_inazami_entrega_confirma = storyNode_inazami_entrega_confirma;

function storyNode_inazami_agradece() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'INAZAMI',
    `O amuleto se abre em luz entre as suas mãos e o boneco — e a voz dela, que até agora vinha abafada pela cerâmica, soa clara pela primeira vez.\n\n"Você trouxe o amuleto inteiro..."\n\n"Foi isso que me faltou naquele dia: tempo, e alguém que não desistisse. Obrigada. De verdade."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_agradece_2 },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_agradece = storyNode_inazami_agradece;

function storyNode_inazami_agradece_2() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'INAZAMI',
    `"Olhe pra ele. Está fraco como nunca esteve — não tem mais força nem pra se soltar das próprias cinzas."\n\n"É agora, ou nunca. Deixe que eu comece o selamento."`,
    [
      { icon:'🔥', text:'Deixar Inazami selar o Oni', action: storyNode_inazami_selamento_1 },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_agradece_2 = storyNode_inazami_agradece_2;

// ── 2) Cutscene do selamento (h1 → h5) ───────────────────────
function storyNode_inazami_selamento_1() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloCena(1, { shake: false, vibrate: false });
  setStory(
    'NARRADOR',
    `O amuleto se desfaz em fios de chama azul que sobem do chão e se enrolam no corpo do Oni — braços, peito, pescoço — apertando como correntes vivas.\n\nO boneco já não pesa na sua mão. Diante do Oni, Inazami está de pé como era antes do selo, a palma pousada sobre a cabeça dele. Ele nem tenta se erguer.\n\n"Você me guardou em barro por tempo demais, Hi-no-Kagutsuchi." — a voz dela não treme. — "Desta vez, quem decide sou eu."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_selamento_2 },
    ]
  );
}
window.storyNode_inazami_selamento_1 = storyNode_inazami_selamento_1;

function storyNode_inazami_selamento_2() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloCena(2, { shake: true, vibrate: false });
  setStory(
    'INAZAMI',
    `As correntes azuis apertam. O Oni tenta rir — o fogo dele já não obedece.\n\nAs mangas e o véu de Inazami começam a se desfazer em luz, fio por fio.\n\n"Da primeira vez, o selo cobrou uma vida e me deixou o corpo pra sofrer dentro dele."\n\n"Desta vez, não vai sobrar corpo nenhum pra ele tomar."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_selamento_3 },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_selamento_2 = storyNode_inazami_selamento_2;

function storyNode_inazami_selamento_3() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloCena(3, { shake: true, vibrate: true });
  setStory(
    'NARRADOR',
    `O corpo dela se desfaz de baixo pra cima, em faíscas azuis que sobem em espiral. O rosto é a última coisa a ir — calmo, quase aliviado.\n\n"Não tenha pena de mim..." — a voz já vem do próprio brilho. — "Eu já não tinha forma física há muito tempo. Só faltava terminar direito."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_selamento_4 },
    ]
  );
}
window.storyNode_inazami_selamento_3 = storyNode_inazami_selamento_3;

function storyNode_inazami_selamento_4() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloCena(4, { shake: true, vibrate: true });
  setStory(
    'NARRADOR',
    `Toda a luz se reúne num círculo de energia que gira ao redor do Oni. As correntes se fecham de uma vez só, e o fogo negro de Hi-no-Kagutsuchi se apaga por dentro, sem um rugido, sem uma risada.\n\nO salão inteiro estremece uma última vez. Depois, silêncio.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_selamento_5 },
    ]
  );
}
window.storyNode_inazami_selamento_4 = storyNode_inazami_selamento_4;

function storyNode_inazami_selamento_5() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloCena(5, { shake: false, vibrate: false });
  setStory(
    'NARRADOR',
    `Quando o brilho assenta, o Oni já não está mais ali. Só o círculo de energia continua pairando no meio do salão, girando devagar, como um coração que aprendeu a bater sozinho.\n\nÉ tudo o que sobrou de Inazami. E é o bastante pra manter Hi-no-Kagutsuchi preso — agora, pra sempre.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_selamento_fim },
    ]
  );
}
window.storyNode_inazami_selamento_5 = storyNode_inazami_selamento_5;

function storyNode_inazami_selamento_fim() {
  G.inazami = G.inazami || {};
  G.inazami.amuletoEntregue    = true;
  G.inazami.selamentoConcluido = true;
  G.inazami.hiNoKagutsuchiDerrotado = true;
  G.inazami.dungeonInazamiCompleta  = true;
  _inazamiSeloSalvar();
  storyNode_inazami_despedida();
}
window.storyNode_inazami_selamento_fim = storyNode_inazami_selamento_fim;

// ── 3) Despedida e Bênção ────────────────────────────────────
function storyNode_inazami_despedida() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'INAZAMI',
    `Do círculo de energia vem uma voz baixa, mais próxima de um pensamento do que de um som.\n\n"Ainda estou aqui... o bastante pra dizer isso, ao menos."\n\n"O selo está firme. Ele não volta mais. E eu já não tenho nada a proteger neste lugar — nem corpo pra ocupar nele."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_despedida_2 },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_despedida = storyNode_inazami_despedida;

function storyNode_inazami_despedida_2() {
  setScene('inazami-trono');
  hideEnemy();
  setStory(
    'INAZAMI',
    `"Se você me permitir... eu gostaria de acompanhá-lo. Não como guardiã — só o que restou de mim."\n\n"O selo que você carregou até aqui já não serve pra prender nada. Deixe que ele sirva, ao menos uma última vez, pra te proteger."`,
    [
      { icon:'🔥', text:'Aceitar a Bênção de Inazami', action: storyNode_inazami_recebe_buff },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_despedida_2 = storyNode_inazami_despedida_2;

function storyNode_inazami_recebe_buff() {
  setScene('inazami-trono');
  hideEnemy();
  G.inazami = G.inazami || {};
  G.inazami.acompanhando = true;

  // Idempotente: nunca entrega a Bênção duas vezes
  const jaTem = (G.player.inventory || []).some(i => i && i.id === 'bencao_inazami');
  if (!jaTem) {
    addItem({ ...ITEM_BENCAO_INAZAMI });
    notify('🔥 Bênção de Inazami obtida! (redução de dano passiva)', 'gold');
  }
  updateHUD();
  _inazamiSeloSalvar();

  setStory(
    'NARRADOR',
    `O círculo de energia se desfaz num único fio de luz que atravessa o ar até você e se acomoda no seu peito — não como um item, mas como uma presença. Uma proteção silenciosa, sempre ligada, sem exigir nada em troca.\n\nInazami não diz mais nada. Só uma última fagulha, quase um sorriso, antes de se aquietar de vez.`,
    _inazamiSairOuMapa()
  );
}
window.storyNode_inazami_recebe_buff = storyNode_inazami_recebe_buff;
