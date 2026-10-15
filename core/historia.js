// =============================================================================
//  historia.js — Chronicles of Clivor
//  Sistema de história/nodos, nodos da Floresta, tutorial e evento do Kael (seções 13, 13.5, 14, 14.5).
//  Extraído do palDinh.js (linhas originais 4026–5745).
//  Carregar DEPOIS do palDinh.js no HTML (mesmo escopo global, sem módulos).
// =============================================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  13. SISTEMA DE HISTÓRIA / NODOS
// ─────────────────────────────────────────────────────────────
function setStory(speaker, text, choices = [], imgSrc = null) {
  if (typeof nomeJogadorTokens === 'function') { speaker = nomeJogadorTokens(speaker); text = nomeJogadorTokens(text); }
  document.getElementById('story-speaker').textContent = speaker;
  const panel = document.getElementById('interaction-panel');
  if (panel) panel.scrollTop = 0;

  // Mostrar/ocultar card do NPC
  if (typeof showNpcThumb === 'function') showNpcThumb(imgSrc, speaker);

  const el = document.getElementById('story-text');
  el.innerHTML = '';
  const formatted = text.replace(/\n/g, '<br>');
  if (window._typeTimer) clearInterval(window._typeTimer);

  // Textos com HTML de bloco (cards de runas, talentos, fusão, etc.) não usam o
  // efeito de máquina de escrever: digitar char-a-char um bloco grande de HTML
  // deixa o conteúdo quebrado/incompleto na tela por dezenas de segundos.
  // Nesse caso, renderiza tudo de uma vez.
  if (/<div/i.test(formatted)) {
    el.innerHTML = formatted;
  } else {
    let i = 0;
    // IMPORTANTE: captura o ID do timer numa variável LOCAL (em vez de só
    // confiar em window._typeTimer). Se dois setStory() disparam próximos
    // um do outro (ex.: toque duplo em "Continuar"), window._typeTimer pode
    // já estar apontando pro timer mais novo no momento em que o timer
    // antigo termina — e aí ele cancelava o timer ERRADO (o novo), deixando
    // o antigo órfão rodando pra sempre e reescrevendo o texto ANTIGO por
    // cima do novo a cada 18ms. Cancelando pelo ID local isso nunca acontece.
    const thisTimer = setInterval(() => {
      i++;
      el.innerHTML = formatted.substring(0, i);
      if (i >= formatted.length) clearInterval(thisTimer);
    }, 18);
    window._typeTimer = thisTimer;
  }

  buildChoices(choices);
}

function buildChoices(choices) {
  const area = document.getElementById('choices-area');
  area.innerHTML = '';
  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    // Botão de sair da localização (ex.: "Sair da taverna") ganha o
    // destaque vermelho automaticamente no modo de conversa NPC.
    if (/^sair\b/i.test((c.text || '').trim())) btn.classList.add('dlg-exit');
    btn.innerHTML = `<span class="choice-icon">${c.icon || '▶'}</span><span class="choice-label">${c.text}</span><span class="choice-chevron">›</span>`;
    btn.onclick = c.action;
    area.appendChild(btn);
  });
}

// ── Observatório: visão de binóculos ─────────────────────────────────────
// A moldura (binini.png) fica parada por cima; a imagem do vilarejo se move
// por baixo ao arrastar o dedo/mouse. O botão 🔍 alterna o zoom.
const Observatorio = (function () {
  const RATIO = 1532 / 1020;      // proporção da moldura binini.png
  const ZOOM_MIN = 1.25, ZOOM_MAX = 2.4;
  const DIRECAO = 1;              // 1 = a imagem acompanha o dedo; -1 = inverte o movimento
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let view, frame, img, ativo = false, pronto = false, raf = null;
  let w = 0, h = 0, baseW = 0, baseH = 0;
  let z = ZOOM_MIN, zAlvo = ZOOM_MIN;
  let x = 0, y = 0, tx = 0, ty = 0;      // posição atual / alvo (px, a partir do centro)
  let arrastando = false, ult = null;

  function lim(zz) {
    return { mx: Math.max(0, (baseW * zz - w) / 2), my: Math.max(0, (baseH * zz - h) / 2) };
  }
  function limitarAlvo() {
    const l = lim(zAlvo);
    tx = clamp(tx, -l.mx, l.mx);
    ty = clamp(ty, -l.my, l.my);
  }
  function medir() {
    if (!view) return;
    const loc = document.querySelector('.scene-panel .scene-location');
    view.style.top = (loc ? loc.offsetHeight : 0) + 'px';
    const W = view.clientWidth, H = view.clientHeight;
    w = Math.min(W, H * RATIO);
    h = w / RATIO;
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
    const k = Math.max(w / nw, h / nh);   // "cover" dentro da janela dos binóculos
    baseW = nw * k; baseH = nh * k;
    limitarAlvo();
  }
  function quadro() {
    if (!ativo) { raf = null; return; }
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    z += (zAlvo - z) * 0.14;
    const l = lim(z);
    const cx = clamp(x, -l.mx, l.mx), cy = clamp(y, -l.my, l.my);
    img.style.width = (baseW * z) + 'px';
    img.style.height = (baseH * z) + 'px';
    img.style.transform = 'translate(calc(-50% + ' + cx + 'px), calc(-50% + ' + cy + 'px))';
    raf = requestAnimationFrame(quadro);
  }
  function iniciar() {
    view = document.getElementById('observatorio-view');
    frame = document.getElementById('obs-frame');
    img = document.getElementById('obs-img');
    if (!view || !frame || !img) return false;
    img.addEventListener('load', medir);
    window.addEventListener('resize', () => { if (ativo) medir(); });
    view.addEventListener('pointerdown', (e) => {
      arrastando = true; ult = { x: e.clientX, y: e.clientY };
      view.classList.add('arrastando');
      try { view.setPointerCapture(e.pointerId); } catch (_) {}
    });
    view.addEventListener('pointermove', (e) => {
      if (!arrastando || !ult) return;
      tx += (e.clientX - ult.x) * DIRECAO;
      ty += (e.clientY - ult.y) * DIRECAO;
      ult = { x: e.clientX, y: e.clientY };
      limitarAlvo();
    });
    const soltar = () => { arrastando = false; ult = null; view.classList.remove('arrastando'); };
    view.addEventListener('pointerup', soltar);
    view.addEventListener('pointercancel', soltar);
    pronto = true;
    return true;
  }
  function setActive(on) {
    if (!pronto && !iniciar()) return;
    ativo = !!on;
    view.classList.toggle('active', ativo);
    if (ativo) {
      z = zAlvo = ZOOM_MIN; x = y = tx = ty = 0;
      const btn = document.getElementById('observatorio-zoom-btn');
      if (btn) btn.textContent = '🔍';
      medir();
      if (!raf) raf = requestAnimationFrame(quadro);
    } else if (raf) {
      cancelAnimationFrame(raf); raf = null;
    }
  }
  function alternarZoom() {
    if (!ativo) return;
    zAlvo = zAlvo > ZOOM_MIN + 0.01 ? ZOOM_MIN : ZOOM_MAX;
    limitarAlvo();
    const btn = document.getElementById('observatorio-zoom-btn');
    if (btn) btn.textContent = zAlvo > ZOOM_MIN + 0.01 ? '🔎' : '🔍';
  }
  return { setActive, alternarZoom };
})();
window.Observatorio = Observatorio;

function toggleObservatorioZoom() {
  Observatorio.alternarZoom();
}
window.toggleObservatorioZoom = toggleObservatorioZoom;

