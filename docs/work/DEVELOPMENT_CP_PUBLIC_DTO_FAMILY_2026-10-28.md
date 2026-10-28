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

## Gate integrado e lote P de aposentadoria documental

- [Auxiliar #40683398382](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40683398382) **PASS**: oito fontes/22 arquivos exatos, quatro checks Python, quatro testes dinâmicos de papéis/sessões, sete testes de projeção pública, DTO do comprador e endpoint atuais, `pages:check`. FF protegido para `development@672af55edb580f1b9822d96210536a61905c8698`; [gate development #40683492212](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40683492212) **PASS**.
- `work/cp-public-03a-security-and-hygiene-inventory-20261008@67089791497b72874b7f837853133a9ccf2311aa` e `work/cp-public-03a2-buyer-session-and-bootstrap-plan-20261008@8e2124bfd299d942dc2a24e80966b5cb034840e3` não têm PR nem proteção; contribuições específicas são apenas documentação/estado de 08/10. Seus quatro documentos de contrato originais estão atuais byte por byte e preservados novamente no snapshot de 22 blobs. A TAG **deve ser criada antes da exclusão**: `archive/m2d/cp-public-security-inventory-67089791`, `archive/m2d/cp-public-session-plan-8e2124bf`. O arquivo da DAG original retém eventuais diferenças de CURRENT_STATE, roadmap e handover da data, sem sobrescrever a intenção posterior.
- A auxiliar `integration/22-cp-public-dto-security-family-20261028@672af55edb580f1b9822d96210536a61905c8698` só poderá ser eliminada quando ancestral da development. Outras fontes `contract`, `fixture`, `readguard`, `bootstrap`, `projection` e `email` continuam HOLD (incluindo PRs #182, #184, #185 e #186). Outras PRs CP-PUBLIC também não são alvo. Manifesto P executável uma vez; **não declarar poda antes de AUDIT+APPLY e readback**.

## Confirmação final de higiene P

- [Workflow #40683648631](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40683648631) **AUDIT+APPLY PASS**, 28 testes de segurança, targets pinados por SHA e readback de branch/tag. Artefatos de auditoria `12813307892`, aplicação `12812929854`. [Gate no destino após manifesto #40683648630](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40683648630) PASS.
- Tags verificadas no remoto: `archive/m2d/cp-public-security-inventory-67089791` → `67089791497b72874b7f837853133a9ccf2311aa`; `archive/m2d/cp-public-session-plan-8e2124bf` → `8e2124bfd299d942dc2a24e80966b5cb034840e3`. Branches documentais correspondentes retiradas com lease, junto da auxiliar ancestral `integration/22-cp-public-dto-security-family-20261028@672af55edb580f1b9822d96210536a61905c8698`; **43→40 branches**.
- Inventário: **38 históricas**, **22/60 históricas aposentadas**, **13 auxiliares aposentadas**, 12 PRs abertas. Main, DS02, PR #34 intactas. Manifesto P consumido; **não reexecutar**. Código antigo de autenticação/DTO e fixture Flow continuam HOLD, não se alegar equivalência funcional completa.
