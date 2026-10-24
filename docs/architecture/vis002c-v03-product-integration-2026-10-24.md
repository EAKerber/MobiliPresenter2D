# VIS-002C v0.3 — consumo de texto longo no produto

**Estado:** candidata integrada à branch da PR #241; Deploy Preview e checks em execução após esta alteração. Não mergeada nem publicada.

## Fonte e escopo

- Design System: PR [#52](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/52), versão v0.3.0.
- Mapeamento: sete seletores medidos de texto corrido nas páginas públicas Landing, Quem somos e Como funciona.
- Papel: `VIS-002.approvedPalette.colors.textPrimary.light`, `#292723`.
- As três referências VIS-002 anteriores continuam com `#705C4B`.
- O CSS de eyebrows `#70522F` fica separado. Eyebrows e assinaturas não entram no mapeamento v0.3.

## Implementação

A cópia da distribuição, do mapa e do manifesto fica fixada em `design-system/pins/vis-002/context-v0.3.0/`. `app/landing/landing.css` importa o CSS gerado, carregado pelas três rotas públicas. Cada uma das sete regras de página usa `var(--ds-vis002c-long-copy-light)`; as declarações ficam sob `html[data-theme="light"]`. Não há uso em `:root`, alteração de `decisions.json` ou regra de tema escuro.

## Revisão

O verificador de produto compara os hashes Git dos três arquivos copiados com o pin, confere os sete seletores e confirma o import e o consumo contextual. Os gates existentes da PR #241 também precisam passar; o preview deve confirmar os mesmos contrastes e preservar o tema escuro antes de qualquer merge.