function setScene(loc) {
  G.location = loc;

  // Conquistas de exploração — checadas a cada troca de cena.
  if (window.Achievements) {
    if (loc !== 'vilarejo') Achievements.unlock('ach_saida_vilarejo');
    if (loc.indexOf('dungeon-') === 0) Achievements.unlock('ach_dungeon');
    if (loc.indexOf('kappa-') === 0 || loc.indexOf('tve-') === 0) Achievements.unlock('ach_masmorra');
  }

  const bg = document.getElementById('scene-bg');

  // Remove todas as classes de cena
  bg.className = 'scene-bg';

  // Se a cena anterior (ex.: Cidade de Kurosaki, que troca o fundo conforme o
  // período do dia) deixou imagem/filtro direto no elemento, isso vence a classe
  // da cena nova e o fundo "gruda" no cenário antigo. Limpa ao sair — Kurosaki
  // reaplica o dele sozinho quando o jogador entra de novo.
  if (loc !== 'cidade-kurosaki') {
    bg.style.removeProperty('background-image');
    bg.style.removeProperty('background');
    bg.style.removeProperty('filter');
  }

  const sceneMap = {
    floresta:         'floresta',
    floresta2:        'floresta',
    vilarejo:         'vilarejo',
    'mapa-mundi':     'mapa-mundi',
    'cidade-pedra':   'cidade-pedra',
    'ponte-pedra':    'ponte-pedra',
    'kurogane':       'kurogane',
    'kurogane-observatorio': 'kurogane-observatorio',
    'cidade-kurosaki':'cidade-kurosaki',
    estalagem:        'estalagem',
    'hubi-sotao':     'hubi-sotao',
    taverna:          'taverna',
    templo:           'templo',
    'dungeon-barco':  'dungeon-barco',
    'dungeon-castel': 'dungeon-castel',
    'dungeon-dentro': 'dungeon-dentro',
    'dungeon-fase1':  'dungeon-fase1',
    'dungeon-fase2':  'dungeon-fase2',
    'dungeon-fase3':  'dungeon-fase3',
    'dungeon-fase4':  'dungeon-fase4',
    'dungeon-fase5':  'dungeon-fase5',
    'dungeon-fase6':  'dungeon-fase6',
    'dungeon-fase8':  'dungeon-fase8',
    'dungeon-fase9':  'dungeon-fase9',
    // ── Masmorra do Kappa ──
    'kappa-k1':       'kappa-k1',
    'kappa-caverna':  'kappa-caverna',
    'kappa-k2':       'kappa-k2',
    'kappa-k3':       'kappa-k3',
    // ── Masmorra 4: O Ninho dos Fios Ilusórios (Vila de Tsumugi) ──
    'aranhas-vila':   'aranhas-vila',
    'aranhas-caverna':'aranhas-caverna',
    // ── Masmorra Inazami (Oni das Chamas) ──
    'inazami-i1':     'inazami-i1',
    'inazami-f1':     'inazami-f1',
    'inazami-nucleo1':'inazami-nucleo1',
    'inazami-nucleo2':'inazami-nucleo2',
    'inazami-nucleo3':'inazami-nucleo3',
    'inazami-nucleo4':'inazami-nucleo4',
    'inazami-nucleo5':'inazami-nucleo5',
    'inazami-nucleo6':'inazami-nucleo6',
    'inazami-trono':  'inazami-trono',
    // ── Templo do Vazio Ecoante ──
    'tve-entrada':    'tve-entrada',
    'tve-interior':   'tve-interior',
    'tve-f1':         'tve-f1',
    'tve-f2':         'tve-f2',
    'tve-f3':         'tve-f3',
    'tve-f3b':        'tve-f3b',
    'tve-f4':         'tve-f4',
  };
  const cls = sceneMap[loc] || 'floresta';
  bg.classList.add(cls);

  // O reset de classes acima apaga a classe floresta-<periodo> que o ciclo
  // dia/noite (gat-1.html) tinha aplicado. Sem isso, o cache interno do
  // ciclo (_florestaPeriodoAtual) acha que "nada mudou" e só reaplica o
  // período certo depois de até 5 min — daí o bug de "voltar pra manhã".
  // Zerando o cache e chamando a função de novo, ela reaplica na hora.
  if (cls === 'floresta') {
    window._florestaPeriodoAtual = null;
    if (typeof aplicarFlorestaPorHorario === 'function') aplicarFlorestaPorHorario();
  } else if (typeof atualizarRelogioFloresta === 'function') {
    // Saiu da floresta: esconde o relógio na hora, sem esperar o tick de 1s.
    atualizarRelogioFloresta();
  }

  // Música: Dungeon das Sombras tem playlist exclusiva (gloria_antica, Sont, the_sullen_gate),
  // tocando uma após a outra em loop. Ao sair da dungeon, retoma a playlist da floresta.
  if (loc.indexOf('dungeon-') === 0) {
    AudioSys.play('dungeonSombras');
  } else if (loc === 'cidade-kurosaki' || loc === 'cidade-pedra') {
    // Cidade das Pedra tem playlist própria (CPedras: 45utn + flaluf), em loop
    AudioSys.play('cidadeKurosaki');
  } else if (AudioSys._dungeonActive || AudioSys._cidadeActive) {
    AudioSys.play('floresta');
  }

  // Ativa/desativa pins do vilarejo
  const vilPins = document.getElementById('scene-village-pins');
  if (vilPins) vilPins.classList.toggle('active', loc === 'vilarejo');

  // Mostra/oculta o botão flutuante do mini-mapa (vilarejo e Cidade de Kurosaki, e só depois de
  // concluir a Dungeon das Sombras E receber o mapa do taberneiro — ver
  // _podeUsarMinimapa() em palDinh.js)
  const minimapBtn = document.getElementById('minimap-toggle');
  if (minimapBtn) {
    const _noLocalMapa = (typeof _minimapaNoLocal === 'function') ? _minimapaNoLocal(loc) : (loc === 'vilarejo');
    minimapBtn.classList.toggle('visivel', _noLocalMapa && (typeof _podeUsarMinimapa === 'function' ? _podeUsarMinimapa() : false));
    // fora do vilarejo o botão sai do canto pra não ficar em cima do botão de ferramentas
    minimapBtn.classList.toggle('minimap-fora-vilarejo', loc !== 'vilarejo');
  }

  // Mostra/oculta o botão flutuante do mapa da Masmorra Inazami
  // (visível em qualquer cena 'inazami-*', pra abrir o mapa clicável quando quiser)
  const inazamiMapaBtn = document.getElementById('inazami-mapa-toggle');
  if (inazamiMapaBtn) inazamiMapaBtn.classList.toggle('visivel', loc.indexOf('inazami-') === 0);

  // Ativa/desativa pins do mapa-múndi
  const mundiPins = document.getElementById('scene-mundi-pins');
  if (mundiPins) mundiPins.classList.toggle('active', loc === 'mapa-mundi');
  if (loc === 'mapa-mundi' && typeof updateMundiPins === 'function') setTimeout(updateMundiPins, 50);

  // Ativa/desativa pins da Ponte da Fronteira
  const pontePins = document.getElementById('scene-ponte-pins');
  if (pontePins) pontePins.classList.toggle('active', loc === 'ponte-pedra');

  // Ativa/desativa pins da Travessia de Kurogane — só aparecem quando o
  // caminho já está livre (ogro/bruxa derrotados); enquanto bloqueado, a
  // cena usa o texto/menina do gigante, sem os 3 pins do Entr.png.
  const kuroganePins = document.getElementById('scene-kurogane-pins');
  if (kuroganePins) {
    const livre = (typeof kurosakiTravessiaLivre === 'function') && kurosakiTravessiaLivre();
    kuroganePins.classList.toggle('active', loc === 'kurogane' && !!livre);
  }

  // Botão de zoom do Observatório — só aparece na cena kurogane-observatorio,
  // e o zoom sempre reseta ao entrar/sair pra não "vazar" pra outra cena.
  const obsZoomBtn = document.getElementById('observatorio-zoom-btn');
  if (obsZoomBtn) obsZoomBtn.classList.toggle('visivel', loc === 'kurogane-observatorio');
  if (window.Observatorio) Observatorio.setActive(loc === 'kurogane-observatorio');

  // Atualiza nome da localização
  const names = {
    floresta:         'FLORESTA DE CLIVOR',
    floresta2:        'MARGEM DA FLORESTA',
    vilarejo:         'VILAREJO DA PEDRA BRANCA',
    'mapa-mundi':     'MAPA-MÚNDI',
    'cidade-pedra':   'CIDADE DAS PEDRA',
    'ponte-pedra':    'PONTE DA FRONTEIRA',
    'kurogane':       'TRAVESSIA DE KUROGANE',
    'kurogane-observatorio': 'OBSERVATÓRIO',
    'cidade-kurosaki':'CIDADE DE KUROSAKI',
    estalagem:        'ESTALAGEM DA DONA MITSUE',
    taverna:          'TAVERNA DO VIAJANTE',
    templo:           'TEMPLO DA DIVINA TRINDADE',
    'dungeon-barco':  'ILHA DAS SOMBRAS',
    'dungeon-castel': 'PORTÃO DAS SOMBRAS',
    'dungeon-dentro': 'DUNGEON DAS SOMBRAS',
    'dungeon-fase1':  'FASE 1 — CORREDOR DAS SOMBRAS',
    'dungeon-fase2':  'FASE 2 — CATACUMBAS',
    'dungeon-fase3':  'FASE 3 — SALÃO SOMBRIO',
    'dungeon-fase4':  'FASE 4 — CÂMARA DAS TREVAS',
    'dungeon-fase5':  'FASE 5 — CÂMARA DE SIU',
    'dungeon-fase6':  'FASE 6 — PROFUNDEZAS',
    'dungeon-fase8':  'FASE 8 — O DUELO DA SACERDOTISA NEGRA',
    'dungeon-fase9':  'FASE 9 — O LORDE DAS SOMBRAS',
    // ── Masmorra do Kappa ──
    'kappa-k1':       'SANTUÁRIO SUBMERSO DE KAWATARŌ',
    'kappa-caverna':  'CAVERNA DAS CORRENTES',
    'kappa-k2':       'CÂMARA DAS PROFUNDEZAS',
    'kappa-k3':       'CÂMARA DO KAPPA',
    // ── Masmorra 4: O Ninho dos Fios Ilusórios ──
    'aranhas-vila':   'VILA DE TSUMUGI',
    'aranhas-caverna':'O NINHO DOS FIOS ILUSÓRIOS',
    // ── Masmorra Inazami (Oni das Chamas) ──
    'inazami-i1':     'SANTUÁRIO DAS CINZAS ETERNAS',
    'inazami-f1':     'A TRILHA DAS BRASAS PERDIDAS',
    'inazami-nucleo1':'SALA DO NÚCLEO',
    'inazami-nucleo2':'SALA DO NÚCLEO',
    'inazami-nucleo3':'SALA DO NÚCLEO',
    'inazami-nucleo4':'SALA DO NÚCLEO',
    'inazami-nucleo5':'SALA DO NÚCLEO',
    'inazami-nucleo6':'SALA DO NÚCLEO',
    'inazami-trono':  'SALÃO DO TRONO',
    // ── Templo do Vazio Ecoante ──
    'tve-entrada':    'T V E - ENTRADA',
    'tve-interior':   'T V E - INTERIOR',
    'tve-f1':         'T V E - F 1',
    'tve-f2':         'T V E - F 2',
    'tve-f3':         'T V E - F 3',
    'tve-f3b':        'T V E - F 3',
    'tve-f4':         'T V E - F 4',
  };
  const captions = {
    floresta:         'Sombras densas e o sussurro das folhas ao vento...',
    floresta2:        'A floresta se aprofunda... o vilarejo deve estar próximo.',
    vilarejo:         'Toque nos ícones do mapa para explorar os locais.',
    'mapa-mundi':     'As terras conhecidas de Clivor se estendem à sua frente.',
    'cidade-pedra':   'As muralhas de pedra cinza se erguem no horizonte.',
    estalagem:        'O cheiro de madeira e velas acesas te recebe...',
    taverna:          'Cheiro de cedro queimado e caldo de missô no ar...',
    templo:           'Um silêncio sagrado envolve o lugar...',
    'dungeon-barco':  'A névoa cobre o mar. Algo antigo espera nesta ilha...',
    'dungeon-castel': 'O castelo das sombras ergue-se à sua frente...',
    'dungeon-dentro': 'Escuridão. O portão fechou-se atrás de você.',
    'dungeon-fase1':  'Cristais roxos pulsam nas paredes. Algo se move nas sombras...',
    'dungeon-fase2':  'O cheiro de ossos antigos e umidade pervade o ar...',
    'dungeon-fase3':  'Ecos distantes de passos que não são seus...',
    'dungeon-fase4':  'A escuridão aqui é viva. Você sente isso.',
    'dungeon-fase5':  'Uma presença estranha. Familiar. Esperando.',
    'dungeon-fase6':  'O fim está próximo. Ou talvez o começo.',
    'dungeon-fase8':  'O círculo no chão brilha. Não há mais palavras a trocar.',
    'dungeon-fase9':  'Sem paredes. Sem teto. Apenas sombra — e algo que te observa.',
    // ── Masmorra do Kappa ──
    'kappa-k1':       'O silêncio das águas paradas esconde algo antigo...',
    'kappa-caverna':  'O eco de gotas ecoa pelas pedras úmidas ao redor.',
    'kappa-k2':       'A pressão da água se faz sentir até nos ossos.',
    'kappa-k3':       'Uma presença imensa habita este lugar desde tempos imemoriais.',
    // ── Masmorra 4: O Ninho dos Fios Ilusórios ──
    'aranhas-vila':   'Portas fechadas. Hortas sem dono. O vento carrega fios que ninguém vê...',
    'aranhas-caverna':'Fios de seda vibram nas paredes, como cordas de um instrumento.',
    // ── Masmorra Inazami (Oni das Chamas) ──
    'inazami-i1':     'O calor sufocante ainda paira sobre as cinzas antigas...',
    'inazami-f1':     'Pequenas chamas azuis surgem no chão a cada passo...',
    'inazami-nucleo1':'O fragmento pulsa fraco sobre o pilar de pedra...',
    'inazami-nucleo2':'Uma presença enorme corta o ar...',
    'inazami-nucleo3':'O brilho de uma lança relampeja diante dos seus olhos...',
    'inazami-nucleo4':'A lança ainda vibra, cravada na pedra...',
    'inazami-nucleo5':'Ela recua um passo, avaliando você em silêncio...',
    'inazami-nucleo6':'A câmara volta a ficar em silêncio...',
    'inazami-trono':  'Brasas eternas iluminam pilhas de tesouros esquecidos...',
    // ── Templo do Vazio Ecoante ──
    'tve-entrada':    'A entrada se abre como uma ferida na pedra...',
    'tve-interior':   'A escuridão aqui tem textura. Como se estivesse viva.',
    'tve-f1':         'O eco distante de um grito antigo ressoa ao redor...',
    'tve-f2':         'No centro da sala, uma foice encravada no chão pulsa com aura roxa.',
    'tve-f3':         'A Sala Infinita. O espaço ao redor se dobra onde seus olhos pousam.',
    'tve-f3b':        'O templo respira. Algo aqui ainda escuta.',
    'tve-f4':         'O silêncio que segue é mais pesado que qualquer batalha.',
  };
  document.getElementById('location-name').textContent    = names[loc]    || loc.toUpperCase();
  document.getElementById('location-caption').textContent = captions[loc] || '';

  // Cabeçalho do modo de conversa NPC em tela cheia (mesmo texto do local)
  const dlgTitle = document.getElementById('dlg-title');
  const dlgSub   = document.getElementById('dlg-subtitle');
  if (dlgTitle) dlgTitle.textContent = names[loc] || loc.toUpperCase();
  if (dlgSub)   dlgSub.textContent   = captions[loc] || '';
}

