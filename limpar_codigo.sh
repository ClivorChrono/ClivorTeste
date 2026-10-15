#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# limpar_codigo.sh — irmão do limpar_nomes.sh.
#
# O limpar_nomes.sh renomeia os ARQUIVOS de imagem (tira o
# "_1782716578179" do nome). Mas o CÓDIGO (.js e .html) que
# referencia essas imagens continua escrito com o nome antigo
# ("iconassa_1782716578179.png") — por isso a imagem some e cai
# no emoji, mesmo depois de renomear o arquivo.
#
# Esse script corrige o código: varre todo .js e .html do projeto
# e tira o mesmo sufixo numérico de qualquer caminho de imagem
# (Imagens/....png / .jpg / .jpeg) que aparecer no texto.
#
# COMO USAR:
#   Na mesma pasta "Clivor RPG", depois de já ter rodado o
#   limpar_nomes.sh:
#     bash limpar_codigo.sh
#
#   Ele faz backup de cada arquivo mexido (.bak) antes de alterar,
#   então se algo sair errado dá pra restaurar.
# ═══════════════════════════════════════════════════════════════

total=0

while read -r arquivo; do
  # só mexe se o arquivo tiver algum caminho de imagem com sufixo numérico
  if grep -qE "[A-Za-z0-9_/.-]+_[0-9]{10,}\.(png|jpg|jpeg)" "$arquivo"; then
    cp "$arquivo" "$arquivo.bak"
    # tira o "_<10+ dígitos>" logo antes da extensão, só dentro de caminhos de imagem
    sed -i -E 's/([A-Za-z0-9_\/.-]+)_[0-9]{10,}\.(png|jpg|jpeg)/\1.\2/g' "$arquivo"
    echo "✅ Corrigido: $arquivo  (backup salvo em $(basename "$arquivo").bak)"
    total=$((total+1))
  fi
done < <(find . -type f \( -iname "*.js" -o -iname "*.html" \) -not -name "*.bak")

echo ""
echo "Feito. Arquivos de código corrigidos: $total"
echo "(Se algo quebrar, restaura com: mv arquivo.bak arquivo)"
