# CP-PUBLIC-03a1 — guard de acesso à configuração integral

**Data:** 2026-10-08. **Status: DRAFT/HOLD, não integrar na main ou publicar.** Recorte independente sobre a main observada `bf30e008a81b7bc9cc34573e3d60a953810a9e72`; decisão de segurança baseada no inventário [CP-PUBLIC-03a](../architecture/cp-public-03a-access-security-surface-2026-10-08.md) da PR #181.

## Contrato implementado (somente preview de branch)

- `netlify/lib/configuration-access.cjs`: validador de principal **server-only**. `getIdentityUser` deve ser provido por `@netlify/identity.getUser`. A role `admin` é validada em arrays `roles` ou `app_metadata.roles` depois da verificação do SDK (nunca confiar em cabeçalhos/cookies com papel declarado).
- GET `/api/configuration` e URL direta da Function: somente **Identity admin** pode ler o documento completo; anônimo recebe `401`, Identity não-admin `403`, indisponibilidade da identidade `503`. Autorização **antes** de selecionar ou ler o Blob, independentemente do contexto do deploy.
- PUT permanece exclusivamente admin, com validação/ciclo v5 existente e controle de revisão. Cliente, mesmo com sessão comercial no futuro, **nunca** autoriza PUT.
- Uma interface `verifyCustomerSession` existe apenas dentro do helper para futura integração com emissor/validador criptográfico server-side, testada com uma resposta `verified: true`, escopo `configuration:read` e validade limitada a 12h. **NENHUM verificador de sessão do comprador está conectado ao endpoint.** Cookies, JWT não verificados ou headers não concedem acesso. No endpoint, mesmo um principal customer futuro encontraria `503 buyer_projection_unavailable`, pois ainda NÃO há projeção cliente restrita para substituição do v5 completo.
- GETs de inspeção legados `?inspection=v5-preflight` continuam `410` antes do store e os desconhecidos `422`, sem devolução de configuração. Em fase posterior poderá ser útil normalizar 401 antes desses códigos, mas não há payload privado nesses erros.

## Testes

`app/tools/test-configuration-access.js`: matriz de papéis, arrays inválidos, spoof de headers, cookies forjados, expiração/escopo/verificação de sessão simulada, identidade indisponível, login admin por role ou app_metadata, PUT negado mesmo com sessão customer.

`app/tools/test-v5-endpoint-safety.js` atualizado: invoca o handler Netlify **real reescrito apenas para mocks offline**, verifica `401` anônimo tanto no alias quanto na URL direta; nenhum Blob aberto nem lido; GET Identity comprador `403`; PUT Identity comprador `403`; admin ainda lê v3/v5 e salva v5 no store de preview de teste; produção mockada só é acessada quando `context.deploy.context=production`; GET inválido de inspeção não abre store.

Ambos incluídos no `npm test` existente. A CI de app deve executar os gates; falha implica HOLD.

## Por que a PR **não pode** entrar na main

1. **O configurador atual usa GET integral sem sessão**, então esta PR isolada deixaria o comprador sem dados publicados. Antes de merge, implementar emissão/troca de link por e-mail, cookie validado no servidor, read model autorizado do comprador, e ajuste no carregamento da UI.
2. A rota estática `/` e `/index.html` ainda servem o HTML do configurador e `app/data/mock-price-book.js` publica uma tabela de estimativas comerciais. Essa superfície NÃO é protegida por mudar o GET. É necessário o gate Edge/servidor e a decisão de classificação comercial.
3. `/admin.html` mantém semântica Identity; proteger aliases no CP-PUBLIC-03a3 sem impedir invite/recovery legítimos.
4. PR #180 de landing/viewer continua DRAFT/HOLD com fixture temporária de preview. NÃO misturar fixture, PR #180 ou cutover de rota com este recorte.
5. `@netlify/identity` em função de preview e o comportamento do comprador com sessão real precisam de gate end-to-end; unit tests de simulação não são prova de auth/entrega de e-mail reais.

## Próximo gate

CP-PUBLIC-03a2: capacidade de ticket emitido a e-mail elegível + back-end atômico para troca de uso único, limite de emissão/replay e sessão com revogação. Criar projeção de comprador **sem `source` v5 integral**, testando valores e estados que a UI realmente consome. Depois integrar ao guard e concluir proteção de páginas/arquivos antes de qualquer redirect de `/`.
