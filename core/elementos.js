// ══════════════════════════════════════════════════════════════
//  ELEMENTOS.JS — Sistema de Afinidade Elemental
//  Chronicles of Clivor
// ──────────────────────────────────────────────────────────────
//  Extraído de palDinh.js para isolar e organizar o sistema de
//  elementos do jogo. Este arquivo DEVE ser carregado ANTES de
//  palDinh.js (e de qualquer outro arquivo que use elementos em
//  batalha) no <script> do gat-1.html, pois expõe suas funções e
//  dados no escopo global (window), no mesmo padrão dos demais
//  arquivos do projeto (sem módulos ES).
//
//  Como ler a grade AFINIDADE_ELEMENTAL:
//  Cada chave é o elemento do INIMIGO (quem está sendo atacado).
//    "forte" = elementos que, ao ATACAR esse inimigo, causam 1.7x
//              de dano (vantagem elemental)
//    "fraco" = elementos que, ao ATACAR esse inimigo, causam 0.6x
//              de dano (desvantagem elemental)
//  Tudo que não está em nenhuma das duas listas é neutro (1.0x).
//
//  Exemplo prático: um inimigo de elemento "fogo" tem
//  forte: ['agua'] — ou seja, um ataque de ÁGUA nele causa 1.7x
//  de dano (água apaga fogo). E "planta" tem forte: ['fogo'] —
//  um ataque de FOGO nela causa 1.7x (fogo queima planta).
//
//  ── 18 elementos no total ──
//  12 conjuráveis pelo Mago:
//    Ciclo 1 (clássico):      Água → Fogo → Planta → Água
//    Ciclo 2 (natureza):      Terra → Elétrico → Planta → Terra
//    Extra frio:              Fogo → Gelo → Terra
//    Extra vento:             Gelo → Vento · Elétrico → Vento · Vento → Veneno
//    Ciclo 3 (arcano):        Energia → Veneno → Caos → Energia
//    Ciclo 4 (luz/trevas):    Luz → Magia Negra · Caos → Luz
//  6 só-defesa (nunca conjurados pelo jogador, mas com contadores
//  reais — servem para os inimigos que os usam):
//    Sombra  ← Magia Negra, Luz
//    Cristal ← Veneno, Elétrico
//    Pedra   ← Vento, Água
//    Fantasma← Luz, Energia
//    Vazio   ← Energia, Luz
//  + "neutro": elemento coringa, sem vantagem nem fraqueza pra
//    ninguém (usado como fallback quando um inimigo não tem
//    elemento definido).
// ══════════════════════════════════════════════════════════════

const AFINIDADE_ELEMENTAL = {
  // ── os 12 elementos que o Mago pode conjurar ──
  fogo:        { forte: ['agua'],            fraco: ['planta', 'gelo', 'fogo'] },
  agua:        { forte: ['planta'],          fraco: ['fogo', 'agua'] },
  planta:      { forte: ['fogo', 'eletrico'],fraco: ['agua', 'terra', 'planta'] },
  eletrico:    { forte: ['terra'],           fraco: ['planta', 'vento', 'eletrico'] },
  terra:       { forte: ['planta', 'gelo'],  fraco: ['eletrico', 'terra'] },
  gelo:        { forte: ['fogo'],            fraco: ['terra', 'vento', 'gelo'] },
  vento:       { forte: ['gelo', 'eletrico'],fraco: ['veneno', 'vento'] },
  energia:     { forte: ['caos'],            fraco: ['veneno', 'energia'] },
  veneno:      { forte: ['energia', 'vento'],fraco: ['caos', 'veneno'] },
  caos:        { forte: ['veneno'],          fraco: ['energia', 'luz', 'caos'] },
  luz:         { forte: ['caos'],            fraco: ['magia_negra', 'luz'] },
  magia_negra: { forte: ['luz'],             fraco: ['magia_negra'] },
  // ── elementos exclusivos de inimigos (só aparecem como defensor,
  //    nunca conjurados pelo jogador — mas têm contadores reais) ──
  sombra:      { forte: ['magia_negra', 'luz'],  fraco: ['sombra'] },
  cristal:     { forte: ['veneno', 'eletrico'],  fraco: ['terra', 'cristal'] },
  pedra:       { forte: ['vento', 'agua'],       fraco: ['veneno', 'pedra'] },
  fantasma:    { forte: ['luz', 'energia'],      fraco: ['veneno', 'fantasma'] },
  vazio:       { forte: ['energia', 'luz'],      fraco: ['caos', 'vazio'] },
  neutro:      { forte: [],                      fraco: [] },
};

// Guarda de quais avisos de elemento desconhecido já foram
// disparados nesta sessão, para não floodar o console repetindo
// o mesmo aviso a cada golpe da mesma batalha.
const _elementosDesconhecidosAvisados = new Set();

// Normaliza um valor de elemento: minúsculas + sem espaço nas
// pontas. Isso corrige diferenças bobas de maiúscula/minúscula
// (ex.: 'Fogo' → 'fogo') sem precisar caçar cada ocorrência no
// código dos inimigos.
function normalizarElemento(elemento) {
  if (!elemento || typeof elemento !== 'string') return 'neutro';
  return elemento.trim().toLowerCase();
}

// Calcula multiplicador elemental: retorna { mult, tipo }
// tipo: 'vantagem' | 'desvantagem' | 'neutro'
//
// elementoUsado   = elemento do ataque (ex.: o elemento que o
//                   Mago conjurou)
// elementoInimigo = elemento do inimigo sendo atacado
function calcMultiplicadorElemental(elementoUsado, elementoInimigo) {
  const elemInimigoNorm = normalizarElemento(elementoInimigo);
  const elemUsadoNorm   = normalizarElemento(elementoUsado);

  if (!elemInimigoNorm || elemInimigoNorm === 'neutro') {
    return { mult: 1.0, tipo: 'neutro' };
  }

  const afinidade = AFINIDADE_ELEMENTAL[elemInimigoNorm];

  if (!afinidade) {
    // Elemento não cadastrado na grade — provavelmente um typo em
    // algum arquivo de inimigo/dungeon. Avisa uma vez por sessão
    // em vez de falhar silenciosamente em neutro sem ninguém notar.
    if (!_elementosDesconhecidosAvisados.has(elementoInimigo)) {
      _elementosDesconhecidosAvisados.add(elementoInimigo);
      console.warn(
        `⚠ [elementos.js] Elemento de inimigo desconhecido: "${elementoInimigo}" ` +
        `não existe em AFINIDADE_ELEMENTAL. Batalha vai tratar como neutro. ` +
        `Verifique o campo "elemento:" desse inimigo (provável erro de digitação).`
      );
    }
    return { mult: 1.0, tipo: 'neutro' };
  }

  if (afinidade.forte.includes(elemUsadoNorm)) return { mult: 1.7, tipo: 'vantagem' };
  if (afinidade.fraco.includes(elemUsadoNorm))  return { mult: 0.6, tipo: 'desvantagem' };
  return { mult: 1.0, tipo: 'neutro' };
}

// Exposição global explícita — o projeto inteiro usa scripts
// clássicos (sem import/export), então os demais arquivos esperam
// encontrar isso em window/escopo global, na mesma ordem que já
// usavam quando essa parte vivia dentro de palDinh.js.
window.AFINIDADE_ELEMENTAL = AFINIDADE_ELEMENTAL;
window.calcMultiplicadorElemental = calcMultiplicadorElemental;
window.normalizarElemento = normalizarElemento;
