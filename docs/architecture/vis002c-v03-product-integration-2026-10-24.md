# VIS-002C v0.3 — consumo de texto corrido no produto

**Estado atual (readback 2026-11-26):** Product `main@5c6e652693bd30218e6915bf8cb160bde03ac719` is served by READY Production deploy `6b07bd0f17cb2fd1e0d65b34`. The previously user-authorized scoped mapping from Design System PR #52 and Product PR #241 is active: anonymous DOM/CSSOM readback confirmed the exact import and `rgb(41, 39, 35)` on all ten mapped selectors across `/`, `/about/`, and `/how-it-works/` in light theme. No dark-theme runtime claim is added.

## Fonte e escopo

- Design System: PR [#52](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/52), versão v0.3.0.
- Mapeamento: dez seletores medidos nas páginas públicas Landing, Quem somos e Como funciona.
- Papel: `VIS-002.approvedPalette.colors.textPrimary.light`, `#292723`.
- A preferência do usuário por cores próximas do preto em texto corrido agora também cobre os três consumidores v0.2 já medidos: `.hero-description`, `.how-hero-note` e `.about-scale p:not(.eyebrow)`.
- Os cinco seletores compartilhados com v0.2 e os dois novos seletores medidos completam os dez contextos v0.3. O tom escuro mantém `#C4BCB2` sobre `#20211F`.
- O CSS de eyebrows `#70522F` fica separado. Eyebrows e assinaturas não entram no mapeamento.

## Implementação

A cópia da distribuição, do mapa e do manifesto fica fixada em `design-system/pins/vis-002/context-v0.3.0/`. `app/landing/landing.css` importa o CSS gerado, carregado pelas três rotas públicas. Cada um dos dez contextos de página consome `var(--ds-vis002c-long-copy-light)`; as declarações ficam sob `html[data-theme="light"]`. Não há uso em `:root` nem alteração de `decisions.json`.

## Revisão e proveniência

O verificador compara os hashes Git dos três arquivos copiados com o pin, confere os dez seletores exatos e confirma o import, a atribuição contextual e a permanência do tema escuro. Em Product development no commit `a7f34f593e7d7f82d17c0165e9de7c80455ee240`, o gate faz checkout do Design System no commit exato fixado e compara a decisão canônica e os três artefatos originais com as cópias do Product. Hashes de texto normalizam CRLF para LF e rejeitam CR isolado. O PR #495 e o workflow exato passaram; Product main continua no gate anterior.

The runtime state is recorded from the existing scoped authorization and merged PRs, not inferred from deployment alone. The Production readback identifies the deployed commit and exact CSSOM contexts. The pin lifecycle gate now distinguishes `REFERENCE_ONLY`, `SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED`, and `SCOPED_RUNTIME_AUTHORIZED_AND_RELEASED`: reference artifacts cannot be runtime consumers; candidates cannot claim Production; authorized release requires the merged decision and Product receipts plus a ready Production deploy and every mapped context. The new gate is first validated in Product `development`; `main` remains unchanged until that exact gate passes.
