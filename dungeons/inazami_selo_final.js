// ─────────────────────────────────────────────────────────────
//  FINAL DE INAZAMI — entrega do amuleto, selamento e despedida
//
//  Fluxo (depois de derrotar o Hi-no-Kagutsuchi e recolher o boneco):
//    1) o jogador ENTREGA o Amuleto Completo → Inazami agradece
//    2) cutscene em TELA CHEIA h1 → h5 (Imagens/inazami masmorra/): ela sela o Oni
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
  imgSrc:  'Imagens/icones/materiais/bencainzami.png',
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
    `O boneco esquenta na sua mão, como se reconhecesse o Amuleto Completo na sua bolsa.\n\nO Oni jaz de joelhos, com o fogo quase apagado. Nunca esteve tão fraco.`,
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
    `O amuleto se abre em luz, e a voz dela soa clara pela primeira vez.\n\n"Você trouxe o amuleto inteiro... Obrigada. De verdade."`,
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
    `"Olhe pra ele: nem força pra se soltar das próprias cinzas. É agora ou nunca. Deixe que eu comece o selamento."`,
    [
      { icon:'🔥', text:'Deixar Inazami selar o Oni', action: storyNode_inazami_selamento_1 },
    ],
    INAZAMI_RETRATO
  );
}
window.storyNode_inazami_agradece_2 = storyNode_inazami_agradece_2;

// ── 2) Cutscene do selamento (h1 → h5) — TELA CHEIA ──────────
//  As imagens são verticais (9:16): em vez de caber numa caixinha do
//  painel de história, a cutscene abre um overlay próprio que mostra a
//  imagem INTEIRA (contain, com fundo desfocado da própria arte), troca
//  de imagem com dissolve, treme/vibra nos momentos fortes e põe o texto
//  numa faixa embaixo. Ao fim, devolve o controle pro jogo.
const INAZAMI_SELAMENTO_PASSOS = [
  { img:1, who:'NARRADOR', shake:false, vibrate:false,
    txt:"O amuleto se desfaz em fios de chama azul que se enrolam no corpo do Oni, apertando como correntes vivas." },
  { img:1, who:'NARRADOR', shake:false, vibrate:false,
    txt:"Diante dele, Inazami surge como era antes do selo, a mão pousada sobre a cabeça do Oni." },
  { img:1, who:'INAZAMI', shake:false, vibrate:false,
    txt:"\"Você me guardou em barro por tempo demais, Hi-no-Kagutsuchi. Desta vez, quem decide sou eu.\"" },
  { img:2, who:'NARRADOR', shake:true, vibrate:false,
    txt:"As correntes apertam. O Oni tenta rir, mas o fogo dele já não obedece. O véu de Inazami começa a se desfazer em luz." },
  { img:2, who:'INAZAMI', shake:true, vibrate:false,
    txt:"\"Da primeira vez, o selo me deixou o corpo pra sofrer. Desta vez, não vai sobrar corpo nenhum pra ele tomar.\"" },
  { img:3, who:'NARRADOR', shake:true, vibrate:true,
    txt:"O corpo dela se desfaz de baixo pra cima, em faíscas azuis. O rosto é a última coisa a ir — calmo, quase aliviado." },
  { img:3, who:'INAZAMI', shake:true, vibrate:false,
    txt:"\"Não tenha pena de mim. Eu já não tinha forma física há muito tempo. Só faltava terminar direito.\"" },
  { img:4, who:'NARRADOR', shake:true, vibrate:true,
    txt:"Toda a luz se reúne num círculo de energia ao redor do Oni. As correntes se fecham, e o fogo negro dele se apaga sem um rugido." },
  { img:5, who:'NARRADOR', shake:false, vibrate:false,
    txt:"Quando o brilho assenta, só o círculo de energia continua pairando no salão, girando devagar. É tudo o que sobrou de Inazami — e basta pra prender Hi-no-Kagutsuchi pra sempre." },
];

