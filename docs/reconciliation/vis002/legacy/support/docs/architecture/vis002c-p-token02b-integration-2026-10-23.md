# VIS-002C / P-TOKEN-02B v0.2.0 — integração proposta

**Base:** produto `main@5ccb2a8dde6dd16e136f03387dc833aab828c5cf`.  
**Estado:** branch de integração limpa; PR/gates pendentes. Não há merge, Deploy Preview ou publicação autorizados por este patch.

## Escopo autorizado

A distribuição v0.2 vincula o valor homologado `#705C4B` aos oito seletores exatos do mapa VIS-002C, somente em tema claro: três contextos anteriores e cinco novos. A cor continua vindo da paleta VIS-002; o mapa contextual é versionado separadamente. Nenhum token global é alterado.

As três rotas públicas carregam apenas a distribuição v0.2. Os componentes usam a propriedade contextual nos oito seletores autorizados. São preservados: `.feature-availability`, `.finish-signature`, `.about-closing__signature`, `.eyebrow`, todos os pares no tema escuro e o `--public-muted` global.

## Fontes autorais e HTML publicado

As três páginas são HTML gerado por ARC-03C. O patch altera as fontes em `architecture/pages/`, mantém os arquivos `app/` gerados idênticos ao resultado do compilador e atualiza `architecture/generated/primary-pages.manifest.json`. O gate de build continua estrito; nenhuma saída gerada é editada sem atualizar sua origem.

## Integridade e verificação

Os arquivos versionados em `design-system/pins/vis-002/` preservam os pins de paleta e distribuição v0.1, acrescentam mapa/manifests v0.2 e permitem regenerar/verificar a folha CSS. O workflow de integração em PR executa:

1. integridade dos pins, contrato dos oito consumidores e testes Node;
2. equivalência byte a byte/CSS computado dos três consumidores existentes entre v0.1 e v0.2 no mesmo DOM;
3. contraste contextual nas rotas/temas/estados cobertos, mantendo `UNVERIFIED` fora da evidência;
4. comparação raster de página inteira em Chromium/WebKit, aceitando diferenças somente dentro das caixas dos cinco textos adicionados.

O branch anterior registrou resultados positivos para esses gates, mas esta base atual ainda precisa executá-los. A interceptação do vídeo do YouTube existe somente no navegador de CI para estabilizar a captura; o iframe publicado permanece sem alteração.

## Limites

VIS-002C não autoriza aplicar a paleta globalmente, corrigir foco, mudar textos comerciais, autenticação, domínio, Admin, Viewer ou Configurador. O resultado do gate é evidência para revisão; não aprova visualmente a composição completa nem autoriza merge/release.