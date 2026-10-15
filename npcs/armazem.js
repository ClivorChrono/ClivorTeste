// ══════════════════════════════════════════════════════════════
//  ARMAZEM.JS — Chronicles of Clivor
//  Armazém do Alberon (dentro da Casa do Alberon, Cidade Kurosaki)
//
//  O que faz:
//   • Pin de baú no canto marcado da casa (abre o armazém ao tocar)
//   • Guardar / retirar item por item (1 ou pilha inteira)
//   • "Guardar tudo" e "Retirar tudo" (valem pro setor aberto)
//   • "Organizar A–Z": junta pilhas iguais e ordena por setor + nome
//   • Setores: Armaduras, Armas, Amuletos, Runas, Materiais, Consumíveis, Outros
//
//  Dados: G.armazem = { itens: [...] } — vai junto no save (o save serializa o G).
//  Itens são movidos INTEIROS (forja, carga do Coração etc. são preservados).
//
//  NÃO podem ser guardados: item equipado, item único, itens-chave
//  (chave, livro, caixa de recompensa, Livro/Cristais de Mana, Mapa da
//  Cidade das Pedra) — o resto do jogo procura esses na bolsa.
//
//  A Bolsa Aitemu (fora da casa) agora também GUARDA: abas Armazém/Bolsa liberadas.
//
//  ATENÇÃO: o craft lê só a BOLSA. Material guardado aqui precisa ser
//  retirado antes de craftar.
//
//  Depende de (runtime): G, notify, buildInventoryGrid, personagemPinMostrar
//  (cidade_kurosaki.js). Ganchos em cidade_kurosaki.js: armazemPinMostrar(),
//  armazemPinRemover() e armazemAbrir().
// ══════════════════════════════════════════════════════════════

'use strict';

// ── Config ──
const ARMAZEM_CONFIG = {
  CENARIO: 'Imagens/Cidade das pedras/caaber.png',
  // Posição do baú na ARTE (fração da imagem, 0–1) — o canto marcado, embaixo da escada.
  // O pin é recalculado pro tamanho real da tela; mexa aqui pra ajustar.
  FX: 0.36, FY: 0.60,
  // Se não der pra calcular, usa estes valores (% do painel da cena)
  FALLBACK_X: 36, FALLBACK_Y: 60,
};

