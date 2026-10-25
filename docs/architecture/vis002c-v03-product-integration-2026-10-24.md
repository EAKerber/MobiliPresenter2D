# VIS-002C v0.3 — consumo de texto corrido no produto

**Estado:** candidata integrada à branch da PR #241; precisa de novos gates e revisão do preview após a ampliação. Não mergeada nem publicada.

## Fonte e escopo

- Design System: PR [#52](https://github.com/EAKerber/MobiliPresenter2D_DesignSystem/pull/52), versão v0.3.0.
- Mapeamento: dez seletores medidos nas páginas públicas Landing, Quem somos e Como funciona.
- Papel: `VIS-002.approvedPalette.colors.textPrimary.light`, `#292723`.
- A preferência do usuário por cores próximas do preto em texto corrido agora também cobre os três consumidores v0.2 já medidos: `.hero-description`, `.how-hero-note` e `.about-scale p:not(.eyebrow)`.
- Os cinco seletores compartilhados com v0.2 e os dois novos seletores medidos completam os dez contextos v0.3. O tom escuro mantém `#C4BCB2` sobre `#20211F`.
- O CSS de eyebrows `#70522F` fica separado. Eyebrows e assinaturas não entram no mapeamento.

## Implementação

A cópia da distribuição, do mapa e do manifesto fica fixada em `design-system/pins/vis-002/context-v0.3.0/`. `app/landing/landing.css` importa o CSS gerado, carregado pelas três rotas públicas. Cada um dos dez contextos de página consome `var(--ds-vis002c-long-copy-light)`; as declarações ficam sob `html[data-theme="light"]`. Não há uso em `:root` nem alteração de `decisions.json`.

## Revisão

O verificador compara os hashes Git dos três arquivos copiados com o pin, confere os dez seletores exatos e confirma o import, a atribuição contextual e a permanência do tema escuro. Os gates da PR #241 e a revisão manual do preview atualizado precisam passar antes de qualquer integração.
