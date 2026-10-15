#!/data/data/com.termux/files/usr/bin/bash
# =============================================================
#  VERIFICAR_IMAGENS.SH — Chronicles of Clivor
#  Checa se todas as imagens referenciadas no código existem
#  de fato na pasta do projeto (Android é case-sensitive!)
#
#  Uso: rode este script DENTRO da pasta raiz do projeto
#  (a mesma pasta onde está o gat-1.html)
#     bash verificar_imagens.sh
# =============================================================

echo "🔍 Escaneando pasta do projeto..."

# Lista de TODAS as imagens que o código pede (extraída do gat-1.html + .js)
REFERENCIADAS=$(cat << 'EOF'
1mulet.png
23_06_49.png
2mulet.png
3mulet.png
4mulet.png
Assassino0000.png
Cortedovazuo.png
EENERGIA.png
Ecaos.png
Ecoante/file_0000000027e8720eb7fe13114fb31d33.png
Ecoante/file_000000004c18720e9d719bd9b65f0b62.png
Ecoante/file_0000000068d471f5b4ad607991c8991b.png
Ecoante/file_00000000b028720e9bd3cbef30330022.png
EmagiaN.png
Evento.png
Feicijs.png
Folhaart.png
Golpefatalpp.png
Hab/EENERGIA.png
Hab/ELuz.png
Hab/EPlanta.png
Hab/ETerra.png
Hab/Ecaos.png
Hab/Egelo.png
Hab/EmagiaN.png
Hab/Evento.png
Hab/Veneno.png
Hab/abismo.png
Hab/agua.png
Hab/caos_agua.png
Hab/caos_arcano.png
Hab/caos_luz.png
Hab/caos_planta.png
Hab/caos_sombrio.png
Hab/caos_veneno.png
Hab/ciclone_gelo.png
Hab/cinzas_gelo.png
Hab/eclipse.png
Hab/eletrico.png
Hab/esporos.png
Hab/florestafogo.png
Hab/fogo.png
Hab/geada_planta.png
Hab/gelo_negro.png
Hab/glacial.png
Hab/lama.png
Hab/luz_agua.png
Hab/luz_divina.png
Hab/luz_energia.png
Hab/luz_planta.png
Hab/luz_terra.png
Hab/luz_vento.png
Hab/nevasca.png
Hab/nova.png
Hab/onda_fria.png
Hab/pedra_fogo.png
Hab/pedra_viva.png
Hab/praga.png
Hab/raiz_eletrica.png
Hab/rocha_vento.png
Hab/sobrecarga.png
Hab/sombra_vento.png
Hab/tempestade.png
Hab/tempestade_negra.png
Hab/terra_caos.png
Hab/terremoto.png
Hab/trevas_planta.png
Hab/tufao_veneno.png
Hab/vapor.png
Hab/vendaval_gelo.png
Hab/veneno_eletrico.png
Hab/veneno_energia.png
Hab/veneno_fogo.png
Hab/veneno_gelo.png
Hab/veneno_planta.png
Hab/vento_caos.png
Hab/vida_planta.png
Hab/vortice.png
Hbi/icone00000000d72471f593e207d261f3b210_1784805652363.png
IceDis.png
Imagens/Amuleto/Incasndenn.png
Imagens/Amuleto/amuleto_roxo.png
Imagens/Amuleto/amuleto_yuki.png
Imagens/Amuleto/inscancentehen.png
Imagens/Amuleto/pedra_sacerdotisa_negra.png
Imagens/Armaduras/Mundialarmor.png
Imagens/Armaduras/Picsart_26-07-05_14-45-40-087.png
Imagens/Armaduras/peitoral_lorde_sombras.png
Imagens/Armas/FBranca.png
Imagens/Armas/FNegra.png
Imagens/Armas/FÉlfica.png
Imagens/Armas/arco.png
Imagens/Armas/cajado_1781493098967.png
Imagens/Armas/flech.png
Imagens/FlorestaAman.png
Imagens/FlorestaAnoi.png
Imagens/FlorestaAtar.png
Imagens/FloretaU.png
Imagens/KappaMasmorra/cavernaE.png
Imagens/KappaMasmorra/k1.png
Imagens/KappaMasmorra/k2.png
Imagens/KappaMasmorra/k3.png
Imagens/c1.png
Imagens/c2.png
Imagens/c3.png
Imagens/capa.png
Imagens/cosméticos/MP.png
Imagens/cosméticos/Poção.png
Imagens/cosméticos/PoçãoG.png
Imagens/cosméticos/PoçãoM.png
Imagens/cosméticos/aaur.png
Imagens/cosméticos/erva.png
Imagens/elixir.png
Imagens/estalagem.png
Imagens/file_000000000ba4820e871ac75268023415.png
Imagens/file_000000008808720e8b07aec2a366c40e.png
Imagens/file_00000000b900720eb63880e1dc69a359.png
Imagens/file_00000000d208720ea883b9f33c0b12ca.png
Imagens/formas/aguia.png
Imagens/formas/aliados/aguia_alma.png
Imagens/formas/aliados/touro_alma.png
Imagens/formas/aliados/tubarao_alma.png
Imagens/formas/dragao.png
Imagens/formas/dragao_grande.png
Imagens/formas/touro.png
Imagens/formas/tubarao.png
Imagens/icones/Archer.png
Imagens/icones/Chavss.png
Imagens/icones/EscudoDivin.png
Imagens/icones/Funsio.png
Imagens/icones/L8li.png
Imagens/icones/OniC.png
Imagens/icones/Picsart_26-06-17_08-22-34-130.png
Imagens/icones/Picsart_26-06-29_04-52-27-463.png
Imagens/icones/Picsart_26-06-30_21-16-08-204.png
Imagens/icones/Picsart_26-06-30_21-16-40-786.png
Imagens/icones/Picsart_26-06-30_21-17-08-742.png
Imagens/icones/Picsart_26-06-30_21-17-47-840.png
Imagens/icones/Picsart_26-07-01_03-05-36-441.png
Imagens/icones/Picsart_26-07-01_03-06-23-587.png
Imagens/icones/Picsart_26-07-01_03-07-08-602.png
Imagens/icones/Picsart_26-07-01_03-09-47-612.png
Imagens/icones/Picsart_26-07-06_19-13-05-694.png
Imagens/icones/Picsart_26-07-26_23-02-54-667.png
Imagens/icones/Picsart_26-07-26_23-10-07-242.png
Imagens/icones/Picsart_26-07-26_23-16-05-626.png
Imagens/icones/RuneN.png
Imagens/icones/file_0000000001fc720e8ebf2fe0fc70a8df.png
Imagens/icones/file_000000005b70720eaf8ba2296f1cc9c0.png
Imagens/icones/file_0000000071bc720e8623d5971d3b6d0a.png
Imagens/icones/gadanha.png
Imagens/icones/iconassa_1782716578179.png
Imagens/icones/iconmago_1782716578247.png
Imagens/icones/li.png
Imagens/icones/mapa_cidade_pedra.png
Imagens/icones/materiais/BauB.png
Imagens/icones/materiais/BauS.png
Imagens/icones/materiais/Brasiuhdh.png
Imagens/icones/materiais/Caldarapos.png
Imagens/icones/materiais/Chavss.png
Imagens/icones/materiais/Fespirutu.png
Imagens/icones/materiais/Glandul.png
Imagens/icones/materiais/Inoo.png
Imagens/icones/materiais/Peledeco.png
Imagens/icones/materiais/Picsart_26-06-20_21-22-07-911.png
Imagens/icones/materiais/Picsart_26-06-27_02-36-55-008.png
Imagens/icones/materiais/Picsart_26-06-27_02-42-37-937.png
Imagens/icones/materiais/Picsart_26-06-27_02-46-42-072.png
Imagens/icones/materiais/Picsart_26-06-27_02-48-19-388.png
Imagens/icones/materiais/Picsart_26-06-27_02-50-41-929.png
Imagens/icones/materiais/Picsart_26-06-27_02-52-06-685.png
Imagens/icones/materiais/Picsart_26-06-27_03-02-33-187.png
Imagens/icones/materiais/Picsart_26-06-27_03-06-58-212.png
Imagens/icones/materiais/Picsart_26-06-27_03-07-59-948.png
Imagens/icones/materiais/Picsart_26-06-27_03-26-54-664.png
Imagens/icones/materiais/Picsart_26-06-27_03-27-15-667.png
Imagens/icones/materiais/Picsart_26-06-27_03-37-16-765.png
Imagens/icones/materiais/Picsart_26-06-27_03-39-51-719.png
Imagens/icones/materiais/Picsart_26-06-27_03-46-47-499.png
Imagens/icones/materiais/Picsart_26-06-29_00-36-15-330.png
Imagens/icones/materiais/Picsart_26-07-06_09-27-43-192.png
Imagens/icones/materiais/espadaEnf.png
Imagens/icones/materiais/essencia_rei_selva.png
Imagens/icones/materiais/fragSombra.png
Imagens/icones/materiais/frascoVazio.png
Imagens/icones/materiais/frascovenenoso.png
Imagens/icones/materiais/garra_urso_kodiak.png
Imagens/icones/materiais/garra_urso_pardo.png
Imagens/icones/materiais/laminaQuebrada.png
Imagens/icones/materiais/peconha_esmeralda.png
Imagens/icones/materiais/pegada_gorila.png
Imagens/icones/materiais/pele_lobo.png
Imagens/icones/materiais/penC.png
Imagens/icones/materiais/poCrista.png
Imagens/icones/materiais/poOsso.png
Imagens/icones/materiais/presa_gorila.png
Imagens/icones/materiais/presa_urso_kodiak.png
Imagens/icones/palaicon.png
Imagens/icones/selos/Picsart_26-08-16_02-55-04-540.png
Imagens/icones/selos/Picsart_26-08-16_03-07-53-380.png
Imagens/icones/selos/Picsart_26-08-16_03-08-10-918.png
Imagens/icones/selos/Picsart_26-08-16_03-08-24-959.png
Imagens/icones/selos/Picsart_26-08-16_03-42-32-690.png
Imagens/icones/selos/Picsart_26-08-16_03-43-31-452.png
Imagens/inimigos/caop.png
Imagens/pedra.png
Imagens/pedrabranca.png
Imagens/personagens/Arqueiro/Picsart_26-07-26_23-48-25-821.png
Imagens/personagens/Arqueiro/TiroCerteiro.png
Imagens/personagens/Arqueiro/arqueiro_1780709092555.png
Imagens/personagens/Arqueiro/dragao_alma.png
Imagens/personagens/Arqueiro/dragao_projetil_sheet.png
Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-09-27-961.png
Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-10-04-482.png
Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-37-30-919.png
Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-37-40-935.png
Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-37-52-403.png
Imagens/personagens/Arqueiro/iconeshab/armadu.png
Imagens/personagens/Arqueiro/iconeshab/aruaeinh.png
Imagens/personagens/Arqueiro/iconeshab/aruqie.png
Imagens/personagens/Arqueiro/iconeshab/cadei.png
Imagens/personagens/Arqueiro/iconeshab/flechasy.png
Imagens/personagens/Arqueiro/iconeshab/flechi.png
Imagens/personagens/Arqueiro/iconeshab/flirje.png
Imagens/personagens/Arqueiro/iconeshab/gle.png
Imagens/personagens/Arqueiro/iconeshab/pega.png
Imagens/personagens/Assassino/Assassino0000.png
Imagens/personagens/Assassino/Assassinpardo.png
Imagens/personagens/Assassino/IconesAsas/Cortedovazuo.png
Imagens/personagens/Assassino/IconesAsas/Golpefatalpp.png
Imagens/personagens/Assassino/IconesAsas/Pulhetavazia.png
Imagens/personagens/Assassino/IconesAsas/Puulheta.png
Imagens/personagens/Assassino/IconesAsas/TriploXxx.png
Imagens/personagens/Assassino/Picsart_26-07-05_14-34-00-422.png
Imagens/personagens/Assassino/dancadaM.png
Imagens/personagens/Assassino/frame1skil.png
Imagens/personagens/PLACEHOLDER_eir.png
Imagens/personagens/Picsart_26-07-10_23-21-15-991.png
Imagens/personagens/Picsart_26-07-11_01-44-21-438.png
Imagens/personagens/Picsart_26-07-11_01-44-33-870.png
Imagens/personagens/Picsart_26-07-11_01-45-08-789.png
Imagens/personagens/aranha.png
Imagens/personagens/aranha_ii.png
Imagens/personagens/assassino/IconesAsas/Implosãocompleta.png
Imagens/personagens/assassino/IconesAsas/Implosãosegue.png
Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-36-01-624.jpg
Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-36-25-582.png
Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-36-52-914.png
Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-37-19-324.png
Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-37-43-127.png
Imagens/personagens/cobra.png
Imagens/personagens/cobra_verde.png
Imagens/personagens/corvo.png
Imagens/personagens/corvo_ii.png
Imagens/personagens/eir_valkiria.png
Imagens/personagens/file_000000000a7471f5b0a811736bcf1f0c.png
Imagens/personagens/file_000000001834720ea390f37cc1093a22.png
Imagens/personagens/file_000000009750720e8bf77a669cb77087.png
Imagens/personagens/file_00000000b900720eb63880e1dc69a359.png
Imagens/personagens/file_00000000d894720ea8d8368f1eaf7a6f.png
Imagens/personagens/gain.png
Imagens/personagens/gorila.png
Imagens/personagens/gozen.png
Imagens/personagens/lobo.png
Imagens/personagens/lobo_ii.png
Imagens/personagens/mago/conjuragua.png
Imagens/personagens/mago/conjurama.png
Imagens/personagens/mago/magoframe1.png
Imagens/personagens/mago/magoframe2.png
Imagens/personagens/mago/magoframe3.png
Imagens/personagens/mago/magoframe4.png
Imagens/personagens/ovelha_encantada.png
Imagens/personagens/paladino/Martelo.png
Imagens/personagens/paladino/Picsart_26-06-29_03-23-29-931.png
Imagens/personagens/paladino/Picsart_26-06-29_03-35-49-266.png
Imagens/personagens/paladino/baseframepala.png
Imagens/personagens/paladino/escudoDivi.png
Imagens/personagens/paladino/escudodiv.png
Imagens/personagens/paladino/escudodivivi.png
Imagens/personagens/paladino/golpe_sagrado_attack.png
Imagens/personagens/paladino/golpe_sagrado_recover.png
Imagens/personagens/paladino/paladinoEscuderooo.png
Imagens/personagens/paladino/selo_julgamento.png
Imagens/personagens/raposa.png
Imagens/personagens/ratin.png
Imagens/personagens/urso_kodiak.png
Imagens/personagens/urso_pardo.png
Imagens/pocao.png
Imagens/taberna.png
Imagens/templo1.png
Imagens/tutorial/selo_tutorial.png
Imagens/vfx/aguia_projetil_sheet.png
Imagens/vfx/touro_projetil_sheet.png
Imagens/vfx/tubarao_projetil_sheet.png
Implosãocompleta.png
Implosãosegue.png
RuneA.png
RuneB.png
RuneC.png
RuneD.png
RuneS.png
RuneSS.png
Terrariiin.png
TriploXxx.png
Veneno.png
baseframepala.png
caop.png
conjuragua.png
conjurama.png
dancadaM.png
dragao_alma.png
dragao_grande.png
escudodiv.png
escudodivi.png
escudodivivi.png
fire.png
flechas.png
golpe_sagrado_attack.png
golpe_sagrado_recover.png
imagens/icones/Picsart_26-07-11_01-04-58-781.png
imagens/icones/Picsart_26-07-11_01-05-25-694.png
imagens/icones/Picsart_26-07-11_01-23-28-525.png
imagens/icones/Picsart_26-07-11_01-23-48-154.png
imagens/icones/Picsart_26-07-11_01-24-55-750.png
imagens/icones/Picsart_26-07-11_01-26-51-345.png
imagens/icones/Picsart_26-07-11_01-30-56-596.png
inazami/file_00000000ec44720e82db8870148a5338.png
magoframe1.png
magoframe2.png
magoframe3.png
magoframe4.png
masmorra/1mulet.png
masmorra/2mulet.png
masmorra/4mulet.png
masmorra/Adriwn.png
masmorra/Eir3ys.png
masmorra/Eirt3ey.png
masmorra/Eirtehs.png
masmorra/Eirut.png
masmorra/Emcn.png
masmorra/PLACEHOLDER_visao_eir.png
masmorra/file_000000001398720ea29729dbb4b7ebfc.png
masmorra/file_00000000a514720ea03e2b0b90ad9078.png
masmorra/mapa_inazami.png
masmorra/sala_nucleo.png
masmorra/sala_nuo.png
paladinoEscuderooo.png
pedras/file_000000000f54720e9577462c9422ebd5.png
pedras/file_000000007c70720e910d40ab8ef3d7c5.png
pedras/file_00000000847c71f58623064c480efac3.png
pedras/file_000000008dd0720e992973dafe3040f6.png
sheetDef.png
sombras/D0.1.png
sombras/D0.png
sombras/D1.png
sombras/D2.png
sombras/D3.png
sombras/D4.png
sombras/D5.png
sombras/D6.png
sombras/D7.png
sombras/D8.png
sombras/D9.png
sombras/castel.png
staak.png
water.png
Água.png
EOF
)

