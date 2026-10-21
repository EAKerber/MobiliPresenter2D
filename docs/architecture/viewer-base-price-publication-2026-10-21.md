# Viewer — autorização global de preço base (issue #228)

## Contrato de implementação — 21/10/2026
Incremento experimental isolado da PR #230. Base: `integration/ux-auth-viewer-preview-20261021@24bbeadb`. Nenhum merge/deploy autorizado por este documento.

- `ConfiguratorAdministration2D 5.0` admite opcionalmente `viewerPricePublication: {enabled:boolean}`, sob validação estrita; ausência => desligado. A autorização só é efetiva quando o documento V5 é salvo pelo endpoint Admin autenticado, com ETag e readback. Não usar localStorage.
- `enabled=false` ou ausente: DTO `PublicModulePresentation2D 0.1`, **sem chaves de preço no HTTP**.
- `enabled=true`: DTO `PublicModulePresentation2D 0.2`, com o campo opcional `basePriceCents` nos módulos publicados e visíveis. Extraído exclusivamente de `pricing.roles.itemBase[id]` (`type=amount`, centavos inteiros seguros, >0 e <=100000000). Sem preço se a regra não for válida, estiver ausente, for zero ou o módulo estiver oculto.
- **Zero:** omitido por cautela editorial; não implica módulo gratuito. Esta política é técnica e pode ser revista antes do release, sem migrar preços reais.
- Não enviar `pricing`, `priceBook`, `viewerPricePublication`, margens, custos, regras ou metadados administrativos. DTO v0.2 contém só preço base escalar por módulo. O Viewer não calcula total.
- O endpoint continua `Cache-Control: no-store`, lê Blob `consistency:strong`; após desativação e nova publicação o próximo GET elimina os campos. Cache HTML antigo não possui autorização para reintroduzir valores. A revogação antes de **republicar** não existe, conforme contrato do usuário.
- Deploy Preview isolado usa storage por deploy e, em ausência de dados, apenas a projeção pública primária já allowlisted; não tenta importar documento administrativo.
- Admin deve informar que alternar o checkbox é só rascunho até **Publicar configuração**. Apenas admin valida e grava o documento, e V3 não oferece o toggle.
- Compatibilidade: Viewer novo aceita 0.1 e 0.2; Viewer antigo com verificação 0.1 não exibirá um DTO 0.2 (falha segura). Não publicar enquanto essa diferença de compatibilidade não for testada em deployment real.

## Gates pendentes
- Node fixture projection e validação de permissões V5.
- Browser Admin (troca de aba, estado OFF, publicar/erro/retentativa) e Viewer (390/1366 claro/escuro, cifra longa, foco).
- HTTP anônimo ON/OFF contra deploy real e a autorização administrativa com sessão de teste; não usar valores privados nas capturas.
- Inspeção WebKit/iPad, revogação/cache e verificação rollback.
