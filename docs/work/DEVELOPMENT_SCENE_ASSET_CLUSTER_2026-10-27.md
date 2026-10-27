# Development — 07-scene-assets: proveniência, retenção e gates de fidelidade (2026-10-27)

## Estado e propósito

Snapshot de partida: `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` imutável; `development@55ffac9d26f1a7533ec924ca58c2d7026fb20465`. Grupo `07-scene-assets` do inventário original: apenas as duas refs abaixo, ambas divergentes. O objetivo deste recorte é **classificar a proveniência e bloquear perdas de imagem**; ele não publica qualquer asset, não dá aval estético e não executa Netlify. Não se deve mesclar por HEAD uma branch só porque contém um arquivo com nome conhecido.

## A — DS-02 é um pacote de originais, não uma alternativa ao runtime

- Branch/HEAD **exatos**: `artifacts/ds02-imagens-originais-20261015@e9c405bfc0189baed8b4b679a1113c37b6ddbd21`.
- `README.txt` declara distribuição para ZIP, arquivos sem recompressão. `manifest.json` enumera **40 objetos Git binários** com blob SHA e número de bytes, a partir do commit originário `864c38e70d406e8a3f9dfc9af6c3cf928472671b`. Total dos objetos do manifesto: **7.356.814 bytes**; **36** marcados como ativos à época e **4** `cutout` históricos. São 42 caminhos no pacote, contando manifesto e README.
- Comparação exata com a árvore `development`: **30/40 hashes idênticos**, **10/40 diferentes**, **0/40 ausentes**. Os dez diferentes são precisamente `app/landing/assets/icons/{large,small}/{cozinha,escritorio,lavanderia,quarto,sala}.webp`. Estes ativos atuais são versões **posteriores**: divergência não autoriza substituí-los por originais antigos.
- As **quatro imagens cutout históricas**, embora identificadas como “legacy” no manifesto, ainda estão no caminho original da árvore atual por SHA idêntico; não se pode tratá-las como removidas do repositório.
- Consequência: **RETAIN_ARCHIVE**. O pacote independente preserva identidade visual e possibilidade de recuperação das 10 versões substituídas. Não transformar essa branch em branch de desenvolvimento, não copiá-la para `app/`, não podá-la com base no limite enganoso de 300 arquivos da API de compare (a branch tem só dois diretórios de assets + manifesto/README, sem código da aplicação). O compare de branches perde contexto porque parte de histórias desconectadas; a leitura de árvore Git é a prova apropriada.

## B — PR #34, máscaras e vidro exigem prova visual

- Branch/HEAD exatos: `feat/exposed-sides-and-glass@20040da835d6da66b03f73642c0c44db109dd6e8`; [PR #34](https://github.com/EAKerber/MobiliPresenter2D/pull/34) **aberta e draft**, não mesclada.
- Auditoria por árvore Git: **360 caminhos iguais por SHA**, **53 com mesmo caminho mas SHA diferente**, **42 caminhos exclusivos da árvore antiga**. Desses, **21 são caminhos de assets de cozinha que estão ausentes ou diferem** no runtime atual: bridges das pedras 02/03, camadas, máscaras, overlays de laterais/vidro/fogão, variante de pedras etc. **Não inferir** que o binário antigo é melhor, nem que o caminho omitido deveria voltar.
- A PR apresenta a intenção de continuidade lateral visível dos módulos 02, 05 e 07, fogão substituto e divisória de vidro fumê opcional. A documentação histórica diz que módulo 06 não tem lateral adicional nessa cena. Nenhuma dessas declarações substitui aprovação visual atual.
- A PR afirma sucesso local de pixel/baseline e browser anterior, mas também registra que **R0 contract, Module 02 fidelity, Variant fidelity, Candidate asset gates e Stone browser falharam** numa rodada; falta validação pós-reconciliação sobre a arquitetura `development`. Seu teste browser original `tests/exposed-sides-glass.cjs` é diferente do que existe hoje, e o binário de `scene-data.js`, `mask-data.js` e várias camadas não coincide. O código de `visibility.js` é idêntico nas duas árvores; reimportá-lo seria redundante.
- A PR #34 e os materiais de doadores/originais ficam em **HOLD_VISUAL**. Antes de integração: separar casos físicos (módulo 02 oculto, módulo 03 à frente, módulo 04 oculto e profundidade do 07, vidro com/sem serviço, fogão substituto), provar igualdade de alpha nos pixels fora das máscaras e inspeção visual nas cores claras/escuras. Não importar arquivos binários sem baseline e sem nova aprovação.

## Gate novo: árvore Git + hashes, sem tocar em binários

`tools/development_asset_provenance_audit.py`, rodado por `.github/workflows/development-asset-provenance.yml`, exige as duas refs remotas nos SHAs acima, lê `git show SHA:manifest.json`, verifica todos os 40 objetos do arquivo por `git ls-tree`, compara os mesmos caminhos com a árvore atual e rejeita drift na lista das 10 substituições intencionais. Também registra as diferenças e exclusividades da árvore da PR #34. Gera `artifacts/asset-provenance/report.json` como artifact de execução **somente diagnóstico**.

`tests/test_development_asset_provenance.py` tem **sete testes negativos/de invariantes** de nomeação, contagem, hash, omissão, duplicação e mudanças fora da allowlist. [Actions #40571337236](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40571337236) **PASS** na auxiliar (unit + comparação Git), sem writes no produto e sem deploy.

O manifest SHA auditado é proveniência, **não** um certificado de correção visual ou performance. Outputs de teste em artifacts GitHub Actions têm retenção limitada; preservar este documento e os objetos nos branches originais até existir uma política de arquivamento durável equivalente.

## Gates e decisões operacionais

1. **KEEP** `artifacts/ds02-imagens-originais-20261015`: conteúdo exclusivo útil e reprodução original. Não fazer squash/merge com a `development` neste momento.
2. **HOLD** `feat/exposed-sides-and-glass` e **PR #34**: correções de imagem implicam escolha visual; não transplantar o HEAD ou arquivos arbitrários.
3. **KEEP** a `main` intacta; qualquer aplicação futura de vidro/laterais precisa passar em testes funcionais/visuais atuais, preservar o Design System e ser validada em `development`.
4. Consolidar na `development` somente **o relatório, o teste e o gate** deste recorte. A auxiliar de auditoria pode ser aposentada apenas com prova de ancestralidade, gates no destino, lease SHA e readback integral; referências históricas não são elegíveis para esta operação.
5. Próximo recorte recomendado: bloco `08-data-runtime`, ou analisar mais detalhadamente a PR #34 usando comparativo visual **quando houver imagens/evidências para inspecionar**; não prometer regressão resolvida por checks de hash.

## Situação desta etapa

A branch `integration/07-asset-provenance-20261027` contém somente arquivos de auditoria, testes e este relatório. Nenhum dos originais, folhas de máscara ou serviços do Viewer foi modificado. O próximo passo de execução é consolidar por fast-forward validado na `development`, observar gate no destino e atualizar o handover; só então fazer higiene da auxiliar de auditoria, sem remover nenhuma das duas origens.
