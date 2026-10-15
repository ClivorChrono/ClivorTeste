// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — paladino_golpe_sagrado_visual.js
//  Bridge file: troca o sprite do Paladino (prepare/attack/recover)
//  só durante a animação do Golpe Sagrado, sem tocar no palDinh.js.
//  Carregar DEPOIS de core/palDinh.js no gat-1.html.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  const _origAnimHeroAttack = window.animHeroAttack;
  if (typeof _origAnimHeroAttack !== 'function') {
    console.warn('[paladino_golpe_sagrado_visual] animHeroAttack não encontrado — bridge não aplicado.');
    return;
  }

  window.animHeroAttack = function () {
    const cls = window.G && window.G.player && window.G.player.classData;
    const isGolpeSagrado =
      window._palGolpeSagradoPending === true &&
      cls && cls.id === 'paladino' &&
      cls.sprite && cls.sprite.golpeSagradoImages;

    // Consome a flag sempre, pra nunca "vazar" pro próximo ataque normal
    window._palGolpeSagradoPending = false;

    if (isGolpeSagrado) {
      _runGolpeSagradoAnim(cls);
      return;
    }
    return _origAnimHeroAttack.apply(this, arguments);
  };

  function _runGolpeSagradoAnim(cls) {
    if (typeof window._clearHeroAnimTimers === 'function') window._clearHeroAnimTimers();

    const imgs = cls.sprite.images;
    const gs   = cls.sprite.golpeSagradoImages;
    // Guarda os originais e troca temporariamente (mesma técnica de swap
    // usada pelas demais animações — sem mexer na estrutura do palDinh.js)
    const backup = { prepare: imgs.prepare, attack: imgs.attack, recover: imgs.recover };
    imgs.prepare = gs.prepare;
    imgs.attack  = gs.attack;
    imgs.recover = gs.recover;

    const el = document.getElementById('bat-hero-icon');

    setHeroAnim('prepare');
    if (el) { el.style.transition = ''; el.style.transform = 'translateX(0px)'; }

    const timers = [];
    timers.push(setTimeout(() => {
      setHeroAnim('attack');
      if (el) { el.style.transition = 'transform 0.2s ease-in'; el.style.transform = 'translateX(18px)'; }
    }, 230));

    timers.push(setTimeout(() => {
      setHeroAnim('recover');
      if (el) { el.style.transition = 'transform 0.18s ease-out'; el.style.transform = 'translateX(6px)'; }
    }, 530));

    timers.push(setTimeout(() => {
      setHeroAnim('idle');
      if (el) { el.style.transition = 'transform 0.22s ease-out'; el.style.transform = 'translateX(0px)'; }
      // Restaura as imagens padrão assim que a animação termina
      imgs.prepare = backup.prepare;
      imgs.attack  = backup.attack;
      imgs.recover = backup.recover;
    }, 870));

    timers.push(setTimeout(() => {
      if (el) { el.style.transition = ''; el.style.transform = ''; }
    }, 1100));
    // Nota: esses timers são locais a este módulo (o array _heroAnimTimers
    // do palDinh.js é privado). Em cliques muito rápidos e repetidos no
    // Golpe Sagrado a sequência pode sobrepor visualmente — mesma borda
    // que as demais animações já tinham antes desse bridge.
  }
})();
