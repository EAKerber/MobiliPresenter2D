# CMP-001 — Subinventário operacional da cena compartilhada

**Estado:** parcial — este documento cobre a família de cena e hotspots, não todo o inventário operacional de componentes.

## Referências fixadas

- Plano: `MOBILIPRESENTER2D_PLANO_DIRETOR_CONSOLIDADO_v0.9.md` em `EAKerber/MobiliPresenter2D_DesignSystem@026c6c4f4d9a6d29102a241862afdb50c35de147`; blob do plano `59bb530b14172eb9772b9f89bb62272173f4381c`.
- Product `main@5c6e652693bd30218e6915bf8cb160bde03ac719`.
- Product `development@89c258dfe058c72a359f95f39e5589458a9c3cff`.
- Leitura somente de código e testes existentes. Não houve alteração de runtime, teste focal novo, sessão autenticada ou inferência de equivalência visual.

## Inventário desta família

| Candidato | Owner técnico e consumidores | Estado e variantes | Classificação |
|---|---|---|---|
| `CasaModulesSceneComponent` em `app/core/scene-component.js` (blob `6fa00bb31d2ecd3eeccb1d0e5eabcf410acdcab6`, idêntico em main/development) | Owner técnico: módulo compartilhado. Owner humano: desconhecido. Consumidores confirmados: Configurator via `app/app.js` e Viewer via `app/viewer/scene-adapters.js`. | Oferece camadas, hotspots, atualização de visibilidade/seleção, frame de seleção, aparência de acabamentos e teclado. Não é dono do estado comercial nem da projeção pública. | `shared-existing` |
| Geometria compartilhada em `app/core/scene-geometry.js` (blob `91f5d37d72c4183d1bb38695fbf74c67a110c8b0`, idêntico em main/development) | Consumida pelos dois fluxos de cena. | Normaliza `alphaBounds` e resolve o posicionamento do marcador; os dados e políticas que alimentam a geometria permanecem nos domínios de cada consumidor. | `shared-existing` |
| Integração do Configurator em `app/app.js` (development `1a029524d8f7fb65f1870c159d5842fbb037bf84`) | Shell `app/config/index.html` (development `82b4e9cdff677693f0a34c68f727087d8a4d8d43`), carregando geometry/component em scripts 230–232. | Usa catálogo/configuração, máscaras e seleção locais; passa preparação de entidade, filtros, rótulos e política de camadas próprios. Mantém a política de domínio do configurador. | `variant-of-shared` + `domain-specific` |
| Integração pública do Viewer em `app/viewer/scene-adapters.js` (development `2bc8f6af0c174708bdad469ae78d5288462aadb8`) | Shell `app/viewer/index.html` (development `c737119749cac07d7da77f81020e8c39eb0931eb`), carregando geometry/component nos scripts 40–41. | O adapter público mantém seleção/visibilidade próprias e consome projeção somente leitura; compõe camadas, hotspots, frame e acabamentos com asset prefix próprio. | `variant-of-shared` + `domain-specific` |

Os blobs de `scene-component.js` e `scene-geometry.js` são byte-idênticos em main e development. Os adapters, controladores e shells são domínios separados. Esta evidência confirma dois consumidores concretos; não substitui uma busca repo-wide assinada que prove exaustividade de consumidores.

## DOM, estilos e eventos observados

O componente cria `.layer-group`, `.finish-layer`, `.structure-layer--shadow`, `.structure-layer--highlight`, `.scene-hotspot`, `.scene-hotspot--aerial`, `.scene-hotspot__tag` e `.selection-frame`. Grupos e controles usam datasets incluindo `entityId`, `module`, `maskAsset`, `structureAsset`, `selectSceneEntity` e `markerSide`. Hotspots são botões com rótulo acessível, `aria-pressed`, estado disabled/hidden, e tabulação atualizada conforme visibilidade.

O componente instala um listener `keydown` no `document` em `bindKeyboard()`. O Viewer evita repetir a chamada com um guard local `keyboardBound`; não há método público de dispose no componente. Risco de listener acumulado em remount é uma hipótese a verificar, não um defeito reproduzido. O clique dos hotspots do Viewer é tratado pelo adapter. O inventário completo dos eventos/configurador ainda está pendente.

### Contextos CSS