// ─────────────────────────────────────────────────────────────
//  TRANSIÇÃO DE CENÁRIO — dissolve estilizado ao trocar a variante
//  visual de uma cena (ex.: ponte com o ogro → ponte livre, sem trocar
//  de local). background-image não faz crossfade sozinho — a troca real
//  do JS toggle (classList.toggle) acontece "escondida" no fundo escuro
//  do meio da transição, então o "pop" da imagem nova nunca é visto: a
//  cena escurece, troca por baixo, e reaparece já pronta, com um brilho
//  dourado passando por cima pra dar um ar mais cinematográfico.
//
//  Uso: trocarVisualCenaComTransicao(() => {
//         bg.classList.toggle('kurogane-livre', true);
//       });
// ─────────────────────────────────────────────────────────────
function trocarVisualCenaComTransicao(aplicarMudancaFn) {
  const bg = document.getElementById('scene-bg');
  if (!bg || typeof aplicarMudancaFn !== 'function') {
    if (typeof aplicarMudancaFn === 'function') aplicarMudancaFn();
    return;
  }

  // Overlay de brilho — criado uma vez, reaproveitado nas trocas seguintes
  let brilho = document.getElementById('scene-transicao-brilho');
  if (!brilho) {
    const painel = document.querySelector('.scene-panel');
    if (painel) {
      brilho = document.createElement('div');
      brilho.id = 'scene-transicao-brilho';
      brilho.className = 'scene-transicao-brilho';
      painel.appendChild(brilho);
    }
  }

  bg.classList.add('scene-bg-transicao');
  setTimeout(() => {
    aplicarMudancaFn(); // troca a classe/imagem de verdade enquanto está escondida no escuro
    bg.classList.remove('scene-bg-transicao');
    if (brilho) {
      brilho.classList.remove('play');
      void brilho.offsetWidth;
      brilho.classList.add('play');
    }
  }, 480);
}

// ── Gera HTML de sprite animado ou imagem estática ──
function buildEnemyVisual(enemy, size, animState) {
  // Modo "imagens separadas" — uma PNG por pose (idle/prepare/attack/hit),
  // sem grid de spritesheet. Usado por bosses com poses desenhadas à mão
  // separadamente (ex.: Tierra). Cai para 'idle' se a pose pedida não
  // existir no objeto (ex.: inimigo sem 'hit' definido).
  if (enemy.spriteImages) {
    const filtro = `filter:drop-shadow(0 0 22px rgba(200,80,20,0.9)) drop-shadow(0 0 8px rgba(0,0,0,0.95))${enemy.tintFilter ? ' ' + enemy.tintFilter : ''};`;
    const pose = enemy.spriteImages[animState] || enemy.spriteImages.idle;
    // Região recortada de uma sprite sheet única (ex.: cai1.png do Tierra) —
    // corta via background-position, sem precisar de arquivo por pose.
    if (pose && typeof pose === 'object') {
      const sheetW  = (enemy.spriteSheetSize && enemy.spriteSheetSize.w) || pose.sheetW || pose.w;
      const sheetH  = (enemy.spriteSheetSize && enemy.spriteSheetSize.h) || pose.sheetH || pose.h;
      const scale   = size / Math.max(pose.w, pose.h);
      const dispW   = (pose.w * scale).toFixed(1);
      const dispH   = (pose.h * scale).toFixed(1);
      const bgW     = (sheetW * scale).toFixed(1);
      const bgH     = (sheetH * scale).toFixed(1);
      const offX    = (-pose.x * scale).toFixed(1);
      const offY    = (-pose.y * scale).toFixed(1);
      return `<div style="width:${dispW}px;height:${dispH}px;overflow:hidden;position:relative;display:inline-block;${filtro}">
        <div style="position:absolute;left:${offX}px;top:${offY}px;width:${bgW}px;height:${bgH}px;
          background-image:url('${pose.src}');background-repeat:no-repeat;background-size:${bgW}px ${bgH}px;"></div>
      </div>`;
    }
    // Arquivo próprio por pose (ex.: hit: 'Imagens/cai2.png').
    if (pose) {
      return `<img src="${pose}" alt="${enemy.name}"
        style="max-width:${size}px;max-height:${size}px;width:auto;height:auto;
               object-fit:contain;display:block;${filtro}"
        onerror="this.outerHTML='<span style=\'font-size:3rem\'>${enemy.icon}</span>'">`;
    }
  }
  if (!enemy.sprite) {
    // Fallback: imagem estática (mix-blend-mode:screen remove fundo escuro) ou emoji
    if (enemy.img) {
      return `<img src="${enemy.img}" alt="${enemy.name}"
        style="max-width:${size}px;max-height:${size}px;width:auto;height:auto;
               object-fit:contain;display:block;
               mix-blend-mode:screen;background:transparent;
               filter:drop-shadow(0 0 22px rgba(200,80,20,0.9)) drop-shadow(0 0 8px rgba(0,0,0,0.95))${enemy.tintFilter ? ' ' + enemy.tintFilter : ''};"
        onerror="this.outerHTML='<span style=\'font-size:3rem\'>${enemy.icon}</span>'">`;
    }
    return `<span style="font-size:3rem">${enemy.icon}</span>`;
  }

  const s        = enemy.sprite;
  const fw       = Math.round(s.totalW / s.cols);   // largura de 1 frame
  const fh       = Math.round(s.totalH / s.rows);   // altura de 1 frame
  const anim     = s.anims[animState] || s.anims['idle'];
  const row      = anim.row;                         // linha da spritesheet (0-based)
  const frames   = anim.frames;                      // qtd de frames nessa animação
  const fps      = anim.fps || 6;
  const dur      = (frames / fps).toFixed(2) + 's';
  const sizeAdj  = s.src.includes('sheetDef') ? size * 750 : size;
  const scale    = sizeAdj / Math.max(fw, fh);          // escala para o tamanho pedido
  const sw       = Math.round(fw * scale);
  const sh       = Math.round(fh * scale);
  const totalW   = Math.round(s.totalW * scale);
  const offsetY  = Math.round(row * fh * scale);
  const totalWAnim = Math.round(fw * frames * scale);

  // ID único para a keyframe desta animação
  const kid = `sp_${enemy.id}_${animState}`;

  return `
  <style>
    @keyframes ${kid} {
      from { background-position-x: 0; }
      to   { background-position-x: -${totalWAnim}px; }
    }
  </style>
  <div style="
    width:${sw}px; height:${sh}px;
    overflow:hidden;
    background-image: url('${s.src}');
    background-size: ${totalW}px auto;
    background-position: 0 -${offsetY}px;
    background-repeat: no-repeat;
    animation: ${kid} ${dur} steps(${frames}) infinite;
    filter: drop-shadow(0 0 22px rgba(200,80,20,0.9)) drop-shadow(0 0 6px rgba(0,0,0,0.95));
    image-rendering: auto;
  "></div>`;
}

// ── Hero spritesheet visual (análogo a buildEnemyVisual) ──
// Injeta keyframes uma única vez no <head> para evitar "pulo" ao trocar animação
const _heroKFInjected = {};
function _ensureHeroKeyframe(kid, offsetX, animW) {
  if (_heroKFInjected[kid]) return;
  _heroKFInjected[kid] = true;
  const style = document.createElement('style');
  style.textContent = `@keyframes ${kid} { from { background-position-x: -${offsetX}px; } to { background-position-x: -${offsetX + animW}px; } }`;
  document.head.appendChild(style);
}

// ── Hero spritesheet visual ──
// Usa sprite normal ou spriteDef (defend/hit) — mesmas dimensões para evitar pulo
// Renderiza ícone da classe: imagem se disponível, emoji como fallback
function clsIconHtml(cls, size) {
  size = size || 40;
  if (!cls) return '⚔️';
  const color = cls.color || 'rgba(200,150,10,0.6)';
  if (cls.iconImg) {
    // Sem onerror inline (CSP do WebView bloqueia handlers inline) — usa
    // classe + data-attrs e o listener delegado 'error' abaixo. overflow:hidden
    // + object-fit:cover garante que SÓ a imagem apareça, sem emoji sobrando.
    return `<span class="cls-icon-box" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;overflow:hidden;flex-shrink:0;">
      <img class="cls-icon-img" src="${cls.iconImg}" data-fallback-icon="${(cls.icon || '⚔️')}" data-fallback-color="${color}" data-fallback-size="${size}"
        style="width:100%;height:100%;object-fit:cover;display:block;" alt="${cls.name}">
    </span>`;
  }
  const fs = Math.round(size * 0.52);
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.85) 100%);border:1.5px solid ${color};box-shadow:0 0 14px ${color}55,inset 0 0 10px ${color}22;font-size:${fs}px;line-height:1;">${cls.icon}</span>`;
}

// Fallback CSP-safe pra ícones de classe: 'error' de <img> não borbulha,
// por isso precisa capture:true pra pegar no document. Só troca pro emoji
// se a imagem realmente falhar — nunca mostra os dois juntos.
document.addEventListener('error', function(e) {
  const img = e.target;
  if (!img.classList) return;
  if (img.classList.contains('cls-icon-img')) {
    const size = img.dataset.fallbackSize || 40;
    const color = img.dataset.fallbackColor || 'rgba(200,150,10,0.6)';
    const icon = img.dataset.fallbackIcon || '⚔️';
    const wrap = img.parentElement;
    wrap.style.cssText += `border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.85) 100%);border:1.5px solid ${color};box-shadow:0 0 14px ${color}55,inset 0 0 10px ${color}22;font-size:${Math.round(size * 0.52)}px;line-height:1;`;
    wrap.textContent = icon;
    return;
  }
  // Ícones de receita de craft / itens da bolsa: esconde a img quebrada e
  // mostra o <span> emoji logo em seguida (já presente no HTML, display:none).
  if (img.classList.contains('icon-fallback-img')) {
    img.style.display = 'none';
    const fallback = img.nextElementSibling;
    if (fallback) fallback.style.display = 'flex';
  }
}, true);

