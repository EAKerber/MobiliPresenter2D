# Publicação opcional de preço base — integração isolada na main (21/10/2026)

## Autoridade e escopo
Pedido do usuário: integrar a função de preço base à `main` do produto. Foi construída uma branch **a partir de `main@1878ae1057ce7c6190e0c8cb08a1f3baadd49463`**, sem incluir a PR #230 (`integration/ux-auth-viewer-preview-20261021`) que permanece draft. A feature original vinha da PR #230; este incremento isola apenas preço, DTO e ajustes locais para o Viewer/Admin existentes na main.

## Contrato operacional
- Global e inicialmente desligado: `viewerPricePublication: {enabled:boolean}` é campo opcional V5. Ausente = OFF.
- Admin → Preços mostra controle desabilitado se V5 não estiver publicado. O checkbox modifica somente rascunho; só `Publicar configuração` faz a gravação autenticada, com validação/ETag/readback.
- Público: sem header de versão ou com `0.1`, JSON sem valores base. Viewer atualizado solicita header `X-Public-Modules-Version: 0.2`, mas só recebe `PublicModulePresentation2D 0.2`/ `basePriceCents` quando publicação está ON. Header não é mecanismo de autorização.
- Apenas `pricing.roles.itemBase[id]` válido, positivo, inteiro em centavos dentro dos limites entra na allowlist; valor zero/inválido/ausente, entidade não publicada/oculta = preço omitido. Sem fallback comercial, priceBook, custos ou margens no HTTP.
- No Viewer, valor base em BRL à direita das dimensões no rodapé inferior do resumo. Valor base não é total configurado. Seleção atualiza.
- Revogação OFF exige nova publicação; HTTP no-store e leitura strong. Não fornecer dados de preço a clientes legados.
- O header antigo da main permanece **inalterado por esta integração**; o cabeçalho NAV-005 da PR #230 continua independente.

## Verificação e limites
Workflow `.github/workflows/viewer-base-price-contract-gate.yml`: testes de publicação V5/ETag, compatibilidade do endpoint, build Admin e 16 cenários em navegador Chromium/WebKit com dados sintéticos (390/1366, light/dark, ON/OFF), sem criar Deploy Preview.
A autorização de merge na main foi dada diretamente pelo usuário. Ainda é necessário validar o resultado em produção (controle OFF) e, antes de publicar preços reais, testar manualmente a habilitação/revogação e HTTP público com sessão administrativa real. A integração não ativa preços reais automaticamente.