- `/config/`: `app/config/index.html` carrega `styles.css?v=runtime-v40` relativo e `/ui-theme.css?v=arc03-fnd01-v1`, além de um bloco inline. O caminho relativo resolve para `config/styles.css`, ausente nos trees main/development; o CSS estático registra essa falha. O audit não altera o link.
- `/viewer/`: carrega `/public-theme.css`, `viewer/viewer.css` e `/ui-theme.css`; os selectors do componente coexistem com as regras específicas da cena Viewer.
- Blobs CSS em development: o destino de `/config/` `config/styles.css` está ausente; o `/ui-theme.css` carregado é `aa0d160110fc1a3bde187bfab4ea97f26290e143`. No Viewer, `/public-theme.css` é `b8122a6a02cd1be67e2bedf9a0ce3b55dbc47b40`, `viewer/viewer.css` é `5dd315b4a5a277ebca3c2493c8febe7a4e44c9b5`, e `/ui-theme.css` também é `aa0d160110fc1a3bde187bfab4ea97f26290e143`. CSS-00 mantém o inventário completo dos nove arquivos CSS de runtime e suas diferenças main/development.\n- A classificação acima não equivale a uma crosswalk completa seletor→folha→rota→estado→consumidor.

## Domínios e projeção

- Configurator compõe cena de configuração a partir do catálogo e do estado do configurador. Este recorte não valida autorização das APIs nem a matriz completa de estados autenticados.
- Viewer carrega módulos públicos pelo fluxo em `app/viewer/public-data.js` (development `fde86e84745daa16e803d769af22f1e6c3857919`), via projeção pública `/api/public-modules`, e passa módulos/estado permitidos ao adapter. O componente compartilhado não decide autorização nem expõe configuração administrativa.
- Textos dos hotspots podem ser fornecidos por opções do consumidor. A autoridade de cada string e todos os fallbacks ainda precisam ser inventariados.

## Testes relacionados e cobertura

| Arquivo / blob em development | Evidência que oferece | Limite |
|---|---|---|
| `app/viewer/scene-adapters.test.mjs` — `c281a8e399c0b7b8c4267f5d11b09fa8b99d1d09` | Contratos do adapter e falha de asset. | O teste focal usa stub do componente; não valida o renderer compartilhado real. |
| `app/tools/test-core.js` — `b22a1688bbd89efd168a003c179c29027b7ce582` | Reachability HTML/CSS e z-index. | Não prova toda a semântica do renderer nem ciclo de vida. |
| `tests/stone-browser.cjs` — `7beb02522b0245efab8303c467e88e1d969ae855` | Layering e seleção de acabamento/estado no Configurator. | Não instancia o componente real nos dois consumidores. |
| `tests/mobile-pip-main-browser.cjs` — `5bcb941a3116c9754a6889d1b3c1f47965cbaa12` | Hit-testing PiP e hotspots. | Não cobre o contrato comum completo nem lifecycle. |

Os quatro blobs de teste são idênticos em main. Não foi identificado um teste focal que exercite o componente real nos dois consumidores para teclado/foco, estado pressed, máscara/fallback de assets e remount.

## Lacunas e ordem de migração

1. Completar o inventário CMP-001 de todos os componentes priorizados e todas as rotas, incluindo owner humano, controlador, fonte de textos, auth, variantes e pares de teste.
2. Atualizar `app/viewer/INTEGRATION.md` (blob `3ab4c72949ea1322ac84d5126714877fc88ce376` em ambos refs): há descrições conflitantes sobre compartilhamento atual do renderer; o código confirma uso pelo Configurator e Viewer.
3. Fazer busca repo-wide dos consumidores de geometry/component e mapear eventos/lifecycle antes de declarar esses dois como lista completa.
4. Após o inventário e uma fixture representativa, avançar CMP-014 com teste do renderer real em ambos consumidores. Não adicionar dispose ou refatorar policy só por hipótese de remount; primeiro medir chamadas e lifecycle.
5. Preservar skins, estado e autoridade de dados específicos de cada domínio. Não integrar a árvore inteira nem alterar main nesta fase.

## Conclusão

Este subinventário atende parcialmente as dimensões do DoD para a família compartilhada de cena. CMP-001 permanece **partial** porque o restante dos componentes prioritários, owner humano, todas as relações componente→consumidor→teste, estados autenticados e o inventário de textos/eventos ainda não estão fechados. CMP-014 continua aberto e dependente de prova focal.
