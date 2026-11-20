# ARC-13 — auditoria técnica de `fullscreen-control-labels`

**Data:** 20/11/2026 (BRT)  
**Escopo:** oito IDs existentes do overlay LOC-002 nas páginas `/` e `/how-it-works/`.  
**Natureza:** conferência estática de identidade, fonte, valor e classe funcional. Não é aprovação editorial nem validação assistiva em runtime.

## Pins e método

Product `main@dc066f55619824626ea4752ecc0bafc67f9d9110` foi comparada ao head candidato da PR #274, `a9c39c8220bcbccefea4cf74e666445d35ccf1d9`. Os seis arquivos consultados têm o mesmo Git blob nos dois refs:

| Fonte | Git blob |
|---|---|
| `app/index.html` | `8a49e80c28a563d852704b1814bd8b5313184b13` |
| `app/landing/landing.js` | `6d096a57c0ba6b5c3d608e9f13fe0fd2e393c99e` |
| `app/how-it-works/index.html` | `ad5a0bb73388ebad3b39afb06ea9280dbbed82c9` |
| `app/how-it-works/how-it-works.js` | `289d2abf5e4a0036885c4f2d5a5761af40ec2084` |
| `architecture/pages/root.page.html` | `dcf5b866ce6be55ae8d9e63f539c34fd13788605` |
| `architecture/pages/how-it-works.page.html` | `20142055adc78262ac4bcb73d2a25e654d9c6e95` |

O overlay usado é `docs/architecture/arc13/loc002-identity-overlay-2026-11-18.json`, blob `f3b46de64813b5fa99c9b09e5e87618945f97818`. Os oito IDs abaixo aparecem uma vez cada em `unresolvedCandidates`. Os hashes de fonte declarados no overlay não foram recalculados nesta auditoria; a identidade entre base e candidato foi confirmada pelos Git blobs.

## Correspondência por ocorrência

| ID | Fonte e linha | Sink atual | Classe funcional registrada |
|---|---|---|---|
| `f106ae7ba0829c5b` | `app/how-it-works/how-it-works.js:11` | `aria-label` atualizado por `setAttribute` | `accessibility` |
| `ad71d3fcca0702ed` | `app/how-it-works/how-it-works.js:12` | `title` atualizado por `setAttribute` | `ui-dynamic` |
| `1fb12e3eb303d497` | `app/how-it-works/index.html:40` | `aria-label` inicial | `accessibility` |
| `fbd8581d0d6f8053` | `app/how-it-works/index.html:40` | `title` inicial | `ui-dynamic` |
| `d6d455c085c0c21f` | `app/index.html:49` | `title` inicial | `ui-dynamic` |
| `49ccb254d443d4ab` | `app/landing/landing.js:168` | `aria-label` atualizado por `setAttribute` | `accessibility` |
| `35eff8c8551d4683` | `app/landing/landing.js:169` | `title` atualizado por `setAttribute` | `ui-dynamic` |
| `c2c6bd2c037ca454` | `app/index.html:49` | `aria-label` inicial | `accessibility` |

## Resultado técnico

- Ambos os HTMLs começam com `aria-label="Abrir vídeo em tela cheia"`, `title="Abrir vídeo em tela cheia"` e `aria-pressed="false"`.
- Nos dois controladores, o rótulo muda conforme o estado de tela cheia entre “Abrir vídeo em tela cheia” e “Sair da tela cheia”. O controlador atualiza `aria-label`, `title` e `aria-pressed`, e observa `fullscreenchange` e `webkitfullscreenchange`.
- A classe `accessibility` corresponde ao sink de nome acessível `aria-label`; `ui-dynamic` corresponde ao tooltip `title` que acompanha o estado. Essa distinção é sustentada pelo markup e pelos writes reais nos controladores.
- Os oito registros já existem no overlay; este recibo não cria novas ocorrências nem altera a contagem de sinks.

## Estado que permanece

A conferência confirma identidade/fonte, valores atuais e suporte estático à classe funcional. Em todos os oito registros, `contentOwner=null`, `destination=hold` e `status=pending-semantic-review` permanecem inalterados. A conferência não aprova wording, nome acessível, tradução, chave de catálogo ou extração.

Leitor de tela, anúncio ao alternar o estado, foco e comportamento efetivo de tela cheia em browser/tecnologia assistiva permanecem **UNKNOWN**: nenhum teste de runtime ou de tecnologia assistiva foi executado nesta passagem. O resultado reduz uma dúvida de proveniência/classificação, mas não fecha LOC-002.
