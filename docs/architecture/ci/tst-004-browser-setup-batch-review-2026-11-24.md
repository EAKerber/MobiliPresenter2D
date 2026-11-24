# TST-004 — navegador Playwright: revisão de atrito e lote candidato — 2026-11-24

## Escopo e pin

Product main@01ded2c100fbfd8b16897e26113dc5068a83e429; Product development@da0dc5d471cca012cbd6f417b411c82471786737 (tree 7f307531871a4db7f4add3e6f75d4dd6183c6e8e); Design System main@570954f8e31c3530fb8570755f838965dc7f8105.

A auditoria leu as 75 definições de workflow do tree exato de development, sem truncamento. Ela revisou eventos declarados, paths e conditions, comandos de browser repetidos e usos compartilhados de testes. A matriz completa de cada workflow para cada assertion continua aberta; este recibo registra decisões limitadas, não encerra TST-004.

## Resultado sobre sobreposição

- Não há base para apagar assertions de navegação pública, Viewer ou Buyer V5. Casos compartilhados rodam em escopos de branch/evento diferentes ou estão acompanhados por contratos específicos diferentes.
- NAV público roda seus 124 cenários nos eventos da trilha de development e da trilha de PR para main, não em duplicidade num mesmo PR comum. O Viewer tem 20 cenários próprios. O fluxo responsivo usa os mesmos 32 casos em gates pré-merge, pós-merge ou históricos com funções distintas.
- O teste Buyer V5 e o contrato de header do Viewer reaparecem em combinações distintas, cada qual com verificações adicionais. Hash de comando repetido não demonstra duplicidade de garantia.
- Doze workflows são dispatch-only. Entre eles há marcadores de aposentadoria e rotinas manuais; eles aumentam a contagem de arquivos, mas não a carga automática comum. Preservar até classificar propósito e artefatos.
- Dois gates históricos isolados ainda usam Playwright 1.56 com Chromium e WebKit. Não os misturar ao lote 1.62.1 sem revisar a baseline própria.

## Atrito mensurável e disposição

O PR #377 retirou a instalação repetida de browser em Keyboard e Flow Layout e manteve todos os testes. No head exato, passaram Keyboard (52 s no total), Flow Layout (148 s), Public Routing estático/contrato (22 s) e o advisory (13 s). Esses totais não têm amostra pareada anterior para os mesmos workflows, então ainda não demonstram economia.

Três jobs regulares disparados em PR ainda usam Playwright 1.62.1 e baixam Chromium em cada execução: mobile-browser.yml, stone-browser.yml e summary-pricing-browser.yml. Este candidato só substitui a preparação de browser pela imagem mcr.microsoft.com/playwright:v1.62.1-noble com --ipc=host. Mantém a instalação Node playwright@1.62.1, todos os testes, filtros, fixtures V5 e artefatos.

O CP-PUBLIC DTO parity também baixa Chromium por execução, mas só dispara por push em development e workflow_dispatch; não oferece validação pré-merge. Ele fica fora deste lote até decidirmos se vale acrescentar um caminho de PR sem aumentar fan-out indevido ou se a validação pós-merge basta.

A trilha pública public-routing-before-clerk.yml foi revisada, mas ficou fora desta mudança: seu browser hospedado roda apenas em PRs para main com Deploy Preview pronto. Um PR para development executa os contratos estáticos e não exercita essa preparação de browser. Alterá-la aqui daria falsa impressão de validação; revisar a imagem quando a trilha de preview puder executá-la.

## Amostra anterior disponível

| Job | Run anterior | Duração total observada | Limite |
|---|---:|---:|---|
| Mobile browser | 45314036741 | 39 s | Um run de PR, não benchmark controlado |
| Stone browser | 45314036675 | 37 s | Um run de PR, não benchmark controlado |
| Summary pricing browser | 45314554477 | 38 s | Um run de PR, não benchmark controlado |


As durações incluem inicialização e teste. Depois do candidato, registrar runs comparáveis e seus tempos totais; não atribuir a diferença toda ao setup nem generalizar para os outros browsers. CP-PUBLIC permanece fora até existir caminho de validação em PR ou ser tratado com evidência pós-merge.

## Estado e limites

- Mudança candidata em workflows e documentação somente. Nenhum teste/assertion, filtro, mask asset, dado de máscara, consumidor ou runtime do Viewer muda.
- Evidência de gates #377 pertence ao head 83e34b89..., integrado por squash em development@da0dc5d....
- O inventário de source tree confirma 75 arquivos de workflow no pin. As linhas internas do artefato TST-001 14900584471 ainda não foram lidas; totais de comandos/hashes derivados do artefato permanecem sem atualização.
- Os workflows e suites completos ainda precisam de crosswalk de condição interna, fonte→assertion, outcome, proprietário e distribuição de custo.