function buildHeroVisual(size, animName) {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return clsIconHtml(cls, 60);

  // MODO: imagens separadas por animação.
  // Usado pelo Mago com:
  // sprite: { type:'images', images:{ idle:'...', attack:'...', tak:'...' } }
  if (cls.sprite.type === 'images') {
    const s = cls.sprite;
    const images = s.images || {};
    const attackSheet = s.attackSheet;
    const src =
      images[animName] ||
      images.idle ||
      images.attack;

    const isPaladinoImg = cls.id === 'paladino';
    const containerH = size;
    const containerW = isPaladinoImg
      ? size
      : Math.round(size * 1.55);
    const renderH = containerH;
    const dispScale = s.scale || 1; // zoom visual opcional, ancorado na base (pés)

    // MODO sprite sheet único (sem imagens separadas por animação): recorta
    // direto o frame certo do sheet — usado pelo Assassino (Assassino0000.png).
    // Suporta tanto tira horizontal (frameMap: {idle:0,...}) quanto grade 2D
    // (frameMap: {idle:[0,0], attack:[1,1], ...}, com cols/rows definidos).
    if (!src && attackSheet) {
      const frameMap = attackSheet.frameMap || {};
      const cols = attackSheet.cols || attackSheet.frames || 1;
      const rows = attackSheet.rows || 1;
      const raw = frameMap.hasOwnProperty(animName) ? frameMap[animName] : (frameMap.idle || 0);
      const col = Array.isArray(raw) ? raw[0] : raw;
      const row = Array.isArray(raw) ? raw[1] : 0;
      const dispH = renderH;
      const dispW = Math.round(attackSheet.frameW / attackSheet.frameH * dispH);
      return `
      <div style="
        position:relative;
        width:${containerW}px;
        max-width:46vw;
        height:${containerH}px;
        flex:0 0 auto;
        overflow:visible;
      ">
        <div data-hero-sheet="1" style="
          position:absolute;
          bottom:0;
          left:50%;
          transform:translateZ(0) translateX(-50%) scale(${dispScale});
          -webkit-transform:translateZ(0) translateX(-50%) scale(${dispScale});
          transform-origin:bottom center;
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
          will-change:background-position;
          width:${dispW}px;
          height:${dispH}px;
          background-image:url('${attackSheet.src}');
          background-repeat:no-repeat;
          background-size:${dispW * cols}px ${dispH * rows}px;
          background-position:-${col * dispW}px -${row * dispH}px;
          filter:drop-shadow(0 0 14px rgba(200,160,10,0.7)) drop-shadow(0 0 4px rgba(0,0,0,0.9));
        "></div>
      </div>`;
    }


    if (!src) return clsIconHtml(cls, 60);

    const offsetY = (s.offsets && s.offsets[animName]) || 0;

    return `
      <div style="
        position:relative;
        width:${containerW}px;
        max-width:46vw;
        height:${containerH}px;
        flex:0 0 auto;
        overflow:visible;
      ">
        <img src="${src}" alt="${cls.name || 'Herói'}" data-hero-offset="${offsetY}"
          style="
            position:absolute;
            bottom:${offsetY}px;
            left:50%;
            transform:translateX(-50%) scale(${dispScale});
            transform-origin:bottom center;
            height:${renderH}px;
            width:auto;
            max-width:44vw;
            object-fit:contain;
            display:block;
            image-rendering:auto;
            filter:drop-shadow(0 0 14px rgba(200,160,10,0.7)) drop-shadow(0 0 4px rgba(0,0,0,0.9));
          "
          onerror="this.outerHTML='<span style=\\'font-size:3rem\\'>${cls.icon || '⚔️'}</span>'">
        ${isPaladinoImg ? `<img id="pal-aura-badge" src="Imagens/icones/Picsart_26-06-29_04-52-27-463.png"
          style="position:absolute;
                 bottom:-8px;left:50%;
                 transform:translateX(-50%);
                 width:175px;height:175px;
                 object-fit:contain;
                 z-index:10;pointer-events:none;display:none;
                 opacity:0.72;"
          onerror="this.style.display='none'">` : ''}
        ${cls.id === 'mago' ? `<img id="mago-elem-badge" src=""
          style="position:absolute;
                 top:50%;left:50%;
                 transform:translate(-50%,-50%) rotate(0deg);
                 width:${Math.round(containerH * 1.15)}px;height:${Math.round(containerH * 1.15)}px;
                 object-fit:contain;
                 z-index:5;pointer-events:none;display:none;
                 opacity:0.85;"
          onerror="this.style.display='none'">` : ''}
      </div>`;
  }

  const defAnims = ['defend', 'hit', 'hit2', 'recover'];
  const s      = (cls.spriteDef && defAnims.includes(animName)) ? cls.spriteDef : cls.sprite;
  const anim   = s.anims[animName] || s.anims['idle'];

  // MODO freeLayout: cada frame tem posição própria (fx, fy, fw, fh)
  // Usa "virtual box" de tamanho fixo para todos os frames, alinhando a BASE
  // de cada sprite no fundo do container — tamanho consistente, sem saltos.
  if (s.freeLayout && anim.fx !== undefined) {
    const vboxW  = s.vboxW || 280;
    const vboxH  = s.vboxH || 342;
    // Offset do frame dentro da vbox: centralizado H, alinhado na base V
    const vfx    = anim.vfx !== undefined ? anim.vfx : Math.round((vboxW - anim.fw) / 2);
    const vfy    = anim.vfy !== undefined ? anim.vfy : (vboxH - anim.fh);
    const scale  = size / vboxH;
    const cW     = Math.round(vboxW * scale);  // largura do container (fixa para todos os frames)
    const cH     = size;                        // altura do container (fixa)
    const bgW    = Math.round(s.totalW * scale);
    const bgH    = Math.round(s.bgH    * scale);
    // Desloca a spritesheet para que o frame correto apareça na posição virtual
    const bgLeft = Math.round((vfx - anim.fx) * scale);
    const bgTop  = Math.round((vfy - anim.fy) * scale);
    return `
  <div style="
    width:${cW}px;
    height:${cH}px;
    overflow:hidden;
    position:relative;
    flex:0 0 auto;
    display:block;
    filter:drop-shadow(0 0 14px rgba(200,160,10,0.7)) drop-shadow(0 0 4px rgba(0,0,0,0.9));
  ">
    <div style="
      width:${bgW}px;
      height:${bgH}px;
      position:absolute;
      left:${bgLeft}px;
      top:${bgTop}px;
      background-image:url('${s.src}');
      background-size:${bgW}px ${bgH}px;
      background-position:0 0;
      background-repeat:no-repeat;
      image-rendering:auto;
    "></div>
  </div>`;
  }
  const frames = anim.frames || 1;
  const fps    = anim.fps || 6;
  const dur    = (frames / fps).toFixed(2) + 's';

  const bgW  = s.totalW;
  const bgH  = s.bgH || s.totalH || 1024;
  const cols = s.cols || 1;
  const rows = s.rows || 1;

  const fw = s.frameW || Math.round(bgW / cols);
  const sheetFrameH = Math.round(bgH / rows);

  const fh   = (anim.displayH !== undefined) ? anim.displayH : (s.displayH || sheetFrameH);
  const posY = (anim.posY !== undefined) ? anim.posY : (s.posY || 0);

  const cropLeft  = s.cropLeft  || 0;
  const cropRight = s.cropRight || 0;
  const visibleFw = Math.max(1, fw - cropLeft - cropRight);

  const scale   = size / fh;
  const sFw     = Math.round(visibleFw * scale);
  const sBgW    = Math.round(bgW * scale);
  const sBgH    = Math.round(bgH * scale);
  const sPosY   = Math.round(posY * scale);
  const offsetX = Math.round(((anim.startCol || 0) * fw + cropLeft) * scale);
  const frameStep = Math.round(fw * scale);
  const animW   = Math.round((fw * frames - cropLeft - cropRight) * scale);

  const kid = `hsp_${cls.id}_${animName}_s${Math.round(scale * 100)}_${offsetX}_${animW}`;
  if (!_heroKFInjected[kid]) {
    _heroKFInjected[kid] = true;
    const style = document.createElement('style');
    style.textContent =
      `@keyframes ${kid} {` +
      ` from { transform: translateX(0); }` +
      ` to { transform: translateX(-${frameStep * frames}px); }` +
      `}`;
    document.head.appendChild(style);
  }

  const visH = Math.round(fh * scale);  // altura real do personagem escalado

  return `
  <div style="
    width:${sFw}px;
    height:${visH}px;
    margin-top:auto;
    margin-bottom:auto;
    overflow:hidden;
    position:relative;
    flex:0 0 auto;
    display:block;
    filter:drop-shadow(0 0 14px rgba(200,160,10,0.7)) drop-shadow(0 0 4px rgba(0,0,0,0.9));
  ">
    <div style="
      width:${Math.max(animW, frameStep * frames)}px;
      height:${sBgH - sPosY}px;
      position:absolute;
      left:0;
      top:0;
      background-image:url('${s.src}');
      background-size:${sBgW}px ${sBgH}px;
      background-position-x:-${offsetX}px;
      background-position-y:-${sPosY}px;
      background-repeat:no-repeat;
      ${frames > 1 ? `animation:${kid} ${dur} steps(${frames}) infinite;` : ''}
      image-rendering:auto;
      will-change:transform;
    "></div>
  </div>`;
}

// ── Movimento do herói em batalha (lunge/recoil) ──
// Aplica um deslocamento horizontal ao MESMO elemento que setHeroAnim() usa
// pra trocar o frame do sprite (#bat-hero-icon) — os dois efeitos (frame +
// posição) sempre rodam juntos, sem conflito, porque é o mesmo elemento.
// px positivo = em direção ao inimigo (herói fica à esquerda da arena);
// negativo = recuo/afastamento. durationMs/easing omitidos = troca
// instantânea (sem transição), útil pra resetar a posição de golpe.
function setHeroOffset(px, durationMs, easing) {
  const el = document.getElementById('bat-hero-icon');
  if (!el) return;
  el.style.transition = durationMs ? `transform ${durationMs}ms ${easing || 'ease-out'}` : '';
  el.style.transform   = px ? `translateX(${px}px)` : '';
}
window.setHeroOffset = setHeroOffset;

// ── Entrada em cena: desliza o herói de fora da arena até a posição normal,
// com fade-in. Chamada uma vez no início de cada batalha (startBattle), logo
// depois do sprite idle ser montado — não interfere no sistema de troca de
// frame/posição usado durante a luta, é só o estado inicial do elemento.
function playHeroEntrance() {
  const el = document.getElementById('bat-hero-icon');
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = '0';
  el.style.transform = 'translateX(-46px)';
  void el.offsetHeight; // força o navegador a aplicar o estado inicial antes de animar
  el.style.transition = 'transform 0.42s cubic-bezier(0.18,0.85,0.32,1.08), opacity 0.32s ease-out';
  el.style.opacity = '1';
  el.style.transform = 'translateX(0px)';
  setTimeout(() => {
    const el2 = document.getElementById('bat-hero-icon');
    if (el2) { el2.style.transition = ''; el2.style.transform = ''; el2.style.opacity = ''; }
  }, 460);
}
window.playHeroEntrance = playHeroEntrance;