function _inazamiSeloCutsceneTelaCheia(passos, aoTerminar) {
  const fim = () => { try { aoTerminar(); } catch (e) { console.error('[inazami_selo_final]', e); } };
  try {
    document.querySelectorAll('#inazami-selo-overlay').forEach(n => n.remove());

    if (!document.getElementById('inazami-selo-css')) {
      const st = document.createElement('style');
      st.id = 'inazami-selo-css';
      st.textContent = `
        #inazami-selo-overlay { position:fixed; inset:0; z-index:9000; background:#000; overflow:hidden;
          font-family:Georgia,'Noto Serif',serif; animation:iseloIn .5s ease; }
        #inazami-selo-overlay .bg { position:absolute; inset:-6%; width:112%; height:112%; object-fit:cover;
          filter:blur(22px) brightness(.45); }
        #inazami-selo-overlay .fg { position:absolute; inset:0; width:100%; height:100%; object-fit:contain;
          opacity:0; transition:opacity .7s ease; }
        #inazami-selo-overlay .fg.on { opacity:1; }
        #inazami-selo-overlay .fg.shake { animation:iseloShake .5s ease-in-out infinite; }
        #inazami-selo-overlay .cap { position:absolute; left:0; right:0; bottom:0;
          padding:48px 16px calc(14px + env(safe-area-inset-bottom,0px));
          background:linear-gradient(to top, rgba(0,0,0,.94) 0%, rgba(0,0,0,.86) 55%, rgba(0,0,0,0) 100%); }
        #inazami-selo-overlay .who { color:#e0b84a; letter-spacing:5px; font-size:12px; margin-bottom:6px;
          border-left:3px solid #c25a2a; padding-left:8px; }
        #inazami-selo-overlay .txt { color:#efe3c8; font-size:15px; line-height:1.45; white-space:pre-line;
          max-height:26vh; overflow-y:auto; }
        #inazami-selo-overlay .btn { display:block; margin:12px auto 0; width:calc(100% - 110px); padding:12px;
          background:rgba(30,20,6,.92); color:#efe3c8; border:1px solid #8a6a1c; border-radius:8px;
          font:16px Georgia,serif; letter-spacing:2px; cursor:pointer; }
        #inazami-selo-overlay .prog { position:absolute; top:calc(10px + env(safe-area-inset-top,0px)); left:0; right:0;
          display:flex; gap:5px; justify-content:center; }
        #inazami-selo-overlay .prog i { width:26px; height:3px; border-radius:2px; background:rgba(255,255,255,.25); }
        #inazami-selo-overlay .prog i.on { background:#e0b84a; }
        @keyframes iseloIn { from{opacity:0} to{opacity:1} }
        @keyframes iseloShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-4px,2px)}
          40%{transform:translate(4px,-2px)} 60%{transform:translate(-3px,0)} 80%{transform:translate(3px,2px)} }
      `;
      document.head.appendChild(st);
    }

    const ov = document.createElement('div');
    ov.id = 'inazami-selo-overlay';
    ov.innerHTML = `
      <img class="bg" alt="">
      <div class="prog">${passos.map(() => '<i></i>').join('')}</div>
      <div class="cap">
        <div class="who"></div>
        <div class="txt"></div>
        <button class="btn" type="button">Continuar ›</button>
      </div>`;
    document.body.appendChild(ov);

    // pré-carrega tudo pra troca de imagem não piscar
    passos.forEach(p => { const im = new Image(); im.src = _inazamiSeloImg(p.img); });

    const bg = ov.querySelector('.bg'), who = ov.querySelector('.who'),
          txt = ov.querySelector('.txt'), btn = ov.querySelector('.btn'),
          dots = ov.querySelectorAll('.prog i');
    let n = 0, fgAtual = null;

    function mostrar(i) {
      const p = passos[i], src = _inazamiSeloImg(p.img);
      if (fgAtual && fgAtual.dataset.img === src) {          // mesma arte: só troca o texto/tremor
        fgAtual.classList.toggle('shake', !!p.shake);
        who.textContent = p.who; txt.textContent = p.txt; txt.scrollTop = 0;
        btn.textContent = (i < passos.length - 1) ? 'Continuar ›' : 'Continuar ›';
        dots.forEach((d, k) => d.classList.toggle('on', k <= i));
        if (p.vibrate && typeof CONFIG !== 'undefined' && CONFIG.vibration && navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 200, 100, 300]);
        return;
      }
      const novo = document.createElement('img');
      novo.dataset.img = src;
      novo.className = 'fg' + (p.shake ? ' shake' : '');
      novo.alt = '';
      novo.src = src;
      ov.insertBefore(novo, ov.querySelector('.prog'));
      void novo.offsetWidth;                 // reflow → a transição de opacidade roda
      novo.classList.add('on');
      bg.src = src;
      if (fgAtual) { const velho = fgAtual; velho.classList.remove('on'); setTimeout(() => velho.remove(), 800); }
      fgAtual = novo;
      who.textContent = p.who;
      txt.textContent = p.txt;
      txt.scrollTop = 0;
      btn.textContent = (i < passos.length - 1) ? 'Continuar ›' : 'Continuar ›';
      dots.forEach((d, k) => d.classList.toggle('on', k <= i));
      if (p.vibrate && typeof CONFIG !== 'undefined' && CONFIG.vibration && navigator.vibrate) {
        navigator.vibrate([100, 60, 100, 60, 200, 100, 300]);
      }
    }

    btn.onclick = () => {
      n++;
      if (n >= passos.length) {
        ov.style.transition = 'opacity .5s ease';
        ov.style.opacity = '0';
        setTimeout(() => { ov.remove(); fim(); }, 500);
        return;
      }
      mostrar(n);
    };
    mostrar(0);
  } catch (e) {
    console.error('[inazami_selo_final] cutscene em tela cheia falhou', e);
    document.querySelectorAll('#inazami-selo-overlay').forEach(x => x.remove());
    fim();                                    // nunca trava o jogador
  }
}
window._inazamiSeloCutsceneTelaCheia = _inazamiSeloCutsceneTelaCheia;