# Lista real de arquivos de imagem existentes na pasta (recursivo)
echo "📂 Listando arquivos reais..."
find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" -o -iname "*.gif" \) > ./_tmp_arquivos_reais.txt
TOTAL_REAIS=$(wc -l < ./_tmp_arquivos_reais.txt)
echo "   Encontrados: $TOTAL_REAIS arquivos de imagem"

FALTANDO=0
NOME_DIFERENTE=0
OK=0

> ./_tmp_faltando.txt
> ./_tmp_nome_diferente.txt

echo "🔎 Comparando..."
echo ""

while IFS= read -r img; do
  [ -z "$img" ] && continue
  BASENAME=$(basename "$img")

  # 1) Tenta achar exatamente (case-sensitive, igual ao Android)
  MATCH_EXATO=$(grep -F "/$BASENAME" ./_tmp_arquivos_reais.txt | head -1)

  if [ -n "$MATCH_EXATO" ]; then
    OK=$((OK+1))
  else
    # 2) Tenta achar ignorando maiúscula/minúscula
    MATCH_CASE=$(grep -iF "/$BASENAME" ./_tmp_arquivos_reais.txt | head -1)
    if [ -n "$MATCH_CASE" ]; then
      NOME_DIFERENTE=$((NOME_DIFERENTE+1))
      echo "CÓDIGO PEDE: $img  |  ARQUIVO REAL: $MATCH_CASE" >> ./_tmp_nome_diferente.txt
    else
      FALTANDO=$((FALTANDO+1))
      echo "$img" >> ./_tmp_faltando.txt
    fi
  fi
