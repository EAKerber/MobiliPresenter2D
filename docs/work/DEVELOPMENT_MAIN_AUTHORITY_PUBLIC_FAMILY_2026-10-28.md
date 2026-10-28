# Família 24 — autoridade da main em protótipos de landing e Viewer (28/10/2026)

## Hierarquia de autoridade (aprovada)

A `main@221b54b2a41ecc8c338d1bf2cf67280cf165ce95` de 26/10 continua referência **estável e forte**. A `development` é descendente direta da `main` (249 commits à frente em 28/10); novas mudanças só prevalecem após gates técnicos, intenção explícita mais recente e revisão. A mera presença de código antigo numa branch divergente, ainda que tenha adiantamento de commits relativo à ancestral comum, **não é prova** de implementação mais atual ou melhor.

Quatro fontes foram agrupadas por proximidade semântica: protótipo público de 07/10, implementação de preços Viewer de 21/10, experimental editorial Viewer 21/10 e composição declarativa landing de 20/10. `public-family.json` fixa quatro commits e 14 blobs históricos, preservados sem alteração no diretório `docs/reconciliation/main-authority/public-legacy/`. Não foi importado CSS ou JS de runtime.

## Substituição demonstrada

- **Protótipo landing/Viewer** `experiment/public-landing-commercial-viewer@0e28f7ec`: 07/10, apenas um commit relativo à base; implementação atual da landing, Viewer e cena na `main` é mais recente e distinta. O protótipo original fica integralmente recuperável pelo tag `archive/m2d/legacy-public-donor-0e28f7ec` antes da retirada, incluindo antigos assets WebP/PNG. Três blobs principais de JS retidos separadamente. Não reintroduzir lógica antiga nem assets sem review.
- **Preço base do Viewer** `feature/viewer-base-prices-global-off-20261021@82e4d09a`: 21/10, sete commits à frente de sua base antiga, mas os **dois testes de preço** e o `app/core/public-module-projection.js` são idênticos, blob por blob, ao código da `main`. Assim, a política atual de publicação global inicialmente desabilitada permanece autoridade. A documentação histórica exclusiva e os testes ficam no snapshot; a DAG original será tagueada `archive/m2d/legacy-viewer-price-82e4d09a` antes de remover a ref.

## HOLD com contribuições únicas

- `experiment/viewer-overview-editorial-20261021`: CSS/render/editorial e browser gate não têm equivalência total comprovada; blob de teste histórico difere da `main`. **HOLD**.
- `experiment/ui-declarative-landing-benefits-20261020`: engine de composição de página e teste de benefícios ainda são exclusivos; **HOLD**, não incorporar automaticamente ou aposentar só por antiguidade.
- CP-PUBLIC auth (PRs #182/184/185/186), CI auth (#238), PR #231 e original DS02/PR #34 continuam HOLD. Principal linha de diferença `development` vs `main` hoje é documentação/CI, com exceção relevante da correção de DTO V5 (gated), que não altera autoridade da `main` sem release.

## Gates e limites

O gate verifica SHA de cada blob armazenado contra o original `SHA:path` e testa os arquivos atuais **simultaneamente** contra o hash do commit da `main` e contra a working tree da `development`. Executa testes ativos de preço base e endpoint público; sem deploy. Dois candidatos históricos sem PR/branch protection, mais uma auxiliar ancestral, são teto de três alvos da próxima aposentadoria com tags completas e readback. A política permanente está em `ops/development-main-authority-policy.json`.
