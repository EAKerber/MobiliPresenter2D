# Configuração administrativa

O painel fica em `/admin.html`. A configuração publicada é lida pelo configurador público e gravada em um store site-scoped do Netlify Blobs.

## Ativação no Netlify

1. Habilite Netlify Identity no projeto e configure o cadastro como **Invite only** antes de convidar qualquer conta.
2. Convide as pessoas que poderão administrar o configurador.
3. Atribua a função `admin` a cada conta autorizada em `app_metadata.roles` no Netlify Identity. O painel não permite cadastro nem concede funções.
4. Publique o site com as dependências e a função deste repositório. O primeiro `GET /api/configuration` serve os padrões; uma gravação cria a versão persistida no Blobs.
5. Acesse `/admin.html`, entre com uma conta convidada com a função `admin`, reordene as etapas e selecione os itens. O resumo e a etapa de módulos são obrigatórios.

## Proteções

- O painel pode ler a configuração publicada, mas somente a função server-side grava.
- Toda gravação valida o esquema e a lista de IDs permitidos, exige a função `admin` e compara a revisão enviada com a atual.
- O navegador não escolhe IDs arbitrários para módulos, itens ou etapas.
- A configuração publicada é servida sem cache para que a próxima visita ao configurador receba a revisão nova.