done <<< "$REFERENCIADAS"

echo "═══════════════════════════════════════"
echo "📊 RESULTADO"
echo "═══════════════════════════════════════"
echo "✅ OK (existem certinho):      $OK"
echo "⚠️  Nome/pasta diferente:       $NOME_DIFERENTE"
echo "❌ Faltando de verdade:         $FALTANDO"
echo "═══════════════════════════════════════"
echo ""

if [ "$NOME_DIFERENTE" -gt 0 ]; then
  echo "⚠️  ARQUIVOS COM NOME/CASE DIFERENTE (salvo em nome_diferente.txt):"
  cat ./_tmp_nome_diferente.txt
  cp ./_tmp_nome_diferente.txt ./nome_diferente.txt
  echo ""
fi

if [ "$FALTANDO" -gt 0 ]; then
  echo "❌ ARQUIVOS REALMENTE FALTANDO (salvo em faltando.txt):"
  cat ./_tmp_faltando.txt
  cp ./_tmp_faltando.txt ./faltando.txt
  echo ""
fi

echo "✨ Pronto! Se tiver arquivos em faltando.txt ou nome_diferente.txt,"
echo "   me manda esses .txt no chat que eu te ajudo a corrigir."

# Limpeza dos arquivos temporários (mantém só faltando.txt e nome_diferente.txt)
rm -f ./_tmp_arquivos_reais.txt ./_tmp_faltando.txt ./_tmp_nome_diferente.txt