// Ícone do pin (SVG embutido, sem arte nova). Troque por um PNG se quiser.
const _ARMAZEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="32" r="29" fill="rgba(15,10,4,0.82)" stroke="#f0c040" stroke-width="2.5"/>
<rect x="15" y="27" width="34" height="19" rx="2" fill="#8a5a24" stroke="#f0c040" stroke-width="2"/>
<path d="M15 27 Q32 10 49 27 Z" fill="#a8702c" stroke="#f0c040" stroke-width="2"/>
<rect x="28" y="31" width="8" height="10" rx="1" fill="#f0c040"/></svg>`;
ARMAZEM_CONFIG.PIN_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(_ARMAZEM_SVG);

const ARMAZEM_SETORES = [
  { id: 'todos',       nome: 'Tudo',        icon: '📦' },
  { id: 'armaduras',   nome: 'Armaduras',   icon: '🛡️' },
  { id: 'armas',       nome: 'Armas',       icon: '⚔️' },
  { id: 'amuletos',    nome: 'Amuletos',    icon: '📿' },
  { id: 'runas',       nome: 'Runas',       icon: '🔮' },
  { id: 'materiais',   nome: 'Materiais',   icon: '🪨' },
  { id: 'consumiveis', nome: 'Consumíveis', icon: '🧪' },
  { id: 'outros',      nome: 'Outros',      icon: '🎒' },
];

// ── Estado de tela (não salvo) ──
let _armazemView  = 'armazem'; // 'armazem' | 'bolsa'
let _armazemSetor = 'todos';
let _armazemSel   = null;      // índice selecionado na lista da view atual
let _armazemModoSel   = false;      // modo "☑ Vários": arrastar o dedo pra marcar vários itens
let _armazemMulti     = new Set();  // índices marcados (view atual) no modo "Vários"
let _armazemConfirmar = null;       // 'bolsa' | 'armazem' enquanto espera confirmar "tudo" (confirmação própria)
let _armazemDrag      = null;       // estado do arrasto em andamento
let _armazemRemoto    = false;      // aberto pela Bolsa Aitemu (fora da casa): só muda o título
let _armazemLong      = null;       // estado do "segurar" (pressionar e segurar o item = descrição)
let _armazemLongFeito = false;      // true logo após um segurar: ignora o clique que vem em seguida

// ─────────────────────────────────────────────────────────────
//  Dados
// ─────────────────────────────────────────────────────────────
// ── Liberação do armazém ──
// O armazém é liberado na primeira vez que o jogador entra na casa do Alberon (Kurosaki).
// Saves antigos que já têm itens guardados contam como liberados. A receita da Bolsa Aitemu
// (Gozen) só aparece depois disso. (Fonte oficial: G.kurosaki.casaAlberonLiberada.)
function armazemLiberado() {
  if (!G) return false;
  // Fonte oficial: o armazém vem junto com a Casa do Alberon (liberada ao zerar a masmorra Inazami)
  if (G.kurosaki && G.kurosaki.casaAlberonLiberada) return true;
  return !!(G.armazemLiberado || (G.armazem && Array.isArray(G.armazem.itens) && G.armazem.itens.length > 0));
}
function armazemLiberar() {
  if (!G || G.armazemLiberado) return;
  G.armazemLiberado = true;
  if (typeof notify === 'function') notify('🔓 Armazém liberado! Nova receita no Gozen: Bolsa Aitemu.', 'gold');
  if (typeof addLog === 'function') addLog('Armazém do Alberon liberado. O ferreiro Gozen agora pode fazer a Bolsa Aitemu.', 'xp');
}

function armazemInit() {
  if (!G.armazem || !Array.isArray(G.armazem.itens)) G.armazem = { itens: [] };
}

function _armazemSetorDe(item) {
  const slot = item.equipSlot;
  if (slot === 'armadura') return 'armaduras';
  if (slot === 'weapon' || slot === 'arma') return 'armas';
  if (slot === 'acessorio' || item.type === 'acessorio') return 'amuletos';
  if (item.type === 'runa') return 'runas';
  if (item.type === 'material') return 'materiais';
  if (item.type === 'consumível' || item.type === 'consumivel') return 'consumiveis';
  return 'outros';
}

// Retorna o motivo de NÃO poder guardar, ou null se pode.
function _armazemBloqueio(item) {
  if (item.equipped) return 'Equipado — desequipe antes de guardar.';
  if (item.id === 'cristal_elo') return 'Elo feito por Alberon — precisa ficar com você.';
  if (item.unique) return 'Item único — precisa ficar com você.';
  if (['chave', 'livro', 'caixa_recompensa'].includes(item.type)) return 'Item-chave — precisa ficar com você.';
  if (item.abreArmazem || item.id === 'bolsa_aitemu') return 'Item-chave — precisa ficar com você.';
  if (/^(livro_mana|cristal_mana_lv\d|mapa_cidade_pedra)$/.test(item.id || '')) return 'Item-chave — precisa ficar com você.';
  return null;
}

// Pilhável = mesma regra do addItem (tudo que não é 'equipamento')
function _armazemEhPilha(item) { return item.type !== 'equipamento' && !item.chargeable; }

function _armazemLista(view) {
  armazemInit();
  return view === 'bolsa' ? G.player.inventory : G.armazem.itens;
}

function _armazemNoSetor(item) {
  return _armazemSetor === 'todos' || _armazemSetorDe(item) === _armazemSetor;
}

// Move `qtd` unidades (ou o item inteiro, se não for pilha). Retorna quantas moveu.
function _armazemMover(origem, idx, qtd) {
  const src = _armazemLista(origem);
  const dst = _armazemLista(origem === 'bolsa' ? 'armazem' : 'bolsa');
  const item = src[idx];
  if (!item) return 0;
  if (origem === 'bolsa' && _armazemBloqueio(item)) return 0;

  if (!_armazemEhPilha(item)) {
    const inteiro = src.splice(idx, 1)[0];
    delete inteiro.equipped;
    dst.push(inteiro);
    return 1;
  }

  const total = item.qty || 1;
  const n = Math.max(1, Math.min(qtd, total));
  const existente = dst.find(i => i.id === item.id && i.type === item.type && !i.equipped);
  if (existente) {
    existente.qty = (existente.qty || 1) + n;
  } else {
    const copia = JSON.parse(JSON.stringify(item));
    copia.qty = n;
    delete copia.equipped;
    dst.push(copia);
  }
  if (n >= total) src.splice(idx, 1); else item.qty = total - n;
  return n;
}

function _armazemAtualizarJogo() {
  if (typeof buildInventoryGrid === 'function') { try { buildInventoryGrid(); } catch (e) {} }
  if (typeof updateHUD === 'function') { try { updateHUD(); } catch (e) {} }
}

// ─────────────────────────────────────────────────────────────
//  Ações
// ─────────────────────────────────────────────────────────────
function armazemSelecionar(idx) {
  if (_armazemLongFeito) { _armazemLongFeito = false; return; } // veio de um "segurar": só mostra a descrição
  _armazemSel = (_armazemSel === idx) ? null : idx;
  _armazemRender();
}

function armazemMoverSelecionado(modo) { // modo: 'um' | 'tudo'
  if (_armazemSel == null) return;
  const lista = _armazemLista(_armazemView);
  const item = lista[_armazemSel];
  if (!item) { _armazemSel = null; _armazemRender(); return; }
  if (_armazemView === 'bolsa') {
    const b = _armazemBloqueio(item);
    if (b) { notify('🚫 ' + b, 'red'); return; }
  }
  const nome = item.name;
  const n = _armazemMover(_armazemView, _armazemSel, modo === 'tudo' ? Infinity : 1);
  if (n > 0) notify(`${_armazemView === 'bolsa' ? '📦 Guardado' : '🎒 Retirado'}: ${n > 1 ? n + '× ' : ''}${nome}`, 'gold');
  _armazemSel = null;
  _armazemAtualizarJogo();
  _armazemRender();
}

function _armazemExecutarTudo(origem) {
  const lista = _armazemLista(origem);
  let unidades = 0, bloqueados = 0;
  for (let i = lista.length - 1; i >= 0; i--) {
    const it = lista[i];
    if (!_armazemNoSetor(it)) continue;
    if (origem === 'bolsa' && _armazemBloqueio(it)) { bloqueados++; continue; }
    unidades += _armazemMover(origem, i, Infinity);
  }
  _armazemSel = null;
  _armazemMulti.clear();
  _armazemAtualizarJogo();
  _armazemRender();
  if (unidades === 0) {
    notify(bloqueados ? '🚫 Nada que possa ser guardado aqui (itens equipados/chave ficam com você).' : '📭 Nada para mover neste setor.', 'gold');
  } else {
    notify(`${origem === 'bolsa' ? '📦 Guardados' : '🎒 Retirados'}: ${unidades} item(ns)${bloqueados ? ` — ${bloqueados} ficaram na bolsa (equipados/chave)` : ''}`, 'gold');
  }
}

// "Guardar tudo" / "Retirar tudo" — vale pro setor aberto. No setor "Tudo" pede confirmação.
// A confirmação é desenhada DENTRO do armazém: o showCustomConfirm do jogo abre por trás
// dele (z-index menor), então o botão parecia não fazer nada.
function armazemMoverTudo(origem) {
  if (_armazemSetor === 'todos') {
    _armazemConfirmar = origem;
    _armazemSel = null;
    _armazemRender();
  } else {
    _armazemExecutarTudo(origem);
  }
}
function armazemConfirmarTudo(sim) {
  const origem = _armazemConfirmar;
  _armazemConfirmar = null;
  if (sim && origem) _armazemExecutarTudo(origem); else _armazemRender();
}

// ── Modo "☑ Vários": marca itens arrastando o dedo por cima deles ──
function armazemAlternarModoSel() {
  _armazemModoSel = !_armazemModoSel;
  _armazemMulti.clear();
  _armazemSel = null;
  _armazemConfirmar = null;
  _armazemRender();
}

function _armazemSelecionavel(idx) {
  const it = _armazemLista(_armazemView)[idx];
  if (!it) return false;
  if (_armazemView === 'bolsa' && _armazemBloqueio(it)) return false; // 🔒 não marca
  return true;
}

function _armazemPintarCel(idx, ligar) {
  if (!_armazemSelecionavel(idx)) return;
  if (ligar) _armazemMulti.add(idx); else _armazemMulti.delete(idx);
  _armazemAtualizarSelUI();
}

// Atualiza só as células/contador (sem redesenhar tudo — redesenhar no meio do arrasto o cortaria)
function _armazemAtualizarSelUI() {
  document.querySelectorAll('#armazem-grid [data-idx]').forEach(c => {
    const on = _armazemMulti.has(+c.dataset.idx);
    c.style.background  = on ? 'rgba(200,150,10,0.28)' : 'rgba(255,255,255,0.025)';
    c.style.borderColor = on ? 'rgba(240,192,64,0.95)' : 'rgba(200,150,10,0.14)';
    const ck = c.querySelector('.arm-ck');
    if (ck) ck.style.display = on ? 'block' : 'none';
  });
  const n = _armazemMulti.size;
  const info = document.getElementById('armazem-sel-info');
  if (info) info.textContent = n === 1 ? '1 item marcado' : `${n} itens marcados`;
  const go = document.getElementById('armazem-sel-go');
  if (go) { go.style.opacity = n ? '1' : '0.4'; go.textContent = (_armazemView === 'bolsa' ? '⬇ GUARDAR' : '⬆ RETIRAR') + (n ? ` (${n})` : ''); }
}

function armazemSelTodos() {
  const lista = _armazemLista(_armazemView);
  lista.forEach((item, idx) => { if (_armazemNoSetor(item) && _armazemSelecionavel(idx)) _armazemMulti.add(idx); });
  _armazemAtualizarSelUI();
}
function armazemSelLimpar() { _armazemMulti.clear(); _armazemAtualizarSelUI(); }

function armazemMoverMulti() {
  if (!_armazemMulti.size) { notify('☑ Marque itens arrastando o dedo sobre eles.', 'gold'); return; }
  const lista = _armazemLista(_armazemView);
  const idxs = [..._armazemMulti].sort((a, b) => b - a); // de trás pra frente: os índices não deslocam
  let unidades = 0, itens = 0, bloqueados = 0;
  for (const i of idxs) {
    const it = lista[i];
    if (!it) continue;
    if (_armazemView === 'bolsa' && _armazemBloqueio(it)) { bloqueados++; continue; }
    const n = _armazemMover(_armazemView, i, Infinity);
    if (n > 0) { unidades += n; itens++; }
  }
  _armazemMulti.clear();
  _armazemAtualizarJogo();
  _armazemRender();
  if (!itens) { notify('🚫 Nada que possa ser movido nessa seleção.', 'red'); return; }
  notify(`${_armazemView === 'bolsa' ? '📦 Guardados' : '🎒 Retirados'}: ${itens} tipo(s) de item (${unidades} un.)${bloqueados ? ` — ${bloqueados} ficaram (equipados/chave)` : ''}`, 'gold');
}

// Arrasto: o 1º item tocado decide se o arrasto marca ou desmarca; auto-rola perto das bordas.
function _armazemLigarDrag(grid) {
  const celAt = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest ? e.closest('#armazem-grid [data-idx]') : null; };
  const fim = () => { if (_armazemDrag) { cancelAnimationFrame(_armazemDrag.raf); _armazemDrag = null; } };

  grid.addEventListener('pointerdown', e => {
    if (!_armazemModoSel) return;
    const c = celAt(e.clientX, e.clientY);
    if (!c) return;
    e.preventDefault();
    const idx = +c.dataset.idx;
    _armazemDrag = { pintar: !_armazemMulti.has(idx), x: e.clientX, y: e.clientY, raf: 0 };
    try { grid.setPointerCapture(e.pointerId); } catch (_) {}
    _armazemPintarCel(idx, _armazemDrag.pintar);
    const passo = () => {
      if (!_armazemDrag) return;
      const r = grid.getBoundingClientRect(), borda = 48, y = _armazemDrag.y;
      let v = 0;
      if (y < r.top + borda)         v = -Math.ceil((r.top + borda - y) / 5);
      else if (y > r.bottom - borda) v =  Math.ceil((y - (r.bottom - borda)) / 5);
      if (v) {
        grid.scrollTop += Math.max(-18, Math.min(18, v));
        const cc = celAt(_armazemDrag.x, Math.min(r.bottom - 2, Math.max(r.top + 2, y)));
        if (cc) _armazemPintarCel(+cc.dataset.idx, _armazemDrag.pintar);
      }
      _armazemDrag.raf = requestAnimationFrame(passo);
    };
    _armazemDrag.raf = requestAnimationFrame(passo);
  });
  grid.addEventListener('pointermove', e => {
    if (!_armazemDrag) return;
    _armazemDrag.x = e.clientX; _armazemDrag.y = e.clientY;
    const c = celAt(e.clientX, e.clientY);
    if (c) _armazemPintarCel(+c.dataset.idx, _armazemDrag.pintar);
  });
  grid.addEventListener('pointerup', fim);
  grid.addEventListener('pointercancel', fim);
}

// Junta pilhas iguais e ordena por setor + nome (A–Z).
function armazemOrganizar() {
  armazemInit();
  const out = [];
  for (const it of G.armazem.itens) {
    const ex = _armazemEhPilha(it) ? out.find(o => _armazemEhPilha(o) && o.id === it.id && o.type === it.type) : null;
    if (ex) ex.qty = (ex.qty || 1) + (it.qty || 1); else out.push(it);
  }
  const ordem = ARMAZEM_SETORES.map(s => s.id);
  out.sort((a, b) =>
    (ordem.indexOf(_armazemSetorDe(a)) - ordem.indexOf(_armazemSetorDe(b))) ||
    String(a.name).localeCompare(String(b.name), 'pt-BR', { sensitivity: 'base' })
  );
  G.armazem.itens = out;
  _armazemSel = null;
  _armazemMulti.clear();
  _armazemRender();
  notify('🔤 Armazém organizado em ordem alfabética.', 'gold');
}

function armazemTrocarView(v)  { _armazemView = v;  _armazemSel = null; _armazemMulti.clear(); _armazemConfirmar = null; _armazemRender(); }
function armazemTrocarSetor(s) { _armazemSetor = s; _armazemSel = null; _armazemMulti.clear(); _armazemConfirmar = null; _armazemRender(); }

// ─────────────────────────────────────────────────────────────
//  Tela
// ─────────────────────────────────────────────────────────────
function _armazemEsc(t) {
  return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function _armazemDesc(item) {
  const base = (typeof ITEM_DB !== 'undefined' && ITEM_DB[item.id]) || {};
  const d = String(item.desc || base.desc || '').replace(/<[^>]*>/g, '');
  return d.length > 180 ? d.slice(0, 177) + '…' : d;
}

// Descrição completa (sem cortar) — usada no popup de "segurar o item"
function _armazemDescCompleta(item) {
  const base = (typeof ITEM_DB !== 'undefined' && ITEM_DB[item.id]) || {};
  return String(item.desc || base.desc || '').replace(/<[^>]*>/g, '').trim();
}

function armazemDescFechar() {
  const d = document.getElementById('armazem-desc');
  if (d) d.remove();
}

function armazemDescAbrir(idx) {
  const item = _armazemLista(_armazemView)[idx];
  if (!item) return;
  armazemDescFechar();
  const el = _armazemGarantirDOM();
  const F = "font-family:'Noto Serif JP',serif;";
  const setor = ARMAZEM_SETORES.find(s => s.id === _armazemSetorDe(item));
  const total = item.qty || 1;
  const src = (typeof _getItemIconSrc === 'function') ? _getItemIconSrc(item) : item.imgSrc;
  const emoji = _armazemEsc(item.icon || '📦');
  const icone = src
    ? `<img src="${_armazemEsc(src)}" draggable="false" style="width:56px;height:56px;object-fit:contain;mix-blend-mode:screen;" onerror="this.outerHTML='<span style=\\'font-size:2.2rem;\\'>${emoji}</span>'">`
    : `<span style="font-size:2.2rem;">${emoji}</span>`;
  const desc = _armazemDescCompleta(item) || 'Sem descrição.';
  const bloqueio = (_armazemView === 'bolsa') ? _armazemBloqueio(item) : null;

  const d = document.createElement('div');
  d.id = 'armazem-desc';
  d.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:10;padding:18px;';
  d.onclick = (e) => { if (e.target === d) armazemDescFechar(); };
  d.innerHTML = `
    <div style="background:#140d05;border:1px solid rgba(240,192,64,0.7);width:100%;max-width:360px;max-height:80vh;overflow-y:auto;padding:14px;box-sizing:border-box;box-shadow:0 0 24px rgba(0,0,0,0.8);">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;">
        <div style="flex:0 0 64px;height:64px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,10,0.3);">${icone}</div>
        <div style="min-width:0;">
          <div style="${F}font-size:0.95rem;color:#f0c040;line-height:1.3;">${_armazemEsc(item.name)}</div>
          <div style="font-size:0.62rem;color:rgba(200,150,10,0.75);margin-top:3px;letter-spacing:1px;">${setor ? setor.icon + ' ' + setor.nome : ''}${total > 1 ? ' · ×' + total : ''}</div>
        </div>
      </div>
      <div style="${F}font-size:0.78rem;color:rgba(255,255,255,0.85);line-height:1.6;">${_armazemEsc(desc)}</div>
      ${bloqueio ? `<div style="font-size:0.64rem;color:#e08060;margin-top:8px;">🔒 ${_armazemEsc(bloqueio)}</div>` : ''}
      <button onclick="armazemDescFechar()" style="width:100%;margin-top:12px;${F}font-size:0.68rem;letter-spacing:2px;padding:9px;cursor:pointer;background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;">FECHAR</button>
    </div>`;
  el.appendChild(d);
}

// Pressionar e segurar um item (no modo normal) = mostra a descrição completa.
// Se o dedo andar (rolagem) ou soltar antes do tempo, cancela e vale o toque normal.
function _armazemLigarLongPress(grid) {
  const LIM = 450, MOVE = 10;
  const cancelar = () => { if (_armazemLong) { clearTimeout(_armazemLong.t); _armazemLong = null; } };

  grid.addEventListener('pointerdown', e => {
    if (_armazemModoSel) return;
    const c = e.target.closest ? e.target.closest('[data-idx]') : null;
    if (!c) return;
    cancelar();
    const idx = +c.dataset.idx;
    _armazemLong = {
      x: e.clientX, y: e.clientY,
      t: setTimeout(() => {
        _armazemLong = null;
        _armazemLongFeito = true;
        try { if (navigator.vibrate) navigator.vibrate(25); } catch (_) {}
        armazemDescAbrir(idx);
      }, LIM),
    };
  });
  grid.addEventListener('pointermove', e => {
    if (!_armazemLong) return;
    if (Math.abs(e.clientX - _armazemLong.x) > MOVE || Math.abs(e.clientY - _armazemLong.y) > MOVE) cancelar();
  });
  const soltar = () => { cancelar(); if (_armazemLongFeito) setTimeout(() => { _armazemLongFeito = false; }, 350); };
  grid.addEventListener('pointerup', soltar);
  grid.addEventListener('pointercancel', soltar);
  grid.addEventListener('pointerleave', cancelar);
  // Android abre o menu de contexto ao segurar (principalmente em imagem) — bloqueia
  grid.addEventListener('contextmenu', e => e.preventDefault());
}

function _armazemGarantirDOM() {
  let el = document.getElementById('armazem-overlay');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'armazem-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);display:none;align-items:center;justify-content:center;z-index:9999;padding:10px;';
  el.onclick = (e) => { if (e.target === el) armazemFechar(); };
  document.body.appendChild(el);
  return el;
}

function armazemAbrir() {
  armazemInit();
  armazemLiberar();
  _armazemRemoto = false;
  _armazemLongFeito = false;
  _armazemView = 'armazem';
  _armazemSetor = 'todos';
  _armazemSel = null;
  _armazemModoSel = false;
  _armazemMulti.clear();
  _armazemConfirmar = null;
  _armazemGarantirDOM().style.display = 'flex';
  _armazemRender();
}

function armazemFechar() {
  armazemDescFechar();
  _armazemRemoto = false;
  const el = document.getElementById('armazem-overlay');
  if (el) el.style.display = 'none';
  _armazemSel = null;
  _armazemModoSel = false;
  _armazemMulti.clear();
  _armazemConfirmar = null;
  if (_armazemDrag) { cancelAnimationFrame(_armazemDrag.raf); _armazemDrag = null; }
}

function _armazemRender() {
  const el = _armazemGarantirDOM();
  const F = "font-family:'Noto Serif JP',serif;";
  const lista = _armazemLista(_armazemView);
  const visiveis = [];
  lista.forEach((item, idx) => { if (_armazemNoSetor(item)) visiveis.push({ item, idx }); });

  // Guarda a rolagem antes de redesenhar (senão a lista pulava pro topo a cada toque)
  const gridAntigo = document.getElementById('armazem-grid');
  const chipsAntigo = document.getElementById('armazem-chips');
  const scrollTop = gridAntigo ? gridAntigo.scrollTop : 0;
  const chipsLeft = chipsAntigo ? chipsAntigo.scrollLeft : 0;

  const nArm = G.armazem.itens.reduce((s, i) => s + (_armazemEhPilha(i) ? (i.qty || 1) : 1), 0);
  const nBol = G.player.inventory.length;

  const contaSetor = (id) => lista.filter(i => id === 'todos' || _armazemSetorDe(i) === id).length;
  const chips = ARMAZEM_SETORES.map(s => {
    const ativo = s.id === _armazemSetor;
    return `<button onclick="armazemTrocarSetor('${s.id}')" style="flex:0 0 auto;${F}font-size:0.62rem;letter-spacing:1px;padding:6px 9px;cursor:pointer;
      background:${ativo ? 'rgba(200,150,10,0.22)' : 'transparent'};border:1px solid ${ativo ? 'rgba(240,192,64,0.8)' : 'rgba(200,150,10,0.25)'};
      color:${ativo ? '#f0c040' : 'rgba(200,150,10,0.7)'};">${s.icon} ${s.nome} <span style="opacity:.6">${contaSetor(s.id)}</span></button>`;
  }).join('');

  const celulas = visiveis.map(({ item, idx }) => {
    const marcado = _armazemModoSel ? _armazemMulti.has(idx) : idx === _armazemSel;
    const src = (typeof _getItemIconSrc === 'function') ? _getItemIconSrc(item) : item.imgSrc;
    const emoji = _armazemEsc(item.icon || '📦');
    const icone = src
      ? `<img src="${_armazemEsc(src)}" draggable="false" style="width:78%;height:78%;object-fit:contain;mix-blend-mode:screen;pointer-events:none;" onerror="this.outerHTML='<span style=\\'font-size:1.5rem;\\'>${emoji}</span>'">`
      : `<span style="font-size:1.5rem;">${emoji}</span>`;
    const qtd = (item.qty || 1) > 1 ? `<span style="position:absolute;bottom:2px;right:3px;font-size:0.55rem;color:#f0c040;background:rgba(0,0,0,0.65);padding:0 3px;">${item.qty}</span>` : '';
    const bloq = (_armazemView === 'bolsa' && _armazemBloqueio(item)) ? `<span style="position:absolute;top:2px;left:3px;font-size:0.6rem;">🔒</span>` : '';
    const ck = _armazemModoSel ? `<span class="arm-ck" style="position:absolute;top:2px;right:3px;font-size:0.7rem;color:#f0c040;display:${marcado ? 'block' : 'none'};">✔</span>` : '';
    const clique = _armazemModoSel ? '' : `onclick="armazemSelecionar(${idx})"`;
    return `<div data-idx="${idx}" ${clique} style="position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:2px;
      background:${marcado ? (_armazemModoSel ? 'rgba(200,150,10,0.28)' : 'rgba(200,150,10,0.18)') : 'rgba(255,255,255,0.025)'};border:1px solid ${marcado ? 'rgba(240,192,64,0.9)' : 'rgba(200,150,10,0.14)'};">${icone}${qtd}${bloq}${ck}</div>`;
  }).join('');

  const btnP = (txt, fn, extra) => `<button ${extra || ''} onclick="${fn}" style="flex:1;${F}font-size:0.64rem;letter-spacing:1px;padding:8px 6px;cursor:pointer;background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;">${txt}</button>`;
  const btnS = (txt, fn) => `<button onclick="${fn}" style="flex:1;${F}font-size:0.6rem;letter-spacing:1px;padding:8px 4px;cursor:pointer;background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(240,192,64,0.85);">${txt}</button>`;

  // Painel fixo acima dos botões (antes ficava no fim da lista, fora da tela — dava a impressão de que nada funcionava)
  let painel = '';
  const selItem = (!_armazemModoSel && _armazemSel != null) ? lista[_armazemSel] : null;
  if (_armazemConfirmar) {
    const verbo = _armazemConfirmar === 'bolsa' ? 'Guardar' : 'Retirar';
    painel = `<div style="border:1px solid rgba(240,192,64,0.6);background:rgba(200,150,10,0.08);padding:10px;">
      <div style="${F}font-size:0.78rem;color:#f0c040;text-align:center;margin-bottom:8px;">${verbo} TUDO?</div>
      <div style="display:flex;gap:6px;">${btnP('Confirmar', 'armazemConfirmarTudo(true)')}${btnS('Cancelar', 'armazemConfirmarTudo(false)')}</div>
    </div>`;
  } else if (_armazemModoSel) {
    const n = _armazemMulti.size;
    const go = _armazemView === 'bolsa' ? '⬇ GUARDAR' : '⬆ RETIRAR';
    painel = `<div style="border:1px solid rgba(200,150,10,0.3);background:rgba(200,150,10,0.05);padding:8px 10px;">
      <div id="armazem-sel-info" style="${F}font-size:0.78rem;color:#f0c040;">${n === 1 ? '1 item marcado' : n + ' itens marcados'}</div>
      <div style="font-size:0.6rem;color:rgba(255,255,255,0.55);line-height:1.5;margin:3px 0 7px;">Arraste o dedo sobre os itens para marcar. Arraste até a borda de cima/baixo da lista para rolar.</div>
      <div style="display:flex;gap:6px;">
        <button id="armazem-sel-go" onclick="armazemMoverMulti()" style="flex:2;${F}font-size:0.64rem;letter-spacing:1px;padding:8px 6px;cursor:pointer;background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;opacity:${n ? 1 : 0.4};">${go}${n ? ' (' + n + ')' : ''}</button>
        ${btnS('TODOS', 'armazemSelTodos()')}${btnS('LIMPAR', 'armazemSelLimpar()')}
      </div>
    </div>`;
  } else if (selItem) {
    const guardando = _armazemView === 'bolsa';
    const bloqueio = guardando ? _armazemBloqueio(selItem) : null;
    const total = selItem.qty || 1;
    const pilha = _armazemEhPilha(selItem);
    const verbo = guardando ? 'Guardar' : 'Retirar';
    const btn = (txt, modo) => btnP(txt, `armazemMoverSelecionado('${modo}')`);
    painel = `<div style="border:1px solid rgba(200,150,10,0.3);background:rgba(200,150,10,0.05);padding:8px 10px;">
      <div style="${F}font-size:0.8rem;color:#f0c040;">${_armazemEsc(selItem.icon || '')} ${_armazemEsc(selItem.name)}${total > 1 ? ` <span style="opacity:.7">×${total}</span>` : ''}</div>
      <div style="font-size:0.62rem;color:rgba(255,255,255,0.7);line-height:1.45;margin:3px 0 7px;max-height:3em;overflow:hidden;">${_armazemEsc(_armazemDesc(selItem))}</div>
      ${bloqueio
        ? `<div style="font-size:0.66rem;color:#e08060;">🚫 ${_armazemEsc(bloqueio)}</div>`
        : `<div style="display:flex;gap:6px;">${pilha && total > 1 ? btn(`${verbo} 1`, 'um') + btn(`${verbo} tudo (${total})`, 'tudo') : btn(verbo, 'tudo')}</div>`}
    </div>`;
  }

  const vazio = `<div style="grid-column:1/-1;text-align:center;font-size:0.72rem;color:rgba(200,150,10,0.5);padding:26px 8px;line-height:1.6;">
    ${_armazemView === 'armazem' ? 'O armazém está vazio neste setor.<br>Toque em <b>Bolsa</b> para guardar seus itens.' : 'Sua bolsa está vazia neste setor.'}</div>`;

  const tab = (id, txt) => {
    const ativo = _armazemView === id;
    return `<button onclick="armazemTrocarView('${id}')" style="flex:1;${F}font-size:0.7rem;letter-spacing:2px;padding:9px 6px;cursor:pointer;
      background:${ativo ? 'rgba(200,150,10,0.22)' : 'transparent'};border:1px solid ${ativo ? 'rgba(240,192,64,0.8)' : 'rgba(200,150,10,0.3)'};color:${ativo ? '#f0c040' : 'rgba(200,150,10,0.65)'};">${txt}</button>`;
  };
  const acao = (txt, fn, ativo) => `<button onclick="${fn}" style="flex:1;${F}font-size:0.62rem;letter-spacing:1px;padding:9px 4px;cursor:pointer;background:${ativo ? 'rgba(200,150,10,0.28)' : 'transparent'};border:1px solid ${ativo ? 'rgba(240,192,64,0.9)' : 'rgba(200,150,10,0.45)'};color:#f0c040;">${txt}</button>`;

  const gridEstilo = `flex:1;overflow-y:auto;min-height:0;-webkit-overflow-scrolling:touch;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;${_armazemModoSel ? 'touch-action:none;' : ''}`;

  el.innerHTML = `
  <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);width:100%;max-width:420px;height:92vh;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <div style="${F}font-size:0.95rem;color:#f0c040;letter-spacing:2px;">${_armazemRemoto ? '👝 BOLSA AITEMU' : '📦 ARMAZÉM DE ALBERON'}</div>
      <div style="display:flex;gap:6px;">
        <button onclick="aitemuTutorialAbrir()" title="Como funciona" style="background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.8);width:30px;height:30px;cursor:pointer;">?</button>
        <button onclick="armazemFechar()" style="background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.8);width:30px;height:30px;cursor:pointer;">✕</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px;">${tab('armazem', `🏚 ARMAZÉM (${nArm})`)}${tab('bolsa', `🎒 BOLSA (${nBol})`)}</div>
    <div id="armazem-chips" style="display:flex;gap:5px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px;">${chips}</div>
    <div id="armazem-grid" style="${gridEstilo}">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;">${celulas || vazio}</div>
    </div>
    ${painel ? `<div style="margin-top:8px;">${painel}</div>` : ''}
    <div style="display:flex;gap:6px;margin-top:8px;">
      ${acao('⬇ GUARDAR TUDO', "armazemMoverTudo('bolsa')")}
      ${acao('⬆ RETIRAR TUDO', "armazemMoverTudo('armazem')")}
      ${acao('🔤 A–Z', 'armazemOrganizar()')}
      ${acao('☑ VÁRIOS', 'armazemAlternarModoSel()', _armazemModoSel)}
    </div>
    <div style="font-size:0.56rem;color:rgba(200,150,10,0.45);text-align:center;margin-top:6px;line-height:1.5;">Segure um item para ver a descrição. Guardar/retirar tudo vale para o setor aberto. 🔒 = equipado ou item-chave (fica na bolsa). O craft só usa o que está na bolsa — mas o Alberon conta o que está aqui nos materiais dele.</div>
  </div>`;

  // Restaura a rolagem e liga o arrasto (modo ☑ Vários)
  const grid = document.getElementById('armazem-grid');
  if (grid) {
    grid.scrollTop = scrollTop;
    if (_armazemModoSel) _armazemLigarDrag(grid);
    else _armazemLigarLongPress(grid);
  }
  const ch = document.getElementById('armazem-chips');
  if (ch) ch.scrollLeft = chipsLeft;
}

