# CP-PUBLIC — modelo de acesso com Netlify Identity

**Status:** desenho de autorização; login por papel, links temporários e proteção do configurador ainda não foram implementados. Foco associado: [issue #192](https://github.com/EAKerber/MobiliPresenter2D/issues/192).

## Objetivo e estado preservado

O site permanece estático no fluxo Netlify existente. As rotas `/`, `/viewer/`, `/how-it-works/` e `/about/` ficam públicas. Não mudar build, domínio, publicação ou deploy. O comportamento atual ainda deixa `/config/`, `GET /api/configuration` e alguns arquivos/dados comerciais acessíveis publicamente; nada nesta proposta altera isso ou afirma que preços já estejam privados.

Usar Netlify Identity para contas internas `admin` e `staff`. Visitantes `user` recebem acesso temporário ao configurador por link/token enviado ao e-mail, sem conceder papel Identity permanente. Manter Identity responsável pelo admin e suas escritas existentes. Não adicionar Clerk, Firebase ou um banco novo por padrão.

## Matriz de acesso pretendida

| Tipo | Rotas públicas | `/config/` e outras páginas internas | `/admin.html` e APIs administrativas |
| --- | --- | --- | --- |
| Anônimo | Sim | Não | Não |
| Identity `staff` | Sim | Sim, com login | Não |
| Identity `admin` | Sim | Sim, com login | Sim, com login e papel `admin` |
| `user` com link temporário | Sim | Somente configurador, até expirar | Não |

`admin` tem precedência sobre `staff` se uma conta tiver ambos. Nenhuma conta recebe papel por cadastro público: preferir Identity em modo `Invite only`; conceder `admin` e `staff` explicitamente. `user` descreve uma concessão temporária de acesso, não um terceiro papel Identity.

## Regras por camada

1. Netlify Identity autentica `admin` e `staff`. No servidor, `getUser()` valida a sessão e as Functions verificam o papel em `user.roles`; nunca confiar em papel, email ou ID vindo do browser.
2. Para páginas internas, o gate aceita `staff` ou `admin`. `/admin.html`, recursos administrativos e endpoints de escrita exigem `admin`. Páginas públicas ficam fora das regras de gate.
3. `/config/*` precisa aceitar `admin`, `staff` ou uma concessão temporária válida `config`. Como o link temporário não é uma role Identity, um redirect estático com `Role=` não resolve esse caso sozinho: uma Edge Function restrita aos caminhos protegidos deve validar Identity ou a sessão temporária antes de continuar até o HTML/asset.
4. APIs repetem a autorização no próprio boundary. O GET raw `/api/configuration`, PUT e quaisquer APIs administrativas exigem `admin`. O cliente comprador migra para DTO allowlisted com `staff`/`admin` ou grant temporário `config`; não entregar o schema v5 administrativo integral como API de comprador.
5. Proteger acesso direto aos caminhos servidos pelo CDN, não só a navegação e o HTML. Inventariar `/config/index.html`, aliases, scripts, preço/configuração estáticos e assets necessários. Mover dados comerciais protegidos para rotas privadas ou servi-los por endpoint autorizado se houver caminho estático público compartilhado.
6. Toda resposta privada/autorizada usa `Cache-Control: no-store`; nunca registrar token, cookies, PII, configuração bruta ou preços protegidos.

## Link temporário para `user` — decisões abertas

O link precisa ser uma concessão de curta duração e escopo explícito (`config`), sem role duradoura. Recomenda-se duração de **3 horas** como ponto inicial conservador; o intervalo de 3–6 horas permanece sujeito à confirmação do usuário. A expiração precisa valer tanto no HTML/assets quanto nas APIs e não pode ser renovada silenciosamente.

Fluxo recomendado a validar: um operador/admin solicita acesso para um e-mail; o backend emite segredo aleatório de alta entropia, envia uma URL de resgate por provedor de e-mail e armazena apenas o hash do segredo com e-mail/escopo/expiração. A pessoa abre a página neutra de resgate e confirma explicitamente; um `POST` troca o segredo por cookie `HttpOnly`, `Secure`, `SameSite` e de curta duração. Limpar o fragmento da URL após resgate. Um token colocado em query string pode vazar por histórico, logs e `Referer`; não resgatar com GET automático para evitar que scanners de links consumam o token.

Para limitar compartilhamento e replay, o recomendado é token de resgate **uso único**, vinculado ao e-mail e sessão temporária com expiração igual ou menor que a do grant. Isso exige armazenamento durável e consumo concorrente atômico. Netlify Blobs não deve ser presumido como transacional/compare-and-swap para esse passo; se não puder garantir consumo único, escolher explicitamente outro mecanismo pequeno e suportado ou aceitar conscientemente replay até expirar. Também falta decidir quem pode emitir/revogar grants, como enviar e-mail, e se o destinatário precisa provar novamente posse do e-mail.

Links de convite/confirmação do Identity não são automaticamente equivalentes ao acesso temporário acima: transformam-se em conta e sessão Identity e não devem ser tratados como garantidamente válidos por 3–6 horas sem verificar o ciclo de sessão.

## Limite importante das roles Identity

Roles Netlify Identity vivem em `app_metadata.roles` e são carregadas no JWT. A documentação informa que alterações de papel não invalidam o JWT ativo: a nova permissão vale no próximo login ou refresh. Portanto, remoção de `staff`/`admin` não é revogação instantânea. Precisamos aceitar esse atraso para contas internas ou fazer checagem server-side em fonte atualizada antes de operações sensíveis. Não prometer um prazo exato de expiração de sessão sem confirmar a configuração/runtime do site.

Netlify permite role-based redirects para regras simples de path e `getUser()` em Functions/Edge Functions para checks próprios. Não misturar um segundo provedor JWT externo com Identity; o token de usuário proposto deve ser um grant independente verificado explicitamente pela Edge/Function, não fingir que é role nativa de Identity.

## Sequência segura

1. Confirmar a matriz de paths públicos, internos e administrativos e fechar os destinatários/operadores que podem emitir grants.
2. Decidir validade exata (3 ou 6 horas), uso único/replay e se o grant é vinculado ao e-mail; escolher serviço de e-mail e armazenamento que garantam emissão, consumo e revogação pretendidos.
3. Implementar policy pura `Identity actor + role | temporary config grant`; sem credenciais/configuração, os caminhos protegidos falham fechados. Admin Identity continua funcionando.
4. Provar gate Edge para arquivos estáticos mais validação própria nas Functions, incluindo caminho direto, aliases, URLs Netlify, APIs e assets; checar que as páginas públicas continuam abertas.
5. Migrar comprador para DTO allowlisted e retirar exposição pública raw/estática apenas no cutover coordenado. Preservar `GET /api/public-modules` público.
6. Testar anônimo, staff, admin, token válido/inválido/expirado/reutilizado, revogação, scanner de e-mail, acesso a caminho direto, bypass de API, previews, domínio customizado e regressões do configurador antes de produção.

## Referências oficiais

- [Netlify Identity em Functions e Edge Functions](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/use-identity-in-functions/): validação da sessão e leitura de roles server-side.
- [Netlify role-based access control](https://docs.netlify.com/manage/security/secure-access-to-sites/role-based-access-control/): redirects por role, `app_metadata.roles` e atraso de atualização até login/refresh.
- [Netlify Identity: usuários existentes e atribuição de roles](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/manage-existing-users/): concessão de roles por dashboard ou função administrativa.
- [Netlify Edge Functions — cadeia de requests](https://docs.netlify.com/build/edge-functions/api/): a Edge pode interceptar antes de redirects e entrega estática.
- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/): rever garantias reais antes de depender de consumo concorrente de token.