function storyNode_inazami_selamento_1() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloFecharCena();
  _inazamiSeloCutsceneTelaCheia(INAZAMI_SELAMENTO_PASSOS, storyNode_inazami_selamento_fim);
}
window.storyNode_inazami_selamento_1 = storyNode_inazami_selamento_1;

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
  _inazamiSeloFecharCena(); // ela já é só energia: o card (h5) substitui a cena grande
  setStory(
    'INAZAMI',
    `"Ainda estou aqui... o bastante pra dizer isso, ao menos."\n\n"O selo está firme. Ele não volta mais."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_inazami_despedida_2 },
    ],
    _inazamiSeloImg(5)
  );
}
window.storyNode_inazami_despedida = storyNode_inazami_despedida;

function storyNode_inazami_despedida_2() {
  setScene('inazami-trono');
  hideEnemy();
  _inazamiSeloFecharCena(); // ela já é só energia: o card (h5) substitui a cena grande
  setStory(
    'INAZAMI',
    `"Se você permitir, quero acompanhá-lo. Não como guardiã — só o que restou de mim."\n\n"Deixe que o selo, ao menos uma vez, sirva pra te proteger."`,
    [
      { icon:'🔥', text:'Aceitar a Bênção de Inazami', action: storyNode_inazami_recebe_buff },
    ],
    _inazamiSeloImg(5)
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
    `O círculo de energia se desfaz num fio de luz que se acomoda no seu peito: uma proteção silenciosa, sem exigir nada em troca.\n\nInazami não diz mais nada. Só uma última fagulha, quase um sorriso.`,
    _inazamiSairOuMapa()
  );
}
window.storyNode_inazami_recebe_buff = storyNode_inazami_recebe_buff;

// ═════════════════════════════════════════════════════════════
//  🧪 DEBUG — RESET DE MASMORRAS (SÓ PRA TESTE)
//
//  Aparece dentro do painel 🐞 Modo Debug (core/debug_mode.js).
//  Console:  resetMasmorra('inazami')   |   resetMasmorra()  → lista
//  Pra incluir outra masmorra: DEBUG_RESET_MASMORRAS.nome = { label, reset(){...} }
//  Pra remover tudo: apague este bloco inteiro.
// ═════════════════════════════════════════════════════════════
(function () {
  console.log('🧪 reset de masmorras carregado');

  function _tirarItens(ids) {
    const inv = (window.G && G.player && G.player.inventory) || [];
    for (let n = inv.length - 1; n >= 0; n--) {
      if (inv[n] && ids.includes(inv[n].id)) inv.splice(n, 1);
    }
  }

  window.DEBUG_RESET_MASMORRAS = window.DEBUG_RESET_MASMORRAS || {};
  window.DEBUG_RESET_MASMORRAS.inazami = {
    label: 'Inazami',
    reset() {
      // itens únicos que fazem o jogo achar que o boss já caiu / bloqueiam os fragmentos
      _tirarItens([
        'amuleto_quebrado_inazami', 'amuleto_fragmento_eir', 'fragmento_amuleto_final',
        'amuleto_completo_inazami', 'alma_das_chamas', 'selo_hi_no_kagutsuchi',
        'bencao_inazami', 'chave_camara_estatuas',
      ]);
      G.inazami = {};   // zera TODAS as flags da masmorra (progresso, pins, baús, final)
      try { _inazamiSeloFecharCena(); } catch (_) {}
      try { if (typeof updateHUD === 'function') updateHUD(); } catch (_) {}
      try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
      if (typeof notify === 'function') notify('🧪 Masmorra Inazami resetada.', 'gold');
    },
  };

  window.resetMasmorra = function (id) {
    const lista = window.DEBUG_RESET_MASMORRAS;
    if (!id || !lista[id]) { console.log('Masmorras:', Object.keys(lista)); return Object.keys(lista); }
    lista[id].reset();
    return true;
  };

  // O reset fica no painel 🐞 (debug_mode.js). O botão 🧪 flutuante abaixo é
  // opcional: só aparece se você trocar MOSTRAR_BOTAO_FLUTUANTE pra true.
  const MOSTRAR_BOTAO_FLUTUANTE = false;

  function _botao() {
    if (!MOSTRAR_BOTAO_FLUTUANTE) return;
    if (document.getElementById('debug-reset-masmorras')) return;
    const b = document.createElement('div');
    b.id = 'debug-reset-masmorras';
    b.textContent = '🧪 Reset';
    b.style.cssText = 'position:fixed;left:6px;bottom:100px;z-index:99999;background:#1b2a4a;color:#9cf;' +
      'border:1px solid #4a6fa5;border-radius:8px;padding:6px 10px;font:12px sans-serif;opacity:.85;';
    let m = null;
    b.onclick = () => {
      if (m) { m.remove(); m = null; return; }
      m = document.createElement('div');
      m.style.cssText = 'position:fixed;left:6px;bottom:140px;z-index:99999;background:#10182b;border:1px solid #4a6fa5;' +
        'border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:6px;';
      Object.keys(window.DEBUG_RESET_MASMORRAS).forEach(id => {
        const o = document.createElement('div');
        let armado = false;
        o.textContent = '↺ ' + window.DEBUG_RESET_MASMORRAS[id].label;
        o.style.cssText = 'color:#fff;font:13px sans-serif;padding:8px 12px;background:#24365e;border-radius:6px;';
        o.onclick = (e) => {
          e.stopPropagation();
          if (!armado) {                       // 1º toque arma, 2º confirma
            armado = true; o.textContent = '⚠️ Toque de novo p/ resetar';
            setTimeout(() => { armado = false; o.textContent = '↺ ' + window.DEBUG_RESET_MASMORRAS[id].label; }, 3000);
            return;
          }
          window.DEBUG_RESET_MASMORRAS[id].reset();
          m.remove(); m = null;
        };
        m.appendChild(o);
      });
      document.body.appendChild(m);
    };
    document.body.appendChild(b);
  }
  if (document.body) _botao(); else document.addEventListener('DOMContentLoaded', _botao);
})();