// ─────────────────────────────────────────────────────────────
//  Pin do baú na Casa do Alberon
// ─────────────────────────────────────────────────────────────
function _armazemCalcPin(img) {
  const painel = document.querySelector('.scene-panel');
  const bg = document.getElementById('scene-bg');
  if (!painel || !bg || !img.naturalWidth) return null;
  const pr = painel.getBoundingClientRect(), br = bg.getBoundingClientRect();
  if (!pr.width || !br.width || !br.height) return null;
  // O fundo da casa usa background-size:cover + position:center
  const esc = Math.max(br.width / img.naturalWidth, br.height / img.naturalHeight);
  const w = img.naturalWidth * esc, h = img.naturalHeight * esc;
  const px = br.left + (br.width  - w) / 2 + ARMAZEM_CONFIG.FX * w;
  const py = br.top  + (br.height - h) / 2 + ARMAZEM_CONFIG.FY * h;
  const clamp = v => Math.min(97, Math.max(3, v));
  return { x: clamp((px - pr.left) / pr.width * 100), y: clamp((py - pr.top) / pr.height * 100) };
}

function _armazemNaCasa() {
  return typeof _kurosakiEmCasaAlberon !== 'undefined' && !!_kurosakiEmCasaAlberon;
}

function armazemPinMostrar() {
  armazemLiberar();
  if (typeof personagemPinMostrar !== 'function') return;
  const colocar = (x, y) => personagemPinMostrar({ id: 'armazem_alberon', x, y, img: ARMAZEM_CONFIG.PIN_IMG, alt: 'Armazém', onClick: armazemAbrir });
  colocar(ARMAZEM_CONFIG.FALLBACK_X, ARMAZEM_CONFIG.FALLBACK_Y);
  const img = new Image();
  img.onload = () => {
    if (!_armazemNaCasa()) return;
    try { const p = _armazemCalcPin(img); if (p) colocar(p.x, p.y); } catch (e) {}
  };
  img.src = ARMAZEM_CONFIG.CENARIO;
}

