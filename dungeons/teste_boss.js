/* ══════════════════════════════════════════════════════════
   TESTE — boss isolado pra validar as 3 sprite sheets do
   Purgatório em batalha, com PIN de verdade na Floresta.
   Usa as funções e classes reais do jogo (startBattle,
   ENEMY_AI, buildEnemyVisual, calcEnemyDmg, applyDmgToPlayer,
   appendBattleLog, setScene, svp-marker/svp-pin/svp-label).
   ══════════════════════════════════════════════════════════ */

// ── 1. O INIMIGO ──
window.ENEMY_TESTE = {
  id: 'teste',
  name: 'Teste',
  icon: '👹',
  hp: 500,
  atk: 60,
  def: 0,
  xp: 0,
  gold: 0,
  isBoss: true,
  elemento: 'neutro',
  desc: 'Inimigo de teste para validar as sprite sheets do Purgatório em batalha.',
  spriteImages: {
    idle: 'Imagens/purgatorio_sheet_vertical.png', // print 1
  },
  loot: [],
};

// ── 2. A SKILL "PURGATÓRIO" ──
window.ENEMY_AI = window.ENEMY_AI || {};
window.ENEMY_AI['teste'] = {
  name: 'sombrio',
  specialName: 'Purgatório',
  specialIcon: '🔥',
  specialDesc: 'Invoca uma coluna de fogo purificador.',
  special(bs, p, e) {
    const dano = calcEnemyDmg(e, p, bs, 1.8);
    applyDmgToPlayer(dano, bs, p);
    appendBattleLog(`🔥 ${e.name} usa Purgatório! -${dano} HP!`, '#ff4020');

    const batIcon = document.getElementById('bat-enemy-icon');
    if (!batIcon) return;

    // print 2 — pose da skill
    batIcon.innerHTML = buildEnemyVisual(
      Object.assign({}, e, { spriteImages: { idle: 'Imagens/icones/HikDemo/hik_sheet_b.png' } }),
      112, 'idle'
    );
    setTimeout(() => {
      // print 3 — efeito visual da skill
      batIcon.innerHTML = buildEnemyVisual(
        Object.assign({}, e, { spriteImages: { idle: 'Imagens/inazami masmorra/Purgg.png' } }),
        112, 'idle'
      );
      setTimeout(() => {
        if (window.G && G.currentEnemy === e) {
          batIcon.innerHTML = buildEnemyVisual(e, 112, 'idle'); // volta pro print 1
        }
      }, 700);
    }, 500);
  }
};

// ── 3. O PIN NA FLORESTA ──
// Usa as MESMAS classes CSS que os pins do Vilarejo/Mapa-Múndi (svp-marker
// / svp-pin / svp-label), dentro do mesmo container real (.scene-icons).
// A visibilidade é controlada plugando na função setScene() de verdade,
// que já guarda a cena atual em G.location.
(function () {
  function criarPin() {
    if (document.getElementById('scene-teste-pins')) return true;
    const iconsWrap = document.querySelector('.scene-icons');
    if (!iconsWrap) return false;

    const container = document.createElement('div');
    container.id = 'scene-teste-pins';
    container.style.cssText = 'position:absolute;inset:0;display:none;';
    container.innerHTML =
      '<div class="svp-marker" id="pin-teste-boss" style="left:50%;top:78%;">' +
      '<div class="svp-pin" style="border-color:#c81010;box-shadow:0 0 14px rgba(200,16,16,0.7),0 2px 8px rgba(0,0,0,0.8);">👹</div>' +
      '<div class="svp-label" style="border-color:rgba(200,16,16,0.5);color:#ff5050;">Teste</div>' +
      '</div>';
    iconsWrap.appendChild(container);
    document.getElementById('pin-teste-boss').onclick = function () { startBattle(ENEMY_TESTE); };
    return true;
  }

  function atualizarVisibilidade() {
    if (!criarPin()) return;
    const container = document.getElementById('scene-teste-pins');
    const naFloresta = window.G && (G.location === 'floresta' || G.location === 'floresta2');
    container.style.display = naFloresta ? 'block' : 'none';
  }

  // Plugado na função real de troca de cena — dispara toda vez que
  // o jogador entra ou sai da Floresta.
  const _origSetScene = window.setScene;
  if (typeof _origSetScene === 'function') {
    window.setScene = function (loc) {
      const r = _origSetScene.apply(this, arguments);
      atualizarVisibilidade();
      return r;
    };
  }

  // Cobre o caso de a cena inicial já ser a Floresta ao carregar a página.
  window.addEventListener('load', atualizarVisibilidade);
  setTimeout(atualizarVisibilidade, 800);
})();