// Troca a animação do herói no overlay de batalha
function setHeroAnim(animName, revertAfterMs) {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return;
  const el = document.getElementById('bat-hero-icon');
  if (!el) return;

  // MODO imagens separadas: troca só o src, sem recriar o DOM → zero pisca
  if (cls.sprite.type === 'images') {
    const images = cls.sprite.images || {};
    const attackSheet = cls.sprite.attackSheet;
    const HERO_ICON_SIZE = 90; // tamanho de layout fixo — aumentar isso quebra a arena; use sprite.scale para deixar visualmente maior
    const dispScale = cls.sprite.scale || 1; // zoom visual opcional, ancorado na base (pés)

    // Estados que vêm do sprite sheet (frame cortado por background-position).
    // Usa o mapa definido na própria classe (attackSheet.frameMap); se a classe
    // não definir um, cai no mapa antigo (compatibilidade com sheets de 2 frames).
    const sheetFrameMap = (attackSheet && attackSheet.frameMap) || { attack: 0, attack2: 1 };

    if (attackSheet && sheetFrameMap.hasOwnProperty(animName)) {
      // Garante que a estrutura base já existe (img OU div do sheet — o que
      // buildHeroVisual tiver criado). Só reconstrói se nenhuma das duas existir,
      // pra não recriar o DOM a cada frame (evitaria o "zero pisca").
      let img = el.querySelector('img[data-hero-sprite]');
      if (!img && !el.querySelector('div[data-hero-sheet]')) {
        el.innerHTML = buildHeroVisual(HERO_ICON_SIZE, 'idle');
        img = el.querySelector('img');
        if (img) img.setAttribute('data-hero-sprite', '1');
      }
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

      // Tamanho de exibição do frame, escalado pela mesma altura do idle (não o tamanho nativo do PNG)
      const dispH = HERO_ICON_SIZE;
      const dispW = Math.round(attackSheet.frameW / attackSheet.frameH * dispH);
      const cols  = attackSheet.cols || attackSheet.frames || 1;
      const rows  = attackSheet.rows || 1;

      let sheetDiv = el.querySelector('div[data-hero-sheet]');
      if (!sheetDiv) {
        sheetDiv = document.createElement('div');
        sheetDiv.setAttribute('data-hero-sheet', '1');
        sheetDiv.style.cssText = `
          position:absolute;
          bottom:0;
          left:50%;
          transform:translateZ(0) translateX(-50%) scale(${dispScale});
          -webkit-transform:translateZ(0) translateX(-50%) scale(${dispScale});
          transform-origin:bottom center;
          backface-visibility:hidden;
          -webkit-backface-visibility:hidden;
          will-change:background-position;
          width:${dispW}px;
          height:${dispH}px;
          background-image:url('${attackSheet.src}');
          background-repeat:no-repeat;
          background-size:${dispW * cols}px ${dispH * rows}px;
          filter:drop-shadow(0 0 14px rgba(200,160,10,0.7)) drop-shadow(0 0 4px rgba(0,0,0,0.9));
          z-index:2;
        `;
        el.appendChild(sheetDiv);
      }
      const raw = sheetFrameMap[animName];
      const col = Array.isArray(raw) ? raw[0] : raw;
      const row = Array.isArray(raw) ? raw[1] : 0;
      // Força o navegador a "fechar" o frame anterior antes de pintar o novo —
      // evita o glitch de repaint parcial (cabeça/capa aparecendo cortada) em
      // WebViews Android quando a troca de frame é muito rápida (~180-240ms).
      void sheetDiv.offsetHeight;
      sheetDiv.style.backgroundPosition = `-${col * dispW}px -${row * dispH}px`;
      sheetDiv.style.display = 'block';
      if (img) img.style.display = 'none';

      if (revertAfterMs) {
        setTimeout(() => {
          const sheetDiv2 = el && el.querySelector('div[data-hero-sheet]');
          const img2 = el && el.querySelector('img[data-hero-sprite]');
          if (sheetDiv2) sheetDiv2.style.display = 'none';
          if (img2) {
            img2.style.display = '';
            img2.src = images.idle;
            const idleOffset = (s.offsets && s.offsets.idle) || 0;
            img2.style.bottom = idleOffset + 'px';
          }
        }, revertAfterMs);
      }
      return;
    }

    // idle e demais estados: <img> normal, escondendo o sheet se estiver visível
    const src = images[animName] || images.idle || images.attack;
    if (!src) return;
    let img = el.querySelector('img[data-hero-sprite]');
    if (img) {
      img.src = src;
      img.style.display = '';
      const offsetY = (cls.sprite.offsets && cls.sprite.offsets[animName]) || 0;
      img.style.bottom = offsetY + 'px';
      img.setAttribute('data-hero-offset', offsetY);
    } else {
      const currentOpacity   = el.style.opacity;
      const currentTransform = el.style.transform;
      const currentTransition = el.style.transition;
      el.innerHTML = buildHeroVisual(HERO_ICON_SIZE, animName);
      img = el.querySelector('img');
      if (img) img.setAttribute('data-hero-sprite', '1');
      if (currentOpacity && currentOpacity !== '1' && currentOpacity !== '')
        el.style.opacity = currentOpacity;
      if (currentTransform && currentTransform !== '' && currentTransform !== 'none') {
        el.style.transition = currentTransition || '';
        el.style.transform  = currentTransform;
      }
    }
    const sheetDivHide = el.querySelector('div[data-hero-sheet]');
    if (sheetDivHide) sheetDivHide.style.display = 'none';

    if (revertAfterMs) {
      setTimeout(() => {
        const img2 = el && el.querySelector('img[data-hero-sprite]');
        const idleSrc = images.idle || images.attack;
        if (img2 && idleSrc) {
          img2.src = idleSrc;
          const idleOffset = (cls.sprite.offsets && cls.sprite.offsets.idle) || 0;
          img2.style.bottom = idleOffset + 'px';
        }
        else if (el) el.innerHTML = buildHeroVisual(HERO_ICON_SIZE, 'idle');
        if (el) { el.style.transform = ''; el.style.transition = ''; }
      }, revertAfterMs);
    }
    return;
  }

  // Spritesheet — comportamento original
  const currentOpacity   = el.style.opacity;
  const currentTransform = el.style.transform;
  const currentTransition = el.style.transition;
  el.innerHTML = buildHeroVisual(90, animName);
  if (currentOpacity && currentOpacity !== '1' && currentOpacity !== '')
    el.style.opacity = currentOpacity;
  if (currentTransform && currentTransform !== '' && currentTransform !== 'none') {
    el.style.transition = currentTransition || '';
    el.style.transform  = currentTransform;
  }
  if (revertAfterMs) {
    setTimeout(() => {
      if (el) {
        el.innerHTML = buildHeroVisual(90, 'idle');
        el.style.transform  = '';
        el.style.transition = '';
      }
    }, revertAfterMs);
  }
}

function showEnemy(enemy) {
  G.currentEnemy = enemy;
  const el = document.getElementById('scene-enemy');
  el.innerHTML = buildEnemyVisual(enemy, 150, 'idle');
  el.style.display = 'block';
  const _sh1=document.getElementById('scene-hero'); if(_sh1) _sh1.style.display='none';
}

// Troca a animação do inimigo na cena (idle / attack / run)
function setEnemyAnim(animState) {
  const enemy = G.currentEnemy;
  if (!enemy || !enemy.sprite) return;
  const el = document.getElementById('scene-enemy');
  el.innerHTML = buildEnemyVisual(enemy, 150, animState);
}

function hideEnemy() {
  G.currentEnemy = null;
  document.getElementById('scene-enemy').style.display = 'none';
  const _sh2=document.getElementById('scene-hero'); if(_sh2) _sh2.style.display='';
}

// ─────────────────────────────────────────────────────────────
//  13.5 TUTORIAL DE BOAS-VINDAS — placas azuis (fio + balão)
// ─────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  { target:'#tut-target-bars', title:'Vida e Energia',
    text:'Aqui ficam sua <b>HP</b> (vida) e <b>MP/AP</b> (energia da classe). Se a HP chegar a 0, você é derrotado. A barra de baixo é o recurso usado pelas suas habilidades.' },
  { target:'#tut-target-gold', title:'Ouro',
    text:'Suas moedas. Use para comprar, vender e trocar itens e equipamentos ao longo da sua jornada.' },
  { target:'#hud-reputation', title:'Mérito do Vilarejo',
    text:'Sua reputação com o povo de Pedra Branca. Ela só muda conforme você joga — ajudando pessoas, completando missões e vencendo batalhas — e nunca some com o tempo. Toque aqui pra ver seu nível atual e as recompensas de cada um.' },
  { target:'#tut-target-bolsa', title:'Bolsa',
    text:'Guarda seus itens, materiais e equipamentos. Toque para ver, usar ou equipar o que você encontrar pelo caminho — na primeira vez que abrir, um guia rápido explica cada aba.' },
  { target:'#btn-ficha', title:'Perfil',
    text:'Mostra seus atributos, talentos e equipamentos ativos. É aqui que você evolui sua classe conforme sobe de nível.' },
  { target:'#tut-target-salvar', title:'Salvar',
    text:'Salva seu progresso manualmente. Vale a pena salvar antes de decisões importantes ou batalhas difíceis.' },
  { target:'#choices-area', title:'Ações',
    text:'Aqui aparecem suas opções em cada momento da história. Escolha com cuidado — algumas decisões deixam marcas na sua jornada.' },
];

function startTutorial() {
  const backdrop = document.createElement('div');
  backdrop.id = 'tut-backdrop';
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('active'));

  let stepIdx = 0;

  function clearTutDom() {
    document.querySelectorAll('.tut-pin, .tut-line, .tut-balloon').forEach(el => el.remove());
  }

  function endTutorial() {
    clearTutDom();
    backdrop.classList.remove('active');
    setTimeout(() => backdrop.remove(), 350);
    G.tutorialSeen = true;
    if (typeof manualSave === 'function') { /* não força save, apenas marca estado em memória */ }
  }

  function renderStep() {
    clearTutDom();
    const step = TUTORIAL_STEPS[stepIdx];
    const el = document.querySelector(step.target);
    if (!el) { stepIdx++; if (stepIdx < TUTORIAL_STEPS.length) renderStep(); else endTutorial(); return; }

    const rect = el.getBoundingClientRect();
    const px = rect.left + rect.width / 2;
    const py = rect.top + rect.height / 2;

    // Pino azul sobre o elemento
    const pin = document.createElement('div');
    pin.className = 'tut-pin';
    pin.style.left = px + 'px';
    pin.style.top  = py + 'px';
    pin.textContent = '●';
    document.body.appendChild(pin);

    // Posição do balão: abaixo do elemento, ou acima se não couber
    const balloon = document.createElement('div');
    balloon.className = 'tut-balloon';
    const spaceBelow = window.innerHeight - rect.bottom;
    const putBelow = spaceBelow > 160;
    let bx = Math.min(Math.max(px - 140, 10), window.innerWidth - 290);
    let by = putBelow ? rect.bottom + 26 : rect.top - 26;
    balloon.style.left = bx + 'px';
    if (putBelow) balloon.style.top = by + 'px';
    else balloon.style.bottom = (window.innerHeight - by) + 'px';

    balloon.innerHTML = `
      <div class="tut-balloon-title">📘 ${step.title}</div>
      <div>${step.text}</div>
      <div class="tut-balloon-actions">
        <button class="tut-skip" id="tut-skip-btn">Pular tutorial</button>
        <span class="tut-step-count">${stepIdx + 1}/${TUTORIAL_STEPS.length}</span>
        <button class="tut-next" id="tut-next-btn">${stepIdx === TUTORIAL_STEPS.length - 1 ? 'Entendi!' : 'Próximo ▶'}</button>
      </div>
    `;
    document.body.appendChild(balloon);

    // Fio (linha) ligando o pino ao balão
    const line = document.createElement('div');
    line.className = 'tut-line';
    const lbx = bx + 20, lby = putBelow ? by : by; // ponto de ancoragem simples no canto do balão
    const dx = lbx - px, dy = lby - py;
    const dist = Math.sqrt(dx*dx + dy*dy);
    line.style.width = dist + 'px';
    line.style.height = '2px';
    line.style.left = px + 'px';
    line.style.top = py + 'px';
    line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    document.body.appendChild(line);

    document.getElementById('tut-next-btn').onclick = () => {
      stepIdx++;
      if (stepIdx < TUTORIAL_STEPS.length) renderStep();
      else endTutorial();
    };
    document.getElementById('tut-skip-btn').onclick = endTutorial;
  }

  renderStep();
}
window.startTutorial = startTutorial;