function armazemPinRemover() {
  if (typeof personagemPinRemover === 'function') personagemPinRemover('armazem_alberon');
  armazemFechar();
}

// ─────────────────────────────────────────────────────────────
//  Tutorial da Bolsa Aitemu (mesmo visual dos outros tutoriais do jogo)
//  Aparece sozinho UMA vez, na primeira vez que a receita surge no Gozen
//  (G._tutorialAitemuSeen). O "?" do armazém reabre quando quiser.
// ─────────────────────────────────────────────────────────────
const AITEMU_TUTORIAL = [
  { icon: '👝', titulo: 'Bolsa Aitemu',
    texto: 'Com o armazém do Alberon liberado, o ferreiro <strong>Gozen</strong> agora sabe fazer a <strong>Bolsa Aitemu</strong>: uma bolsa encantada ligada ao seu armazém.',
    dica: '💡 Você só pode ter <strong>uma</strong> Bolsa Aitemu.' },
  { icon: '⚗️', titulo: 'Como fazer',
    texto: 'No <strong>Craft de Itens</strong> do Gozen, junte <strong>10 Teia</strong>, <strong>15 Pele de Lobo</strong>, <strong>6 Lã Encantada</strong> e <strong>2.000 moedas</strong>. Atenção: o craft só usa o que está na <strong>bolsa</strong> — retire do armazém antes.' },
  { icon: '📦', titulo: 'Como usar',
    texto: 'Toque na <strong>Bolsa Aitemu</strong> na sua bolsa de itens para abrir o armazém <strong>de qualquer lugar</strong>. Use as abas <strong>Armazém</strong> e <strong>Bolsa</strong> para retirar o que precisar ou guardar o que não precisa.',
    dica: '✋ No armazém, <strong>segure</strong> um item para ver a descrição.' },
  { icon: '🚫', titulo: 'Limites',
    texto: 'Itens <strong>equipados</strong>, únicos e itens-chave não podem ser guardados. A Bolsa Aitemu também <strong>não funciona em batalha nem em masmorras</strong>.' },
];
let _aitemuTutPasso = 0;

