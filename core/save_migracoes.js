// ══════════════════════════════════════════════════════════════
//  SAVE_MIGRACOES.JS — Chronicles of Clivor
//  Migrações de save COM VERSÃO.
//
//  Como funciona:
//   • O save guarda o número da versão (_saveVersion). SAVE_VERSION
//     (em palDinh.js) é a versão atual do jogo.
//   • Cada migração tem um número de versão e roda UMA vez: só em saves
//     com versão menor que a dela. Depois o save fica na versão nova.
//   • Se uma migração der erro, o jogo carrega mesmo assim e o save
//     NÃO avança de versão — ela tenta de novo na próxima carga.
//
//  Para criar uma migração nova (ex.: mudou o formato de algo):
//   1) suba SAVE_VERSION em palDinh.js (ex.: 3 → 4)
//   2) registre aqui:
//        registrarMigracaoSave(4, 'nome_curto', G => { ...muda o G... });
//
//  As correções antigas que ainda estão dentro do loadGame (palDinh.js)
//  continuam lá, funcionando como antes. Só as novas entram aqui.
//  Carregar DEPOIS de palDinh.js.
// ══════════════════════════════════════════════════════════════
'use strict';

(function () {
  const _lista = [];

  function registrarMigracaoSave(versao, nome, fn) {
    _lista.push({ versao: Number(versao) || 0, nome: String(nome || '?'), fn });
    _lista.sort((a, b) => a.versao - b.versao);
  }

  // Roda as migrações pendentes sobre o estado carregado (G). Devolve um resumo.
  function rodarMigracoesSave(estado, versaoSalva) {
    const alvo = (typeof SAVE_VERSION !== 'undefined')
      ? SAVE_VERSION
      : Math.max(0, ..._lista.map(m => m.versao));
    const v0 = Number(versaoSalva) || 0;
    let versaoFinal = v0;
    let falhou = false;
    const feitas = [];
    const falhas = [];

    for (const m of _lista) {
      if (m.versao <= v0 || m.versao > alvo) continue;
      try {
        m.fn(estado);
        feitas.push(`v${m.versao}:${m.nome}`);
        versaoFinal = m.versao;
      } catch (e) {
        falhou = true;
        falhas.push(`v${m.versao}:${m.nome} — ${e && e.message}`);
        console.error('[save] migração falhou:', m.nome, e);
        break; // não pula uma migração com erro: tenta de novo na próxima carga
      }
    }
    if (!falhou) versaoFinal = Math.max(versaoFinal, alvo);

    estado._saveVersion = versaoFinal;
    if (feitas.length) {
      estado._migracoes = (Array.isArray(estado._migracoes) ? estado._migracoes : []).concat(feitas).slice(-40);
      console.info('[save] migrações aplicadas:', feitas.join(', '));
    }
    if (falhas.length && window.VIGIA && typeof window.VIGIA.registrar === 'function') {
      falhas.forEach(f => window.VIGIA.registrar('migracao', 'Migração de save falhou: ' + f));
    }
    return { de: v0, para: versaoFinal, feitas, falhas };
  }

  // ───────────────────────────────────────────────────────────
  //  v3 — limpeza das listas de itens e do armazém
  //  (só roda uma vez em cada save antigo)
  // ───────────────────────────────────────────────────────────
  registrarMigracaoSave(3, 'limpar_listas_de_itens', G => {
    const limpar = (lista) => {
      if (!Array.isArray(lista)) return lista;
      const out = lista.filter(it => it && it.id);
      out.forEach(it => {
        if (typeof it.qty === 'number' && !isFinite(it.qty)) it.qty = 1;
      });
      return out;
    };
    if (G.player && Array.isArray(G.player.inventory)) {
      G.player.inventory = limpar(G.player.inventory);
    }
    // Armazém: se existir mas estiver com formato errado, arruma
    if (G.armazem !== undefined && G.armazem !== null) {
      if (typeof G.armazem !== 'object' || !Array.isArray(G.armazem.itens)) {
        G.armazem = { itens: [] };
      } else {
        G.armazem.itens = limpar(G.armazem.itens);
      }
    }
  });

  window.registrarMigracaoSave = registrarMigracaoSave;
  window.rodarMigracoesSave = rodarMigracoesSave;
  window.SAVE_MIGRACOES = _lista;
})();