// ─────────────────────────────────────────────────────────────
//  14. NODOS DE HISTÓRIA — FLORESTA
// ─────────────────────────────────────────────────────────────
function storyNode_floresta() {
  // Floresta Maligna ativa: não existe "floresta calma" — todo caminho vira encontro do modo
  if (G._florestaMalignaAtiva && typeof flMalignaExplorar === 'function') { flMalignaExplorar(); return; }
  setScene('floresta');
  AudioSys.play('floresta');
  hideEnemy();

  const p = G.player;
  const lvl = p.level || 1;

  // Boss do Level 2 — Tierra
  if (lvl >= 2 && !G.dogDefeated) {
    setStory('NARRADOR',
      `O vento para. As folhas param de cair.\n\nO solo treme uma vez — suave, como um coração batendo devagar.\n\nEntre as árvores mais antigas da floresta, uma silhueta emerge. Alta. Coberta de raízes e flores brancas. Olhos de âmbar que não brilham de ódio — brilham de <em>julgamento</em>.`,
      [
        { icon:'🐺', text:'Observar a criatura com cautela...', action: () => {
          // Mostra caop.png como overlay SEM mexer no scene-bg
          let caopOverlay = document.getElementById('caop-overlay');
          if (!caopOverlay) {
            caopOverlay = document.createElement('div');
            caopOverlay.id = 'caop-overlay';
            caopOverlay.style.cssText = `
              position:absolute; inset:0; z-index:5; pointer-events:none;
              background-image:url('Imagens/inimigos/caop.png');
              background-size:cover; background-position:center top;
              filter:brightness(0.72) saturate(0.9);
              opacity:0; transition:opacity 0.8s ease;
            `;
            document.getElementById('scene-panel')?.appendChild(caopOverlay)
              || document.querySelector('.scene-panel')?.appendChild(caopOverlay);
          }
          requestAnimationFrame(() => { caopOverlay.style.opacity = '1'; });

          function removeCaopOverlay() {
            if (caopOverlay) { caopOverlay.style.opacity = '0'; setTimeout(() => caopOverlay.remove(), 800); }
          }

          setStory('TIERRA',
            `"Eu sou Tierra.\n\nFilho da Mãe Gaia. Guardião desta floresta há mais tempo do que qualquer rei ou castelo.\n\nMuitos vieram antes de ti. Ambiciosos. Apressados. Com espadas levantadas e corações vazios.\n\nNenhum passou.\n\nMas tu... tu carregas algo diferente. Um peso. Uma história ainda não terminada.\n\nProva que mereces chegar ao vilarejo. Não pela força — mas pela determinação.\n\nVenha. A floresta ouvirá."`,
            [
              { icon:'⚔️', text:'Enfrentar Tierra com honra!', action: () => {
                removeCaopOverlay();
                showEnemy(CAO_GUARDIAO);
                setStory('NARRADOR',
                  `Tierra se posiciona. As raízes ao redor dele se erguem lentamente do chão.\n\nIsso não é raiva. É um teste.`,
                  [
                    { icon:'⚔️', text:'BATALHAR — Provar que mereces passar!', action: () => startBattle(CAO_GUARDIAO) },
                    { icon:'💨', text:'Recuar... por enquanto.', action: () => {
                      removeCaopOverlay();
                      storyNode_explorar();
                    }},
                  ]
                );
              }},
              { icon:'💨', text:'Dar um passo atrás em silêncio...', action: () => {
                removeCaopOverlay();
                storyNode_explorar();
              }},
            ]
          );
        }},
        { icon:'🗺️', text:'Evitar o confronto por enquanto', action: storyNode_explorar },
      ]
    );
    return;
  }

  if (G.dogDefeated) {
    setStory('NARRADOR',
      `A Floresta Eterna está pacificada. Tierra foi derrotado. A floresta reconhece sua coragem — a passagem está aberta.\n\nA névoa baixa e o silêncio pesa. Em algum lugar além dos carvalhos, esperam maiores desafios.`,
      [
        { icon:'🗺️', text:'Explorar a floresta', action: storyNode_explorar },
        { icon:'⚔️', text:'Procurar mais inimigos', action: storyNode_buscarCombate },
        { icon:'🏘️', text:'Ir ao Vilarejo da Pedra Branca', action: storyNode_vilarejo },
      ]
    );
    return;
  }

  setStory('NARRADOR',
    `Você caminha pela Floresta Eterna de Clivor. A névoa baixa e sombras dançam entre os galhos retorcidos.\n\nCriaturas corrompidas pelo Lich vagam por aqui. Algo nesta floresta parece observar cada um de seus passos...`,
    [
      { icon:'⚔️', text:'Explorar e procurar inimigos', action: storyNode_explorar },
    ]
  );

  // Tutorial de boas-vindas: mostra uma única vez, na primeira chegada à floresta.
  if (!G.tutorialSeen && typeof startTutorial === 'function') {
    setTimeout(() => startTutorial(), 900);
  }
}

function storyNode_explorar() {
  setScene('floresta');
  hideEnemy();
  if (typeof hideStoryCutscene === 'function') hideStoryCutscene();

  // Evento único: Kael, o viajante ferido — dispara na primeira exploração,
  // independentemente do nível atual do jogador.
  if (!G.kaelEventTriggered) {
    storyNode_kaelEncontro();
    return;
  }

  // ── Floresta Maligna: evento noturno aleatório ──
  // Só pode disparar de noite (ciclo dia/noite da floresta), fora da
  // masmorra e se o modo ainda não estiver ativo. Se disparar, assume
  // o controle do fluxo (popup de aviso) e para a exploração normal aqui.
  if (typeof flMalignaTentarDisparo === 'function' && flMalignaTentarDisparo()) return;

  // ── Chance de encontrar recursos no mundo ──
  // Ervas: 15% (era 30% — reduzida para equilibrar com materiais)
  // Pó de Cristal: 20% (era 15% condicional — agora competitivo)
  // Pedra: 15% — novo evento de coleta no mundo
  const _roll = Math.random();
  let _tipo = 'combate';
  if (_roll < 0.15) _tipo = 'ervas';
  else if (_roll < 0.35) _tipo = 'cristal';
  else if (_roll < 0.50) _tipo = 'pedra';

  // Evita cair duas vezes seguidas no mesmo evento de coleta
  // (sensação de "travado" ao bater sempre na mesma mensagem de Continuar)
  if (_tipo !== 'combate' && _tipo === G._lastExploreType) {
    _tipo = 'combate';
  }
  G._lastExploreType = _tipo;

  if (_tipo === 'ervas')   { storyNode_encontrarErvas();   return; }
  if (_tipo === 'cristal') { storyNode_encontrarPoCristal(); return; }
  if (_tipo === 'pedra')   { storyNode_encontrarPedra();   return; }

  let enemy = sortearInimigoFloresta(G.player.level);
  // Os inimigos de mérito (Urso Pardo, Cobra Verde, Urso Kodiak, Gorila) já
  // nascem fortes pro nível de mérito que os libera — não aplica o
  // multiplicador de mérito em cima deles de novo, senão dobra a escala.
  if (typeof applyMeritModifierToEnemy === 'function' && !enemy.meritoMin) enemy = applyMeritModifierToEnemy(enemy);
  showEnemy(enemy);

  const opcoesExplorar = [
    { icon:'⚔️', text:`Lutar contra o ${enemy.name}!`, action: () => startBattle(enemy) },
    { icon:'💨', text:'Recuar', action: storyNode_floresta },
  ];
  if (G.mapUnlocked) opcoesExplorar.push({ icon:'🏘️', text:'Voltar ao Vilarejo', action: storyNode_vilarejo });

  setStory('NARRADOR',
    `Você avança com cautela entre as árvores retorcidas. De entre as sombras, um ${enemy.name} surge.`,
    opcoesExplorar
  );
}

// ─────────────────────────────────────────────────────────────
//  14.5 EVENTO — KAEL, O VIAJANTE FERIDO
//  Evento único (dispara na 1ª exploração). Kael é, na verdade,
//  originário da Cidade das Pedras (Kurosaki) — mas isso NUNCA é
//  dito aqui; ele evita falar de onde veio. A escolha do jogador
//  é lembrada em G.kaelHelped / G.kaelFate para uso futuro no
//  arco de Kurosaki (cidade_kurosaki.js): se abandonado, Kael
//  deve reaparecer por lá tendo perdido uma perna.
// ─────────────────────────────────────────────────────────────
// Overlay de fundo mostrado enquanto Kael está pedindo ajuda —
// sobrepõe a imagem da floresta sem alterar a cena persistida (setScene).
function _kaelShowOverlay() {
  let ov = document.getElementById('kael-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'kael-overlay';
    ov.style.cssText = `
      position:absolute; inset:0; z-index:5; pointer-events:none;
      background-image:url('Imagens/file_00000000b900720eb63880e1dc69a359.png');
      background-size:cover; background-position:center top;
      opacity:0; transition:opacity 0.8s ease;
    `;
    document.getElementById('scene-panel')?.appendChild(ov)
      || document.querySelector('.scene-panel')?.appendChild(ov);
  }
  requestAnimationFrame(() => { ov.style.opacity = '1'; });
}
function _kaelHideOverlay() {
  const ov = document.getElementById('kael-overlay');
  if (ov) { ov.style.opacity = '0'; setTimeout(() => ov.remove(), 800); }
}

// HP temporário e reforçado (600) apenas durante a matilha de lobos do
// resgate do Kael — o HUD mostra normalmente esse valor durante a luta,
// mas o HP/máximo real do jogador é restaurado assim que o evento termina
// (vitória, derrota ou fuga), sem afetar o resto do jogo.
function _kaelBoostHp() {
  if (!G._kaelHpBackup) {
    G._kaelHpBackup = { hp: G.player.hp, maxHp: G.player.maxHp };
  }
  G.player.maxHp = 600;
  G.player.hp = 600;
  if (typeof updateHUD === 'function') updateHUD();
}
function _kaelRestoreHp() {
  if (!G._kaelHpBackup) return;
  const backup = G._kaelHpBackup;
  G._kaelHpBackup = null;
  G.player.maxHp = backup.maxHp;
  G.player.hp = Math.min(backup.hp, backup.maxHp);
  if (typeof updateHUD === 'function') updateHUD();
}

