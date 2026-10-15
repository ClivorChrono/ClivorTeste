// ═══════════════════════════════════════════════════════════════════
//  hik_sprite_demo.js — TESTE DE SPRITES (montado do zero)
//  Carregado automaticamente pelo gat-1.html só porque esse arquivo
//  existe na raiz do projeto. Pra desativar: apaga o arquivo da
//  pasta — não precisa mexer em mais nada.
//
//  O QUE FAZ:
//  Um 📌 PIN fixo no MEIO da tela. Clicando nele, abre uma batalha
//  de teste contra o Hi-no-Kagutsuchi — só pra validar se os sprite
//  sheets aparecem certos:
//
//    • Ataque normal  → troca o retrato do boss pro sheet
//      hik_battle_sheet_vertical.png (4 frames: garra solta → mãos
//      se juntando → mãos juntas → garras erguidas)
//    • ☄️ Purgatório   → troca pro sheet purgatorio_sheet_vertical.png
//      (4 frames de conjuração)
//    • Sem skill (idle) → volta pro ícone normal (OniC.png)
//
//  ⚠️ SEM DANO NENHUM — é só um teste visual. Você não perde HP de
//  verdade (não mexe no G.player, no save, em nada do motor real).
//  O "Atacar" só serve pra baixar o HP de mentirinha do Oni e ver
//  ele reagir/trocar de sprite.
//
//  ⚠️ PENDENTE: o Purgg.png (a esfera de fogo explodindo, a VFX da
//  skill em si) ainda não foi enviado — quando enviar, eu preencho
//  HIK_PURGG_SHEET/FRAME_W/FRAME_H/FRAMES abaixo e ativo
//  HIK_PURGG_ATIVO pra ela aparecer por cima do sprite de conjuração.
// ═══════════════════════════════════════════════════════════════════
(function () {
  // ── Sheets ──
  const HIK_IDLE_IMG = (window.HI_NO_KAGUTSUCHI && window.HI_NO_KAGUTSUCHI.sprite) || 'Imagens/icones/OniC.png';

  const HIK_ATAQUE_SHEET   = 'Imagens/icones/HikDemo/hik_battle_sheet_vertical.png';
  const HIK_ATAQUE_FRAME_W = 418;
  const HIK_ATAQUE_FRAME_H = 660;
  const HIK_ATAQUE_FRAMES  = 4;
  const HIK_ATAQUE_FRAME_MS = 150;

  const HIK_PURGATORIO_SHEET   = 'Imagens/purgatorio_sheet_vertical.png';
  const HIK_PURGATORIO_FRAME_W = 307;
  const HIK_PURGATORIO_FRAME_H = 486;
  const HIK_PURGATORIO_FRAMES  = 4;
  const HIK_PURGATORIO_FRAME_MS = 160;

  // AJUSTE quando o Purgg.png (VFX da bola de fogo) for enviado:
  const HIK_PURGG_ATIVO   = false;
  const HIK_PURGG_SHEET   = 'Imagens/inazami masmorra/Purgg.png'; // caminho onde você salvou
  const HIK_PURGG_FRAME_W = 0; // AJUSTE: largura de 1 frame
  const HIK_PURGG_FRAME_H = 0; // AJUSTE: altura de 1 frame
  const HIK_PURGG_FRAMES  = 6; // 6 estágios, pela imagem que você mostrou

  // ── estado da luta de teste (tudo de mentirinha, isolado) ──
  let hpOni = 100;
  const HP_ONI_MAX = 100;
  let lutaAcabou = false;
  let trocandoSprite = false;

  function log(msg, cor) {
    const box = document.getElementById('hik-teste-log');
    if (!box) return;
    const linha = document.createElement('div');
    linha.style.cssText = `padding:4px 0; color:${cor || '#e8dcc8'}; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.06);`;
    linha.textContent = msg;
    box.appendChild(linha);
    box.scrollTop = box.scrollHeight;
  }

  function atualizarBarraOni() {
    const barra = document.getElementById('hik-teste-hp-oni');
    const txt   = document.getElementById('hik-teste-hp-oni-txt');
    if (barra) barra.style.width = Math.max(0, (hpOni / HP_ONI_MAX) * 100) + '%';
    if (txt)   txt.textContent = `${Math.max(0, hpOni)} / ${HP_ONI_MAX}`;
  }

  // Troca o retrato do boss por um sheet, avança os frames, e no
  // final volta pro retrato idle normal.
  function tocarSheetNoRetrato(sheetSrc, frameW, frameH, frameCount, frameMs, onFimCb) {
    const retrato = document.getElementById('hik-teste-retrato');
    const janela  = document.getElementById('hik-teste-retrato-janela');
    if (!retrato || !janela) return;

    trocandoSprite = true;
    janela.style.width  = frameW + 'px';
    janela.style.height = frameH + 'px';
    retrato.src = sheetSrc;
    retrato.style.width = frameW + 'px';
    retrato.style.height = 'auto';

    let frame = 0;
    const passarFrame = () => {
      retrato.style.top = (-frame * frameH) + 'px';
      frame++;
      if (frame >= frameCount) {
        setTimeout(() => {
          voltarParaIdle();
          trocandoSprite = false;
          if (onFimCb) onFimCb();
        }, frameMs + 100);
        return;
      }
      setTimeout(passarFrame, frameMs);
    };
    passarFrame();
  }

  function voltarParaIdle() {
    const retrato = document.getElementById('hik-teste-retrato');
    const janela  = document.getElementById('hik-teste-retrato-janela');
    if (!retrato || !janela) return;
    janela.style.width  = '220px';
    janela.style.height = '220px';
    retrato.src = HIK_IDLE_IMG;
    retrato.style.width  = '220px';
    retrato.style.height = '220px';
    retrato.style.top = '0px';
  }

  function tocarAtaqueNormal(cb) {
    log('🗡️ Hi-no-Kagutsuchi ataca! (sem dano — só teste visual)', '#ff9e6b');
    tocarSheetNoRetrato(HIK_ATAQUE_SHEET, HIK_ATAQUE_FRAME_W, HIK_ATAQUE_FRAME_H, HIK_ATAQUE_FRAMES, HIK_ATAQUE_FRAME_MS, cb);
  }

  function tocarPurgatorio(cb) {
    log('☄️ Purgatório! Ele conjura a bola de fogo... (sem dano — só teste visual)', '#ffcf6b');
    tocarSheetNoRetrato(HIK_PURGATORIO_SHEET, HIK_PURGATORIO_FRAME_W, HIK_PURGATORIO_FRAME_H, HIK_PURGATORIO_FRAMES, HIK_PURGATORIO_FRAME_MS, () => {
      if (HIK_PURGG_ATIVO) {
        // TODO: quando o Purgg.png entrar, tocar aqui como um overlay
        // por cima do retrato (mesma técnica, elemento à parte).
      }
      if (cb) cb();
    });
  }

  function turnoDoOni() {
    if (lutaAcabou) return;
    const usaPurgatorio = Math.random() < 0.45;
    if (usaPurgatorio) {
      tocarPurgatorio();
    } else {
      tocarAtaqueNormal();
    }
  }

  function atacar() {
    if (lutaAcabou || trocandoSprite) return;
    const dano = 12 + Math.floor(Math.random() * 10);
    hpOni = Math.max(0, hpOni - dano);
    log(`⚔️ Você ataca! -${dano} HP de teste no Oni.`, '#9ed1ff');
    atualizarBarraOni();

    if (hpOni <= 0) {
      lutaAcabou = true;
      log('🏆 HP de teste zerado — sprites confirmados! (isso não é uma derrota real do boss)', '#ffd700');
      return;
    }
    turnoDoOni();
  }

  function fecharLuta() {
    const overlay = document.getElementById('hik-teste-overlay');
    if (overlay) overlay.remove();
  }

  function abrirLuta() {
    if (typeof window.HI_NO_KAGUTSUCHI === 'undefined') {
      alert('HI_NO_KAGUTSUCHI não encontrado — confira se dungeons/inazami_completo.js foi carregado.');
      return;
    }
    if (document.getElementById('hik-teste-overlay')) return;

    hpOni = HP_ONI_MAX;
    lutaAcabou = false;
    trocandoSprite = false;

    const overlay = document.createElement('div');
    overlay.id = 'hik-teste-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(8,6,10,0.94);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Noto Serif JP', serif;
    `;

    overlay.innerHTML = `
      <div style="width:92%; max-width:420px; background:#15100e; border:1px solid rgba(255,150,90,0.35);
                  border-radius:12px; padding:16px; box-shadow:0 0 30px rgba(255,90,30,0.25);">
        <div style="text-align:center; color:#ff9e6b; font-size:0.68rem; letter-spacing:2px; margin-bottom:10px;">
          🧪 TESTE DE SPRITES — HI-NO-KAGUTSUCHI (sem dano real)
        </div>

        <div style="display:flex; justify-content:center; margin-bottom:10px;">
          <div id="hik-teste-retrato-janela" style="width:220px; height:220px; overflow:hidden; position:relative;
                      border-radius:10px; background:rgba(0,0,0,0.3); filter:drop-shadow(0 0 14px rgba(255,110,40,0.5));">
            <img id="hik-teste-retrato" src="${HIK_IDLE_IMG}" style="position:absolute; left:0; top:0; width:220px; height:220px; object-fit:contain;">
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; color:#ffb066; font-size:0.72rem;">
            <span>👹 HP de teste</span><span id="hik-teste-hp-oni-txt"></span>
          </div>
          <div style="height:9px; border-radius:5px; background:rgba(255,255,255,0.08); overflow:hidden;">
            <div id="hik-teste-hp-oni" style="height:100%; width:100%; background:linear-gradient(90deg,#c81e1e,#ff7a2e); transition:width 0.3s;"></div>
          </div>
        </div>

        <div id="hik-teste-log" style="height:160px; overflow-y:auto; background:rgba(0,0,0,0.35);
                    border-radius:8px; padding:8px; margin-bottom:12px;"></div>

        <div style="display:flex; gap:8px;">
          <button id="hik-teste-btn-atacar" style="flex:1; padding:10px; border:none; border-radius:8px;
                  background:#8b1e1e; color:#fff; font-weight:bold; font-size:0.85rem;">⚔️ Atacar (de teste)</button>
          <button id="hik-teste-btn-fechar" style="padding:10px 14px; border:none; border-radius:8px;
                  background:#333; color:#ddd; font-size:0.85rem;">Fechar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    atualizarBarraOni();
    log('👹 Hi-no-Kagutsuchi surge das sombras. (luta de teste — invulnerável pra você)', '#ff9e6b');

    document.getElementById('hik-teste-btn-atacar').onclick = atacar;
    document.getElementById('hik-teste-btn-fechar').onclick = fecharLuta;
  }

  // ── PIN fixo no meio da tela ──
  function criarPin() {
    if (document.getElementById('hik-teste-pin')) return;

    const pin = document.createElement('div');
    pin.id = 'hik-teste-pin';
    pin.title = 'Testar batalha do Hi-no-Kagutsuchi';
    pin.style.cssText = `
      position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
      z-index: 9999; width: 52px; height: 52px; border-radius: 50%;
      background: radial-gradient(circle, #ff7a2e 0%, #8b1e1e 70%);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; cursor: pointer;
      box-shadow: 0 0 16px rgba(255,110,40,0.75), 0 0 0 2px rgba(255,220,180,0.4);
      animation: hikPinPulse 1.6s ease-in-out infinite;
    `;
    pin.textContent = '📌';

    if (!document.getElementById('hik-teste-pin-style')) {
      const style = document.createElement('style');
      style.id = 'hik-teste-pin-style';
      style.textContent = `
        @keyframes hikPinPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%      { transform: translate(-50%, -50%) scale(1.12); }
        }
      `;
      document.head.appendChild(style);
    }

    pin.onclick = abrirLuta;
    document.body.appendChild(pin);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarPin);
  } else {
    criarPin();
  }
})();
