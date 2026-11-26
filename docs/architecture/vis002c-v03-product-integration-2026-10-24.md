# VIS-002C v0.3 — consumo de texto corrido no produto

**Estado atual (readback 2026-11-26):** o Design System #52 e o Product #241 foram integrados. Product main em `5c6e652693bd30218e6915bf8cb160bde03ac719` importa o artefato e o deploy de Production `6b07bd0f17cb2fd1e0d65b34` está pronto nesse mesmo commit. O PIN ainda declara `SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED` e `PREVIEW_PENDING`; portanto o registro de aprovação/publicação está em conflito com a fonte publicada e precisa de reconciliação explícita. Não inferir nova aprovação estética a partir do deploy.

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

O verificador compara os hashes Git dos três arquivos copiados com o pin, confere os dez seletores exatos e confirma o import, a atribuição contextual e a permanência do tema escuro. O gate agora também faz checkout do Design System no commit exato fixado e compara a decisão, o CSS, o mapeamento e o manifesto originais com as cópias do Product; hashes de texto são normalizados para LF antes do cálculo de Git blob, evitando divergência falsa em checkout Windows CRLF.

A revisão visual registrada na PR #241 ocorreu em preview em 2026-10-25, antes da integração. O readback de Production confirma que o CSS está na fonte publicada, mas não substitui a conciliação do campo `runtimeStatus`, nem demonstra por si só a aparência computada nos dez contextos. Até a atualização do registro, manter separados: decisão estética anterior, integração de código, deploy pronto e verificação runtime atual.