function storyNode_kaelEncontro() {
  setScene('floresta');
  hideEnemy();
  _kaelShowOverlay();

  setStory('NARRADOR',
    `Um gemido baixo corta o silêncio da floresta.\n\nPerto de um carvalho retorcido, um jovem viajante está caído no chão, segurando a perna com força. O rosto contorcido de dor, roupas rasgadas pela queda.\n\nA poucos metros, quatro sombras rondam entre as árvores — olhos roxos brilhando na penumbra. Uma matilha de lobos. E estão se aproximando.\n\nO jovem levanta os olhos para você, assustado. Não parece de aqui — mas antes que possa reagir, ele já está falando.`,
    [
      { icon:'🤝', text:'Ajudar o viajante!', action: storyNode_kaelAjudar },
      { icon:'💨', text:'Ignorar e seguir sua jornada', action: storyNode_kaelIgnorar },
    ]
  );
}

function storyNode_kaelAjudar() {
  setStory('KAEL',
    `"P-por favor... me ajude! Eles vão... eles vão me pegar!"\n\nVocê se posiciona entre o jovem ferido e os lobos, que agora rosnam abertamente, prontos para atacar — não são dois, são quatro, cercando o jovem em silêncio.`,
    [
      { icon:'⚔️', text:'Enfrentar a matilha de 4 lobos!', action: () => {
        // Marca o desfecho já ao entrar na luta — mesmo numa eventual derrota,
        // o resgate já está em curso e Kael consegue fugir durante a confusão.
        G.kaelEventTriggered = true;
        G.kaelHelped = true;
        G.kaelFate = 'ajudado';

        _kaelHideOverlay();
        _kaelBoostHp();
        G._kaelLobosDerrotados = 0;
        _kaelIniciarLoboBatalha();
      }},
    ]
  );
}

// Lobo reforçado (HP 250, DEF reduzida) apenas para o resgate de Kael —
// não altera o Lobo das Sombras padrão usado no resto da floresta.
function _kaelLoboReforcado() {
  const loboBase = INIMIGOS_FLORESTA.find(e => e.id === 'lobo');
  return { ...loboBase, hp: 250, def: 1 };
}

// Encadeia as 4 lutas contra os lobos da matilha, uma por vez.
function _kaelIniciarLoboBatalha() {
  const lobo = _kaelLoboReforcado();
  G._dungeonBattleCallback = () => {
    G._kaelLobosDerrotados = (G._kaelLobosDerrotados || 0) + 1;
    if (G._kaelLobosDerrotados < 4) {
      setTimeout(_kaelIniciarLoboBatalha, 400);
    } else {
      storyNode_kaelVitoria();
    }
  };
  showEnemy(lobo);
  startBattle(lobo);
}

