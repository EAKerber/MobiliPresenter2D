# Bloco 22 — CP-PUBLIC DTO/acesso, oito fontes em uma auxiliar (28/10/2026)

## Fontes confrontadas e escopo

Uma única auxiliar reconciliou oito refs source-locked, incluindo **dois documentos históricos sem PR**, quatro refs de estágios com **PRs abertas** (#182, #184, #185 e #186), um protótipo de integração e uma fixture Flow V3 antiga. `docs/reconciliation/cp-public/family.json` fixa commits, intenções e **22 blobs exatos**, incluídos sem recodificação em `docs/reconciliation/cp-public/legacy/<fonte>/...`. Todos são **histórico**, não código ativado.

- `security`: CP-PUBLIC-03a security inventory (sem PR) — dois documentos em development já byte-idênticos.
- `plan`: CP-PUBLIC-03a2 plano da sessão/bootstrap (sem PR) — dois documentos em development já byte-idênticos.
- `contract`: CP-PUBLIC-03a2-3 integração grande (sem PR) — contém bootstrap e DTO antigos, não promover sem revisão de contrato.
- `fixture`: CP-PUBLIC-04A teste navegador flow (sem PR) — fixture v3 obsoleta, mas ainda exige prova de equivalência funcional.
- `readguard`: PR #182, guard de leitura administrativo e testes históricos.
- `bootstrap`: PR #184, bootstrap fail-closed e casos de regressão.
- `projection`: PR #185, DTO comercial do comprador e verificadores antigos.
- `email`: PR #186, núcleo de sessão por e-mail, SQL e testes; **não executados**.

Outras PRs CP-PUBLIC (#175, #178, #179 e #180) também permanecem protegidas: não foram incluídas no lote de aposentadoria nem suas contribuições implicitamente promovidas.

## Regras de precedência

A `development` mais recente usa `app/core/published-buyer-projection.js` com payload `BuyerConfiguratorPayload 1.0`, `app/core/public-module-projection.js` com allowlist pública e `netlify/functions/buyer-configuration.mjs` que verifica o usuário/uma sessão ativa **antes** da leitura do Blob. A configuração administrativa exige `canManageAdministration`, não reaproveita uma sessão de comprador como papel administrador, e migração v5 antiga está aposentada. Não substituir estes caminhos pelos CJS/DTO antigos de `03a2`; nem tornar /api/configuration público.

O gate offline verifica cinco hashes de contrato atual, as correspondências da documentação anterior já incorporada, os 22 blobs históricos contra `SHA:path`, a ordem auth→read do backend e os limites de papel. Um novo teste Node executa casos negativos de papéis/sessões e separa staff, admin e cliente. Suites atuais de projeção pública/comprador e endpoint continuam mandatórias. Não há Netlify Preview, acesso DB, envio de e-mail ou mudança de `app/`.

## Higiene condicional

Somente `work/cp-public-03a-security-and-hygiene-inventory-20261008` e `work/cp-public-03a2-buyer-session-and-bootstrap-plan-20261008`, ambas sem PR, são **candidatas** à retirada (tags contendo todo o DAG original). A auxiliar pode ser aposentada após FF lease e readback. Quatro PR heads e as duas refs code-heavy não serão excluídas nesta rodada. O limite de três refs por batch segue independente da dimensão de oito fontes reconciliadas.
