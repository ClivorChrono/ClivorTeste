// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — game.js
//  Versão 2 — HTML e JS separados, código limpo e organizado
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. ESTADO GLOBAL DO JOGO (G)
// ─────────────────────────────────────────────────────────────
const SAVE_VERSION = 2;

let G = {
  saveSlot: 1,
  location: 'floresta',
  dogDefeated: false,
  tierraDefeated: false,
  mapUnlocked: false,
  reputation: 0,
  timeIndex: 1,            // 0=Amanhecer 1=Manhã 2=Tarde 3=Anoitecer 4=Noite 5=Meia-Noite
  castle: { enemiesKilled: 0 },
  enemiesDefeated: 0,
  inBattle: false,
  player: {
    name: 'Aventureiro',
    class: '',
    classData: null,
    level: 1,
    xp: 0,
    xpNext: 100,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    ap: 0,
    maxAp: 0,
    atk: 10,
    def: 5,
    spd: 5,
    mag: 0,
    gold: 0,
    kills: 0,
    deaths: 0,
    inventory: [],
    equippedWeapon: null,
    equipped: {},
    maxWeight: 50,
    statusEffects: [],
    talents: [],           // IDs de talentos comprados
    talentPtTotal: 0,      // PT acumulados (para exibição)
    battlesTotal: 0,
    equippedSkills: [],   // chaves de skills ativas em batalha: 'b0','b1','b2' (base) ou 't0','t1'... (talento)
  }
};

// ─────────────────────────────────────────────────────────────
//  2. SISTEMA DE ÁUDIO
// ─────────────────────────────────────────────────────────────
const AudioSys = {
  current: null,
  muted: false,
  volume: 0.6,
  sfxVolume: 0.8,
  sfxMuted: false,
  _unlocked: false,
  _pending: null,
  tracks: {},
  // Playlist da floresta/vilarejo: 4 faixas em ordem aleatória
  _florestaTracks: ['flauta', 'bamboo', 'river', 'ascent'],
  _florestaIdx: 0,
  _florestaActive: false,
  // Playlist exclusiva da Dungeon das Sombras: 3 faixas, ordem fixa, sequencial, em loop
  _dungeonTracks: ['gloria', 'sont', 'sullengate'],
  _dungeonIdx: 0,
  _dungeonActive: false,
  _fadeMs: 1500, // duração do crossfade em ms

  init() {
    this.tracks = {
      intro:    document.getElementById('audio-intro'),
      floresta: document.getElementById('audio-floresta'),
      flauta:   document.getElementById('audio-flauta'),
      bamboo:   document.getElementById('audio-bamboo'),
      river:    document.getElementById('audio-river'),
      ascent:   document.getElementById('audio-ascent'),
      gloria:      document.getElementById('audio-gloria'),
      sont:        document.getElementById('audio-sont'),
      sullengate:  document.getElementById('audio-sullengate'),
    };
    const savedVol     = localStorage.getItem('clivor_volume');
    const savedMuted   = localStorage.getItem('clivor_muted');
    const savedSfxVol  = localStorage.getItem('clivor_sfx_volume');
    const savedSfxMuted= localStorage.getItem('clivor_sfx_muted');
    if (savedVol    !== null) this.volume    = parseFloat(savedVol) / 100;
    if (savedMuted  !== null) this.muted     = savedMuted === '1';
    if (savedSfxVol !== null) this.sfxVolume = parseFloat(savedSfxVol) / 100;
    if (savedSfxMuted !== null) this.sfxMuted = savedSfxMuted === '1';

    // Embaralhar playlist para variedade
    this._shufflePlaylist();

    // Quando uma faixa da playlist termina, faz crossfade para a próxima
    const self = this;
    this._florestaTracks.forEach(id => {
      const el = document.getElementById('audio-' + id);
      if (el) el.addEventListener('ended', () => {
        if (self._florestaActive) self._nextFlorestaTrack();
      });
    });
    // Dungeon das Sombras: faixas tocam uma após a outra, em loop infinito
    this._dungeonTracks.forEach(id => {
      const el = document.getElementById('audio-' + id);
      if (el) el.addEventListener('ended', () => {
        if (self._dungeonActive) self._nextDungeonTrack();
      });
    });
  },

  // Embaralha a playlist (Fisher-Yates)
  _shufflePlaylist() {
    const arr = this._florestaTracks;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  // Crossfade suave entre duas faixas
  _crossfade(outName, inName, cb) {
    const outTrack = outName ? this.tracks[outName] : null;
    const inTrack  = inName  ? this.tracks[inName]  : null;
    const targetVol = this.muted ? 0 : this.volume;
    const steps = 30;
    const interval = this._fadeMs / steps;
    let step = 0;

    if (inTrack) {
      inTrack.volume = 0;
      inTrack.currentTime = 0;
      inTrack.play().catch(() => {});
    }

    const fade = setInterval(() => {
      step++;
      const ratio = step / steps;
      if (outTrack) outTrack.volume = Math.max(0, targetVol * (1 - ratio));
      if (inTrack)  inTrack.volume  = Math.min(targetVol, targetVol * ratio);
      if (step >= steps) {
        clearInterval(fade);
        if (outTrack) { outTrack.pause(); outTrack.currentTime = 0; outTrack.volume = targetVol; }
        if (cb) cb();
      }
    }, interval);
  },

  _nextFlorestaTrack() {
    const oldName = this._florestaTracks[this._florestaIdx];
    this._florestaIdx = (this._florestaIdx + 1) % this._florestaTracks.length;
    // Re-embaralha ao completar um ciclo
    if (this._florestaIdx === 0) this._shufflePlaylist();
    const newName = this._florestaTracks[this._florestaIdx];
    this.current = newName;
    this._crossfade(oldName, newName);
  },

  _startFlorestaPlaylist() {
    this._florestaActive = true;
    this._dungeonActive = false;
    this._florestaIdx = 0;
    this._shufflePlaylist();
    const name  = this._florestaTracks[0];
    const track = this.tracks[name];
    if (!track) return;
    // Para tudo antes de começar
    Object.values(this.tracks).forEach(t => { if (t) { t.pause(); t.currentTime = 0; } });
    this.current = name;
    track.volume = this.muted ? 0 : this.volume;
    track.play().catch(() => {});
  },

  // Avança sequencialmente para a próxima faixa da Dungeon das Sombras (sem embaralhar, loop infinito)
  _nextDungeonTrack() {
    const oldName = this._dungeonTracks[this._dungeonIdx];
    this._dungeonIdx = (this._dungeonIdx + 1) % this._dungeonTracks.length;
    const newName = this._dungeonTracks[this._dungeonIdx];
    this.current = newName;
    this._crossfade(oldName, newName);
  },

  _startDungeonPlaylist() {
    this._dungeonActive = true;
    this._florestaActive = false;
    this._dungeonIdx = 0;
    const name  = this._dungeonTracks[0];
    const track = this.tracks[name];
    if (!track) return;
    // Para tudo antes de começar
    Object.values(this.tracks).forEach(t => { if (t) { t.pause(); t.currentTime = 0; } });
    this.current = name;
    track.volume = this.muted ? 0 : this.volume;
    track.play().catch(() => {});
  },

  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    if (this._pending) {
      const p = this._pending;
      this._pending = null;
      this.play(p);
    }
  },

  play(name) {
    if (!this._unlocked) { this._pending = name; return; }
    // 'floresta' e 'intro' (vilarejo) disparam a playlist
    if (name === 'floresta' || name === 'intro') {
      if (!this._florestaActive) {
        // Se havia música tocando, faz crossfade para primeira da playlist
        if (this.current && this.tracks[this.current]) {
          this._florestaActive = true;
          this._dungeonActive = false;
          this._florestaIdx = 0;
          this._shufflePlaylist();
          const newName = this._florestaTracks[0];
          const self = this;
          this._crossfade(this.current, newName, () => { self.current = newName; });
        } else {
          this._startFlorestaPlaylist();
        }
      }
      return;
    }
    // 'dungeonSombras' dispara a playlist exclusiva da Dungeon das Sombras
    if (name === 'dungeonSombras') {
      if (!this._dungeonActive) {
        if (this.current && this.tracks[this.current]) {
          this._dungeonActive = true;
          this._florestaActive = false;
          this._dungeonIdx = 0;
          const newName = this._dungeonTracks[0];
          const self = this;
          this._crossfade(this.current, newName, () => { self.current = newName; });
        } else {
          this._startDungeonPlaylist();
        }
      }
      return;
    }
    this._florestaActive = false;
    this._dungeonActive = false;
    this._doPlay(name);
  },

  _doPlay(name) {
    const track = this.tracks[name];
    if (!track || this.current === name) return;
    const oldName = this.current;
    this.current = name;
    this._crossfade(oldName, name);
  },

  stop() {
    this._florestaActive = false;
    this._dungeonActive = false;
    const self = this;
    if (this.current && this.tracks[this.current]) {
      const outTrack = this.tracks[this.current];
      const targetVol = this.volume;
      const steps = 20;
      const interval = 1000 / steps;
      let step = 0;
      const fade = setInterval(() => {
        step++;
        outTrack.volume = Math.max(0, targetVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fade);
          outTrack.pause();
          outTrack.currentTime = 0;
          outTrack.volume = targetVol;
          self.current = null;
        }
      }, interval);
    } else {
      this.current = null;
    }
  }
};

// Desbloquear áudio na primeira interação
(function () {
  const unlock = () => {
    AudioSys.unlock();
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
})();

// ─────────────────────────────────────────────────────────────
//  3. DADOS — CLASSES
//  ⚠ DEFINIDAS EM classes.js — NÃO EDITAR AQUI.
//  palDinh.js lê window.CLASSES, que é exportado por classes.js.
//  Para adicionar/modificar uma classe, edite classes.js.
// ─────────────────────────────────────────────────────────────
// (CLASSES é injetado via window.CLASSES por classes.js,
//  carregado antes deste arquivo no gat-1.html)

// ─────────────────────────────────────────────────────────────
//  4. DADOS — INIMIGOS DA FLORESTA (por nível)
// ─────────────────────────────────────────────────────────────
// Cada inimigo tem: minLevel, maxLevel (intervalo de spawn)
// img: caminho relativo à pasta Imagens/personagens/
const INIMIGOS_FLORESTA = [
  // ── LEVEL 1 ─────────────────────────────────────
  {
    id: 'rato',
    name: 'Rato das Sombras',
    icon: '🐀',
    img: 'Imagens/personagens/ratin.png',
    elemento: 'sombra',
    hp: 15, atk: 5, def: 1,
    xp: 10, gold: 4,
    minLevel: 1, maxLevel: 99,
    desc: 'Um rato enorme e fétido, corrompido pela névoa do Lich. Seus dentes afiados rasgam com agilidade traiçoeira.',
    loot: [
      { id:'pelo_rato', name:'Pelo Rançoso', icon:'🐾', chance:0.6, weight:0.1, type:'material' },
      { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.15, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.35, weight:0.3, type:'material', desc:'Material de craft.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.28, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  {
    id: 'aranha',
    name: 'Aranha Venenosa',
    icon: '🕷️',
    img: 'Imagens/personagens/aranha.png',
    elemento: 'veneno',
    hp: 22, atk: 7, def: 2,
    xp: 14, gold: 6,
    minLevel: 1, maxLevel: 99,
    desc: 'Aranha negra do tamanho de um gato. Seu veneno causa dormência e visão turva. Tece armadilhas nas sombras.',
    loot: [
      { id:'veneno_aranha', name:'Glândula Venenosa', icon:'☠️', chance:0.55, weight:0.1, type:'material' },
      { id:'teia_aranha', name:'Teia', icon:'🕸️', imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_21-22-07-911.png', chance:0.45, weight:0.05, type:'material', desc:'Fio de teia resistente, fiado pela aranha. Material de craft.' },
      { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.12, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.32, weight:0.3, type:'material', desc:'Material de craft.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.28, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  {
    id: 'corvo',
    name: 'Corvo das Cinzas',
    icon: '🐦‍⬛',
    img: 'Imagens/personagens/corvo.png',
    elemento: 'vento',
    hp: 18, atk: 9, def: 2,
    xp: 13, gold: 7,
    minLevel: 1, maxLevel: 99,
    desc: 'Corvo mensageiro do Castelo Maldito. Suas penas escuras cortam como lâminas e seus grasnidos desorientam.',
    loot: [
      { id:'pena_corvo', name:'Pena de Corvo', icon:'🪶', imgSrc:'Imagens/icones/materiais/penC.png', chance:0.7, weight:0.1, type:'material', desc:'Pena negra de um corvo das cinzas.' },
      { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.10, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.25, weight:0.3, type:'material', desc:'Material de craft.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.22, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  // ── LEVEL 1–2 ───────────────────────────────────
  {
    id: 'cobra',
    name: 'Serpente das Trevas',
    icon: '🐍',
    img: 'Imagens/personagens/cobra.png',
    elemento: 'veneno',
    hp: 26, atk: 8, def: 3,
    xp: 16, gold: 8,
    minLevel: 1, maxLevel: 99,
    desc: 'Cobra colossal que rasteja silenciosa entre as raízes podres. Um único bote pode ser fatal.',
    loot: [{ id:'pele_cobra', name:'Pele de Cobra', icon:'🐍', imgSrc:'Imagens/icones/materiais/Peledeco.png', chance:0.5, weight:0.2, type:'material', desc:'Escamas finas de uma cobra.' }],
  },
  {
    id: 'lobo',
    name: 'Lobo das Sombras',
    icon: '🐺',
    img: 'Imagens/personagens/lobo.png',
    elemento: 'sombra',
    hp: 30, atk: 10, def: 3,
    xp: 18, gold: 9,
    minLevel: 1, maxLevel: 99,
    desc: 'Lobo corrompido pela névoa do Senhor das Cinzas. Seus olhos brilham com um roxo sinistro e ataca em manadas.',
    loot: [{ id:'pele_lobo', name:'Pele de Lobo', icon:'🐾', imgSrc:'Imagens/icones/materiais/pele_lobo.png', chance:0.5, weight:0.5, type:'material', desc:'Pele de um lobo selvagem.' }],
  },
];

// Retorna pool de inimigos filtrado pelo level atual do jogador
function getPoolPorLevel(level) {
  return INIMIGOS_FLORESTA.filter(e => level >= e.minLevel && level <= e.maxLevel);
}

// BOSS DO LEVEL 2 — Cão Guardião Ancestral
const CAO_GUARDIAO = {
  id: 'tierra',
  name: 'Tierra — Guardião da Floresta',
  icon: '🐺',
  hp: 110,
  atk: 20,
  def: 10,
  xp: 90,
  gold: 45,
  isBoss: true,
  elemento: 'planta',
  desc: 'Tierra é o guardião eterno da Floresta de Clivor — filho da Mãe Gaia, forjado de raiz, pedra e vento. Não ataca por ódio. Ataca porque você ainda não provou que merece passar.',
  img: 'Imagens/personagens/gain.png',
  loot: [],
};

// ─────────────────────────────────────────────────────────────
//  5. SISTEMA DE TELAS
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
}

// ─────────────────────────────────────────────────────────────
//  6. INTRO NARRATIVA
// ─────────────────────────────────────────────────────────────
function iniciarIntroNarrativa() {
  AudioSys.play('intro');
  document.getElementById('intro-fase-titulo').style.display = 'none';
  const fase = document.getElementById('intro-fase-narrativa');
  fase.style.display = 'block';

  const imagens = ['Imagens/c1.png','Imagens/c2.png','Imagens/c3.png','Imagens/c3.png'];
  const paragrafos = [
    "Há séculos, o Reino de Clivor prosperava sob a luz e a harmonia das divindades. Mas a ambição humana é uma névoa que cega até os mais sábios. O Rei Valdris, outrora um governante justo, cedeu aos sussurros dos Pergaminhos Proibidos, quebrando os selos ancestrais para alcançar a imortalidade... tornando-se um <span class='destaque-lich'>Lich</span>.",
    "Com a sua queda, o Castelo outrora glorioso transformou-se no Castelo Maldito, uma fortaleza envolta numa <span class='destaque-nevoa'>névoa roxa e perversa</span> que corrompe tudo o que toca. Monstros ergueram-se das sombras e o caos espalhou-se pela terra.",
    "Agora, resta apenas um último bastião de esperança: o Vilarejo da Pedra Branca, protegido pelo <span class='destaque-trindade'>Templo da Divina Trindade</span>. As profecias dizem que uma alma corajosa cruzará a Floresta Eterna para desafiar o lorde das trevas e restaurar o equilíbrio.",
    "A névoa avança... O teu destino começa aqui.",
  ];
  const labels = ['PRÓLOGO', 'CAPÍTULO I', 'CAPÍTULO II', 'CAPÍTULO III'];

  const textoEl  = document.getElementById('texto-narrativo-intro');
  const botoesEl = document.getElementById('container-botoes-intro');
  const numEl    = document.getElementById('intro-cena-num');
  const faixaEl  = document.getElementById('intro-faixa-texto');
  let indice = 0;
  let activeLayer = 'a';

  // Botão SKIP fixo
  const skipBtn = document.createElement('button');
  skipBtn.id = 'btn-skip-narrativa';
  skipBtn.textContent = 'SKIP ›';
  skipBtn.style.cssText = 'position:fixed;top:18px;right:18px;z-index:999;background:rgba(0,0,0,0.55);border:1px solid rgba(200,150,10,0.35);color:rgba(200,150,10,0.7);font-family:\'Noto Serif JP\',serif;font-size:0.7rem;letter-spacing:3px;padding:7px 14px;cursor:pointer;';
  skipBtn.onclick = () => { skipBtn.remove(); mostrarCapaFinal(); };
  fase.appendChild(skipBtn);

  imagens.forEach(src => { const i = new Image(); i.src = src; });

  function mostrarCena() {
    const layerAtual = document.getElementById('intro-layer-' + activeLayer);
    const imgAtual   = document.getElementById('intro-img-' + activeLayer);
    const nextLayer  = activeLayer === 'a' ? 'b' : 'a';
    const layerProx  = document.getElementById('intro-layer-' + nextLayer);
    const imgProx    = document.getElementById('intro-img-' + nextLayer);

    faixaEl.style.opacity = '0';
    botoesEl.innerHTML = '';
    textoEl.innerHTML  = '';

    if (indice === 0) {
      imgAtual.src = imagens[0];
      imgAtual.style.transform = 'scale(1.08)';
      layerAtual.style.opacity = '1';
      requestAnimationFrame(() => requestAnimationFrame(() => { imgAtual.style.transform = 'scale(1)'; }));
      setTimeout(() => mostrarTexto(), 500);
      return;
    }

    imgProx.src = imagens[indice];
    imgProx.style.transform = 'scale(1.08)';
    layerProx.style.opacity = '0';

    setTimeout(() => {
      layerAtual.style.opacity = '0';
      layerProx.style.opacity  = '1';
      requestAnimationFrame(() => requestAnimationFrame(() => { imgProx.style.transform = 'scale(1)'; }));
      activeLayer = nextLayer;
      setTimeout(() => mostrarTexto(), 800);
    }, 100);
  }

  function mostrarTexto() {
    if (numEl) numEl.textContent = labels[indice] || '';
    faixaEl.style.opacity = '1';
    typewriterIntro(textoEl, paragrafos[indice], () => {
      indice++;
      if (indice >= paragrafos.length) {
        setTimeout(() => mostrarCapaFinal(), 900);
      } else {
        botoesEl.innerHTML = `<button class="btn btn-sm" id="btn-prox" style="letter-spacing:3px;font-size:0.8rem;">AVANÇAR &nbsp;›</button>`;
        document.getElementById('btn-prox').onclick = mostrarCena;
      }
    });
  }
  mostrarCena();
}

function typewriterIntro(elemento, texto, callback) {
  elemento.innerHTML = '';
  let i = 0;
  const vel = 22;
  function digitar() {
    if (texto.charAt(i) === '<') {
      const fim = texto.indexOf('>', i);
      if (fim !== -1) i = fim + 1; else i++;
    } else { i++; }
    elemento.innerHTML = texto.substring(0, i);
    if (i < texto.length) { setTimeout(digitar, vel); }
    else if (callback) { callback(); }
  }
  digitar();
}

function mostrarCapaFinal() {
  const skip = document.getElementById('btn-skip-narrativa');
  if (skip) skip.remove();
  const fase = document.getElementById('intro-fase-narrativa');
  fase.style.transition = 'opacity 1s ease';
  fase.style.opacity = '0';
  setTimeout(() => {
    fase.style.display = 'none';
    fase.style.opacity = '';
    fase.style.transition = '';
    abrirSaveMenu();
  }, 1000);
}

function pularIntroParaSave() {
  // O save-menu é um overlay: esconde a intro sem usar showScreen (que removeria .active)
  // e exibe o overlay por cima
  const introEl = document.getElementById('screen-intro');
  if (introEl) introEl.style.visibility = 'hidden';
  document.getElementById('save-menu').style.display = 'flex';
  buildSaveMenu();
}

function abrirSaveMenu() {
  const introEl = document.getElementById('screen-intro');
  if (introEl) introEl.style.visibility = 'hidden';
  document.getElementById('save-menu').style.display = 'flex';
  buildSaveMenu();
}

function fecharSaveMenu() {
  document.getElementById('save-menu').style.display = 'none';
  const introEl = document.getElementById('screen-intro');
  if (introEl) introEl.style.visibility = '';
}

function buildSaveMenu() {
  const grid = document.getElementById('save-slot-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= 4; n++) {
    const raw = localStorage.getItem('clivor_save_' + n);
    const slot = document.createElement('div');
    slot.className = 'save-slot' + (raw ? ' occupied' : '');

    if (raw) {
      const data = JSON.parse(raw);
      const p = data.player;
      const cls = p.classData;
      slot.innerHTML = `
        <div class="save-slot-num">SLOT ${n}</div>
        <div class="save-slot-name">${cls ? (cls.iconImg ? `<img src="${cls.iconImg}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;"> ` : cls.icon + ' ') + cls.name : 'Aventureiro'}</div>
        <div class="save-slot-info">LV ${p.level || 1} · ${p.kills || 0} abates · ${p.gold || 0}◈</div>
        <div class="save-slot-actions">
          <button class="save-load-btn" onclick="event.stopPropagation();selectSaveSlot(${n},true)">▶ Carregar</button>
          <button class="save-del-btn"  onclick="event.stopPropagation();deleteSave(${n})">✕ Apagar</button>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="save-slot-num">SLOT ${n}</div>
        <div class="save-slot-name" style="color:rgba(200,150,10,0.3);">— Vazio —</div>
        <div class="save-slot-info" style="margin-bottom:6px;">Sem dados</div>
        <button class="save-new-btn" onclick="event.stopPropagation();selectSaveSlot(${n},null)">+ Novo Jogo</button>
      `;
    }
    grid.appendChild(slot);
  }
}

function deleteSave(n) {
  showCustomConfirm(
    `Apagar o save do Slot ${n} permanentemente?
Esta ação não pode ser desfeita.`,
    () => {
      localStorage.removeItem('clivor_save_' + n);
      notify('🗑 Save do Slot ' + n + ' apagado.', 'red');
      buildSaveMenu();
    },
    null
  );
}

function fecharSaveMenu() {
  document.getElementById('save-menu').style.display = 'none';
  showScreen('intro');
}

function selectSaveSlot(n, raw) {
  G.saveSlot = n;
  if (raw) {
    document.getElementById('save-menu').style.display = 'none';
    loadGame(n);
  } else {
    document.getElementById('save-menu').style.display = 'none';
    goToClassSelection();
  }
}

function loadGame(slot) {
  const raw = localStorage.getItem('clivor_save_' + slot);
  if (!raw) { goToClassSelection(); return; }
  const data = JSON.parse(raw);
  Object.assign(G, data);
  G.saveSlot = slot;
  // Recriar referência classData
  if (G.player.class) {
    G.player.classData = CLASSES.find(c => c.id === G.player.class) || G.player.classData;
  }
  // Compatibilidade: inicializa equippedSkills se save antigo não tiver
  if (!G.player.equippedSkills || G.player.equippedSkills.length === 0) {
    const cls = G.player.classData;
    G.player.equippedSkills = cls && cls.skills ? cls.skills.slice(0, 3).map((_, i) => 'b' + i) : [];
  }
  // Compatibilidade: mago de save antigo sem elementoEscolhido válido —
  // undefined ou ausente = assume fogo (comportamento do sistema antigo, todos liberados)
  // null = escolha pendente (novo sistema), mantém null
  if (G.player.class === 'mago' && G.player.elementoEscolhido === undefined) {
    G.player.elementoEscolhido = 'fogo';
  }
  // Após definir elementoEscolhido, limpar slots com elementos agora bloqueados
  if (G.player.class === 'mago' && G.player.elementoEscolhido) {
    const cls = G.player.classData;
    if (cls && cls.skills && G.player.equippedSkills) {
      G.player.equippedSkills = G.player.equippedSkills.filter(key => {
        if (!key || !key.startsWith('b')) return true;
        const sk = cls.skills[parseInt(key.slice(1))];
        return sk ? isElementoDesbloqueado(sk) : true;
      });
    }
  }
  // Garante que _pendingElementChoice não fica travado em save carregado
  G.player._pendingElementChoice = false;

  // ── REAPPLY ACESSÓRIO EQUIPADO ──
  // Saves antigos já tinham o bônus embutido no p.atk/def etc (aplicado uma vez via boss).
  // A partir de agora usamos _accBonusApplied para controlar.
  // Se o save NÃO tem a flag, o bônus já está embutido: apenas marca a flag.
  // Se o save TEM a flag = false, aplica os bônus agora.
  {
    const p = G.player;
    const acc = (p.inventory || []).find(i => i.equipSlot === 'acessorio' && i.equipped);
    if (acc) {
      if (acc._accBonusApplied === false) {
        // Bônus ainda não foi aplicado — aplica agora
        if (acc.atk)  p.atk   = (p.atk  || 0) + acc.atk;
        if (acc.def)  p.def   = (p.def  || 0) + acc.def;
        if (acc.spd)  p.spd   = (p.spd  || 0) + acc.spd;
        if (acc.mag)  p.mag   = (p.mag  || 0) + acc.mag;
        if (acc.crit) p.critBonus = (p.critBonus || 0) + acc.crit / 100;
        if (acc.hp)  { p.maxHp = (p.maxHp || 1) + acc.hp; p.hp = Math.min((p.hp||0) + acc.hp, p.maxHp); }
        if (acc.mp)  { p.maxMp = (p.maxMp || 0) + acc.mp; }
      }
      // Marca que o bônus está aplicado (para próximos loads)
      acc._accBonusApplied = true;
    }
  }

  initGame();
  showScreen('game');
}

function manualSave() {
  if (G.inBattle) { notify('⚠ Não é possível salvar durante batalha!', 'red'); return; }
  try {
    const data = JSON.parse(JSON.stringify(G));
    data._saveVersion = SAVE_VERSION;
    localStorage.setItem('clivor_save_' + G.saveSlot, JSON.stringify(data));
    notify('💾 Jogo Salvo! Slot ' + G.saveSlot, 'gold');
    addLog('💾 Jogo salvo.', 'info');
  } catch (e) {
    notify('⚠ Falha ao salvar!', 'red');
  }
}

function startAutoSave() {
  if (window._autoSaveInterval) clearInterval(window._autoSaveInterval);
  window._autoSaveInterval = setInterval(() => {
    if (!CONFIG.autoSave) return;
    if (G.inBattle) return;
    try {
      const data = JSON.parse(JSON.stringify(G));
      data._saveVersion = SAVE_VERSION;
      localStorage.setItem('clivor_save_' + G.saveSlot, JSON.stringify(data));
      addLog('💾 Auto-salvo.', 'info');
    } catch (e) {}
  }, 30000);
}

// ─────────────────────────────────────────────────────────────
//  8. SELEÇÃO DE CLASSE
// ─────────────────────────────────────────────────────────────
function goToClassSelection() {
  showScreen('class');
  buildClassGrid();
}

function buildClassGrid() {
  const grid = document.getElementById('class-grid');
  grid.innerHTML = '';
  CLASSES.forEach(cls => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.id = 'cls-' + cls.id;
    card.onclick = () => selectClass(cls.id);

    const magRow = (cls.statBars && cls.statBars.mag)
      ? `<div class="stat-bar-row">
           <span class="stat-bar-label">MAG</span>
           <div class="stat-bar-track"><div class="stat-bar-fill mag" style="width:${cls.statBars.mag}%"></div></div>
           <span class="stat-bar-val">${cls.statBars.mag}</span>
         </div>` : '';

    const badge = cls.beginner
      ? `<div class="class-badge-beginner">★ INICIANTE</div>` : '';

    card.innerHTML = `
      ${badge}
      <div class="class-icon-wrap">${clsIconHtml(cls, 64)}</div>
      <div class="class-body">
        <div class="class-name">${cls.name}</div>
        <div class="class-role">${cls.role}</div>
        <div class="class-desc">${cls.desc}</div>
        <div class="stat-bars">
          <div class="stat-bar-row">
            <span class="stat-bar-label">ATQ</span>
            <div class="stat-bar-track"><div class="stat-bar-fill atk" style="width:${cls.statBars.atk}%"></div></div>
            <span class="stat-bar-val">${cls.statBars.atk}</span>
          </div>
          <div class="stat-bar-row">
            <span class="stat-bar-label">DEF</span>
            <div class="stat-bar-track"><div class="stat-bar-fill def" style="width:${cls.statBars.def}%"></div></div>
            <span class="stat-bar-val">${cls.statBars.def}</span>
          </div>
          <div class="stat-bar-row">
            <span class="stat-bar-label">VEL</span>
            <div class="stat-bar-track"><div class="stat-bar-fill spd" style="width:${cls.statBars.spd}%"></div></div>
            <span class="stat-bar-val">${cls.statBars.spd}</span>
          </div>
          ${magRow}
        </div>
      </div>
      <button class="class-choose-btn" onclick="event.stopPropagation();selectClass('${cls.id}');confirmClass()">ESCOLHER</button>
    `;
    if (cls.color) card.style.borderTopColor = cls.color;
    grid.appendChild(card);
  });
}

function selectClass(id) {
  document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('cls-' + id).classList.add('selected');
  G.selectedClass = id;
  document.getElementById('btn-confirm-class').style.display = 'inline-block';
}

// Verifica se um elemento mágico do Mago está desbloqueado:
// - Se elementoEscolhido ainda é null: NENHUM elemento está desbloqueado
// - Os 3 iniciais (fogo/agua/eletrico): só o escolhido fica desbloqueado, os outros 2 ficam SEMPRE bloqueados
// - Os demais elementos (gelo, planta, terra...): seguem levelRequired normalmente
const ELEMENTOS_INICIAIS = ['fogo', 'agua', 'eletrico'];
function isElementoDesbloqueado(sk) {
  if (!sk || !sk.elemento) return true;
  const p = G.player;
  const elem = sk.elemento;

  // Ainda não escolheu: nada liberado
  if (!p || p.elementoEscolhido === null) return false;

  // Elemento é um dos 3 iniciais: só libera se for exatamente o escolhido
  if (ELEMENTOS_INICIAIS.includes(elem)) {
    return elem === p.elementoEscolhido;
  }

  // Demais elementos: seguem levelRequired
  const lvReq = sk.levelRequired || 1;
  return ((p && p.level) || 1) >= lvReq;
}

function escolherElementoInicial(elemento) {
  G.player.elementoEscolhido = elemento;
  // Fecha o overlay de escolha (seja o overlay antigo ou o ingame)
  const ov = document.getElementById('escolha-elemento-overlay');
  if (ov) ov.style.display = 'none';
  const ovIn = document.getElementById('escolha-elemento-ingame');
  if (ovIn) ovIn.style.display = 'none';

  // Nomes e ícones dos elementos para a mensagem de confirmação
  const ELEM_NAMES = { fogo:'Fogo 🔥', agua:'Água 💧', eletrico:'Elétrico ⚡' };
  const elemNome = ELEM_NAMES[elemento] || elemento;

  // Mensagem narrativa confirmando a escolha
  setStory('Voz Interior', `Você sente o elemento ${elemNome} ressoar em sua essência. Os outros caminhos aguardam... mas este é o seu ponto de partida.`, [
    { icon: '▶', text: 'Continuar', action: () => storyNode_floresta() }
  ]);

  // Atualiza skill list e ficha
  if (typeof buildSkillList === 'function') buildSkillList();
  if (typeof saveGame === 'function') saveGame();
  addLog('🔮 Elemento inicial escolhido: ' + elemNome + '.', 'info');
  notify('✦ ' + elemNome + ' desbloqueado como seu elemento inicial!', 'gold');
}
window.escolherElementoInicial = escolherElementoInicial;

// ─────────────────────────────────────────────────────────────
//  8-B. ESCOLHA DE ELEMENTO INGAME (Mago)
// ─────────────────────────────────────────────────────────────
function mostrarEscolhaElementoIngame() {
  // Cria o overlay se não existir ainda
  let ov = document.getElementById('escolha-elemento-ingame');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'escolha-elemento-ingame';
    ov.className = 'elem-overlay';
    ov.innerHTML = `
      <div class="elem-panel">
        <span class="elem-corner-bl"></span><span class="elem-corner-br"></span>
        <div class="elem-title"><span class="elem-rule" style="--dir:left;"></span>✦ ESCOLHA SEU ELEMENTO<span class="elem-rule"></span></div>
        <div class="elem-subtitle">Todo Mago começa canalizando um único elemento.<br>Os demais se revelam conforme você evolui.</div>
        <div class="elem-list">
          <button class="elem-btn elem-btn--fogo" onclick="escolherElementoInicial('fogo')">
            <span class="elem-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2c1 3-3 4-3 8a3 3 0 006 0c0-1-1-2-1-3 2 1 4 4 4 7a6 6 0 11-12 0c0-5 3-8 6-12z" fill="currentColor"/></svg></span>
            Fogo
          </button>
          <button class="elem-btn elem-btn--agua" onclick="escolherElementoInicial('agua')">
            <span class="elem-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2C9 7 5 11.5 5 15.5a7 7 0 0014 0C19 11.5 15 7 12 2z" fill="currentColor"/></svg></span>
            Água
          </button>
          <button class="elem-btn elem-btn--eletrico" onclick="escolherElementoInicial('eletrico')">
            <span class="elem-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor"/></svg></span>
            Elétrico
          </button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  } else {
    ov.style.display = 'flex';
  }
}
window.mostrarEscolhaElementoIngame = mostrarEscolhaElementoIngame;

function confirmClass() {
  if (!G.selectedClass) return;
  const cls = CLASSES.find(c => c.id === G.selectedClass);
  G.player.classData = cls;
  G.player.class     = cls.id;

  // Aplicar stats base
  G.player.atk    = cls.stats.atk + (cls.startWeapon.atk || 0);
  G.player.def    = cls.stats.def + (cls.startWeapon.def || 0);
  G.player.spd    = cls.stats.spd + (cls.startWeapon.spd || 0);
  G.player.mag    = cls.stats.mag + (cls.startWeapon.mag || 0);
  G.player.maxHp  = cls.stats.hp;
  G.player.hp     = cls.stats.hp;
  G.player.maxMp  = cls.stats.mp;
  G.player.mp     = cls.stats.mp;
  G.player.equippedWeapon = cls.startWeapon;
  G.player.gold   = 10;
  G.player.kills  = 0;
  G.player.level  = 1;
  G.player.xp     = 0;
  G.player.xpNext = 100;

  // AP para classes guerreiras
  const warriorClasses = window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id);
  if (warriorClasses.includes(cls.id)) {
    G.player.maxAp = cls.maxAp || 100;
    G.player.ap    = cls.maxAp || 100;
  } else {
    G.player.maxAp = 0;
    G.player.ap    = 0;
  }

  // Paladino — começa com AP cheio e bônus de DEF passivo
  if (cls.id === 'paladino') {
    G.player.maxAp = 100; G.player.ap = 100;
    G.player._paladinoShieldUsed = false; // controle 1×/batalha para talentos futuros
  }

  // Inventário inicial
  const wpn = cls.startWeapon;
  G.player.inventory = [
    { id:'arma_'+wpn.id, icon:wpn.icon, imgSrc:wpn.imgSrc||null, name:wpn.name, weight:wpn.weight||2, qty:1, desc:wpn.desc, type:'equipamento', equipSlot:'weapon', atk:wpn.atk||0, def:wpn.def||0, mag:wpn.mag||0, spd:wpn.spd||0, equipped:true },
    { id:'pocao_pequena', icon:'🧪', imgSrc:'Imagens/cosméticos/Poção.png', name:'Poção Pequena', weight:0.5, qty:2, desc:'Restaura 25 HP.', heal:25, type:'consumível' },
    { id:'erva_cura', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', name:'Erva Medicinal', weight:0.2, qty:1, desc:'Recupera 15 HP.', type:'consumível' },
  ];
  G.player.equipped = { weapon: G.player.inventory[0] };

  // Inicializa com as 3 primeiras skills base — jogador troca por talentos via Ficha
  G.player.equippedSkills = cls.skills.slice(0, 3).map((_, i) => 'b' + i);

  // Mago: marca que ainda não escolheu elemento (escolha acontece ingame após 2s)
  if (cls.id === 'mago') {
    G.player.elementoEscolhido = null;
    G.player._pendingElementChoice = true;
  }

  initGame();
  showScreen('game');
}

// ─────────────────────────────────────────────────────────────
//  9. INICIALIZAÇÃO DO JOGO
// ─────────────────────────────────────────────────────────────
function initGame() {
  const cls = G.player.classData;
  if (!cls) return;

  const avatarEl = document.getElementById('hud-avatar');
  avatarEl.textContent = '';
  avatarEl.innerHTML = clsIconHtml(cls, 36);
  document.getElementById('hud-class-name').textContent = cls.name;
  const sceneHeroEl = document.getElementById('scene-hero'); if(sceneHeroEl){ sceneHeroEl.textContent=''; sceneHeroEl.innerHTML=clsIconHtml(cls,52); }



  // Música da floresta
  AudioSys.play('floresta');

  updateHUD();
  buildInventoryGrid();
  buildSkillList();

  // Iniciar na floresta
  storyNode_floresta();

  // Mago com escolha de elemento pendente: mostra overlay narrativo após 2s
  if (G.player.class === 'mago' && G.player._pendingElementChoice) {
    G.player._pendingElementChoice = false;
    setTimeout(() => mostrarEscolhaElementoIngame(), 2000);
  }

  // Auto-save a cada 30 segundos
  startAutoSave();

  // Quadro de Quests do Gozen — checa desbloqueio (LV4) e atualização (48h)
  if (window.QuestBoard) QuestBoard.init();
}

// ─────────────────────────────────────────────────────────────
//  10. HUD
// ─────────────────────────────────────────────────────────────
function updateHUD() {
  const p = G.player;

  // HP
  const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
  document.getElementById('bar-hp').style.width = hpPct + '%';
  document.getElementById('hp-text').textContent = p.hp + '/' + p.maxHp;

  // MP / AP
  const mpBar   = document.getElementById('bar-mp');
  const mpLabel = document.getElementById('mp-label');
  const mpText  = document.getElementById('mp-text');
  const isWarrior = ((p.classData && p.classData.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(p.class));

  if (isWarrior) {
    mpLabel.textContent = 'AP';
    const apPct = Math.max(0, Math.min(100, ((p.ap || 0) / (p.maxAp || 100)) * 100));
    mpBar.style.width = apPct + '%';
    mpBar.style.background = 'linear-gradient(90deg,#804010,#e09030)';
    mpText.textContent = (p.ap || 0) + '/' + (p.maxAp || 100);
  } else {
    mpLabel.textContent = 'MP';
    const mpPct = Math.max(0, Math.min(100, (p.mp / p.maxMp) * 100));
    mpBar.style.width = mpPct + '%';
    mpBar.style.background = 'linear-gradient(90deg,#1a2744,#3a6888)';
    mpText.textContent = p.mp + '/' + p.maxMp;
  }

  document.getElementById('hud-gold').textContent = p.gold;
  document.getElementById('hud-level-text').textContent = `LV ${p.level} · EXP ${p.xp}/${p.xpNext}`;

  // Sidebar stats
  const sb = document.getElementById('sidebar-stats');
  if (sb) {
    sb.innerHTML = `
      ATQ: ${p.atk} &nbsp;|&nbsp; DEF: ${p.def}<br>
      VEL: ${p.spd} &nbsp;|&nbsp; MAG: ${p.mag}<br>
      Mortos: ${p.kills} &nbsp;|&nbsp; Mortes: ${p.deaths}
    `;
  }
}

// ─────────────────────────────────────────────────────────────
//  11. INVENTÁRIO
// ─────────────────────────────────────────────────────────────
function buildInventoryGrid() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  G.player.inventory.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.title = item.name;
    const iconHtml = item.imgSrc
      ? `<img src="${item.imgSrc}" style="width:22px;height:22px;object-fit:contain;mix-blend-mode:screen;display:block;">`
      : (item.icon || '📦');
    slot.innerHTML = `${iconHtml}${item.qty > 1 ? `<span class="qty">${item.qty}</span>` : ''}`;
    slot.onclick = () => showItemPopup(i, item);
    grid.appendChild(slot);
  });
}

function useInventoryItem(idx) {
  const item = G.player.inventory[idx];
  if (!item) return;

  if (item.type === 'consumível') {
    // Elixir de Aaur — buff de ATQ
    if (item.buffAtk) {
      const bs = window.battleState;
      if (bs && G.inBattle) {
        bs._buffAtkTurns = item.buffTurns || 3;
        bs._buffAtkAmt   = item.buffAtk;
        G.player.atk += item.buffAtk;
        item.qty = (item.qty || 1) - 1;
        if (item.qty <= 0) G.player.inventory.splice(idx, 1);
        updateHUD();
        notify(`💙 ${item.name}: ATQ +${item.buffAtk} por ${item.buffTurns} turnos!`, 'gold');
        addLog(`Usou ${item.name}: ATQ +${item.buffAtk} por ${item.buffTurns} turnos.`, 'buff');
      } else {
        notify('⚠ Só pode usar em batalha!', 'gold');
      }
      return;
    }

    // Poções e ervas — cura
    if (item.id.includes('pocao') || item.id.includes('erva') || item.heal) {
      // Poções de MP
      if (item.restoreMP || item.id.includes('mp')) {
        const mp = item.restoreMP || 25;
        G.player.mp = Math.min(G.player.maxMp, G.player.mp + mp);
        item.qty = (item.qty || 1) - 1;
        if (item.qty <= 0) G.player.inventory.splice(idx, 1);
        updateHUD();
        buildInventoryGrid();
        notify(`🔵 ${item.name}: +${mp} MP!`, 'blue');
        addLog(`Usou ${item.name}: +${mp} MP.`, 'info');
        return;
      }
      let heal = item.heal
        || (item.id === 'erva_rara' ? 30
          : item.id.includes('grande') ? 120
          : item.id.includes('media')  ? 60
          : item.id.includes('erva')   ? 15 : 25);
      // Graça Divina: poções curam 50% a mais
      if (G.player._talent_grace) heal = Math.floor(heal * 1.5);
      // Pedra da Sacerdotisa Negra: cura 7% a mais (permanente)
      if (G.player._pedraSiuBonusCura) heal = Math.floor(heal * (1 + G.player._pedraSiuBonusCura));
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + heal);
      item.qty = (item.qty || 1) - 1;
      if (item.qty <= 0) G.player.inventory.splice(idx, 1);
      updateHUD();
      buildInventoryGrid();
      notify(`🌿 ${item.name}: +${heal} HP!`, 'green');
      addLog(`Usou ${item.name}: +${heal} HP.`, 'heal');
      return;
    }

  } else if (item.type === 'bau') {
    const p = G.player;
    const reqKeyId = item.requiresKey;
    const keyIdx = reqKeyId ? p.inventory.findIndex(i => i.id === reqKeyId) : -1;

    if (reqKeyId && keyIdx === -1) {
      const keyBase = ITEM_DB[reqKeyId];
      notify(`🔒 ${item.name} está selado. É preciso de: ${keyBase ? keyBase.name : 'uma chave'}.`, 'gold');
      addLog(`Tentou abrir ${item.name} sem a chave necessária.`, 'info');
      return;
    }

    // Consome a chave
    if (keyIdx !== -1) {
      const keyItem = p.inventory[keyIdx];
      keyItem.qty = (keyItem.qty || 1) - 1;
      if (keyItem.qty <= 0) p.inventory.splice(keyIdx, 1);
    }

    // Remove o baú da bolsa
    const bauIdx = p.inventory.indexOf(item);
    if (bauIdx !== -1) p.inventory.splice(bauIdx, 1);

    // Concede o conteúdo do baú
    const ganhos = [];
    (item.lootTable || []).forEach(entry => {
      addItem({ id: entry.id }, entry.qty || 1);
      const base = ITEM_DB[entry.id];
      ganhos.push(`${base ? base.name : entry.id}${(entry.qty || 1) > 1 ? ` x${entry.qty}` : ''}`);
    });
    if (item.lootGold) {
      p.gold = (p.gold || 0) + item.lootGold;
      ganhos.push(`${item.lootGold} ouro`);
    }

    updateHUD();
    buildInventoryGrid();
    notify(`🎁 ${item.name} aberto! Você encontrou: ${ganhos.join(', ')}.`, 'gold');
    addLog(`Abriu ${item.name}. Itens obtidos: ${ganhos.join(', ')}.`, 'xp');
    return;

  } else if (item.type === 'equipamento' && item.equipSlot === 'acessorio') {
    const p = G.player;

    // Helper: aplica bônus de um acessório no player
    function _applyAccBonus(acc, sign) {
      if (acc.atk)   p.atk   = Math.max(0, (p.atk   || 0) + sign * acc.atk);
      if (acc.def)   p.def   = Math.max(0, (p.def   || 0) + sign * acc.def);
      if (acc.spd)   p.spd   = Math.max(0, (p.spd   || 0) + sign * acc.spd);
      if (acc.mag)   p.mag   = Math.max(0, (p.mag   || 0) + sign * acc.mag);
      if (acc.crit)  p.critBonus = Math.max(0, (p.critBonus || 0) + sign * (acc.crit / 100));
      if (acc.hp)  { p.maxHp = Math.max(1, (p.maxHp || 1) + sign * acc.hp);  if (sign > 0) p.hp = Math.min((p.hp||0) + acc.hp, p.maxHp); else p.hp = Math.min(p.hp||0, p.maxHp); }
      if (acc.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) + sign * acc.mp);  if (sign > 0) p.mp = Math.min((p.mp||0) + acc.mp, p.maxMp); else p.mp = Math.min(p.mp||0, p.maxMp); }
    }

    if (item.equipped) {
      // Desequipa — remove bônus
      _applyAccBonus(item, -1);
      item.equipped = false;
      item._accBonusApplied = false;
      const stats = [];
      if (item.atk)  stats.push(`ATQ-${item.atk}`);
      if (item.def)  stats.push(`DEF-${item.def}`);
      if (item.spd)  stats.push(`VEL-${item.spd}`);
      if (item.mag)  stats.push(`MAG-${item.mag}`);
      if (item.crit) stats.push(`Crit-${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx-${item.hp}`);
      if (item.mp)   stats.push(`MP Máx-${item.mp}`);
      notify(`🌿 ${item.name} desequipado.${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Desequipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    } else {
      // Desequipa acessório anterior se houver — remove bônus dele também
      const prev = p.inventory.find(i => i.equipSlot === 'acessorio' && i.equipped);
      if (prev) { _applyAccBonus(prev, -1); prev.equipped = false; }
      // Equipa novo — aplica bônus
      _applyAccBonus(item, +1);
      item.equipped = true;
      item._accBonusApplied = true;
      const stats = [];
      if (item.atk)  stats.push(`ATQ+${item.atk}`);
      if (item.def)  stats.push(`DEF+${item.def}`);
      if (item.spd)  stats.push(`VEL+${item.spd}`);
      if (item.mag)  stats.push(`MAG+${item.mag}`);
      if (item.crit) stats.push(`Crit+${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx+${item.hp}`);
      if (item.mp)   stats.push(`MP Máx+${item.mp}`);
      notify(`🌿 ${item.name} equipado!${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Equipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    }
    updateHUD();
    buildBagItems();
    updateEquippedGearHUD();
    return;

  } else if (item.type === 'equipamento' && item.equipSlot === 'armadura') {
    const p = G.player;

    // Helper: aplica bônus de uma armadura no player (mesmo padrão do acessório)
    function _applyArmorBonus(arm, sign) {
      if (arm.atk)   p.atk   = Math.max(0, (p.atk   || 0) + sign * arm.atk);
      if (arm.def)   p.def   = Math.max(0, (p.def   || 0) + sign * arm.def);
      if (arm.spd)   p.spd   = Math.max(0, (p.spd   || 0) + sign * arm.spd);
      if (arm.mag)   p.mag   = Math.max(0, (p.mag   || 0) + sign * arm.mag);
      if (arm.crit)  p.critBonus = Math.max(0, (p.critBonus || 0) + sign * (arm.crit / 100));
      if (arm.hp)  { p.maxHp = Math.max(1, (p.maxHp || 1) + sign * arm.hp);  if (sign > 0) p.hp = Math.min((p.hp||0) + arm.hp, p.maxHp); else p.hp = Math.min(p.hp||0, p.maxHp); }
      if (arm.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) + sign * arm.mp);  if (sign > 0) p.mp = Math.min((p.mp||0) + arm.mp, p.maxMp); else p.mp = Math.min(p.mp||0, p.maxMp); }
    }

    if (item.equipped) {
      // Desequipa — remove bônus
      _applyArmorBonus(item, -1);
      item.equipped = false;
      item._accBonusApplied = false;
      const stats = [];
      if (item.atk)  stats.push(`ATQ-${item.atk}`);
      if (item.def)  stats.push(`DEF-${item.def}`);
      if (item.spd)  stats.push(`VEL-${item.spd}`);
      if (item.mag)  stats.push(`MAG-${item.mag}`);
      if (item.crit) stats.push(`Crit-${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx-${item.hp}`);
      if (item.mp)   stats.push(`MP Máx-${item.mp}`);
      notify(`🛡️ ${item.name} desequipado.${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Desequipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    } else {
      // Desequipa armadura anterior se houver — slot próprio, independente de acessório/arma
      const prev = p.inventory.find(i => i.equipSlot === 'armadura' && i.equipped);
      if (prev) { _applyArmorBonus(prev, -1); prev.equipped = false; }
      // Equipa nova — aplica bônus
      _applyArmorBonus(item, +1);
      item.equipped = true;
      item._accBonusApplied = true;
      const stats = [];
      if (item.atk)  stats.push(`ATQ+${item.atk}`);
      if (item.def)  stats.push(`DEF+${item.def}`);
      if (item.spd)  stats.push(`VEL+${item.spd}`);
      if (item.mag)  stats.push(`MAG+${item.mag}`);
      if (item.crit) stats.push(`Crit+${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx+${item.hp}`);
      if (item.mp)   stats.push(`MP Máx+${item.mp}`);
      notify(`🛡️ ${item.name} equipado!${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Equipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    }
    updateHUD();
    buildBagItems();
    updateEquippedGearHUD();
    return;

  } else if (item.type === 'equipamento' && item.equipSlot === 'weapon') {
    // ── BUG-04 FIX: lógica de equip/unequip ──
    const p = G.player;

    if (item.equipped) {
      notify(`⚠ ${item.name} já está equipado!`, 'gold');
      return;
    }

    // Desequipa arma atual
    const prevWeapon = p.inventory.find(i => i.equipSlot === 'weapon' && i.equipped);
    if (prevWeapon) {
      // Remove bônus da arma anterior dos stats
      p.atk  -= (prevWeapon.atk  || 0);
      p.def  -= (prevWeapon.def  || 0);
      p.spd  -= (prevWeapon.spd  || 0);
      p.mag  -= (prevWeapon.mag  || 0);
      prevWeapon.equipped = false;
    }

    // Equipa a nova arma
    item.equipped = true;
    p.atk  += (item.atk  || 0);
    p.def  += (item.def  || 0);
    p.spd  += (item.spd  || 0);
    p.mag  += (item.mag  || 0);
    p.equippedWeapon = item;
    p.equipped = { weapon: item };

    const statsStr = [];
    if (item.atk) statsStr.push(`ATQ+${item.atk}`);
    if (item.def) statsStr.push(`DEF+${item.def}`);
    if (item.spd) statsStr.push(`VEL+${item.spd}`);
    if (item.mag) statsStr.push(`MAG+${item.mag}`);

    updateHUD();
    buildInventoryGrid();
    buildSkillList();
    notify(`⚔ ${item.name} equipado!${statsStr.length ? ' ' + statsStr.join(' ') : ''}`, 'gold');
    addLog(`Equipou: ${item.name}.${statsStr.length ? ' ' + statsStr.join(' ') : ''}`, 'info');

  } else {
    notify(`${item.icon || '📦'} ${item.name}: ${item.desc || ''}`, 'gold');
  }
}

// ─────────────────────────────────────────────────────────────
//  ITEM_DB — Fonte canônica de ícones/imagens de todos os itens
// ─────────────────────────────────────────────────────────────
const ITEM_DB = {
  pocao_pequena:  { name:'Poção Pequena',       icon:'🧪',  imgSrc:'Imagens/cosméticos/Poção.png',           type:'consumível', desc:'Restaura 25 HP.',        heal:25,  weight:0.5 },
  pocao_media:    { name:'Poção Média',          icon:'🫙',  imgSrc:'Imagens/cosméticos/PoçãoM.png',          type:'consumível', desc:'Restaura 60 HP.',        heal:60,  weight:0.5 },
  pocao_grande:   { name:'Poção Grande',         icon:'⚗️',  imgSrc:'Imagens/cosméticos/PoçãoG.png',          type:'consumível', desc:'Restaura 120 HP.',       heal:120, weight:0.5 },
  pocao_cura:     { name:'Poção de Cura',        icon:'🧪',  imgSrc:'Imagens/pocao.png',                      type:'consumível', desc:'Recupera 40 HP.',        heal:40,  weight:0.5 },
  elixir_ap:      { name:'Elixir de AP',         icon:'⚗️',  imgSrc:'Imagens/elixir.png',                     type:'consumível', desc:'Restaura 50 AP.',                  weight:0.3 },
  aaur_elixir:    { name:'Elixir de MP',          icon:'💙',  imgSrc:'Imagens/cosméticos/aaur.png',            type:'consumível', desc:'Restaura 50 MP.',        restoreMP:50, weight:0.3 },
  erva_cura:      { name:'Erva Medicinal',       icon:'🌿',  imgSrc:'Imagens/cosméticos/erva.png',            type:'consumível', desc:'Recupera 15 HP.',        heal:15,  weight:0.2 },
  erva_rara:      { name:'Erva da Névoa',        icon:'🍃',  imgSrc:'Imagens/cosméticos/erva.png',            type:'consumível', desc:'Recupera 30 HP. Rara.',  heal:30,  weight:0.2 },
  pedra:          { name:'Pedra',                icon:'🪨',  imgSrc:'Imagens/pedra.png',                      type:'material',   desc:'Material de craft.',               weight:0.3 },
  po_cristal:     { name:'Pó de Cristal',        icon:'💎',  imgSrc:'Imagens/icones/materiais/poCrista.png',   type:'material',   desc:'Pó mágico de cristal. Usado em craft de poções de MP.', weight:0.2 },
  pocao_mp_p:     { name:'Poção de MP',           icon:'🔵',  imgSrc:'Imagens/cosméticos/MP.png',              type:'consumível', desc:'Restaura 25 MP.',        restoreMP:25, weight:0.4 },
  pocao_mp_g:     { name:'Poção de MP Grande',    icon:'🔷',  imgSrc:'Imagens/cosméticos/PoçãoG.png',          type:'consumível', desc:'Restaura 70 MP.',        restoreMP:70, weight:0.5 },
  pele_lobo:      { name:'Pele de Lobo',         icon:'🐾',  imgSrc:'Imagens/icones/materiais/pele_lobo.png', type:'material',   desc:'Pele de um lobo selvagem.',        weight:0.5 },
  pele_cobra:     { name:'Pele de Cobra',        icon:'🐍',  imgSrc:'Imagens/icones/materiais/Peledeco.png',  type:'material',   desc:'Escamas finas de uma cobra.',      weight:0.4 },
  glandula:       { name:'Glândula Venenosa',    icon:'☠️',  imgSrc:'Imagens/icones/materiais/Glandul.png',   type:'material',   desc:'Secreta veneno potente.',          weight:0.3 },
  coleira_tierra: { name:'Amuleto de Tierra',    icon:'🌿',  imgSrc:'Imagens/icones/materiais/amuleto_roxo.png',  type:'equipamento', equipSlot:'acessorio', desc:'Amuleto de folhas e pedra viva. Bônus varia por classe.',  weight:0.5 },
  amuleto_yuki:   { name:'Amuleto da Bênção de Yuki', icon:'✨',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-03-20-806.png', type:'equipamento', equipSlot:'acessorio', desc:'Pingente de luz formado pela bênção de Yuki. A ligação se desfaz ao sair desta dungeon.', atk:3, crit:7, weight:0.3 },
  pedra_sacerdotisa_negra: { name:'Pedra da Sacerdotisa Negra', icon:'🔮', imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-03-20-806.png', type:'equipamento', equipSlot:'acessorio', desc:'Fragmento de pedra negra que pulsa com a essência de Siu. Sua cura é 7% mais eficaz, permanentemente — mesmo desequipada.', weight:0.5 },
  pena_corvo:     { name:'Pena de Corvo',        icon:'🪶',  imgSrc:'Imagens/icones/materiais/penC.png',          type:'material',   desc:'Pena negra de um corvo das cinzas.', weight:0.1 },
  cajado_basic:   { name:'Cajado de Novato',     icon:'🪄',  imgSrc:'Imagens/Armas/cajado_1781493098967.png',     type:'equipamento', equipSlot:'arma', desc:'Um cajado com um cristal fraco.', mag:4, spd:1, weight:1 },

  // ── Baú das Sombras (Fase 9, Parte 2) ──
  bau_sombras:    { name:'Baú das Sombras',      icon:'🎁',  imgSrc:'Imagens/BauS.png',   type:'bau', requiresKey:'chave_sombras',
                    desc:'Um baú de madeira escura reforçada, deixado para trás pelo Lorde das Sombras. Selado — sem a chave certa, não abre de jeito nenhum.',
                    lootTable:[ { id:'coracao_incandescente', qty:1 }, { id:'po_cristal', qty:5 } ], lootGold:300, weight:3 },
  chave_sombras:  { name:'Chave das Sombras',    icon:'🗝️',  imgSrc:'Imagens/icones/Chavss.png', type:'chave',
                    desc:'Pequena e fria ao toque, gravada com símbolos que ecoam os da câmara do Lorde. Abre o Baú das Sombras.', weight:0.1 },
  // Coração Incandescente: NÃO dá bônus permanente ao equipar. Ao entrar em
  // batalha (com ele equipado), ativa um buff de ATQ/Crítico/Cura por
  // buffTurns turnos; depois disso, "esfria" e só ativa de novo na próxima
  // batalha (ver hook em startBattle / tickPlayerStatusEffects).
  coracao_incandescente: { name:'Coração Incandescente', icon:'🔥', imgSrc:'Imagens/icones/file_00000000b3e4720e821ef2df760bf519.png',
                    type:'equipamento', equipSlot:'armadura', battleBuff:true,
                    buffAtk:12, buffCrit:10, buffHeal:30, buffTurns:3,
                    desc:'O núcleo pulsante de calor que restava no peito do Lorde das Sombras, agora forjado como uma armadura. Ao entrar em batalha, arde por 3 turnos — ATQ, Crítico e uma rajada de cura — antes de esfriar até o próximo combate.',
                    weight:0.6 },
};

// ── Descrição dinâmica do cajado por tier de encantamento ──
function _getCajadoDesc() {
  const enchant = G && G.player && G.player._weaponEnchant;
  const descByTier = {
    null:      'Um cajado com um cristal fraco. O mínimo para canalizar magia.',
    undefined: 'Um cajado com um cristal fraco. O mínimo para canalizar magia.',
    'D':  'O cajado respira. A runa básica estabiliza o fluxo arcano — menos desperdício de mana.',
    'C':  'Cinza de Clivor fundida no cristal. A luz mágica pulsa com mais intensidade.',
    'B':  'Cristal ciano brilha ao toque. O cajado amplifica feitiços além do que o corpo suporta.',
    'A':  'Escrito em runa dourada — raramente visto. O cajado parece antecipar cada feitiço.',
    'S':  'O cajado transcendeu o comum. O cristal irradia energia latente mesmo em silêncio.',
    'SS': 'Lenda entre os magos de Clivor. Dizem que o cajado pensa sozinho na batalha.',
    'SSS':'Não existe catalogado. O cajado e o portador tornaram-se a mesma coisa.',
  };
  return descByTier[enchant] || descByTier[null];
}
window._getCajadoDesc = _getCajadoDesc;

// ── Aplica desc dinâmica em itens do cajado antes de exibir ──
function _resolveItemDesc(item) {
  if (item && (item.id === 'cajado_basic' || item.id === 'arma_cajado_basic')) {
    return { ...item, desc: _getCajadoDesc() };
  }
  return item;
}

function _normalizeItem(item) {
  const base = ITEM_DB[item.id];
  if (!base) return item;
  return Object.assign({}, base, item);
}

function addItem(item, qty = 1) {
  const normalized = _normalizeItem(item);
  const existing = G.player.inventory.find(i => i.id === normalized.id && i.type === normalized.type);
  if (existing && normalized.type !== 'equipamento') {
    if (!existing.imgSrc && normalized.imgSrc) existing.imgSrc = normalized.imgSrc;
    if (!existing.icon  && normalized.icon)   existing.icon   = normalized.icon;
    existing.qty = (existing.qty || 1) + qty;
  } else {
    G.player.inventory.push({ ...normalized, qty });
  }
  buildInventoryGrid();
  if (window.QuestBoard) QuestBoard.onItemCollected(normalized.id, qty);
}

// ─────────────────────────────────────────────────────────────
//  11.5 QUADRO DE QUESTS — GOZEN (pin perto da ferraria)
//  Desbloqueia no LV 4. Atualiza a cada 2 "dias" do jogo,
//  que aqui equivalem a 48h em tempo real (2 noites seguidas).
// ─────────────────────────────────────────────────────────────
const QB_UNLOCK_LEVEL   = 4;
const QB_REFRESH_MS     = 1000 * 60 * 60 * 48; // 48h reais = 2 dias/noites do jogo
const QB_LOCATIONS_FLORESTA = ['floresta', 'floresta2'];

const QUEST_DEFS = [
  { id:'q_floresta_kills', icon:'🌲', title:'Limpeza da Floresta',
    desc:'Derrote N inimigos na floresta.', type:'kill_loc', locs:QB_LOCATIONS_FLORESTA,
    amountMin:5, amountMax:8, goldMin:40, goldMax:70, chaveQty:1 },
  { id:'q_sombras_kills', icon:'🌑', title:'Caçador das Sombras',
    desc:'Derrote N inimigos na Dungeon das Sombras.', type:'kill_loc', locPrefix:'dungeon-',
    amountMin:4, amountMax:6, goldMin:60, goldMax:100, chaveQty:1 },
  { id:'q_any_kills', icon:'⚔️', title:'Contrato de Caça',
    desc:'Vença N batalhas, em qualquer lugar.', type:'kill_any',
    amountMin:8, amountMax:12, goldMin:50, goldMax:90, chaveQty:1 },
  { id:'q_collect_cristal', icon:'💎', title:'Pó Precioso',
    desc:'Colete N de Pó de Cristal.', type:'collect', itemId:'po_cristal',
    amountMin:4, amountMax:6, goldMin:35, goldMax:60, chaveQty:1 },
  { id:'q_collect_lobo', icon:'🐾', title:'Peles para o Curtume',
    desc:'Colete N de Pele de Lobo.', type:'collect', itemId:'pele_lobo',
    amountMin:3, amountMax:5, goldMin:35, goldMax:60, chaveQty:1 },
  { id:'q_collect_corvo', icon:'🪶', title:'Penas Negras',
    desc:'Colete N de Pena de Corvo.', type:'collect', itemId:'pena_corvo',
    amountMin:3, amountMax:5, goldMin:30, goldMax:55, chaveQty:1 },
  { id:'q_gold_earn', icon:'◈', title:'Fortuna Crescente',
    desc:'Acumule N de ouro em batalhas.', type:'gold',
    amountMin:150, amountMax:250, goldMin:50, goldMax:80, chaveQty:1 },
  { id:'q_level_up', icon:'🌟', title:'Ascensão',
    desc:'Alcance o próximo nível.', type:'level',
    amountMin:1, amountMax:1, goldMin:60, goldMax:100, chaveQty:2 },
  { id:'q_visit', icon:'🏮', title:'Explorador do Vilarejo',
    desc:'Visite N locais diferentes do vilarejo.', type:'visit',
    amountMin:3, amountMax:3, goldMin:30, goldMax:50, chaveQty:1 },
];

function _qbRand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

const QuestBoard = {

  isUnlocked() {
    return (G.player && G.player.level || 1) >= QB_UNLOCK_LEVEL;
  },

  init() {
    this.checkUnlockAndRefresh();
    if (!window._qbInterval) {
      window._qbInterval = setInterval(() => this.checkUnlockAndRefresh(), 60 * 1000);
    }
  },

  generateBoard() {
    const level = G.player.level || 1;
    G.questBoard = {
      lastRefresh: Date.now(),
      visited: {},
      quests: QUEST_DEFS.map(def => {
        const amount = _qbRand(def.amountMin, def.amountMax);
        return {
          defId: def.id,
          icon: def.icon,
          title: def.title,
          desc: def.desc,
          type: def.type,
          itemId: def.itemId || null,
          locs: def.locs || null,
          locPrefix: def.locPrefix || null,
          amount: def.type === 'level' ? (level + 1) : amount,
          progress: def.type === 'level' ? level : 0,
          rewardGold: _qbRand(def.goldMin, def.goldMax),
          rewardChaveQty: def.chaveQty || 0,
          completed: false,
          claimed: false,
        };
      }),
    };
    notify('📋 Novos contratos disponíveis no Quadro de Quests!', 'gold');
  },

  checkUnlockAndRefresh() {
    if (!G.player) return;
    const unlocked = this.isUnlocked();
    if (unlocked && (!G.questBoard || (Date.now() - G.questBoard.lastRefresh) >= QB_REFRESH_MS)) {
      this.generateBoard();
    }
    this.updatePin();
  },

  updatePin() {
    const marker = document.getElementById('quest-pin-marker');
    const label  = document.getElementById('quest-pin-label');
    if (!marker) return;
    const unlocked = this.isUnlocked();
    marker.classList.toggle('quest-locked', !unlocked);
    marker.classList.toggle('quest-unlocked', unlocked);
    const hasReward = unlocked && G.questBoard && G.questBoard.quests.some(q => q.completed && !q.claimed);
    marker.classList.toggle('quest-has-reward', !!hasReward);
    if (label) label.textContent = unlocked ? 'Quadro de Quests' : `Quadro (Nv.${QB_UNLOCK_LEVEL})`;
  },

  _findOpen(type) {
    if (!G.questBoard) return [];
    return G.questBoard.quests.filter(q => q.type === type && !q.completed);
  },

  _completeIfReady(q) {
    if (q.progress >= q.amount && !q.completed) {
      q.completed = true;
      notify(`✅ Missão concluída: ${q.title}! Volte ao Quadro para resgatar.`, 'gold');
    }
  },

  onBattleWon(enemy, location) {
    if (!G.questBoard) return;
    this._findOpen('kill_any').forEach(q => { q.progress++; this._completeIfReady(q); });
    this._findOpen('kill_loc').forEach(q => {
      const defMatch = (q.locs && q.locs.includes(location)) ||
                        (q.locPrefix && location && location.indexOf(q.locPrefix) === 0);
      if (defMatch) { q.progress++; this._completeIfReady(q); }
    });
    if (enemy && enemy.gold) {
      this._findOpen('gold').forEach(q => { q.progress += enemy.gold; this._completeIfReady(q); });
    }
    this.updatePin();
  },

  onItemCollected(itemId, qty) {
    if (!G.questBoard) return;
    this._findOpen('collect').filter(q => q.itemId === itemId).forEach(q => {
      q.progress += qty; this._completeIfReady(q);
    });
    this.updatePin();
  },

  onLevelChanged() {
    this.checkUnlockAndRefresh();
    if (!G.questBoard) return;
    const level = G.player.level || 1;
    this._findOpen('level').forEach(q => { q.progress = level; this._completeIfReady(q); });
    this.updatePin();
  },

  onVisit(dest) {
    if (!G.questBoard || !dest) return;
    G.questBoard.visited[dest] = true;
    const count = Object.keys(G.questBoard.visited).length;
    this._findOpen('visit').forEach(q => { q.progress = count; this._completeIfReady(q); });
    this.updatePin();
  },

  claim(idx) {
    if (!G.questBoard) return;
    const q = G.questBoard.quests[idx];
    if (!q || !q.completed || q.claimed) return;
    q.claimed = true;
    G.player.gold += q.rewardGold;
    if (q.rewardChaveQty > 0) addItem({ id: 'chave_sombras' }, q.rewardChaveQty);
    notify(`🎁 Recompensa resgatada: +${q.rewardGold}◈ e +${q.rewardChaveQty} Chave das Sombras!`, 'gold');
    updateHUD();
    this.renderBoard();
    this.updatePin();
  },

  renderBoard() {
    const grid = document.getElementById('quest-board-grid');
    const note = document.getElementById('quest-board-refresh-note');
    if (!grid) return;
    grid.innerHTML = '';
    if (!G.questBoard) return;
    G.questBoard.quests.forEach((q, idx) => {
      const pct = Math.min(100, Math.round((q.progress / q.amount) * 100));
      const slot = document.createElement('div');
      slot.className = 'qb-slot' + (q.completed ? ' completed' : '') + (q.claimed ? ' claimed' : '');
      slot.innerHTML = `
        <div class="qb-slot-icon">${q.icon}</div>
        <div class="qb-slot-title">${q.title}</div>
        <div class="qb-slot-desc">${q.desc}</div>
        <div class="qb-slot-bar"><div class="qb-slot-bar-fill" style="width:${pct}%;"></div></div>
        <div class="qb-slot-prog">${Math.min(q.progress, q.amount)}/${q.amount}</div>
        <div class="qb-slot-reward">+${q.rewardGold}◈ · +${q.rewardChaveQty}🗝️</div>
        ${q.claimed ? '<div class="qb-slot-prog">Resgatado</div>' :
          q.completed ? `<button class="qb-slot-claim" onclick="QuestBoard.claim(${idx})">Resgatar</button>` : ''}
      `;
      grid.appendChild(slot);
    });
    if (note) {
      const nextRefresh = G.questBoard.lastRefresh + QB_REFRESH_MS;
      const hoursLeft = Math.max(0, Math.ceil((nextRefresh - Date.now()) / (1000 * 60 * 60)));
      note.textContent = `Novos contratos em ${hoursLeft}h (a cada 2 dias).`;
    }
  },
};
window.QuestBoard = QuestBoard;

function openQuestBoard() {
  if (!QuestBoard.isUnlocked()) {
    notify(`🔒 O Quadro de Quests abre a partir do Nível ${QB_UNLOCK_LEVEL}.`, 'red');
    return;
  }
  QuestBoard.checkUnlockAndRefresh();
  QuestBoard.renderBoard();
  document.getElementById('quest-board-overlay').classList.add('active');
}
window.openQuestBoard = openQuestBoard;

function closeQuestBoard() {
  document.getElementById('quest-board-overlay').classList.remove('active');
}
window.closeQuestBoard = closeQuestBoard;

// ─────────────────────────────────────────────────────────────
//  12. HABILIDADES
// ─────────────────────────────────────────────────────────────
function buildSkillList() {
  const container = document.getElementById('skill-battle-btns');
  if (!container) return;
  container.innerHTML = '';
  const cls = G.player.classData;
  if (!cls || !cls.skills) return;
  const isWarrior = ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));

  const equipped  = G.player.equippedSkills;
  // Garante que é um array válido com pelo menos 1 item
  const useFilter = Array.isArray(equipped) && equipped.filter(Boolean).length > 0;

  // Skills base da classe — só mostra as equipadas na Ficha
  cls.skills.forEach((sk, i) => {
    const key = 'b' + i;
    if (useFilter && !equipped.includes(key)) return;
    if (!isElementoDesbloqueado(sk)) return;
    const btn = document.createElement('button');
    btn.className = 'skill-battle-btn';
    // BUG-07 FIX: usa getSkillCost para mostrar e cobrar o mesmo valor
    const cost = (typeof getSkillCost === 'function')
      ? getSkillCost(sk, G.player)
      : (isWarrior ? (sk.ap || 0) : (sk.mp || 0));
    const res  = isWarrior ? (G.player.ap || 0) : (G.player.mp || 0);
    // Badge de elemento (só mago)
    const elemCarregado = (battleState && battleState._elementoCarregado) || null;
    const elemIcores = { fogo: '🔥', agua: '💧', eletrico: '⚡' };
    let elemBadge = '';
    if (sk.elemento) {
      const eIcon = elemIcores[sk.elemento] || '✦';
      const isCarregado = elemCarregado === sk.elemento;
      elemBadge = `<span style="display:inline-block;margin-left:5px;font-size:0.75rem;background:${isCarregado?'rgba(200,150,10,0.35)':'rgba(255,255,255,0.05)'};border:1px solid ${isCarregado?'rgba(200,150,10,0.7)':'rgba(255,255,255,0.1)'};padding:1px 5px;border-radius:2px;vertical-align:middle;">${eIcon}</span>`;
    }
    const skillIconHTML = sk.iconImg
      ? `<img src="${sk.iconImg}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;image-rendering:pixelated;margin-right:2px;">`
      : `${sk.icon} `;
    btn.innerHTML = `${skillIconHTML}${sk.name}${elemBadge} <span style="opacity:0.6;font-size:0.62rem">(${cost}${isWarrior?'AP':'MP'})</span>`;
    btn.disabled = res < cost;
    btn.onclick = () => doBattleAction('skill', i);
    container.appendChild(btn);
  });

  // Skills extras de talentos — só mostra as equipadas na Ficha
  if (typeof getTalentSkills === 'function') {
    getTalentSkills().forEach((sk, i) => {
      const key = 't' + i;
      if (useFilter && !equipped.includes(key)) return;
      const btn = document.createElement('button');
      btn.className = 'skill-battle-btn';
      btn.style.borderColor = 'rgba(200,170,80,0.5)';
      btn.style.background  = 'rgba(200,150,10,0.07)';
      const usesAp = sk.ap !== undefined;
      const cost   = usesAp ? sk.ap : (sk.mp || 0);
      const res    = usesAp ? (G.player.ap || 0) : (G.player.mp || 0);
      btn.innerHTML = `${sk.icon} ${sk.name} <span style="opacity:0.6;font-size:0.62rem">(${cost}${usesAp?'AP':'MP'}) ✦</span>`;
      btn.disabled = res < cost;
      btn.onclick = () => doBattleAction('skill', 'talent_' + i);
      container.appendChild(btn);
    });
  }
  // Atualiza visibilidade do botão de Fusão
  if (typeof updateFusaoBtn === 'function') updateFusaoBtn();
}

// ─────────────────────────────────────────────────────────────
//  12b. FICHA DO HERÓI
// ─────────────────────────────────────────────────────────────
function openCharacterScreen() {
  buildCharacterScreen();
  document.getElementById('char-overlay').classList.add('active');
}

function closeCharacterScreen() {
  document.getElementById('char-overlay').classList.remove('active');
}

function charStat(icon, label, value, color) {
  return `<div class="char-stat-row">
    <span class="char-stat-icon">${icon}</span>
    <span class="char-stat-label">${label}</span>
    <span class="char-stat-val" style="color:${color};">${value}</span>
  </div>`;
}

function buildCharacterScreen(targetId) {
  const p   = G.player;
  const cls = p.classData;
  if (!cls) return;

  const isWarrior    = ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));
  const baseSkills   = cls.skills || [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
  const allAvailable = baseSkills.length + talentSkills.length;

  // Remove do array de equipados qualquer skill base que esteja bloqueada
  // (ex.: Água/Elétrico presos num slot de uma sessão/save anterior ao bug ser corrigido)
  let equipped = (p.equippedSkills || []).filter(key => {
    if (!key || typeof key !== 'string' || !key.startsWith('b')) return true;
    const sk = baseSkills[parseInt(key.slice(1))];
    return sk ? (typeof isElementoDesbloqueado !== 'function' || isElementoDesbloqueado(sk)) : true;
  });

  // ── 3 slots fixos ──
  // Garante sempre 3 slots (preenche com skills base DESBLOQUEADAS se vazio).
  // Antes pegava cegamente b0/b1/b2 (Fogo/Água/Elétrico no Mago), ignorando
  // se o elemento estava bloqueado — por isso os 3 iniciais apareciam
  // equipados mesmo antes/sem o jogador escolher. Agora pula bloqueados.
  if (equipped.length < 3) {
    for (let idx = 0; idx < baseSkills.length && equipped.length < 3; idx++) {
      const key = 'b' + idx;
      if (equipped.includes(key)) continue;
      const skCandidate = baseSkills[idx];
      if (skCandidate && typeof isElementoDesbloqueado === 'function' && !isElementoDesbloqueado(skCandidate)) continue;
      equipped.push(key);
    }
  }
  if (equipped.length > 3) equipped.splice(3);
  G.player.equippedSkills = equipped;

  const slotsHTML = [0, 1, 2].map(i => {
    const key = equipped[i];
    let sk = null, isTalent = false;
    if (key && key.startsWith('b')) sk = baseSkills[parseInt(key[1])];
    else if (key && key.startsWith('t')) { sk = talentSkills[parseInt(key.slice(1))]; isTalent = true; }
    return sk
      ? `<div class="char-skill-slot filled${isTalent ? ' talent' : ''}" onclick="unequipSkillSlot(${i})" title="Toque para desequipar">
          <div class="char-skill-slot-num">SLOT ${i+1}</div>
          <div class="char-skill-slot-icon">${sk.iconImg ? `<img src="${sk.iconImg}" style="width:36px;height:36px;object-fit:contain;image-rendering:pixelated;" onerror="this.outerHTML='${sk.icon}'">` : sk.icon}</div>
          <span>${sk.name}</span>
          <div class="slot-swap-hint" style="font-size:0.45rem;color:rgba(200,80,60,0.5);letter-spacing:1px;">✕ soltar</div>
        </div>`
      : `<div class="char-skill-slot empty" onclick="openSlotPicker(${i})">
          <div class="char-skill-slot-num">SLOT ${i+1}</div>
          <div class="char-skill-slot-icon" style="font-size:0.9rem;color:rgba(200,150,10,0.2);">+</div>
          <span>Vazio</span>
        </div>`;
  }).join('');

  // ── Lista de skills — toque abre picker de slot ──
  let allSkillsHTML = '';

  baseSkills.forEach((sk, i) => {
    const key  = 'b' + i;
    const slot = equipped.indexOf(key);
    const isEq = slot >= 0;
    const lvReq = sk.levelRequired || 1;
    const isLocked = !isElementoDesbloqueado(sk);
    const cost = (typeof getSkillCost === 'function')
      ? getSkillCost(sk, p)
      : (isWarrior ? (sk.ap || 0) : (sk.mp || 0));
    // Ação: se bloqueado, avisa; se equipado, desequipa; se não equipado, auto-slot livre ou abre picker
    const isPendingChoice = (p.elementoEscolhido === null) && ELEMENTOS_INICIAIS.includes(sk.elemento || '');
    // Os outros 2 elementos iniciais (não escolhidos) ficam bloqueados PARA SEMPRE,
    // não é um bloqueio por nível — então a mensagem não pode dizer "desbloqueia no LV X"
    const isOutroInicial = isLocked && !isPendingChoice && ELEMENTOS_INICIAIS.includes(sk.elemento || '');
    const clickAction = isLocked
      ? (isPendingChoice
          ? `mostrarEscolhaElementoIngame()`
          : (isOutroInicial
              ? `notify('🔒 ${sk.name} não foi seu elemento inicial — permanece bloqueado.', 'red')`
              : `notify('🔒 ${sk.name} desbloqueia no LV ${lvReq}', 'red')`))
      : (isEq ? `unequipSkillSlot(${slot})` : `autoEquipSkill('${key}')`);
    const iconHTML = isLocked
      ? (isPendingChoice
          ? `<span style="font-size:1.4rem;filter:hue-rotate(0deg);opacity:0.7;">🔮</span>`
          : `<span style="font-size:1.4rem;filter:grayscale(1);opacity:0.5;">🔒</span>`)
      : (sk.iconImg
        ? `<img src="${sk.iconImg}" style="width:36px;height:36px;object-fit:contain;image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none;font-size:1.4rem;">${sk.icon}</span>`
        : `<span style="font-size:1.4rem;">${sk.icon}</span>`);
    const lockedLabel = isPendingChoice
      ? `<span style="font-size:0.5rem;color:rgba(200,150,10,0.7);background:rgba(200,150,10,0.12);padding:1px 5px;border-radius:2px;">ESCOLHER</span>`
      : (isOutroInicial
          ? `<span style="font-size:0.5rem;color:rgba(200,80,60,0.6);">BLOQUEADO</span>`
          : (isLocked ? `<span style="font-size:0.5rem;color:rgba(200,80,60,0.6);">LV${lvReq}</span>` : ''));
    allSkillsHTML += `
      <div class="char-skill-card${isEq && !isLocked ? ' char-skill-equipped' : ''}${isLocked ? ' char-skill-locked' : ''}" onclick="${clickAction}" style="${isLocked && !isPendingChoice ? 'opacity:0.4;cursor:not-allowed;' : (isPendingChoice ? 'opacity:0.75;cursor:pointer;border-color:rgba(200,150,10,0.3);' : '')}">
        <div class="char-skill-card-icon">${iconHTML}</div>
        <div class="char-skill-card-info">
          <div class="char-skill-card-name">${sk.name}${isEq && !isLocked ? ` <span class="char-eq-badge">SLOT ${slot+1}</span>` : ''} ${lockedLabel}</div>
          <div class="char-skill-card-desc">${isPendingChoice ? 'Toque para escolher seu elemento inicial.' : sk.desc}</div>
          <div class="char-skill-card-cost">${cost}${isWarrior ? 'AP' : 'MP'}</div>
        </div>
        <div style="font-size:1.1rem;color:${isLocked ? (isPendingChoice ? 'rgba(200,150,10,0.6)' : 'rgba(200,80,60,0.4)') : (isEq ? 'rgba(200,80,60,0.8)' : 'rgba(200,150,10,0.18)')};">${isLocked ? (isPendingChoice ? '✦' : '') : (isEq ? '✕' : '○')}</div>
      </div>`;
  });

  talentSkills.forEach((sk, i) => {
    const key    = 't' + i;
    const slot   = equipped.indexOf(key);
    const isEq   = slot >= 0;
    const usesAp = sk.ap !== undefined;
    const cost   = usesAp ? sk.ap : (sk.mp || 0);
    const clickAction = isEq
      ? `unequipSkillSlot(${slot})`
      : `autoEquipSkill('${key}')`;
    allSkillsHTML += `
      <div class="char-skill-card talent-skill${isEq ? ' char-skill-equipped' : ''}" onclick="${clickAction}">
        <div class="char-skill-card-icon"><span style="font-size:1.4rem;">${sk.icon}</span></div>
        <div class="char-skill-card-info">
          <div class="char-skill-card-name">${sk.name} <span style="font-size:0.52rem;color:rgba(200,170,80,0.65);">✦ TALENTO</span>${isEq ? ` <span class="char-eq-badge">SLOT ${slot+1}</span>` : ''}</div>
          <div class="char-skill-card-desc">${sk.desc}</div>
          <div class="char-skill-card-cost">${cost}${usesAp ? 'AP' : 'MP'} · Talento</div>
        </div>
        <div style="font-size:1.1rem;color:${isEq ? 'rgba(200,80,60,0.8)' : 'rgba(200,150,10,0.18)'};">${isEq ? '✕' : '○'}</div>
      </div>`;
  });

  if (!allSkillsHTML) {
    allSkillsHTML = '<div style="color:rgba(200,150,10,0.3);text-align:center;padding:20px;font-size:0.8rem;font-style:italic;">Nenhuma habilidade disponível.</div>';
  }

  // ── Render Habilidades (3 slots + lista) ──
  const habsHTML = `
    <div class="char-section">
      <div class="char-section-title">⚡ HABILIDADES EM BATALHA</div>
      <div class="char-skill-slots">${slotsHTML}</div>
      <div class="char-section-sub">Toque numa habilidade para escolher em qual slot colocar</div>
      <div class="char-skills-list">${allSkillsHTML}</div>
    </div>`;

  // ── Decide onde renderizar ──
  const containerId = targetId || 'char-content';
  if (containerId === 'char-content') {
    // Overlay simples (char-overlay): só perfil
    document.getElementById(containerId).innerHTML = perfilHTML;
  } else {
    // Overlay de talentos: só habilidades (árvore de talentos renderizada separado)
    document.getElementById(containerId).innerHTML = habsHTML;
  }
}

// ── Abre popup para escolher qual slot recebe a skill ──
function openSlotPickerForSkill(key) {
  const p   = G.player;
  const cls = p.classData;
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
  const equipped     = p.equippedSkills || ['b0','b1','b2'];

  // Nome da skill selecionada
  let skName = key, skIcon = '⚡';
  if (key.startsWith('b')) {
    const sk = baseSkills[parseInt(key[1])]; if (sk) { skName = sk.name; skIcon = sk.icon; }
  } else if (key.startsWith('t')) {
    const sk = talentSkills[parseInt(key.slice(1))]; if (sk) { skName = sk.name; skIcon = sk.icon; }
  }

  // Monta nomes dos slots atuais
  const slotNames = [0,1,2].map(i => {
    const k = equipped[i];
    if (!k) return 'Vazio';
    if (k.startsWith('b')) { const s = baseSkills[parseInt(k[1])]; return s ? s.name : '?'; }
    if (k.startsWith('t')) { const s = talentSkills[parseInt(k.slice(1))]; return s ? s.name : '?'; }
    return '?';
  });

  // Remove popup anterior se existir
  const old = document.getElementById('slot-picker-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'slot-picker-popup';
  popup.style.cssText = `
    position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.82);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  popup.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);padding:22px 18px;width:100%;max-width:340px;">
      <div style="font-family:'Noto Serif JP',serif;font-size:0.7rem;color:rgba(200,150,10,0.5);letter-spacing:4px;margin-bottom:4px;">COLOCAR EM QUAL SLOT?</div>
      <div style="font-size:1.1rem;color:var(--gold2);font-family:'Noto Serif JP',serif;margin-bottom:18px;">${skIcon} ${skName}</div>
      <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:16px;">
        ${[0,1,2].map(i => `
          <button onclick="assignSkillToSlot('${key}', ${i})" style="
            display:flex;align-items:center;justify-content:space-between;
            background:rgba(200,150,10,0.06);border:1px solid rgba(200,150,10,0.25);
            color:var(--gold2);font-family:'Noto Serif JP',serif;font-size:0.75rem;
            padding:10px 14px;cursor:pointer;letter-spacing:1px;width:100%;
          ">
            <span>SLOT ${i+1}</span>
            <span style="color:rgba(200,150,10,0.5);font-size:0.68rem;">${slotNames[i]}</span>
            <span style="color:rgba(200,150,10,0.4);">→</span>
          </button>`).join('')}
      </div>
      <button onclick="document.getElementById('slot-picker-popup').remove()" style="
        width:100%;background:transparent;border:1px solid rgba(200,150,10,0.2);
        color:rgba(200,150,10,0.45);font-family:'Noto Serif JP',serif;font-size:0.68rem;
        padding:8px;cursor:pointer;letter-spacing:2px;
      ">CANCELAR</button>
    </div>
  `;

  document.body.appendChild(popup);
}

// ── Confirma a troca de skill num slot específico ──
function assignSkillToSlot(key, slotIdx) {
  const p = G.player;
  if (!p.equippedSkills) p.equippedSkills = ['b0','b1','b2'];
  while (p.equippedSkills.length < 3) p.equippedSkills.push(null);

  const cls = p.classData;
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];

  let skName = key;
  if (key.startsWith('b')) { const sk = baseSkills[parseInt(key[1])]; if (sk) skName = sk.name; }
  else if (key.startsWith('t')) { const sk = talentSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }

  // Remove a skill de qualquer outro slot onde esteja
  p.equippedSkills = p.equippedSkills.map(k => k === key ? null : k);
  // Coloca no slot escolhido
  p.equippedSkills[slotIdx] = key;
  // Garante exatamente 3
  p.equippedSkills = p.equippedSkills.slice(0, 3);

  // Fecha popup
  const popup = document.getElementById('slot-picker-popup');
  if (popup) popup.remove();

  notify(`✓ "${skName}" no Slot ${slotIdx+1}!`, 'gold');

  // Rebuild
  const inOverlay = document.getElementById('talent-overlay') &&
                    document.getElementById('talent-overlay').style.display === 'flex';
  if (inOverlay) {
    buildCharacterScreen('char-content-tt');
    if (typeof buildPerfilPane === 'function') buildPerfilPane();
  } else {
    buildCharacterScreen();
  }
  buildSkillList();
  saveGame();
}

// ── Abre picker clicando direto no slot ──
function openSlotPicker(slotIdx) {
  const p   = G.player;
  const cls = p.classData;
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
  const equipped     = p.equippedSkills || ['b0','b1','b2'];

  const old = document.getElementById('slot-picker-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'slot-picker-popup';
  popup.style.cssText = `
    position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.82);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  const allSkills = [
    ...baseSkills.map((sk, i) => ({ key: 'b'+i, sk })),
    ...talentSkills.map((sk, i) => ({ key: 't'+i, sk, isTalent: true })),
  ];

  const skillBtns = allSkills.map(({ key, sk, isTalent }) => {
    const currentSlot = equipped.indexOf(key);
    const label = currentSlot >= 0 ? `<span style="color:rgba(200,170,80,0.6);font-size:0.62rem;">SLOT ${currentSlot+1}</span>` : '';
    return `<button onclick="assignSkillToSlot('${key}', ${slotIdx})" style="
      display:flex;align-items:center;gap:10px;
      background:rgba(200,150,10,0.05);border:1px solid rgba(200,150,10,0.2);
      color:var(--gold2);font-family:'Noto Serif JP',serif;font-size:0.72rem;
      padding:9px 12px;cursor:pointer;width:100%;text-align:left;
    ">
      <span style="font-size:1.1rem;">${sk.icon}</span>
      <span style="flex:1;">${sk.name}${isTalent ? ' <span style="font-size:0.55rem;color:rgba(200,170,80,0.5);">✦</span>' : ''}</span>
      ${label}
    </button>`;
  }).join('');

  popup.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);padding:22px 18px;width:100%;max-width:340px;max-height:80vh;overflow-y:auto;">
      <div style="font-family:'Noto Serif JP',serif;font-size:0.7rem;color:rgba(200,150,10,0.5);letter-spacing:4px;margin-bottom:14px;">SLOT ${slotIdx+1} — ESCOLHER HABILIDADE</div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">${skillBtns}</div>
      <button onclick="document.getElementById('slot-picker-popup').remove()" style="
        width:100%;background:transparent;border:1px solid rgba(200,150,10,0.2);
        color:rgba(200,150,10,0.45);font-family:'Noto Serif JP',serif;font-size:0.68rem;
        padding:8px;cursor:pointer;letter-spacing:2px;
      ">CANCELAR</button>
    </div>
  `;
  document.body.appendChild(popup);
}

// Mantido por compatibilidade (não usado mais diretamente)
function toggleSkillEquip(key) { openSlotPickerForSkill(key); }

// ── Desequipa skill do slot (toque no slot ocupado ou no card equipado) ──
function unequipSkillSlot(slotIdx) {
  const p = G.player;
  if (!p.equippedSkills) return;
  const key = p.equippedSkills[slotIdx];
  if (!key) return;
  p.equippedSkills[slotIdx] = null;
  const cls = p.classData;
  const baseSkills = cls ? (cls.skills || []) : [];
  let skName = key;
  if (key.startsWith('b')) { const sk = baseSkills[parseInt(key[1])]; if (sk) skName = sk.name; }
  notify(`"${skName}" removido do Slot ${slotIdx + 1}`, 'gold');
  _rebuildCharScreen();
  saveGame();
}

// ── Auto-equipa no primeiro slot vazio; se tudo ocupado, abre picker ──
function autoEquipSkill(key) {
  const p = G.player;
  if (!p.equippedSkills) p.equippedSkills = [null, null, null];
  while (p.equippedSkills.length < 3) p.equippedSkills.push(null);
  // Primeiro slot vazio
  const freeSlot = p.equippedSkills.indexOf(null);
  if (freeSlot >= 0) {
    // Remove de qualquer outro slot onde já esteja
    p.equippedSkills = p.equippedSkills.map(k => k === key ? null : k);
    p.equippedSkills[freeSlot] = key;
    const cls = p.classData;
    const baseSkills = cls ? (cls.skills || []) : [];
    const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
    let skName = key;
    if (key.startsWith('b')) { const sk = baseSkills[parseInt(key[1])]; if (sk) skName = sk.name; }
    else if (key.startsWith('t')) { const sk = talentSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }
    notify(`✓ "${skName}" → Slot ${freeSlot + 1}`, 'gold');
    _rebuildCharScreen();
    saveGame();
  } else {
    // Todos ocupados — abre picker para trocar
    openSlotPickerForSkill(key);
  }
}

// ── Helper: reconstrói a tela de habilidades no contexto certo ──
function _rebuildCharScreen() {
  const inOverlay = document.getElementById('talent-overlay') &&
                    document.getElementById('talent-overlay').style.display === 'flex';
  if (inOverlay) {
    buildCharacterScreen('char-content-tt');
    if (typeof buildPerfilPane === 'function') buildPerfilPane();
  } else {
    buildCharacterScreen();
  }
  buildSkillList();
}


// ─────────────────────────────────────────────────────────────
//  13. SISTEMA DE HISTÓRIA / NODOS
// ─────────────────────────────────────────────────────────────
function setStory(speaker, text, choices = [], imgSrc = null) {
  document.getElementById('story-speaker').textContent = speaker;

  // Mostrar/ocultar card do NPC
  if (typeof showNpcThumb === 'function') showNpcThumb(imgSrc, speaker);

  const el = document.getElementById('story-text');
  el.innerHTML = '';
  const formatted = text.replace(/\n/g, '<br>');
  let i = 0;
  if (window._typeTimer) clearInterval(window._typeTimer);
  window._typeTimer = setInterval(() => {
    i++;
    el.innerHTML = formatted.substring(0, i);
    if (i >= formatted.length) clearInterval(window._typeTimer);
  }, 18);

  buildChoices(choices);
}

function buildChoices(choices) {
  const area = document.getElementById('choices-area');
  area.innerHTML = '';
  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<span class="choice-icon">${c.icon || '▶'}</span>${c.text}`;
    btn.onclick = c.action;
    area.appendChild(btn);
  });
}

function setScene(loc) {
  G.location = loc;
  const bg = document.getElementById('scene-bg');

  // Remove todas as classes de cena
  bg.className = 'scene-bg';

  const sceneMap = {
    floresta:         'floresta',
    floresta2:        'floresta',
    vilarejo:         'vilarejo',
    estalagem:        'estalagem',
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
  };
  const cls = sceneMap[loc] || 'floresta';
  bg.classList.add(cls);

  // Música: Dungeon das Sombras tem playlist exclusiva (gloria_antica, Sont, the_sullen_gate),
  // tocando uma após a outra em loop. Ao sair da dungeon, retoma a playlist da floresta.
  if (loc.indexOf('dungeon-') === 0) {
    AudioSys.play('dungeonSombras');
  } else if (AudioSys._dungeonActive) {
    AudioSys.play('floresta');
  }

  // Ativa/desativa pins do vilarejo
  const vilPins = document.getElementById('scene-village-pins');
  if (vilPins) vilPins.classList.toggle('active', loc === 'vilarejo');

  // Atualiza nome da localização
  const names = {
    floresta:         'FLORESTA DE CLIVOR',
    floresta2:        'MARGEM DA FLORESTA',
    vilarejo:         'VILAREJO DA PEDRA BRANCA',
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
  };
  const captions = {
    floresta:         'Sombras densas e o sussurro das folhas ao vento...',
    floresta2:        'A floresta se aprofunda... o vilarejo deve estar próximo.',
    vilarejo:         'Toque nos ícones do mapa para explorar os locais.',
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
  };
  document.getElementById('location-name').textContent    = names[loc]    || loc.toUpperCase();
  document.getElementById('location-caption').textContent = captions[loc] || '';
}

// ── Gera HTML de sprite animado ou imagem estática ──
function buildEnemyVisual(enemy, size, animState) {
  if (!enemy.sprite) {
    // Fallback: imagem estática (mix-blend-mode:screen remove fundo escuro) ou emoji
    if (enemy.img) {
      return `<img src="${enemy.img}" alt="${enemy.name}"
        style="max-width:${size}px;max-height:${size}px;width:auto;height:auto;
               object-fit:contain;display:block;
               mix-blend-mode:screen;background:transparent;
               filter:drop-shadow(0 0 22px rgba(200,80,20,0.9)) drop-shadow(0 0 8px rgba(0,0,0,0.95));"
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
  if (cls.iconImg) return `<img src="${cls.iconImg}" style="width:${size}px;height:${size}px;object-fit:contain;vertical-align:middle;" alt="${cls.name}">`;
  const color = cls.color || 'rgba(200,150,10,0.6)';
  const fs = Math.round(size * 0.52);
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.85) 100%);border:1.5px solid ${color};box-shadow:0 0 14px ${color}55,inset 0 0 10px ${color}22;font-size:${fs}px;line-height:1;">${cls.icon}</span>`;
}

function buildHeroVisual(size, animName) {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return clsIconHtml(cls, 60);

  // MODO: imagens separadas por animação.
  // Usado pelo Mago com:
  // sprite: { type:'images', images:{ idle:'...', attack:'...', tak:'...' } }
  if (cls.sprite.type === 'images') {
    const s = cls.sprite;
    const images = s.images || {};
    const src =
      images[animName] ||
      images.idle ||
      images.attack;

    if (!src) return clsIconHtml(cls, 60);

    const isPaladinoImg = cls.id === 'paladino';
    const containerH = size;
    const containerW = isPaladinoImg
      ? size
      : Math.round(size * 1.55);
    const renderH = containerH;

    return `
      <div style="
        position:relative;
        width:${containerW}px;
        max-width:46vw;
        height:${containerH}px;
        flex:0 0 auto;
        overflow:visible;
      ">
        <img src="${src}" alt="${cls.name || 'Herói'}"
          style="
            position:absolute;
            bottom:0;
            left:50%;
            transform:translateX(-50%);
            height:${renderH}px;
            width:auto;
            max-width:44vw;
            object-fit:contain;
            display:block;
            image-rendering:auto;
            filter:drop-shadow(0 0 14px rgba(200,160,10,0.7)) drop-shadow(0 0 4px rgba(0,0,0,0.9));
          "
          onerror="this.outerHTML='<span style=\\'font-size:3rem\\'>${cls.icon || '⚔️'}</span>'">
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

// Troca a animação do herói no overlay de batalha
function setHeroAnim(animName, revertAfterMs) {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return;
  const el = document.getElementById('bat-hero-icon');
  if (!el) return;

  // MODO imagens separadas: troca só o src, sem recriar o DOM → zero pisca
  if (cls.sprite.type === 'images') {
    const images = cls.sprite.images || {};
    const src = images[animName] || images.idle || images.attack;
    if (!src) return;
    let img = el.querySelector('img[data-hero-sprite]');
    if (img) {
      img.src = src;
    } else {
      const currentOpacity   = el.style.opacity;
      const currentTransform = el.style.transform;
      const currentTransition = el.style.transition;
      el.innerHTML = buildHeroVisual(125, animName);
      img = el.querySelector('img');
      if (img) img.setAttribute('data-hero-sprite', '1');
      if (currentOpacity && currentOpacity !== '1' && currentOpacity !== '')
        el.style.opacity = currentOpacity;
      if (currentTransform && currentTransform !== '' && currentTransform !== 'none') {
        el.style.transition = currentTransition || '';
        el.style.transform  = currentTransform;
      }
    }
    if (revertAfterMs) {
      setTimeout(() => {
        const img2 = el && el.querySelector('img[data-hero-sprite]');
        const idleSrc = images.idle || images.attack;
        if (img2 && idleSrc) img2.src = idleSrc;
        else if (el) el.innerHTML = buildHeroVisual(125, 'idle');
        if (el) { el.style.transform = ''; el.style.transition = ''; }
      }, revertAfterMs);
    }
    return;
  }

  // Spritesheet — comportamento original
  const currentOpacity   = el.style.opacity;
  const currentTransform = el.style.transform;
  const currentTransition = el.style.transition;
  el.innerHTML = buildHeroVisual(125, animName);
  if (currentOpacity && currentOpacity !== '1' && currentOpacity !== '')
    el.style.opacity = currentOpacity;
  if (currentTransform && currentTransform !== '' && currentTransform !== 'none') {
    el.style.transition = currentTransition || '';
    el.style.transform  = currentTransform;
  }
  if (revertAfterMs) {
    setTimeout(() => {
      if (el) {
        el.innerHTML = buildHeroVisual(125, 'idle');
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
//  14. NODOS DE HISTÓRIA — FLORESTA
// ─────────────────────────────────────────────────────────────
function storyNode_floresta() {
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
                  `Tierra se posiciona. As raízes ao redor dele se erguem lentamente do chão.\n\nIsso não é raiva. É um teste.\n\n✦ CHEFE: ${CAO_GUARDIAO.desc}`,
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
}

function storyNode_explorar() {
  setScene('floresta');
  hideEnemy();

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

  const pool = getPoolPorLevel(G.player.level);
  const enemy = pool[Math.floor(Math.random() * pool.length)];
  showEnemy(enemy);

  const opcoesExplorar = [
    { icon:'⚔️', text:`Lutar contra o ${enemy.name}!`, action: () => startBattle(enemy) },
    { icon:'💨', text:'Recuar', action: storyNode_floresta },
  ];
  if (G.mapUnlocked) opcoesExplorar.push({ icon:'🏘️', text:'Voltar ao Vilarejo', action: storyNode_vilarejo });

  setStory('NARRADOR',
    `Você avança com cautela entre as árvores retorcidas. De entre as sombras, um ${enemy.name} surge — ${enemy.desc}`,
    opcoesExplorar
  );
}

// ── Nodo: coleta de ervas no mundo ──
function storyNode_encontrarErvas() {
  const ervasDisponiveis = [
    { id:'erva_cura',     name:'Erva Medicinal',    icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', desc:'Recupera 15 HP.',      type:'consumível', weight:0.2, qty:1 },
    { id:'erva_cura',     name:'Erva Medicinal',    icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', desc:'Recupera 15 HP.',      type:'consumível', weight:0.2, qty:2 },
    { id:'erva_rara',     name:'Erva da Névoa',     icon:'🍃', imgSrc:'Imagens/cosméticos/erva.png', desc:'Recupera 30 HP. Rara.', type:'consumível', weight:0.2, qty:1 },
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
  const pool = getPoolPorLevel(G.player.level);
  const enemy = pool[Math.floor(Math.random() * pool.length)];
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
  const kills = G.player.kills || 0;
  let afterText;
  if (kills <= 3) {
    afterText = `${enemy.name} cai ao chão. Seu primeiro sangue nesta terra. A floresta observa em silêncio.\n\n+${enemy.xp} experiência, +${enemy.gold} moedas.`;
  } else if (kills <= 10) {
    afterText = `${enemy.name} é derrotado. Você está encontrando seu ritmo — as criaturas corrompidas testam-te para o Lich.\n\n+${enemy.xp} experiência, +${enemy.gold} moedas.`;
  } else {
    afterText = `${enemy.name} cai. As criaturas da floresta já reconhecem a sua presença. Você está se tornando uma lenda de Clivor.\n\n+${enemy.xp} experiência, +${enemy.gold} moedas.`;
  }

  setStory('NARRADOR', afterText, [
    { icon:'🗺️', text:'Continuar explorando', action: storyNode_explorar },
    { icon:'🔥', text:'Descansar um momento', action: storyNode_descansar },
    { icon:'⚔️', text:'Procurar mais inimigos', action: storyNode_buscarCombate },
  ]);
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

//  15. SISTEMA DE BATALHA
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  15. SISTEMA DE BATALHA — VERSÃO EXPANDIDA
//  · IA de inimigo com comportamentos variados por tipo
//  · Efeitos de status: veneno, queimadura, lentidão, atordoamento, sangramento
//  · Críticos, combo, contra-ataque passivo
//  · Números de dano flutuantes
//  · Flash de dano + shake visual
//  · Medidor de combo (streak de ataques sem levar dano)
//  · Resistências de inimigo
//  · Barra de turno visual
// ─────────────────────────────────────────────────────────────

// ── Constantes de batalha ──
const BATTLE_CONFIG = {
  CRIT_BASE_CHANCE: 0.08,      // 8% chance crítico base
  CRIT_MULTIPLIER: 1.85,       // dano crítico = 185% do normal
  COMBO_WINDOW: 3,             // ataques seguidos para ativar bônus combo
  COMBO_BONUS_DMG: 0.15,       // +15% dano por combo tier
  COUNTER_CHANCE: 0.12,        // 12% de contra-atacar ao defender
  ENEMY_SPECIAL_CHANCE: 0.25,  // 25% inimigo usa ataque especial
  MISS_CHANCE: 0.06,           // 6% base de errar
  DODGE_BONUS_PER_SPD: 0.003,  // cada ponto de VEL = +0.3% esquiva
  POISON_DMG_BASE: 8,
  BURN_DMG_BASE: 10,
  BLEED_DMG_BASE: 6,
};

// ── Estado de batalha expandido ──
let battleState = {
  enemyHp: 0,
  enemyMaxHp: 0,
  enemyData: null,
  turnCount: 1,
  phase: 'player',             // 'player' | 'enemy' | 'resolving'

  // Defesa e escudo
  defending: false,
  _shieldActive: false,

  // Combo do jogador
  comboCount: 0,               // ataques consecutivos sem levar dano
  comboTier: 0,                // 0-3, cada tier +15% dano

  // Efeitos no inimigo
  enemyPoisoned: false,
  enemyPoisonTurns: 0,
  enemyBurning: false,
  enemyBurnTurns: 0,
  enemySlowed: false,
  enemySlowTurns: 0,
  enemyStunned: false,
  enemyStunTurns: 0,

  // Efeitos no jogador
  playerPoisoned: false,
  playerPoisonTurns: 0,
  playerBleeding: false,
  playerBleedTurns: 0,
  playerStunned: false,
  playerStunTurns: 0,

  // Buffs do jogador
  _buffAtkTurns: 0,
  _buffAtkAmt: 0,
  _buffDefTurns: 0,
  _buffDefAmt: 0,
  _regenTurns: 0,

  // Buff do Coração Incandescente (ativa sozinho a cada início de batalha)
  _coracaoTurns: 0,
  _coracaoAtkAmt: 0,
  _coracaoCritAmt: 0,

  // Stats do inimigo para IA
  enemyTurnAI: 0,              // contador de turno do inimigo
  enemyEnraged: false,         // <30% HP: inimigo fica frenético

  // Memória de ações do jogador — usada pelo inimigo para reagir a padrões
  playerActionHistory: [],     // [{turn, type, key, name, isCrit, tags}], mais recente no fim, máx 4

  // Novos status (Mago — sistema de fusões)
  _enemyFrozen: false,
  _enemyRooted: false,        _enemyRootedTurns: 0,
  _enemyDefDown: false,       _enemyDefDownTurns: 0,  _enemyDefDownAmt: 0,
  _enemyAtkDown: false,       _enemyAtkDownTurns: 0,
  _enemyBlinded: false,       _enemyBlindedTurns: 0,
  _enemyMissNext: false,
  _enemyBuffsCleared: false,
  _playerEvasion: 0,          _playerEvasionTurns: 0,
  _geloNegroDrain: false,
  _plantaDrain: false,        _plantaDrainTurns: 0,
};

// ── Padrões de IA por tipo de inimigo ──
const ENEMY_AI = {
  rato: {
    name: 'frenético',
    specialName: 'Investida Rápida',
    specialIcon: '💨',
    specialDesc: 'Ataca duas vezes em um turno!',
    special(bs, p, e) {
      const d1 = calcEnemyDmg(e, p, bs, 0.7);
      const d2 = calcEnemyDmg(e, p, bs, 0.7);
      applyDmgToPlayer(d1 + d2, bs, p);
      appendBattleLog(`${e.icon || '🐀'} Investida Rápida! Dois ataques: -${d1} e -${d2} HP!`, '#e06040');
    }
  },
  aranha: {
    name: 'venenosa',
    specialName: 'Mordida Venenosa',
    specialIcon: '☠️',
    specialDesc: 'Aplica veneno: sangue envenenado por 4 turnos!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 0.6);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul) {
        bs.playerPoisoned = true;
        bs.playerPoisonTurns = 4;
        appendBattleLog(`${e.icon || '🕷️'} Mordida Venenosa! -${d} HP + ☠ Veneno por 4 turnos!`, '#60c060');
      } else {
        appendBattleLog(`${e.icon || '🕷️'} Mordida Venenosa! -${d} HP (veneno bloqueado pelo Espírito de Aço!)`, '#60c060');
      }
    }
  },
  corvo: {
    name: 'evasivo',
    specialName: 'Bico Furador',
    specialIcon: '🩸',
    specialDesc: 'Causa sangramento: dano ao longo do tempo!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 0.9);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul && !p._talent_dark_immune_bleed) {
        bs.playerBleeding = true;
        bs.playerBleedTurns = 3;
        appendBattleLog(`${e.icon || '🐦'} Bico Furador! -${d} HP + 🩸 Sangramento por 3 turnos!`, '#c04040');
      } else {
        appendBattleLog(`${e.icon || '🐦'} Bico Furador! -${d} HP (sangramento bloqueado!)`, '#c04040');
      }
    }
  },
  cobra: {
    name: 'traiçoeira',
    specialName: 'Golpe Relâmpago',
    specialIcon: '⚡',
    specialDesc: 'Ignora defesa — ataque puro!',
    special(bs, p, e) {
      const d = Math.max(1, Math.floor(e.atk * 1.4 + Math.random() * 5));
      applyDmgToPlayer(d, bs, p, true); // ignora DEF
      appendBattleLog(`${e.icon || '🐍'} Golpe Relâmpago! Ignora defesa! -${d} HP!`, '#e08020');
    }
  },
  lobo: {
    name: 'feroz',
    specialName: 'Uivo Selvagem',
    specialIcon: '🌑',
    specialDesc: 'Potencializa o próximo ataque (+50% dano)!',
    special(bs, p, e) {
      bs._wolfEnrage = true;
      appendBattleLog(`${e.icon || '🐺'} Uivo Selvagem! Próximo ataque será devastador!`, '#c040c0');
    }
  },
  tierra: {
    name: 'guardião ancestral',
    specialName: 'Pulso da Terra',
    specialIcon: '🌿',
    specialDesc: 'A floresta inteira vibra — atordoa e causa dano em área!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — 50% HP: enraivece, ATQ sobe
      if (hpPct <= 0.5 && !bs._tierraPhase2) {
        bs._tierraPhase2 = true;
        e.atk = Math.floor(e.atk * 1.3);
        appendBattleLog(`🌿 Tierra ruge! A floresta responde — ATQ aumentado!`, '#80c040');
        appendBattleLog(`🌿 "Você ainda respira... Então prove que merece isso."`, '#70b830');

        // Pulso da Terra: dano + atordoa
        const d = Math.max(1, Math.floor(e.atk * 1.2 - p.def / 3 + Math.random() * 6));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🌿 Pulso da Terra! O chão treme! -${d} HP!`, '#80c040');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // FASE 3 — 20% HP: desespero da floresta
      if (hpPct <= 0.2 && !bs._tierraPhase3) {
        bs._tierraPhase3 = true;
        appendBattleLog(`🌿 Tierra abaixa a cabeça... as folhas caem ao redor dele em silêncio.`, '#a0d060');
        appendBattleLog(`🌿 "...Você é diferente. Sinto isso agora."`, '#90c050');

        // Ataque final poderoso mas deixa mensagem
        const d = Math.max(1, Math.floor(e.atk * 1.6 - p.def / 4 + Math.random() * 8));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🌿 Último Rugido da Floresta! -${d} HP!`, '#c0e060');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // Especial normal: Passos Perdidos — confunde e envenena
      const d = Math.max(1, Math.floor(e.atk * 1.1 - p.def / 3 + Math.random() * 5));
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul) {
        bs.playerPoisoned  = true;
        bs.playerPoisonTurns = 2;
        appendBattleLog(`🌿 Passos Perdidos! A floresta te confunde! -${d} HP + ☠ Veneno por 2 turnos!`, '#80c040');
      } else {
        appendBattleLog(`🌿 Passos Perdidos! -${d} HP (veneno bloqueado!)`, '#80c040');
      }
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },
  // ── FASE 2: Samurai Caveira (Forma I) — vento, rápido ──
  samurai_caveira_1: {
    name: 'veloz',
    specialName: 'Corte Gêmeo do Vento',
    specialIcon: '🌪️',
    specialDesc: 'Dois golpes de lâmina em rápida sucessão!',
    special(bs, p, e) {
      const d1 = calcEnemyDmg(e, p, bs, 0.85);
      const d2 = calcEnemyDmg(e, p, bs, 0.85);
      applyDmgToPlayer(d1, bs, p);
      applyDmgToPlayer(d2, bs, p);
      appendBattleLog(`${e.icon || '💀'} Corte Gêmeo do Vento! Dois golpes: -${d1} e -${d2} HP!`, '#a0e0c0');
    }
  },

  // ── FASE 2: Samurai Caveira (Forma II) — vento, forte ──
  samurai_caveira_2: {
    name: 'cortante',
    specialName: 'Lâmina Cortante',
    specialIcon: '🗡️',
    specialDesc: 'Golpe forte e preciso que abre um corte profundo!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 1.3);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul && !p._talent_dark_immune_bleed) {
        bs.playerBleeding = true;
        bs.playerBleedTurns = 2;
        appendBattleLog(`${e.icon || '💀'} Lâmina Cortante! -${d} HP + 🩸 Sangramento por 2 turnos!`, '#c0a060');
      } else {
        appendBattleLog(`${e.icon || '💀'} Lâmina Cortante! -${d} HP (sangramento bloqueado!)`, '#c0a060');
      }
    }
  },

  // ── FASE 3 MINIBOSS: Ogro Guardião — terra, esmagador ──
  ogro_terra: {
    name: 'esmagador',
    specialName: 'Punho Esmagador',
    specialIcon: '🗿',
    specialDesc: 'Golpe de terra bruta que ignora parte da defesa!',
    special(bs, p, e) {
      const d = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 6));
      applyDmgToPlayer(d, bs, p, true); // ignora DEF — esmaga a guarda
      appendBattleLog(`${e.icon || '🗿'} Punho Esmagador! O golpe atravessa sua guarda! -${d} HP!`, '#a08050');
    }
  },

  // ── FASE 3 MINIBOSS: Ogro Guardião II — planta, venenoso ──
  ogro_granito: {
    name: 'venenoso',
    specialName: 'Esporos Tóxicos',
    specialIcon: '🌿',
    specialDesc: 'Libera esporos venenosos de seu corpo coberto de musgo!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 1.0);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul) {
        bs.playerPoisoned = true;
        bs.playerPoisonTurns = 3;
        appendBattleLog(`${e.icon || '🪨'} Esporos Tóxicos! -${d} HP + ☠ Veneno por 3 turnos!`, '#80c060');
      } else {
        appendBattleLog(`${e.icon || '🪨'} Esporos Tóxicos! -${d} HP (veneno bloqueado!)`, '#80c060');
      }
    }
  },

  // ── BOSS FASE 8: Siu — Sacerdotisa Negra (feitiçaria, dreno de cura) ──
  siu_sacerdotisa_negra: {
    name: 'feiticeira sombria',
    specialName: 'Sopro das Sombras',
    specialIcon: '🌑',
    specialDesc: 'Feitiço sombrio que drena vida — todo dano causado por Siu cura parte dela!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — abaixo de 50% HP: aprofunda o feitiço, fica mais agressiva
      if (hpPct <= 0.5 && !bs._siuPhase2) {
        bs._siuPhase2 = true;
        e.atk = Math.floor(e.atk * 1.2);
        appendBattleLog(`🌑 Siu fecha os olhos. "Vejo que precisarei de mais que palavras."`, '#9050c0');
        appendBattleLog(`🌑 O feitiço de Siu se aprofunda — ATQ aumentado!`, '#9050c0');
      }

      // Feitiço sombrio: dano mágico + cura 7% do dano causado para Siu
      const d = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 6));
      applyDmgToPlayer(d, bs, p);
      const siuHeal = Math.max(1, Math.floor(d * 0.07));
      bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + siuHeal);
      appendBattleLog(`🌑 Sopro das Sombras! -${d} HP! Siu absorve ${siuHeal} HP do próprio feitiço.`, '#9050c0');
      showFloatingNumber('hero', d, 'dmg');
      showFloatingNumber('enemy', siuHeal, 'heal');
      flashDamage('hero');
    }
  },

  default: {
    name: 'agressivo',
    specialName: 'Ataque Brutal',
    specialIcon: '💀',
    specialDesc: 'Golpe poderoso!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 1.5);
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`${e.icon || '👹'} Ataque Brutal! -${d} HP!`, '#e04020');
    }
  },

  // ── MINI-BOSS: Guardião de Cristal ──
  guardiao_cristal: {
    name: 'impenetrável',
    specialName: 'Escudo de Cristal',
    specialIcon: '💎',
    specialDesc: 'Eleva defesa drasticamente por 2 turnos e contra-ataca!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — abaixo de 40% HP: fragmenta e enraivece
      if (hpPct <= 0.4 && !bs._cristalPhase2) {
        bs._cristalPhase2 = true;
        e.atk = Math.floor(e.atk * 1.4);
        e.def = Math.max(0, e.def - 6); // cristal racha, perde DEF mas ganha ATK
        appendBattleLog(`💎 O Guardião racha! Fragmentos voam — DEF cai mas ATQ aumenta!`, '#a0d0ff');
        const d = calcEnemyDmg(e, p, bs, 1.2);
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`💎 Explosão de Cristal! Fragmentos cortam! -${d} HP!`, '#80c0ff');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // Especial: Escudo de Cristal — aumenta DEF + contra-ataque na próxima
      if (!bs._cristalShield) {
        bs._cristalShield = true;
        bs._cristalShieldTurns = 2;
        bs._crystalDefBonus = 8;
        e.def += 8;
        appendBattleLog(`💎 Escudo de Cristal! DEF +8 por 2 turnos. Qualquer ataque será refletido!`, '#80c0ff');
        showFloatingNumber('enemy', '🛡 ESCUDO', 'status');
      } else {
        // Se já tem escudo: lança estilhaços
        const d = calcEnemyDmg(e, p, bs, 1.3);
        applyDmgToPlayer(d, bs, p);
        bs.playerBleeding = true;
        bs.playerBleedTurns = 2;
        appendBattleLog(`💎 Chuva de Estilhaços! -${d} HP + 🩸 Sangramento por 2 turnos!`, '#80c0ff');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
      }
    }
  },

  // ── MINI-BOSS: Sentinela das Sombras ──
  sentinela_sombras: {
    name: 'implacável',
    specialName: 'Lâmina das Trevas',
    specialIcon: '⚫',
    specialDesc: 'Golpe que drena HP e aplica maldição!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — abaixo de 50% HP: modo fúria
      if (hpPct <= 0.5 && !bs._sentinelaPhase2) {
        bs._sentinelaPhase2 = true;
        e.atk = Math.floor(e.atk * 1.25);
        appendBattleLog(`⚫ A Sentinela emite um ruído surdo. A escuridão dentro da armadura pulsa mais rápido!`, '#9040c0');
        appendBattleLog(`⚫ ATQ da Sentinela aumentou!`, '#9040c0');
        bs.enemyEnraged = true;
        // Golpe de entrada da fase 2
        const d = calcEnemyDmg(e, p, bs, 1.3);
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`⚫ Fúria das Sombras! -${d} HP!`, '#9040c0');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // FASE 3 — abaixo de 20% HP: desespero + dreno total
      if (hpPct <= 0.2 && !bs._sentinelaPhase3) {
        bs._sentinelaPhase3 = true;
        const drain = Math.floor(p.hp * 0.15);
        p.hp = Math.max(1, p.hp - drain);
        bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + drain);
        appendBattleLog(`⚫ DRENO VITAL! A Sentinela absorve ${drain} HP de você!`, '#c040e0');
        showFloatingNumber('hero', drain, 'dmg');
        showFloatingNumber('enemy', drain, 'heal');
        flashDamage('hero');
        return;
      }

      // Especial normal — Lâmina das Trevas: dano + maldição (reduz ATK do jogador)
      const d = calcEnemyDmg(e, p, bs, 1.4);
      applyDmgToPlayer(d, bs, p);
      bs._cursed = true;
      bs._cursedTurns = 2;
      appendBattleLog(`⚫ Lâmina das Trevas! -${d} HP + 🌑 Maldição por 2 turnos (ATQ reduzido)!`, '#8030b0');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },
};

// ── Helper: dano do inimigo ──
function calcEnemyDmg(e, p, bs, mult = 1.0) {
  // Punição Eterna: inimigo com qualquer debuff ativo → -20% no ATQ do inimigo
  const hasDebuff = bs.enemyPoisoned || bs.enemyBurning || bs.enemySlowed || bs.enemyStunned || bs.enemyBleeding || bs._cursed || bs._enemy_cursed;
  const eAtk = (p._talent_eternal_punishment && hasDebuff)
    ? Math.floor(e.atk * 0.80)
    : e.atk;
  let base = Math.max(1, eAtk - Math.floor(p.def / 2) + Math.floor(Math.random() * 6) - 2);
  // Dificuldade
  if (window._diffMult && window._diffMult !== 1.0) base = Math.max(1, Math.round(base * window._diffMult));
  // Lobo enraivecido
  if (bs._wolfEnrage) { base = Math.floor(base * 1.5); bs._wolfEnrage = false; }
  // Inimigo lento
  if (bs.enemySlowed) base = Math.max(1, Math.floor(base * 0.7));
  // Multiplicador
  base = Math.floor(base * mult);
  // Redução de defesa ativa
  if (bs.defending || bs._shieldActive) {
    if (bs._shieldActive) {
      // Proteção Divina (talento): 90% de bloqueio; base: 80%
      const shieldMult = (p._talent_better_shield) ? 0.10 : 0.20;
      base = Math.floor(base * shieldMult);
    } else {
      base = Math.floor(base * 0.5);
    }
    bs._shieldActive = false;
    hideShieldEffect();
  }
  return Math.max(1, base);
}

// ── Helper: aplica dano ao jogador ──
function applyDmgToPlayer(dmg, bs, p, ignoresDef = false) {
  // Hook de talento ao receber dano (redução, retaliação, etc.)
  if (typeof applyTalentOnReceiveDamage === 'function') {
    dmg = applyTalentOnReceiveDamage(dmg, bs);
  }
  // Espírito de Aço: DEF nunca cai abaixo de 8
  if (p._talent_steel_soul && p.def < 8) p.def = 8;
  p.hp = Math.max(0, p.hp - dmg);
  // Quebrar combo ao levar dano
  if (dmg > 0 && bs.comboCount > 0) {
    bs.comboCount = 0;
    bs.comboTier  = 0;
    updateComboDisplay();
  }
  flashDamage('hero');
  // Animação de dano: forte (>15% HP máx) → cai; leve → defende
  if (dmg > 0 && p.classData && p.classData.sprite) {
    // Limpa qualquer transform residual de animação de ataque anterior
    const _heroEl = document.getElementById('bat-hero-icon');
    if (_heroEl) { _heroEl.style.transition = ''; _heroEl.style.transform = ''; }

    const threshold = Math.max(8, Math.floor(p.maxHp * 0.15));
    if (dmg >= threshold) {
      // Ataque forte: cai (hit → hit2 → recover → idle)
      setHeroAnim('hit', 0);
      setTimeout(() => setHeroAnim('hit2', 0), 430);
      setTimeout(() => setHeroAnim('recover', 0), 860);
      setTimeout(() => setHeroAnim('idle', 0), 1200);
    } else {
      // Ataque leve: defende e volta
      setHeroAnim('defend', 500);
    }
  }
  updateHUD();
  updateBattleHUD();
}

// ── Efeitos de status visuais ──
function buildStatusBadges() {
  const badges = [];
  const bs = battleState;
  if (bs.enemyPoisoned)   badges.push(`<span class="status-badge poison">☠×${bs.enemyPoisonTurns}</span>`);
  if (bs.enemyBurning)    badges.push(`<span class="status-badge burn">🔥×${bs.enemyBurnTurns}</span>`);
  if (bs.enemySlowed)     badges.push(`<span class="status-badge slow">❄×${bs.enemySlowTurns}</span>`);
  if (bs.enemyStunned)    badges.push(`<span class="status-badge stun">⚡×${bs.enemyStunTurns}</span>`);
  if (bs.enemyBleeding)   badges.push(`<span class="status-badge bleed">🩸×${bs.enemyBleedTurns}</span>`);
  if (bs._cursed)         badges.push(`<span class="status-badge debuff">💜×${bs._cursedTurns}</span>`);
  if (bs._enemy_cursed)   badges.push(`<span class="status-badge debuff">⚖×${bs._enemy_cursed_turns}</span>`);
  if (bs._enemyGuardTurns > 0) badges.push(`<span class="status-badge guard">🛡 guarda</span>`);
  const el = document.getElementById('bat-enemy-status');
  if (el) el.innerHTML = badges.join('');

  const pbadges = [];
  if (bs.playerPoisoned)  pbadges.push(`<span class="status-badge poison">☠×${bs.playerPoisonTurns}</span>`);
  if (bs.playerBleeding)  pbadges.push(`<span class="status-badge bleed">🩸×${bs.playerBleedTurns}</span>`);
  if (bs.playerStunned)   pbadges.push(`<span class="status-badge stun">⚡×${bs.playerStunTurns}</span>`);
  if (bs._buffAtkTurns>0) pbadges.push(`<span class="status-badge buff">⚔+${bs._buffAtkAmt}×${bs._buffAtkTurns}</span>`);
  if (bs._coracaoTurns>0) pbadges.push(`<span class="status-badge buff">🔥×${bs._coracaoTurns}</span>`);
  const pel = document.getElementById('bat-hero-status');
  if (pel) pel.innerHTML = pbadges.join('');
}

// ── Número flutuante de dano ──
function showFloatingNumber(target, value, type = 'dmg') {
  // target: 'hero' | 'enemy'
  const side = target === 'hero' ? 'bat-hero-side' : 'bat-enemy-side';
  const container = document.getElementById(side) || document.querySelector('.battle-arena');
  if (!container) return;
  const div = document.createElement('div');
  const colorMap = { dmg:'#ff6040', heal:'#60e060', crit:'#ffcc00', miss:'#aaaaaa', buff:'#80ccff', status:'#cc80ff' };
  div.className = 'float-num';
  div.style.cssText = `
    position:absolute; font-family:'Noto Serif JP',serif; font-weight:900;
    font-size:${type === 'crit' ? '1.5rem' : '1.1rem'};
    color:${colorMap[type] || '#fff'};
    text-shadow:0 2px 8px rgba(0,0,0,0.9);
    pointer-events:none; z-index:9999;
    left:${20 + Math.random()*60}%; top:${20 + Math.random()*30}%;
    animation:floatUp 1.1s ease forwards;
  `;
  div.textContent = type === 'crit' ? `CRÍTICO! ${value}` : type === 'miss' ? 'ERROU!' : (type==='heal'?'+':'') + value;
  container.style.position = 'relative';
  container.appendChild(div);
  setTimeout(() => div.remove(), 1200);
}

// ── Flash de dano ──
function flashDamage(target) {
  const id = target === 'hero' ? 'bat-hero-icon' : 'bat-enemy-icon';
  const el = document.getElementById(id);
  if (!el) return;
  // Vibração no dano (respeita config)
  if (CONFIG.vibration && navigator.vibrate) {
    navigator.vibrate(target === 'hero' ? [60] : [30]);
  }
  if (el._flashTimeout) { clearTimeout(el._flashTimeout); el.style.opacity = '1'; }
  el.style.transition = 'opacity 0.08s ease';
  el.style.opacity = '0.25';
  el._flashTimeout = setTimeout(() => {
    el.style.opacity = '1';
    el._flashTimeout = null;
    setTimeout(() => { if (el) el.style.transition = ''; }, 100);
  }, 160);
}

// ── Atualiza exibição do combo ──
function updateComboDisplay() {
  const el = document.getElementById('bat-combo');
  if (!el) return;
  const bs = battleState;
  if (bs.comboCount <= 1) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const tier = Math.min(3, Math.floor(bs.comboCount / BATTLE_CONFIG.COMBO_WINDOW));
  el.textContent = `⚡ COMBO ×${bs.comboCount} ${tier > 0 ? `(+${tier * 15}% ATQ)` : ''}`;
  el.className = 'bat-combo-display tier' + tier;
}

// ── Iniciar batalha ──
// ─────────────────────────────────────────────────────────────
//  LUA CHEIA — INVESTIDA ELEMENTAL
//  Toda batalha em que a Lua Cheia estiver ativa, o Assassino
//  precisa escolher um elemento de "investida" antes de agir.
//  Acertar o elemento certo contra o inimigo = fica mais forte.
//  Errar = fica mais fraco. É uma aposta, não um buff de graça.
// ─────────────────────────────────────────────────────────────
const _LCI_ELEMENTOS = ['fogo','agua','eletrico','gelo','planta','terra','energia',
  'magia_negra','vento','caos','veneno','luz','sombra','cristal'];
const _LCI_ICONES = { fogo:'🔥', agua:'💧', eletrico:'⚡', gelo:'❄️', planta:'🌿', terra:'🪨',
  energia:'✨', magia_negra:'🌑', vento:'🌪️', caos:'🌀', veneno:'☠️', luz:'☀️', sombra:'👤', cristal:'💎' };
const _LCI_NOMES = { fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta', terra:'Terra',
  energia:'Energia', magia_negra:'Magia Negra', vento:'Vento', caos:'Caos', veneno:'Veneno', luz:'Luz', sombra:'Sombra', cristal:'Cristal' };

function openLuaCheiaInvestidaOverlay(p, enemy, bs) {
  if (!p || !p.classData || p.classData.id !== 'assassino') return;
  if (typeof getAssassinoLuaAtiva !== 'function' || getAssassinoLuaAtiva(p) !== 'cheia') return;
  if (!enemy) return;
  if (document.getElementById('lua-cheia-investida-overlay')) return; // já tem uma aberta

  // Sorteia 3 elementos distintos para escolher
  const pool = [..._LCI_ELEMENTOS].sort(() => Math.random() - 0.5).slice(0, 3);

  setBattleButtons(false);

  const overlay = document.createElement('div');
  overlay.id = 'lua-cheia-investida-overlay';
  overlay.innerHTML = `
    <div class="lci-card">
      <div class="lci-title">🌕 A Lua Cheia desperta seu instinto</div>
      <div class="lci-sub">Escolha sua investida contra <b>${enemy.name}</b>. Acertar o elemento certo te deixa mais forte. Errar, mais fraco.</div>
      <div class="lci-options">
        ${pool.map(el => `<button class="lci-opt" data-el="${el}"><span class="lci-icon">${_LCI_ICONES[el]||''}</span><span>${_LCI_NOMES[el]||el}</span></button>`).join('')}
      </div>
    </div>`;
  document.getElementById('battle-overlay').appendChild(overlay);

  overlay.querySelectorAll('.lci-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosen = btn.dataset.el;
      resolveLuaCheiaInvestida(p, enemy, bs, chosen);
      overlay.remove();
      _finishTurnAfterLuaInvestida(bs, p, enemy);
    });
  });
}

// Finaliza o turno do jogador após a escolha de elemento da Investida
// Elemental (espelha o trecho final padrão de doBattleAction()).
function _finishTurnAfterLuaInvestida(bs, p, e) {
  tickEnemyStatusEffects(bs, e);
  if (bs._enemyGuardTurns > 0 && e) {
    e.def = Math.max(0, (e.def || 0) - (e._guardDefBoost || 0));
    e._guardDefBoost = 0;
    bs._enemyGuardTurns = 0;
    appendBattleLog(`🛡️ A guarda de ${e.name} se desfaz.`, 'rgba(150,170,220,0.7)');
    buildStatusBadges();
  }

  updateBattleHUD();
  buildSkillList();

  if (battleState.enemyHp <= 0) {
    bs.phase = 'resolving';
    setTimeout(() => endBattle(true, false), 400);
    return;
  }

  bs.turnCount++;
  setTimeout(() => runEnemyTurn(bs, p, e, false), 850);
}

function resolveLuaCheiaInvestida(p, enemy, bs, chosenEl) {
  const enemyEl = (enemy && enemy.elemento) || 'neutro';
  const afin = (typeof AFINIDADE_ELEMENTAL !== 'undefined') ? AFINIDADE_ELEMENTAL[enemyEl] : null;
  let result = 'neutro';
  if (afin) {
    if (afin.forte && afin.forte.includes(chosenEl)) result = 'forte';
    else if (afin.fraco && afin.fraco.includes(chosenEl)) result = 'fraco';
  }

  let bonusPct = 0, logMsg = '', color = '', badgeText = '';
  const elNome = _LCI_NOMES[chosenEl] || chosenEl;
  if (result === 'forte') {
    bonusPct = 0.25;
    logMsg = `🔥 Investida de ${elNome} acerta em cheio a fraqueza de ${enemy.name}! +25% ATQ nesta batalha.`;
    color = '#ff8040';
    badgeText = `🔥 INVESTIDA CERTEIRA +25% ATQ`;
  } else if (result === 'fraco') {
    bonusPct = -0.20;
    logMsg = `❄️ Investida de ${elNome} é a pior escolha contra ${enemy.name}. -20% ATQ nesta batalha.`;
    color = '#6090c0';
    badgeText = `❄️ INVESTIDA FRACA -20% ATQ`;
  } else {
    bonusPct = 0.08;
    logMsg = `🌕 Investida de ${elNome} não tem efeito especial contra ${enemy.name}. +8% ATQ nesta batalha.`;
    color = '#c2a060';
    badgeText = `🌕 INVESTIDA NEUTRA +8% ATQ`;
  }

  const bonusVal = Math.round((p.atk || 0) * bonusPct);
  p._lua_cheia_investida_bonus = (p._lua_cheia_investida_bonus || 0) + bonusVal;
  p.atk = Math.max(0, (p.atk || 0) + bonusVal);

  appendBattleLog(logMsg, color);
  if (typeof showBattleSideBadge === 'function') showBattleSideBadge('hero', badgeText, color);
  updateBattleHUD();
  buildStatusBadges();
}

// Reverte o bônus/penalidade da investida ao fim da batalha (não persiste entre batalhas)
function clearLuaCheiaInvestida(p) {
  if (!p || !p._lua_cheia_investida_bonus) return;
  p.atk = Math.max(0, (p.atk || 0) - p._lua_cheia_investida_bonus);
  p._lua_cheia_investida_bonus = 0;
}

function startBattle(enemy) {
  G.inBattle = true;
  _preloadSpriteImages();
  G.player.battlesTotal = (G.player.battlesTotal || 0) + 1;

  // BUG-05 FIX: restaurar AP ao início de cada batalha para classes guerreiras
  const warriorCheck = window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id);
  const isApClass = (G.player.classData && G.player.classData.resource === 'ap')
                 || (G.player.classData && warriorCheck.includes(G.player.classData.id));
  if (G.player.classData && isApClass) {
    G.player.ap = G.player.maxAp;
  }

  // Reset estado
  Object.assign(battleState, {
    enemyData: { ...enemy },
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    turnCount: 1,
    phase: 'player',
    defending: false,
    _shieldActive: false,
    _wolfEnrage: false,
    comboCount: 0,
    comboTier: 0,
    enemyPoisoned: false, enemyPoisonTurns: 0,
    enemyBurning: false,  enemyBurnTurns: 0,
    enemySlowed: false,   enemySlowTurns: 0,
    enemyStunned: false,  enemyStunTurns: 0,
    playerPoisoned: false, playerPoisonTurns: 0,
    playerBleeding: false, playerBleedTurns: 0,
    playerStunned: false,  playerStunTurns: 0,
    _buffAtkTurns: 0, _buffAtkAmt: 0,
    _buffDefTurns: 0, _buffDefAmt: 0,
    _coracaoTurns: 0, _coracaoAtkAmt: 0, _coracaoCritAmt: 0,
    _regenTurns: 0,
    enemyTurnAI: 0,
    enemyEnraged: false,
    // Sangramento inimigo (Paladino das Trevas)
    enemyBleeding: false, enemyBleedTurns: 0,
    // Maldições
    _cursed: false, _cursedTurns: 0,
    _enemy_cursed: false, _enemy_cursed_turns: 0,
    _elementoCarregado: null,
    playerActionHistory: [],
  });
  const _indEl = document.getElementById('bat-elemento-indicador');
  if (_indEl) _indEl.style.display = 'none';

  // Inicializar flechas do Arqueiro
  const isArcher = G.player.classData && G.player.classData.id === 'arqueiro';
  if (isArcher) {
    const arrowMax = G.player.classData.arrows ? G.player.classData.arrows.max : 30;
    G.player.arrows = arrowMax;
    // Resetar contadores de flechas especiais
    battleState._arrowTurnCounter = 0;
    battleState._arrowNegraTurns  = 0;
  }
  // Mostrar/ocultar botão de flecha
  const btnFlecha = document.getElementById('btn-trocar-flecha');
  if (btnFlecha) btnFlecha.style.display = isArcher ? '' : 'none';
  // Atualizar label do botão com flecha equipada
  _updateArrowBtnLabel();

  // Preencher overlay — herói
  const heroIconEl = document.getElementById('bat-hero-icon');
  if (G.player.classData && G.player.classData.sprite) {
    heroIconEl.innerHTML = buildHeroVisual(125, 'idle');
  } else {
    heroIconEl.textContent = G.player.classData ? G.player.classData.icon : '⚔';
  }
  document.getElementById('bat-hero-name').textContent   = G.player.classData ? G.player.classData.name : 'Herói';

  // Nome + badge de elemento do inimigo
  const _elemIcones = { fogo:'🔥', agua:'💧', eletrico:'⚡', gelo:'❄️', planta:'🌿', terra:'🪨',
    energia:'✨', magia_negra:'🌑', vento:'🌪️', caos:'🌀', veneno:'☠️', luz:'☀️', sombra:'👤', cristal:'💎' };
  const _elemNomes  = { fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta',
    terra:'Terra', energia:'Energia', magia_negra:'Magia Negra', vento:'Vento', caos:'Caos',
    veneno:'Veneno', luz:'Luz', sombra:'Sombra', cristal:'Cristal' };
  const _elemInimigo = enemy.elemento;
  const _elemBadge = _elemInimigo && _elemInimigo !== 'neutro'
    ? ` <span style="font-size:0.65rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:1px 5px;letter-spacing:1px;">${_elemIcones[_elemInimigo]||''}${_elemNomes[_elemInimigo]||_elemInimigo}</span>`
    : '';
  document.getElementById('bat-enemy-name').innerHTML = enemy.name + _elemBadge;

  const batIcon = document.getElementById('bat-enemy-icon');
  batIcon.innerHTML = buildEnemyVisual(enemy, 160, 'idle');
  batIcon.style.display = 'flex';
  batIcon.style.alignItems = 'center';
  batIcon.style.justifyContent = 'center';
  batIcon.style.background = 'transparent';
  batIcon.style.border = 'none';

  document.getElementById('battle-log-box').innerHTML = '';

  // ── Coração Incandescente: ativa buff de ATQ/Crítico/Cura por N turnos
  //    sempre que uma nova batalha começa (se estiver equipado). Ao fim
  //    dos turnos, "esfria" e só ativa de novo na próxima batalha.
  const _accEquip = (G.player.inventory || []).find(i => i.equipped && i.id === 'coracao_incandescente');
  if (_accEquip && _accEquip.id === 'coracao_incandescente') {
    const bAtk   = _accEquip.buffAtk   || 12;
    const bCrit  = _accEquip.buffCrit  || 10;
    const bHeal  = _accEquip.buffHeal  || 30;
    const bTurns = _accEquip.buffTurns || 3;
    battleState._coracaoTurns   = bTurns;
    battleState._coracaoAtkAmt  = bAtk;
    battleState._coracaoCritAmt = bCrit / 100;
    G.player.atk = (G.player.atk || 0) + bAtk;
    G.player.critBonus = (G.player.critBonus || 0) + (bCrit / 100);
    G.player.hp = Math.min(G.player.maxHp, (G.player.hp || 0) + bHeal);
    appendBattleLog(`🔥 Coração Incandescente desperta! ATQ +${bAtk}, Crítico +${bCrit}%, +${bHeal} HP por ${bTurns} turnos!`, '#ff6a2a');
    notify(`🔥 Coração Incandescente ativo! ATQ+${bAtk}, Crítico+${bCrit}%, +${bHeal} HP (${bTurns} turnos)`, 'gold');
  }

  updateBattleHUD();
  updateEquippedGearHUD();
  buildSkillList();
  buildStatusBadges();
  updateComboDisplay();
  setBattleButtons(true);
  document.getElementById('battle-overlay').classList.add('active');
  if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);

  // Espírito Imortal: escudo inicial
  if (G.player._talent_immortal_spirit) {
    battleState._chi_barrier = 40;
    appendBattleLog('☯️ Espírito Imortal: Escudo de Chi (40) ativo!', '#60a0c0');
  }

  // Primer de turno
  if (typeof applyTalentTurnStart === 'function') applyTalentTurnStart(battleState);

  // Mensagem de abertura dinâmica
  const openingMsgs = [
    `⚔ ${enemy.name} surge das sombras! HP: ${enemy.hp}`,
    `💀 ${enemy.name} bloqueia seu caminho! HP: ${enemy.hp}`,
    `🌑 ${enemy.name} ataca! Prepare-se! HP: ${enemy.hp}`,
  ];
  appendBattleLog(openingMsgs[Math.floor(Math.random()*openingMsgs.length)], 'rgba(200,80,20,0.8)');

  if (enemy.isBoss) {
    appendBattleLog(`⚠ CHEFE! ${enemy.desc}`, '#ffaa00');
  }

  updateBattleTurnIndicator('player');

  // Tutorial de fusão elemental (só para o Mago, só uma vez)
  if (G.player.classData && G.player.classData.id === 'mago') {
    setTimeout(() => {
      if (typeof mostrarTutorialFusao === 'function') mostrarTutorialFusao();
    }, 1200);
  }

  // Lua Cheia do Assassino: a escolha de investida elemental agora é
  // feita via skill própria ("Investida Elemental") no menu de skills,
  // em vez de abrir automaticamente ao entrar em batalha.
}

function updateBattleHUD() {
  const p = G.player;

  // Passiva de Siu — Sacerdotisa Negra: toda cura recebida pelo jogador também cura uma parte dela
  const _bossPassiva = G._dungeonEnemyPassiva;

  // Passiva do Lorde das Sombras: drena HP do jogador e aumenta critico a cada turno
  if (_bossPassiva && _bossPassiva.tipo === 'lorde_dreno') {
    if (_bossPassiva._firstTurn) {
      _bossPassiva._firstTurn = false;
      appendBattleLog('🌑 PASSIVA — Dreno das Sombras ativado! O Lorde drena sua vida a cada turno e aumenta seu critico.', '#1aaf3a');
    }
    if (typeof _ds_lorde_checkFuga === 'function' && _ds_lorde_checkFuga()) {
      appendBattleLog('🌑 O Lorde recua! Foge para as sombras!', '#1aaf3a');
      setTimeout(() => { if (typeof endBattle === 'function') endBattle('win'); }, 1200);
    }
  }

  if (_bossPassiva && _bossPassiva.tipo === 'siu_dreno_cura') {
    if (typeof battleState._siuLastPlayerHp !== 'number') battleState._siuLastPlayerHp = p.hp;
    if (p.hp > battleState._siuLastPlayerHp) {
      const _healedAmt = p.hp - battleState._siuLastPlayerHp;
      const _siuRoubo = Math.max(1, Math.floor(_healedAmt * (_bossPassiva.curaPctRoubo || 0.3)));
      battleState.enemyHp = Math.min(battleState.enemyMaxHp, battleState.enemyHp + _siuRoubo);
      appendBattleLog(`🌑 Sua cura ecoa até Siu! Ela absorve ${_siuRoubo} HP.`, '#9050c0');
      showFloatingNumber('enemy', _siuRoubo, 'heal');
    }
    battleState._siuLastPlayerHp = p.hp;
  }

  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
  document.getElementById('bat-hero-hp-bar').style.width = hpPct + '%';
  document.getElementById('bat-hero-hp').textContent = `${p.hp}/${p.maxHp} HP`;

  // Barra de AP do herói (só aparece para warriors)
  const isWarriorBattle = ((p.classData && p.classData.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(p.class));
  const apBarWrap = document.getElementById('bat-hero-ap-bar-wrap');
  if (apBarWrap) {
    if (isWarriorBattle && p.maxAp > 0) {
      apBarWrap.style.display = 'block';
      const apPct = Math.max(0, Math.min(100, ((p.ap || 0) / p.maxAp) * 100));
      document.getElementById('bat-hero-ap-bar').style.width = apPct + '%';
    } else {
      apBarWrap.style.display = 'none';
    }
  }

  // Barra de MP do mago
  const mpBarWrap = document.getElementById('bat-hero-mp-bar-wrap');
  if (mpBarWrap) {
    if (p.class === 'mago' && p.maxMp > 0) {
      mpBarWrap.style.display = 'block';
      const mpPct = Math.max(0, Math.min(100, ((p.mp || 0) / p.maxMp) * 100));
      document.getElementById('bat-hero-mp-bar').style.width = mpPct + '%';
    } else {
      mpBarWrap.style.display = 'none';
    }
  }

  // HUD de flechas (só para Arqueiro)
  const arrowEl = document.getElementById('bat-hero-arrows');
  if (arrowEl) {
    if (p.class === 'arqueiro') {
      arrowEl.style.display = 'inline-block';
      if (typeof updateArrowHUD === 'function') updateArrowHUD(p);
    } else {
      arrowEl.style.display = 'none';
    }
  }

  // Barra de Corrupção (Assassino — só na Lua Sangrenta, valor em p._lua_corrupcao)
  const corrWrap = document.getElementById('bat-hero-corrupcao-wrap');
  if (corrWrap) {
    const isAssassino = p.class === 'assassino' || (p.classData && p.classData.id === 'assassino');
    const luaSangrenta = isAssassino
      && typeof getAssassinoLuaAtiva === 'function'
      && getAssassinoLuaAtiva(p) === 'sangrenta';
    const corrVal = luaSangrenta ? (p._lua_corrupcao || 0) : 0;
    if (luaSangrenta) {
      corrWrap.style.display = 'block';
      const corrPct = Math.max(0, Math.min(100, corrVal));
      document.getElementById('bat-hero-corrupcao-bar').style.width = corrPct + '%';
      const label = document.getElementById('bat-hero-corrupcao-label');
      if (label) {
        const isMax = corrVal >= 100;
        label.textContent = `☽ ${corrVal} / 100 CORRUPÇÃO`;
        label.style.color  = isMax ? '#ff2f6e' : '#ce93d8';
        label.style.textShadow = isMax ? '0 0 8px rgba(255,47,110,0.9)' : 'none';
      }
    } else {
      corrWrap.style.display = 'none';
    }
  }

  const ePct = Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100);
  const eBar = document.getElementById('bat-enemy-hp-bar');
  eBar.style.width = ePct + '%';
  // Cor da barra: verde → amarelo → vermelho (ou azul fixo para feiticeiras como Siu, ou verde fixo para o Lorde das Sombras)
  if (battleState.enemyData && battleState.enemyData.vidaVerde) {
    eBar.style.background = 'linear-gradient(90deg,#0a5c1a,#1aaf3a)';
  } else if (battleState.enemyData && battleState.enemyData.vidaAzul) {
    eBar.style.background = 'linear-gradient(90deg,#1a2a8b,#2050c4)';
  } else if (ePct > 60) eBar.style.background = 'linear-gradient(90deg,#8b1a18,#c43020)';
  else if (ePct > 30) eBar.style.background = 'linear-gradient(90deg,#8b5a00,#c08020)';
  else eBar.style.background = 'linear-gradient(90deg,#300,#c00)';

  document.getElementById('bat-enemy-hp').textContent = `${Math.max(0, battleState.enemyHp)}/${battleState.enemyMaxHp} HP`;

  // Inimigo enraivecido?
  if (!battleState.enemyEnraged && battleState.enemyHp / battleState.enemyMaxHp < 0.3) {
    battleState.enemyEnraged = true;
    appendBattleLog(`⚠ ${battleState.enemyData.name} está enraivecido! (+50% ATQ)`, '#ff4020');
    flashDamage('enemy');
  }

  buildStatusBadges();
  updateEquippedGearHUD();
  updateRuneBadgeBattle();
}

// Renderiza ícones de itens equipados no HUD de batalha
function updateEquippedGearHUD() {
  const el = document.getElementById('bat-equipped-gear');
  if (!el) return;
  const inv = (G.player && G.player.inventory) || [];
  const equipped = inv.filter(i => i.equipped && i.type === 'equipamento');
  if (!equipped.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = equipped.map(item => {
    const img = item.imgSrc
      ? `<img src="${item.imgSrc}" style="width:28px;height:28px;object-fit:contain;mix-blend-mode:screen;" title="${item.name}">`
      : `<span title="${item.name}" style="font-size:1.2rem;">${item.icon || '📦'}</span>`;
    return `<div style="
      display:flex;align-items:center;justify-content:center;
      width:34px;height:34px;
      background:rgba(200,150,10,0.08);
      border:1px solid rgba(200,150,10,0.25);
      border-radius:3px;
      position:relative;
    ">${img}</div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
//  BADGE DE RUNA — exibido no canto do herói durante batalha
// ─────────────────────────────────────────────────────────────
function updateRuneBadgeBattle() {
  const el = document.getElementById('bat-rune-badge');
  if (!el) return;
  const enchantId = G.player && G.player._weaponEnchant;
  if (!enchantId || typeof getEnchantTier !== 'function') {
    el.style.display = 'none';
    return;
  }
  const tier = getEnchantTier(enchantId);
  if (!tier) { el.style.display = 'none'; return; }

  // Monta o ícone: usa imagem da pasta Imagens/icones/
  const imgMap = {
    D:  'RuneD.png',
    C:  'RuneC.png',
    B:  'RuneB.png',
    A:  'RuneA.png',
    S:  'RuneS.png',
    'S+': 'RuneS+.png',
    SS: 'RuneSS.png',
  };
  const imgFile = imgMap[tier.id] || null;
  const imgSrc  = imgFile ? `Imagens/icones/${imgFile}` : null;

  el.style.setProperty('--rune-color', tier.color || '#9e9e9e');
  el.style.setProperty('--rune-glow',  (tier.color || '#9e9e9e') + '66');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.alignItems = 'center';

  if (imgSrc) {
    el.innerHTML = `
      <img class="rune-icon-img" src="${imgSrc}"
           onerror="this.style.display='none';this.nextElementSibling.style.fontSize='1.4rem';"
           alt="${tier.label}">
      <span class="rune-label-small">${tier.label}</span>`;
  } else {
    el.innerHTML = `
      <span style="font-size:1.4rem;line-height:1;">✨</span>
      <span class="rune-label-small">${tier.label}</span>`;
  }
}
window.updateRuneBadgeBattle = updateRuneBadgeBattle;

function openRuneDetailPopup() {
  const enchantId = G.player && G.player._weaponEnchant;
  if (!enchantId || typeof getEnchantTier !== 'function') return;
  const tier = getEnchantTier(enchantId);
  if (!tier) return;

  const imgMap = {
    D:  'RuneD.png',
    C:  'RuneC.png',
    B:  'RuneB.png',
    A:  'RuneA.png',
    S:  'RuneS.png',
    'S+': 'RuneS+.png',
    SS: 'RuneSS.png',
  };
  const imgFile = imgMap[tier.id] || null;
  const imgSrc  = imgFile ? `Imagens/icones/${imgFile}` : '';

  // Cor do popup
  const inner = document.getElementById('rune-detail-inner');
  if (inner) {
    inner.style.setProperty('--rune-popup-color', tier.color || '#9e9e9e');
    inner.style.setProperty('--rune-popup-glow',  (tier.color || '#9e9e9e') + '44');
    inner.style.borderTopColor = tier.color || '#9e9e9e';
    inner.style.boxShadow = `0 0 30px ${(tier.color || '#9e9e9e')}33`;
  }

  // Ícone
  const iconEl = document.getElementById('rdp-icon-img');
  if (iconEl) { iconEl.src = imgSrc; iconEl.style.display = imgSrc ? 'block' : 'none'; }

  // Label
  const labelEl = document.getElementById('rdp-label');
  if (labelEl) { labelEl.textContent = tier.label; labelEl.style.color = tier.color || '#9e9e9e'; }

  // Descrição (específica para a classe do jogador)
  const desc = (typeof getEnchantDesc === 'function') ? getEnchantDesc(tier) : (tier.descDefault || '');
  const descEl = document.getElementById('rdp-desc');
  if (descEl) { descEl.textContent = desc; descEl.style.borderLeftColor = tier.color || '#9e9e9e'; }

  // Bônus
  const bonus = (typeof getEnchantBonus === 'function') ? getEnchantBonus(tier) : {};
  const parts = [];
  if (bonus.atk)  parts.push(`⚔ ATQ +${bonus.atk}`);
  if (bonus.def)  parts.push(`🛡 DEF +${bonus.def}`);
  if (bonus.mag)  parts.push(`✨ MAG +${bonus.mag}`);
  if (bonus.hp)   parts.push(`❤ HP +${bonus.hp}`);
  if (bonus.mp)   parts.push(`💙 MP +${bonus.mp}`);
  if (bonus.crit) parts.push(`🎯 Crit +${bonus.crit}%`);
  if (bonus._enchantMagPen)  parts.push(`🔮 Penetração Mágica +${Math.round(bonus._enchantMagPen*100)}%`);
  if (bonus._enchantRegen)   parts.push(`♻ Regeneração por turno`);
  if (bonus._enchantShadowMarkEnabled) parts.push(`🌑 Marca das Sombras ativa`);
  const bonusEl = document.getElementById('rdp-bonus');
  if (bonusEl) bonusEl.innerHTML = parts.length ? parts.join(' &nbsp;·&nbsp; ') : '';

  // Flavor
  const flavorEl = document.getElementById('rdp-flavor');
  if (flavorEl) flavorEl.textContent = tier.flavor || '';

  const popup = document.getElementById('rune-detail-popup');
  if (popup) popup.classList.add('active');
}
window.openRuneDetailPopup = openRuneDetailPopup;

function closeRuneDetailPopup() {
  const popup = document.getElementById('rune-detail-popup');
  if (popup) popup.classList.remove('active');
}
window.closeRuneDetailPopup = closeRuneDetailPopup;

function updateBattleTurnIndicator(whose) {
  const el = document.getElementById('battle-turn-indicator');
  el.className = whose === 'player' ? 'player-turn' : 'enemy-turn';
  el.textContent = `Turno ${battleState.turnCount} — ${whose === 'player' ? '⚔ Sua Vez' : '💀 Inimigo Age!'}`;
}

function appendBattleLog(msg, color) {
  const box = document.getElementById('battle-log-box');
  const div = document.createElement('div');
  div.style.cssText = `font-size:0.74rem;font-family:'Noto Sans JP',sans-serif;color:${color||'rgba(242,232,208,0.7)'};padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03);`;
  div.textContent = msg;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function setBattleButtons(enabled) {
  const btns = document.querySelectorAll('.battle-btn, .skill-battle-btn');
  btns.forEach(b => b.disabled = !enabled);
}

// ─────────────────────────────────────────────────────────────
//  MEMÓRIA DE AÇÕES DO JOGADOR — guarda as últimas ações pra
//  permitir que o inimigo reaja a padrões (ver 2b, ainda não
//  implementado: gatilhos de reação usando esse histórico).
// ─────────────────────────────────────────────────────────────
const ACTION_TAG_KEYWORDS = {
  veneno:   ['veneno', 'envenena', 'toxina'],
  fogo:     ['fogo', 'queima', 'chama', 'incend'],
  gelo:     ['gelo', 'congela', 'gelad'],
  sangue:   ['sangra', 'sangue', 'corte', 'lamina', 'lâmina'],
  cura:     ['cura', 'regenera', 'restaura'],
  dreno:    ['drena', 'dreno', 'suga', 'rouba'],
  atordoa:  ['atordoa', 'atordo', 'stun'],
  cega:     ['cega', 'cegar', 'cegueira'],
  escudo:   ['escudo', 'defesa', 'bloqueio', 'aura'],
  critico:  ['crítico', 'critico', 'crit'],
};

// Remove acentos e baixa a caixa, pra comparar texto livre de forma simples
function _normalizeBattleText(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Olha nome/descrição da skill e devolve as tags temáticas que reconhecer
function inferActionTags(name, desc) {
  const text = _normalizeBattleText((name || '') + ' ' + (desc || ''));
  const tags = [];
  for (const tag in ACTION_TAG_KEYWORDS) {
    if (ACTION_TAG_KEYWORDS[tag].some(kw => text.includes(_normalizeBattleText(kw)))) {
      tags.push(tag);
    }
  }
  return tags;
}

// Registra uma ação do jogador no histórico da batalha (mantém só as últimas 4)
function recordPlayerAction(bs, info) {
  if (!bs) return;
  if (!Array.isArray(bs.playerActionHistory)) bs.playerActionHistory = [];
  bs.playerActionHistory.push({
    turn: bs.turnCount,
    type: info.type,             // 'attack' | 'skill' | 'item' | 'flee'
    key:  info.key  || null,     // id/chave da skill ou item
    name: info.name || '',
    isCrit: info.isCrit === true,
    tags: info.tags || [],
  });
  if (bs.playerActionHistory.length > 4) bs.playerActionHistory.shift();
}

// ── AÇÃO DO JOGADOR ──
function doBattleAction(action, skillIdx) {
  if (!G.inBattle || battleState.phase !== 'player') return;

  const p   = G.player;
  const cls = p.classData;
  const e   = battleState.enemyData;
  const bs  = battleState;
  const isWarrior = ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));

  bs.defending = false;
  bs.phase = 'resolving';
  setBattleButtons(false);

  let playerActed = false;
  let skipEnemyTurn = false;

  // ─────────────── ATACAR ───────────────
  if (action === 'attack') {
    // Arqueiro: ataque normal consome 1 flecha
    const isArcher = cls.id === 'arqueiro';
    if (isArcher) {
      const curArrows = (typeof getArrows === 'function') ? getArrows(p) : (p.arrows || 0);
      if (curArrows < 1) {
        appendBattleLog('🏹 Sem flechas! Recupere flechas defendendo ou aguardando.', '#ff6040');
        bs.phase = 'player';
        setBattleButtons(true);
        return;
      }
      if (typeof consumeArrows === 'function') consumeArrows(p, 1);
      if (typeof playSfxFlecha === 'function') playSfxFlecha();

      // ── Efeitos da Flecha Negra por turno ──
      const arrowId = p.equippedArrow || 'normal';
      if (arrowId === 'negra') {
        bs._arrowNegraTurns = (bs._arrowNegraTurns || 0) + 1;
        const hpCost = Math.ceil(p.maxHp * 0.14);
        p.hp = Math.max(1, p.hp - hpCost);
        appendBattleLog(`🖤 Flecha Negra consome ${hpCost} HP seu!`, '#c060c0');
        updateBattleHUD();
        if (p.hp <= 1) {
          appendBattleLog('⚠ Você está quase morto! Troque de flecha!', '#ff4040');
        }
      }

      // ── Contador de turno para flechas com cooldown ──
      bs._arrowTurnCounter = (bs._arrowTurnCounter || 0) + 1;
    }
    if (p.class === 'mago') playSfxMagoBase();
    playerActed = true;
    animHeroAttack();

    // ── Pegar flecha equipada ──
    const arrowId = (cls.id === 'arqueiro') ? (p.equippedArrow || 'normal') : 'normal';
    const arrowDef = (typeof getArrowType === 'function') ? getArrowType(arrowId) : {efeitos:{}};
    const ef = arrowDef.efeitos || {};

    // Chance de errar (Flecha Élfica reduz miss)
    const baseMiss = BATTLE_CONFIG.MISS_CHANCE - (p.spd * 0.002);
    const missChance = ef.missReduction ? baseMiss * (1 - ef.missReduction) : baseMiss;
    if (Math.random() < Math.max(0, missChance)) {
      appendBattleLog(`💨 Seu ataque errou!`, 'rgba(180,180,180,0.7)');
      showFloatingNumber('enemy', 0, 'miss');
    } else {
      // ── Flecha Branca: Tiro Certeiro a cada 4 turnos ──
      const tiroCerteiro = (arrowId === 'branca' && bs._arrowTurnCounter > 0 && bs._arrowTurnCounter % 4 === 0);

      // Cálculo de dano
      // Flecha Negra: +20% ATQ
      const atkMod = ef.atkMod ? Math.floor(p.atk * ef.atkMod) : 0;
      // Flecha Élfica: ignora 25% da DEF
      const defUsed = ef.defPen ? Math.floor(e.def * (1 - ef.defPen)) : e.def;

      let base;
      if (tiroCerteiro) {
        // Tiro Certeiro: ignora DEF completamente
        base = Math.max(1, p.atk + atkMod + Math.floor(Math.random() * 6));
        appendBattleLog('🤍 TIRO CERTEIRO! A Flecha Branca não falha!', '#e0e8ff');
      } else {
        base = Math.max(1, (p.atk + atkMod) - Math.floor(defUsed / 2) + Math.floor(Math.random() * 6) - 2);
      }

      // Combo bonus
      const comboBonusMult = 1 + (bs.comboTier * BATTLE_CONFIG.COMBO_BONUS_DMG);
      base = Math.floor(base * comboBonusMult);

      // Enrage do inimigo
      if (bs.enemyEnraged) base = Math.max(1, Math.floor(base * 0.85));

      // Crítico (Flecha Élfica -Crit, Flecha Negra +Crit, Tiro Certeiro nunca critica)
      const critBase = BATTLE_CONFIG.CRIT_BASE_CHANCE + (p.spd * 0.003);
      const critMod = ef.critMod || 0;
      const accCritBonus = p.critBonus || 0; // bônus de acessórios equipados (ex.: Amuleto da Bênção de Yuki)
      const critChance = Math.max(0, critBase + critMod + accCritBonus);
      const isCrit = !tiroCerteiro && (Math.random() < critChance || bs._frenzy_active);
      if (isCrit) base = Math.floor(base * BATTLE_CONFIG.CRIT_MULTIPLIER);
      recordPlayerAction(bs, { type: 'attack', key: 'attack', name: 'Ataque', isCrit });

      if (bs._frenzy_active) base = Math.floor(base * 2);
      if (p._talent_wall && p.def > 15) base += Math.floor((p.def - 15) * 0.5);
      if (p._talent_avatar && p.hp > p.maxHp * 0.5) {
        base = Math.floor(base * 1.25);
        p.hp = Math.min(p.maxHp, p.hp + 5);
      }
      if (bs._cursed && bs._cursedTurns > 0) base = Math.floor(base * 1.15);
      if (bs._enemy_cursed && bs._enemy_cursed_turns > 0) base = Math.floor(base * 1.30);

      bs.enemyHp -= base;
      bs.totalDmgDealt = (bs.totalDmgDealt || 0) + base;
      if (typeof applyTalentOnAttack === 'function') {
        const modifiedDmg = applyTalentOnAttack(base, isCrit, bs);
        const talentExtra = modifiedDmg - base;
        if (talentExtra > 0) { bs.enemyHp -= talentExtra; base += talentExtra; }
      }

      // Reflexo do Escudo de Cristal
      if (bs._cristalShield) {
        const reflect = Math.max(1, Math.floor(base * 0.3));
        p.hp = Math.max(1, p.hp - reflect);
        appendBattleLog(`💎 Reflexo de Cristal! O escudo devolve ${reflect} HP de dano!`, '#80c0ff');
        showFloatingNumber('hero', reflect, 'dmg');
        flashDamage('hero');
      }
      bs.comboCount++;
      bs.comboTier = Math.min(3, Math.floor(bs.comboCount / BATTLE_CONFIG.COMBO_WINDOW));

      const logColor = isCrit ? '#ffcc00' : tiroCerteiro ? '#e0e8ff' : 'rgba(200,150,10,0.9)';
      const logMsg = isCrit
        ? `⚔ CRÍTICO! Você acerta ${e.name} por ${base} HP!`
        : `⚔ Você ataca ${e.name}. -${base} HP${comboBonusMult > 1 ? ` (Combo ×${bs.comboCount}!)` : ''}`;
      appendBattleLog(logMsg, logColor);
      addLog(`Ataque: -${base} ao ${e.name}${isCrit?' [CRÍTICO]':''}.`, 'dmg');
      showFloatingNumber('enemy', base, isCrit ? 'crit' : 'dmg');
      flashDamage('enemy');
      updateComboDisplay();
      animEnemyHit();

      // ── Flecha D'Água: 2º ataque a cada 5 turnos ──
      if (arrowId === 'dagua' && bs._arrowTurnCounter > 0 && bs._arrowTurnCounter % 5 === 0) {
        const segundoHit = Math.max(1, Math.floor(base * 0.10));
        bs.enemyHp -= segundoHit;
        appendBattleLog(`💧 Flecha D'Água: 2º disparo! -${segundoHit} HP!`, '#60a0e0');
        showFloatingNumber('enemy', segundoHit, 'dmg');
      }

      // Ganho de AP em combate (warriors)
      if (isWarrior) {
        const apGain = isCrit ? 18 : 10;
        p.ap = Math.min(p.maxAp, (p.ap || 0) + apGain);
      }
    }

  // ─────────────── TROCAR FLECHA ───────────────
  } else if (action === 'trocar_flecha') {
    bs.phase = 'player';
    setBattleButtons(true);
    openBattleArrowMenu();
    return;

  // ─────────────── ITEM ───────────────
  } else if (action === 'item') {
    const consumiveis = p.inventory.filter(i =>
      (i.id.includes('pocao') || i.id.includes('erva')) && (i.qty || 0) > 0
    );
    if (consumiveis.length > 0) {
      // Abre sub-menu de itens na batalha
      openBattleItemMenu();
      bs.phase = 'player'; // ainda é turno do jogador
      setBattleButtons(true);
      return;
    } else {
      appendBattleLog('🎒 Nenhum item de cura disponível!', '#e08060');
      bs.phase = 'player';
      setBattleButtons(true);
      return;
    }

  // ─────────────── FUGIR ───────────────
  } else if (action === 'flee') {
    // Boss não dá pra fugir
    if (e.isBoss) {
      appendBattleLog('❌ Impossível fugir de um chefe!', '#ff4040');
      bs.phase = 'player';
      setBattleButtons(true);
      return;
    }
    const chance = 0.45 + (p.spd / 80);
    recordPlayerAction(bs, { type: 'flee', key: 'flee', name: 'Fuga' });
    if (Math.random() < Math.min(0.9, chance)) {
      appendBattleLog('💨 Você fugiu com sucesso!', 'rgba(200,150,10,0.7)');
      setTimeout(() => endBattle(false, true), 400);
      return;
    } else {
      appendBattleLog('💨 Fuga falhou! O inimigo bloqueia o caminho.', 'rgba(200,80,20,0.7)');
      playerActed = true;
    }

  // ─────────────── SKILL ───────────────
  } else if (action === 'skill') {
    // Talent skill?
    if (typeof skillIdx === 'string' && skillIdx.startsWith('talent_')) {
      const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
      const tIdx = parseInt(skillIdx.split('_')[1]);
      const tSk  = talentSkills[tIdx];
      if (!tSk) { bs.phase='player'; setBattleButtons(true); return; }
      const usesAp = tSk.ap !== undefined;
      const cost   = usesAp ? tSk.ap : (tSk.mp || 0);
      const res    = usesAp ? (p.ap||0) : (p.mp||0);
      if (res < cost) {
        appendBattleLog(`⚡ Sem ${usesAp?'AP':'MP'} suficiente! (${res}/${cost})`, '#e08060');
        bs.phase = 'player'; setBattleButtons(true); return;
      }
      if (usesAp) p.ap = Math.max(0, (p.ap||0) - cost);
      else        p.mp = Math.max(0, p.mp - cost);
      recordPlayerAction(bs, {
        type: 'skill', key: tSk.key || tSk.dmg, name: tSk.name,
        tags: inferActionTags(tSk.name, tSk.desc),
      });
      if (typeof executeTalentSkill === 'function') {
        const tResult = executeTalentSkill(tSk, p, e, bs);
        // Skills assíncronas (ex.: Investida Elemental da Lua Cheia) abrem
        // um overlay e só finalizam o turno quando o jogador escolher.
        if (tResult && tResult.async) { updateHUD(); return; }
      }
      playerActed = true;
      updateHUD();
    } else {
      if (!cls.skills || skillIdx === undefined) { bs.phase='player'; setBattleButtons(true); return; }
      const sk = cls.skills[skillIdx];
      if (!sk) { bs.phase='player'; setBattleButtons(true); return; }
      // BUG-07 FIX: usa getSkillCost() para respeitar redução de talentos
      const cost = (typeof getSkillCost === 'function')
        ? getSkillCost(sk, p)
        : (isWarrior ? (sk.ap || 0) : (sk.mp || 0));
      const res  = isWarrior ? (p.ap || 0) : (p.mp || 0);
      if (res < cost) {
        appendBattleLog(`⚡ Sem ${isWarrior?'AP':'MP'} suficiente! (${res}/${cost})`, '#e08060');
        bs.phase = 'player'; setBattleButtons(true); return;
      }
      if (isWarrior) p.ap = Math.max(0, (p.ap || 0) - cost);
      else           p.mp = Math.max(0, p.mp - cost);
      recordPlayerAction(bs, {
        type: 'skill', key: sk.id || sk.dmg, name: sk.name,
        tags: inferActionTags(sk.name, sk.desc),
      });

      // ── SFX do Mago: toca ANTES do dano para sincronizar com a animação ──
      if (sk.dmg && sk.dmg.startsWith('mago:')) {
        if (sk.elemento === 'agua')        playSfxMagoAgua();
        else if (sk.elemento === 'fogo')    playSfxMagoFogo();
        else if (sk.elemento === 'eletrico') playSfxMagoEletric();
      }

      // ── Reações Elementais (Mago) ──
      const _helpers = { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG, showShieldEffect };
      const _reacaoDisparada = tryReacaoElemental(sk, p, e, bs, _helpers);
      const result = _reacaoDisparada
        ? { skipEnemyTurn: false, enemyStunned: false, apGain: 0 }
        : executeSkill(sk, p, e, bs);

      // Skill assíncrona (ex: Selo Invertido do Mago) — suspende o turno
      if (result && result.async) {
        updateHUD();
        return;
      }

      playerActed = true;

      // Se reação matou o inimigo, encerra imediatamente
      if (_reacaoDisparada && bs.enemyHp <= 0) {
        updateHUD();
        updateBattleHUD();
        bs.phase = 'resolving';
        setTimeout(() => endBattle(true, false), 400);
        return;
      }
      // Anima o herói ao usar skill (suporte não ataca; escudo usa animação de defesa)
      // Compatível com IDs novos (classes.js) e legados
      const _isSupport = sk.isSupport === true
        || sk.dmg === 'paladino:shield' || sk.dmg === 'paladino:aura'
        || sk.dmg === 'shield' || sk.dmg === 'aura';
      const _isShield = sk.dmg === 'paladino:shield' || sk.dmg === 'shield';
      if (!_isSupport) animHeroAttack();
      else if (_isShield) animHeroDefend();
      if (result.skipEnemyTurn) skipEnemyTurn = true;
      if (result.enemyStunned) { bs.enemyStunned = true; bs.enemyStunTurns = 1; skipEnemyTurn = true; }

      // AP ganho ao usar skill de dano (warriors) — recompensa por usar recursos
      if (isWarrior && result.apGain && result.apGain > 0) {
        p.ap = Math.min(p.maxAp, (p.ap || 0) + result.apGain);
        appendBattleLog(`⚡ +${result.apGain} AP (skill)!`, '#e09030');
      }

      updateHUD();
    }
  }

  // ─── Tick de efeitos de status no inimigo (após ação do jogador) ───
  if (playerActed) {
    tickEnemyStatusEffects(bs, e);
    // Reação "guarda": some depois de absorver UM ataque do jogador
    if (bs._enemyGuardTurns > 0 && e) {
      e.def = Math.max(0, (e.def || 0) - (e._guardDefBoost || 0));
      e._guardDefBoost = 0;
      bs._enemyGuardTurns = 0;
      appendBattleLog(`🛡️ A guarda de ${e.name} se desfaz.`, 'rgba(150,170,220,0.7)');
      buildStatusBadges();
    }
  }

  updateBattleHUD();
  buildSkillList();

  // ─── Verificar morte do inimigo ───
  if (battleState.enemyHp <= 0) {
    bs.phase = 'resolving';
    // Arqueiro: aguarda o som da flecha terminar antes de encerrar
    const isArcherKill = G.player.classData && G.player.classData.id === 'arqueiro';
    setTimeout(() => endBattle(true, false), isArcherKill ? 750 : 400);
    return;
  }

  // ─── Turno do Inimigo ───
  if (!playerActed) {
    bs.phase = 'player';
    setBattleButtons(true);
    buildSkillList();
    updateBattleTurnIndicator('player');
    return;
  }

  bs.turnCount++;
  setTimeout(() => runEnemyTurn(bs, p, e, skipEnemyTurn), 850);
}

// ── Sub-menu de itens em batalha ──
function openBattleItemMenu() {
  const p = G.player;
  const consumiveis = p.inventory.filter(i =>
    (i.id.includes('pocao') || i.id.includes('erva') || i.restoreMP || i.id === 'aaur_elixir') && (i.qty || 0) > 0
  );
  const area = document.getElementById('choices-area');
  const origChoices = area.innerHTML;

  // BUG-06 FIX: remove popup anterior se existir (evita duplicação)
  const existing = document.getElementById('battle-item-popup');
  if (existing) existing.remove();

  // Mostra lista de itens como botões temporários
  {
    const popup = document.createElement('div');
    popup.id = 'battle-item-popup';
    popup.style.cssText = `
      position:absolute; bottom:130px; left:50%; transform:translateX(-50%);
      background:rgba(10,6,1,0.98); border:1px solid rgba(200,150,10,0.4);
      border-top:2px solid var(--rust2); padding:10px; min-width:220px;
      z-index:600; font-family:'Noto Serif JP',serif;
    `;
    const title = document.createElement('div');
    title.textContent = '🎒 Escolher Item:';
    title.style.cssText = 'color:var(--gold2);font-size:0.75rem;margin-bottom:7px;letter-spacing:2px;';
    popup.appendChild(title);

    consumiveis.forEach((item, _) => {
      const idx = p.inventory.indexOf(item);
      const isMP = !!(item.restoreMP || item.id.includes('_mp') || item.id === 'aaur_elixir');
      let heal = 0, mpRestore = 0;
      if (isMP) {
        mpRestore = item.restoreMP || 25;
      } else {
        heal = item.heal
          || (item.id === 'erva_rara' ? 30
            : item.id.includes('media') ? 55
            : item.id.includes('erva') ? 15 : 25);
        // Graça Divina: poções curam 50% a mais
        if (p._talent_grace) heal = Math.floor(heal * 1.5);
        // Pedra da Sacerdotisa Negra: cura 7% a mais (permanente)
        if (p._pedraSiuBonusCura) heal = Math.floor(heal * (1 + p._pedraSiuBonusCura));
      }
      const btn = document.createElement('button');
      btn.style.cssText = `
        display:block; width:100%; text-align:left; background:rgba(255,255,255,0.03);
        border:1px solid rgba(200,150,10,0.2); color:var(--gold2); font-size:0.7rem;
        padding:6px 10px; cursor:pointer; margin-bottom:4px; font-family:inherit;
        letter-spacing:1px;
      `;
      const labelVal = isMP
        ? `<span style="color:#5090ff">(+${mpRestore} MP)</span>`
        : `<span style="color:#60d060">(+${heal} HP)</span>`;
      btn.innerHTML = `${item.icon || '🧪'} ${item.name} ×${item.qty} ${labelVal}`;
      btn.onclick = () => {
        useItemInBattle(idx, heal, item, isMP, mpRestore);
        popup.remove();
      };
      popup.appendChild(btn);
    });

    const cancel = document.createElement('button');
    cancel.textContent = '✕ Cancelar';
    cancel.style.cssText = `
      display:block; width:100%; background:transparent; border:1px solid rgba(200,80,20,0.3);
      color:rgba(200,80,20,0.7); font-size:0.65rem; padding:5px; cursor:pointer;
      font-family:inherit; margin-top:4px;
    `;
    cancel.onclick = () => popup.remove();
    popup.appendChild(cancel);

    document.querySelector('.battle-arena').appendChild(popup);
  }
}

function useItemInBattle(idx, heal, item, isMP = false, mpRestore = 0) {
  const p = G.player;
  recordPlayerAction(battleState, {
    type: 'item', key: item.id || item.name, name: item.name,
    tags: isMP ? ['mana'] : ['cura'],
  });
  if (isMP) {
    p.mp = Math.min(p.maxMp, (p.mp || 0) + mpRestore);
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) p.inventory.splice(idx, 1);
    appendBattleLog(`🔵 Usou ${item.name}: +${mpRestore} MP!`, '#5090ff');
    showFloatingNumber('hero', mpRestore, 'heal');
  } else {
    p.hp = Math.min(p.maxHp, p.hp + heal);
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) p.inventory.splice(idx, 1);
    appendBattleLog(`🧪 Usou ${item.name}: +${heal} HP!`, '#60d060');
    showFloatingNumber('hero', heal, 'heal');
  }
  updateHUD();
  buildInventoryGrid();
  updateBattleHUD();

  // Continua para o turno do inimigo
  battleState.turnCount++;
  const bs = battleState;
  const e  = bs.enemyData;

  // Arqueiro: regenerar flechas a cada turno
  if (p.class === 'arqueiro' && typeof regenArrows === 'function') {
    const before = p.arrows || 0;
    regenArrows(p);
    const gained = (p.arrows || 0) - before;
    if (gained > 0) appendBattleLog(`🏹 +${gained} flechas regeneradas! (${p.arrows}/${p.classData.arrows.max})`, '#90d060');
  }

  setTimeout(() => runEnemyTurn(bs, p, e, false), 650);
}




// ══════════════════════════════════════════════════════════════
//  SISTEMA DE FUSÃO ELEMENTAL (Mago) — Menu de seleção manual
// ══════════════════════════════════════════════════════════════

// Dados visuais das fusões (reaproveita REACOES_ELEMENTAIS como base)
const FUSAO_DISPLAY = {
  // FOGO
  'fogo+agua':          { levelRequired:1,  nome:'Vapor',              icon:'🌫️', cor:'#c0e0ff', desc:'Dano 2.0× MAG. Remove Lentidão do inimigo.',                        elem1:'fogo',       elem2:'agua'       },
  'fogo+eletrico':      { levelRequired:1,  nome:'Sobrecarga',         icon:'🌩️', cor:'#ffcc00', desc:'Dano 2.8× MAG. 50% chance de Queimadura.',                           elem1:'fogo',       elem2:'eletrico'   },
  'fogo+gelo':          { levelRequired:5,  nome:'Cinzas de Gelo',     icon:'🔵', cor:'#90c0e0', desc:'Dano 3.0× MAG. Remove todos os buffs do inimigo.',                   elem1:'fogo',       elem2:'gelo'       },
  'fogo+planta':        { levelRequired:7,  nome:'Floresta em Chamas', icon:'🔥', cor:'#e06020', desc:'Dano 2.4× MAG. Queimadura por 5 turnos.',                            elem1:'fogo',       elem2:'planta'     },
  // ÁGUA
  'agua+eletrico':      { levelRequired:1,  nome:'Tempestade',         icon:'⛈️', cor:'#80d0ff', desc:'Dano 2.2× MAG. Paralisia + Lentidão.',                               elem1:'agua',       elem2:'eletrico'   },
  'agua+gelo':          { levelRequired:5,  nome:'Explosão Glacial',   icon:'🧊', cor:'#60c8ff', desc:'Dano 2.3× MAG. Congela garantido.',                                  elem1:'agua',       elem2:'gelo'       },
  'agua+terra':         { levelRequired:10, nome:'Lama Tóxica',        icon:'🟤', cor:'#a06030', desc:'Dano 1.9× MAG. Lentidão extrema 4t + DEF reduzida.',                 elem1:'agua',       elem2:'terra'      },
  'agua+planta':        { levelRequired:7,  nome:'Nuvem de Esporos',   icon:'🍄', cor:'#80e080', desc:'Dano 1.8× MAG. Veneno por 4 turnos.',                                elem1:'agua',       elem2:'planta'     },
  // ELÉTRICO
  'eletrico+gelo':      { levelRequired:5,  nome:'Nevasca',            icon:'🌨️', cor:'#b0e0ff', desc:'Dano 2.5× MAG. Paralisia + Congelamento.',                           elem1:'eletrico',   elem2:'gelo'       },
  'eletrico+planta':    { levelRequired:7,  nome:'Raiz Elétrica',      icon:'⚡', cor:'#b0ff80', desc:'Dano 2.1× MAG. Enraizamento + Paralisia.',                           elem1:'eletrico',   elem2:'planta'     },
  'eletrico+terra':     { levelRequired:10, nome:'Terremoto',          icon:'💥', cor:'#d09050', desc:'Dano 2.6× MAG. DEF reduzida por 3 turnos.',                          elem1:'eletrico',   elem2:'terra'      },
  'eletrico+magia_negra': { nome:'Tempestade Negra', icon:'⚫', cor:'#6030a0', desc:'Dano 3.1× MAG. Paralisia + Maldição + drena HP.',                    elem1:'eletrico',   elem2:'magia_negra'},
  // GELO
  'gelo+planta':        { nome:'Geada das Raízes',   icon:'🥶', cor:'#90e8c0', desc:'Dano 2.0× MAG. Congelamento + Enraizamento 2t.',                     elem1:'gelo',       elem2:'planta'     },
  'gelo+vento':         { nome:'Vendaval Glacial',   icon:'🌬️', cor:'#80c8e0', desc:'Dano 2.2× MAG. Lentidão extrema + Congelamento.',                   elem1:'gelo',       elem2:'vento'      },
  'gelo+energia':       { nome:'Onda Fria',          icon:'💠', cor:'#80c0ff', desc:'Dano 2.4× MAG. Congela + ignora DEF.',                               elem1:'gelo',       elem2:'energia'    },
  'gelo+magia_negra':   { nome:'Gelo Negro',         icon:'🖤', cor:'#6040a0', desc:'Dano 2.7× MAG. Congelamento sombrio: drena HP enquanto congelado.',  elem1:'gelo',       elem2:'magia_negra'},
  // PLANTA
  'planta+terra':       { nome:'Pedra Viva',         icon:'🌱', cor:'#90c060', desc:'Dano 2.0× MAG. Reduz ATQ e DEF + Enraizamento.',                     elem1:'planta',     elem2:'terra'      },
  'planta+energia':     { nome:'Pulso de Vida',      icon:'💚', cor:'#40e080', desc:'Dano 1.6× MAG. Cura 20% HP do Mago.',                                elem1:'planta',     elem2:'energia'    },
  'planta+magia_negra': { nome:'Floresta Sombria',   icon:'🌑', cor:'#507030', desc:'Dano 2.3× MAG. Raízes drenam HP por 3 turnos.',                      elem1:'planta',     elem2:'magia_negra'},
  'planta+veneno':      { nome:'Toxina das Raízes',  icon:'🍃', cor:'#50d050', desc:'Dano 1.9× MAG. Veneno 6t + Enraizamento.',                           elem1:'planta',     elem2:'veneno'     },
  // TERRA
  'terra+fogo':         { levelRequired:10, nome:'Pedra em Brasa',     icon:'🌋', cor:'#ff8030', desc:'Dano 2.7× MAG. Queimadura + DEF reduzida.',                          elem1:'terra',      elem2:'fogo'       },
  'terra+vento':        { nome:'Granizo de Pedras',  icon:'💨', cor:'#c0b080', desc:'Dano 2.4× MAG. Dano físico-mágico + Atordoamento.',                  elem1:'terra',      elem2:'vento'      },
  'terra+magia_negra':  { nome:'Abismo',             icon:'🕳️', cor:'#404060', desc:'Dano 2.8× MAG. Maldição + DEF zero por 2t.',                         elem1:'terra',      elem2:'magia_negra'},
  'terra+caos':         { nome:'Terra do Caos',      icon:'🌑', cor:'#806040', desc:'Dano 2.0–4.5× MAG. Múltiplos efeitos aleatórios.',                  elem1:'terra',      elem2:'caos'       },
  // ENERGIA
  'energia+fogo':       { nome:'Nova de Energia',    icon:'🌟', cor:'#e080ff', desc:'Dano 3.2× MAG. Queimadura garantida.',                               elem1:'energia',    elem2:'fogo'       },
  'energia+luz':        { nome:'Luz Divina',         icon:'✝️', cor:'#ffffa0', desc:'Dano 2.6× MAG. Cura 25% HP + Cegueira.',                             elem1:'energia',    elem2:'luz'        },
  'energia+vento':      { nome:'Vórtice Arcano',     icon:'🌀', cor:'#a060e0', desc:'Dano 2.3× MAG. Paralisia + evasão máxima 2t.',                       elem1:'energia',    elem2:'vento'      },
  'energia+caos':       { nome:'Caos Arcano',        icon:'💫', cor:'#d080ff', desc:'Dano 1.5–5.0× MAG. Efeito aleatório devastador.',                   elem1:'energia',    elem2:'caos'       },
  // MAGIA NEGRA
  'magia_negra+vento':  { nome:'Sombra Veloz',       icon:'🌑', cor:'#604080', desc:'Dano 2.5× MAG. Maldição + evasão máxima 3t.',                        elem1:'magia_negra',elem2:'vento'      },
  'magia_negra+veneno': { nome:'Praga Sombria',      icon:'🦠', cor:'#408040', desc:'Dano 2.0× MAG. Maldição + Veneno 6t + drena HP.',                    elem1:'magia_negra',elem2:'veneno'     },
  'magia_negra+caos':   { nome:'Caos Sombrio',       icon:'⚫', cor:'#8020c0', desc:'Dano 2.0–5.0× MAG. Maldição garantida + efeito sombrio.',           elem1:'magia_negra',elem2:'caos'       },
  'magia_negra+luz':    { nome:'Eclipse',            icon:'🌘', cor:'#504070', desc:'Dano 3.5× MAG. Cura Mago + Cegueira + Maldição.',                    elem1:'magia_negra',elem2:'luz'        },
  // VENTO
  'vento+veneno':       { nome:'Tufão Venenoso',     icon:'🌀', cor:'#80c060', desc:'Dano 2.1× MAG. Veneno 4t + reduz acerto inimigo.',                   elem1:'vento',      elem2:'veneno'     },
  'vento+luz':          { nome:'Rajada de Luz',      icon:'🌟', cor:'#e0f060', desc:'Dano 2.3× MAG. Cegueira garantida + cura Mago.',                     elem1:'vento',      elem2:'luz'        },
  'vento+caos':         { nome:'Vento do Caos',      icon:'🌪️', cor:'#c080d0', desc:'Dano 1.5–3.5× MAG. Efeito aleatório + evasão máxima.',             elem1:'vento',      elem2:'caos'       },
  'vento+gelo':         { nome:'Ciclone de Gelo',    icon:'❄️', cor:'#80d8ff', desc:'Dano 2.4× MAG. Congelamento + Lentidão extrema.',                    elem1:'vento',      elem2:'gelo'       },
  // CAOS
  'caos+veneno':        { nome:'Veneno do Caos',     icon:'🌀', cor:'#a0c040', desc:'Dano 2.0–3.5× MAG. Veneno 3–7t imprevisível.',                      elem1:'caos',       elem2:'veneno'     },
  'caos+luz':           { nome:'Luz do Caos',        icon:'💫', cor:'#f0e080', desc:'Dano 2.5–4.0× MAG. Cura ou cega aleatoriamente.',                   elem1:'caos',       elem2:'luz'        },
  'caos+planta':        { nome:'Floresta Caótica',   icon:'🌿', cor:'#80d080', desc:'Dano 1.8–3.0× MAG. Enraizamento + veneno aleatório.',               elem1:'caos',       elem2:'planta'     },
  'caos+agua':          { nome:'Maré do Caos',       icon:'🌊', cor:'#60b0e0', desc:'Dano 2.0–3.8× MAG. Lentidão extrema + efeito aleatório.',           elem1:'caos',       elem2:'agua'       },
  // VENENO
  'veneno+fogo':        { nome:'Chama Corrosiva',    icon:'🔥', cor:'#c06020', desc:'Dano 2.5× MAG. Queimadura + Veneno + DEF zero.',                     elem1:'veneno',     elem2:'fogo'       },
  'veneno+eletrico':    { nome:'Choque Tóxico',      icon:'⚡', cor:'#a0d040', desc:'Dano 2.3× MAG. Veneno + Paralisia simultâneos.',                      elem1:'veneno',     elem2:'eletrico'   },
  'veneno+gelo':        { nome:'Veneno Glacial',     icon:'❄️', cor:'#60b080', desc:'Dano 2.2× MAG. Congelamento + Veneno intensificado 5t.',              elem1:'veneno',     elem2:'gelo'       },
  'veneno+energia':     { nome:'Energia Tóxica',     icon:'✨', cor:'#b0e060', desc:'Dano 2.4× MAG. Ignora DEF + Veneno 5t.',                             elem1:'veneno',     elem2:'energia'    },
  // LUZ
  'luz+agua':           { nome:'Onda Sagrada',       icon:'🌊', cor:'#c0e8ff', desc:'Dano 2.1× MAG. Cura 15% HP + Cegueira.',                             elem1:'luz',        elem2:'agua'       },
  'luz+terra':          { nome:'Pilar de Luz',       icon:'🏔️', cor:'#e0d060', desc:'Dano 2.5× MAG. Cegueira garantida + DEF reduzida.',                  elem1:'luz',        elem2:'terra'      },
  'luz+planta':         { nome:'Jardim Sagrado',     icon:'🌸', cor:'#d0f080', desc:'Dano 1.8× MAG. Cura 30% HP + Enraizamento.',                         elem1:'luz',        elem2:'planta'     },
  'luz+energia':        { nome:'Explosão Sagrada',   icon:'⭐', cor:'#fff080', desc:'Dano 3.0× MAG. Ignora DEF + cura Mago + Cegueira.',                  elem1:'luz',        elem2:'energia'    },
};

// Mostra/esconde o botão de fusão conforme a classe e skills equipadas
function updateFusaoBtn() {
  const btn = document.getElementById('btn-fusao');
  if (!btn) return;
  const p = G.player;
  if (!p || !p.classData || p.classData.id !== 'mago') { btn.style.display = 'none'; return; }
  const fusoes = _getFusoesDisponiveis();
  btn.style.display = fusoes.length > 0 ? '' : 'none';
}

// Retorna quais fusões o mago pode usar agora (tem os 2 elementos equipados + MP suficiente)
function _getFusoesDisponiveis() {
  const p = G.player;
  if (!p || !p.classData || p.classData.id !== 'mago') return [];
  const cls = p.classData;
  const equipped = p.equippedSkills || [];

  // Mapeia elementos -> custo MP das skills equipadas
  const elemCusto = {};
  cls.skills.forEach((sk, i) => {
    const key = 'b' + i;
    if (sk.elemento && equipped.includes(key) && isElementoDesbloqueado(sk)) {
      elemCusto[sk.elemento] = sk.mp || 0;
    }
  });

  const disponíveis = [];
  Object.entries(FUSAO_DISPLAY).forEach(([chave, f]) => {
    const temElem1 = elemCusto[f.elem1] !== undefined;
    const temElem2 = elemCusto[f.elem2] !== undefined;
    if (!temElem1 || !temElem2) return;
    const custoTotal = (elemCusto[f.elem1] || 0) + (elemCusto[f.elem2] || 0);
    disponíveis.push({ ...f, chave, custoTotal, elem1Custo: elemCusto[f.elem1], elem2Custo: elemCusto[f.elem2] });
  });
  return disponíveis;
}

function openFusaoMenu() {
  if (!G.inBattle || !battleState || battleState.phase !== 'player') return;
  const overlay = document.getElementById('fusao-overlay');
  const list    = document.getElementById('fusao-list');
  if (!overlay || !list) return;

  const fusoes = _getFusoesDisponiveis();
  const mp     = G.player.mp || 0;
  list.innerHTML = '';

  if (fusoes.length === 0) {
    list.innerHTML = '<div style="color:rgba(242,232,208,0.3);font-size:0.7rem;text-align:center;padding:16px;">Nenhuma fusão disponível.<br>Equipe 2 elementos diferentes.</div>';
  } else {
    const elemNomes = {
      fogo:'Fogo 🔥', agua:'Água 💧', eletrico:'Elétrico ⚡',
      gelo:'Gelo ❄️', planta:'Planta 🌿', terra:'Terra 🪨',
      energia:'Energia ✨', magia_negra:'Magia Negra 🌑',
      vento:'Vento 🌪️', caos:'Caos 🌀', veneno:'Veneno ☠️', luz:'Luz ☀️'
    };
    fusoes.forEach(f => {
      const lvReq = f.levelRequired || 1;
      const bloqueada = (G.player.level || 1) < lvReq;
      const podeUsar = !bloqueada && mp >= f.custoTotal;
      const card = document.createElement('button');

      if (bloqueada) {
        card.style.cssText = `
          display:flex;align-items:center;gap:12px;
          width:100%;padding:12px 14px;
          background:rgba(0,0,0,0.3);
          border:1px solid rgba(255,255,255,0.05);
          border-left:3px solid rgba(255,255,255,0.08);
          cursor:not-allowed;opacity:0.35;
          text-align:left;
        `;
        card.innerHTML = `
          <span style="font-size:1.8rem;flex-shrink:0;">🔒</span>
          <div style="flex:1;">
            <div style="font-family:'Noto Serif JP',serif;font-size:0.85rem;color:rgba(200,150,10,0.4);margin-bottom:3px;">${f.nome}</div>
            <div style="font-size:0.6rem;color:rgba(242,232,208,0.25);font-family:'Noto Sans JP',sans-serif;margin-bottom:4px;">Desbloqueado no LV ${lvReq}</div>
            <div style="font-size:0.58rem;color:rgba(200,150,10,0.3);font-family:'Noto Sans JP',sans-serif;">
              ${elemNomes[f.elem1]} + ${elemNomes[f.elem2]}
            </div>
          </div>
          <div style="font-size:0.6rem;color:rgba(200,150,10,0.3);">LV${lvReq}</div>
        `;
      } else {
        card.style.cssText = `
          display:flex;align-items:center;gap:12px;
          width:100%;padding:12px 14px;
          background:rgba(255,255,255,0.03);
          border:1px solid ${podeUsar ? 'rgba(200,150,10,0.25)' : 'rgba(255,255,255,0.07)'};
          border-left:3px solid ${podeUsar ? f.cor : 'rgba(255,255,255,0.1)'};
          cursor:${podeUsar ? 'pointer' : 'not-allowed'};
          opacity:${podeUsar ? '1' : '0.4'};
          transition:background 0.15s;
          text-align:left;
        `;
        card.innerHTML = `
          <span style="font-size:1.8rem;flex-shrink:0;">${f.icon}</span>
          <div style="flex:1;">
            <div style="font-family:'Noto Serif JP',serif;font-size:0.85rem;color:${f.cor};margin-bottom:3px;">${f.nome}</div>
            <div style="font-size:0.6rem;color:rgba(242,232,208,0.4);font-family:'Noto Sans JP',sans-serif;margin-bottom:4px;">${f.desc}</div>
            <div style="font-size:0.58rem;color:rgba(200,150,10,0.5);font-family:'Noto Sans JP',sans-serif;">
              ${elemNomes[f.elem1]} + ${elemNomes[f.elem2]} — <strong style="color:${podeUsar?'#80c0ff':'#c06060'}">${f.custoTotal} MP</strong>
              ${!podeUsar ? ' <span style="color:#c06060">(MP insuficiente)</span>' : ''}
            </div>
          </div>
        `;
        if (podeUsar) {
          card.onmouseenter = () => card.style.background = 'rgba(200,150,10,0.06)';
          card.onmouseleave = () => card.style.background = 'rgba(255,255,255,0.03)';
          card.onclick = () => { closeFusaoMenu(); executarFusao(f); };
        }
      }
      list.appendChild(card);
    });
  }

  overlay.style.display = 'flex';
}

function closeFusaoMenu() {
  const overlay = document.getElementById('fusao-overlay');
  if (overlay) overlay.style.display = 'none';
}

function executarFusao(f) {
  const p  = G.player;
  const e  = G.currentEnemy;
  const bs = battleState;
  if (!p || !e || !bs || bs.phase !== 'player') return;

  if (p.mp < f.custoTotal) { notify('MP insuficiente para a fusão!', 'red'); return; }
  p.mp = Math.max(0, p.mp - f.custoTotal);

  const lvScale = 1 + (p.level || 0) * 0.05;
  const reacao  = REACOES_ELEMENTAIS[f.chave];
  if (!reacao) return;

  bs.phase = 'resolving';
  setBattleButtons(false);

  // ── Cálculo de dano base ──
  let multFinal = reacao.danoMult;
  if (typeof reacao.danoMin === 'number') {
    multFinal = reacao.danoMin + Math.random() * (reacao.danoMax - reacao.danoMin);
  }

  // ── Afinidade elemental ──
  const elemInimigo = e.elemento || 'neutro';
  // Elemento dominante da fusão (usa o primeiro elemento da chave)
  const elemFusao = f.chave ? f.chave.split('+')[0] : 'neutro';
  const { mult: multElem, tipo: tipoElem } = calcMultiplicadorElemental(elemFusao, elemInimigo);
  const dano = Math.max(1, Math.floor(p.mag * multFinal * lvScale * multElem));
  bs.enemyHp -= dano;
  bs.totalDmgDealt = (bs.totalDmgDealt || 0) + dano;

  // ── Log de afinidade ──
  if (tipoElem === 'vantagem') {
    appendBattleLog(`⚡ VANTAGEM ELEMENTAL! ${e.name} é fraco a este elemento!`, '#ffee40');
    showFloatingNumber('enemy', '✦ FRAQUEZA', 'status');
  } else if (tipoElem === 'desvantagem') {
    appendBattleLog(`🛡 RESISTÊNCIA! ${e.name} resiste a este elemento!`, '#80a0c0');
    showFloatingNumber('enemy', '✦ RESIST', 'status');
  }

  // ── Efeitos por fusão ──
  const ef = reacao.efeito;

  // Curas do Mago
  if (reacao.curaHp) {
    const cura = Math.floor(p.maxHp * reacao.curaHp);
    p.hp = Math.min(p.maxHp, p.hp + cura);
    showFloatingNumber('hero', cura, 'heal');
  }

  // Status no inimigo
  if (ef === 'vapor')        { bs.enemySlowed = false; bs.enemySlowTurns = 0; showFloatingNumber('enemy', '🌫️ VAPOR', 'status'); }
  if (ef === 'sobrecarga')   { if (Math.random() < 0.55) { bs.enemyBurning = true; bs.enemyBurnTurns = 3; showFloatingNumber('enemy', '🔥 QUEIMANDO', 'status'); } }
  if (ef === 'cinzas_gelo')  { bs._enemyBuffsCleared = true; showFloatingNumber('enemy', '🔵 BUFFS REMOVIDOS', 'status'); }
  if (ef === 'florestafogo') { bs.enemyBurning = true; bs.enemyBurnTurns = 5; showFloatingNumber('enemy', '🔥 QUEIMANDO 5T', 'status'); }

  if (ef === 'tempestade')   { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs.enemySlowed = true; bs.enemySlowTurns = 2; showFloatingNumber('enemy', '⚡ PARALISIA', 'status'); }
  if (ef === 'glacial')      { bs.enemyStunned = true; bs.enemyStunTurns = 2; bs._enemyFrozen = true; showFloatingNumber('enemy', '❄️ CONGELADO', 'status'); }
  if (ef === 'lama')         { bs.enemySlowed = true; bs.enemySlowTurns = 4; bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 4; showFloatingNumber('enemy', '🟤 LAMA', 'status'); }
  if (ef === 'esporos')      { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; showFloatingNumber('enemy', '🍄 VENENO', 'status'); }

  if (ef === 'nevasca')      { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs._enemyFrozen = true; showFloatingNumber('enemy', '🌨️ PARALISIA+GELO', 'status'); }
  if (ef === 'raiz_eletrica'){ bs._enemyRooted = true; bs._enemyRootedTurns = 2; bs.enemyStunned = true; bs.enemyStunTurns = 1; showFloatingNumber('enemy', '⚡ ENRAIZADO+PARALISIA', 'status'); }
  if (ef === 'terremoto')    { bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyDefDownAmt = 4; showFloatingNumber('enemy', '💥 DEF↓', 'status'); }
  if (ef === 'tempestade_negra') { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs._cursed = true; bs._cursedTurns = 3; const dr = Math.floor(dano * 0.2); p.hp = Math.min(p.maxHp, p.hp + dr); showFloatingNumber('hero', dr, 'heal'); showFloatingNumber('enemy', '⚫ TREVAS+PARALISIA', 'status'); }

  if (ef === 'geada_planta') { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs._enemyRooted = true; bs._enemyRootedTurns = 2; showFloatingNumber('enemy', '🥶 CONGELADO+ENRAIZADO', 'status'); }
  if (ef === 'vendaval_gelo'){ bs.enemySlowed = true; bs.enemySlowTurns = 4; bs._enemyFrozen = true; bs._playerEvasion = 0.3; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '🌬️ GELO+LENTIDÃO', 'status'); }
  if (ef === 'onda_fria')    { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '💠 CONGELADO', 'status'); }
  if (ef === 'gelo_negro')   { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs._cursed = true; bs._cursedTurns = 3; bs._geloNegroDrain = true; showFloatingNumber('enemy', '🖤 GELO SOMBRIO', 'status'); }

  if (ef === 'pedra_viva')   { bs._enemyAtkDown = true; bs._enemyAtkDownTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyRooted = true; bs._enemyRootedTurns = 2; showFloatingNumber('enemy', '🌱 ATQ+DEF↓', 'status'); }
  if (ef === 'vida_planta')  { /* cura já aplicada acima */ showFloatingNumber('hero', '💚 VIDA', 'status'); }
  if (ef === 'trevas_planta'){ bs._cursed = true; bs._cursedTurns = 3; bs._plantaDrain = true; bs._plantaDrainTurns = 3; showFloatingNumber('enemy', '🌑 RAÍZES SOMBRIAS', 'status'); }
  if (ef === 'veneno_planta'){ bs.enemyPoisoned = true; bs.enemyPoisonTurns = 6; bs._enemyRooted = true; bs._enemyRootedTurns = 3; showFloatingNumber('enemy', '🍃 VENENO+ENRAIZADO', 'status'); }

  if (ef === 'pedra_fogo')   { bs.enemyBurning = true; bs.enemyBurnTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 5; showFloatingNumber('enemy', '🌋 BRASA', 'status'); }
  if (ef === 'rocha_vento')  { bs.enemyStunned = true; bs.enemyStunTurns = 1; showFloatingNumber('enemy', '💨 ATORDOADO', 'status'); }
  if (ef === 'abismo')       { bs._cursed = true; bs._cursedTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 99; showFloatingNumber('enemy', '🕳️ ABISMO', 'status'); }
  if (ef === 'terra_caos') {
    const r = Math.random();
    if (r < 0.25)      { bs.enemyBurning = true; bs.enemyBurnTurns = 3; showFloatingNumber('enemy', '🔥', 'status'); }
    else if (r < 0.50) { bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '⚡', 'status'); }
    else if (r < 0.70) { bs._cursed = true; bs._cursedTurns = 3; showFloatingNumber('enemy', '💜', 'status'); }
    else               { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '☠️', 'status'); }
  }

  if (ef === 'nova')         { bs.enemyBurning = true; bs.enemyBurnTurns = 4; showFloatingNumber('enemy', '🌟 QUEIMADURA', 'status'); }
  if (ef === 'luz_divina')   { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '✝️ CEGO', 'status'); }
  if (ef === 'vortice')      { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs._playerEvasion = 0.5; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '🌀 PARALISIA', 'status'); }
  if (ef === 'caos_arcano') {
    const r = Math.random();
    if (r < 0.2)       { bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '⚡ PARALISIA', 'status'); }
    else if (r < 0.4)  { bs._cursed = true; bs._cursedTurns = 4; showFloatingNumber('enemy', '💜 MALDIÇÃO', 'status'); }
    else if (r < 0.6)  { const c = Math.floor(p.maxHp * 0.3); p.hp = Math.min(p.maxHp, p.hp + c); showFloatingNumber('hero', c, 'heal'); }
    else               { const x = Math.floor(p.mag * 2); bs.enemyHp -= x; showFloatingNumber('enemy', x, 'crit'); }
  }

  if (ef === 'sombra_vento') { bs._cursed = true; bs._cursedTurns = 3; bs._playerEvasion = 0.5; bs._playerEvasionTurns = 3; showFloatingNumber('enemy', '🌑 MALDIÇÃO', 'status'); }
  if (ef === 'praga')        { bs._cursed = true; bs._cursedTurns = 4; bs.enemyPoisoned = true; bs.enemyPoisonTurns = 6; const dr = Math.floor(dano * 0.2); p.hp = Math.min(p.maxHp, p.hp + dr); showFloatingNumber('hero', dr, 'heal'); showFloatingNumber('enemy', '🦠 PRAGA', 'status'); }
  if (ef === 'caos_sombrio') {
    bs._cursed = true; bs._cursedTurns = 4;
    const r = Math.random();
    if (r < 0.3)       { bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '⚫ PARALISIA', 'status'); }
    else if (r < 0.6)  { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '⚫ VENENO', 'status'); }
    else               { const dr2 = Math.floor(dano * 0.3); p.hp = Math.min(p.maxHp, p.hp + dr2); showFloatingNumber('hero', dr2, 'heal'); showFloatingNumber('enemy', '⚫ DRENAGEM', 'status'); }
  }
  if (ef === 'eclipse')      { bs._cursed = true; bs._cursedTurns = 4; bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '🌘 ECLIPSE', 'status'); }

  if (ef === 'tufao_veneno') { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; bs._enemyMissNext = true; showFloatingNumber('enemy', '🌀 VENENO+ERRO', 'status'); }
  if (ef === 'luz_vento')    { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; bs._playerEvasion = 0.4; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '🌟 CEGO', 'status'); }
  if (ef === 'vento_caos') {
    bs._playerEvasion = 0.5; bs._playerEvasionTurns = 1;
    const r = Math.random();
    if (r < 0.25)      { bs.enemyBurning = true; bs.enemyBurnTurns = 2; }
    else if (r < 0.5)  { bs.enemyStunned = true; bs.enemyStunTurns = 1; }
    else if (r < 0.75) { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 3; }
    else               { const c2 = Math.floor(p.maxHp * 0.2); p.hp = Math.min(p.maxHp, p.hp + c2); showFloatingNumber('hero', c2, 'heal'); }
    showFloatingNumber('enemy', '🌪️ CAOS', 'status');
  }
  if (ef === 'ciclone_gelo') { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs.enemySlowed = true; bs.enemySlowTurns = 3; bs._playerEvasion = 0.3; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '❄️ CICLONE', 'status'); }

  if (ef === 'caos_veneno')  { const t = 3 + Math.floor(Math.random() * 5); bs.enemyPoisoned = true; bs.enemyPoisonTurns = t; showFloatingNumber('enemy', `🌀 VENENO ${t}T`, 'status'); }
  if (ef === 'caos_luz') {
    const r = Math.random();
    if (r < 0.5) { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '💫 CEGO', 'status'); }
    else         { const c3 = Math.floor(p.maxHp * 0.25); p.hp = Math.min(p.maxHp, p.hp + c3); showFloatingNumber('hero', c3, 'heal'); }
  }
  if (ef === 'caos_planta')  {
    bs._enemyRooted = true; bs._enemyRootedTurns = 2;
    if (Math.random() < 0.5) { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 3; showFloatingNumber('enemy', '🌿 VENENO', 'status'); }
    showFloatingNumber('enemy', '🌿 ENRAIZADO', 'status');
  }
  if (ef === 'caos_agua')    { bs.enemySlowed = true; bs.enemySlowTurns = 4; showFloatingNumber('enemy', '🌊 LENTIDÃO', 'status'); }

  if (ef === 'veneno_fogo')  { bs.enemyBurning = true; bs.enemyBurnTurns = 4; bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyDefDownAmt = 99; showFloatingNumber('enemy', '🔥 ÁCIDO', 'status'); }
  if (ef === 'veneno_eletrico') { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; bs.enemyStunned = true; bs.enemyStunTurns = 1; showFloatingNumber('enemy', '⚡ TÓXICO', 'status'); }
  if (ef === 'veneno_gelo')  { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '❄️ VENENO GLACIAL', 'status'); }
  if (ef === 'veneno_energia'){ bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '✨ VENENO ARCANO', 'status'); }

  if (ef === 'luz_agua')     { bs._enemyBlinded = true; bs._enemyBlindedTurns = 2; showFloatingNumber('enemy', '🌊 CEGO', 'status'); }
  if (ef === 'luz_terra')    { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyDefDownAmt = 4; showFloatingNumber('enemy', '🏔️ PILAR', 'status'); }
  if (ef === 'luz_planta')   { bs._enemyRooted = true; bs._enemyRootedTurns = 3; if (bs.playerPoisoned) { bs.playerPoisoned = false; bs.playerPoisonTurns = 0; appendBattleLog('☀️ Luz purifica o veneno!', '#ffe060'); } showFloatingNumber('enemy', '🌸 ENRAIZADO', 'status'); }
  if (ef === 'luz_energia')  { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '⭐ EXPLOSÃO SAGRADA', 'status'); }

  const _sufixoElem = tipoElem === 'vantagem' ? ' ⚡×1.7' : tipoElem === 'desvantagem' ? ' 🛡×0.6' : '';
  appendBattleLog(`${reacao.icon} FUSÃO ${reacao.nome.toUpperCase()}! ${dano} dano elemental!${_sufixoElem}`, reacao.cor);
  showFloatingNumber('enemy', dano, 'crit');
  flashDamage('enemy');
  animHeroAttack();

  bs._elementoCarregado = null;
  const ind = document.getElementById('bat-elemento-indicador');
  if (ind) ind.style.display = 'none';

  updateHUD();
  updateBattleHUD();
  buildSkillList();

  if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), 400); return; }

  bs.turnCount = (bs.turnCount || 0) + 1;
  setTimeout(() => runEnemyTurn(bs, p, e, false), 850);
}

// ══════════════════════════════════════════════════════════════
//  SISTEMA DE REAÇÕES ELEMENTAIS (Mago) — 48 fusões
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  SISTEMA DE AFINIDADE ELEMENTAL
//  elemento do inimigo → { forte: [elementos que causam +70%],
//                          fraco:  [elementos que causam -40%] }
// ══════════════════════════════════════════════════════════════
const AFINIDADE_ELEMENTAL = {
  fogo:      { forte: ['agua', 'gelo', 'terra'],           fraco: ['fogo', 'eletrico', 'planta'] },
  agua:      { forte: ['eletrico', 'planta', 'veneno'],    fraco: ['agua', 'gelo', 'terra']      },
  eletrico:  { forte: ['terra', 'agua'],                   fraco: ['eletrico', 'vento', 'energia']},
  gelo:      { forte: ['fogo', 'energia', 'luz'],          fraco: ['gelo', 'agua', 'vento']      },
  planta:    { forte: ['fogo', 'gelo', 'veneno'],          fraco: ['planta', 'agua', 'terra']    },
  terra:     { forte: ['agua', 'planta', 'eletrico'],      fraco: ['terra', 'fogo', 'vento']     },
  energia:   { forte: ['magia_negra', 'luz'],              fraco: ['energia', 'caos', 'eletrico']},
  magia_negra:{ forte: ['luz', 'energia'],                 fraco: ['magia_negra', 'caos', 'veneno']},
  vento:     { forte: ['eletrico', 'planta'],              fraco: ['vento', 'caos', 'gelo']      },
  caos:      { forte: ['luz', 'energia', 'magia_negra'],   fraco: ['caos', 'veneno']             },
  veneno:    { forte: ['terra', 'planta'],                 fraco: ['veneno', 'agua', 'fogo']     },
  luz:       { forte: ['magia_negra', 'caos'],             fraco: ['luz', 'energia']             },
  sombra:    { forte: ['luz', 'energia', 'fogo'],          fraco: ['sombra', 'magia_negra', 'caos']},
  cristal:   { forte: ['terra', 'agua', 'magia_negra'],    fraco: ['cristal', 'gelo', 'luz']     },
  neutro:    { forte: [],                                   fraco: []                             },
};

// Calcula multiplicador elemental: retorna { mult, tipo }
// tipo: 'vantagem' | 'desvantagem' | 'neutro'
function calcMultiplicadorElemental(elementoUsado, elementoInimigo) {
  if (!elementoInimigo || elementoInimigo === 'neutro') return { mult: 1.0, tipo: 'neutro' };
  const afinidade = AFINIDADE_ELEMENTAL[elementoInimigo];
  if (!afinidade) return { mult: 1.0, tipo: 'neutro' };
  if (afinidade.forte.includes(elementoUsado)) return { mult: 1.7, tipo: 'vantagem' };
  if (afinidade.fraco.includes(elementoUsado))  return { mult: 0.6, tipo: 'desvantagem' };
  return { mult: 1.0, tipo: 'neutro' };
}

const REACOES_ELEMENTAIS = {
  // FOGO
  'fogo+agua':          { nome:'Vapor',              icon:'🌫️', cor:'#c0e0ff', danoMult:2.0, efeito:'vapor',           curaHp:0    },
  'agua+fogo':          { nome:'Vapor',              icon:'🌫️', cor:'#c0e0ff', danoMult:2.0, efeito:'vapor',           curaHp:0    },
  'fogo+eletrico':      { nome:'Sobrecarga',         icon:'🌩️', cor:'#ffcc00', danoMult:2.8, efeito:'sobrecarga',      curaHp:0    },
  'eletrico+fogo':      { nome:'Sobrecarga',         icon:'🌩️', cor:'#ffcc00', danoMult:2.8, efeito:'sobrecarga',      curaHp:0    },
  'fogo+gelo':          { nome:'Cinzas de Gelo',     icon:'🔵', cor:'#90c0e0', danoMult:3.0, efeito:'cinzas_gelo',     curaHp:0    },
  'gelo+fogo':          { nome:'Cinzas de Gelo',     icon:'🔵', cor:'#90c0e0', danoMult:3.0, efeito:'cinzas_gelo',     curaHp:0    },
  'fogo+planta':        { nome:'Floresta em Chamas', icon:'🔥', cor:'#e06020', danoMult:2.4, efeito:'florestafogo',    curaHp:0    },
  'planta+fogo':        { nome:'Floresta em Chamas', icon:'🔥', cor:'#e06020', danoMult:2.4, efeito:'florestafogo',    curaHp:0    },
  // ÁGUA
  'agua+eletrico':      { nome:'Tempestade',         icon:'⛈️', cor:'#80d0ff', danoMult:2.2, efeito:'tempestade',      curaHp:0    },
  'eletrico+agua':      { nome:'Tempestade',         icon:'⛈️', cor:'#80d0ff', danoMult:2.2, efeito:'tempestade',      curaHp:0    },
  'agua+gelo':          { nome:'Explosão Glacial',   icon:'🧊', cor:'#60c8ff', danoMult:2.3, efeito:'glacial',         curaHp:0    },
  'gelo+agua':          { nome:'Explosão Glacial',   icon:'🧊', cor:'#60c8ff', danoMult:2.3, efeito:'glacial',         curaHp:0    },
  'agua+terra':         { nome:'Lama Tóxica',        icon:'🟤', cor:'#a06030', danoMult:1.9, efeito:'lama',            curaHp:0    },
  'terra+agua':         { nome:'Lama Tóxica',        icon:'🟤', cor:'#a06030', danoMult:1.9, efeito:'lama',            curaHp:0    },
  'agua+planta':        { nome:'Nuvem de Esporos',   icon:'🍄', cor:'#80e080', danoMult:1.8, efeito:'esporos',         curaHp:0    },
  'planta+agua':        { nome:'Nuvem de Esporos',   icon:'🍄', cor:'#80e080', danoMult:1.8, efeito:'esporos',         curaHp:0    },
  // ELÉTRICO
  'eletrico+gelo':      { nome:'Nevasca',            icon:'🌨️', cor:'#b0e0ff', danoMult:2.5, efeito:'nevasca',         curaHp:0    },
  'gelo+eletrico':      { nome:'Nevasca',            icon:'🌨️', cor:'#b0e0ff', danoMult:2.5, efeito:'nevasca',         curaHp:0    },
  'eletrico+planta':    { nome:'Raiz Elétrica',      icon:'⚡', cor:'#b0ff80', danoMult:2.1, efeito:'raiz_eletrica',   curaHp:0    },
  'planta+eletrico':    { nome:'Raiz Elétrica',      icon:'⚡', cor:'#b0ff80', danoMult:2.1, efeito:'raiz_eletrica',   curaHp:0    },
  'eletrico+terra':     { nome:'Terremoto',          icon:'💥', cor:'#d09050', danoMult:2.6, efeito:'terremoto',       curaHp:0    },
  'terra+eletrico':     { nome:'Terremoto',          icon:'💥', cor:'#d09050', danoMult:2.6, efeito:'terremoto',       curaHp:0    },
  'eletrico+magia_negra':{ nome:'Tempestade Negra',  icon:'⚫', cor:'#6030a0', danoMult:3.1, efeito:'tempestade_negra',curaHp:0    },
  'magia_negra+eletrico':{ nome:'Tempestade Negra',  icon:'⚫', cor:'#6030a0', danoMult:3.1, efeito:'tempestade_negra',curaHp:0    },
  // GELO
  'gelo+planta':        { nome:'Geada das Raízes',   icon:'🥶', cor:'#90e8c0', danoMult:2.0, efeito:'geada_planta',    curaHp:0    },
  'planta+gelo':        { nome:'Geada das Raízes',   icon:'🥶', cor:'#90e8c0', danoMult:2.0, efeito:'geada_planta',    curaHp:0    },
  'gelo+vento':         { nome:'Vendaval Glacial',   icon:'🌬️', cor:'#80c8e0', danoMult:2.2, efeito:'vendaval_gelo',   curaHp:0    },
  'vento+gelo':         { nome:'Vendaval Glacial',   icon:'🌬️', cor:'#80c8e0', danoMult:2.2, efeito:'vendaval_gelo',   curaHp:0    },
  'gelo+energia':       { nome:'Onda Fria',          icon:'💠', cor:'#80c0ff', danoMult:2.4, efeito:'onda_fria',       curaHp:0    },
  'energia+gelo':       { nome:'Onda Fria',          icon:'💠', cor:'#80c0ff', danoMult:2.4, efeito:'onda_fria',       curaHp:0    },
  'gelo+magia_negra':   { nome:'Gelo Negro',         icon:'🖤', cor:'#6040a0', danoMult:2.7, efeito:'gelo_negro',      curaHp:0    },
  'magia_negra+gelo':   { nome:'Gelo Negro',         icon:'🖤', cor:'#6040a0', danoMult:2.7, efeito:'gelo_negro',      curaHp:0    },
  // PLANTA
  'planta+terra':       { nome:'Pedra Viva',         icon:'🌱', cor:'#90c060', danoMult:2.0, efeito:'pedra_viva',      curaHp:0    },
  'terra+planta':       { nome:'Pedra Viva',         icon:'🌱', cor:'#90c060', danoMult:2.0, efeito:'pedra_viva',      curaHp:0    },
  'planta+energia':     { nome:'Pulso de Vida',      icon:'💚', cor:'#40e080', danoMult:1.6, efeito:'vida_planta',     curaHp:0.20 },
  'energia+planta':     { nome:'Pulso de Vida',      icon:'💚', cor:'#40e080', danoMult:1.6, efeito:'vida_planta',     curaHp:0.20 },
  'planta+magia_negra': { nome:'Floresta Sombria',   icon:'🌑', cor:'#507030', danoMult:2.3, efeito:'trevas_planta',   curaHp:0    },
  'magia_negra+planta': { nome:'Floresta Sombria',   icon:'🌑', cor:'#507030', danoMult:2.3, efeito:'trevas_planta',   curaHp:0    },
  'planta+veneno':      { nome:'Toxina das Raízes',  icon:'🍃', cor:'#50d050', danoMult:1.9, efeito:'veneno_planta',   curaHp:0    },
  'veneno+planta':      { nome:'Toxina das Raízes',  icon:'🍃', cor:'#50d050', danoMult:1.9, efeito:'veneno_planta',   curaHp:0    },
  // TERRA
  'terra+fogo':         { nome:'Pedra em Brasa',     icon:'🌋', cor:'#ff8030', danoMult:2.7, efeito:'pedra_fogo',      curaHp:0    },
  'terra+vento':        { nome:'Granizo de Pedras',  icon:'💨', cor:'#c0b080', danoMult:2.4, efeito:'rocha_vento',     curaHp:0    },
  'vento+terra':        { nome:'Granizo de Pedras',  icon:'💨', cor:'#c0b080', danoMult:2.4, efeito:'rocha_vento',     curaHp:0    },
  'terra+magia_negra':  { nome:'Abismo',             icon:'🕳️', cor:'#404060', danoMult:2.8, efeito:'abismo',          curaHp:0    },
  'magia_negra+terra':  { nome:'Abismo',             icon:'🕳️', cor:'#404060', danoMult:2.8, efeito:'abismo',          curaHp:0    },
  'terra+caos':         { nome:'Terra do Caos',      icon:'🌑', cor:'#806040', danoMin:2.0, danoMax:4.5, efeito:'terra_caos', curaHp:0 },
  'caos+terra':         { nome:'Terra do Caos',      icon:'🌑', cor:'#806040', danoMin:2.0, danoMax:4.5, efeito:'terra_caos', curaHp:0 },
  // ENERGIA
  'energia+fogo':       { nome:'Nova de Energia',    icon:'🌟', cor:'#e080ff', danoMult:3.2, efeito:'nova',            curaHp:0    },
  'energia+luz':        { nome:'Luz Divina',         icon:'✝️', cor:'#ffffa0', danoMult:2.6, efeito:'luz_divina',      curaHp:0.25 },
  'luz+energia':        { nome:'Luz Divina',         icon:'✝️', cor:'#ffffa0', danoMult:2.6, efeito:'luz_divina',      curaHp:0.25 },
  'energia+vento':      { nome:'Vórtice Arcano',     icon:'🌀', cor:'#a060e0', danoMult:2.3, efeito:'vortice',         curaHp:0    },
  'vento+energia':      { nome:'Vórtice Arcano',     icon:'🌀', cor:'#a060e0', danoMult:2.3, efeito:'vortice',         curaHp:0    },
  'energia+caos':       { nome:'Caos Arcano',        icon:'💫', cor:'#d080ff', danoMin:1.5, danoMax:5.0, efeito:'caos_arcano', curaHp:0 },
  'caos+energia':       { nome:'Caos Arcano',        icon:'💫', cor:'#d080ff', danoMin:1.5, danoMax:5.0, efeito:'caos_arcano', curaHp:0 },
  // MAGIA NEGRA
  'magia_negra+vento':  { nome:'Sombra Veloz',       icon:'🌑', cor:'#604080', danoMult:2.5, efeito:'sombra_vento',    curaHp:0    },
  'vento+magia_negra':  { nome:'Sombra Veloz',       icon:'🌑', cor:'#604080', danoMult:2.5, efeito:'sombra_vento',    curaHp:0    },
  'magia_negra+veneno': { nome:'Praga Sombria',      icon:'🦠', cor:'#408040', danoMult:2.0, efeito:'praga',           curaHp:0    },
  'veneno+magia_negra': { nome:'Praga Sombria',      icon:'🦠', cor:'#408040', danoMult:2.0, efeito:'praga',           curaHp:0    },
  'magia_negra+caos':   { nome:'Caos Sombrio',       icon:'⚫', cor:'#8020c0', danoMin:2.0, danoMax:5.0, efeito:'caos_sombrio', curaHp:0 },
  'caos+magia_negra':   { nome:'Caos Sombrio',       icon:'⚫', cor:'#8020c0', danoMin:2.0, danoMax:5.0, efeito:'caos_sombrio', curaHp:0 },
  'magia_negra+luz':    { nome:'Eclipse',            icon:'🌘', cor:'#504070', danoMult:3.5, efeito:'eclipse',         curaHp:0.20 },
  'luz+magia_negra':    { nome:'Eclipse',            icon:'🌘', cor:'#504070', danoMult:3.5, efeito:'eclipse',         curaHp:0.20 },
  // VENTO
  'vento+veneno':       { nome:'Tufão Venenoso',     icon:'🌀', cor:'#80c060', danoMult:2.1, efeito:'tufao_veneno',    curaHp:0    },
  'veneno+vento':       { nome:'Tufão Venenoso',     icon:'🌀', cor:'#80c060', danoMult:2.1, efeito:'tufao_veneno',    curaHp:0    },
  'vento+luz':          { nome:'Rajada de Luz',      icon:'🌟', cor:'#e0f060', danoMult:2.3, efeito:'luz_vento',       curaHp:0.10 },
  'luz+vento':          { nome:'Rajada de Luz',      icon:'🌟', cor:'#e0f060', danoMult:2.3, efeito:'luz_vento',       curaHp:0.10 },
  'vento+caos':         { nome:'Vento do Caos',      icon:'🌪️', cor:'#c080d0', danoMin:1.5, danoMax:3.5, efeito:'vento_caos', curaHp:0 },
  'caos+vento':         { nome:'Vento do Caos',      icon:'🌪️', cor:'#c080d0', danoMin:1.5, danoMax:3.5, efeito:'vento_caos', curaHp:0 },
  'vento+gelo':         { nome:'Ciclone de Gelo',    icon:'❄️', cor:'#80d8ff', danoMult:2.4, efeito:'ciclone_gelo',   curaHp:0    },
  // CAOS
  'caos+veneno':        { nome:'Veneno do Caos',     icon:'🌀', cor:'#a0c040', danoMin:2.0, danoMax:3.5, efeito:'caos_veneno', curaHp:0 },
  'veneno+caos':        { nome:'Veneno do Caos',     icon:'🌀', cor:'#a0c040', danoMin:2.0, danoMax:3.5, efeito:'caos_veneno', curaHp:0 },
  'caos+luz':           { nome:'Luz do Caos',        icon:'💫', cor:'#f0e080', danoMin:2.5, danoMax:4.0, efeito:'caos_luz',   curaHp:0 },
  'luz+caos':           { nome:'Luz do Caos',        icon:'💫', cor:'#f0e080', danoMin:2.5, danoMax:4.0, efeito:'caos_luz',   curaHp:0 },
  'caos+planta':        { nome:'Floresta Caótica',   icon:'🌿', cor:'#80d080', danoMin:1.8, danoMax:3.0, efeito:'caos_planta',curaHp:0 },
  'caos+agua':          { nome:'Maré do Caos',       icon:'🌊', cor:'#60b0e0', danoMin:2.0, danoMax:3.8, efeito:'caos_agua',  curaHp:0 },
  'agua+caos':          { nome:'Maré do Caos',       icon:'🌊', cor:'#60b0e0', danoMin:2.0, danoMax:3.8, efeito:'caos_agua',  curaHp:0 },
  // VENENO
  'veneno+fogo':        { nome:'Chama Corrosiva',    icon:'🔥', cor:'#c06020', danoMult:2.5, efeito:'veneno_fogo',     curaHp:0    },
  'fogo+veneno':        { nome:'Chama Corrosiva',    icon:'🔥', cor:'#c06020', danoMult:2.5, efeito:'veneno_fogo',     curaHp:0    },
  'veneno+eletrico':    { nome:'Choque Tóxico',      icon:'⚡', cor:'#a0d040', danoMult:2.3, efeito:'veneno_eletrico', curaHp:0    },
  'eletrico+veneno':    { nome:'Choque Tóxico',      icon:'⚡', cor:'#a0d040', danoMult:2.3, efeito:'veneno_eletrico', curaHp:0    },
  'veneno+gelo':        { nome:'Veneno Glacial',     icon:'❄️', cor:'#60b080', danoMult:2.2, efeito:'veneno_gelo',     curaHp:0    },
  'veneno+energia':     { nome:'Energia Tóxica',     icon:'✨', cor:'#b0e060', danoMult:2.4, efeito:'veneno_energia',  curaHp:0    },
  'energia+veneno':     { nome:'Energia Tóxica',     icon:'✨', cor:'#b0e060', danoMult:2.4, efeito:'veneno_energia',  curaHp:0    },
  // LUZ
  'luz+agua':           { nome:'Onda Sagrada',       icon:'🌊', cor:'#c0e8ff', danoMult:2.1, efeito:'luz_agua',        curaHp:0.15 },
  'agua+luz':           { nome:'Onda Sagrada',       icon:'🌊', cor:'#c0e8ff', danoMult:2.1, efeito:'luz_agua',        curaHp:0.15 },
  'luz+terra':          { nome:'Pilar de Luz',       icon:'🏔️', cor:'#e0d060', danoMult:2.5, efeito:'luz_terra',       curaHp:0.10 },
  'terra+luz':          { nome:'Pilar de Luz',       icon:'🏔️', cor:'#e0d060', danoMult:2.5, efeito:'luz_terra',       curaHp:0.10 },
  'luz+planta':         { nome:'Jardim Sagrado',     icon:'🌸', cor:'#d0f080', danoMult:1.8, efeito:'luz_planta',      curaHp:0.30 },
  'luz+energia':        { nome:'Explosão Sagrada',   icon:'⭐', cor:'#fff080', danoMult:3.0, efeito:'luz_energia',     curaHp:0.15 },
};

function tryReacaoElemental(sk, p, e, bs, helpers) {
  if (!p.classData || p.classData.id !== 'mago') return false;
  if (!sk.elemento) return false;
  const { appendBattleLog, showFloatingNumber, flashDamage } = helpers;
  if (bs._elementoCarregado) {
    const chave = bs._elementoCarregado + '+' + sk.elemento;
    const reacao = REACOES_ELEMENTAIS[chave];
    bs._elementoCarregado = null;
    const ind = document.getElementById('bat-elemento-indicador');
    if (ind) ind.style.display = 'none';
    if (reacao) {
      const lvScale = 1 + (p.level || 0) * 0.05;
      const dano = Math.max(1, Math.floor(p.mag * reacao.danoMult * lvScale));
      bs.enemyHp -= dano;
      if (reacao.efeito === 'vapor') {
        bs.enemySlowed = false; bs.enemySlowTurns = 0;
        showFloatingNumber('enemy', '🌫️ VAPOR', 'status');
      } else if (reacao.efeito === 'sobrecarga') {
        if (Math.random() < 0.50) { bs.enemyBurning = true; bs.enemyBurnTurns = 2; showFloatingNumber('enemy', '🔥 QUEIMANDO', 'status'); }
      } else if (reacao.efeito === 'tempestade') {
        bs.enemyStunned = true; bs.enemyStunTurns = 1;
        bs.enemySlowed = true; bs.enemySlowTurns = 2;
        showFloatingNumber('enemy', '⚡ PARALISIA', 'status');
      }
      appendBattleLog(reacao.icon + ' REAÇÃO: ' + reacao.nome + '! ' + dano + ' dano elemental!', reacao.cor);
      showFloatingNumber('enemy', dano, 'crit');
      flashDamage('enemy');
      return true;
    }
  }
  bs._elementoCarregado = sk.elemento;
  // Badge nos botões indica o elemento carregado
  return false;
}

// ── Bridge: executa skill da classe ──
// Delega inteiramente ao executeClassSkill de classes.js.
// ⚠ NÃO adicione lógica de skill aqui. Edite classes.js.
function executeSkill(sk, p, e, bs) {
  // Skills de talento (dmg começa com 'TALENT_')
  if (sk.dmg && sk.dmg.startsWith('TALENT_')) {
    if (typeof window.executeTalentSkill === 'function') {
      const result = window.executeTalentSkill(sk, p, e, bs);
      addLog(`Skill de talento "${sk.name}": executada.`, 'dmg');
      return result || { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
    }
  }
  if (typeof window.executeClassSkill !== 'function') {
    console.error('[Clivor] classes.js não carregado! executeClassSkill ausente.');
    return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  }
  const result = window.executeClassSkill(sk, p, e, bs, {
    appendBattleLog,
    showFloatingNumber,
    flashDamage,
    animEnemyHit,
    BATTLE_CONFIG,
    showShieldEffect,
  });
  // SFX de flecha para skills do Arqueiro
  if (sk.dmg && sk.dmg.startsWith('arqueiro:') && typeof playSfxFlecha === 'function') {
    playSfxFlecha();
  }
  addLog(`Skill "${sk.name}": executada.`, 'dmg');
  return result;
}

// ── Tick de efeitos de status no inimigo ──
function tickEnemyStatusEffects(bs, e) {
  if (bs.enemyPoisoned && bs.enemyPoisonTurns > 0) {
    const pdmg = BATTLE_CONFIG.POISON_DMG_BASE;
    bs.enemyHp -= pdmg;
    bs.enemyPoisonTurns--;
    appendBattleLog(`☠ Veneno corrói ${e.name}: -${pdmg} HP! (${bs.enemyPoisonTurns} turnos restantes)`, '#60c060');
    if (bs.enemyPoisonTurns <= 0) { bs.enemyPoisoned = false; appendBattleLog('☠ Veneno dissipado.', '#408040'); }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), 300); return; } // BUG-01 FIX
  }
  if (bs.enemyBurning && bs.enemyBurnTurns > 0) {
    const bdmg = BATTLE_CONFIG.BURN_DMG_BASE;
    bs.enemyHp -= bdmg;
    bs.enemyBurnTurns--;
    appendBattleLog(`🔥 Queimadura: -${bdmg} HP ao inimigo! (${bs.enemyBurnTurns}t)`, '#e08030');
    if (bs.enemyBurnTurns <= 0) { bs.enemyBurning = false; appendBattleLog('🔥 Queimadura extinta.', '#804020'); }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), 300); return; } // BUG-01 FIX
  }
  // Sangramento inimigo (Paladino das Trevas)
  if (bs.enemyBleeding && bs.enemyBleedTurns > 0) {
    const blddmg = BATTLE_CONFIG.BLEED_DMG_BASE;
    bs.enemyHp -= blddmg;
    bs.enemyBleedTurns--;
    appendBattleLog(`🩸 Sangramento: -${blddmg} HP ao inimigo! (${bs.enemyBleedTurns}t)`, '#c04040');
    if (bs.enemyBleedTurns <= 0) { bs.enemyBleeding = false; appendBattleLog('🩸 Sangramento estancado.', '#804040'); }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), 300); return; }
  }
  if (bs.enemySlowed && bs.enemySlowTurns > 0) {
    bs.enemySlowTurns--;
    if (bs.enemySlowTurns <= 0) { bs.enemySlowed = false; appendBattleLog('❄ Lentidão terminou.', '#6088aa'); }
  }
  if (bs.enemyStunned && bs.enemyStunTurns > 0) {
    bs.enemyStunTurns--;
    if (bs.enemyStunTurns <= 0) { bs.enemyStunned = false; }
  }
  // Maldição Sombria (Paladino): decrementa duração
  if (bs._cursed && bs._cursedTurns > 0) {
    bs._cursedTurns--;
    if (bs._cursedTurns <= 0) { bs._cursed = false; appendBattleLog('💜 Maldição dissipada.', '#8040a0'); }
  }
  // Maldição do Julgamento (Talento): decrementa duração
  if (bs._enemy_cursed && bs._enemy_cursed_turns > 0) {
    bs._enemy_cursed_turns--;
    if (bs._enemy_cursed_turns <= 0) { bs._enemy_cursed = false; appendBattleLog('⚖️ Maldição do Julgamento dissipada.', '#8040a0'); }
  }
  // ── Novos status de fusão (Mago) ──
  if (bs._enemyRooted && bs._enemyRootedTurns > 0) {
    bs._enemyRootedTurns--;
    if (bs._enemyRootedTurns <= 0) { bs._enemyRooted = false; appendBattleLog('🌿 Enraizamento removido.', '#60d060'); }
  }
  if (bs._enemyDefDown && bs._enemyDefDownTurns > 0) {
    bs._enemyDefDownTurns--;
    if (bs._enemyDefDownTurns <= 0) { bs._enemyDefDown = false; bs._enemyDefDownAmt = 0; appendBattleLog('🪨 DEF do inimigo restaurada.', '#c08040'); }
  }
  if (bs._enemyAtkDown && bs._enemyAtkDownTurns > 0) {
    bs._enemyAtkDownTurns--;
    if (bs._enemyAtkDownTurns <= 0) { bs._enemyAtkDown = false; appendBattleLog('🌱 ATQ do inimigo restaurado.', '#90c060'); }
  }
  if (bs._enemyBlinded && bs._enemyBlindedTurns > 0) {
    bs._enemyBlindedTurns--;
    if (bs._enemyBlindedTurns <= 0) { bs._enemyBlinded = false; appendBattleLog('☀️ Cegueira removida.', '#ffe060'); }
  }
  if (bs._playerEvasion > 0 && bs._playerEvasionTurns > 0) {
    bs._playerEvasionTurns--;
    if (bs._playerEvasionTurns <= 0) { bs._playerEvasion = 0; appendBattleLog('🌪️ Bônus de evasão expirou.', '#80d0ff'); }
  }
  // Escudo de Cristal (Guardião de Cristal)
  if (bs._cristalShield && bs._cristalShieldTurns > 0) {
    bs._cristalShieldTurns--;
    if (bs._cristalShieldTurns <= 0) {
      bs._cristalShield = false;
      e.def = Math.max(0, e.def - (bs._crystalDefBonus || 8));
      bs._crystalDefBonus = 0;
      appendBattleLog('💎 Escudo de Cristal se desfez.', '#80c0ff');
    }
  }
  // Gelo Negro: drena HP enquanto congelado
  if (bs._geloNegroDrain && bs._enemyFrozen && bs.enemyHp > 0) {
    const p = G.player;
    const dr = Math.floor((p ? p.mag * 0.5 : 8));
    bs.enemyHp -= dr;
    if (p) { p.hp = Math.min(p.maxHp, p.hp + Math.floor(dr * 0.5)); showFloatingNumber('hero', Math.floor(dr * 0.5), 'heal'); }
    appendBattleLog(`🖤 Gelo Negro drena ${dr} HP do inimigo!`, '#6040a0');
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), 300); return; }
  }
  // Raízes Sombrias: drena HP por turno
  if (bs._plantaDrain && bs._plantaDrainTurns > 0) {
    const p = G.player;
    const dr2 = Math.floor((p ? p.mag * 0.4 : 6));
    bs.enemyHp -= dr2;
    if (p) { p.hp = Math.min(p.maxHp, p.hp + Math.floor(dr2 * 0.4)); showFloatingNumber('hero', Math.floor(dr2 * 0.4), 'heal'); }
    bs._plantaDrainTurns--;
    appendBattleLog(`🌑 Raízes Sombrias drenam ${dr2} HP! (${bs._plantaDrainTurns}t)`, '#507030');
    if (bs._plantaDrainTurns <= 0) { bs._plantaDrain = false; }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), 300); return; }
  }
}

// ── Tick de efeitos de status no jogador ──
function tickPlayerStatusEffects(bs, p) {
  if (bs.playerPoisoned && bs.playerPoisonTurns > 0) {
    const pdmg = BATTLE_CONFIG.POISON_DMG_BASE - 2; // veneno no jogador é levemente menor
    p.hp = Math.max(0, p.hp - pdmg);
    bs.playerPoisonTurns--;
    appendBattleLog(`☠ Veneno drena seu HP: -${pdmg}! (${bs.playerPoisonTurns}t)`, '#80ff80');
    showFloatingNumber('hero', pdmg, 'dmg');
    if (bs.playerPoisonTurns <= 0) { bs.playerPoisoned = false; appendBattleLog('☠ Veneno curado.', '#408040'); }
  }
  if (bs.playerBleeding && bs.playerBleedTurns > 0) {
    const bdmg = BATTLE_CONFIG.BLEED_DMG_BASE;
    p.hp = Math.max(0, p.hp - bdmg);
    bs.playerBleedTurns--;
    appendBattleLog(`🩸 Sangramento: -${bdmg} HP! (${bs.playerBleedTurns}t)`, '#c04040');
    showFloatingNumber('hero', bdmg, 'dmg');
    if (bs.playerBleedTurns <= 0) { bs.playerBleeding = false; appendBattleLog('🩸 Sangramento estancado.', '#804040'); }
  }
  if (bs._regenTurns > 0) {
    const regen = Math.floor(p.maxHp * 0.04);
    p.hp = Math.min(p.maxHp, p.hp + regen);
    bs._regenTurns--;
    appendBattleLog(`💚 Regeneração: +${regen} HP!`, '#40c040');
    showFloatingNumber('hero', regen, 'heal');
  }
  // ── Regen passivo da Runa (Paladino A/S) ──
  if (p._enchantRegen && p._enchantRegen > 0) {
    const enchRegen = Math.max(1, Math.floor(p.maxHp * p._enchantRegen));
    p.hp = Math.min(p.maxHp, p.hp + enchRegen);
    appendBattleLog(`✨ Runa Sagrada: +${enchRegen} HP regenerado!`, '#d0d0ff');
    showFloatingNumber('hero', enchRegen, 'heal');
  }
  // Desfazer buff ATQ
  if (bs._buffAtkTurns > 0) {
    bs._buffAtkTurns--;
    if (bs._buffAtkTurns <= 0 && bs._buffAtkAmt > 0) {
      p.atk -= bs._buffAtkAmt;
      bs._buffAtkAmt = 0;
      appendBattleLog('📉 Buff de ATQ expirou.', '#888');
    }
  }
  if (bs._buffDefTurns > 0) {
    bs._buffDefTurns--;
    if (bs._buffDefTurns <= 0 && bs._buffDefAmt > 0) {
      p.def -= bs._buffDefAmt;
      bs._buffDefAmt = 0;
    }
  }
  // Desfazer buff do Coração Incandescente — esfria até a próxima batalha
  if (bs._coracaoTurns > 0) {
    bs._coracaoTurns--;
    if (bs._coracaoTurns <= 0) {
      if (bs._coracaoAtkAmt)  { p.atk = Math.max(0, p.atk - bs._coracaoAtkAmt); bs._coracaoAtkAmt = 0; }
      if (bs._coracaoCritAmt) { p.critBonus = Math.max(0, (p.critBonus || 0) - bs._coracaoCritAmt); bs._coracaoCritAmt = 0; }
      appendBattleLog('🔥 O Coração Incandescente esfria — o brilho se apaga até a próxima batalha.', '#ff6a2a');
    }
  }
}

// ── IA do Inimigo ──
// Mostra um selo curto sobre um dos lados da batalha (reação do inimigo ou buff do herói)
function showBattleSideBadge(side, text, color) {
  const container = document.getElementById(side === 'hero' ? 'bat-hero-side' : 'bat-enemy-side');
  if (!container) return;
  if (!container.style.position) container.style.position = 'relative';
  const badge = document.createElement('div');
  badge.className = 'enemy-reaction-badge';
  badge.textContent = text;
  badge.style.cssText += `background:${typeof hexToRgba === 'function' ? hexToRgba(color, 0.22) : 'rgba(0,0,0,0.4)'}; border:1px solid ${color}; color:${color};`;
  container.appendChild(badge);
  setTimeout(() => badge.remove(), 1850);
}
// Mantém o nome antigo funcionando (usado pelas reações do inimigo)
function showEnemyReactionBadge(text, color) { showBattleSideBadge('enemy', text, color); }

// ─────────────────────────────────────────────────────────────
//  REAÇÃO DO INIMIGO — lê o histórico de ações do jogador e
//  decide se o inimigo muda de comportamento neste turno.
//  Regras (nessa ordem de prioridade):
//   • 2 ações de veneno seguidas  → inimigo se cura antes de agir
//   • 2 críticos seguidos         → inimigo entra em guarda (reduz
//                                    dano do PRÓXIMO ataque do jogador)
//   • mesma skill 3x seguidas     → inimigo antecipa o padrão e
//                                    golpeia com dano bônus
// ─────────────────────────────────────────────────────────────
function evaluateEnemyReaction(bs) {
  const hist = bs.playerActionHistory || [];
  if (hist.length < 2) return null;
  const last2 = hist.slice(-2);
  const last3 = hist.slice(-3);

  if (last2.every(a => a.tags && a.tags.includes('veneno'))) {
    return { type: 'heal' };
  }
  if (last2.every(a => a.isCrit)) {
    return { type: 'guard' };
  }
  if (last3.length === 3 && last3.every(a => a.key && a.key === last3[0].key)) {
    return { type: 'predict' };
  }
  return null;
}

function runEnemyTurn(bs, p, e, skipTurn) {
  updateBattleTurnIndicator('enemy');

  // Se atordoado, pula o turno
  if (bs.enemyStunned || skipTurn) {
    appendBattleLog(`⚡ ${e.name} está atordoado e perde o turno!`, '#ffee40');
    tickPlayerStatusEffects(bs, p);
    updateHUD();
    updateBattleHUD();
    // BUG-02 FIX: checar se jogador morreu por status no path de stun
    if (p.hp <= 0) {
      p.hp = 0;
      setTimeout(() => endBattle(false, false), 400);
      return;
    }
    bs.phase = 'player';
    setBattleButtons(true);
    buildSkillList();
    updateBattleTurnIndicator('player');
    return;
  }

  bs.enemyTurnAI = (bs.enemyTurnAI || 0) + 1;

  // ── Reação a padrões do jogador ──
  const _reaction = (typeof evaluateEnemyReaction === 'function') ? evaluateEnemyReaction(bs) : null;
  let _reactionDmgMult = 1;
  let _reactionForceNormal = false;
  if (_reaction) {
    bs.playerActionHistory = []; // some o padrão lido, pra não reagir de novo no turno seguinte sem motivo novo
    if (_reaction.type === 'heal') {
      const healAmt = Math.floor(bs.enemyMaxHp * 0.12);
      bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + healAmt);
      appendBattleLog(`🧠 ${e.name} percebe o veneno repetido e se cura ${healAmt} HP antes de agir!`, '#60d090');
      showFloatingNumber('enemy', healAmt, 'heal');
      showEnemyReactionBadge('🧠 PERCEBEU O VENENO', '#60d090');
      updateBattleHUD();
    } else if (_reaction.type === 'guard') {
      const guardBoost = Math.max(2, Math.floor((e.def || 0) * 0.5));
      e.def = (e.def || 0) + guardBoost;
      e._guardDefBoost = (e._guardDefBoost || 0) + guardBoost;
      bs._enemyGuardTurns = 1;
      appendBattleLog(`🛡️ ${e.name} percebe seus críticos seguidos e se prepara — guarda alta no seu próximo ataque!`, '#80a0ff');
      showEnemyReactionBadge('🛡 ENTROU EM GUARDA', '#80a0ff');
    } else if (_reaction.type === 'predict') {
      _reactionDmgMult = 1.3;
      _reactionForceNormal = true;
      appendBattleLog(`👁️ ${e.name} antecipa seu padrão e golpeia com mais força!`, '#ff8060');
      showEnemyReactionBadge('👁 ANTECIPOU SEU PADRÃO', '#ff8060');
    }
  }

  // Anima sprite do inimigo: attack
  animEnemyAttack();

  // Tick de status do jogador (no turno do inimigo)
  tickPlayerStatusEffects(bs, p);

  // Decidir ação do inimigo
  const aiKey = e.id || 'default';
  const ai = ENEMY_AI[aiKey] || ENEMY_AI.default;

  // Inimigo enraivecido usa especial mais vezes
  const specialChance = bs.enemyEnraged
    ? BATTLE_CONFIG.ENEMY_SPECIAL_CHANCE * 1.5
    : BATTLE_CONFIG.ENEMY_SPECIAL_CHANCE;

  // A cada 3 turnos ou com chance aleatória → ataque especial (a menos que esteja antecipando o padrão)
  if (!_reactionForceNormal && (bs.enemyTurnAI % 3 === 0 || Math.random() < specialChance)) {
    // Ataque especial
    appendBattleLog(`${e.icon||'👹'} ${e.name} usa ${ai.specialIcon} ${ai.specialName}!`, '#ff8040');
    setTimeout(() => {
      ai.special(bs, p, e);
      updateHUD();
      updateBattleHUD();
      buildStatusBadges();

      if (p.hp <= 0) {
        p.hp = 0; setTimeout(() => endBattle(false, false), 500);
      } else {
        bs.phase = 'player';
        setBattleButtons(true);
        buildSkillList();
        updateBattleTurnIndicator('player');
      }
    }, 400);

  } else {
    // Ataque normal
    setTimeout(() => {
      // Esquiva do jogador
      const dodgeChance = BATTLE_CONFIG.MISS_CHANCE + (p.spd * BATTLE_CONFIG.DODGE_BONUS_PER_SPD) + (p._lua_dodge_bonus || 0);
      if (Math.random() < Math.min(0.4, dodgeChance)) {
        appendBattleLog(`💨 Você esquivou do ataque de ${e.name}!`, 'rgba(200,200,200,0.7)');
        showFloatingNumber('hero', 0, 'miss');
        // Manter combo ao esquivar
        bs.comboCount++;
        bs.comboTier = Math.min(3, Math.floor(bs.comboCount / BATTLE_CONFIG.COMBO_WINDOW));
        updateComboDisplay();
      } else {
        // Passiva de crítico (ex: Kakuri Muichi)
        const _passiva = G._dungeonEnemyPassiva;
        const _isCrit = _passiva && _passiva.tipo === 'critico_alto' && Math.random() < (_passiva.chance || 0.4);
        const dmg = calcEnemyDmg(e, p, bs, bs.enemyEnraged ? 1.5 : 1.0) * (_isCrit ? (_passiva.mult || 2.0) : 1.0) * _reactionDmgMult;
        const dmgFinal = Math.floor(dmg);
        applyDmgToPlayer(dmgFinal, bs, p);
        if (_isCrit) {
          appendBattleLog(`💀 ${e.name} — CORTE CRÍTICO! -${dmgFinal} HP! ⚡ A lâmina cortou o vento!`, '#ff4040');
          showFloatingNumber('hero', dmgFinal, 'crit');
        } else {
          appendBattleLog(`💀 ${e.name} ataca! -${dmgFinal} HP!`, 'rgba(200,80,20,0.9)');
          showFloatingNumber('hero', dmgFinal, 'dmg');
        }
        // Passiva de Siu — Sacerdotisa Negra: todo ataque (normal ou especial) cura 7% do dano causado
        if (_passiva && _passiva.tipo === 'siu_dreno_cura') {
          const _siuHealNormal = Math.max(1, Math.floor(dmgFinal * (_passiva.curaPctAtaque || 0.07)));
          bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + _siuHealNormal);
          appendBattleLog(`🌑 Siu absorve ${_siuHealNormal} HP do próprio golpe.`, '#9050c0');
          showFloatingNumber('enemy', _siuHealNormal, 'heal');
        }
        // Passiva do Lorde das Sombras — drena 5% do HP atual do jogador todo turno + aumenta critico
        if (_passiva && _passiva.tipo === 'lorde_dreno') {
          const _dreno = Math.max(2, Math.floor(p.hp * (_passiva.drenoPct || 0.05)));
          p.hp = Math.max(1, p.hp - _dreno);
          _passiva.criticoBonus = (_passiva.criticoBonus || 0) + (_passiva.criticoStep || 0.05);
          appendBattleLog(`🌑 Dreno das Sombras! -${_dreno} HP drenado. Critico do Lorde +${Math.round((_passiva.criticoStep||0.05)*100)}%! (total: ${Math.round(_passiva.criticoBonus*100)}%)`, '#1aaf3a');
          showFloatingNumber('hero', _dreno, 'dmg');
        }
        flashDamage('hero');
        animHeroHit();

        // Contra-ataque ao defender (Reflexo de Escudo eleva chance para 28%)
        const counterChance = p._talent_counter_up ? 0.28 : BATTLE_CONFIG.COUNTER_CHANCE;
        if (bs.defending && Math.random() < counterChance) {
          const cDmg = Math.max(1, Math.floor(p.atk * 0.6 + Math.random() * 4));
          bs.enemyHp -= cDmg;
          appendBattleLog(`⚡ CONTRA-ATAQUE! -${cDmg} HP ao ${e.name}!`, '#ffcc40');
          showFloatingNumber('enemy', cDmg, 'crit');
          flashDamage('enemy');
        }
        bs.defending = false;
      }

      updateHUD();
      updateBattleHUD();
      buildStatusBadges();

      // Verificar se inimigo morreu (contra-ataque)
      if (bs.enemyHp <= 0) {
        setTimeout(() => endBattle(true, false), 400);
        return;
      }

      if (p.hp <= 0) {
        p.hp = 0; setTimeout(() => endBattle(false, false), 500);
      } else {
        bs.phase = 'player';
        if (typeof applyTalentTurnStart === 'function') applyTalentTurnStart(bs);
        setBattleButtons(true);
        buildSkillList();
        updateBattleHUD();
        updateBattleTurnIndicator('player');
        setHeroAnim('idle'); // volta ao idle no início do turno do jogador
      }
    }, 300);
  }
}

// ── Pré-carrega imagens de sprite para evitar pisca na troca de frames ──
function _preloadSpriteImages() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite || cls.sprite.type !== 'images') return;
  Object.values(cls.sprite.images).forEach(src => {
    if (src) { const img = new Image(); img.src = src; }
  });
}

// ── IDs dos timers de animação — evita acúmulo ao clicar rápido ──
const _heroAnimTimers = [];
function _clearHeroAnimTimers() {
  _heroAnimTimers.forEach(id => clearTimeout(id));
  _heroAnimTimers.length = 0;
}

// ── Animações de sprite ──
function animHeroAttack() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return;

  // Cancela qualquer animação anterior ainda em andamento
  _clearHeroAnimTimers();

  if (cls.sprite.type === 'images') {
    const el = document.getElementById('bat-hero-icon');

    if (cls.id === 'paladino') {
      // frame 1: prepare
      setHeroAnim('prepare');
      if (el) { el.style.transition = ''; el.style.transform = 'translateX(0px)'; }

      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('attack');
        if (el) { el.style.transition = 'transform 0.2s ease-in'; el.style.transform = 'translateX(18px)'; }
      }, 230));

      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('prepare');
        if (el) { el.style.transition = 'transform 0.18s ease-out'; el.style.transform = 'translateX(6px)'; }
      }, 530));

      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('idle');
        if (el) { el.style.transition = 'transform 0.22s ease-out'; el.style.transform = 'translateX(0px)'; }
      }, 870));

      _heroAnimTimers.push(setTimeout(() => {
        if (el) { el.style.transition = ''; el.style.transform = ''; }
      }, 1100));
      return;
    }

    // Mago e outras classes com type:images
    setHeroAnim('prepare');
    _heroAnimTimers.push(setTimeout(() => setHeroAnim('attack'), 220));
    _heroAnimTimers.push(setTimeout(() => setHeroAnim('tak'),    520));
    _heroAnimTimers.push(setTimeout(() => setHeroAnim('idle'),   900));
    return;
  }

  setHeroAnim('prepare');
  _heroAnimTimers.push(setTimeout(() => setHeroAnim('attack'),  220));
  _heroAnimTimers.push(setTimeout(() => setHeroAnim('recover'), 850));
  _heroAnimTimers.push(setTimeout(() => setHeroAnim('idle'),    1150));
}

function animHeroHit() {
  // Apenas o flash visual indica o dano — sem troca de spritesheet ao receber dano
  // A animação de defesa só ocorre ao apertar o botão Defender (animHeroDefend)
}

function animHeroDefend() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return;
  // Usa sheetDef.png (cols 1→2) — só chamada ao apertar botão Defender
  setHeroAnim('defend');
  // Mantém a pose de defesa até o inimigo atacar; volta ao idle no próximo turno do jogador
}

function animEnemyHit() {
  if (!G.currentEnemy || !G.currentEnemy.sprite) return;
  const batIcon = document.getElementById('bat-enemy-icon');
  batIcon.innerHTML = buildEnemyVisual(G.currentEnemy, 160, 'run');
  setTimeout(() => {
    if (G.currentEnemy && G.currentEnemy.sprite)
      batIcon.innerHTML = buildEnemyVisual(G.currentEnemy, 160, 'idle');
  }, 500);
}

function animEnemyAttack() {
  if (!G.currentEnemy || !G.currentEnemy.sprite) return;
  const batIcon = document.getElementById('bat-enemy-icon');
  const sceneEl = document.getElementById('scene-enemy');
  batIcon.innerHTML = buildEnemyVisual(G.currentEnemy, 160, 'attack');
  if (sceneEl && sceneEl.style.display !== 'none')
    sceneEl.innerHTML = buildEnemyVisual(G.currentEnemy, 150, 'attack');
  setTimeout(() => {
    if (G.currentEnemy && G.currentEnemy.sprite) {
      batIcon.innerHTML = buildEnemyVisual(G.currentEnemy, 160, 'idle');
      if (sceneEl && sceneEl.style.display !== 'none')
        sceneEl.innerHTML = buildEnemyVisual(G.currentEnemy, 150, 'idle');
    }
  }, 700);
}


function endBattle(won, fled) {
  G.inBattle = false;
  document.getElementById('battle-overlay').classList.remove('active');
  if (typeof clearLuaBattleAmbience === 'function') clearLuaBattleAmbience();
  if (typeof clearLuaCheiaInvestida === 'function') clearLuaCheiaInvestida(G.player);
  const _lciOverlay = document.getElementById('lua-cheia-investida-overlay');
  if (_lciOverlay) _lciOverlay.remove();
  hideEnemy();

  const enemy = battleState.enemyData;
  const bs    = battleState;

  if (won) {
    G.player.gold += enemy.gold;
    G.player.kills = (G.player.kills || 0) + 1;
    G.player.xp   += enemy.xp;
    G.enemiesDefeated = (G.enemiesDefeated || 0) + 1;
    if (window.QuestBoard) QuestBoard.onBattleWon(enemy, G.location);
    addLog(`Vitória! +${enemy.xp}XP +${enemy.gold}◈`, 'xp');
    notify(`⚔ Vitória! +${enemy.xp} XP`, 'purple');
    notify(`◈ +${enemy.gold} moedas!`, 'gold');

    // Pontos de Talento disponíveis após ganhar XP
    const ptDisp = typeof getAvailablePT === 'function' ? getAvailablePT() : 0;
    if (ptDisp > 0) notify(`✦ ${ptDisp} Ponto(s) de Talento disponíveis!`, 'gold');

    // Loot padrão
    if (enemy.loot) {
      enemy.loot.forEach(l => {
        if (Math.random() < l.chance) {
          // BUG-LOOT FIX: inclui imgSrc para itens com imagem (ex: Erva Medicinal)
          addItem({ id:l.id, name:l.name, icon:l.icon, imgSrc:l.imgSrc||null, weight:l.weight||0.5, qty:1, desc:l.desc||'', type:l.type||'material' });
          notify(`🎁 ${l.icon} ${l.name} obtido!`, 'gold');
        }
      });
    }

    // Hooks de talentos na vitória
    if (typeof applyTalentOnVictory === 'function') applyTalentOnVictory(enemy, bs);

    // Punho do Dragão: cura extra se matou
    if (G.player._talent_dragon_fist) {
      const h = Math.floor(G.player.maxHp * 0.30);
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + h);
      G.player.mp = Math.min(G.player.maxMp, G.player.mp + Math.floor(G.player.maxMp * 0.30));
      notify(`🐉 Punho do Dragão: +${h} HP e MP restaurado!`, 'green');
    }

    // Boss — Tierra
    if (enemy.id === 'tierra' || enemy.name === 'Tierra — Guardião da Floresta') {
      G.dogDefeated = true;
      const classId = (G.player.classData && G.player.classData.id) || '';
      let buffMsg = '';
      let logMsg  = '';

      if (classId === 'paladino') {
        G.player.def    += 10;
        G.player.maxHp  += 20;
        G.player.hp      = Math.min(G.player.hp + 20, G.player.maxHp);
        buffMsg = '🌿 Tierra derrotado! A floresta reconhece sua fé — DEF +10 e HP Máx +20!';
        logMsg  = '✦ Amuleto de Tierra: DEF+10 e HP Máx+20 (Paladino)';
      } else if (classId === 'assassino') {
        G.player.spd    += 8;
        G.player.atk    += 5;
        buffMsg = '🌿 Tierra derrotado! A floresta abraça sua sombra — VEL +8 e ATQ +5!';
        logMsg  = '✦ Amuleto de Tierra: VEL+8 e ATQ+5 (Assassino)';
      } else if (classId === 'mago') {
        G.player.mag    += 8;
        G.player.maxMp  = (G.player.maxMp || 100) + 30;
        G.player.mp      = Math.min((G.player.mp || 0) + 30, G.player.maxMp);
        buffMsg = '🌿 Tierra derrotado! A essência da floresta flui em você — MAG +8 e MP Máx +30!';
        logMsg  = '✦ Amuleto de Tierra: MAG+8 e MP Máx+30 (Mago)';
      } else if (classId === 'arqueiro') {
        G.player.atk    += 7;
        G.player.spd    += 5;
        buffMsg = '🌿 Tierra derrotado! O vento da floresta guia suas flechas — ATQ +7 e VEL +5!';
        logMsg  = '✦ Amuleto de Tierra: ATQ+7 e VEL+5 (Arqueiro)';
      } else {
        // Fallback genérico
        G.player.def    += 10;
        buffMsg = '🌿 Tierra derrotado! DEF +10 permanente!';
        logMsg  = '✦ Amuleto de Tierra: DEF+10';
      }

      // Adiciona amuleto à bolsa — apenas uma vez
      const jaTemAmuleto = G.player.inventory && G.player.inventory.some(i => i.id === 'coleira_tierra');
      if (!jaTemAmuleto) {
        const amuStats = { id:'coleira_tierra', name:'Amuleto de Tierra', icon:'🌿',
          imgSrc:'Imagens/icones/materiais/amuleto_roxo.png',
          qty:1, weight:0.5, type:'equipamento', equipSlot:'acessorio', equipped:true,
          _accBonusApplied: true, // boss já aplicou os bônus diretamente em p.atk/def/etc
          desc:'Amuleto de folhas e pedra viva. Bônus permanente concedido pela floresta de Clivor.' };

        if      (classId === 'mago')     { amuStats.mag = 8; amuStats.mp = 30; }
        else if (classId === 'paladino') { amuStats.def = 10; amuStats.hp = 20; }
        else if (classId === 'assassino'){ amuStats.spd = 8; amuStats.atk = 5; }
        else if (classId === 'arqueiro') { amuStats.atk = 7; amuStats.spd = 5; }
        else                             { amuStats.def = 10; }

        G.player.inventory = G.player.inventory || [];
        G.player.inventory.push(amuStats);
        notify(buffMsg + ' Amuleto de Tierra obtido!', 'gold');
        addLog(logMsg + ' 🌿 Amuleto de Tierra adicionado!', 'xp');
      } else {
        notify(buffMsg, 'gold');
        addLog(logMsg, 'xp');
      }
    }

    updateHUD();
    buildInventoryGrid();
    checkLevelUp();

    setTimeout(() => {
      // Dungeon callback customizado (ex: Dungeon das Sombras)
      if (G._dungeonBattleCallback) {
        const cb = G._dungeonBattleCallback;
        G._dungeonBattleCallback = null;
        cb(enemy);
        return;
      }
      // BUG-DS FIX: se estiver numa cena de dungeon e o callback foi consumido
      // (ex: endBattle chamado duas vezes por status-tick + golpe final),
      // não chamar storyNode_afterBattle — usar o resumeCallback pendente se existir
      if (G.location && G.location.startsWith('dungeon-')) {
        if (G._dungeonResumeCallback) {
          const rcb = G._dungeonResumeCallback;
          G._dungeonResumeCallback = null;
          rcb(enemy);
          return;
        }
        // Sem callback e sem resume — apenas avisa, não redireciona para floresta
        addLog('⚠ Callback de dungeon perdido. Use os botões de navegação.', 'info');
        return;
      }
      if (enemy.id === 'tierra' || enemy.name === 'Tierra — Guardião da Floresta') storyNode_vitoriaBoss();
      else storyNode_afterBattle(enemy);
    }, 500);

  } else if (fled) {
    // Talentos de fuga (Fumaça: cura 20% HP)
    if (G.player._talent_smoke) {
      const h = Math.floor(G.player.maxHp * 0.20);
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + h);
      notify(`💨 Fumaça: +${h} HP ao fugir!`, 'green');
    }
    notify('💨 Fugiu da batalha.', 'gold');
    updateHUD();
    setTimeout(() => storyNode_floresta(), 300);

  } else {
    // Lich Menor: ressurreição
    if (G.player._talent_phylactery && !bs._phylactery_used) {
      bs._phylactery_used = true;
      G.player.hp = Math.floor(G.player.maxHp * 0.25);
      G.player.mp = G.player.maxMp;
      G.inBattle = true;
      document.getElementById('battle-overlay').classList.add('active');
      if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
      updateHUD(); updateBattleHUD();
      appendBattleLog('💀 LICH MENOR! Você ressuscita das cinzas com 25% HP!', '#9040e0');
      notify('💀 Lich Menor: Ressurreição!', 'purple');
      battleState.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      return;
    }

    // Ressurreição do Paladino
    if (G.player._talent_resurrection && !bs._resurrection_used) {
      bs._resurrection_used = true;
      G.player.hp = Math.floor(G.player.maxHp * 0.40);
      G.inBattle = true;
      document.getElementById('battle-overlay').classList.add('active');
      if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
      updateHUD(); updateBattleHUD();
      appendBattleLog('🕊️ RESSURREIÇÃO! Você retorna da morte com 40% HP!', '#c8960a');
      notify('🕊️ Ressurreição Divina!', 'gold');
      battleState.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      return;
    }

    // Imortalidade Furiosa (Berserker)
    if (G.player._talent_undying && !bs._undying_used) {
      bs._undying_used = true;
      G.player.hp = Math.max(1, Math.floor(G.player.maxHp * 0.25));
      G.inBattle = true;
      document.getElementById('battle-overlay').classList.add('active');
      if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
      updateHUD(); updateBattleHUD();
      appendBattleLog('💀 IMORTALIDADE FURIOSA! Sobreviveu com 1 HP — cura 25% HP!', '#c05020');
      notify('💀 Imortalidade Furiosa!', 'red');
      battleState.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      return;
    }

    // Derrota padrão
    G.player.deaths = (G.player.deaths || 0) + 1;
    const lostGold = Math.floor(G.player.gold * 0.25);
    G.player.hp   = Math.floor(G.player.maxHp * 0.5);
    G.player.gold = Math.floor(G.player.gold * 0.75);
    updateHUD();
    addLog('💀 Derrota... você acorda enfraquecido.', 'dmg');
    notify('💀 Derrotado!', 'red');

    // ── Estatísticas da run ──
    const runTurns    = bs.turn || 0;
    const runDmgDealt = bs.totalDmgDealt || 0;
    const runKills    = G.player.kills || 0;
    const enemyName   = enemy ? (enemy.name || 'Inimigo') : 'Inimigo';
    const playerLv    = G.player.level || 1;

    // ── Dica contextual baseada na situação ──
    const _defeatTips = [];
    if (runDmgDealt < 30)  _defeatTips.push('💡 Seu dano está baixo — invista em ATQ ou MAG nos talentos antes de entrar na dungeon.');
    if (runTurns <= 3)     _defeatTips.push('💡 Você caiu muito rápido! Suba de nível ou equipe itens de DEF antes de continuar.');
    if (playerLv < 5)      _defeatTips.push(`💡 Nível ${playerLv} ainda é baixo para essa área — chegue ao nível ${playerLv + 2} e tente de novo.`);
    if (lostGold > 0)      _defeatTips.push(`💡 Perdeu ${lostGold} moedas — compre poções na taverna antes de entrar para não perder tanto.`);
    if (runTurns > 8)      _defeatTips.push('💡 Você aguentou bastante! Equipe uma habilidade de cura ou use poções no momento certo.');
    if (_defeatTips.length === 0) _defeatTips.push('💡 Cada derrota ensina algo. Revise seus talentos e tente uma estratégia diferente!');
    const _defeatTip = _defeatTips[Math.floor(Math.random() * _defeatTips.length)];

    // ── Avaliação de desempenho ──
    let _avaliacao = '';
    if (runTurns >= 12)      _avaliacao = '⭐⭐⭐ Chegou longe! Estava quase lá.';
    else if (runTurns >= 6)  _avaliacao = '⭐⭐ Bom esforço — mais alguns níveis e você passa!';
    else if (runTurns >= 3)  _avaliacao = '⭐ Precisa se preparar melhor antes da dungeon.';
    else                     _avaliacao = '💀 Caiu na primeira investida — reforce seus atributos!';

    setTimeout(() => {
      setStory('NARRADOR',
        `Você cai diante de ${enemyName}. A escuridão te engole por um instante...\n\n` +
        `━━━━ RESUMO DA DERROTA ━━━━\n` +
        `⚔  Inimigo que te derrotou: ${enemyName}\n` +
        `🔄  Turnos sobrevividos: ${runTurns}\n` +
        `💥  Dano total causado: ${runDmgDealt}\n` +
        `💀  Inimigos abatidos (total): ${runKills}\n` +
        `📉  Moedas perdidas: ${lostGold}\n` +
        `🎯  Avaliação: ${_avaliacao}\n\n` +
        `${_defeatTip}\n\n` +
        `Você acorda enfraquecido na beira da floresta. Mas Clivor ainda precisa de você.`,
        [{ icon:'↩', text:'Levantar e continuar', action: storyNode_floresta }]
      );
    }, 400);
  }
}


// ─────────────────────────────────────────────────────────────
//  LEVEL UP OVERLAY + SFX
// ─────────────────────────────────────────────────────────────
function playSfxLevelUp() {
  const el = document.getElementById('sfx-levelup');
  if (!el) return;
  if (window.AudioSys && window.AudioSys.sfxMuted) return;
  const vol = (window.AudioSys && window.AudioSys.sfxVolume != null) ? window.AudioSys.sfxVolume : 0.8;
  el.volume = Math.min(1, vol);
  try { el.pause(); el.currentTime = 0; } catch(e) {}
  el.play().catch(() => {});
}

// ── Som de toque: pool de instâncias para tocar instantaneamente,
//    sem o atraso de "rebobinar" (currentTime=0) uma <audio> já em uso ──
const TAP_SOUND_SRC = 'musicas/STUDO/liecio-menu_beep_short_snap-533778.mp3';
const _tapSoundPool = [];
let _tapPoolIdx = 0;
function _initTapSoundPool() {
  for (let i = 0; i < 5; i++) {
    const a = new Audio(TAP_SOUND_SRC);
    a.preload = 'auto';
    try { a.load(); } catch (e) {}
    _tapSoundPool.push(a);
  }
}
function playTapSound() {
  if (CONFIG.tapSound === false) return;
  if (window.AudioSys && AudioSys.sfxMuted) return;
  if (_tapSoundPool.length === 0) _initTapSoundPool();
  const a = _tapSoundPool[_tapPoolIdx];
  _tapPoolIdx = (_tapPoolIdx + 1) % _tapSoundPool.length;
  const vol = (window.AudioSys && AudioSys.sfxVolume != null) ? AudioSys.sfxVolume : 0.8;
  a.volume = Math.min(1, vol);
  if (!a.paused) { try { a.pause(); } catch (e) {} }
  try { a.currentTime = 0; } catch (e) {}
  a.play().catch(() => {});
}
window.playTapSound = playTapSound;

// ── Helper genérico de SFX ──
function _playSfxById(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.AudioSys && window.AudioSys.sfxMuted) return;
  const vol = (window.AudioSys && window.AudioSys.sfxVolume != null) ? window.AudioSys.sfxVolume : 0.8;
  el.volume = Math.min(1, vol);
  el.currentTime = 0;
  el.play().catch(() => {});
}

function playSfxFlecha()      { _playSfxById('sfx-flecha'); }
function playSfxMagoBase()    { _playSfxById('sfx-mago-base'); }
function playSfxMagoAgua()    { _playSfxById('sfx-mago-agua'); }
function playSfxMagoFogo()    { _playSfxById('sfx-mago-fogo'); }
function playSfxMagoEletric() { _playSfxById('sfx-mago-eletric'); }

function showLevelUpOverlay(level, statsStr, ptMsg) {
  const overlay = document.getElementById('levelup-overlay');
  const lvEl    = document.getElementById('levelup-level');
  const stEl    = document.getElementById('levelup-stats');
  const parEl   = document.getElementById('levelup-particles');
  if (!overlay) return;

  // Preenche texto
  lvEl.textContent  = `Nível ${level}`;
  stEl.textContent  = statsStr + (ptMsg || '');
  parEl.innerHTML   = '';

  // Partículas (estrelinhas espalhando)
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('div');
    s.className = 'lu-star';
    const angle = Math.random() * 360;
    const dist  = 80 + Math.random() * 200;
    const tx    = Math.round(Math.cos(angle * Math.PI / 180) * dist);
    const ty    = Math.round(Math.sin(angle * Math.PI / 180) * dist);
    s.style.cssText = `
      left: calc(50% + ${(Math.random()-0.5)*60}px);
      top:  calc(50% + ${(Math.random()-0.5)*60}px);
      --tx: ${tx}px; --ty: ${ty}px;
      --dur: ${0.7 + Math.random()*0.8}s;
      --delay: ${Math.random()*0.4}s;
    `;
    parEl.appendChild(s);
  }

  // Toca o som
  playSfxLevelUp();
  // Vibração de celebração no level up
  if (CONFIG.vibration && navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 120]);

  // Mostra overlay
  overlay.style.display = 'block';

  // Fecha após 2.2s
  clearTimeout(overlay._luTimer);
  overlay._luTimer = setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '';
      overlay.style.transition = '';
    }, 420);
  }, 2200);
}

function checkLevelUp() {
  const p = G.player;
  while (p.xp >= p.xpNext && p.level < LEVEL_MAX) {
    p.xp    -= p.xpNext;
    p.level += 1;
    p.xpNext = Math.floor(XP_BASE * Math.pow(XP_GROWTH, p.level - 1));

    const cls = p.classData;
    const isWarrior = cls && ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));
    const isMagical  = cls && ['mago','monge'].includes(cls.id);

    // ── Stats base por nível ──
    const isPaladino = cls && cls.id === 'paladino';
    const hpGain = isPaladino ? 15 : 12;
    p.maxHp += hpGain;
    p.hp = Math.min(p.maxHp, p.hp + hpGain);

    if (cls) {
      p.atk += isPaladino ? 1 : 2;   // Paladino cresce menos em ATQ...
      p.def += isPaladino ? 2 : 1;   // ...e mais em DEF
      p.spd += 1;
      if (isMagical) {
        p.maxMp += 8; p.mp = Math.min(p.maxMp, p.mp + 8);
        p.mag += 2;
      }
      if (isWarrior) {
        p.maxAp = Math.min(200, (p.maxAp || 100) + 5);
      }
    }

    // ── Pontos de Talento ──
    p.talentPtTotal = (p.talentPtTotal || 0) + PT_PER_LEVEL;
    const ptAvail = getAvailablePT();

    updateHUD();

    // ── Mensagem detalhada ──
    const ptMsg = ptAvail > 0 ? ` · ${ptAvail} PT disponíveis!` : '';
    const levelStats = isPaladino
      ? `HP+15, ATQ+1, DEF+2, VEL+1`
      : `HP+12, ATQ+2, DEF+1, VEL+1${isMagical?' MAG+2 MP+8':''}`;
    notify(`🌟 LEVEL UP! LV ${p.level} — +2PT Talentos${ptMsg}`, 'gold');
    addLog(`🌟 LV ${p.level} — ${levelStats}${ptMsg}`, 'xp');
    showLevelUpOverlay(p.level, levelStats, ptMsg);

    // ── Milestones de nível ──
    if (p.level === 2 && !G.dogDefeated) {
      setTimeout(() => notify('⚠ 🌿 Tierra, o Guardião da Floresta, desperta...', 'red'), 1000);
    }
    if (p.level === 2 && cls && cls.id === 'mago') {
      setTimeout(() => notify('📜 Você recebeu o Pergaminho do Guia Elemental! Veja na Bolsa.', 'gold'), 2800);
    }
    if (p.level === 7) {
      setTimeout(() => notify('✦ TIER II desbloqueado! Novos talentos disponíveis!', 'gold'), 1200);
    }
    if (p.level === 14) {
      setTimeout(() => notify('✦✦ TIER III desbloqueado! Talentos de Maestria!', 'gold'), 1200);
    }
    if (p.level === LEVEL_MAX) {
      notify('👑 NÍVEL MÁXIMO ATINGIDO!', 'gold');
    }

    // ── Abre árvore de talentos automaticamente no 1º level up ──
    if (p.level === 2) {
      setTimeout(() => {
        // Não abrir talentTree dentro de dungeon para não interromper o fluxo
        const emDungeon = G.location && G.location.startsWith('dungeon-');
        if (!emDungeon && typeof openTalentTree === 'function') openTalentTree();
      }, 1800);
    }
  }

  // Se já no nível máximo, travamos o XP
  if (p.level >= LEVEL_MAX) {
    p.xp = p.xpNext;
  }

  if (window.QuestBoard) QuestBoard.onLevelChanged();
}

// ─────────────────────────────────────────────────────────────
//  16. BAG (BOLSA)
// ─────────────────────────────────────────────────────────────
function _consolidateInventory() {
  const merged = {};
  G.player.inventory.forEach(item => {
    if (merged[item.id]) {
      merged[item.id].qty = (merged[item.id].qty || 1) + (item.qty || 1);
    } else {
      merged[item.id] = { ...item, qty: item.qty || 1 };
    }
  });
  G.player.inventory = Object.values(merged);
}

function openBag() {
  _consolidateInventory();
  buildBagItems();
  buildBagStatus();
  // Aba Livro: só aparece para o Mago a partir do LV 4
  const tabLivro = document.getElementById('btab-livro');
  if (tabLivro) {
    const isMago = G.player && G.player.classData && G.player.classData.id === 'mago';
    const livroDesbloqueado = isMago && (G.player.level || 1) >= 4;
    tabLivro.style.display = isMago ? '' : 'none';
    tabLivro.style.opacity = livroDesbloqueado ? '1' : '0.35';
    tabLivro.style.pointerEvents = livroDesbloqueado ? '' : 'none';
    tabLivro.title = livroDesbloqueado ? '' : 'Desbloqueado no LV 4';
    // Atualiza texto do botão com indicação de lock
    if (isMago && !livroDesbloqueado) {
      tabLivro.innerHTML = '🔒 Livro';
    } else if (isMago) {
      tabLivro.innerHTML = '📖 Livro';
    }
  }
  // Aba Guia Elemental: só aparece para o Mago a partir do LV 2
  const tabGuia = document.getElementById('btab-guia');
  if (tabGuia) {
    const isMagoGuia = G.player && G.player.classData && G.player.classData.id === 'mago';
    const guiaDesbloqueado = isMagoGuia && (G.player.level || 1) >= 2;
    tabGuia.style.display = isMagoGuia ? '' : 'none';
    tabGuia.style.opacity = guiaDesbloqueado ? '1' : '0.35';
    tabGuia.style.pointerEvents = guiaDesbloqueado ? '' : 'none';
    tabGuia.title = guiaDesbloqueado ? '' : 'Desbloqueado no LV 2';
    if (isMagoGuia && !guiaDesbloqueado) {
      tabGuia.innerHTML = '🔒 Guia';
    } else if (isMagoGuia) {
      tabGuia.innerHTML = '📜 Guia';
    }
  }

  document.getElementById('bag-overlay').style.display = 'flex';
}

function closeBag() {
  document.getElementById('bag-overlay').style.display = 'none';
}

function switchBagTab(tab) {
  document.querySelectorAll('.bag-tab').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('btab-' + tab);
  if (activeBtn) activeBtn.classList.add('active');
  document.getElementById('bag-content-items').style.display  = tab === 'items'  ? '' : 'none';
  document.getElementById('bag-content-craft').style.display  = tab === 'craft'  ? '' : 'none';
  document.getElementById('bag-content-status').style.display = tab === 'status' ? '' : 'none';
  const livroEl = document.getElementById('bag-content-livro');
  if (livroEl) livroEl.style.display = tab === 'livro' ? '' : 'none';
  const flechasEl = document.getElementById('bag-content-flechas');
  if (flechasEl) flechasEl.style.display = tab === 'flechas' ? '' : 'none';
  const guiaEl = document.getElementById('bag-content-guia');
  if (guiaEl) guiaEl.style.display = tab === 'guia' ? '' : 'none';
  if (tab === 'craft') buildCraftList();
  if (tab === 'flechas') buildArrowBagTab();
}

// ─────────────────────────────────────────────────────────────
//  SISTEMA DE CRAFT
// ─────────────────────────────────────────────────────────────
const CRAFT_RECIPES = [
  {
    id: 'pocao_p',
    name: 'Poção Pequena',
    desc: 'Restaura 25 HP.',
    effect: '+25 HP',
    img: 'Imagens/cosméticos/Poção.png',
    icon: '🧪',
    cost: [ { id: 'erva_cura', name: 'Erva Medicinal', qty: 2, icon: '🌿' } ],
    result: { id: 'pocao_pequena', name: 'Poção Pequena', icon: '🧪', imgSrc: 'Imagens/cosméticos/Poção.png', type: 'consumível', desc: 'Restaura 25 HP.', heal: 25 },
    level: 1,
  },
  {
    id: 'pocao_m',
    name: 'Poção Média',
    desc: 'Restaura 60 HP.',
    effect: '+60 HP',
    img: 'Imagens/cosméticos/PoçãoM.png',
    icon: '🫙',
    cost: [
      { id: 'erva_cura', name: 'Erva Medicinal', qty: 4, icon: '🌿' },
      { id: 'pedra',      name: 'Pedra',          qty: 1, icon: '🪨' },
    ],
    result: { id: 'pocao_media', name: 'Poção Média', icon: '🫙', imgSrc: 'Imagens/cosméticos/PoçãoM.png', type: 'consumível', desc: 'Restaura 60 HP.', heal: 60 },
    level: 2,
  },
  {
    id: 'pocao_g',
    name: 'Poção Grande',
    desc: 'Restaura 120 HP. Rara de fabricar.',
    effect: '+120 HP',
    img: 'Imagens/cosméticos/PoçãoG.png',
    icon: '⚗️',
    cost: [
      { id: 'erva_cura', name: 'Erva Medicinal', qty: 7, icon: '🌿' },
      { id: 'pedra',      name: 'Pedra',          qty: 3, icon: '🪨' },
    ],
    result: { id: 'pocao_grande', name: 'Poção Grande', icon: '⚗️', imgSrc: 'Imagens/cosméticos/PoçãoG.png', type: 'consumível', desc: 'Restaura 120 HP.', heal: 120 },
    level: 3,
  },
  {
    id: 'pocao_mp_p',
    name: 'Poção de MP',
    desc: 'Restaura 25 MP.',
    effect: '+25 MP',
    img: 'Imagens/cosméticos/MP.png',
    icon: '🔵',
    cost: [
      { id: 'erva_cura',  name: 'Erva Medicinal', qty: 2, icon: '🌿' },
      { id: 'po_cristal', name: 'Pó de Cristal',  qty: 1, icon: '💎' },
    ],
    result: { id: 'pocao_mp_p', name: 'Poção de MP', icon: '🔵', imgSrc: 'Imagens/cosméticos/MP.png', type: 'consumível', desc: 'Restaura 25 MP.', restoreMP: 25 },
    level: 1,
  },
  {
    id: 'aaur_elixir',
    name: 'Elixir de MP',
    desc: 'Restaura 50 MP.',
    effect: '+50 MP',
    img: 'Imagens/cosméticos/aaur.png',
    icon: '💙',
    cost: [
      { id: 'erva_cura', name: 'Erva Medicinal', qty: 3, icon: '🌿' },
      { id: 'pedra',      name: 'Pedra',          qty: 2, icon: '🪨' },
    ],
    result: { id: 'aaur_elixir', name: 'Elixir de MP', icon: '💙', imgSrc: 'Imagens/cosméticos/aaur.png', type: 'consumível', desc: 'Restaura 50 MP.', restoreMP: 50 },
    level: 2,
  },
];

function _getItemQty(id) {
  return G.player.inventory
    .filter(i => i.id === id)
    .reduce((sum, i) => sum + (i.qty || 1), 0);
}

function buildCraftList() {
  const list = document.getElementById('bag-craft-list');
  if (!list) return;
  list.innerHTML = '';

  // Mostra materiais disponíveis no topo
  const ervas  = _getItemQty('erva_cura');
  const pedras = _getItemQty('pedra');
  const matDiv = document.createElement('div');
  matDiv.style.cssText = 'display:flex;gap:14px;padding:8px 10px;background:rgba(200,150,10,0.05);border:1px solid rgba(200,150,10,0.1);margin-bottom:10px;font-size:0.7rem;font-family:"Noto Sans JP",sans-serif;color:rgba(200,150,10,0.6);';
  matDiv.innerHTML = `
    <span>🌿 Ervas: <strong style="color:${ervas>0?'#80c060':'#c06040'}">${ervas}</strong></span>
    <span>🪨 Pedras: <strong style="color:${pedras>0?'#80c060':'#c06040'}">${pedras}</strong></span>
  `;
  list.appendChild(matDiv);

  CRAFT_RECIPES.forEach(recipe => {
    const canCraft = recipe.cost.every(c => _getItemQty(c.id) >= c.qty);

    const card = document.createElement('div');
    card.className = 'craft-recipe' + (canCraft ? '' : ' locked');

    const costHtml = recipe.cost.map(c => {
      const have = _getItemQty(c.id);
      const ok = have >= c.qty;
      return `<span class="${ok?'ok':'bad'}">${c.icon} ${c.name} ×${c.qty} (${have}/${c.qty})</span>`;
    }).join('  ');

    const levelStars = '★'.repeat(recipe.level) + '☆'.repeat(3 - recipe.level);

    card.innerHTML = `
      <img class="craft-recipe-img" src="${recipe.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span style="display:none;width:44px;height:44px;font-size:1.8rem;align-items:center;justify-content:center;">${recipe.icon}</span>
      <div class="craft-recipe-info">
        <div class="craft-recipe-name">${recipe.name} <span style="color:rgba(200,150,10,0.4);font-size:0.6rem;">${levelStars}</span></div>
        <div class="craft-recipe-cost">${costHtml}</div>
        <div class="craft-recipe-effect">✦ ${recipe.effect}</div>
      </div>
      <button class="craft-btn" ${canCraft?'':'disabled'} onclick="doCraft('${recipe.id}')">
        ${canCraft ? 'Criar' : 'Falta\nmaterial'}
      </button>
    `;
    list.appendChild(card);
  });
}

function doCraft(recipeId) {
  const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  // Verifica materiais
  for (const c of recipe.cost) {
    if (_getItemQty(c.id) < c.qty) {
      notify('Materiais insuficientes!', 'red'); return;
    }
  }

  // Consome materiais
  for (const c of recipe.cost) {
    let remaining = c.qty;
    G.player.inventory = G.player.inventory.map(item => {
      if (item.id === c.id && remaining > 0) {
        const consume = Math.min(item.qty || 1, remaining);
        remaining -= consume;
        const newQty = (item.qty || 1) - consume;
        return newQty <= 0 ? null : { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean);
  }

  // Adiciona item craftado
  const result = { ...recipe.result, qty: 1 };
  const existing = G.player.inventory.find(i => i.id === result.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    G.player.inventory.push(result);
  }

  notify(`✦ ${recipe.name} criada!`, 'gold');
  addLog(`🧪 Criou ${recipe.name}.`, 'xp');
  buildCraftList();
  buildBagItems();
}

function buildBagItems() {
  const container = document.getElementById('bag-item-list');
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:row;gap:0;max-height:58vh;overflow:hidden;';

  const inv = G.player.inventory;

  if (!inv.length) {
    container.style.cssText = 'display:flex;flex-direction:column;';
    container.innerHTML = '<div style="color:rgba(200,150,10,0.35);text-align:center;padding:32px 20px;font-size:0.82rem;font-style:italic;">Bolsa vazia.</div>';
    return;
  }

  // Consolida itens com mesmo id
  const consolidated = [];
  const seen = {};
  inv.forEach((item, i) => {
    const norm = _normalizeItem(item);
    if (seen[norm.id] !== undefined) {
      consolidated[seen[norm.id]].item.qty = (consolidated[seen[norm.id]].item.qty || 1) + (norm.qty || 1);
    } else {
      seen[norm.id] = consolidated.length;
      consolidated.push({ item: { ...norm, qty: norm.qty || 1 }, i });
    }
  });

  // Agrupa por tipo
  const groupOrder = ['equipamento', 'consumível', 'material', 'bau', 'chave', 'outro'];
  const groups = { 'equipamento': [], 'consumível': [], 'material': [], 'bau': [], 'chave': [], 'outro': [] };
  consolidated.forEach(({ item, i }) => {
    (groups[item.type] || groups['outro']).push({ item, i });
  });

  const typeLabel = { 'equipamento': '⚔ EQUIPAMENTOS', 'consumível': '✦ CONSUMÍVEIS', 'material': '📦 MATERIAIS', 'bau': '🎁 BAÚS', 'chave': '🗝️ CHAVES', 'outro': '✦ OUTROS' };
  const typeColor = { 'equipamento': '#c05020', 'consumível': '#3a8060', 'material': '#806030', 'bau': '#d4a017', 'chave': '#8090c0', 'outro': '#606080' };

  // ── COLUNA ESQUERDA: lista de ícones por seção ──
  const leftCol = document.createElement('div');
  leftCol.style.cssText = 'width:48%;min-width:0;overflow-y:auto;padding-right:6px;border-right:1px solid rgba(200,150,10,0.12);';

  // ── COLUNA DIREITA: painel de detalhe ──
  const rightCol = document.createElement('div');
  rightCol.id = 'bag-detail-panel';
  rightCol.style.cssText = 'flex:1;overflow-y:auto;padding-left:10px;display:flex;flex-direction:column;justify-content:center;align-items:center;';
  rightCol.innerHTML = `<div style="color:rgba(200,150,10,0.2);font-size:0.65rem;font-family:'Noto Sans JP',sans-serif;letter-spacing:2px;text-align:center;">Selecione um item</div>`;

  // Função que renderiza o detalhe no painel direito
  function showDetail(item, origIdx) {
    item = _resolveItemDesc(item); // descrição dinâmica para cajado
    const cor = typeColor[item.type] || typeColor['outro'];
    const statsStr = [];
    if (item.atk)  statsStr.push(`ATQ +${item.atk}`);
    if (item.def)  statsStr.push(`DEF +${item.def}`);
    if (item.mag)  statsStr.push(`MAG +${item.mag}`);
    if (item.spd)  statsStr.push(`VEL +${item.spd}`);
    if (item.heal) statsStr.push(`Cura +${item.heal} HP`);
    if (item.restoreMP) statsStr.push(`+${item.restoreMP} MP`);
    if (item.crit) statsStr.push(`Crítico +${item.crit}%`);
    if (item.hp)   statsStr.push(`HP Máx +${item.hp}`);
    if (item.mp)   statsStr.push(`MP Máx +${item.mp}`);

    const iconHtml = item.imgSrc
      ? `<img src="${item.imgSrc}" style="width:80px;height:80px;object-fit:contain;mix-blend-mode:screen;display:block;margin:0 auto 8px;" onerror="this.outerHTML='<div style=\\'font-size:3rem;text-align:center;margin-bottom:8px;\\'>${item.icon||'📦'}</div>'">`
      : `<div style="font-size:3rem;text-align:center;margin-bottom:8px;">${item.icon||'📦'}</div>`;

    const equippedBadge = item.equipped
      ? `<span style="color:#60c060;font-size:0.55rem;background:rgba(40,100,40,0.25);border:1px solid rgba(60,180,60,0.3);padding:1px 5px;margin-left:5px;vertical-align:middle;">EQUIPADO</span>` : '';

    const qtyBadge = (item.qty||1) > 1
      ? `<div style="color:rgba(200,150,10,0.5);font-size:0.65rem;margin-top:2px;">Qtd: ${item.qty}</div>` : '';

    let actionBtn = '';
    if (item.type === 'consumível') {
      actionBtn = `<button onclick="showItemPopup(${origIdx}, G.player.inventory[${origIdx}])" style="font-family:'Noto Serif JP',serif;font-size:0.65rem;padding:7px 14px;border:1px solid rgba(60,180,60,0.4);background:rgba(40,100,40,0.15);color:#70c070;cursor:pointer;width:100%;margin-top:8px;">✓ Usar</button>`;
    } else if (item.type === 'equipamento') {
      if (item.equipped) {
        actionBtn = `<button onclick="showItemPopup(${origIdx}, G.player.inventory[${origIdx}])" style="font-family:'Noto Serif JP',serif;font-size:0.65rem;padding:7px 14px;border:1px solid rgba(200,80,40,0.4);background:rgba(100,30,10,0.15);color:#e08060;cursor:pointer;width:100%;margin-top:8px;">✕ Desequipar</button>`;
      } else {
        actionBtn = `<button onclick="showItemPopup(${origIdx}, G.player.inventory[${origIdx}])" style="font-family:'Noto Serif JP',serif;font-size:0.65rem;padding:7px 14px;border:1px solid rgba(200,150,10,0.4);background:rgba(100,60,10,0.15);color:var(--gold2);cursor:pointer;width:100%;margin-top:8px;">⚔ Equipar</button>`;
      }
    } else if (item.type === 'bau') {
      actionBtn = `<button onclick="showItemPopup(${origIdx}, G.player.inventory[${origIdx}])" style="font-family:'Noto Serif JP',serif;font-size:0.65rem;padding:7px 14px;border:1px solid rgba(212,160,23,0.4);background:rgba(100,75,10,0.15);color:#d4a017;cursor:pointer;width:100%;margin-top:8px;">🔓 Abrir</button>`;
    } else {
      actionBtn = `<button onclick="showItemPopup(${origIdx}, G.player.inventory[${origIdx}])" style="font-family:'Noto Serif JP',serif;font-size:0.65rem;padding:7px 14px;border:1px solid rgba(200,150,10,0.15);background:transparent;color:rgba(200,150,10,0.4);cursor:pointer;width:100%;margin-top:8px;">Info</button>`;
    }

    rightCol.innerHTML = `
      <div style="width:100%;border-top:2px solid ${cor};padding-top:10px;">
        ${iconHtml}
        <div style="color:var(--gold2);font-family:'Noto Serif JP',serif;font-size:0.9rem;text-align:center;line-height:1.3;">${item.name}${equippedBadge}</div>
        ${qtyBadge}
        ${statsStr.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;justify-content:center;">
          ${statsStr.map(s=>`<span style="font-size:0.65rem;font-family:'Noto Sans JP',sans-serif;background:rgba(200,150,10,0.08);border:1px solid rgba(200,150,10,0.2);padding:2px 8px;color:rgba(200,150,10,0.8);">${s}</span>`).join('')}
        </div>` : ''}
        ${item.desc ? `<div style="color:rgba(242,232,208,0.45);font-style:italic;font-size:0.7rem;margin-top:8px;text-align:center;line-height:1.5;">${item.desc}</div>` : ''}
        ${item.weight ? `<div style="color:rgba(200,150,10,0.25);font-size:0.6rem;margin-top:6px;text-align:center;font-family:'Noto Sans JP',sans-serif;">⚖ Peso: ${item.weight} kg</div>` : ''}
        ${actionBtn}
      </div>
    `;
  }

  // Renderiza grupos na coluna esquerda
  let firstItem = null;
  let firstIdx = null;

  groupOrder.forEach(type => {
    const items = groups[type];
    if (!items.length) return;

    const header = document.createElement('div');
    header.style.cssText = `font-size:0.55rem;letter-spacing:2px;color:${typeColor[type]};font-family:'Noto Sans JP',sans-serif;padding:8px 2px 4px;border-bottom:1px solid ${typeColor[type]}33;margin-bottom:5px;`;
    header.textContent = typeLabel[type];
    leftCol.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:10px;';

    items.forEach(({ item, i }) => {
      if (!firstItem) { firstItem = item; firstIdx = i; }

      const slot = document.createElement('div');
      slot.style.cssText = `
        position:relative;aspect-ratio:1;
        background:rgba(255,255,255,0.025);
        border:1px solid rgba(200,150,10,0.12);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;transition:all 0.15s;
        border-radius:2px;overflow:hidden;
      `;

      const iconHtml = item.imgSrc
        ? `<img src="${item.imgSrc}" style="width:80%;height:80%;object-fit:contain;mix-blend-mode:screen;" onerror="this.outerHTML='<span style=\\'font-size:1.6rem;\\'>${item.icon||'📦'}</span>'">`
        : `<span style="font-size:1.6rem;">${item.icon||'📦'}</span>`;

      const eqBadge = item.equipped ? `<span style="position:absolute;top:2px;left:2px;font-size:0.45rem;color:#60c060;background:rgba(0,0,0,0.6);padding:1px 3px;">EQ</span>` : '';
      const qtyBadge = (item.qty||1) > 1 ? `<span style="position:absolute;bottom:2px;right:3px;font-size:0.5rem;color:rgba(200,150,10,0.7);font-family:'Noto Sans JP',sans-serif;">${item.qty}</span>` : '';

      slot.innerHTML = iconHtml + eqBadge + qtyBadge;

      slot.onmouseenter = () => { slot.style.borderColor = 'rgba(200,150,10,0.5)'; slot.style.background = 'rgba(200,150,10,0.06)'; };
      slot.onmouseleave = () => {
        if (!slot.classList.contains('selected')) {
          slot.style.borderColor = 'rgba(200,150,10,0.12)';
          slot.style.background = 'rgba(255,255,255,0.025)';
        }
      };
      slot.onclick = () => {
        leftCol.querySelectorAll('.bag-slot-selected').forEach(s => {
          s.classList.remove('bag-slot-selected');
          s.style.borderColor = 'rgba(200,150,10,0.12)';
          s.style.background = 'rgba(255,255,255,0.025)';
        });
        slot.classList.add('bag-slot-selected');
        slot.style.borderColor = `${typeColor[item.type]||'rgba(200,150,10,0.5)'}`;
        slot.style.background = 'rgba(200,150,10,0.08)';
        showDetail(item, i);
      };

      grid.appendChild(slot);
    });

    leftCol.appendChild(grid);
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);

  // Mostra o primeiro item automaticamente
  if (firstItem !== null) showDetail(firstItem, firstIdx);
}

// ── Modo Grade da bolsa ──
function buildBagItemsGrade() {
  const list = document.getElementById('bag-item-list');
  list.innerHTML = '';
  const inv = G.player.inventory;
  if (!inv.length) {
    list.innerHTML = '<div style="color:rgba(200,150,10,0.35);text-align:center;padding:32px 20px;font-size:0.82rem;font-style:italic;">Bolsa vazia.</div>';
    return;
  }

  const groups = { 'equipamento': [], 'consumível': [], 'material': [], 'bau': [], 'chave': [], 'outro': [] };
  inv.forEach((item, i) => { (groups[item.type] || groups['outro']).push({ item, i }); });

  const typeLabel = { 'equipamento': '⚔ EQUIPAMENTOS', 'consumível': '🧪 CONSUMÍVEIS', 'material': '📦 MATERIAIS', 'bau': '🎁 BAÚS', 'chave': '🗝️ CHAVES', 'outro': '✦ OUTROS' };
  const typeColor = { 'equipamento': '#c05020', 'consumível': '#3a8060', 'material': '#806030', 'bau': '#d4a017', 'chave': '#8090c0', 'outro': '#606080' };

  Object.entries(groups).forEach(([type, items]) => {
    if (!items.length) return;

    const header = document.createElement('div');
    header.style.cssText = `font-size:0.58rem;letter-spacing:2.5px;color:${typeColor[type]};font-family:'Noto Sans JP',sans-serif;padding:10px 2px 7px;border-bottom:1px solid ${typeColor[type]}33;margin-bottom:8px;`;
    header.textContent = typeLabel[type];
    list.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;`;

    items.forEach(({ item, i }) => {
      const cell = document.createElement('div');
      const isConsumivel = item.type === 'consumível';
      const isEquip = item.type === 'equipamento';
      cell.style.cssText = `
        position:relative;aspect-ratio:1;
        background:rgba(15,10,3,0.85);
        border:1px solid ${typeColor[type]}55;
        border-bottom:3px solid ${typeColor[type]}99;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;transition:all 0.15s;
        border-radius:2px;
      `;
      cell.title = item.name + (item.qty > 1 ? ` ×${item.qty}` : '') + (item.desc ? '\n' + item.desc : '');

      const iconHtml = item.imgSrc
        ? `<img src="${item.imgSrc}" style="width:80%;height:80%;object-fit:contain;mix-blend-mode:screen;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span style="display:none;font-size:2.2rem;width:80%;height:80%;align-items:center;justify-content:center;">${item.icon || '📦'}</span>`
        : `<span style="font-size:2.2rem;">${item.icon || '📦'}</span>`;

      const qtyBadge = item.qty > 1
        ? `<span style="position:absolute;bottom:3px;right:4px;font-size:0.62rem;color:var(--gold2);font-family:'Noto Sans JP',sans-serif;">${item.qty}</span>`
        : '';

      const eqBadge = item.equipped
        ? `<span style="position:absolute;top:2px;left:2px;font-size:0.38rem;color:#60b060;background:rgba(20,60,20,0.8);padding:1px 3px;">EQ</span>`
        : '';

      cell.innerHTML = `${iconHtml}${qtyBadge}${eqBadge}`;

      cell.onclick = () => {
        showItemPopup(i, item);
      };

      // Hover
      cell.onmouseenter = () => { cell.style.borderColor = typeColor[type]; cell.style.background = `rgba(200,150,10,0.08)`; };
      cell.onmouseleave = () => { cell.style.borderColor = `${typeColor[type]}55`; cell.style.background = 'rgba(15,10,3,0.85)'; };

      grid.appendChild(cell);
    });

    list.appendChild(grid);
  });
}

// ── Popup universal de item (todos os tipos, ambos os modos de bolsa) ──
function showItemPopup(idx, item) {
  item = _resolveItemDesc(item); // descrição dinâmica para cajado
  const old = document.getElementById('item-use-popup');
  if (old) old.remove();

  const typeColor = {
    'equipamento': '#c07040',
    'consumível':  '#50c080',
    'material':    '#c0a040',
    'bau':         '#d4a017',
    'chave':       '#8090c0',
    'outro':       '#8080a0',
  };
  const typeLabel = {
    'equipamento': 'EQUIPAMENTO',
    'consumível':  'CONSUMÍVEL',
    'material':    'MATERIAL',
    'bau':         'BAÚ',
    'chave':       'CHAVE',
    'outro':       'ITEM',
  };
  const cor   = typeColor[item.type]  || typeColor['outro'];
  const label = typeLabel[item.type]  || 'ITEM';

  // Stats do item
  const statsStr = [];
  if (item.atk)  statsStr.push(`ATQ +${item.atk}`);
  if (item.def)  statsStr.push(`DEF +${item.def}`);
  if (item.mag)  statsStr.push(`MAG +${item.mag}`);
  if (item.spd)  statsStr.push(`VEL +${item.spd}`);
  if (item.heal) statsStr.push(`Cura +${item.heal} HP`);
  if (item.restoreMP) statsStr.push(`Restaura +${item.restoreMP} MP`);
  if (item.crit) statsStr.push(`Crítico +${item.crit}%`);
  if (item.hp)   statsStr.push(`HP Máx +${item.hp}`);
  if (item.mp)   statsStr.push(`MP Máx +${item.mp}`);
  // Itens com buff de batalha (ex: Coração Incandescente) — não dão bônus
  // permanente ao equipar, só ativam ao entrar em combate
  if (item.buffAtk)  statsStr.push(`ATQ +${item.buffAtk} (${item.buffTurns||3}t por batalha)`);
  if (item.buffCrit) statsStr.push(`Crítico +${item.buffCrit}% (${item.buffTurns||3}t por batalha)`);
  if (item.buffHeal) statsStr.push(`Cura +${item.buffHeal} HP (ao entrar em batalha)`);

  // Peso
  const peso = item.weight ? `${item.weight} kg` : null;

  // Ícone
  const iconHtml = item.imgSrc
    ? `<img src="${item.imgSrc}" style="width:72px;height:72px;object-fit:contain;mix-blend-mode:screen;margin:0 auto 10px;display:block;" onerror="this.outerHTML='<div style=\\'font-size:2.6rem;margin-bottom:10px;text-align:center;\\'>${item.icon || '📦'}</div>'">`
    : `<div style="font-size:2.6rem;margin-bottom:10px;text-align:center;">${item.icon || '📦'}</div>`;

  // Botão de ação principal
  let actionBtn = '';
  if (item.type === 'consumível') {
    actionBtn = `<button id="_ipop_action" style="
      font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;
      padding:9px 20px;border:1px solid rgba(60,180,60,0.5);
      background:rgba(40,100,40,0.2);color:#70c070;cursor:pointer;flex:1;
    ">✓ Usar</button>`;
  } else if (item.type === 'equipamento') {
    if (item.equipped) {
      actionBtn = `<button id="_ipop_action" style="
        font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;
        padding:9px 20px;border:1px solid rgba(200,80,40,0.4);
        background:rgba(100,30,10,0.2);color:#e08060;cursor:pointer;flex:1;
      ">✕ Desequipar</button>`;
    } else {
      actionBtn = `<button id="_ipop_action" style="
        font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;
        padding:9px 20px;border:1px solid rgba(200,150,10,0.4);
        background:rgba(100,60,10,0.2);color:var(--gold2);cursor:pointer;flex:1;
      ">⚔ Equipar</button>`;
    }
  } else if (item.type === 'bau') {
    actionBtn = `<button id="_ipop_action" style="
      font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;
      padding:9px 20px;border:1px solid rgba(212,160,23,0.5);
      background:rgba(100,75,10,0.2);color:#d4a017;cursor:pointer;flex:1;
    ">🔓 Abrir</button>`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'item-use-popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
    background:rgba(0,0,0,0.72);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
  `;

  overlay.innerHTML = `
    <div style="
      background:#0e0a05;
      border:1px solid ${cor}55;
      border-top:3px solid ${cor};
      width:100%;max-width:320px;
      font-family:'Noto Serif JP',serif;
      color:var(--gold2);
      border-radius:2px;
      overflow:hidden;
    ">
      <!-- Header tipo -->
      <div style="
        padding:6px 14px;
        background:${cor}18;
        border-bottom:1px solid ${cor}33;
        font-family:'Noto Sans JP',sans-serif;
        font-size:0.52rem;letter-spacing:4px;color:${cor};
      ">${label}${item.qty > 1 ? `<span style="float:right;letter-spacing:1px;">×${item.qty}</span>` : ''}</div>

      <!-- Corpo -->
      <div style="padding:18px 16px;">
        ${iconHtml}

        <!-- Nome -->
        <div style="font-size:1.05rem;font-weight:700;text-align:center;margin-bottom:6px;line-height:1.3;">
          ${item.name}
          ${item.equipped ? `<span style="font-size:0.58rem;color:#60c060;background:rgba(40,100,40,0.25);border:1px solid rgba(60,180,60,0.3);padding:1px 6px;margin-left:6px;vertical-align:middle;">EQUIPADO</span>` : ''}
        </div>

        <!-- Descrição -->
        ${item.desc ? `<div style="
          font-size:0.75rem;color:rgba(242,232,208,0.5);
          font-style:italic;text-align:center;
          margin-bottom:${statsStr.length || peso ? '12px' : '0'};
          line-height:1.5;
        ">${item.desc}</div>` : ''}

        <!-- Stats -->
        ${statsStr.length ? `<div style="
          display:flex;flex-wrap:wrap;gap:6px;justify-content:center;
          margin-bottom:${peso ? '10px' : '0'};
        ">
          ${statsStr.map(s => `<span style="
            font-family:'Noto Sans JP',sans-serif;
            font-size:0.68rem;color:${cor};
            background:${cor}15;
            border:1px solid ${cor}40;
            padding:2px 8px;
          ">${s}</span>`).join('')}
        </div>` : ''}

        <!-- Peso -->
        ${peso ? `<div style="
          font-family:'Noto Sans JP',sans-serif;
          font-size:0.6rem;color:rgba(200,150,10,0.35);
          text-align:center;margin-top:8px;
        ">⚖ Peso: ${peso}</div>` : ''}
      </div>

      <!-- Botões -->
      <div style="
        display:flex;gap:8px;padding:12px 16px;
        border-top:1px solid rgba(200,150,10,0.1);
        background:rgba(0,0,0,0.3);
      ">
        ${actionBtn}
        <button id="_ipop_close" style="
          font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;
          padding:9px 16px;border:1px solid rgba(200,150,10,0.2);
          background:transparent;color:rgba(200,150,10,0.5);cursor:pointer;
          ${actionBtn ? '' : 'flex:1;'}
        ">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('_ipop_close').onclick = () => overlay.remove();

  const actionEl = document.getElementById('_ipop_action');
  if (actionEl) {
    actionEl.onclick = () => {
      useInventoryItem(idx);
      buildBagItems();
      overlay.remove();
    };
  }
}
// Manter compatibilidade com chamadas antigas
function showItemUsePopup(idx, item) { showItemPopup(idx, item); }


// ── Popup de preview do layout da bolsa ──
function cfgOpenBagLayoutPreview() {
  const old = document.getElementById('popup-bag-layout');
  if (old) old.remove();

  const atual = localStorage.getItem('clivor_bag_layout') || 'lista';

  const overlay = document.createElement('div');
  overlay.id = 'popup-bag-layout';
  overlay.style.cssText = `position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:12px;`;
  overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="width:min(400px,96vw);background:#0d0a03;border:1px solid rgba(200,150,10,0.5);border-top:3px solid #c8960a;border-radius:2px;font-family:'Noto Serif JP',serif;overflow:hidden;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(200,150,10,0.15);">
        <div>
          <div style="font-size:0.72rem;letter-spacing:2px;color:#c8960a;">袋 LAYOUT DA BOLSA</div>
          <div style="font-size:0.5rem;color:rgba(200,150,10,0.4);letter-spacing:1px;margin-top:2px;">Escolha como seus itens são exibidos</div>
        </div>
        <button onclick="document.getElementById('popup-bag-layout').remove()" style="background:none;border:1px solid rgba(200,150,10,0.3);color:rgba(200,150,10,0.7);padding:4px 12px;font-size:0.65rem;cursor:pointer;">✕</button>
      </div>

      <!-- Previews lado a lado -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 14px 8px;">

        <!-- LISTA -->
        <div id="preview-lista" onclick="cfgSetBagLayout('lista')" style="cursor:pointer;border:2px solid ${atual==='lista'?'#c8960a':'rgba(200,150,10,0.2)'};border-radius:2px;overflow:hidden;transition:border-color 0.2s;background:rgba(255,255,255,0.02);">
          <div style="font-size:0.5rem;letter-spacing:2px;color:${atual==='lista'?'#c8960a':'rgba(200,150,10,0.35)'};text-align:center;padding:6px 0 4px;">📋 LISTA</div>
          <!-- Mini preview lista -->
          <div style="padding:0 6px 8px;display:flex;flex-direction:column;gap:3px;">
            ${['🌿','🧪','💎'].map(ic => `
              <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,10,0.1);border-left:2px solid rgba(60,120,60,0.5);padding:4px 5px;border-radius:1px;">
                <span style="font-size:0.9rem;">${ic}</span>
                <div style="flex:1;">
                  <div style="height:4px;background:rgba(200,150,10,0.25);border-radius:1px;width:80%;margin-bottom:2px;"></div>
                  <div style="height:3px;background:rgba(200,150,10,0.1);border-radius:1px;width:60%;"></div>
                </div>
              </div>`).join('')}
          </div>
          ${atual==='lista'?'<div style="font-size:0.48rem;color:#c8960a;text-align:center;padding-bottom:6px;letter-spacing:1px;">✦ ATIVO</div>':''}
        </div>

        <!-- GRADE -->
        <div id="preview-grade" onclick="cfgSetBagLayout('grade')" style="cursor:pointer;border:2px solid ${atual==='grade'?'#c8960a':'rgba(200,150,10,0.2)'};border-radius:2px;overflow:hidden;transition:border-color 0.2s;background:rgba(255,255,255,0.02);">
          <div style="font-size:0.5rem;letter-spacing:2px;color:${atual==='grade'?'#c8960a':'rgba(200,150,10,0.35)'};text-align:center;padding:6px 0 4px;">🟫 GRADE</div>
          <!-- Mini preview grade -->
          <div style="padding:0 6px 8px;display:grid;grid-template-columns:repeat(4,1fr);gap:3px;">
            ${['🌿','🧪','💎','⚗️','🪨','🔵','🌿','📦'].map(ic => `
              <div style="aspect-ratio:1;background:rgba(15,10,3,0.85);border:1px solid rgba(200,150,10,0.25);border-bottom:2px solid rgba(200,150,10,0.4);display:flex;align-items:center;justify-content:center;font-size:0.85rem;border-radius:1px;">${ic}</div>`).join('')}
          </div>
          ${atual==='grade'?'<div style="font-size:0.48rem;color:#c8960a;text-align:center;padding-bottom:6px;letter-spacing:1px;">✦ ATIVO</div>':''}
        </div>

      </div>

      <!-- Dica -->
      <div style="font-size:0.52rem;color:rgba(200,150,10,0.35);text-align:center;padding:0 14px 14px;font-style:italic;line-height:1.6;">
        Lista mostra detalhes completos.<br>Grade mostra mais itens de uma vez.
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function cfgSetBagLayout(modo) {
  localStorage.setItem('clivor_bag_layout', modo);
  document.getElementById('popup-bag-layout').remove();
  // Feedback
  const label = modo === 'grade' ? 'Grade de Blocos' : 'Lista Detalhada';
  if (typeof notify === 'function') notify(`袋 Layout: ${label}`, 'gold');
}
window.cfgOpenBagLayoutPreview = cfgOpenBagLayoutPreview;
window.cfgSetBagLayout = cfgSetBagLayout;



function buildBagStatus() {
  const rows = document.getElementById('bag-status-rows');
  const p = G.player;
  const cls = p.classData;
  const isWarrior = ((p.classData && p.classData.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(p.class));

  rows.innerHTML = `
    <div style="font-family:'Noto Serif JP',serif;font-size:1rem;color:var(--gold2);letter-spacing:3px;text-align:center;margin-bottom:12px;">
      ${cls ? (cls.iconImg ? `<img src="${cls.iconImg}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;"> ` : cls.icon + ' ') + cls.name.toUpperCase() : '— ⚔'}
    </div>
    ${statRow('❤', 'HP',  p.hp  + ' / ' + p.maxHp,  '#40c040')}
    ${statRow(isWarrior ? '⚡' : '💧', isWarrior ? 'AP' : 'MP', (isWarrior ? p.ap : p.mp) + ' / ' + (isWarrior ? p.maxAp : p.maxMp), isWarrior ? '#e09030' : '#3a6888')}
    ${statRow('⚔', 'ATQ', p.atk,  '#e08060')}
    ${statRow('🛡', 'DEF', p.def,  '#6080c0')}
    ${statRow('💨', 'VEL', p.spd,  '#60c060')}
    ${(!isWarrior) ? statRow('🔮', 'MAG', p.mag, '#c060d0') : ''}
    <hr style="border:none;border-top:1px solid rgba(200,150,10,0.1);margin:8px 0;">
    ${statRow('🌟', 'Nível', p.level, '#f0c040')}
    ${statRow('✨', 'EXP', p.xp + '/' + p.xpNext, '#c8960a')}
    ${statRow('◈',  'Ouro', p.gold,  '#c8960a')}
    ${statRow('⚔', 'Abates', p.kills, '#e08060')}
    ${statRow('💀', 'Mortes', p.deaths, '#808080')}
  `;
}

function statRow(icon, label, value, color) {
  return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
    <span style="font-size:1rem;min-width:22px;">${icon}</span>
    <span style="font-family:'Noto Sans JP',sans-serif;font-size:0.72rem;color:rgba(200,150,10,0.5);min-width:40px;">${label}</span>
    <span style="font-family:'Noto Serif JP',serif;font-size:0.85rem;color:${color};font-weight:700;">${value}</span>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
//  17. NOTIFICAÇÕES E LOG
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  ACESSIBILIDADE & PREFERÊNCIAS VISUAIS
// ─────────────────────────────────────────────────────────────

// ── Tamanho de Fonte ──
(function initFont() {
  const saved = parseFloat(localStorage.getItem('clivor_font_scale') || '1');
  document.documentElement.style.setProperty('--font-scale', saved);
  const el = document.getElementById('cfg-font-val');
  if (el) el.textContent = Math.round(saved * 100) + '%';
})();

function cfgFontStep(dir) {
  const steps = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30];
  const cur = parseFloat(localStorage.getItem('clivor_font_scale') || '1');
  const idx = steps.reduce((best, v, i) => Math.abs(v - cur) < Math.abs(steps[best] - cur) ? i : best, 0);
  const next = steps[Math.max(0, Math.min(steps.length - 1, idx + dir))];
  document.documentElement.style.setProperty('--font-scale', next);
  localStorage.setItem('clivor_font_scale', next);
  const el = document.getElementById('cfg-font-val');
  if (el) el.textContent = Math.round(next * 100) + '%';
}
window.cfgFontStep = cfgFontStep;

// ── Modo Daltônico ──
(function initDaltonico() {
  const on = localStorage.getItem('clivor_daltonico') === '1';
  if (on) document.body.classList.add('daltonico');
  const btn = document.getElementById('cfg-daltonico');
  if (btn) { btn.textContent = on ? 'Ligado' : 'Desligado'; if (on) btn.classList.add('active'); }
})();


// ── Notificações ──
window._notifMuted = localStorage.getItem('clivor_notif_muted') === '1';
(function initNotif() {
  const btn = document.getElementById('cfg-notif');
  if (!btn) return;
  if (window._notifMuted) { btn.textContent = 'Mudo'; btn.classList.remove('active'); }
  else { btn.textContent = 'Ligado'; btn.classList.add('active'); }
})();

function cfgToggleNotif() {
  window._notifMuted = !window._notifMuted;
  localStorage.setItem('clivor_notif_muted', window._notifMuted ? '1' : '0');
  const btn = document.getElementById('cfg-notif');
  if (btn) { btn.textContent = window._notifMuted ? 'Mudo' : 'Ligado'; btn.classList.toggle('active', !window._notifMuted); }
  // Mostra feedback mesmo com notif mudo, pois é a própria config
  const container = document.getElementById('notif-container');
  const div = document.createElement('div');
  div.className = 'notif gold';
  div.textContent = window._notifMuted ? '🔕 Notificações desativadas' : '🔔 Notificações ativadas';
  container.appendChild(div);
  setTimeout(() => div.remove(), 3100);
}
window.cfgToggleNotif = cfgToggleNotif;

function notify(msg, type = 'gold') {
  if (window._notifMuted) return;
  const container = document.getElementById('notif-container');
  const div = document.createElement('div');
  div.className = 'notif ' + (type || 'gold');
  div.textContent = msg;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3100);
}

function addLog(msg, type = 'info') {
  const log = document.getElementById('battle-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'log-entry ' + type;
  div.textContent = msg;
  log.insertBefore(div, log.firstChild);
  // Manter no máximo 40 entradas
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

// ─────────────────────────────────────────────────────────────
//  18. CUSTOM CONFIRM
// ─────────────────────────────────────────────────────────────
function showCustomConfirm(msg, onOk, onCancel) {
  const el = document.getElementById('custom-confirm');
  document.getElementById('custom-confirm-msg').textContent = msg;
  el.style.display = 'flex';
  document.getElementById('custom-confirm-ok').onclick = () => { el.style.display='none'; if (onOk) onOk(); };
  document.getElementById('custom-confirm-cancel').onclick = () => { el.style.display='none'; if (onCancel) onCancel(); };
}

// ─────────────────────────────────────────────────────────────
//  19. INICIALIZAÇÃO DA PÁGINA
// ─────────────────────────────────────────────────────────────
window.addEventListener('load', function () {
  AudioSys.init();
  _initTapSoundPool();

  // Som de toque: toca em qualquer clique em elemento interativo do jogo
  document.addEventListener('click', function(e) {
    if (CONFIG.tapSound === false) return;
    const el = e.target.closest('button, [onclick], .svp-marker, .choice-btn, .qb-slot-claim, a');
    if (!el) return;
    playTapSound();
  }, true);

  if (typeof window.villageGoTo === 'function' && !window._villageGoToWrapped) {
    window._villageGoToWrapped = true;
    const _origVillageGoTo = window.villageGoTo;
    window.villageGoTo = function(dest) {
      _origVillageGoTo(dest);
      const reallyOpened = dest === 'saida' || typeof isLocationOpen !== 'function' || isLocationOpen(dest);
      if (window.QuestBoard && reallyOpened) QuestBoard.onVisit(dest);
    };
  }

  // ── Restaurar preferências visuais ──
  const fontScale = parseFloat(localStorage.getItem('clivor_font_scale') || '1');
  document.documentElement.style.setProperty('--font-scale', fontScale);
  const fontEl = document.getElementById('cfg-font-val');
  if (fontEl) fontEl.textContent = Math.round(fontScale * 100) + '%';

  const daltonico = localStorage.getItem('clivor_daltonico') === '1';
  if (daltonico) document.body.classList.add('daltonico');
  const dBtn = document.getElementById('cfg-daltonico');
  if (dBtn) { dBtn.textContent = daltonico ? 'Ligado' : 'Desligado'; if (daltonico) dBtn.classList.add('active'); }

  window._notifMuted = localStorage.getItem('clivor_notif_muted') === '1';
  const nBtn = document.getElementById('cfg-notif');
  if (nBtn) { nBtn.textContent = window._notifMuted ? 'Mudo' : 'Ligado'; nBtn.classList.toggle('active', !window._notifMuted); }

  // Verificar saves existentes
  for (let n = 1; n <= 4; n++) {
    if (localStorage.getItem('clivor_save_' + n)) {
      const btn = document.getElementById('btn-continuar-save');
      if (btn) btn.style.display = 'block';
      break;
    }
  }
});

// ─────────────────────────────────────────────────────────────
//  SISTEMA DE CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  textSpeed:    'normal',   // slow | normal | fast
  battleSpeed:  'normal',
  fontSize:     100,
  brightness:   100,
  difficulty:   'normal',
  autoSave:     true,
  vibration:    true,
  animations:   true,
  boldText:     false,
  tapSound:     true,
};
// Multiplicadores de delay
const TEXT_SPEED_MAP   = { slow: 2.0, normal: 1.0, fast: 0.4 };
const BATTLE_SPEED_MAP = { slow: 1.8, normal: 1.0, fast: 0.5 };

function openConfig() {
  const ov = document.getElementById('config-overlay');
  if (!ov) return;
  ov.classList.add('active');
  // Música
  const vol = Math.round(AudioSys.volume * 100);
  const sv = document.getElementById('cfg-volume');
  if (sv) sv.value = vol;
  const svv = document.getElementById('cfg-volume-val');
  if (svv) svv.textContent = vol + '%';
  _cfgToggle('cfg-sound-on', 'cfg-sound-off', !AudioSys.muted);
  // SFX
  const sfxVol = Math.round(AudioSys.sfxVolume * 100);
  const ssfx = document.getElementById('cfg-sfx-volume');
  if (ssfx) ssfx.value = sfxVol;
  const ssfxv = document.getElementById('cfg-sfx-volume-val');
  if (ssfxv) ssfxv.textContent = sfxVol + '%';
  _cfgToggle('cfg-sfx-on', 'cfg-sfx-off', !AudioSys.sfxMuted);
  // Velocidade
  _cfgSetActive('cfg-txt', CONFIG.textSpeed);
  _cfgSetActive('cfg-bat', CONFIG.battleSpeed);
  // Layout
  const sfv = document.getElementById('cfg-font-val');
  if (sfv) sfv.textContent = (CONFIG.fontSize || 100) + '%';
  const sb = document.getElementById('cfg-brightness');
  if (sb) sb.value = CONFIG.brightness;
  const sbv = document.getElementById('cfg-bright-val');
  if (sbv) sbv.textContent = CONFIG.brightness + '%';
  // Dificuldade
  _cfgSetActive('cfg-dif', CONFIG.difficulty);
  // Toggles
  _cfgToggleSingle('cfg-autosave', CONFIG.autoSave);
  _cfgToggleSingle('cfg-vibration', CONFIG.vibration);
  _cfgToggleSingle('cfg-animations', CONFIG.animations);
  _cfgToggleSingle('cfg-tapsound', CONFIG.tapSound !== false);
  // Negrito
  const boldBtn = document.getElementById('cfg-bold');
  if (boldBtn) { boldBtn.classList.toggle('active', !!CONFIG.boldText); boldBtn.textContent = CONFIG.boldText ? 'Ligado' : 'Desligado'; }
}

function closeConfig() {
  const ov = document.getElementById('config-overlay');
  if (ov) ov.classList.remove('active');
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
  localStorage.setItem('clivor_volume', Math.round(AudioSys.volume * 100));
  localStorage.setItem('clivor_muted', AudioSys.muted ? '1' : '0');
  localStorage.setItem('clivor_sfx_volume', Math.round(AudioSys.sfxVolume * 100));
  localStorage.setItem('clivor_sfx_muted', AudioSys.sfxMuted ? '1' : '0');
}

function cfgUpdateVolume(val) {
  const v = parseInt(val);
  AudioSys.volume = v / 100;
  const vv = document.getElementById('cfg-volume-val');
  if (vv) vv.textContent = v + '%';
  // Aplicar ao track atual
  if (AudioSys.current && AudioSys.tracks[AudioSys.current]) {
    AudioSys.tracks[AudioSys.current].volume = AudioSys.muted ? 0 : AudioSys.volume;
  }
}

function cfgSetMute(muted) {
  AudioSys.muted = muted;
  if (AudioSys.current && AudioSys.tracks[AudioSys.current]) {
    AudioSys.tracks[AudioSys.current].volume = muted ? 0 : AudioSys.volume;
  }
  _cfgToggle('cfg-sound-on', 'cfg-sound-off', !muted);
}

function cfgSetTextSpeed(speed) {
  CONFIG.textSpeed = speed;
  _cfgSetActive('cfg-txt', speed);
}

function cfgSetBattleSpeed(speed) {
  CONFIG.battleSpeed = speed;
  _cfgSetActive('cfg-bat', speed);
}

function cfgUpdateFont(val) {
  CONFIG.fontSize = parseInt(val);
  document.body.style.fontSize = val + 'px';
  const fv = document.getElementById('cfg-font-val');
  if (fv) fv.textContent = val + 'px';
}

function cfgFontStep(delta) {
  const min = 80, max = 130; // zoom % em vez de px
  CONFIG.fontSize = Math.min(max, Math.max(min, (CONFIG.fontSize || 100) + delta * 5));
  document.body.style.zoom = CONFIG.fontSize + '%';
  const fv = document.getElementById('cfg-font-val');
  if (fv) fv.textContent = CONFIG.fontSize + '%';
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgUpdateBrightness(val) {
  CONFIG.brightness = parseInt(val);
  document.body.style.filter = 'brightness(' + val + '%)';
  const bv = document.getElementById('cfg-bright-val');
  if (bv) bv.textContent = val + '%';
}

function cfgGoToMenu() {
  if (!confirm('Salvar e voltar ao menu principal?')) return;
  manualSave();
  closeConfig();
  // Voltar para tela de intro/save
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const intro = document.getElementById('screen-intro');
  if (intro) intro.classList.add('active');
  AudioSys.play('intro');
}

function cfgResetConfirm() {
  if (!confirm('Reiniciar a partida? Todo o progresso será perdido!')) return;
  if (!confirm('Tem certeza? Esta ação não pode ser desfeita!')) return;
  localStorage.removeItem('clivor_save_' + G.saveSlot);
  location.reload();
}

function cfgUpdateSfxVolume(val) {
  const v = parseInt(val);
  AudioSys.sfxVolume = v / 100;
  const vv = document.getElementById('cfg-sfx-volume-val');
  if (vv) vv.textContent = v + '%';
}

function cfgSetSfxMute(muted) {
  AudioSys.sfxMuted = muted;
  _cfgToggle('cfg-sfx-on', 'cfg-sfx-off', !muted);
}

function cfgSetDifficulty(diff) {
  CONFIG.difficulty = diff;
  _cfgSetActive('cfg-dif', diff);
  // Aplica multiplicador de dano dos inimigos
  const map = { easy: 0.65, normal: 1.0, hard: 1.5 };
  window._diffMult = map[diff] || 1.0;
}

function cfgToggleAutoSave() {
  CONFIG.autoSave = !CONFIG.autoSave;
  const el = document.getElementById('cfg-autosave');
  if (el) { el.classList.toggle('active', CONFIG.autoSave); el.textContent = CONFIG.autoSave ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleVibration() {
  CONFIG.vibration = !CONFIG.vibration;
  const el = document.getElementById('cfg-vibration');
  if (el) { el.classList.toggle('active', CONFIG.vibration); el.textContent = CONFIG.vibration ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleAnimations() {
  CONFIG.animations = !CONFIG.animations;
  const el = document.getElementById('cfg-animations');
  if (el) { el.classList.toggle('active', CONFIG.animations); el.textContent = CONFIG.animations ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleTapSound() {
  CONFIG.tapSound = !CONFIG.tapSound;
  const el = document.getElementById('cfg-tapsound');
  if (el) { el.classList.toggle('active', CONFIG.tapSound); el.textContent = CONFIG.tapSound ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleBold() {
  CONFIG.boldText = !CONFIG.boldText;
  document.body.classList.toggle('bold-mode', CONFIG.boldText);
  const el = document.getElementById('cfg-bold');
  if (el) { el.classList.toggle('active', CONFIG.boldText); el.textContent = CONFIG.boldText ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

// Helpers internos
function _cfgToggle(idOn, idOff, isOn) {
  const on = document.getElementById(idOn);
  const off = document.getElementById(idOff);
  if (on)  on.classList.toggle('active', isOn);
  if (off) off.classList.toggle('active', !isOn);
}
function _cfgToggleSingle(id, isOn) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', isOn);
}
function _cfgSetActive(prefix, val) {
  // Suporta velocidade (slow/normal/fast) e dificuldade (easy/normal/hard)
  ['slow','normal','fast','easy','hard'].forEach(s => {
    const el = document.getElementById(prefix + '-' + s);
    if (el) el.classList.toggle('active', s === val);
  });
}

// Carregar config salva
(function() {
  // Garante _diffMult padrão
  window._diffMult = 1.0;
  try {
    const saved = localStorage.getItem('clivor_cfg');
    if (saved) {
      const c = JSON.parse(saved);
      Object.assign(CONFIG, c);
      if (CONFIG.fontSize && CONFIG.fontSize !== 100) {
        // Guarda contra valores antigos em px (≤30 = era px, não %)
        if (CONFIG.fontSize <= 30) CONFIG.fontSize = 100;
        document.body.style.zoom = CONFIG.fontSize + '%';
      }
      if (CONFIG.brightness !== 100) document.body.style.filter = 'brightness(' + CONFIG.brightness + '%)';
      if (CONFIG.boldText) document.body.classList.add('bold-mode');
      // Aplica dificuldade salva
      const diffMap = { easy: 0.65, normal: 1.0, hard: 1.5 };
      window._diffMult = diffMap[CONFIG.difficulty] || 1.0;
    }
  } catch(e) {}
})();

// ── Efeito visual Escudo Divino ──
function _showBuffPanel(id, imgSrc, label) {
  const panel = document.getElementById('skill-buff-panel');
  if (!panel) return;
  // Evita duplicar
  if (document.getElementById('buff-' + id)) return;
  const entry = document.createElement('div');
  entry.className = 'buff-entry';
  entry.id = 'buff-' + id;
  entry.innerHTML = `<img src="${imgSrc}" alt="${label}"><div class="buff-label">${label}</div>`;
  panel.appendChild(entry);
  // trigger animação de entrada
  void entry.offsetWidth;
  entry.classList.add('visible');
}
function _hideBuffPanel(id) {
  const entry = document.getElementById('buff-' + id);
  if (!entry) return;
  entry.classList.remove('visible');
  setTimeout(() => { if (entry.parentNode) entry.parentNode.removeChild(entry); }, 350);
}

function showShieldEffect() {
  const el = document.getElementById('shield-effect');
  if (el) {
    el.style.display = 'block';
    el.style.opacity = '0';
    el.style.transform = 'scale(0) rotate(-20deg)';
    el.style.transition = 'none';
    el.style.filter = 'drop-shadow(0 0 14px rgba(200,160,10,1))';
    void el.offsetWidth;
    el.style.transition = 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s ease';
    el.style.transform = 'scale(1.1) rotate(0deg)';
    el.style.opacity = '1';
    setTimeout(() => {
      if (!el) return;
      el.style.transform = 'scale(1) rotate(0deg)';
      el.classList.add('active');
    }, 400);
  }
  // Mostra também no painel de buffs lateral
  _showBuffPanel('escudo-divino', 'Imagens/icones/EscudoDivin.png', 'Escudo\nDivino');
}
function hideShieldEffect() {
  const el = document.getElementById('shield-effect');
  if (el) {
    el.classList.remove('active');
    el.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    el.style.transform = 'scale(0.3)';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = 'none';
      el.style.transform = '';
      el.style.opacity = '';
      el.style.transition = '';
      el.classList.remove('active');
    }, 300);
  }
  // Remove do painel de buffs lateral
  _hideBuffPanel('escudo-divino');
}

// ═══════════════════════════════════════════════
// ── SISTEMA DE FLECHAS ESPECIAIS ──
// ═══════════════════════════════════════════════

function _updateArrowBtnLabel() {
  const btn = document.getElementById('btn-trocar-flecha');
  if (!btn) return;
  const p = G.player;
  if (!p.classData || p.classData.id !== 'arqueiro') { btn.style.display='none'; return; }
  const arrowId = p.equippedArrow || 'normal';
  const arrow = (typeof getArrowType === 'function') ? getArrowType(arrowId) : { icon:'🏹', name:'Normal' };
  btn.textContent = arrow.icon + ' ' + arrow.name;
}
window._updateArrowBtnLabel = _updateArrowBtnLabel;

function openBattleArrowMenu() {
  const old = document.getElementById('popup-arrow-menu');
  if (old) old.remove();

  const arrows = (typeof ARROW_TYPES !== 'undefined') ? ARROW_TYPES : [];
  const p = G.player;
  const equipped = p.equippedArrow || 'normal';

  const popup = document.createElement('div');
  popup.id = 'popup-arrow-menu';
  popup.style.cssText = `
    position:fixed; inset:0; z-index:800;
    background:rgba(0,0,0,0.82);
    display:flex; align-items:flex-end; justify-content:center;
  `;

  let html = `
    <div style="width:100%;max-width:480px;background:rgba(14,8,2,0.99);border:1px solid rgba(160,192,64,0.3);border-bottom:none;padding:18px 16px 28px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-size:0.7rem;letter-spacing:3px;color:rgba(160,192,64,0.7);font-family:'Noto Sans JP',sans-serif;">🏹 TROCAR FLECHA</div>
        <button onclick="document.getElementById('popup-arrow-menu').remove()" style="background:none;border:none;color:rgba(200,150,10,0.5);font-size:1rem;cursor:pointer;">✕</button>
      </div>
      <div style="font-size:0.58rem;color:rgba(200,220,100,0.4);font-style:italic;margin-bottom:14px;">Trocar flecha consome seu turno. Flecha Normal libera as habilidades.</div>
  `;

  arrows.forEach(a => {
    const isEq = a.id === equipped;
    html += `
      <div onclick="selectBattleArrow('${a.id}')" style="
        display:flex;align-items:center;gap:12px;padding:11px 13px;
        border:1px solid ${isEq ? 'rgba(160,192,64,0.6)' : 'rgba(160,192,64,0.12)'};
        background:${isEq ? 'rgba(160,192,64,0.1)' : 'rgba(160,192,64,0.02)'};
        margin-bottom:6px;cursor:pointer;transition:all 0.15s;
      ">
        <span style="font-size:1.8rem;min-width:36px;text-align:center;">${a.imgSrc ? `<img src="${a.imgSrc}" style="width:38px;height:38px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='${a.icon}'">` : a.icon}</span>
        <div style="flex:1;">
          <div style="font-size:0.78rem;color:${a.color};font-family:'Noto Serif JP',serif;">${a.name}${isEq?' <span style="font-size:0.55rem;color:rgba(160,192,64,0.6);margin-left:6px;">EQUIPADA</span>':''}</div>
          <div style="font-size:0.58rem;color:rgba(200,220,100,0.45);margin-top:3px;line-height:1.5;">${a.efeito}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  popup.innerHTML = html;
  document.body.appendChild(popup);
}
window.openBattleArrowMenu = openBattleArrowMenu;

function selectBattleArrow(arrowId) {
  const popup = document.getElementById('popup-arrow-menu');
  if (popup) popup.remove();

  const p = G.player;
  const oldId = p.equippedArrow || 'normal';
  if (oldId === arrowId) {
    // mesma flecha — não consome turno
    return;
  }

  p.equippedArrow = arrowId;
  const arrow = (typeof getArrowType === 'function') ? getArrowType(arrowId) : { name: arrowId, icon: '🏹' };

  // Flecha Negra: perde 10% HP ao equipar
  if (arrowId === 'negra') {
    const hpCost = Math.ceil(p.maxHp * 0.10);
    p.hp = Math.max(1, p.hp - hpCost);
    appendBattleLog(`🖤 Flecha Negra equipada! Você perde ${hpCost} HP.`, '#c060c0');
    battleState._arrowNegraTurns = 0;
    updateBattleHUD();
  }

  // Resetar contador de turno ao trocar
  battleState._arrowTurnCounter = 0;

  appendBattleLog(`🏹 Flecha trocada para ${arrow.icon} ${arrow.name}. Turno gasto.`, '#a0c040');

  // Bloquear/liberar habilidades
  _updateSkillBlockByArrow(arrowId);
  _updateArrowBtnLabel();

  // Consome o turno — passa para o inimigo
  const bs = battleState;
  const p2 = G.player;
  const e2 = bs.enemyData;
  bs.phase = 'enemy';
  setBattleButtons(false);
  setTimeout(() => runEnemyTurn(bs, p2, e2, false), 700);
}
window.selectBattleArrow = selectBattleArrow;

function _updateSkillBlockByArrow(arrowId) {
  const arrow = (typeof getArrowType === 'function') ? getArrowType(arrowId) : null;
  const skillsAllowed = !arrow || arrow.skillsAllowed !== false;
  const skillBtns = document.querySelectorAll('.skill-battle-btn');
  skillBtns.forEach(btn => {
    if (!skillsAllowed) {
      btn.disabled = true;
      btn.style.opacity = '0.25';
      btn.title = 'Troque para Flecha Normal para usar habilidades';
    } else {
      btn.style.opacity = '';
      btn.title = '';
    }
  });
}
window._updateSkillBlockByArrow = _updateSkillBlockByArrow;

// ── Aba de Flechas na Bolsa ──
function buildArrowBagTab() {
  const arrows = (typeof ARROW_TYPES !== 'undefined') ? ARROW_TYPES : [];
  const p = G.player;
  const equipped = p.equippedArrow || 'normal';
  const eqArrow = arrows.find(a => a.id === equipped) || arrows[0];

  // Slot equipada
  const eqEl = document.getElementById('arrow-equipped-display');
  if (eqEl) {
    eqEl.innerHTML = `
      <div class="arrow-equipped-slot">
        <div class="arrow-slot-icon">${eqArrow.imgSrc ? `<img src="${eqArrow.imgSrc}" style="width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(160,192,64,0.5));" onerror="this.outerHTML='${eqArrow.icon}'">` : eqArrow.icon}</div>
        <div class="arrow-slot-info">
          <div class="arrow-slot-name">${eqArrow.name}</div>
          <div class="arrow-slot-desc">${eqArrow.desc}</div>
          <div class="arrow-slot-badge">${eqArrow.skillsAllowed ? '✓ HABILIDADES LIBERADAS' : '✗ HABILIDADES BLOQUEADAS'}</div>
        </div>
      </div>
    `;
  }

  // Lista de flechas
  const listEl = document.getElementById('arrow-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  arrows.forEach(a => {
    const isEq = a.id === equipped;
    const card = document.createElement('div');
    card.className = 'arrow-card' + (isEq ? ' equipped' : '');
    card.innerHTML = `
      <div class="arrow-card-icon">${a.imgSrc ? `<img src="${a.imgSrc}" style="width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 0 5px rgba(160,192,64,0.4));" onerror="this.outerHTML='${a.icon}'">` : a.icon}</div>
      <div style="flex:1;">
        <div class="arrow-card-name">${a.name}</div>
        <div class="arrow-card-desc">${a.desc}</div>
      </div>
      <div class="arrow-card-eq">${isEq ? '✓' : ''}</div>
    `;
    card.onclick = () => {
      p.equippedArrow = a.id;
      if (a.id === 'negra' && !isEq) {
        const cost = Math.ceil(p.maxHp * 0.10);
        p.hp = Math.max(1, p.hp - cost);
        notify(`🖤 Flecha Negra equipada! -${cost} HP`, '#c060c0');
        updateHUD();
      }
      _updateArrowBtnLabel();
      _updateSkillBlockByArrow(a.id);
      notify(`🏹 ${a.name} equipada!`, '#a0c040');
      buildArrowBagTab();
    };
    listEl.appendChild(card);
  });
}
window.buildArrowBagTab = buildArrowBagTab;

// ── Mostrar aba flechas só para arqueiro ──
const _origOpenBag = window.openBag;
window.openBag = function() {
  if (typeof _origOpenBag === 'function') _origOpenBag();
  const p = G.player;
  const isArcher = p.classData && p.classData.id === 'arqueiro';
  const tabBtn = document.getElementById('btab-flechas');
  if (tabBtn) tabBtn.style.display = isArcher ? '' : 'none';
  if (isArcher) buildArrowBagTab();
};

// ── Aplicar bloqueio de skills quando entra em batalha ──
const _origBuildSkillList = window.buildSkillList;
window.buildSkillList = function() {
  if (typeof _origBuildSkillList === 'function') _origBuildSkillList();
  const p = G.player;
  if (p.classData && p.classData.id === 'arqueiro') {
    _updateSkillBlockByArrow(p.equippedArrow || 'normal');
  }
};

// ══════════════════════════════════════════════════════════════
//  GUIA ELEMENTAL — Animação de Pergaminho
// ══════════════════════════════════════════════════════════════
function abrirGuiaElemental() {
  const overlay = document.getElementById('guia-elemental-overlay');
  const wrapper = document.getElementById('guia-tabela-wrapper');
  if (!overlay || !wrapper) return;

  // Abre o overlay
  overlay.style.display = 'flex';

  // Pequeno delay para o CSS de transição pegar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Calcula altura real da imagem para animar até lá
      const img = wrapper.querySelector('img');
      const alturaAlvo = img ? Math.min(img.naturalHeight || 600, window.innerHeight * 0.55) : 500;
      wrapper.style.maxHeight = alturaAlvo + 'px';
    });
  });
}

function fecharGuiaElemental() {
  const overlay = document.getElementById('guia-elemental-overlay');
  const wrapper = document.getElementById('guia-tabela-wrapper');
  if (!overlay || !wrapper) return;

  // Fecha enrolando
  wrapper.style.maxHeight = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 600);
}

window.abrirGuiaElemental = abrirGuiaElemental;
window.fecharGuiaElemental = fecharGuiaElemental;

// ─────────────────────────────────────────────────────────────
//  FINALIZAÇÃO DE TURNO ASSÍNCRONO
//  Chamado por skills que abrem popup antes de concluir o turno
//  (ex: Selo Invertido do Mago)
// ─────────────────────────────────────────────────────────────
window._finalizarTurnoAssincrono = function(bs, playerActedFlag) {
  const p = G.player;
  const e = bs.enemyData || null;

  updateHUD();
  buildSkillList();

  if (!playerActedFlag) {
    // Turno abortado (cancelou) — devolve controle ao jogador
    bs.phase = 'player';
    setBattleButtons(true);
    updateBattleHUD();
    updateBattleTurnIndicator('player');
    return;
  }

  // Ticks de status do inimigo
  if (e) tickEnemyStatusEffects(bs, e);

  updateBattleHUD();
  buildSkillList();

  // Verifica morte do inimigo
  if (bs.enemyHp <= 0) {
    bs.phase = 'resolving';
    setTimeout(() => endBattle(true, false), 400);
    return;
  }

  // Turno do inimigo
  bs.phase = 'enemy';
  updateBattleTurnIndicator('enemy');
  setBattleButtons(false);
  setTimeout(() => runEnemyTurn(bs, p, e, false), BATTLE_CONFIG.ENEMY_TURN_DELAY || 800);
};