function storyNode_kaelVitoria() {
  _kaelRestoreHp();
  if (typeof addReputation === 'function') addReputation(5, 'Ajudou um viajante ferido na floresta');

  if (typeof showStoryCutscene === 'function') showStoryCutscene('Imagens/personagens/Picsart_26-07-10_23-21-15-991.png', { portrait: true });
  setStory('KAEL',
    `Os quatro lobos fogem ganindo entre as árvores, a matilha desfeita. O jovem solta a respiração que prendia, aliviado.\n\n"Obrigado... de verdade. Achei que ia morrer aqui.\n\nMeu nome é Kael. Eu... estava a caminho de casa, levando comida pra minha família, quando essa perna me traiu numa queda boba. E aí vieram os lobos.\n\nNão tenho muito a te oferecer agora, mas... se um dia passar por onde eu moro, pode aparecer. Não é grande coisa, mas a porta estará aberta.\n\nUm dia, prometo, eu retribuo isso."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_kaelVitoria2 },
    ],
    'Imagens/personagens/Picsart_26-07-10_23-21-15-991.png'
  );
}

function storyNode_kaelVitoria2() {
  if (typeof showStoryCutscene === 'function') showStoryCutscene('Imagens/personagens/Picsart_26-07-11_01-44-21-438.png', { portrait: true });
  setStory('KAEL',
    `Ele testa o peso na perna machucada, fazendo uma careta, mas consegue se firmar com a ajuda de um galho caído.\n\n"Não é a primeira vez que uma queda idiota quase me custa caro... mas dessa vez tive sorte de cruzar com alguém como você.\n\nSe me permite perguntar — pra onde segue agora? Essa floresta não é lugar pra se andar sozinho, ainda mais à noite."`,
    [
      { icon:'💬', text:'"Estou de passagem, só isso."', action: storyNode_kaelVitoria3 },
      { icon:'💬', text:'"Ainda não sei ao certo."', action: storyNode_kaelVitoria3 },
      { icon:'💬', text:'"Vou seguir explorando essas terras."', action: storyNode_kaelVitoria3 },
    ],
    'Imagens/personagens/Picsart_26-07-11_01-44-21-438.png'
  );
}

function storyNode_kaelVitoria3() {
  if (typeof showStoryCutscene === 'function') showStoryCutscene('Imagens/personagens/Picsart_26-07-11_01-44-33-870.png', { portrait: true });
  setStory('KAEL',
    `Kael sorri de leve, ajeitando a bolsa surrada nas costas.\n\n"Bom... onde quer que você vá, cuide-se. Gente como você é rara por aqui — a maioria só olha pro que pode tirar de uma situação, não pro que pode dar.\n\nNão esquece meu nome, tá? Um dia isso vai fazer diferença."`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_kaelDespedida },
    ],
    'Imagens/personagens/Picsart_26-07-11_01-44-33-870.png'
  );
}

function storyNode_kaelDespedida() {
  if (typeof showStoryCutscene === 'function') showStoryCutscene('Imagens/personagens/Picsart_26-07-11_01-45-08-789.png', { portrait: true });
  setStory('KAEL',
    `Ele ajusta a postura, testando os primeiros passos com cuidado.\n\n"Bem... é melhor eu ir andando enquanto ainda há luz. Obrigado, de verdade. Até a próxima."\n\nCom um último aceno, Kael começa a se afastar, mancando entre as árvores.`,
    [
      { icon:'▶', text:'Continuar', action: () => {
        if (typeof hideStoryCutscene === 'function') hideStoryCutscene();
        setStory('NARRADOR',
          `Kael desaparece entre os troncos na direção onde o sol se põe.\n\nVocê fica sozinho na floresta novamente — mas com a sensação de que esse encontro não foi por acaso.`,
          [
            { icon:'⚔️', text:'Continuar explorando', action: storyNode_explorar },
          ]
        );
      }},
    ],
    'Imagens/personagens/Picsart_26-07-11_01-45-08-789.png'
  );
}

function storyNode_kaelIgnorar() {
  G.kaelEventTriggered = true;
  G.kaelHelped = false;
  G.kaelFate = 'abandonado';
  _kaelHideOverlay();
  if (typeof addReputation === 'function') addReputation(-5, 'Abandonou um viajante ferido aos lobos');

  setStory('NARRADOR',
    `Você desvia o olhar e segue seu caminho. Atrás de você, o jovem grita por ajuda — o som se perde entre os galhos conforme você se afasta.\n\nVocê não sabe o nome dele. Mas ele, de algum jeito, vai lembrar do seu rosto.`,
    [
      { icon:'⚔️', text:'Continuar explorando', action: storyNode_explorar },
    ]
  );
}

// ── Nodo: coleta de ervas no mundo ──
function storyNode_encontrarErvas() {
  const ervasDisponiveis = [
    { id:'erva_cura',     name:'Erva Medicinal',    icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', desc:'Recupera 15 HP.',      type:'consumível', weight:0.2, qty:1 },
    { id:'erva_cura',     name:'Erva Medicinal',    icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', desc:'Recupera 15 HP.',      type:'consumível', weight:0.2, qty:2 },
    { id:'erva_rara',     name:'Erva da Névoa',     icon:'🍃', imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-36-55-008.png', desc:'Recupera 30 HP. Rara.', type:'consumível', weight:0.2, qty:1 },
  ];
  const pesos = [0.55, 0.30, 0.15]; // probabilidades relativas
  const rand = Math.random();
  let escolha = ervasDisponiveis[0];
  if (rand > 0.85) escolha = ervasDisponiveis[2]; // erva rara 15%
  else if (rand > 0.55) escolha = ervasDisponiveis[1]; // 2x erva comum

  const qtd = escolha.qty || 1;
  const descTexto = qtd > 1
    ? `Você encontra ${qtd} ${escolha.name}s crescendo entre as raízes.\n\nAs folhas brilham com energia vital — úteis para curar e criar poções.`
    : escolha.id === 'erva_rara'
      ? `Entre as sombras, uma planta incomum chama sua atenção — a <em>Erva da Névoa</em>, conhecida por seus poderes curativos mais intensos.`
      : `Você avista um arbusto de ${escolha.name} entre as pedras musgosas. Plantas medicinais são sempre bem-vindas numa jornada.`;

  // Coleta automática
  const item = { ...escolha };
  addItem(item, qtd);
  notify(`🌿 ${qtd > 1 ? qtd + '× ' : ''}${escolha.name} coletada!`, 'green');
  addLog(`Coletou: ${qtd > 1 ? qtd + '× ' : ''}${escolha.name}.`, 'heal');

  setStory('NARRADOR', descTexto, [
    { icon:'👣', text:'Continuar explorando', action: storyNode_explorar },
  ]);
}

// ── Nodo: encontrar Pó de Cristal no mundo ──
function storyNode_encontrarPoCristal() {
  const qty = Math.random() < 0.55 ? 2 : 1;
  addItem({ id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', type:'material', desc:'Pó mágico de cristal. Usado em craft de poções de MP.', weight:0.2 }, qty);
  notify(`💎 ${qty > 1 ? qty + '× ' : ''}Pó de Cristal coletado!`, 'blue');
  addLog(`Coletou: ${qty > 1 ? qty + '× ' : ''}Pó de Cristal.`, 'info');
  setStory('NARRADOR',
    `Entre as pedras do caminho, fragmentos de cristal brilham com uma luz suave. Você coleta ${qty > 1 ? qty + '× ' : ''}Pó de Cristal automaticamente.`,
    [
      { icon:'👣', text:'Continuar', action: storyNode_explorar },
    ]
  );
}


// ── Nodo: encontrar Pedra no mundo ──
function storyNode_encontrarPedra() {
  const qty = Math.random() < 0.35 ? 2 : 1;
  addItem({ id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', type:'material', desc:'Material de craft.', weight:0.3 }, qty);
  notify(`🪨 ${qty > 1 ? qty + '× ' : ''}Pedra coletada!`, 'gold');
  addLog(`Coletou: ${qty > 1 ? qty + '× ' : ''}Pedra.`, 'info');
  setStory('NARRADOR',
    `Entre os galhos e raízes do caminho, pedras de formato incomum chamam sua atenção. Você as recolhe — podem ser úteis para craft.`,
    [
      { icon:'👣', text:'Continuar', action: storyNode_explorar },
    ]
  );
}
window.storyNode_encontrarPedra = storyNode_encontrarPedra;

function storyNode_buscarCombate() {
  // Floresta Maligna ativa: "procurar inimigos" também gera inimigo da floresta maligna
  if (G._florestaMalignaAtiva && typeof flMalignaExplorar === 'function') { flMalignaExplorar(); return; }
  let enemy = sortearInimigoFloresta(G.player.level);
  if (typeof applyMeritModifierToEnemy === 'function' && !enemy.meritoMin) enemy = applyMeritModifierToEnemy(enemy);
  showEnemy(enemy);
  const opcoesCombate = [
    { icon:'⚔️', text:`Batalhar contra o ${enemy.name}!`, action: () => startBattle(enemy) },
    { icon:'↩', text:'Reconsiderar', action: storyNode_floresta },
  ];
  if (G.mapUnlocked) opcoesCombate.push({ icon:'🏘️', text:'Voltar ao Vilarejo', action: storyNode_vilarejo });
  setStory('NARRADOR',
    `Você procura novos desafios na floresta. Um ${enemy.name} surge entre as sombras.`,
    opcoesCombate
  );
}

function storyNode_afterBattle(enemy) {
  // Sem texto de vitória (XP/moedas já aparecem no HUD) — só as opções.
  // Floresta Maligna ativa: só continuar lutando — sem descansar, sem sair da floresta
  if (G._florestaMalignaAtiva && typeof flMalignaExplorar === 'function') {
    setStory('NARRADOR', '', [
      { icon:'⚔️', text:'Continuar explorando', action: flMalignaExplorar },
    ]);
    return;
  }
  const afterText = '';

  const opcoesAfterBattle = [
    { icon:'🗺️', text:'Continuar explorando', action: storyNode_explorar },
    { icon:'⚔️', text:'Procurar mais inimigos', action: storyNode_buscarCombate },
  ];
  // "Descansar" nem sempre aparece — só uma chance de 37% por batalha, pra não
  // virar uma opção disponível toda vez (dava pra abusar do descanso à vontade).
  if (Math.random() < 0.37) {
    opcoesAfterBattle.splice(1, 0, { icon:'🔥', text:'Descansar um momento', action: storyNode_descansar });
  }

  setStory('NARRADOR', afterText, opcoesAfterBattle);
}

// ── Alerta de emboscada dos ratos ──
function mostrarEmboscadaAlert(icone, titulo, mensagem, ouro, onClose) {
  const el = document.getElementById('emboscada-alert');
  if (!el) { if (onClose) onClose(); return; }
  document.getElementById('emboscada-icon').textContent  = icone;
  document.getElementById('emboscada-title').textContent = titulo;
  document.getElementById('emboscada-msg').textContent   = mensagem;
  document.getElementById('emboscada-gold').textContent  = ouro;
  el.classList.add('active');
  el._onClose = onClose || null;

  // Reinicia a animação da barra de progresso
  const bar = document.getElementById('emboscada-timer-bar');
  if (bar) {
    bar.style.animation = 'none';
    bar.offsetHeight; // reflow para reiniciar
    bar.style.animation = 'emboscada-timer-shrink 4s linear forwards';
  }

  // Auto-fechar após 4 segundos
  if (el._autoCloseTimer) clearTimeout(el._autoCloseTimer);
  el._autoCloseTimer = setTimeout(() => {
    fecharEmboscadaAlert();
  }, 4000);
}
function fecharEmboscadaAlert() {
  const el = document.getElementById('emboscada-alert');
  if (!el) return;
  if (el._autoCloseTimer) { clearTimeout(el._autoCloseTimer); el._autoCloseTimer = null; }
  el.classList.remove('active');
  if (el._onClose) { el._onClose(); el._onClose = null; }
}
window.fecharEmboscadaAlert = fecharEmboscadaAlert;

function storyNode_descansar() {
  // Floresta Maligna: descansar é proibido (é isso que torna o modo arriscado)
  if (G._florestaMalignaAtiva && typeof flMalignaExplorar === 'function') {
    if (typeof notify === 'function') notify('🚫 Não é possível descansar na Floresta Maligna', 'red');
    flMalignaExplorar();
    return;
  }
  const p = G.player;

  // ── Evento: Ratos Ladrões (30% de chance, só se tiver moedas) ──
  const ratosAtacam = Math.random() < 0.30 && p.gold > 0;

  if (ratosAtacam) {
    // Quanto roubam: entre 10% e 35% do ouro atual, mínimo 1
    const pct        = 0.10 + Math.random() * 0.25;
    const roubado    = Math.max(1, Math.floor(p.gold * pct));
    p.gold           = Math.max(0, p.gold - roubado);
    updateHUD();
    addLog(`🐀 Ratos ladrões roubaram ${roubado}◈ enquanto dormia!`, 'red');

    // Variações de mensagem para não repetir sempre
    const variantes = [
      `Você fecha os olhos por um momento... mas quando acorda, nota que sua bolsa está mais leve.\n\nPegadas minúsculas na lama. Os ratos da floresta agiram rápido — e já sumiram nas sombras.`,
      `Um farfalhar de folhas te acorda. Tarde demais.\n\nUma revoada de ratos esquiva entre as pedras, carregando moedas nos dentes. Você tenta alcançá-los — inútil. Foram rápidos demais.`,
      `Você dormia quando sentiu um peso estranho. Os ratos já escapavam floresta adentro.\n\nPequenos, sorrateiros e sem vergonha. A floresta tem seus próprios ladrões.`,
    ];
    const msg = variantes[Math.floor(Math.random() * variantes.length)];

    mostrarEmboscadaAlert(
      '🐀',
      'EMBOSCADA!',
      msg,
      `◈ −${roubado} moedas roubadas  •  Restam: ${p.gold}◈`,
      () => {
        // Depois de fechar o alerta, aplica a cura normalmente e continua
        _aplicarCuraDescanso(p);
      }
    );
    return;
  }

  // Sem ratos — descanso normal
  _aplicarCuraDescanso(p);
}

function _aplicarCuraDescanso(p) {
  const heal = Math.floor(p.maxHp * 0.2);
  const mpRestore = Math.floor(p.maxMp * 0.3);
  p.hp = Math.min(p.maxHp, p.hp + heal);
  if (p.maxMp > 0) p.mp = Math.min(p.maxMp, p.mp + mpRestore);

  // BUG-DESCANSO FIX: restaurar AP para classes guerreiras
  let apRestore = 0;
  if (p.maxAp > 0) {
    apRestore = Math.floor(p.maxAp * 0.5);
    p.ap = Math.min(p.maxAp, (p.ap || 0) + apRestore);
  }

  // Meditação do Monge: melhora cura no descanso
  if (p._talent_meditation) {
    const bonusHp = Math.floor(p.maxHp * 0.15);
    const bonusMp = Math.floor(p.maxMp * 0.10);
    p.hp = Math.min(p.maxHp, p.hp + bonusHp);
    if (p.maxMp > 0) p.mp = Math.min(p.maxMp, p.mp + bonusMp);
  }

  // ── Descansar = dormir um pouco: o relógio do jogo avança de verdade ──
  // Entre 3 e 7 minutos de "tempo de jogo" (o ciclo dia/noite todo dura
  // 20 min), então um descanso pode empurrar de manhã pra tarde, ou até
  // fazer escurecer, sem precisar esperar o tempo real passar.
  if (typeof avancarTempoJogo === 'function') {
    const minutosDeJogo = 3 + Math.floor(Math.random() * 5); // 3 a 7
    avancarTempoJogo(minutosDeJogo * 60 * 1000);
  }

  updateHUD();
  notify(`🔥 Descansou: +${heal} HP`, 'green');
  if (apRestore > 0) notify(`⚡ +${apRestore} AP recuperados!`, 'gold');
  addLog(`Descanso: +${heal} HP.${apRestore > 0 ? ' +' + apRestore + ' AP.' : ''}`, 'heal');

  const apMsg = apRestore > 0 ? `\n+${apRestore} AP recuperados.` : '';
  hideEnemy();
  setStory('NARRADOR',
    `Você acende uma pequena fogueira entre as pedras. A chama afasta a névoa.\n\n+${heal} HP recuperados.${p.maxMp > 0 ? `\n+${mpRestore} MP restaurados.` : ''}${apMsg}`,
    [
      { icon:'▶', text:'Retomar a jornada', action: storyNode_floresta },
    ]
  );
}

function storyNode_vitoriaBoss() {
  // Cena: Tierra caindo, folhas ao redor, diálogo final
  hideEnemy();

  // Pequena pausa dramática antes do diálogo
  setStory('TIERRA',
    `Tierra afunda lentamente os joelhos no chão.\n\nAs raízes que o envolviam se desfazem — voltando à terra, silenciosas como sempre estiveram.\n\nEle levanta o olhar. Não há derrota naqueles olhos âmbar. Há... reconhecimento.`,
    [
      { icon:'🌿', text:'Aproximar-se em silêncio...', action: () => {
        setStory('TIERRA',
          `"...Tu passaste no teste.\n\nNão porque és o mais forte. Mas porque não fuiste — e isso, viajante, é mais raro do que qualquer lâmina.\n\nEu guardei esta floresta por séculos. Vi heróis cheios de arrogância caírem aqui. Vi covardes fugirem na primeira pancada.\n\nMas tu ficaste.\n\nO Vilarejo da Pedra Branca está à frente. As pessoas lá precisam de alguém como tu — alguém que não abandona quando fica difícil.\n\nO Lich corrompeu o castelo e a névoa avança. O que espera além da floresta é muito pior do que eu.\n\nMas a Mãe Gaia escolheu bem desta vez.\n\n...Vai. E não deixes o fardo cair."`,
          [
            { icon:'🌿', text:'"Obrigado, Tierra. Nunca esquecerei isso."', action: () => {
              setStory('TIERRA',
                `Tierra fecha os olhos.\n\nUm último vento atravessa a floresta — trazendo o perfume de flores que você nunca viu antes.\n\nAs árvores se abrem. Uma trilha de pedras iluminadas revela o caminho.\n\nAo longe, entre as copas das árvores, você avista as primeiras luzes do <strong>Vilarejo da Pedra Branca</strong>.\n\n✦ Bônus permanente concedido pela floresta\n✦ Amuleto de Tierra adicionado à bolsa\n✦ O vilarejo aguarda...`,
                [
                  { icon:'🏘️', text:'Seguir para o Vilarejo da Pedra Branca', action: storyNode_pos_tierra },
                  { icon:'🌿', text:'Explorar a floresta pacificada antes', action: storyNode_floresta },
                ]
              );
            }},
          ]
        );
      }},
    ]
  );
}

function storyNode_pos_tierra() {
  G.tierraDefeated = true;
  if (!G.mapUnlocked) {
    G.mapUnlocked = true;
    if (typeof addReputation === 'function') addReputation(20, 'Chegou ao Vilarejo da Pedra Branca');
  }
  setScene('floresta');
  setStory('NARRADOR',
    `A floresta de Clivor está em paz pela primeira vez em muito tempo.\n\nO Amuleto de Tierra pulsa suavemente na sua bolsa — como se a floresta ainda estivesse olhando por você.\n\nAo longe, entre as copas das árvores, você avista as primeiras luzes do <strong>Vilarejo da Pedra Branca</strong>.\n\n<em>— Fim do Capítulo I: A Floresta Eterna —</em>`,
    [
      { icon:'🏘️', text:'Seguir para o Vilarejo da Pedra Branca', action: storyNode_vilarejo },
      { icon:'⚔️', text:'Treinar mais antes de avançar', action: storyNode_buscarCombate },
    ]
  );
}