function _aitemuTutGarantirDOM() {
  let ov = document.getElementById('aitemu-tutorial-overlay');
  if (ov) return ov;
  ov = document.createElement('div');
  ov.id = 'aitemu-tutorial-overlay';
  ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,0.88);align-items:center;justify-content:center;backdrop-filter:blur(3px);';
  ov.onclick = (e) => { if (e.target === ov) aitemuTutorialFechar(); };
  document.body.appendChild(ov);
  return ov;
}

function _aitemuTutRender() {
  const ov = _aitemuTutGarantirDOM();
  const total = AITEMU_TUTORIAL.length;
  const st = AITEMU_TUTORIAL[_aitemuTutPasso];
  const ultimo = _aitemuTutPasso === total - 1;
  const dots = AITEMU_TUTORIAL.map((_, i) => `<div class="tutorial-dot ${i === _aitemuTutPasso ? 'active' : ''}"></div>`).join('');
  ov.innerHTML = `
    <div class="tutorial-box">
      <div class="tutorial-header">
        <span class="tutorial-title">👝 BOLSA AITEMU</span>
        <button class="tutorial-close" onclick="aitemuTutorialFechar()">✕</button>
      </div>
      <div class="tutorial-step active">
        <div class="tutorial-step-num">PASSO ${_aitemuTutPasso + 1} / ${total}</div>
        <div class="tutorial-step-icon">${st.icon}</div>
        <div class="tutorial-step-title">${st.titulo}</div>
        <div class="tutorial-step-text">${st.texto}</div>
        ${st.dica ? `<div class="tutorial-step-highlight">${st.dica}</div>` : ''}
      </div>
      <div class="tutorial-dots">${dots}</div>
      <div class="tutorial-nav">
        <button class="tutorial-nav-btn" style="visibility:${_aitemuTutPasso === 0 ? 'hidden' : 'visible'};" onclick="aitemuTutorialNav(-1)">← Anterior</button>
        <button class="tutorial-nav-btn primary" onclick="${ultimo ? 'aitemuTutorialFechar()' : 'aitemuTutorialNav(1)'}">${ultimo ? '✓ Entendido' : 'Próximo →'}</button>
      </div>
    </div>`;
}

