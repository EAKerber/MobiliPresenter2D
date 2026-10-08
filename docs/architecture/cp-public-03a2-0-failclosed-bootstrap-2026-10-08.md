# CP-PUBLIC-03a2-0 — Bootstrap fail-closed de configuração autorizada

Data: 2026-10-08. Estado: **código implementado em PR DRAFT/HOLD, sem merge ou cutover**. Base: `main` em `bf30e008a81b7bc9cc34573e3d60a953810a9e72`. Plano maior: [PR #183](https://github.com/EAKerber/MobiliPresenter2D/pull/183) (`docs/architecture/cp-public-03a2-authorized-buyer-bootstrap-plan-2026-10-08.md`).

## Problema comprovado

Na [PR #182](https://github.com/EAKerber/MobiliPresenter2D/pull/182), o GET administrativo passou a negar usuário anônimo por `401` antes de acessar o Blob. O `app/app.js` antigo convertia qualquer resposta diferente de 200, salvo 422, em `null`, deixando defaults/preços do frontend ativos. Reprodução [#37815057147](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815057147). Contra um v5 conhecido e interceptado no Playwright, Stone/Summary/Mobile passaram 3/3 [#37815673306](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/37815673306); portanto não mudar regras de pedra, preço ou PiP.

## Contrato implementado neste checkpoint

- `app/index.html`: `<html data-configuration-access-state="loading" data-published-configuration-status="loading">`, `<main class="workspace" hidden inert>` e botão restaurar desabilitado **antes de carregar JavaScript**. Acessibilidade: bloco de progresso/erro visível, `aria-live`, `role=alert` nas falhas; retry apenas onde plausível.
- `app/styles.css`: `display:none !important` reforça `[hidden]` e status diferente de `ready/offline`. Não depender somente de overlay/opacity, nem de desabilitar cliques.
- `app/core/authorized-bootstrap.js`: orquestrador puro, browser + CommonJS. Estados explícitos `loading, ready, unauthorized, forbidden, invalid, unavailable`; `401->unauthorized`, `403->forbidden`, `404/409/422->invalid`, `429/5xx/rede/timeout->unavailable`, 200 sem objeto/schema ou falha ao aplicar -> `invalid`. `ready` somente **depois de `applyConfiguratorSettings` ter concluído**; jamais `return null` para um HTTP negativo.
- `app/app.js`: UI sincronizada ao estado, workspace escondida/inert e valor/resumo limpos durante loading e falhas; restaurar desabilitado. Na transição `ready`, libera workspace e refaz sync de cena, layout e PiP com dimensões visíveis. `file://` continua em modo `offline` **explícito**, com aviso permanente sobre valores demonstrativos, sem transportar esse fallback para HTTPS. Requisição same-origin no-store, AbortController 12s e botão manual de retry para falhas temporárias.
- `app/tools/test-authorized-bootstrap.js` adicionado ao `npm test` para matriz de estados, callbacks e garantias do HTML; `tests/authorized-bootstrap-browser.cjs` e workflow dedicado exercitam HTTP 401/403/404/422/429/503, erro de rede, v5 inválida, v3/v5 válidas, loading antes do 200 e retry 503->200 em **Deploy Preview isolado**, com fixture 200 interceptada **somente no Playwright**.

## Limite deliberado do recorte

Este checkpoint **não** cria sessão de comprador, DTO `BuyerConfiguration2D`, proteção de `/config/`/HTML/assets nem serviço de e-mail. Por estar baseado na main, `GET /api/configuration` continua legado/aberto **no preview deste PR**; a segurança da API integral está isolada na PR #182 (DRAFT/HOLD), e a integração real só é liberada após 03a2-1/2/3. O estado UI **não** é mecanismo de autorização no servidor; código/price-book estático segue público e depende da mudança posterior. Manter CI de autorização real (PR #182) separada da simulação HTTP da UI.

Esse recorte pode falhar em testes do legado que assumam que o configurador pode usar defaults sob HTTP sem publicação: **não suprimir as assertions**. Migrar os smoke tests de domínio para fixture v5 explícita e sessão E2E real conforme PR #183; não abrir acesso a dados administrativos para tornar CI verde.

## Gates

1. Primeiro paint e GET `401/403/503`: nenhum workspace/preço/ação exibido ou interativo. `role=alert`, estado HTTP específico, modo `offline` somente file://.
2. GET 200 v3/v5 válido: `publishedConfigurationStatus=validated`, estado `ready`, renderização de preço e cena; sem regressão de PiP e fluxo.
3. GET 200 inválido: estado `invalid`, nenhum fallback de valores. Retry após 503: permanecer bloqueado até resposta válida.
4. CI unit, browser, build e Netlify de preview passam; nenhuma escritura no Blob de produção, nenhuma alteração de rota, `main` ou publicação.
5. **HOLD até 03a2-1/2/3**: sessão validada no servidor, read model cliente, preço comercial protegido, HTML/Edge protegidos, gates de Auth real e testes funcionais reancorados em publicação autorizada.

## Continuação

A próxima PR implementará **03a2-1** (projeção de comprador explícita), sem reutilizar `prepared.source` como DTO de rede. Antes do merge final, consolidar #182 + 03a2-0 e gates de segurança/DOM, sem bypass para prod. CAIXARIA/laterais permanecem congeladas; viewer público é vitrine de módulos e não importa pedra/rodapé/oclusão do comprador.
