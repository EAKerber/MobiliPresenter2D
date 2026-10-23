# AUDIT-PUBLIC-TEXT-02 — proposta de correção contextual (sem aplicação no produto)

Data: 22/10/2026, Brasil. Baseline inalterado: produto main@15e1cfb.
Estado: **CANDIDATO EXPERIMENTAL, AGUARDANDO HOMOLOGAÇÃO VISUAL CONTEXTUAL**.

## Motivação
A auditoria AUDIT-PUBLIC-TEXT-01 encontrou 36 ocorrências abaixo de 4,5:1 em cinco
contextos de texto público sobre fundos opacos. O usuário apontou especificamente
os dois parágrafos da seção final de `/about/`, não atingidos pela aplicação
VIS-002 da `.about-scale` na mesma página.

## Proposta por seletor, sem alterar variáveis globais
Arquivo de hipótese `evidence/visual/public-text-contrast-candidate-v1.css`.
Não está dentro de `app/`, não é importado em nenhuma página do produto e não
entra no publish Netlify. Aplica `#705C4B` **somente em tema claro** a:
- Landing: `.story-section > p:not(.eyebrow)` sobre `#E8E3DC`;
- Landing: `.feature-copy > p:not(.eyebrow):not(.feature-availability)`
  sobre `#F0EDE8` — estado funcional de disponibilidade **deliberadamente excluído**;
- Quem somos: `.about-closing > p:not(.eyebrow):not(.about-closing__signature)`
  sobre `#F0EDE8`;
- Quem somos: `.about-scale__stat > span` sobre `#F0EDE8`;
- Como funciona: `.finish-copy > p:not(.eyebrow):not(.finish-signature)` sobre `#F0EDE8`.

São valores presentes na paleta aprovada, mas **a seleção desses novos
consumidores ainda não foi homologada**. A abordagem não promove
`--public-muted` ou `--ds-reference-text-secondary-light` a alias global.
O par `#705C4B/#E8E3DC` tem referência ~4,95:1 na paleta aprovada,
e `#705C4B/#F0EDE8` ~5,41:1.

## Gate de comparação antes/depois (sem Netlify)
`tests/public-text-contrast-candidate.mjs` lê o CSS experimental como texto e
o injeta com Playwright `page.addStyleTag` sobre o **mesmo checkout base**, nunca
persistindo stylesheet em `app`. Compara, nos três viewports (390/768/1366),
dois temas e dois motores Chromium/WebKit (36 cenários):
- cor CSS computada de antes/depois e contraste aplicado ao fundo da seção;
- geometria, tamanho/peso da fonte, alinhamento e conteúdo de cada texto;
- temas escuros byte-identificados no objeto CSS medido (não são alterados);
- controles fora da proposta (hero homologada, About scale já aprovada,
  legendas, avisos de disponibilidade, Como funciona etc.) sem mudanças;
- screenshots antes/depois em Chromium, light, 390 e 1366 px, por contexto.
O artefato `artifacts/public-contrast-candidate` fica no Actions por 14 dias.

A primeira auditoria de amplo escopo permanece independente e passa antes.
Falha do gate significa **rejeitar ou corrigir o candidato**, não alterar produção.

## Gate de saída / dependências
1. Executar inspeção visual das capturas antes/depois, incluindo hierarquia de cor e
   distinção do texto de apoio; screenshots não substituem verificação funcional.
2. O usuário homologa explicitamente a extensão de cada par para os cinco
   contextos, ou rejeita/ajusta algum dos cinco casos.
3. Somente depois criar patch do produto com CSS scoped por rota, em branch nova
   ou reconciliação explícita com PR #231, e CI/rollback apropriado.
4. Não tocar na PR #234, Viewer NAV-005, auth/#232, preços, V5 ou
   estado de menu. Não criar Deploy Previews em loops.

NÃO classificar um gate bem-sucedido da hipótese como aprovação estética
automática da aplicação nem como WCAG global.

## Refinamento por semântica de assinatura
A revisão do CSS encontrou `.finish-signature` com cor própria `var(--public-accent-dark) !important` e peso itálico. O candidato agora exclui explicitamente a assinatura, que permanece como controle negativo. O runner usa a imagem versionada Playwright com navegadores pré-instalados para evitar instalação repetida de centenas de MB em cada push da branch.
