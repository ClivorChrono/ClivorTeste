// ═══════════════════════════════════════════════════════════════════
//  img_autofix.js — faz o jogo continuar achando a imagem mesmo que
//  o arquivo tenha um sufixo numérico colado no nome
//  (ex: código pede "iconassa.png" mas o arquivo real se chama
//  "iconassa_1782716578179.png", ou vice-versa).
//
//  COMO FUNCIONA:
//  Quando qualquer <img> do jogo falha ao carregar, em vez de cair
//  direto no fallback de emoji, esse script pergunta pro servidor
//  "o que tem nessa pasta?" (o python -m http.server mostra listagem
//  de pasta por padrão), acha o arquivo cujo nome bate ignorando o
//  sufixo numérico, e troca o src pra ele. Só se não achar nada
//  parecido é que cai no fallback de emoji normal (nada muda nesse
//  caso — comportamento de antes preservado).
//
//  COMO INTEGRAR:
//  Cola isso como o PRIMEIRO <script> do gat-1.html (antes de
//  qualquer outro, inclusive antes do palDinh.js), tipo:
//    <script src="img_autofix.js"></script>
//  Precisa ser o primeiro pra já estar "escutando" antes de
//  qualquer imagem começar a carregar.
//
//  LIMITAÇÃO: só cobre <img src="...">. Não cobre CSS
//  background-image (o navegador não avisa quando esse tipo de
//  imagem falha, então não dá pra interceptar). Pra esses casos
//  (a maioria dos cards do bestiário, por exemplo) ainda vale rodar
//  o limpar_nomes.sh + limpar_codigo.sh depois de salvar arte nova.
// ═══════════════════════════════════════════════════════════════════

(function () {
  const _dirCache = new Map(); // pathname da pasta -> array de nomes de arquivo (ou Promise)

  function normalizar(nomeArquivo) {
    // tira a extensão
    const semExt = nomeArquivo.replace(/\.[a-zA-Z0-9]+$/, '');
    // tira sufixo "_<6+ dígitos>" (timestamp) do final, se tiver
    return semExt.replace(/_[0-9]{6,}$/, '').toLowerCase();
  }

  async function listarPasta(dirPath) {
    if (_dirCache.has(dirPath)) return _dirCache.get(dirPath);
    const promessa = fetch(dirPath)
      .then(r => r.ok ? r.text() : '')
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a[href]'));
        return links
          .map(a => decodeURIComponent(a.getAttribute('href')))
          .filter(href => /\.(png|jpe?g|gif|webp)$/i.test(href) && !href.includes('/'));
      })
      .catch(() => []);
    _dirCache.set(dirPath, promessa);
    return promessa;
  }

  async function tentarResolver(img) {
    // retorna true se achou e trocou o src, false se não achou nada
    if (img.dataset.imgAutofixTried) return false; // já tentamos, evita loop infinito
    img.dataset.imgAutofixTried = '1';

    let url;
    try {
      url = new URL(img.src);
    } catch (e) {
      return false;
    }
    const pathname = url.pathname; // ex: /Imagens/icones/iconassa_123.png
    const ultimaBarra = pathname.lastIndexOf('/');
    if (ultimaBarra === -1) return false;

    const dirPath = pathname.slice(0, ultimaBarra + 1); // ex: /Imagens/icones/
    const nomeArquivoAlvo = decodeURIComponent(pathname.slice(ultimaBarra + 1));
    const alvoNormalizado = normalizar(nomeArquivoAlvo);
    if (!alvoNormalizado) return false;

    const arquivosNaPasta = await listarPasta(dirPath);
    if (!arquivosNaPasta || !arquivosNaPasta.length) return false;

    const encontrado = arquivosNaPasta.find(f => normalizar(f) === alvoNormalizado);
    if (encontrado && encontrado !== nomeArquivoAlvo) {
      img.src = dirPath + encontrado;
      return true;
    }
    return false;
    // se não achou nada parecido, devolve false — quem chamou aciona o fallback
    // (onerror inline do próprio elemento, ex: emoji)
  }

  document.addEventListener('error', function (ev) {
    const img = ev.target;
    if (!img || img.tagName !== 'IMG') return;
    if (img.dataset.imgAutofixTried) return; // já tentamos, deixa cair no fallback normal

    // guarda o handler original (ex: trocar por emoji) ANTES de bloquear o evento,
    // pra poder chamar ele manualmente depois se não acharmos nada
    const fallbackOriginal = img.onerror;

    // impede o onerror original de rodar ANTES da gente confirmar
    // se achou uma imagem melhor
    ev.stopImmediatePropagation();

    tentarResolver(img).then((achou) => {
      if (achou) return; // trocou o src, deixa a nova imagem carregar normal

      // não achou nada parecido — dispara o fallback original na mão,
      // já que o evento de erro real foi consumido acima
      if (typeof fallbackOriginal === 'function') {
        fallbackOriginal.call(img, ev);
      } else {
        img.dispatchEvent(new Event('error'));
      }
    });
  }, true); // true = capture phase, roda ANTES do onerror inline do elemento

  // se a segunda tentativa (já resolvida) também falhar, deixa o
  // onerror original do elemento rodar normal dessa vez (não
  // interceptamos de novo por causa do dataset.imgAutofixTried acima)
})();