function aitemuTutorialAbrir() {
  _aitemuTutPasso = 0;
  _aitemuTutRender();
  _aitemuTutGarantirDOM().style.display = 'flex';
  if (G) G._tutorialAitemuSeen = true;
}
function aitemuTutorialFechar() {
  const ov = document.getElementById('aitemu-tutorial-overlay');
  if (ov) ov.style.display = 'none';
}
function aitemuTutorialNav(dir) {
  _aitemuTutPasso = Math.max(0, Math.min(AITEMU_TUTORIAL.length - 1, _aitemuTutPasso + dir));
  _aitemuTutRender();
}
// Chamada pelo craft do Gozen: só abre se a receita já está liberada e o tutorial ainda não foi visto
function aitemuTutorialPrimeiraVez() {
  if (!G || G._tutorialAitemuSeen || !armazemLiberado()) return;
  aitemuTutorialAbrir();
}

// ── Bolsa Aitemu: abre o armazém de qualquer lugar (só retirar) ──
// Não funciona em batalha nem em masmorra. Dentro da casa do Alberon abre o armazém completo.
function _armazemLocalBloqueado() {
  if (G.inBattle) return 'em batalha';
  const loc = String(G.location || '');
  if (/^(dungeon-|kappa-|tve-)/.test(loc) || G.dungeonSombrasBloqueio) return 'em masmorras';
  return null;
}
function armazemUsarBolsa() {
  const b = _armazemLocalBloqueado();
  if (b) { notify(`🚫 A Bolsa Aitemu não funciona ${b}.`, 'red'); return; }
  if (_armazemNaCasa()) { armazemAbrir(); return; }
  armazemAbrir();
  _armazemRemoto = true;
  _armazemRender();
}

// Girou a tela / redimensionou: reposiciona o pin
window.addEventListener('resize', () => {
  if (_armazemNaCasa() && document.getElementById('personagem-pin-armazem_alberon')) armazemPinMostrar();
});

window.armazemAbrir = armazemAbrir;
window.armazemUsarBolsa = armazemUsarBolsa;
window.armazemLiberado = armazemLiberado;
window.armazemLiberar = armazemLiberar;
window.aitemuTutorialAbrir = aitemuTutorialAbrir;
window.aitemuTutorialFechar = aitemuTutorialFechar;
window.aitemuTutorialNav = aitemuTutorialNav;
window.aitemuTutorialPrimeiraVez = aitemuTutorialPrimeiraVez;
window.armazemFechar = armazemFechar;
window.armazemPinMostrar = armazemPinMostrar;
window.armazemPinRemover = armazemPinRemover;
window.armazemSelecionar = armazemSelecionar;
window.armazemDescAbrir = armazemDescAbrir;
window.armazemDescFechar = armazemDescFechar;
window.armazemMoverSelecionado = armazemMoverSelecionado;
window.armazemMoverTudo = armazemMoverTudo;
window.armazemOrganizar = armazemOrganizar;
window.armazemTrocarView = armazemTrocarView;
window.armazemTrocarSetor = armazemTrocarSetor;
window.armazemConfirmarTudo = armazemConfirmarTudo;
window.armazemAlternarModoSel = armazemAlternarModoSel;
window.armazemMoverMulti = armazemMoverMulti;
window.armazemSelTodos = armazemSelTodos;
window.armazemSelLimpar = armazemSelLimpar;
